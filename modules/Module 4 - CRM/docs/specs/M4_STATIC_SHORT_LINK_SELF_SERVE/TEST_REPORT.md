# TEST_REPORT — M4_STATIC_SHORT_LINK_SELF_SERVE

## 1. Happy-path (Chrome MCP)
URL: `https://www.example-test.co.il/sprint2-item4-test`

Trace:
```
stage: submitted
ok_text: "הקישור נוצר. קוד: b0577229 נתיב קצר: /r/b0577229
          מפנה אל: https://www.example-test.co.il/sprint2-item4-test"
ok_visible: true
extracted_code: "b0577229"
extracted_path: "/r/b0577229"
```

Screenshot: `static-link-create-success.png`.

## 2. End-to-end /r/<code> resolution
```
curl https://...functions.supabase.co/resolve-link?code=b0577229
→ STATUS:302  LOCATION:https://www.example-test.co.il/sprint2-item4-test
```
✅ 302 redirect to the exact target_url.

## 3. DB cross-check (immediately after create)
```sql
SELECT id, code, target_url, link_type, expires_at, click_count, created_at
  FROM short_links WHERE code='b0577229';
→ {
    "id": "ae2f0978-90ed-492b-8bfa-8cb6cfc56409",
    "code": "b0577229",
    "target_url": "https://www.example-test.co.il/sprint2-item4-test",
    "link_type": "template_static",
    "expires_at": "2099-12-31 23:59:59+00",
    "click_count": 1,    -- curl registered as click
    "created_at": "2026-05-21 19:33:30.814709+00"
  }
```
✅ Row created with correct shape; click_count incremented by the curl verification.

## 4. Validation negative (Chrome MCP)
URL: `not-a-real-url`

Trace:
```
negative_test_error: "יש להזין כתובת תקינה (מתחילה ב-http:// או https://)"
validation_blocked: true
```
✅ Client-side validation blocks before RPC fires; inline error rendered.

## 5. Demo cleanup
- 1 short_link deleted (`code='b0577229'`).
- 1 short_link_click deleted (from the curl resolution above).
- No sentinel residue.
- Prizma: zero writes (read-only this SPEC).

## 6. Verdict
🟢 **PASS.** Every acceptance bar met:
- ✅ Button + modal render.
- ✅ Happy-path creates row + returns correct code/path.
- ✅ /r/<code> resolves 302 via existing resolve-link EF (no EF change required).
- ✅ Validation negative blocks correctly.
- ✅ Cleanup back to baseline.
- ✅ Iron Rules 31/32/33/34 all green.

---
*End of test report.*
