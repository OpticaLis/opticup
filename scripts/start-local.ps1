# start-local.ps1 — Launch ERP (localhost:3000) + Storefront (localhost:4321) for safety-net testing
#
# Owner: opticup-localhost-tester skill (Task 3 of safety infra, 2026-05-10).
# Exit 0 = both servers up within 30s. Exit 1 = at least one failed.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1
#
# Servers run as detached child processes (Start-Process). Stop with:
#   Stop-Process -Name node -Force          (heavy hammer; kills all node)
# or look for the launched windows by title and close them manually.
#
# History note (2026-05-10): originally used Start-Job, which silently
# failed because npm/npx need a real terminal. Start-Process is reliable.

$ErrorActionPreference = 'Stop'

$ErpRoot   = (Resolve-Path "$PSScriptRoot\..").Path
$StoreRoot = (Resolve-Path "$PSScriptRoot\..\..\opticup-storefront").Path
$CredFile  = "$env:USERPROFILE\.optic-up\credentials.env"

Write-Host "=== Optic Up - Local Stack Launcher ===" -ForegroundColor Cyan
Write-Host "ERP root:        $ErpRoot"
Write-Host "Storefront root: $StoreRoot"

if (-not (Test-Path $StoreRoot)) {
    Write-Host "FAIL: Storefront repo not found at $StoreRoot" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $CredFile)) {
    Write-Host "WARN: $CredFile not found. Storefront may need DB env vars." -ForegroundColor Yellow
}

# Quick port-already-in-use check (skip launching that server if up).
# Uses Invoke-WebRequest because it handles IPv4/IPv6 dual-stack natively;
# raw TcpClient defaults to IPv4 only and misses Astro's [::1]-only bind
# on Windows. Detected on 2026-05-10. TimeoutSec needs to be ≥3 to give
# Astro's dev server time to respond on first cold hit.
function Test-Port {
    param([int]$Port, [string]$Path = '/')
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$Port$Path" `
                                -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        return $r.StatusCode -eq 200
    } catch { return $false }
}

$erpAlreadyUp   = Test-Port -Port 3000 -Path '/index.html'
$storeAlreadyUp = Test-Port -Port 4321 -Path '/'

if ($erpAlreadyUp)   { Write-Host "ERP already up on :3000 - skipping launch" -ForegroundColor Yellow }
if ($storeAlreadyUp) { Write-Host "Storefront already up on :4321 - skipping launch" -ForegroundColor Yellow }

# Launch missing servers via Start-Process. -WindowStyle Hidden keeps them
# off-screen but they live in their own process tree.
if (-not $erpAlreadyUp) {
    Write-Host "Starting ERP on :3000..." -ForegroundColor Green
    $erpLog = "$env:TEMP\opticup-erp.log"
    Start-Process -FilePath "cmd.exe" `
                  -ArgumentList "/c npx --yes http-server -p 3000 -c-1 -s . > `"$erpLog`" 2>&1" `
                  -WorkingDirectory $ErpRoot `
                  -WindowStyle Hidden
}

if (-not $storeAlreadyUp) {
    Write-Host "Starting Storefront on :4321..." -ForegroundColor Green
    $storeLog = "$env:TEMP\opticup-storefront.log"
    Start-Process -FilePath "cmd.exe" `
                  -ArgumentList "/c npm run dev > `"$storeLog`" 2>&1" `
                  -WorkingDirectory $StoreRoot `
                  -WindowStyle Hidden
}

# Health-check loop - up to 30 seconds
$timeoutSec = 30
$start = Get-Date
$erpUp = $erpAlreadyUp
$storeUp = $storeAlreadyUp

while (((Get-Date) - $start).TotalSeconds -lt $timeoutSec) {
    if (-not $erpUp)   { $erpUp   = Test-Port -Port 3000 -Path '/index.html'; if ($erpUp)   { Write-Host "ERP up: http://localhost:3000" -ForegroundColor Green } }
    if (-not $storeUp) { $storeUp = Test-Port -Port 4321 -Path '/';            if ($storeUp) { Write-Host "Storefront up: http://localhost:4321" -ForegroundColor Green } }
    if ($erpUp -and $storeUp) { break }
    Start-Sleep -Milliseconds 1000
}

if ($erpUp -and $storeUp) {
    Write-Host "`n=== ALL UP ===" -ForegroundColor Green
    Write-Host "ERP:        http://localhost:3000"
    Write-Host "Storefront: http://localhost:4321"
    exit 0
} else {
    Write-Host "`n=== FAIL ===" -ForegroundColor Red
    if (-not $erpUp)   {
        Write-Host "  ERP did not come up on :3000 within ${timeoutSec}s" -ForegroundColor Red
        if (Test-Path "$env:TEMP\opticup-erp.log") {
            Write-Host "  Last lines from $env:TEMP\opticup-erp.log:" -ForegroundColor Yellow
            Get-Content "$env:TEMP\opticup-erp.log" -Tail 10 | ForEach-Object { Write-Host "    $_" }
        }
    }
    if (-not $storeUp) {
        Write-Host "  Storefront did not come up on :4321 within ${timeoutSec}s" -ForegroundColor Red
        if (Test-Path "$env:TEMP\opticup-storefront.log") {
            Write-Host "  Last lines from $env:TEMP\opticup-storefront.log:" -ForegroundColor Yellow
            Get-Content "$env:TEMP\opticup-storefront.log" -Tail 10 | ForEach-Object { Write-Host "    $_" }
        }
    }
    exit 1
}
