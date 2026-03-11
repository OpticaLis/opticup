# OpticUp Scripts

## InventorySync Watcher

Node.js script that watches a Dropbox folder for Excel sales files from Access and automatically processes them into Supabase (updates inventory quantities + writes audit logs).

### Setup

```bash
cd scripts
npm install
```

### Run

```bash
node sync-watcher.js
```

### Watch folder

```
C:\Users\User\Dropbox\InventorySync\sales\
```

### File format

- Filename: `opticup_sales_YYYYMMDD_HHMMSS.xlsx`
- Sheet name: `sales_template`
- Row 1: English column headers
- Row 2: Hebrew descriptions
- Row 3+: Data rows

### Required columns

| Column | Description |
|--------|-------------|
| barcode | Inventory barcode (BBDDDDD) |
| quantity | Positive integer |
| transaction_date | YYYY-MM-DD |

### Optional columns

| Column | Description |
|--------|-------------|
| action_type | `sale` (default) or `return` |
| order_number | POS order number |
| employee_id | Employee ID from POS |
| sale_amount | Full price before discounts |
| discount | Fixed discount amount |
| discount_1 | Additional discount 1 |
| discount_2 | Additional discount 2 |
| final_amount | Final price paid |
| coupon_code | Coupon code used |
| campaign | Campaign name |
| lens_included | `yes` / `no` |
| lens_category | Lens category |

### Folder structure

```
Dropbox/InventorySync/
  sales/       <- Access drops Excel files here
  processed/   <- Successfully processed files (timestamped)
  failed/      <- Files that failed processing
```

### Behavior

- On startup: processes any existing files in `sales/`
- Then watches for new `.xlsx` files
- Waits 2 seconds for file copy to finish before processing
- Uses Supabase RPC for atomic quantity updates
- Writes audit logs to `inventory_logs` table
- Writes sync summary to `sync_log` table
- Never crashes — all errors are caught per file
