param(
  [string]$Path = "C:\Users\User\opticup\tests\optic_dt.accdb",
  [string]$Out  = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data"
)

Set-StrictMode -Off
$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName System.Data

$cs = "Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$Path;ReadOnly=1;"
$conn = New-Object System.Data.Odbc.OdbcConnection $cs
$conn.Open()

function Run-Query {
  param([string]$Sql, [string]$Tag)
  try {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $Sql
    $rdr = $cmd.ExecuteReader()
    $tab = New-Object System.Data.DataTable
    $tab.Load($rdr) | Out-Null
    $rdr.Close()
    return $tab
  } catch {
    Write-Output ("FAIL [{0}] :: {1}" -f $Tag, $_.Exception.Message)
    return $null
  }
}

function Single-Value {
  param([string]$Sql, [string]$Tag)
  $t = Run-Query $Sql $Tag
  if ($null -eq $t) { return $null }
  if ($t.Rows.Count -eq 0) { return $null }
  $val = $t.Rows[0][0]
  if ([System.DBNull]::Value.Equals($val)) { return $null }
  return $val
}

# Load DAO column file
$cols = Get-Content (Join-Path $Out 'dao_columns.json') -Raw -Encoding UTF8 | ConvertFrom-Json

$targets = @(
  'cust_list','cust_listb','orders','tb_kabala','checks','adchecks','items_sales',
  'proposals','person_remarks','tb_log','tb_order_rem','tb_quest','employees','tb_q_checks',
  'companyn','doc_title','add_order','add_num','BANK_LIST','CREDIT_LIST','presence_type'
)

# Per-table counts and date ranges
$summary = @()
foreach ($t in $targets) {
  Write-Output ("Processing {0}..." -f $t)
  $row = [ordered]@{}
  $row.table = $t
  $row.count = Single-Value "SELECT COUNT(*) FROM [$t]" "count_$t"

  $dateCols = @($cols | Where-Object { $_.Table -eq $t -and [int]$_.Type -eq 8 } | ForEach-Object { $_.Field })
  $row.date_columns = $dateCols
  $row.date_ranges = @()
  foreach ($dc in $dateCols) {
    $sql = "SELECT MIN([$dc]) AS mn, MAX([$dc]) AS mx, COUNT([$dc]) AS nn FROM [$t]"
    $tab = Run-Query $sql "range_${t}_${dc}"
    if ($null -ne $tab -and $tab.Rows.Count -gt 0) {
      $rr = $tab.Rows[0]
      $mn = if ([System.DBNull]::Value.Equals($rr['mn'])) { $null } else { $rr['mn'] }
      $mx = if ([System.DBNull]::Value.Equals($rr['mx'])) { $null } else { $rr['mx'] }
      $nn = if ([System.DBNull]::Value.Equals($rr['nn'])) { 0    } else { $rr['nn'] }
      $row.date_ranges += [pscustomobject]@{ col=$dc; min=$mn; max=$mx; notnull=$nn }
    }
  }

  # NULL fill rate per non-binary column
  $row.fill = @()
  foreach ($cf in ($cols | Where-Object { $_.Table -eq $t })) {
    if ([int]$cf.Type -in 9,11,101,102) { continue }  # binary/OLE/attachment/complex
    $sql = "SELECT COUNT([$($cf.Field)]) FROM [$t]"
    $v = Single-Value $sql "fill_${t}_${cf.Field}"
    if ($null -ne $v) {
      $row.fill += [pscustomobject]@{ col=$cf.Field; notnull=[int]$v }
    }
  }

  $summary += [pscustomobject]$row
}

$summary | ConvertTo-Json -Depth 6 | Out-File -Encoding utf8 (Join-Path $Out 'aggregates.json')
Write-Output ("AGGREGATES tables={0}" -f $summary.Count)

