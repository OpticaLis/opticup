param(
  [string]$Path = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe\optic_temp.accdb",
  [string]$Out  = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe"
)

# Add the audit folder to Trusted Locations to suppress prompts
$tlKey = "HKCU:\Software\Microsoft\Office\16.0\Access\Security\Trusted Locations\Location99"
try {
  if (Test-Path $tlKey) { Remove-Item -Path $tlKey -Force -ErrorAction SilentlyContinue }
  New-Item -Path $tlKey -Force | Out-Null
  Set-ItemProperty -Path $tlKey -Name "Path" -Value "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe\"
  Set-ItemProperty -Path $tlKey -Name "AllowSubFolders" -Type DWord -Value 1
  Set-ItemProperty -Path $tlKey -Name "Description" -Value "temp audit"
  Write-Host "Trusted Location added"
} catch { Write-Host ("TL add failed: {0}" -f $_.Exception.Message) }

function Save([object]$o, [string]$f) {
  ($o | ConvertTo-Json -Depth 6) | Out-File -Encoding utf8 (Join-Path $Out $f)
}

Write-Host "=== Access.Application launch ==="
$app = New-Object -ComObject "Access.Application"
$app.Visible = $false

# msoAutomationSecurityForceDisable = 3 — disables all macros, suppresses prompts
try {
  $app.AutomationSecurity = 3
  Write-Host "AutomationSecurity=3 (force disable)"
} catch { Write-Host ("AutomationSecurity set failed: {0}" -f $_.Exception.Message) }

try {
  $app.OpenCurrentDatabase($Path, $true)
  Write-Host "OpenCurrentDatabase OK"
} catch {
  Write-Host ("OpenCurrentDatabase failed: {0}" -f $_.Exception.Message)
  try { $app.Quit() } catch {}
  throw
}

Write-Host ""
Write-Host "=== VBProject ==="
$vbp = $app.VBE.ActiveVBProject
Write-Host ("VBP Name='{0}' Protection={1} Mode={2}" -f $vbp.Name, $vbp.Protection, $vbp.Mode)

$vbaArr = @()
$srcDir = Join-Path $Out 'vba_source'
New-Item -ItemType Directory -Path $srcDir -Force | Out-Null

foreach ($comp in $vbp.VBComponents) {
  $info = [pscustomobject]@{
    Name = $comp.Name
    Type = [int]$comp.Type
    TypeName = ""
    Lines = 0
    Procedures = @()
  }
  switch ([int]$comp.Type) {
    1   { $info.TypeName = "Standard" }
    2   { $info.TypeName = "Class" }
    3   { $info.TypeName = "MSForm" }
    11  { $info.TypeName = "ActiveX" }
    100 { $info.TypeName = "Document" }
    default { $info.TypeName = "Type$($comp.Type)" }
  }
  try {
    $cm = $comp.CodeModule
    $info.Lines = $cm.CountOfLines
    if ($cm.CountOfLines -gt 0) {
      $allSrc = $cm.Lines(1, $cm.CountOfLines)
      $safe = ($comp.Name -replace '[^A-Za-z0-9_\.\-]','_')
      $srcFile = Join-Path $srcDir ("{0}.txt" -f $safe)
      $allSrc | Out-File -Encoding utf8 $srcFile

      # Extract procedures
      $procs = @()
      $i = 1
      while ($i -le $cm.CountOfLines) {
        try {
          $procName = $cm.ProcOfLine($i, [ref]0)
          if ($procName -and ($procs.Count -eq 0 -or $procs[-1].Name -ne $procName)) {
            $procStart = $cm.ProcStartLine($procName, 0)
            $procCount = $cm.ProcCountLines($procName, 0)
            $procs += [pscustomobject]@{ Name=$procName; StartLine=$procStart; LineCount=$procCount }
            $i = $procStart + $procCount
            continue
          }
        } catch {}
        $i++
      }
      $info.Procedures = $procs
    }
  } catch { Write-Host ("CodeModule fail {0}: {1}" -f $comp.Name, $_.Exception.Message) }
  $vbaArr += $info
  Write-Host ("  {0,-50} type={1,-10} lines={2,-6} procs={3}" -f $comp.Name, $info.TypeName, $info.Lines, @($info.Procedures).Count)
}

Save $vbaArr 'vba_components.json'
Write-Host ("VBA components dumped: {0}" -f $vbaArr.Count)

# Object lists
$forms = @()
foreach ($obj in $app.CurrentProject.AllForms) { $forms += [pscustomobject]@{ Name=$obj.Name } }
Save $forms 'forms_meta.json'

$reps = @()
foreach ($obj in $app.CurrentProject.AllReports) { $reps += [pscustomobject]@{ Name=$obj.Name } }
Save $reps 'reports_meta.json'

$mods = @()
foreach ($obj in $app.CurrentProject.AllModules) { $mods += [pscustomobject]@{ Name=$obj.Name } }
Save $mods 'modules_meta.json'

$macs = @()
foreach ($obj in $app.CurrentProject.AllMacros) { $macs += [pscustomobject]@{ Name=$obj.Name } }
Save $macs 'macros_meta.json'

Write-Host ("Lists: forms={0} reports={1} modules={2} macros={3}" -f $forms.Count, $reps.Count, $mods.Count, $macs.Count)

$app.CloseCurrentDatabase()
$app.Quit()

# Cleanup trusted location
try { Remove-Item -Path $tlKey -Force -ErrorAction SilentlyContinue; Write-Host "Trusted Location removed" } catch {}

Write-Host "DONE fe_vba2"
