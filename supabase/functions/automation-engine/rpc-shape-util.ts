/**
 * rpc-shape-util.ts — defensive shape-handling for jsonb-scalar RPCs
 * consumed via supabase-js inside Edge Functions (Deno).
 *
 * Source: M4_JSONB_RPC_SHARED_HELPER (Sprint 3 Item 1, 2026-05-21).
 *
 * Why: PostgREST may surface a `RETURNS jsonb` RPC's response as a parsed
 * Array, a JSON string, or an object-wrapped value (`{ <function_name>: ... }`)
 * depending on the deployed PostgREST version + content-type negotiation.
 * Sprint-1 SPEC 2's first attempt silently returned `Array.isArray(.data)===false`
 * → caller treated as empty → 80s preview EF returned 0 recipients.
 *
 * Sprint-2 Item 1 inlined the triple-fallback in recipients.ts. This helper
 * codifies it once so future EF consumers don't re-derive it (Iron Rule 21).
 */

// deno-lint-ignore no-explicit-any
export function unwrapJsonbArray<T = unknown>(data: any): T[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed as T[];
      if (parsed && typeof parsed === "object") return findFirstArray<T>(parsed);
    } catch (_e) { /* fall through */ }
    return [];
  }
  if (typeof data === "object") return findFirstArray<T>(data);
  return [];
}

// deno-lint-ignore no-explicit-any
function findFirstArray<T>(obj: any): T[] {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (Array.isArray(v)) return v as T[];
  }
  return [];
}
