"""generate-seed-sql.py — M1_LENS_CATALOG_SEED_FROM_EXCEL Phase 2

Reads tests/excel_parsed.json and emits idempotent UPSERT SQL files into
tests/seed-sql/. Files are applied in numbered order via Supabase MCP
apply_migration (variants + offerings are batched at 500 rows/file).

DEMO TENANT ONLY in this generator. Prizma seed = re-run with --tenant prizma
after Daniel auth gate (separate SPEC step).
"""

import json
from pathlib import Path

DEMO_TID = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
OUTPUT_DIR = Path("tests/seed-sql")
BATCH_SIZE_VARIANTS = 250
BATCH_SIZE_OFFERINGS = 250


def esc(s):
    """SQL string escape — single-quote double-up."""
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def num(v, default="NULL"):
    if v is None or v == "":
        return default
    return str(v)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    # Clean previous batches
    for old in OUTPUT_DIR.glob("*.sql"):
        old.unlink()

    with open("tests/excel_parsed.json", encoding="utf-8") as f:
        d = json.load(f)

    # ===== 01 brands (global, owner_tenant_id IS NULL) =====
    lines = [
        "-- M1_LENS_CATALOG_SEED_FROM_EXCEL — 01_brands.sql",
        "-- Idempotent UPSERT of global lens_brand rows.",
        "-- Uses (name, owner_tenant_id) UNIQUE NULLS NOT DISTINCT.",
        "",
    ]
    rows = []
    for b in d["brands"]:
        rows.append(f"  ({esc(b)}, NULL, true, 'active'::text, false)")
    lines.append("INSERT INTO lens_brand (name, owner_tenant_id, is_published, lifecycle_status, is_deleted) VALUES")
    lines.append(",\n".join(rows))
    lines.append("ON CONFLICT (name, owner_tenant_id) DO UPDATE SET updated_at=now();")
    write_sql("01_brands.sql", lines)

    # ===== 02 designs (global) — JOIN brand_id by name =====
    lines = [
        "-- M1_LENS_CATALOG_SEED_FROM_EXCEL — 02_designs.sql",
        "-- Idempotent UPSERT of global lens_design rows.",
        "-- Uses (name, brand_id, owner_tenant_id) UNIQUE NULLS NOT DISTINCT.",
        "",
        "WITH ins(brand_name, design_name, lens_type, product_type) AS (",
        "  VALUES",
    ]
    rows = []
    for des in d["designs"]:
        rows.append(f"    ({esc(des['brand_canon'])}, {esc(des['name'])}, {esc(des['lens_type'])}, {esc(des['product_type'])})")
    lines.append(",\n".join(rows))
    lines.append(")")
    lines.append("INSERT INTO lens_design (name, brand_id, lens_type, product_type, owner_tenant_id, is_published, lifecycle_status, is_deleted)")
    lines.append("SELECT ins.design_name, b.id, ins.lens_type, ins.product_type, NULL, true, 'active'::text, false")
    lines.append("FROM ins")
    lines.append("JOIN lens_brand b ON b.name = ins.brand_name AND b.owner_tenant_id IS NULL")
    lines.append("ON CONFLICT (name, brand_id, owner_tenant_id) DO UPDATE SET updated_at=now(), lens_type=EXCLUDED.lens_type;")
    write_sql("02_designs.sql", lines)

    # ===== 03 variants (global) — JOIN design_id by (brand_name, design_name) =====
    # Batched at 500 rows each
    variants = d["variants"]
    for batch_idx, start in enumerate(range(0, len(variants), BATCH_SIZE_VARIANTS), start=1):
        chunk = variants[start:start + BATCH_SIZE_VARIANTS]
        lines = [
            f"-- M1_LENS_CATALOG_SEED_FROM_EXCEL — 03_variants_batch_{batch_idx:03d}.sql ({len(chunk)} rows)",
            "-- Idempotent UPSERT of global lens_variant rows.",
            "-- display_id is globally UNIQUE; (design_id, refractive_index, diameter_mm, coating, tint, owner_tenant_id) also UNIQUE NULLS NOT DISTINCT.",
            "",
            "WITH ins(brand_name, design_name, display_id, refractive_index, diameter_mm, coating, tint, sph_min, sph_max, sph_step) AS (",
            "  VALUES",
        ]
        rows = []
        for v in chunk:
            rows.append(
                f"    ({esc(v['brand_canon'])}, {esc(v['design_key'][1])}, {esc(v['display_id'])}, "
                f"{num(v['refractive_index'])}, {num(v['diameter_mm'])}, {esc(v['coating'])}, {esc(v['tint'])}, "
                f"{num(v['sph_min'])}, {num(v['sph_max'])}, {num(v['sph_step'])})"
            )
        lines.append(",\n".join(rows))
        lines.append(")")
        lines.append("INSERT INTO lens_variant (design_id, display_id, refractive_index, diameter_mm, coating, tint, sph_min, sph_max, sph_step, owner_tenant_id, is_published, lifecycle_status, is_deleted)")
        lines.append("SELECT d.id, ins.display_id, ins.refractive_index::numeric, ins.diameter_mm::int, ins.coating, ins.tint, ins.sph_min::numeric, ins.sph_max::numeric, ins.sph_step::numeric, NULL, true, 'active'::text, false")
        lines.append("FROM ins")
        lines.append("JOIN lens_brand b ON b.name = ins.brand_name AND b.owner_tenant_id IS NULL")
        lines.append("JOIN lens_design d ON d.name = ins.design_name AND d.brand_id = b.id AND d.owner_tenant_id IS NULL")
        lines.append("ON CONFLICT (display_id) DO UPDATE SET updated_at=now();")
        write_sql(f"03_variants_batch_{batch_idx:03d}.sql", lines)

    # ===== 04 suppliers (demo tenant) =====
    lines = [
        "-- M1_LENS_CATALOG_SEED_FROM_EXCEL — 04_suppliers_demo.sql",
        "-- Idempotent UPSERT of demo-tenant supplier rows.",
        f"-- tenant_id = {DEMO_TID}",
        "",
    ]
    rows = []
    for s in d["suppliers"]:
        rows.append(f"  (uuid_generate_v4(), {esc(DEMO_TID)}::uuid, {esc(s)}, true, 'invoice'::text, 'ILS'::text, 30, false, 0, now(), now())")
    lines.append("INSERT INTO suppliers (id, tenant_id, name, active, default_document_type, default_currency, payment_terms_days, has_prepaid_deal, withholding_tax_rate, created_at, updated_at) VALUES")
    lines.append(",\n".join(rows))
    lines.append("ON CONFLICT (name, tenant_id) DO UPDATE SET updated_at=now();")
    write_sql("04_suppliers_demo.sql", lines)

    # ===== 05 distribution (demo tenant) — JOIN supplier_id + brand_id =====
    lines = [
        "-- M1_LENS_CATALOG_SEED_FROM_EXCEL — 05_distribution_demo.sql",
        "-- Idempotent UPSERT of demo-tenant supplier_brand_distribution rows.",
        "",
        "WITH ins(tenant_id, supplier_name, brand_name) AS (",
        "  VALUES",
    ]
    rows = []
    for d_row in d["distribution"]:
        rows.append(f"    ({esc(DEMO_TID)}::uuid, {esc(d_row['supplier_canon'])}, {esc(d_row['brand_canon'])})")
    lines.append(",\n".join(rows))
    lines.append(")")
    lines.append("INSERT INTO supplier_brand_distribution (tenant_id, supplier_id, brand_id, status, is_deleted)")
    lines.append("SELECT ins.tenant_id, s.id, b.id, 'active'::text, false")
    lines.append("FROM ins")
    lines.append("JOIN suppliers s ON s.tenant_id = ins.tenant_id AND s.name = ins.supplier_name")
    lines.append("JOIN lens_brand b ON b.name = ins.brand_name AND b.owner_tenant_id IS NULL")
    lines.append("ON CONFLICT (supplier_id, brand_id, tenant_id) DO UPDATE SET updated_at=now();")
    write_sql("05_distribution_demo.sql", lines)

    # ===== 06 offerings (demo tenant) — JOIN supplier_id + variant_id =====
    offerings = d["offerings"]
    for batch_idx, start in enumerate(range(0, len(offerings), BATCH_SIZE_OFFERINGS), start=1):
        chunk = offerings[start:start + BATCH_SIZE_OFFERINGS]
        lines = [
            f"-- M1_LENS_CATALOG_SEED_FROM_EXCEL — 06_offerings_demo_batch_{batch_idx:03d}.sql ({len(chunk)} rows)",
            "-- Idempotent UPSERT of demo-tenant supplier_catalog_offering rows.",
            "",
            "WITH ins(tenant_id, supplier_name, variant_display_id, supplier_sku_code, price_amount, product_type) AS (",
            "  VALUES",
        ]
        rows = []
        for o in chunk:
            rows.append(
                f"    ({esc(DEMO_TID)}::uuid, {esc(o['supplier_canon'])}, {esc(o['variant_display_id'])}, "
                f"{esc(o['supplier_sku_code'])}, {num(o['price_amount'])}, {esc(o['product_type'])})"
            )
        lines.append(",\n".join(rows))
        lines.append(")")
        lines.append("INSERT INTO supplier_catalog_offering (tenant_id, supplier_id, variant_id, supplier_sku_code, price_amount, currency_code, is_vat_inclusive, status, product_type, is_deleted)")
        lines.append("SELECT ins.tenant_id, s.id, v.id, ins.supplier_sku_code, ins.price_amount::numeric, 'ILS'::text, false, 'active'::text, ins.product_type, false")
        lines.append("FROM ins")
        lines.append("JOIN suppliers s ON s.tenant_id = ins.tenant_id AND s.name = ins.supplier_name")
        lines.append("JOIN lens_variant v ON v.display_id = ins.variant_display_id AND v.owner_tenant_id IS NULL")
        lines.append("ON CONFLICT (supplier_id, variant_id, tenant_id) DO UPDATE SET updated_at=now(), price_amount=EXCLUDED.price_amount;")
        write_sql(f"06_offerings_demo_batch_{batch_idx:03d}.sql", lines)

    # Summary file
    summary = OUTPUT_DIR / "README.md"
    with open(summary, "w", encoding="utf-8") as f:
        f.write("# M1_LENS_CATALOG_SEED_FROM_EXCEL — Generated SQL\n\n")
        f.write("Generated by `scripts/generate-seed-sql.py` from `tests/excel_parsed.json`.\n\n")
        f.write("**Demo tenant only.** Re-run with `--tenant prizma` after Daniel auth (SPEC step).\n\n")
        f.write("Apply in numbered order via Supabase MCP `apply_migration`:\n\n")
        files = sorted(OUTPUT_DIR.glob("*.sql"))
        for ff in files:
            f.write(f"- `{ff.name}`\n")
    print(f"Wrote {len(list(OUTPUT_DIR.glob('*.sql')))} SQL files to {OUTPUT_DIR}/")


def write_sql(name, lines):
    path = OUTPUT_DIR / name
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
        f.write("\n")


if __name__ == "__main__":
    main()