# Time-series histograms for activity span
$queries = @(
  @{name='orders_per_year'; sql="SELECT YEAR(odate) AS y, COUNT(*) AS c FROM orders WHERE odate IS NOT NULL GROUP BY YEAR(odate) ORDER BY YEAR(odate)"},
  @{name='cust_per_year'; sql="SELECT YEAR(cdate) AS y, COUNT(*) AS c FROM cust_list WHERE cdate IS NOT NULL GROUP BY YEAR(cdate) ORDER BY YEAR(cdate)"},
  @{name='checks_per_year'; sql="SELECT YEAR(chdate) AS y, COUNT(*) AS c FROM checks WHERE chdate IS NOT NULL GROUP BY YEAR(chdate) ORDER BY YEAR(chdate)"},
  @{name='kabala_per_year'; sql="SELECT YEAR(wdate) AS y, COUNT(*) AS c, SUM(total) AS sumt FROM tb_kabala WHERE wdate IS NOT NULL GROUP BY YEAR(wdate) ORDER BY YEAR(wdate)"},
  @{name='kabala_typ'; sql="SELECT typ, COUNT(*) AS c FROM tb_kabala GROUP BY typ ORDER BY COUNT(*) DESC"},
  @{name='cust_kupa_dist'; sql="SELECT kupa, COUNT(*) AS c FROM cust_list GROUP BY kupa ORDER BY COUNT(*) DESC"},
  @{name='cust_mkor_dist'; sql="SELECT mkor, COUNT(*) AS c FROM cust_list GROUP BY mkor ORDER BY COUNT(*) DESC"},
  @{name='cust_kamp_dist'; sql="SELECT kamp, COUNT(*) AS c FROM cust_list GROUP BY kamp ORDER BY COUNT(*) DESC"},
  @{name='cust_moadon_dist'; sql="SELECT moadon, COUNT(*) AS c FROM cust_list GROUP BY moadon ORDER BY COUNT(*) DESC"},
  @{name='cust_qhaver_dist'; sql="SELECT qhaver, COUNT(*) AS c FROM cust_list GROUP BY qhaver ORDER BY COUNT(*) DESC"},
  @{name='person_remarks_qtyp_dist'; sql="SELECT qtyp, COUNT(*) AS c FROM person_remarks GROUP BY qtyp ORDER BY COUNT(*) DESC"},
  @{name='tb_log_typ_dist'; sql="SELECT typ, COUNT(*) AS c FROM tb_log GROUP BY typ ORDER BY COUNT(*) DESC"},
  @{name='checks_qtyp_dist'; sql="SELECT qtyp, COUNT(*) AS c FROM checks GROUP BY qtyp ORDER BY COUNT(*) DESC"},
  @{name='orders_catga_dist'; sql="SELECT catga, COUNT(*) AS c FROM orders GROUP BY catga ORDER BY COUNT(*) DESC"},
  @{name='orders_qpart_dist'; sql="SELECT qpart, COUNT(*) AS c FROM orders GROUP BY qpart ORDER BY COUNT(*) DESC"}
)
foreach ($q in $queries) {
  $tab = Run-Query $q.sql $q.name
  if ($null -ne $tab) {
    $arr = @()
    foreach ($rr in $tab.Rows) {
      $obj = [ordered]@{}
      foreach ($c in $tab.Columns) {
        $val = $rr[$c]
        if ([System.DBNull]::Value.Equals($val)) { $val = $null }
        $obj[$c.ColumnName] = $val
      }
      $arr += [pscustomobject]$obj
    }
    $arr | ConvertTo-Json -Depth 3 | Out-File -Encoding utf8 (Join-Path $Out ("dist_{0}.json" -f $q.name))
    Write-Output ("DIST {0} rows={1}" -f $q.name, $tab.Rows.Count)
  }
}

