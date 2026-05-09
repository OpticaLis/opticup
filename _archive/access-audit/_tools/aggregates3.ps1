param(
  [string]$Path = "C:\Users\User\opticup\tests\optic_dt.accdb",
  [string]$Out  = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data"
)

Add-Type -AssemblyName System.Data
$cs = "Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$Path;ReadOnly=1;"
$conn = New-Object System.Data.Odbc.OdbcConnection $cs
$conn.Open()

function Get-Table {
  param([System.Data.Odbc.OdbcConnection]$Conn, [string]$Sql)
  $cmd = $Conn.CreateCommand()
  $cmd.CommandText = $Sql
  $rdr = $cmd.ExecuteReader()
  $tab = New-Object System.Data.DataTable
  [void]$tab.Load($rdr)
  $rdr.Close()
  return ,$tab  # comma-prefix prevents pipeline unrolling
}

function Convert-TableToArray {
  param([System.Data.DataTable]$Tab)
  $arr = @()
  for ($i = 0; $i -lt $Tab.Rows.Count; $i++) {
    $row = $Tab.Rows[$i]
    $obj = [ordered]@{}
    for ($j = 0; $j -lt $Tab.Columns.Count; $j++) {
      $col = $Tab.Columns[$j]
      $v = $row.ItemArray[$j]
      if ([System.DBNull]::Value.Equals($v)) { $v = $null }
      $obj[$col.ColumnName] = $v
    }
    $arr += [pscustomobject]$obj
  }
  return ,$arr
}

function Save-Json {
  param([object]$Obj, [string]$File)
  ($Obj | ConvertTo-Json -Depth 6) | Out-File -Encoding utf8 $File
}

function Run-Save {
  param([string]$Sql, [string]$Name)
  try {
    $tab = Get-Table $conn $Sql
    $arr = Convert-TableToArray $tab
    Save-Json $arr (Join-Path $Out ("dist_{0}.json" -f $Name))
    Write-Host ("OK {0} rows={1}" -f $Name, $tab.Rows.Count)
  } catch {
    Write-Host ("ERR {0} :: {1}" -f $Name, $_.Exception.Message)
  }
}

function Single-Number {
  param([string]$Sql, [string]$Name)
  try {
    $tab = Get-Table $conn $Sql
    if ($tab.Rows.Count -eq 0) { return $null }
    $v = $tab.Rows[0].ItemArray[0]
    if ([System.DBNull]::Value.Equals($v)) { return $null }
    return $v
  } catch {
    Write-Host ("AGG_ERR {0} :: {1}" -f $Name, $_.Exception.Message)
    return $null
  }
}

# Per-table count from DAO is already in dao_tabledefs.json — no need to redo here.

# Date min/max + counts on KEY date columns
$dateProbes = @(
  @{tbl='orders';col='odate'},
  @{tbl='orders';col='dworka'},
  @{tbl='orders';col='ddonea'},
  @{tbl='orders';col='ddelva'},
  @{tbl='cust_list';col='cdate'},
  @{tbl='cust_list';col='bdate'},
  @{tbl='cust_list';col='colv'},
  @{tbl='checks';col='chdate'},
  @{tbl='adchecks';col='caddate'},
  @{tbl='tb_kabala';col='wdate'},
  @{tbl='person_remarks';col='datew'},
  @{tbl='tb_log';col='datew'},
  @{tbl='tb_order_rem';col='wdate'},
  @{tbl='tb_quest';col='datew'}
)
$dateResults = @()
foreach ($p in $dateProbes) {
  $sql = "SELECT MIN([$($p.col)]) AS mn, MAX([$($p.col)]) AS mx, COUNT([$($p.col)]) AS nn FROM [$($p.tbl)]"
  try {
    $tab = Get-Table $conn $sql
    $r = $tab.Rows[0]
    $mn = $r.ItemArray[0]; if ([System.DBNull]::Value.Equals($mn)) { $mn = $null }
    $mx = $r.ItemArray[1]; if ([System.DBNull]::Value.Equals($mx)) { $mx = $null }
    $nn = $r.ItemArray[2]; if ([System.DBNull]::Value.Equals($nn)) { $nn = 0 }
    $dateResults += [pscustomobject]@{ table=$p.tbl; col=$p.col; min=$mn; max=$mx; notnull=$nn }
    Write-Host ("DATE {0}.{1} min={2} max={3} notnull={4}" -f $p.tbl, $p.col, $mn, $mx, $nn)
  } catch {
    Write-Host ("DATE_ERR {0}.{1} :: {2}" -f $p.tbl, $p.col, $_.Exception.Message)
  }
}
Save-Json $dateResults (Join-Path $Out 'date_ranges.json')

