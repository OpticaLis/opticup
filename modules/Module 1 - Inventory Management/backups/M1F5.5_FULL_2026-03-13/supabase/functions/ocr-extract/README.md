# ocr-extract — Claude Vision OCR Edge Function

Receives a file reference from Supabase Storage, sends it to Claude Vision API,
returns structured extracted data (supplier name, document number, amounts, items, etc.).

## Deploy

1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref tsxrrxzmdxaenlvocyit`
4. Deploy: `supabase functions deploy ocr-extract --no-verify-jwt`

`--no-verify-jwt` because we verify JWT manually in the function
(we validate the session token against auth_sessions table).

## Secrets

The `ANTHROPIC_API_KEY` secret must be set in Supabase Dashboard:

**Edge Functions -> Manage Secrets -> ANTHROPIC_API_KEY**

Auto-available secrets (no action needed):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## Endpoint

```
POST /functions/v1/ocr-extract
Authorization: Bearer {user_jwt}
Content-Type: application/json

{
  "file_url": "supplier-docs/tenant-abc/1234.pdf",
  "tenant_id": "uuid",
  "supplier_id": "uuid-or-null",
  "document_type_hint": "invoice"
}
```

## Response

```json
{
  "success": true,
  "extraction_id": "uuid",
  "extracted_data": { ... },
  "confidence_score": 0.87,
  "supplier_match": { "id": "uuid", "name": "...", "confidence": 0.95 },
  "po_match": { "po_number": "PO-15-0042", "po_id": "uuid", "confidence": 0.88 },
  "template_used": false,
  "processing_time_ms": 2340
}
```

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Missing required fields |
| 401 | Invalid or expired session |
| 403 | Tenant mismatch |
| 404 | File not found in Storage |
| 422 | Could not parse document |
| 429 | Claude API rate limit |
| 504 | Claude API timeout |
