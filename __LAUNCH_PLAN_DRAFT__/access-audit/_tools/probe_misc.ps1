param(
  [string]$Path = "C:\Users\User\opticup\tests\optic_dt.accdb",
  [string]$Out  = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data"
)

Add-Type -AssemblyName System.Data
$cs = "Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$Path;ReadOnly=1;"
$conn = New-Object System.Data.Odbc.OdbcConnection $cs
$conn.Open()

function GetT([string]$sql) {
  $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql
  $rdr = $cmd.ExecuteReader(); $tab = New-Object System.Data.DataTable
  [void]$tab.Load($rdr); $rdr.Close(); return ,$tab
}
function Save([object]$o, [string]$f) {
  ($o | ConvertTo-Json -Depth 6) | Out-File -Encoding utf8 (Join-Path $Out $f)
}
function Conv([System.Data.DataTable]$t) {
  $arr = @()
  for ($i=0;$i -lt $t.Rows.Count;$i++) {
    $r = $t.Rows[$i]; $obj=[ordered]@{}
    for ($j=0;$j -lt $t.Columns.Count;$j++) {
      $v = $r.ItemArray[$j]
      if ([System.DBNull]::Value.Equals($v)) { $v = $null }
      $obj[$t.Columns[$j].ColumnName] = $v
    }
    $arr += [pscustomobject]$obj
  }
  return ,$arr
}

# 1) tb_log content (only 18 rows — small, probably safe)
try {
  $t = GetT "SELECT datew, hh, custn, custnf, tot, typ, rnum, LEFT(remk, 80) AS remk_short FROM tb_log ORDER BY datew, hh"
  Save (Conv $t) 'tb_log_full.json'
  Write-Host ("TB_LOG rows={0}" -f $t.Rows.Count)
} catch { Write-Host ("ERR tb_log: {0}" -f $_.Exception.Message) }

# 2) tb_order_rem content (9 rows)
try {
  $t = GetT "SELECT rnum, wdate, wnum, LEFT(CSTR(remk), 100) AS remk_short FROM tb_order_rem"
  Save (Conv $t) 'tb_order_rem_full.json'
  Write-Host ("TB_ORDER_REM rows={0}" -f $t.Rows.Count)
} catch { Write-Host ("ERR tb_order_rem: {0}" -f $_.Exception.Message) }

# 3) checks_remarks (5 rows)
try {
  $t = GetT "SELECT datew, qtyp, bdikanumw, rnum, LEFT(CSTR(mem), 100) AS mem_short FROM checks_remarks"
  Save (Conv $t) 'checks_remarks_full.json'
} catch { Write-Host ("ERR checks_remarks: {0}" -f $_.Exception.Message) }

# 4) BANK_LIST (87 rows — bank codes & names)
try {
  $t = GetT "SELECT bank, [tran], qtyp, redc, reda, tm, str FROM BANK_LIST ORDER BY bank"
  Save (Conv $t) 'bank_list.json'
} catch { Write-Host ("ERR BANK_LIST: {0}" -f $_.Exception.Message) }

# 5) CREDIT_LIST (5 rows)
try {
  $t = GetT "SELECT credit, [tran] FROM CREDIT_LIST"
  Save (Conv $t) 'credit_list.json'
} catch { Write-Host ("ERR CREDIT_LIST: {0}" -f $_.Exception.Message) }

# 6) presence_type (7 rows)
try {
  $t = GetT "SELECT ptyp, pnum FROM presence_type ORDER BY pnum"
  Save (Conv $t) 'presence_type.json'
} catch { Write-Host ("ERR presence_type: {0}" -f $_.Exception.Message) }