# Distribution queries
$queries = @(
  @{name='orders_per_year';   sql="SELECT YEAR(odate) AS y, COUNT(*) AS c FROM orders WHERE odate IS NOT NULL GROUP BY YEAR(odate) ORDER BY YEAR(odate)"},
  @{name='cust_per_year';     sql="SELECT YEAR(cdate) AS y, COUNT(*) AS c FROM cust_list WHERE cdate IS NOT NULL GROUP BY YEAR(cdate) ORDER BY YEAR(cdate)"},
  @{name='checks_per_year';   sql="SELECT YEAR(chdate) AS y, COUNT(*) AS c FROM checks WHERE chdate IS NOT NULL GROUP BY YEAR(chdate) ORDER BY YEAR(chdate)"},
  @{name='kabala_per_year';   sql="SELECT YEAR(wdate) AS y, COUNT(*) AS c, SUM(total) AS sumt FROM tb_kabala WHERE wdate IS NOT NULL GROUP BY YEAR(wdate) ORDER BY YEAR(wdate)"},
  @{name='kabala_typ';        sql="SELECT typ, COUNT(*) AS c FROM tb_kabala GROUP BY typ ORDER BY COUNT(*) DESC"},
  @{name='cust_kupa_dist';    sql="SELECT kupa, COUNT(*) AS c FROM cust_list GROUP BY kupa ORDER BY COUNT(*) DESC"},
  @{name='cust_mkor_dist';    sql="SELECT mkor, COUNT(*) AS c FROM cust_list GROUP BY mkor ORDER BY COUNT(*) DESC"},
  @{name='cust_kamp_dist';    sql="SELECT kamp, COUNT(*) AS c FROM cust_list GROUP BY kamp ORDER BY COUNT(*) DESC"},
  @{name='cust_moadon_dist';  sql="SELECT moadon, COUNT(*) AS c FROM cust_list GROUP BY moadon ORDER BY COUNT(*) DESC"},
  @{name='cust_qhaver_dist';  sql="SELECT qhaver, COUNT(*) AS c FROM cust_list GROUP BY qhaver ORDER BY COUNT(*) DESC"},
  @{name='cust_min_dist';     sql="SELECT [min], COUNT(*) AS c FROM cust_list GROUP BY [min]"},
  @{name='cust_qmikzoa_dist'; sql="SELECT qmikzoa, COUNT(*) AS c FROM cust_list GROUP BY qmikzoa ORDER BY COUNT(*) DESC"},
  @{name='cust_yeda_dist';    sql="SELECT yeda, COUNT(*) AS c FROM cust_list GROUP BY yeda ORDER BY COUNT(*) DESC"},
  @{name='cust_sendb_dist';   sql="SELECT sendb, COUNT(*) AS c FROM cust_list GROUP BY sendb ORDER BY COUNT(*) DESC"},
  @{name='cust_qdomin_dist';  sql="SELECT qdomin, COUNT(*) AS c FROM cust_list GROUP BY qdomin ORDER BY COUNT(*) DESC"},
  @{name='cust_lty_dist';     sql="SELECT lty, COUNT(*) AS c FROM cust_list GROUP BY lty ORDER BY COUNT(*) DESC"},
  @{name='cust_ltm_dist';     sql="SELECT ltm, COUNT(*) AS c FROM cust_list GROUP BY ltm ORDER BY COUNT(*) DESC"},
  @{name='person_remarks_qtyp_dist'; sql="SELECT qtyp, COUNT(*) AS c FROM person_remarks GROUP BY qtyp ORDER BY COUNT(*) DESC"},
  @{name='tb_log_typ_dist';   sql="SELECT typ, COUNT(*) AS c FROM tb_log GROUP BY typ ORDER BY COUNT(*) DESC"},
  @{name='checks_qtyp_dist';  sql="SELECT qtyp, COUNT(*) AS c FROM checks GROUP BY qtyp ORDER BY COUNT(*) DESC"},
  @{name='checks_qtipul_dist';sql="SELECT qtipul, COUNT(*) AS c FROM checks GROUP BY qtipul ORDER BY COUNT(*) DESC"},
  @{name='orders_catga_dist'; sql="SELECT catga, COUNT(*) AS c FROM orders GROUP BY catga ORDER BY COUNT(*) DESC"},
  @{name='orders_catgb_dist'; sql="SELECT catgb, COUNT(*) AS c FROM orders GROUP BY catgb ORDER BY COUNT(*) DESC"},
  @{name='orders_qpart_dist'; sql="SELECT qpart, COUNT(*) AS c FROM orders GROUP BY qpart ORDER BY COUNT(*) DESC"},
  @{name='orders_qplace_dist';sql="SELECT qplace, COUNT(*) AS c FROM orders GROUP BY qplace ORDER BY COUNT(*) DESC"},
  @{name='orders_qplacea_dist';sql="SELECT qplacea, COUNT(*) AS c FROM orders GROUP BY qplacea ORDER BY COUNT(*) DESC"},
  @{name='orders_lang_dist';  sql="SELECT lang, COUNT(*) AS c FROM orders GROUP BY lang ORDER BY COUNT(*) DESC"},
  @{name='orders_yeda_dist';  sql="SELECT yeda, COUNT(*) AS c FROM orders GROUP BY yeda ORDER BY COUNT(*) DESC"},
  @{name='orders_qmsgr_dist'; sql="SELECT qmsgr, COUNT(*) AS c FROM orders GROUP BY qmsgr ORDER BY COUNT(*) DESC"},
  @{name='orders_rkamp_dist'; sql="SELECT rkamp, COUNT(*) AS c FROM orders GROUP BY rkamp ORDER BY COUNT(*) DESC"},
  @{name='orders_sapakm_dist';sql="SELECT sapakm, COUNT(*) AS c FROM orders GROUP BY sapakm ORDER BY COUNT(*) DESC"},
  @{name='checks_yeda_dist';  sql="SELECT yeda, COUNT(*) AS c FROM checks GROUP BY yeda ORDER BY COUNT(*) DESC"},
  @{name='cust_area_dist';    sql="SELECT area, COUNT(*) AS c FROM cust_list GROUP BY area ORDER BY COUNT(*) DESC"}
)
foreach ($q in $queries) { Run-Save $q.sql $q.name }