# Cardinality checks
$qaggs = @(
  @{n='orphan_orders'; s="SELECT COUNT(*) FROM orders LEFT JOIN cust_list ON orders.numw = cust_list.numw WHERE cust_list.numw IS NULL"},
  @{n='orders_no_kabala'; s="SELECT COUNT(*) FROM orders LEFT JOIN tb_kabala ON orders.rnum = tb_kabala.rnum WHERE tb_kabala.rnum IS NULL"},
  @{n='kabala_no_order';  s="SELECT COUNT(*) FROM tb_kabala LEFT JOIN orders ON tb_kabala.rnum = orders.rnum WHERE orders.rnum IS NULL"},
  @{n='cust_with_orders'; s="SELECT COUNT(DISTINCT cust_list.numw) FROM cust_list INNER JOIN orders ON cust_list.numw = orders.numw"},
  @{n='cust_with_checks'; s="SELECT COUNT(DISTINCT cust_list.numw) FROM cust_list INNER JOIN checks ON cust_list.numw = checks.numw"},
  @{n='cust_with_adchecks'; s="SELECT COUNT(DISTINCT cust_list.numw) FROM cust_list INNER JOIN adchecks ON cust_list.numw = adchecks.numw"},
  @{n='cust_no_name';     s="SELECT COUNT(*) FROM cust_list WHERE (fname IS NULL OR fname='') AND (pname IS NULL OR pname='')"},
  @{n='cust_no_phone';    s="SELECT COUNT(*) FROM cust_list WHERE (tel IS NULL OR tel='') AND (sel IS NULL OR sel='')"},
  @{n='cust_email';       s="SELECT COUNT(*) FROM cust_list WHERE email IS NOT NULL AND email <> ''"},
  @{n='cust_zehut';       s="SELECT COUNT(*) FROM cust_list WHERE zehut IS NOT NULL AND zehut <> ''"},
  @{n='cust_bdate';       s="SELECT COUNT(*) FROM cust_list WHERE bdate IS NOT NULL"},
  @{n='cust_moadon';      s="SELECT COUNT(*) FROM cust_list WHERE moadon IS NOT NULL AND moadon <> ''"},
  @{n='cust_kupa';        s="SELECT COUNT(*) FROM cust_list WHERE kupa IS NOT NULL AND kupa <> ''"},
  @{n='cust_kupon';       s="SELECT COUNT(*) FROM cust_list WHERE kupon IS NOT NULL AND kupon <> ''"},
  @{n='cust_msgdone';     s="SELECT COUNT(*) FROM cust_list WHERE msgdone = -1"},
  @{n='cust_open';        s="SELECT COUNT(*) FROM cust_list WHERE cust_open = -1"},
  @{n='orders_two_frames';s="SELECT COUNT(*) FROM orders WHERE ob_comp2 IS NOT NULL AND ob_comp2 <> ''"},
  @{n='orders_sun';       s="SELECT COUNT(*) FROM orders WHERE sun=-1 OR sun2=-1"},
  @{n='orders_multi';     s="SELECT COUNT(*) FROM orders WHERE multia=-1 OR multib=-1"},
  @{n='orders_lab_disp';  s="SELECT COUNT(*) FROM orders WHERE dworka IS NOT NULL"},
  @{n='orders_lab_done';  s="SELECT COUNT(*) FROM orders WHERE ddonea IS NOT NULL"},
  @{n='orders_delivered'; s="SELECT COUNT(*) FROM orders WHERE ddelva IS NOT NULL"},
  @{n='orders_with_emp';  s="SELECT COUNT(*) FROM orders WHERE EmployeeID IS NOT NULL"},
  @{n='orders_w_kamp';    s="SELECT COUNT(*) FROM orders WHERE rkamp IS NOT NULL AND rkamp <> ''"},
  @{n='orders_w_disc';    s="SELECT COUNT(*) FROM orders WHERE gdisc <> 0"},
  @{n='orders_w_zikuy';   s="SELECT COUNT(*) FROM orders WHERE zikuy IS NOT NULL AND zikuy <> 0"},
  @{n='checks_w_emp';     s="SELECT COUNT(DISTINCT checkname) FROM checks WHERE checkname IS NOT NULL AND checkname <> ''"},
  @{n='cust_with_zehut_dup'; s="SELECT COUNT(*) FROM cust_list WHERE zehut IN (SELECT zehut FROM cust_list WHERE zehut IS NOT NULL AND zehut <> '' GROUP BY zehut HAVING COUNT(*) > 1)"},
  @{n='kabala_w_total';   s="SELECT SUM(total) FROM tb_kabala"},
  @{n='orders_with_proposal_link'; s="SELECT COUNT(*) FROM orders WHERE ordernum > 0"}
)
$summaryAggs = @{}
foreach ($q in $qaggs) {
  $v = Single-Value $q.s $q.n
  if ($null -ne $v) {
    $summaryAggs[$q.n] = $v
    Write-Output ("AGG {0} = {1}" -f $q.n, $v)
  } else {
    Write-Output ("AGG {0} = (null)" -f $q.n)
  }
}
$summaryAggs | ConvertTo-Json -Depth 3 | Out-File -Encoding utf8 (Join-Path $Out 'cardinality_aggs.json')

# Histogram of orders by year-month for last 5 years (privacy-safe)
try {
  $sql = "SELECT YEAR(odate) AS y, MONTH(odate) AS m, COUNT(*) AS c FROM orders WHERE odate IS NOT NULL AND odate >= DATESERIAL(YEAR(NOW())-6,1,1) GROUP BY YEAR(odate), MONTH(odate) ORDER BY 1,2"
  $tab = Run-Query $sql "orders_ym"
  if ($null -ne $tab) {
    $arr = @()
    foreach ($rr in $tab.Rows) {
      $arr += [pscustomobject]@{ y=$rr['y']; m=$rr['m']; c=$rr['c'] }
    }
    $arr | ConvertTo-Json | Out-File -Encoding utf8 (Join-Path $Out 'orders_year_month.json')
    Write-Output ("ORDERS_YM rows={0}" -f $tab.Rows.Count)
  }
} catch { Write-Output ("orders_ym fail: {0}" -f $_.Exception.Message) }

$conn.Close()
Write-Output "DONE aggregates2"
