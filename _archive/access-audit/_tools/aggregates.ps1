param(
  [string]$Path = "C:\Users\User\opticup\tests\optic_dt.accdb",
  [string]$Out  = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Data

$cs = "Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$Path;ReadOnly=1;"
$conn = New-Object System.Data.Odbc.OdbcConnection $cs
$conn.Open()

function Q($sql, $cmdname) {
  try {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    $rdr = $cmd.ExecuteReader()
    $tab = New-Object System.Data.DataTable
    $tab.Load($rdr)
    return $tab
  } catch {
    Write-Output ("QUERY_FAIL [{0}] :: {1}" -f $cmdname, $_.Exception.Message)
    return $null
  }
}

# Load DAO column file to drive per-table iteration
$cols = Get-Content (Join-Path $Out 'dao_columns.json') -Raw -Encoding UTF8 | ConvertFrom-Json

# Work only on user tables that have meaningful row counts
$targets = @(
  'cust_list','cust_listb','orders','tb_kabala','checks','adchecks','items_sales',
  'proposals','person_remarks','tb_log','tb_order_rem','tb_quest','employees','tb_q_checks',
  'companyn','doc_title','add_order','add_num','BANK_LIST','CREDIT_LIST','presence_type'
)

$summary = @()
foreach ($t in $targets) {
  $row = [ordered]@{}
  $row['table'] = $t
  $cnt = Q "SELECT COUNT(*) AS c FROM [$t]" "count_$t"
  if ($cnt) { $row['count'] = $cnt.Rows[0]['c'] } else { $row['count'] = $null }

  # Find date columns for this table
  $dateCols = $cols | Where-Object { $_.Table -eq $t -and $_.Type -eq 8 } | ForEach-Object { $_.Field }
  $row['date_columns'] = $dateCols
  $row['date_ranges'] = @()
  foreach ($dc in $dateCols) {
    $sql = "SELECT MIN([$dc]) AS mn, MAX([$dc]) AS mx, COUNT([$dc]) AS nn FROM [$t] WHERE [$dc] IS NOT NULL"
    $r = Q $sql "range_${t}_${dc}"
    if ($r -and $r.Rows.Count -gt 0) {
      $rr = $r.Rows[0]
      $row['date_ranges'] += [pscustomobject]@{
        col = $dc
        min = $rr['mn']
        max = $rr['mx']
        notnull = $rr['nn']
      }
    }
  }

  # Fill rate for ALL columns: percent NOT NULL
  $row['fill'] = @()
  foreach ($cf in ($cols | Where-Object { $_.Table -eq $t })) {
    # Skip OLE/binary to avoid huge cost
    if ($cf.Type -in 9,11,101,102) { continue }
    $sql = "SELECT COUNT([$($cf.Field)]) AS nn FROM [$t]"
    $r = Q $sql "fill_${t}_${cf.Field}"
    if ($r -and $r.Rows.Count -gt 0) {
      $row['fill'] += [pscustomobject]@{
        col = $cf.Field
        notnull = $r.Rows[0]['nn']
      }
    }
  }
  $summary += [pscustomobject]$row
}

$summary | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 (Join-Path $Out 'aggregates.json')
Write-Output ("AGGREGATES tables={0}" -f $summary.Count)

# Also: rough distinct-value count for KEY low-cardinality columns to detect lookups vs free-text
$lowCardTargets = @(
  @{t='cust_list';c='kupa'}, @{t='cust_list';c='mkor'}, @{t='cust_list';c='kamp'},
  @{t='cust_list';c='moadon'}, @{t='cust_list';c='qhaver'}, @{t='cust_list';c='qmikzoa'},
  @{t='orders';c='ob_comp'}, @{t='orders';c='ob_type'}, @{t='orders';c='catga'}, @{t='orders';c='catgb'},
  @{t='tb_kabala';c='typ'}, @{t='checks';c='qtyp'}, @{t='cust_list';c='area'},
  @{t='person_remarks';c='qtyp'}, @{t='tb_log';c='typ'}, @{t='tb_order_rem';c='wnum'}
)
$distinct = @()
foreach ($k in $lowCardTargets) {
  $sql = "SELECT COUNT(DISTINCT [$($k.c)]) AS d FROM [$($k.t)]"
  $r = Q $sql "distinct_$($k.t)_$($k.c)"
  if ($r -and $r.Rows.Count -gt 0) {
    $distinct += [pscustomobject]@{ table=$k.t; col=$k.c; distinct=$r.Rows[0]['d'] }
  }
}
$distinct | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 (Join-Path $Out 'distinct_lowcard.json')
Write-Output ("DISTINCT {0}" -f $distinct.Count)

# Also: check if tb_log typ values cluster
try {
  $r = Q "SELECT typ, COUNT(*) AS c FROM tb_log GROUP BY typ" "tb_log_typ_dist"
  if ($r) {
    $arr = @()
    foreach ($rr in $r.Rows) { $arr += [pscustomobject]@{ typ=$rr['typ']; c=$rr['c'] } }
    $arr | ConvertTo-Json | Out-File -Encoding utf8 (Join-Path $Out 'tb_log_typ_dist.json')
  }
} catch {}

# tb_kabala typ histogram (payment types — does NOT leak names since `typ` is a code/category)
try {
  $r = Q "SELECT typ, COUNT(*) AS c FROM tb_kabala GROUP BY typ ORDER BY c DESC" "tb_kabala_typ"
  if ($r) {
    $arr = @()
    foreach ($rr in $r.Rows) { $arr += [pscustomobject]@{ typ=$rr['typ']; c=$rr['c'] } }
    $arr | ConvertTo-Json | Out-File -Encoding utf8 (Join-Path $Out 'tb_kabala_typ_dist.json')
  }
} catch {}

# orders date span — already done via dates, but also: orders by year
try {
  $r = Q "SELECT YEAR(odate) AS y, COUNT(*) AS c FROM orders WHERE odate IS NOT NULL GROUP BY YEAR(odate) ORDER BY YEAR(odate)" "orders_per_year"
  if ($r) {
    $arr = @()
    foreach ($rr in $r.Rows) { $arr += [pscustomobject]@{ year=$rr['y']; c=$rr['c'] } }
    $arr | ConvertTo-Json | Out-File -Encoding utf8 (Join-Path $Out 'orders_per_year.json')
  }
} catch { Write-Output ("orders_per_year fail: {0}" -f $_.Exception.Message) }

try {
  $r = Q "SELECT YEAR(cdate) AS y, COUNT(*) AS c FROM cust_list WHERE cdate IS NOT NULL GROUP BY YEAR(cdate) ORDER BY YEAR(cdate)" "cust_per_year"
  if ($r) {
    $arr = @()
    foreach ($rr in $r.Rows) { $arr += [pscustomobject]@{ year=$rr['y']; c=$rr['c'] } }
    $arr | ConvertTo-Json | Out-File -Encoding utf8 (Join-Path $Out 'cust_per_year.json')
  }
} catch { Write-Output ("cust_per_year fail: {0}" -f $_.Exception.Message) }

try {
  $r = Q "SELECT YEAR(chdate) AS y, COUNT(*) AS c FROM checks WHERE chdate IS NOT NULL GROUP BY YEAR(chdate) ORDER BY YEAR(chdate)" "checks_per_year"
  if ($r) {
    $arr = @()
    foreach ($rr in $r.Rows) { $arr += [pscustomobject]@{ year=$rr['y']; c=$rr['c'] } }
    $arr | ConvertTo-Json | Out-File -Encoding utf8 (Join-Path $Out 'checks_per_year.json')
  }
} catch { Write-Output ("checks_per_year fail: {0}" -f $_.Exception.Message) }

# tb_kabala by year
try {
  $r = Q "SELECT YEAR(wdate) AS y, COUNT(*) AS c, SUM(total) AS sumt FROM tb_kabala WHERE wdate IS NOT NULL GROUP BY YEAR(wdate) ORDER BY YEAR(wdate)" "kabala_per_year"
  if ($r) {
    $arr = @()
    foreach ($rr in $r.Rows) { $arr += [pscustomobject]@{ year=$rr['y']; c=$rr['c']; total=$rr['sumt'] } }
    $arr | ConvertTo-Json | Out-File -Encoding utf8 (Join-Path $Out 'kabala_per_year.json')
  }
} catch { Write-Output ("kabala_per_year fail: {0}" -f $_.Exception.Message) }

# Are there orders with NO matching customer in cust_list?
try {
  $r = Q "SELECT COUNT(*) AS c FROM orders LEFT JOIN cust_list ON orders.numw = cust_list.numw WHERE cust_list.numw IS NULL" "orphan_orders"
  if ($r) { Write-Output ("ORPHAN_ORDERS no_customer = {0}" -f $r.Rows[0]['c']) }
} catch { Write-Output ("orphan_orders fail: {0}" -f $_.Exception.Message) }

# Orders without a kabala?
try {
  $r = Q "SELECT COUNT(*) AS c FROM orders LEFT JOIN tb_kabala ON orders.rnum = tb_kabala.rnum WHERE tb_kabala.rnum IS NULL" "orders_no_kabala"
  if ($r) { Write-Output ("ORDERS_NO_KABALA = {0}" -f $r.Rows[0]['c']) }
} catch { Write-Output ("orders_no_kabala fail: {0}" -f $_.Exception.Message) }

# tb_kabala without an order?
try {
  $r = Q "SELECT COUNT(*) AS c FROM tb_kabala LEFT JOIN orders ON tb_kabala.rnum = orders.rnum WHERE orders.rnum IS NULL" "kabala_no_order"
  if ($r) { Write-Output ("KABALA_NO_ORDER = {0}" -f $r.Rows[0]['c']) }
} catch { Write-Output ("kabala_no_order fail: {0}" -f $_.Exception.Message) }

# Customers with at least 1 order vs none
try {
  $r = Q "SELECT COUNT(DISTINCT cust_list.numw) AS c FROM cust_list INNER JOIN orders ON cust_list.numw = orders.numw" "cust_with_orders"
  if ($r) { Write-Output ("CUST_WITH_ORDERS = {0}" -f $r.Rows[0]['c']) }
} catch {}

# checks (eye exams) per customer distribution
try {
  $r = Q "SELECT TOP 10 numw, COUNT(*) AS exams FROM checks GROUP BY numw ORDER BY COUNT(*) DESC" "top_checks"
  if ($r) {
    Write-Output "TOP_CUSTOMERS_BY_EXAMS (numw is opaque ID):"
    foreach ($rr in $r.Rows) { Write-Output ("  numw=*** exams={0}" -f $rr['exams']) }
    # Save aggregate-only (mask numw)
    $arr = @()
    foreach ($rr in $r.Rows) { $arr += [pscustomobject]@{ exams=$rr['exams'] } }
    $arr | ConvertTo-Json | Out-File -Encoding utf8 (Join-Path $Out 'top_checks_dist.json')
  }
} catch {}

# Customers without name (data quality)
try {
  $r = Q "SELECT COUNT(*) AS c FROM cust_list WHERE (fname IS NULL OR fname='') AND (pname IS NULL OR pname='')" "empty_names"
  if ($r) { Write-Output ("CUSTOMERS_WITH_NO_NAME = {0}" -f $r.Rows[0]['c']) }
} catch {}

# Phone fill rate
try {
  $r = Q "SELECT COUNT(*) AS c FROM cust_list WHERE (tel IS NULL OR tel='') AND (sel IS NULL OR sel='')" "no_phone"
  if ($r) { Write-Output ("CUSTOMERS_WITH_NO_PHONE = {0}" -f $r.Rows[0]['c']) }
} catch {}

# Email fill rate
try {
  $r = Q "SELECT COUNT(*) AS c FROM cust_list WHERE email IS NOT NULL AND email <> ''" "has_email"
  if ($r) { Write-Output ("CUSTOMERS_WITH_EMAIL = {0}" -f $r.Rows[0]['c']) }
} catch {}

# zehut fill rate
try {
  $r = Q "SELECT COUNT(*) AS c FROM cust_list WHERE zehut IS NOT NULL AND zehut <> ''" "has_zehut"
  if ($r) { Write-Output ("CUSTOMERS_WITH_ZEHUT = {0}" -f $r.Rows[0]['c']) }
} catch {}

# bdate fill
try {
  $r = Q "SELECT COUNT(*) AS c FROM cust_list WHERE bdate IS NOT NULL" "has_bdate"
  if ($r) { Write-Output ("CUSTOMERS_WITH_BDATE = {0}" -f $r.Rows[0]['c']) }
} catch {}

# loyalty club indicator
try {
  $r = Q "SELECT COUNT(*) AS c FROM cust_list WHERE moadon IS NOT NULL AND moadon <> ''" "has_moadon"
  if ($r) { Write-Output ("CUSTOMERS_WITH_MOADON = {0}" -f $r.Rows[0]['c']) }
} catch {}

# orders with both pairs filled
try {
  $r = Q "SELECT COUNT(*) AS c FROM orders WHERE ob_comp2 IS NOT NULL AND ob_comp2 <> ''" "two_frame_orders"
  if ($r) { Write-Output ("ORDERS_WITH_TWO_FRAMES = {0}" -f $r.Rows[0]['c']) }
} catch {}

# orders with sun=true
try {
  $r = Q "SELECT COUNT(*) AS c FROM orders WHERE sun = -1 OR sun2 = -1" "sun_orders"
  if ($r) { Write-Output ("ORDERS_WITH_SUN_FLAG = {0}" -f $r.Rows[0]['c']) }
} catch {}

# orders with multifocal
try {
  $r = Q "SELECT COUNT(*) AS c FROM orders WHERE multia = -1 OR multib = -1" "multi_orders"
  if ($r) { Write-Output ("ORDERS_WITH_MULTIFOCAL = {0}" -f $r.Rows[0]['c']) }
} catch {}

# orders with delivery date dworka filled
try {
  $r = Q "SELECT COUNT(*) AS c FROM orders WHERE dworka IS NOT NULL" "lab_dispatched"
  if ($r) { Write-Output ("ORDERS_WITH_LAB_DISPATCHED = {0}" -f $r.Rows[0]['c']) }
} catch {}

# orders with ddonea filled (lab finished)
try {
  $r = Q "SELECT COUNT(*) AS c FROM orders WHERE ddonea IS NOT NULL" "lab_done"
  if ($r) { Write-Output ("ORDERS_WITH_LAB_DONE = {0}" -f $r.Rows[0]['c']) }
} catch {}

# orders with ddelva filled (delivered to customer)
try {
  $r = Q "SELECT COUNT(*) AS c FROM orders WHERE ddelva IS NOT NULL" "delivered"
  if ($r) { Write-Output ("ORDERS_WITH_DELIVERY = {0}" -f $r.Rows[0]['c']) }
} catch {}

$conn.Close()
Write-Output "DONE aggregates"
