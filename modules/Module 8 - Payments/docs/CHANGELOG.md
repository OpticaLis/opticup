# Module 8 — Payments — Changelog

## 2026-05-23 — Phase A+B Schema closed 🟢

**SPEC:** `M8_SCHEMA` — Half 2 of the M7+M8 overnight chain.

- **5 new tables + 1 extended:** payments (28 cols, state-machine), payment_channels (per-tenant), payment_capabilities (global pool 12 rows), payment_adapters (global manifest 3 rows skeleton), payment_events_queue; payment_methods EXTENDED additively (8→15 cols).
- **4 enums** for state-machine + bounded property sets.
- **5 RPCs + 2 event trigger fns + 2 attached triggers.**
- **5 views.**
- **Pattern P22 (new):** Durable Event Queue — payment_events_queue + emit_* trigger fns + AFTER INSERT/UPDATE triggers. Mirrors M1 K3 + M4 trigger patterns.
- **Re-used M5 infra:** allocate_tenant_number(_, 'payment') for atomic per-tenant payment_number.
- **Iron-clad scope discipline:** ZERO integration code. Adapter manifest is CONFIG ONLY (3 seed rows). IPaymentProvider class + Linet/Gama/Z Credit adapters = Phase C.
- **Smoke:** M8 8/8 + cross-contract M5→M7→M8 6/6 PASS.
- **0 Prizma row writes** on payments / payment_events_queue.

Sealed under `docs/specs/M8_SCHEMA/` (7 artifacts). Iron Rules 1, 11, 14, 15, 16, 18, 19, 22, 32 conformed.

Commits at chain-close — see `git log --oneline --grep='m8'`.

---

*Pre-Phase A history: `payment_methods` was a pre-existing M1-era stub (4 demo rows, canonical RLS) for supplier-payment slug references. M8_SCHEMA extended it additively to serve customer-payment methods. M1's supplier-payment usage unaffected.*
