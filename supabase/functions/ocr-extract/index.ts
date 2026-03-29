import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// ocr-extract — Claude Vision OCR for supplier documents
// Supports single file (file_url) and multi-file (file_urls array)
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const TIMEOUT_MS = 60_000; // 60s for multi-file
const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // 20MB

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonRes(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function errRes(message: string, status: number): Response {
  return jsonRes({ error: message, success: false }, status);
}

function getMediaType(url: string): string {
  const l = url.toLowerCase();
  if (l.endsWith(".png")) return "image/png";
  if (l.endsWith(".gif")) return "image/gif";
  if (l.endsWith(".webp")) return "image/webp";
  if (l.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}

function fileName(url: string): string {
  return url.split("/").pop() || url;
}

function similarity(a: string, b: string): number {
  const an = a.trim().toLowerCase(), bn = b.trim().toLowerCase();
  if (an === bn) return 1;
  if (an.length < 2 || bn.length < 2) return 0;
  const bigrams = new Map<string, number>();
  for (let i = 0; i < an.length - 1; i++) {
    const bi = an.substring(i, i + 2);
    bigrams.set(bi, (bigrams.get(bi) || 0) + 1);
  }
  let m = 0;
  for (let i = 0; i < bn.length - 1; i++) {
    const bi = bn.substring(i, i + 2);
    const c = bigrams.get(bi) || 0;
    if (c > 0) { bigrams.set(bi, c - 1); m++; }
  }
  return (2 * m) / (an.length - 1 + bn.length - 1);
}

function parseJson(text: string): Record<string, unknown> | null {
  let t = text.trim();
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) t = m[1].trim();
  try { return JSON.parse(t); } catch { return null; }
}

function fieldVal<T>(v: unknown): T | null {
  if (v == null) return null;
  if (typeof v === "object" && "value" in (v as Record<string, unknown>))
    return (v as { value: T }).value;
  return v as T;
}

// ============================================================
// Fetch a file from Storage → base64
// ============================================================
async function fetchFileBase64(
  db: ReturnType<typeof createClient>, fileUrl: string
): Promise<{ base64: string; mediaType: string; bytes: number } | null> {
  try {
    const { data: signedData, error } = await db.storage
      .from("supplier-docs").createSignedUrl(fileUrl, 300);
    if (error || !signedData?.signedUrl) return null;
    const fileRes = await fetch(signedData.signedUrl);
    if (!fileRes.ok) return null;
    const buf = new Uint8Array(await fileRes.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return { base64: btoa(bin), mediaType: getMediaType(fileUrl), bytes: buf.length };
  } catch { return null; }
}

// ============================================================
// Call Claude Vision API — supports multiple content blocks
// ============================================================
async function callClaudeMulti(
  contentBlocks: Array<Record<string, unknown>>,
  attempt = 1
): Promise<{ response: Record<string, unknown>; ms: number }> {
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL, max_tokens: 4096,
        messages: [{ role: "user", content: contentBlocks }],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    return { response: await res.json(), ms: Date.now() - start };
  } catch (err: unknown) {
    clearTimeout(timer);
    const e = err as Error;
    if (e.name === "AbortError" && attempt === 1)
      return callClaudeMulti(contentBlocks, 2);
    throw e;
  }
}

function buildPrompt(hints: string | null, typeHint: string | null, fileCount: number): string {
  let p = `You are an expert at reading Israeli supplier invoices and delivery notes for optical stores.`;
  if (fileCount > 1) {
    p += ` You are given ${fileCount} pages/files of the same document. Extract data from ALL pages combined.`;
  }
  p += ` Extract the following fields:

Required fields:
- supplier_name: The supplier/company name
- document_type: "invoice" / "delivery_note" / "credit_note"
- document_number: The document number
- document_date: Date on the document (format: YYYY-MM-DD)
- due_date: Payment due date if shown (format: YYYY-MM-DD)
- currency: ISO 4217 code (usually ILS)
- subtotal: Amount before VAT
- vat_rate: VAT percentage (usually 17%)
- vat_amount: VAT amount
- total_amount: Final total including VAT

Optional fields:
- items: Array of ALL line items from ALL pages, each with: description, model, quantity, unit_price, total
- po_reference: If a PO number is mentioned
- delivery_note_references: If invoice references delivery note numbers`;
  if (typeHint) p += `\n\nHint: This document is likely a ${typeHint}.`;
  if (hints) p += `\n\nKnown supplier patterns:\n${hints}`;
  p += `\n\nRespond ONLY with valid JSON. No markdown, no explanation.
If a field cannot be determined, use null.
Include a "confidence" field (0-1) for each extracted value.`;
  return p;
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errRes("Method not allowed", 405);

  const startTime = Date.now();

  // Parse & validate input — support both single file_url and file_urls array
  let fileUrls: string[] = [];
  let tenantId: string;
  let supplierId: string | null = null, docTypeHint: string | null = null;
  try {
    const body = await req.json();
    tenantId = body.tenant_id;
    supplierId = body.supplier_id || null;
    docTypeHint = body.document_type_hint || null;
    // New format: file_urls array
    if (Array.isArray(body.file_urls) && body.file_urls.length > 0) {
      fileUrls = body.file_urls.slice(0, MAX_FILES);
    }
    // Old format: single file_url (backward compatible)
    else if (body.file_url && typeof body.file_url === "string") {
      fileUrls = [body.file_url];
    }
  } catch { return errRes("Invalid JSON body", 400); }
  if (!fileUrls.length) return errRes("Missing file_url or file_urls", 400);
  if (!tenantId || typeof tenantId !== "string") return errRes("Missing tenant_id", 400);

  // Validate JWT via auth_sessions
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return errRes("Missing authorization", 401);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sess, error: sessErr } = await db.from("auth_sessions")
    .select("id, employee_id, tenant_id").eq("token", auth.replace("Bearer ", ""))
    .eq("is_active", true).single();
  if (sessErr || !sess) return errRes("Invalid or expired session", 401);
  if (sess.tenant_id !== tenantId) return errRes("Tenant mismatch", 403);

  // Fetch all files from Storage as base64
  const fetchedFiles: Array<{ base64: string; mediaType: string; url: string }> = [];
  let totalBytes = 0;
  for (const url of fileUrls) {
    const fetched = await fetchFileBase64(db, url);
    if (!fetched) { console.warn(`Skipping file ${url}: fetch failed`); continue; }
    totalBytes += fetched.bytes;
    if (totalBytes > MAX_TOTAL_BYTES) {
      console.warn(`Total size ${totalBytes} exceeds ${MAX_TOTAL_BYTES}, stopping at ${fetchedFiles.length} files`);
      break;
    }
    fetchedFiles.push({ base64: fetched.base64, mediaType: fetched.mediaType, url });
  }
  if (!fetchedFiles.length) return errRes("No files could be loaded from storage", 404);

  // Load OCR template hints for known supplier
  let supplierHints: string | null = null, templateId: string | null = null;
  if (supplierId) {
    const { data: tpl } = await db.from("supplier_ocr_templates")
      .select("id, extraction_hints").eq("tenant_id", tenantId)
      .eq("supplier_id", supplierId).eq("is_active", true).limit(1).maybeSingle();
    if (tpl?.extraction_hints) {
      templateId = tpl.id;
      const h = tpl.extraction_hints as Record<string, string>;
      const lines: string[] = [];
      if (h.date_format) lines.push(`- Date format: ${h.date_format}`);
      if (h.document_number_label) lines.push(`- Document number after "${h.document_number_label}"`);
      if (h.items_table_headers) lines.push(`- Items headers: ${JSON.stringify(h.items_table_headers)}`);
      if (h.supplier_name_pattern) lines.push(`- Supplier name: "${h.supplier_name_pattern}"`);
      if (h.vat_label) lines.push(`- VAT label: "${h.vat_label}"`);
      if (h.total_label) lines.push(`- Total label: "${h.total_label}"`);
      if (h.currency) lines.push(`- Currency: ${h.currency}`);
      if (lines.length) supplierHints = lines.join("\n");
    }
  }

  // Load AI config
  const { data: cfg } = await db.from("ai_agent_config")
    .select("confidence_threshold, auto_match_supplier, auto_match_po")
    .eq("tenant_id", tenantId).maybeSingle();
  const autoMatchSupplier = cfg?.auto_match_supplier ?? true;
  const autoMatchPo = cfg?.auto_match_po ?? true;

  // Build Claude Vision content blocks — one per file + prompt at end
  const contentBlocks: Array<Record<string, unknown>> = [];
  for (const f of fetchedFiles) {
    const srcType = f.mediaType === "application/pdf" ? "document" : "image";
    contentBlocks.push({
      type: srcType,
      source: { type: "base64", media_type: f.mediaType, data: f.base64 },
    });
  }
  const prompt = buildPrompt(supplierHints, docTypeHint, fetchedFiles.length);
  contentBlocks.push({ type: "text", text: prompt });

  // Call Claude Vision
  let claudeRes: Record<string, unknown>, processingMs: number;
  try {
    const r = await callClaudeMulti(contentBlocks);
    claudeRes = r.response; processingMs = r.ms;
  } catch (err: unknown) {
    const e = err as Error;
    if (e.message === "RATE_LIMIT") return errRes("נסה שוב בעוד דקה", 429);
    if (e.name === "AbortError") return errRes("Claude API timeout — try again", 504);
    return errRes(`OCR failed: ${e.message}`, 500);
  }

  // Parse response JSON
  const content = claudeRes.content as Array<{ type: string; text?: string }>;
  const textBlock = content?.find((c) => c.type === "text");

  const primaryFileUrl = fileUrls[0];
  const saveFailedExtraction = async () => {
    await db.from("ocr_extractions").insert({
      tenant_id: tenantId, file_url: primaryFileUrl, file_name: fileName(primaryFileUrl),
      raw_response: claudeRes, extracted_data: { raw_text: textBlock?.text || null },
      confidence_score: 0, status: "pending", template_id: templateId,
      processing_time_ms: Date.now() - startTime,
    });
  };

  if (!textBlock?.text) { await saveFailedExtraction(); return errRes("לא הצלחנו לקרוא את המסמך", 422); }
  const extracted = parseJson(textBlock.text);
  if (!extracted) { await saveFailedExtraction(); return errRes("לא הצלחנו לקרוא את המסמך", 422); }

  // Calculate overall confidence
  const confFields = ["supplier_name", "document_type", "document_number", "document_date", "total_amount"];
  let confSum = 0, confCount = 0;
  const confObj = extracted.confidence as Record<string, number> | undefined;
  for (const f of confFields) {
    const v = extracted[f] as { confidence?: number } | unknown;
    if (v && typeof v === "object" && "confidence" in (v as Record<string, unknown>)) {
      confSum += (v as { confidence: number }).confidence; confCount++;
    } else if (confObj && typeof confObj[f] === "number") {
      confSum += confObj[f]; confCount++;
    }
  }
  const confidence = confCount > 0 ? Math.round((confSum / confCount) * 100) / 100 : 0.5;
  if (confidence < 0.5) { extracted._low_confidence = true; extracted._review_required = true; }

  // Supplier matching (fuzzy)
  let supplierMatch: { id: string; name: string; confidence: number } | null = null;
  const extractedName = fieldVal<string>(extracted.supplier_name);

  if (autoMatchSupplier && !supplierId && extractedName) {
    const { data: sups } = await db.from("suppliers").select("id, name")
      .eq("tenant_id", tenantId).eq("active", true);
    if (sups?.length) {
      let best = { id: "", name: "", score: 0 };
      for (const s of sups) {
        if (s.name.toLowerCase() === extractedName.toLowerCase()) { best = { id: s.id, name: s.name, score: 1 }; break; }
        if (s.name.toLowerCase().includes(extractedName.toLowerCase()) ||
            extractedName.toLowerCase().includes(s.name.toLowerCase())) {
          if (0.85 > best.score) best = { id: s.id, name: s.name, score: 0.85 };
          continue;
        }
        const sc = similarity(extractedName, s.name);
        if (sc > best.score) best = { id: s.id, name: s.name, score: sc };
      }
      if (best.score >= 0.6)
        supplierMatch = { id: best.id, name: best.name, confidence: best.score };
    }
  }

  // PO matching
  let poMatch: { po_number: string; po_id: string; confidence: number } | null = null;
  const matchSupId = supplierId || supplierMatch?.id || null;

  if (autoMatchPo && matchSupId) {
    const poRef = fieldVal<string>(extracted.po_reference);
    if (poRef) {
      const { data: pos } = await db.from("purchase_orders").select("id, po_number")
        .eq("tenant_id", tenantId).eq("supplier_id", matchSupId)
        .in("status", ["sent", "partial"]).ilike("po_number", `%${poRef}%`);
      if (pos?.length === 1) poMatch = { po_number: pos[0].po_number, po_id: pos[0].id, confidence: 0.9 };
      else if (pos?.length) poMatch = { po_number: pos[0].po_number, po_id: pos[0].id, confidence: 0.6 };
    }
    if (!poMatch) {
      const { data: pos } = await db.from("purchase_orders").select("id, po_number")
        .eq("tenant_id", tenantId).eq("supplier_id", matchSupId).in("status", ["sent", "partial"]);
      if (pos?.length === 1) poMatch = { po_number: pos[0].po_number, po_id: pos[0].id, confidence: 0.7 };
    }
  }

  // Save extraction
  const totalMs = Date.now() - startTime;
  const { data: ext, error: insErr } = await db.from("ocr_extractions").insert({
    tenant_id: tenantId, file_url: primaryFileUrl, file_name: fileName(primaryFileUrl),
    raw_response: claudeRes, extracted_data: extracted, confidence_score: confidence,
    status: "pending", template_id: templateId, processing_time_ms: totalMs,
  }).select("id").single();

  if (insErr) {
    console.error("Failed to save extraction:", insErr);
    return jsonRes({
      success: true, extraction_id: null, extracted_data: extracted,
      confidence_score: confidence, supplier_match: supplierMatch,
      po_match: poMatch, template_used: !!templateId, processing_time_ms: totalMs,
      files_scanned: fetchedFiles.length,
    });
  }

  // Update template usage stats
  if (templateId) {
    const { data: tpl } = await db.from("supplier_ocr_templates")
      .select("times_used").eq("id", templateId).single();
    if (tpl) {
      await db.from("supplier_ocr_templates").update({
        times_used: (tpl.times_used || 0) + 1,
        last_used_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", templateId);
    }
  }

  return jsonRes({
    success: true, extraction_id: ext.id, extracted_data: extracted,
    confidence_score: confidence, supplier_match: supplierMatch,
    po_match: poMatch, template_used: !!templateId, processing_time_ms: totalMs,
    files_scanned: fetchedFiles.length,
  });
});
