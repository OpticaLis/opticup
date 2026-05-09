param([string]$Out = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe")

$qdefs = Get-Content (Join-Path $Out 'querydefs_full.json') -Raw -Encoding UTF8 | ConvertFrom-Json

function Save([object]$o, [string]$f) {
  ($o | ConvertTo-Json -Depth 6) | Out-File -Encoding utf8 (Join-Path $Out $f)
}

# 1) Top-30 longest queries (full SQL)
$top30 = $qdefs | Sort-Object { $_.SQL.Length } -Descending | Select-Object -First 30 | Select-Object Name, Type, SQL
Save $top30 'queries_top30_longest.json'
Write-Host ("Top-30 longest saved")

# 2) All qmail_ queries
$qmail = $qdefs | Where-Object { $_.Name -like 'qmail*' } | Select-Object Name, Type, SQL
Save $qmail 'queries_qmail.json'
Write-Host ("qmail saved: {0}" -f @($qmail).Count)

# 3) All del_ queries
$qdel = $qdefs | Where-Object { $_.Name -like 'del_*' -or $_.Name -like 'del*' } | Select-Object Name, Type, SQL
Save $qdel 'queries_del.json'
Write-Host ("del saved: {0}" -f @($qdel).Count)

# 4) All upd_ queries
$qupd = $qdefs | Where-Object { $_.Name -like 'upd_*' -or $_.Name -like 'upd*' } | Select-Object Name, Type, SQL
Save $qupd 'queries_upd.json'
Write-Host ("upd saved: {0}" -f @($qupd).Count)

# 5) Action queries (Type 32, 64, 80, 96, 128) — modifies data
$qaction = $qdefs | Where-Object { $_.Type -in 32, 48, 64, 80, 96, 128 -or $_.SQL -match '^\s*(INSERT|UPDATE|DELETE)' } | Select-Object Name, Type, @{n='SQLPreview';e={$_.SQL.Substring(0,[Math]::Min(300, $_.SQL.Length))}}
Save $qaction 'queries_action.json'
Write-Host ("action saved: {0}" -f @($qaction).Count)

# 6) SQL Pass-Through (Type 32) — usually external integrations
$qpassthru = $qdefs | Where-Object { $_.Type -eq 32 } | Select-Object Name, Type, SQL
Save $qpassthru 'queries_passthru.json'
Write-Host ("passthru saved: {0}" -f @($qpassthru).Count)

# 7) Make-Table queries (Type 64) — ETL operations
$qmake = $qdefs | Where-Object { $_.Type -eq 64 } | Select-Object Name, Type, SQL
Save $qmake 'queries_maketable.json'
Write-Host ("maketable saved: {0}" -f @($qmake).Count)

# 8) Multi-JOIN queries excluding ~sq (manual queries with multi-join = real business logic)
$qmultiJoin = $qdefs | Where-Object { $_.Name -notlike '~sq*' -and (($_.SQL -split 'JOIN').Count -ge 3) } | Select-Object Name, Type, @{n='joinCount';e={(($_.SQL -split 'JOIN').Count - 1)}}, @{n='SQLLen';e={$_.SQL.Length}}
Save $qmultiJoin 'queries_multi_join_index.json'
Write-Host ("multi-join (manual) index saved: {0}" -f @($qmultiJoin).Count)

# 9) Hebrew-named queries (likely user-facing names)
$qhebrew = $qdefs | Where-Object { $_.Name -cmatch '[֐-׿]' } | Select-Object Name, Type, @{n='SQLPreview';e={$_.SQL.Substring(0,[Math]::Min(200,$_.SQL.Length))}}
Save $qhebrew 'queries_hebrew_names.json'
Write-Host ("hebrew named saved: {0}" -f @($qhebrew).Count)

# 10) Search for special keywords in SQL — hints at integrations / business logic
$keywordHits = @()
$keywords = @(
  @{kw='SAPAKIM';label='supplier list'},
  @{kw='tb_credits';label='credits table'},
  @{kw='tb_yoman';label='diary'},
  @{kw='tb_catalog';label='catalog'},
  @{kw='tb_ad_catalog';label='ad catalog'},
  @{kw='Watsp';label='WhatsApp'},
  @{kw='Watsap';label='WhatsApp'},
  @{kw='SMS';label='SMS'},
  @{kw='kupa';label='health fund'},
  @{kw='moadon';label='loyalty club'},
  @{kw='hesh';label='account'},
  @{kw='YEAR(';label='year func'},
  @{kw='DATEDIFF';label='datediff'},
  @{kw='IIF';label='conditional'},
  @{kw='Forms!';label='form reference'},
  @{kw='Reports!';label='report reference'}
)
foreach ($k in $keywords) {
  $hits = ($qdefs | Where-Object { $_.SQL -like ("*" + $k.kw + "*") }).Count
  $keywordHits += [pscustomobject]@{ keyword=$k.kw; label=$k.label; queryCount=$hits }
  Write-Host ("  KW {0,-25} {1,5}" -f $k.kw, $hits)
}
Save $keywordHits 'queries_keyword_hits.json'

# 11) Count IIF (CASE-like) — measure of buried logic
$iifCount = ($qdefs | Where-Object { $_.SQL -match 'IIF' }).Count
$iifTotal = ($qdefs | Where-Object { $_.SQL -match 'IIF' } | ForEach-Object { ([regex]::Matches($_.SQL, 'IIF')).Count } | Measure-Object -Sum).Sum
Write-Host ("IIF queries: {0} / total IIF expressions: {1}" -f $iifCount, $iifTotal)

# 12) Forms!  — references to forms (UI-driven SQL)
$formRef = $qdefs | Where-Object { $_.SQL -match 'Forms!' } | Select-Object Name, @{n='formRefs';e={[regex]::Matches($_.SQL,'Forms!\w+').Value -join ','}}
Save $formRef 'queries_form_refs.json'
Write-Host ("Form-referencing queries: {0}" -f @($formRef).Count)