# Cardinality / fill / orphan queries
$cardQueries = @(
  @{n='orphan_orders'; s="SELECT COUNT(*) AS c FROM orders WHERE numw NOT IN (SELECT numw FROM cust_list)"},
  @{n='orders_no_kabala'; s="SELECT COUNT(*) AS c FROM orders WHERE rnum NOT IN (SELECT rnum FROM tb_kabala WHERE rnum IS NOT NULL)"},
  @{n='kabala_no_order'; s="SELECT COUNT(*) AS c FROM tb_kabala WHERE rnum NOT IN (SELECT rnum FROM orders WHERE rnum IS NOT NULL)"},
  @{n='cust_with_orders'; s="SELECT COUNT(DISTINCT numw) AS c FROM orders"},
  @{n='cust_with_checks'; s="SELECT COUNT(DISTINCT numw) AS c FROM checks"},
  @{n='cust_with_adchecks'; s="SELECT COUNT(DISTINCT numw) AS c FROM adchecks"},
  @{n='checks_no_customer'; s="SELECT COUNT(*) AS c FROM checks WHERE numw NOT IN (SELECT numw FROM cust_list)"},
  @{n='adchecks_no_customer'; s="SELECT COUNT(*) AS c FROM adchecks WHERE numw NOT IN (SELECT numw FROM cust_list)"},
  @{n='cust_no_name'; s="SELECT COUNT(*) AS c FROM cust_list WHERE (fname IS NULL OR fname='') AND (pname IS NULL OR pname='')"},
  @{n='cust_no_phone'; s="SELECT COUNT(*) AS c FROM cust_list WHERE (tel IS NULL OR tel='') AND (sel IS NULL OR sel='')"},
  @{n='cust_email'; s="SELECT COUNT(*) AS c FROM cust_list WHERE email IS NOT NULL AND email <> ''"},
  @{n='cust_zehut'; s="SELECT COUNT(*) AS c FROM cust_list WHERE zehut IS NOT NULL AND zehut <> ''"},
  @{n='cust_bdate'; s="SELECT COUNT(*) AS c FROM cust_list WHERE bdate IS NOT NULL"},
  @{n='cust_moadon'; s="SELECT COUNT(*) AS c FROM cust_list WHERE moadon IS NOT NULL AND moadon <> ''"},
  @{n='cust_kupa'; s="SELECT COUNT(*) AS c FROM cust_list WHERE kupa IS NOT NULL AND kupa <> ''"},
  @{n='cust_kupon'; s="SELECT COUNT(*) AS c FROM cust_list WHERE kupon IS NOT NULL AND kupon <> ''"},
  @{n='cust_msgdone'; s="SELECT COUNT(*) AS c FROM cust_list WHERE msgdone <> 0"},
  @{n='cust_open'; s="SELECT COUNT(*) AS c FROM cust_list WHERE cust_open <> 0"},
  @{n='cust_remark'; s="SELECT COUNT(*) AS c FROM cust_list WHERE remark IS NOT NULL AND LEN(remark) > 0"},
  @{n='cust_dremark'; s="SELECT COUNT(*) AS c FROM cust_list WHERE dremark IS NOT NULL AND LEN(dremark) > 0"},
  @{n='cust_khist'; s="SELECT COUNT(*) AS c FROM cust_list WHERE khist IS NOT NULL AND LEN(khist) > 0"},
  @{n='cust_address'; s="SELECT COUNT(*) AS c FROM cust_list WHERE address IS NOT NULL AND address <> ''"},
  @{n='cust_city'; s="SELECT COUNT(*) AS c FROM cust_list WHERE city IS NOT NULL AND city <> ''"},
  @{n='orders_two_frames'; s="SELECT COUNT(*) AS c FROM orders WHERE ob_comp2 IS NOT NULL AND ob_comp2 <> ''"},
  @{n='orders_sun'; s="SELECT COUNT(*) AS c FROM orders WHERE sun <> 0 OR sun2 <> 0"},
  @{n='orders_multi'; s="SELECT COUNT(*) AS c FROM orders WHERE multia <> 0 OR multib <> 0"},
  @{n='orders_lab_disp'; s="SELECT COUNT(*) AS c FROM orders WHERE dworka IS NOT NULL"},
  @{n='orders_lab_done'; s="SELECT COUNT(*) AS c FROM orders WHERE ddonea IS NOT NULL"},
  @{n='orders_delivered'; s="SELECT COUNT(*) AS c FROM orders WHERE ddelva IS NOT NULL"},
  @{n='orders_with_emp'; s="SELECT COUNT(*) AS c FROM orders WHERE EmployeeID IS NOT NULL"},
  @{n='orders_w_kamp'; s="SELECT COUNT(*) AS c FROM orders WHERE rkamp IS NOT NULL AND rkamp <> ''"},
  @{n='orders_w_disc'; s="SELECT COUNT(*) AS c FROM orders WHERE gdisc <> 0"},
  @{n='orders_w_zikuy'; s="SELECT COUNT(*) AS c FROM orders WHERE zikuy IS NOT NULL AND zikuy <> 0"},
  @{n='orders_w_sapakm'; s="SELECT COUNT(*) AS c FROM orders WHERE sapakm IS NOT NULL AND sapakm <> ''"},
  @{n='cust_with_open_zehut_dup'; s="SELECT COUNT(*) AS c FROM cust_list WHERE zehut IN (SELECT zehut FROM cust_list WHERE zehut IS NOT NULL AND zehut <> '' GROUP BY zehut HAVING COUNT(*) > 1)"},
  @{n='kabala_total_sum'; s="SELECT SUM(total) AS c FROM tb_kabala"},
  @{n='kabala_min_date'; s="SELECT FORMAT(MIN(wdate),'yyyy-mm-dd') AS c FROM tb_kabala"},
  @{n='kabala_max_date'; s="SELECT FORMAT(MAX(wdate),'yyyy-mm-dd') AS c FROM tb_kabala"},
  @{n='checks_with_remark'; s="SELECT COUNT(*) AS c FROM checks WHERE remark IS NOT NULL AND LEN(remark) > 0"},
  @{n='cust_recently_active'; s="SELECT COUNT(DISTINCT cust_list.numw) AS c FROM cust_list INNER JOIN orders ON cust_list.numw = orders.numw WHERE orders.odate >= DATESERIAL(2024,1,1)"},
  @{n='cust_active_2y'; s="SELECT COUNT(DISTINCT cust_list.numw) AS c FROM cust_list INNER JOIN orders ON cust_list.numw = orders.numw WHERE orders.odate >= DATESERIAL(2024,5,1)"},
  @{n='cust_active_5y'; s="SELECT COUNT(DISTINCT cust_list.numw) AS c FROM cust_list INNER JOIN orders ON cust_list.numw = orders.numw WHERE orders.odate >= DATESERIAL(2021,5,1)"}
)
$cardResults = [ordered]@{}
foreach ($q in $cardQueries) {
  $v = Single-Number $q.s $q.n
  $cardResults[$q.n] = $v
  Write-Host ("CARD {0} = {1}" -f $q.n, $v)
}
Save-Json $cardResults (Join-Path $Out 'cardinality.json')

$conn.Close()
Write-Host "DONE aggregates3"