# 7) doc_title (1 row — but this has WhatsApp templates! Just get field NAMES + LENGTHS, no content)
try {
  $t = GetT @'
SELECT
  IIF(wtitle IS NULL, 0, LEN(wtitle)) AS wtitle_len,
  IIF(wtitleb IS NULL, 0, LEN(wtitleb)) AS wtitleb_len,
  IIF(wap1 IS NULL, 0, LEN(wap1)) AS wap1_len,
  IIF(wap2 IS NULL, 0, LEN(wap2)) AS wap2_len,
  IIF(wap3 IS NULL, 0, LEN(wap3)) AS wap3_len,
  IIF(wap4 IS NULL, 0, LEN(wap4)) AS wap4_len,
  IIF(wapr1 IS NULL, 0, LEN(wapr1)) AS wapr1_len,
  IIF(wapr2 IS NULL, 0, LEN(wapr2)) AS wapr2_len,
  IIF(wapr3 IS NULL, 0, LEN(wapr3)) AS wapr3_len,
  IIF(wapr4 IS NULL, 0, LEN(wapr4)) AS wapr4_len,
  IIF(wapk IS NULL, 0, LEN(wapk)) AS wapk_len,
  IIF(wapma IS NULL, 0, LEN(wapma)) AS wapma_len,
  IIF(wapmb IS NULL, 0, LEN(wapmb)) AS wapmb_len,
  IIF(waprk IS NULL, 0, LEN(waprk)) AS waprk_len,
  IIF(wapab IS NULL, 0, LEN(wapab)) AS wapab_len,
  IIF(wparameters IS NULL, 0, LEN(wparameters)) AS wparameters_len,
  IIF(wapsg1 IS NULL, 0, LEN(wapsg1)) AS wapsg1_len
FROM doc_title
'@
  Save (Conv $t) 'doc_title_lengths.json'
} catch { Write-Host ("ERR doc_title: {0}" -f $_.Exception.Message) }

# 8) companyn (1 row — get only configuration shape, mask name)
try {
  $t = GetT @'
SELECT
  IIF(name_c IS NULL, 0, LEN(name_c)) AS name_len,
  IIF(adress_c IS NULL, 0, LEN(adress_c)) AS adr_len,
  IIF(tel_c IS NULL, 0, LEN(tel_c)) AS tel_len,
  pr, tym, rpt, msrd, kupar, ax, qpd, catg, num_snif,
  IIF(qosek IS NULL, 0, LEN(qosek)) AS qosek_len,
  IIF(sivug IS NULL, 0, LEN(sivug)) AS sivug_len,
  IIF(btxt IS NULL, 0, LEN(btxt)) AS btxt_len
FROM companyn
'@
  Save (Conv $t) 'companyn_shape.json'
} catch { Write-Host ("ERR companyn: {0}" -f $_.Exception.Message) }

# 9) add_order — 1 row config
try {
  $t = GetT @'
SELECT order_num, prop_num, wprop_num, worder_num, maam, maamal, ncopy, igul, wmaam, qinterval, qstop,
  IIF(pathw IS NULL, 0, LEN(pathw)) AS path_len,
  IIF(genremk IS NULL, 0, LEN(genremk)) AS genremk_len,
  IIF(teur1 IS NULL, 0, LEN(teur1)) AS teur1_len,
  IIF(teur2 IS NULL, 0, LEN(teur2)) AS teur2_len,
  IIF(sern IS NULL, 0, LEN(sern)) AS sern_len,
  IIF(smsparms IS NULL, 0, LEN(smsparms)) AS smsparms_len,
  IIF(waptparms IS NULL, 0, LEN(waptparms)) AS waptparms_len,
  IIF(wap IS NULL, 0, LEN(wap)) AS wap_len,
  IIF(wapmsg IS NULL, 0, LEN(wapmsg)) AS wapmsg_len,
  mlm, lab, emp, mlmw
FROM add_order
'@
  Save (Conv $t) 'add_order_shape.json'
} catch { Write-Host ("ERR add_order: {0}" -f $_.Exception.Message) }

# 10) add_num — current sequence
try {
  $t = GetT "SELECT wnum FROM add_num"
  Save (Conv $t) 'add_num_value.json'
} catch { Write-Host ("ERR add_num: {0}" -f $_.Exception.Message) }

# 11) Recent activity per year-month (last 36 mo)
try {
  $t = GetT "SELECT YEAR(odate) AS y, MONTH(odate) AS m, COUNT(*) AS c FROM orders WHERE odate IS NOT NULL GROUP BY YEAR(odate), MONTH(odate) ORDER BY 1, 2"
  Save (Conv $t) 'orders_by_month.json'
  Write-Host ("ORDERS_BY_MONTH rows={0}" -f $t.Rows.Count)
} catch { Write-Host ("ERR ym: {0}" -f $_.Exception.Message) }

