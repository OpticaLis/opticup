# FINDINGS: M4_SHORT_LINKS_CHANNEL_SPLIT

**Date:** 2026-05-24

---

## Channel-split measurement — baseline state

All 12 new channel-split codes are live and tracking independently. Each code's click_count=1 from verification curl (not real user traffic yet). Real measurement begins with the next campaign send.

### Prizma (production) codes

| Label | Channel | Code | Click count |
|---|---|---|---:|
| pricing_catalog_email | email | ECATp | 1 |
| pricing_catalog_sms | sms | SCATp | 1 |
| stock_page_email | email | ESTKp | 1 |
| stock_page_sms | sms | SSTKp | 1 |
| takanon_email | email | ETKNp | 1 |
| takanon_sms | sms | STKNp | 1 |

### Demo codes

| Label | Channel | Code | Click count |
|---|---|---|---:|
| pricing_catalog_email | email | ECATd | 1 |
| pricing_catalog_sms | sms | SCATd | 1 |
| stock_page_email | email | ESTKd | 1 |
| stock_page_sms | sms | SSTKd | 1 |
| takanon_email | email | ETKNd | 1 |
| takanon_sms | sms | STKNd | 1 |

### Old shared codes (preserved, no longer in templates)

| Code | Purpose | Click count | Note |
|---|---|---|---|
| CEiBGCWj | Pricing catalog | 106 | Historical mixed email+sms clicks |
| 5CBy1Do4 | Stock page | 17 | Historical mixed email+sms clicks |
| f9Avttrn | Takanon | 6 | Historical mixed email+sms clicks |

These old codes still resolve correctly (not deleted). They will stop accruing new template-driven clicks since no template references them anymore. Any clicks from previously-sent messages (forwarded/printed old links) will still land on these rows.

---

## Measurement query (for future use)

Run this query to compare SMS vs email click performance on the 3 channel-split link purposes:

```sql
SELECT
  label,
  CASE WHEN code LIKE 'E%' THEN 'email' WHEN code LIKE 'S%' THEN 'sms' END AS channel,
  click_count
FROM short_links
WHERE code IN ('ECATp','SCATp','ESTKp','SSTKp','ETKNp','STKNp')
ORDER BY label, channel;
```

---

## Observations

1. **Stock-page email codes (ESTKp/ESTKd) are unreferenced.** The stock link was only ever in the SMS version of `event_invite_new`. The email version never had it. The E-prefixed stock codes exist and resolve, ready for future use if a stock link is added to an email template.

2. **Tenant isolation restored.** Before this SPEC, all 6 demo templates referenced Prizma's short-link codes (CEiBGCWj, 5CBy1Do4, f9Avttrn). Demo now uses its own codes (ECATd, SCATd, SSTKd, ETKNd, STKNd). Clicks from demo testing no longer pollute Prizma's metrics.

3. **Convention summary.** All templated campaign short links now follow the E/S prefix convention:

| Purpose | Prizma email | Prizma SMS | Demo email | Demo SMS |
|---|---|---|---|---|
| Pricing catalog | ECATp | SCATp | ECATd | SCATd |
| Stock page | ESTKp | SSTKp | ESTKd | SSTKd |
| Takanon | ETKNp | STKNp | ETKNd | STKNd |
| SuperSale launch w1 | ESLpw1 | SSLpw1 | ESLdw1 | SSLdw1 |
| SuperSale launch w2 | ESLpw2 | SSLpw2 | ESLdw2 | SSLdw2 |

4. **KvSzd3Zz (payment link):** confirmed email-only on both tenants. No split needed. If it's ever added to an SMS template, create an S-prefixed code at that time.
