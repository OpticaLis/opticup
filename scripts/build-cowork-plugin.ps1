# build-cowork-plugin.ps1
#
# Rebuilds opticup-skills.plugin from the authoritative skill sources in
# `opticup/.claude/skills/opticup-*`. Run this after editing any skill
# (SKILL.md, template, reference file) so the new Plugin artifact reflects
# the latest content.
#
# What goes into the Plugin:
#   - opticup-strategic, opticup-executor, opticup-reviewer, opticup-sentinel
#   (opticup-guardian is DELIBERATELY excluded — it's already registered with
#   Cowork separately and bundling it again would cause a duplicate-install
#   conflict.)
#
# Why this exists:
#   - Cowork only auto-loads skills that are registered via plugins. Copying
#     skill folders to $HOME/.claude/skills/ is sufficient for Claude Code
#     (handled by `sync-cowork-skills.ps1`) but NOT for Cowork.
#   - The Plugin produced by this script is Cowork's path to skill auto-load.
#
# Usage (PowerShell, Windows):
#   cd C:\Users\User\opticup
#   powershell -ExecutionPolicy Bypass -File scripts\build-cowork-plugin.ps1
#
# Output:
#   opticup\opticup-skills.plugin  (install via Cowork UI)

param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$OutputFile  = $null
)

$ErrorActionPreference = 'Stop'

$SourceSkillsRoot = Join-Path $ProjectRoot '.claude\skills'
$BuildRoot        = Join-Path $env:TEMP 'opticup-skills-plugin-build'
$PluginRoot       = Join-Path $BuildRoot 'opticup-skills'
$ManifestDir      = Join-Path $PluginRoot '.claude-plugin'
$SkillsDir        = Join-Path $PluginRoot 'skills'

if (-not $OutputFile) {
    $OutputFile = Join-Path $ProjectRoot 'opticup-skills.plugin'
}

$SkillsToInclude = @(
    'opticup-strategic',
    'opticup-executor',
    'opticup-reviewer',
    'opticup-sentinel'
)

Write-Host ""
Write-Host "=== Building opticup-skills Cowork plugin ===" -ForegroundColor Cyan
Write-Host "Source : $SourceSkillsRoot"
Write-Host "Build  : $BuildRoot"
Write-Host "Output : $OutputFile"
Write-Host ""

# Safety: source must exist
if (-not (Test-Path $SourceSkillsRoot)) {
    Write-Error "Source skills folder missing: $SourceSkillsRoot"
    exit 1
}

# Clean previous build
if (Test-Path $BuildRoot) {
    Write-Host "Cleaning previous build..."
    Remove-Item -Path $BuildRoot -Recurse -Force
}

# Create structure
New-Item -ItemType Directory -Path $ManifestDir -Force | Out-Null
New-Item -ItemType Directory -Path $SkillsDir   -Force | Out-Null

# Copy skills
foreach ($skillName in $SkillsToInclude) {
    $src  = Join-Path $SourceSkillsRoot $skillName
    $dest = Join-Path $SkillsDir $skillName
    if (-not (Test-Path $src)) {
        Write-Error "Skill source not found: $src"
        exit 2
    }
    Write-Host "Including: $skillName"
    Copy-Item -Path $src -Destination $dest -Recurse -Force
    # Verify SKILL.md exists
    if (-not (Test-Path (Join-Path $dest 'SKILL.md'))) {
        Write-Error "$skillName is missing SKILL.md after copy"
        exit 3
    }
}

# Generate plugin.json (inlined so there's one source of truth — this script)
$Manifest = @{
    name        = 'opticup-skills'
    version     = '0.1.0'
    description = 'Optic Up project skills - Foreman (SPEC author + reviewer), Executor (code runner), Reviewer (code audit), Sentinel (read-only monitor). Bundles the strategic, executor, reviewer, and sentinel roles used across the Optic Up multi-tenant SaaS workflow.'
    author      = @{ name = 'Optic Up / Daniel' }
    keywords    = @('optic-up','spec-authoring','bounded-autonomy','code-execution','code-review','monitoring')
}
$ManifestJson = $Manifest | ConvertTo-Json -Depth 10
Set-Content -Path (Join-Path $ManifestDir 'plugin.json') -Value $ManifestJson -Encoding UTF8

# Generate a README.md that points back at the repo (lives inside the plugin)
$Readme = @'
# Optic Up Skills Plugin

Bundles opticup-strategic, opticup-executor, opticup-reviewer, and
opticup-sentinel for Cowork auto-load.

opticup-guardian is intentionally NOT included - it's registered with Cowork
separately. Bundling it here would cause a duplicate-install conflict.

Source of truth: opticup/.claude/skills/opticup-* in the Optic Up ERP repo.
Rebuild: opticup/scripts/build-cowork-plugin.ps1.

Version 0.1.0 - built 2026-04-14.
'@
Set-Content -Path (Join-Path $PluginRoot 'README.md') -Value $Readme -Encoding UTF8

# Validate
Write-Host ""
Write-Host "=== Validation ===" -ForegroundColor Cyan
$validationErrors = @()
if (-not (Test-Path (Join-Path $ManifestDir 'plugin.json'))) {
    $validationErrors += 'Missing plugin.json'
}
try {
    $null = Get-Content (Join-Path $ManifestDir 'plugin.json') -Raw | ConvertFrom-Json
    Write-Host "  plugin.json: valid JSON" -ForegroundColor Green
} catch {
    $validationErrors += "plugin.json invalid: $_"
}
foreach ($skillName in $SkillsToInclude) {
    $skillMd = Join-Path $SkillsDir "$skillName\SKILL.md"
    if (Test-Path $skillMd) {
        Write-Host "  $skillName/SKILL.md: present" -ForegroundColor Green
    } else {
        $validationErrors += "$skillName/SKILL.md missing"
    }
}
if ($validationErrors.Count -gt 0) {
    Write-Error ("Validation failed:`n" + ($validationErrors -join "`n"))
    exit 4
}

# Zip it. Use [IO.Compression] so no external dependency.
Add-Type -AssemblyName 'System.IO.Compression.FileSystem'
$TempZip = Join-Path $env:TEMP 'opticup-skills.plugin'
if (Test-Path $TempZip) { Remove-Item $TempZip -Force }
Write-Host ""
Write-Host "Packaging..." -ForegroundColor Cyan
[IO.Compression.ZipFile]::CreateFromDirectory($PluginRoot, $TempZip)

# Copy to final location
Copy-Item -Path $TempZip -Destination $OutputFile -Force
Remove-Item $TempZip -Force

$size = (Get-Item $OutputFile).Length
Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Green
Write-Host "Output: $OutputFile ($size bytes)"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Open Cowork."
Write-Host "  2. Drag-drop $OutputFile into a Cowork chat OR attach via the + button."
Write-Host "  3. Accept the plugin install prompt."
Write-Host "  4. Close Cowork completely and reopen so skills are rediscovered."
Write-Host "  5. In a fresh chat, test with: 'let''s plan a SPEC for Module 4'."
Write-Host "     The opticup-strategic skill should auto-load."
Write-Host ""
