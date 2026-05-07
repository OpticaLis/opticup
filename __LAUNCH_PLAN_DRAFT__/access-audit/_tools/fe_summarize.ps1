param(
  [string]$Out = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe"
)

# Load
$qdefs = Get-Content (Join-Path $Out 'querydefs_full.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$tdefs = Get-Content (Join-Path $Out 'tabledefs_full.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$cont  = Get-Content (Join-Path $Out 'containers_full.json') -Raw -Encoding UTF8 | ConvertFrom-Json

Write-Host "=== Linked Tables (front-end -> back-end) ==="
$linked = $tdefs | Where-Object { $_.Connect -ne "" -and $_.Connect -ne $null }
Write-Host ("Linked count: {0}" -f @($linked).Count)
$linked | Sort-Object Name | ForEach-Object {
  Write-Host ("  {0,-25} -> {1}" -f $_.Name, $_.Connect)
}

Write-Host ""
Write-Host "=== LOCAL TableDefs (NOT linked, NOT MSys) ==="
$local = $tdefs | Where-Object { ($_.Connect -eq "" -or $_.Connect -eq $null) -and $_.Name -notlike "MSys*" -and $_.Name -notlike "~*" }
Write-Host ("Local count: {0}" -f @($local).Count)
$local | Sort-Object Name | ForEach-Object {
  Write-Host ("  {0,-30} fields={1} rows={2}" -f $_.Name, $_.FieldCount, $_.RecordCount)
}

Write-Host ""
Write-Host "=== QueryDef TYPE distribution ==="
$qdefs | Group-Object Type | Sort-Object Name | ForEach-Object {
  Write-Host ("  Type {0,-5} count={1}" -f $_.Name, $_.Count)
}

# QueryDef Type codes:
# 0   = Select   1   = Action 2 = Crosstab
# 16  = DDL      32  = SQL Pass-Through  64 = Make Table
# 80  = Append   96 = Update  128 = Delete

Write-Host ""
Write-Host "=== QueryDef name patterns ==="
$qdefs | Group-Object { ($_.Name -split '[_\.\-]')[0] } | Sort-Object Count -Descending | Select-Object -First 30 | ForEach-Object {
  Write-Host ("  prefix '{0,-15}' count={1}" -f $_.Name, $_.Count)
}

Write-Host ""
Write-Host "=== QueryDef SQL keyword analysis ==="
$selectCount = ($qdefs | Where-Object { $_.SQL -match '^\s*SELECT' }).Count
$insertCount = ($qdefs | Where-Object { $_.SQL -match '^\s*INSERT' }).Count
$updateCount = ($qdefs | Where-Object { $_.SQL -match '^\s*UPDATE' }).Count
$deleteCount = ($qdefs | Where-Object { $_.SQL -match '^\s*DELETE' }).Count
$ddlCount    = ($qdefs | Where-Object { $_.SQL -match '^\s*(CREATE|ALTER|DROP)' }).Count
$transactCount = ($qdefs | Where-Object { $_.SQL -match 'TRANSFORM' }).Count
Write-Host ("  SELECT  : {0}" -f $selectCount)
Write-Host ("  INSERT  : {0}" -f $insertCount)
Write-Host ("  UPDATE  : {0}" -f $updateCount)
Write-Host ("  DELETE  : {0}" -f $deleteCount)
Write-Host ("  DDL     : {0}" -f $ddlCount)
Write-Host ("  TRANSFORM(crosstab): {0}" -f $transactCount)

Write-Host ""
Write-Host "=== QueryDef SQL JOIN complexity ==="
$noJoin = ($qdefs | Where-Object { $_.SQL -notmatch 'JOIN' }).Count
$singleJoin = ($qdefs | Where-Object { ($_.SQL -split 'JOIN').Count -eq 2 }).Count
$multiJoin = ($qdefs | Where-Object { ($_.SQL -split 'JOIN').Count -ge 3 }).Count
Write-Host ("  No JOIN        : {0}" -f $noJoin)
Write-Host ("  Single JOIN    : {0}" -f $singleJoin)
Write-Host ("  Multi JOIN (>=2): {0}" -f $multiJoin)

Write-Host ""
Write-Host "=== Forms list (149) — sample first 50 ==="
$forms = $cont.Forms
Write-Host ("Forms total: {0}" -f $forms.Count)
$forms | Sort-Object Name | Select-Object -First 50 | ForEach-Object { Write-Host ("  {0}" -f $_.Name) }

Write-Host ""
Write-Host "=== Reports list (123) — sample first 50 ==="
$reports = $cont.Reports
Write-Host ("Reports total: {0}" -f $reports.Count)
$reports | Sort-Object Name | Select-Object -First 50 | ForEach-Object { Write-Host ("  {0}" -f $_.Name) }

Write-Host ""
Write-Host "=== Modules list (15) ==="
$mods = $cont.Modules
$mods | Sort-Object Name | ForEach-Object { Write-Host ("  {0}" -f $_.Name) }

Write-Host ""
Write-Host "=== Scripts (Macros) list (28) ==="
$scripts = $cont.Scripts
$scripts | Sort-Object Name | ForEach-Object { Write-Host ("  {0}" -f $_.Name) }

Write-Host ""
Write-Host "=== Top 30 longest queries (likely report/business logic) ==="
$qdefs | Sort-Object { $_.SQL.Length } -Descending | Select-Object -First 30 | ForEach-Object {
  Write-Host ("  {0,-50} sql_len={1}" -f $_.Name, $_.SQL.Length)
}

# Save sorted query name list
$qdefs | Select-Object Name, Type, @{n='SQLLen';e={$_.SQL.Length}} | Sort-Object Name | ConvertTo-Json -Depth 3 | Out-File -Encoding utf8 (Join-Path $Out 'queries_index.json')
Write-Host "queries_index.json saved"
