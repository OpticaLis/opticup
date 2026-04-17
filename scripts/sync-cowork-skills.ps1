# sync-cowork-skills.ps1
#
# Propagates project-level skills (`opticup/.claude/skills/*`) to the user-level
# Claude skills folder (`$HOME/.claude/skills/`) so Cowork mode can auto-load them.
#
# Why this exists:
#   - Claude Code auto-loads skills from BOTH the project's `.claude/skills/`
#     AND the user's `$HOME/.claude/skills/`.
#   - Cowork mode auto-loads skills ONLY from the user's `$HOME/.claude/skills/`.
#   - The authoritative source of our Optic Up skills lives in the project repo
#     under `opticup/.claude/skills/` (so it's versioned in git).
#   - This script mirrors the project skills into the user folder so Cowork
#     sees them too.
#
# Run this:
#   - Once, right after pulling a branch that added/updated any Optic Up skill.
#   - Every time you edit a skill file in `opticup/.claude/skills/`.
#
# Usage (PowerShell, Windows):
#   cd C:\Users\User\opticup
#   powershell -ExecutionPolicy Bypass -File scripts\sync-cowork-skills.ps1
#
# Usage (PowerShell on Mac, if needed):
#   pwsh ./scripts/sync-cowork-skills.ps1
#
# Safety:
#   - Only touches folders whose names start with "opticup-" inside the user
#     skills folder. Built-in skills (docx, pdf, pptx, xlsx, etc.) are never
#     removed.
#   - Uses robocopy /MIR on Windows so stale files inside mirrored skill
#     folders are removed. /MIR is scoped to each opticup-* folder — it never
#     mirrors the whole skills directory.
#   - Exit codes 0-3 from robocopy are success; 4+ is a real error.

param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$SourceSkills = Join-Path $ProjectRoot '.claude\skills'
$UserSkills   = Join-Path $HOME '.claude\skills'

Write-Host ""
Write-Host "=== Optic Up skill sync ===" -ForegroundColor Cyan
Write-Host "Source: $SourceSkills"
Write-Host "Target: $UserSkills"
Write-Host ""

if (-not (Test-Path $SourceSkills)) {
    Write-Error "Source folder does not exist: $SourceSkills"
    exit 1
}

# Ensure user skills folder exists (do NOT create $HOME\.claude if missing —
# that would mean Claude Code isn't installed; bail instead).
$UserClaudeRoot = Join-Path $HOME '.claude'
if (-not (Test-Path $UserClaudeRoot)) {
    Write-Error "User Claude folder not found: $UserClaudeRoot. Is Claude Code installed?"
    exit 1
}
if (-not (Test-Path $UserSkills)) {
    Write-Host "Creating user skills folder: $UserSkills"
    if (-not $DryRun) {
        New-Item -ItemType Directory -Path $UserSkills -Force | Out-Null
    }
}

# Discover opticup-* skills in source
$SkillDirs = Get-ChildItem -Path $SourceSkills -Directory -Filter 'opticup-*'
if ($SkillDirs.Count -eq 0) {
    Write-Warning "No opticup-* skill folders found in $SourceSkills"
    exit 0
}

Write-Host "Found $($SkillDirs.Count) skill folder(s) to sync:" -ForegroundColor Green
foreach ($d in $SkillDirs) { Write-Host "  - $($d.Name)" }
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] No files will be changed." -ForegroundColor Yellow
    exit 0
}

$OverallFail = 0
foreach ($d in $SkillDirs) {
    $src  = $d.FullName
    $dest = Join-Path $UserSkills $d.Name

    Write-Host "Syncing $($d.Name) ..." -ForegroundColor Cyan
    # /MIR mirrors src -> dest and removes stale files inside dest.
    # /NFL /NDL /NJH /NJS /NC /NS /NP  = quiet output
    # /R:1 /W:1                         = fail fast on transient errors
    robocopy $src $dest /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    $rc = $LASTEXITCODE
    # robocopy exit codes: 0-3 success, 4+ error
    if ($rc -ge 4) {
        Write-Error "  robocopy FAILED for $($d.Name) (exit $rc)"
        $OverallFail++
    } else {
        Write-Host "  OK (robocopy exit $rc)" -ForegroundColor Green
    }
}

Write-Host ""
if ($OverallFail -gt 0) {
    Write-Error "$OverallFail skill(s) failed to sync."
    exit 2
}

Write-Host "=== Sync complete. Restart Cowork (or open a new Cowork chat) to pick up changes. ===" -ForegroundColor Green
exit 0
