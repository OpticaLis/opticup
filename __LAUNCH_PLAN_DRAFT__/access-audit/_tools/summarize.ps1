param(
  [string]$Data = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data"
)

$ErrorActionPreference = 'Stop'

$tables = Get-Content (Join-Path $Data 'schema_tables.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$cols   = Get-Content (Join-Path $Data 'schema_columns.json')  -Raw -Encoding UTF8 | ConvertFrom-Json

Write-Output "=== TABLE_TYPE distribution ==="
$tables | Group-Object TABLE_TYPE | ForEach-Object { "{0,-15} {1,5}" -f $_.Name, $_.Count } | Write-Output

Write-Output ""
Write-Output "=== TABLES (TABLE_TYPE='TABLE') ==="
$tables | Where-Object TABLE_TYPE -eq 'TABLE' | Sort-Object TABLE_NAME | ForEach-Object { $_.TABLE_NAME } | Write-Output

Write-Output ""
Write-Output "=== SYSTEM TABLES ==="
$tables | Where-Object TABLE_TYPE -ne 'TABLE' | Sort-Object TABLE_TYPE, TABLE_NAME | ForEach-Object { "[{0}] {1}" -f $_.TABLE_TYPE, $_.TABLE_NAME } | Write-Output

Write-Output ""
Write-Output "=== USER TABLES with column counts ==="
$cols | Where-Object { ($tables | Where-Object { $_.TABLE_TYPE -eq 'TABLE' -and $_.TABLE_NAME -eq $_.TABLE_NAME }) } | Group-Object TABLE_NAME | Sort-Object Name | ForEach-Object { "{0,-40} cols={1}" -f $_.Name, $_.Count } | Write-Output