# 12) Active customer base (last 24 mo via subquery via temp join)
try {
  $t = GetT "SELECT COUNT(*) AS c FROM (SELECT DISTINCT numw FROM orders WHERE odate >= DATESERIAL(2024,5,1)) AS T"
  $v = $t.Rows[0].ItemArray[0]
  Write-Host ("ACTIVE_24M = {0}" -f $v)
} catch { Write-Host ("ERR active24: {0}" -f $_.Exception.Message) }

try {
  $t = GetT "SELECT COUNT(*) AS c FROM (SELECT DISTINCT numw FROM orders) AS T"
  $v = $t.Rows[0].ItemArray[0]
  Write-Host ("DISTINCT_CUST_IN_ORDERS = {0}" -f $v)
} catch { Write-Host ("ERR dist_cust: {0}" -f $_.Exception.Message) }

try {
  $t = GetT "SELECT COUNT(*) AS c FROM (SELECT DISTINCT numw FROM checks) AS T"
  $v = $t.Rows[0].ItemArray[0]
  Write-Host ("DISTINCT_CUST_IN_CHECKS = {0}" -f $v)
} catch { Write-Host ("ERR dist_cust_checks: {0}" -f $_.Exception.Message) }

try {
  $t = GetT "SELECT COUNT(*) AS c FROM (SELECT DISTINCT numw FROM adchecks) AS T"
  $v = $t.Rows[0].ItemArray[0]
  Write-Host ("DISTINCT_CUST_IN_ADCHECKS = {0}" -f $v)
} catch { Write-Host ("ERR dist_cust_ad: {0}" -f $_.Exception.Message) }

# 13) duplicate zehut detection
try {
  $t = GetT "SELECT COUNT(*) AS c FROM (SELECT zehut FROM cust_list WHERE zehut IS NOT NULL AND zehut <> '' GROUP BY zehut HAVING COUNT(*) > 1) AS T"
  $v = $t.Rows[0].ItemArray[0]
  Write-Host ("DUPLICATE_ZEHUT_GROUPS = {0}" -f $v)
} catch {}

# 14) duplicate phone detection
try {
  $t = GetT "SELECT COUNT(*) AS c FROM (SELECT sel FROM cust_list WHERE sel IS NOT NULL AND sel <> '' GROUP BY sel HAVING COUNT(*) > 1) AS T"
  $v = $t.Rows[0].ItemArray[0]
  Write-Host ("DUPLICATE_MOBILE_GROUPS = {0}" -f $v)
} catch {}

# 15) Are some customers shared between cust_list and cust_listb?
try {
  $t = GetT "SELECT COUNT(*) AS c FROM cust_listb WHERE numw IN (SELECT numw FROM cust_list)"
  $v = $t.Rows[0].ItemArray[0]
  Write-Host ("CUST_LISTB_OVERLAP_CUST_LIST = {0}" -f $v)
} catch {}

# 16) tb_kabala — total per typ across years (revenue mix)
try {
  $t = GetT "SELECT typ, SUM(total) AS sumt, COUNT(*) AS c FROM tb_kabala GROUP BY typ ORDER BY 2 DESC"
  Save (Conv $t) 'kabala_revenue_by_typ.json'
} catch {}

# 17) Highest distinct values for cust_list.kupon (which 9 customers have a coupon)
try {
  $t = GetT "SELECT COUNT(*) AS c, kupon FROM cust_list WHERE kupon IS NOT NULL AND kupon <> '' GROUP BY kupon"
  Save (Conv $t) 'cust_kupon_dist.json'
} catch {}

# 18) tb_q_checks — only 1 row
try {
  $t = GetT "SELECT * FROM tb_q_checks"
  $arr = @()
  for ($i=0;$i -lt $t.Rows.Count;$i++) {
    $r = $t.Rows[$i]; $obj=[ordered]@{}
    for ($j=0;$j -lt $t.Columns.Count;$j++) {
      $col = $t.Columns[$j].ColumnName
      $v = $r.ItemArray[$j]
      if ([System.DBNull]::Value.Equals($v)) { $v = $null }
      # Mask PII-leaning fields
      if ($col -in @('cnum','hnum1','hnum2','hnum3','hnum4','remark','code_sapak')) {
        if ($null -ne $v) { $v = "(masked, len=" + ([string]$v).Length + ")" }
      }
      $obj[$col] = $v
    }
    $arr += [pscustomobject]$obj
  }
  Save $arr 'tb_q_checks_full.json'
} catch {}

$conn.Close()
Write-Host "DONE probe_misc"
