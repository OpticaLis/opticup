param(
  [string]$Path = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe\optic_temp.accdb",
  [string]$Out  = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe"
)

# Trusted Location
$tlKey = "HKCU:\Software\Microsoft\Office\16.0\Access\Security\Trusted Locations\Location99"
try {
  if (Test-Path $tlKey) { Remove-Item -Path $tlKey -Force }
  New-Item -Path $tlKey -Force | Out-Null
  Set-ItemProperty -Path $tlKey -Name "Path" -Value (Split-Path $Path -Parent) + "\"
  Set-ItemProperty -Path $tlKey -Name "AllowSubFolders" -Type DWord -Value 1
  Set-ItemProperty -Path $tlKey -Name "Description" -Value "audit"
} catch {}

function Save([object]$o, [string]$f) {
  ($o | ConvertTo-Json -Depth 6) | Out-File -Encoding utf8 (Join-Path $Out $f)
}

Write-Host "Launching Access..."
$app = New-Object -ComObject "Access.Application"
$app.Visible = $false
try { $app.AutomationSecurity = 3 } catch {}
try { $app.UserControl = $false } catch {}

# Use a timeout via .NET task — hard cap
$started = Get-Date
try {
  $app.OpenCurrentDatabase($Path, $true)
  Write-Host ("OpenCurrentDatabase OK in {0}s" -f ((Get-Date) - $started).TotalSeconds)
} catch {
  Write-Host ("OpenCurrentDatabase FAILED: {0}" -f $_.Exception.Message)
  try { $app.Quit() } catch {}
  Remove-Item -Path $tlKey -Force -ErrorAction SilentlyContinue
  exit 1
}

# Quick shutdown of any AutoExec form
try {
  $app.DoCmd.Close(2, "start_form", 0) # acForm = 2
} catch {}

Write-Host ""
Write-Host "=== VBProject ==="
try {
  $vbp = $app.VBE.ActiveVBProject
  Write-Host ("VBP Name='{0}' Protection={1}" -f $vbp.Name, $vbp.Protection)

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
      default { $info.TypeName = "T$($comp.Type)" }
    }
    try {
      $cm = $comp.CodeModule
      $info.Lines = $cm.CountOfLines
      if ($cm.CountOfLines -gt 0) {
        $allSrc = $cm.Lines(1, $cm.CountOfLines)
        $safe = ($comp.Name -replace '[^A-Za-z0-9_\.\-]','_')
        $srcFile = Join-Path $srcDir ("{0}.txt" -f $safe)
        $allSrc | Out-File -Encoding utf8 $srcFile

        # extract procs
        $procs = @()
        $i = 1
        while ($i -le $cm.CountOfLines) {
          try {
            $procName = $cm.ProcOfLine($i, [ref]0)
            if ($procName -and ($procs.Count -eq 0 -or $procs[-1].Name -ne $procName)) {
              $ps = $cm.ProcStartLine($procName, 0)
              $pc = $cm.ProcCountLines($procName, 0)
              $procs += [pscustomobject]@{ Name=$procName; StartLine=$ps; LineCount=$pc }
              $i = $ps + $pc; continue
            }
          } catch {}
          $i++
        }
        $info.Procedures = $procs
      }
    } catch {}
    $vbaArr += $info
    Write-Host ("  {0,-50} {1,-10} L={2,-6} P={3}" -f $comp.Name, $info.TypeName, $info.Lines, @($info.Procedures).Count)
  }
  Save $vbaArr 'vba_components.json'
} catch {
  Write-Host ("VBE error: {0}" -f $_.Exception.Message)
}

# Object lists with timestamps
try {
  $forms = @()
  foreach ($obj in $app.CurrentProject.AllForms) { $forms += [pscustomobject]@{ Name=$obj.Name; DateCreated=$obj.DateCreated; DateModified=$obj.DateModified } }
  Save $forms 'forms_meta.json'
  Write-Host ("Forms: {0}" -f $forms.Count)
} catch {}

try {
  $reps = @()
  foreach ($obj in $app.CurrentProject.AllReports) { $reps += [pscustomobject]@{ Name=$obj.Name; DateCreated=$obj.DateCreated; DateModified=$obj.DateModified } }
  Save $reps 'reports_meta.json'
  Write-Host ("Reports: {0}" -f $reps.Count)
} catch {}

try {
  $mods = @()
  foreach ($obj in $app.CurrentProject.AllModules) { $mods += [pscustomobject]@{ Name=$obj.Name; DateCreated=$obj.DateCreated; DateModified=$obj.DateModified } }
  Save $mods 'modules_meta.json'
  Write-Host ("Modules: {0}" -f $mods.Count)
} catch {}

try {
  $macs = @()
  foreach ($obj in $app.CurrentProject.AllMacros) { $macs += [pscustomobject]@{ Name=$obj.Name; DateCreated=$obj.DateCreated; DateModified=$obj.DateModified } }
  Save $macs 'macros_meta.json'
  Write-Host ("Macros: {0}" -f $macs.Count)
} catch {}

try { $app.CloseCurrentDatabase() } catch {}
try { $app.Quit() } catch {}
Remove-Item -Path $tlKey -Force -ErrorAction SilentlyContinue
Write-Host "DONE"
