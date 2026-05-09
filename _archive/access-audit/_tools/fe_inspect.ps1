param([string]$Out = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe")

$qdefs = Get-Content (Join-Path $Out 'querydefs_full.json') -Raw -Encoding UTF8 | ConvertFrom-Json

function Save([object]$o, [string]$f) {
  ($o | ConvertTo-Json -Depth 6) | Out-File -Encoding utf8 (Join-Path $Out $f)
}

# 1) q_check_again_* family — follow-up call cadence
$ckag = $qdefs | Where-Object { $_.Name -like 'q_check_again*' } | Select-Object Name, Type, SQL
Save $ckag 'queries_check_again.json'
Write-Host ("check_again: {0}" -f @($ckag).Count)

# 2) tb_credits-related queries (loyalty/credits)
$creds = $qdefs | Where-Object { $_.SQL -like '*tb_credits*' -or $_.Name -like '*credit*' } | Select-Object Name, Type, SQL
Save $creds 'queries_credits.json'
Write-Host ("credits: {0}" -f @($creds).Count)

# 3) tb_yoman-related queries (diary/scheduler)
$yoman = $qdefs | Where-Object { $_.SQL -like '*tb_yoman*' -or $_.Name -like '*yoman*' } | Select-Object Name, Type, SQL
Save $yoman 'queries_yoman.json'
Write-Host ("yoman: {0}" -f @($yoman).Count)

# 4) UPDATE queries — direct state changes
$upd = $qdefs | Where-Object { $_.Type -eq 48 -or $_.SQL -match '^\s*UPDATE' } | Select-Object Name, Type, SQL
Save $upd 'queries_update.json'
Write-Host ("update: {0}" -f @($upd).Count)

# 5) qprt_/prt_ queries — print queries
$prt = $qdefs | Where-Object { $_.Name -like 'qprt*' -or $_.Name -like 'prt_*' -or $_.Name -like 'qp_*' } | Select-Object Name, Type, @{n='SQLPreview';e={$_.SQL.Substring(0,[Math]::Min(500,$_.SQL.Length))}}
Save $prt 'queries_print_index.json'
Write-Host ("print: {0}" -f @($prt).Count)

# 6) qlist_sales* — sales list queries (pricing formulas)
$sal = $qdefs | Where-Object { $_.Name -like 'qlist_sales*' -or $_.Name -like 'qlist_total*' } | Select-Object Name, Type, SQL
Save $sal 'queries_sales.json'
Write-Host ("sales: {0}" -f @($sal).Count)

# 7) Look for specific keywords — count queries that touch each
$keywords = @('tb_credits','tb_yoman','tb_log','tb_kabala','SAPAKIM','sapakm','catalog','presence','attendance','ahuz')
foreach ($k in $keywords) {
  $hits = $qdefs | Where-Object { $_.SQL -match $k } | Select-Object -ExpandProperty Name | Sort-Object
  Write-Host ("KW {0,-15} count={1}" -f $k, @($hits).Count)
}

# 8) Form names referenced in queries — reveals the entry-points
$formRefs = @{}
foreach ($q in $qdefs) {
  $matches2 = [regex]::Matches($q.SQL, 'Forms!([\w_]+)')
  foreach ($m in $matches2) {
    $f = $m.Groups[1].Value
    if (-not $formRefs.ContainsKey($f)) { $formRefs[$f] = 0 }
    $formRefs[$f]++
  }
}
$formRefArr = $formRefs.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { [pscustomobject]@{ form=$_.Key; queryCount=$_.Value } }
Save $formRefArr 'forms_referenced_in_queries.json'
Write-Host ""
Write-Host "=== Forms most referenced in queries (top 30) ==="
$formRefArr | Select-Object -First 30 | ForEach-Object { Write-Host ("  {0,-30} {1}" -f $_.form, $_.queryCount) }
