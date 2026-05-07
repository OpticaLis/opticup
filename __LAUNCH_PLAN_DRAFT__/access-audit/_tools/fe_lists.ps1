param([string]$Out = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe")

$cont = Get-Content (Join-Path $Out 'containers_full.json') -Raw -Encoding UTF8 | ConvertFrom-Json

Write-Host "=== ALL FORMS (149) ==="
$cont.Forms | Sort-Object Name | ForEach-Object { Write-Host ("  " + $_.Name) }

Write-Host ""
Write-Host "=== ALL REPORTS (123) ==="
$cont.Reports | Sort-Object Name | ForEach-Object { Write-Host ("  " + $_.Name) }
