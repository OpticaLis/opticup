param(
  [string]$Path = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe\optic_temp.accdb",
  [string]$Out  = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe"
)

function Save([object]$o, [string]$f) {
  ($o | ConvertTo-Json -Depth 6) | Out-File -Encoding utf8 (Join-Path $Out $f)
}

Write-Host "=== Access.Application + .accdb ==="
$app = New-Object -ComObject "Access.Application"
$app.Visible = $false
Write-Host "App created"

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
try {
  $vbp = $app.VBE.ActiveVBProject
  Write-Host ("VBP Name='{0}' Protection={1} Mode={2}" -f $vbp.Name, $vbp.Protection, $vbp.Mode)

  $vbaArr = @()
  $modSrc = @{}
  foreach ($comp in $vbp.VBComponents) {
    $info = [pscustomobject]@{
      Name = $comp.Name
      Type = [int]$comp.Type
      TypeName = ""
      Lines = 0
      Procedures = @()
    }
    switch ([int]$comp.Type) {
      1   { $info.TypeName = "Standard Module" }
      2   { $info.TypeName = "Class Module" }
      3   { $info.TypeName = "MSForm" }
      11  { $info.TypeName = "ActiveX Designer" }
      100 { $info.TypeName = "Document Module (Form/Report)" }
      default { $info.TypeName = "Type$($comp.Type)" }
    }
    try {
      $cm = $comp.CodeModule
      $info.Lines = $cm.CountOfLines
      if ($cm.CountOfLines -gt 0) {
        $allSrc = $cm.Lines(1, $cm.CountOfLines)
        $modSrc[$comp.Name] = $allSrc

        # Extract procedure names
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
    } catch { Write-Host ("CodeModule access failed for {0}: {1}" -f $comp.Name, $_.Exception.Message) }
    $vbaArr += $info
  }

  Save $vbaArr 'vba_components.json'
  Write-Host ("VBA components dumped: {0}" -f $vbaArr.Count)

  # Save full source per module to text files
  $srcDir = Join-Path $Out 'vba_source'
  New-Item -ItemType Directory -Path $srcDir -Force | Out-Null
  foreach ($k in $modSrc.Keys) {
    $safe = $k -replace '[^A-Za-z0-9_\.\-]','_'
    $srcFile = Join-Path $srcDir ("{0}.txt" -f $safe)
    $modSrc[$k] | Out-File -Encoding utf8 $srcFile
  }
  Write-Host ("VBA source files written to: {0}" -f $srcDir)

} catch {
  Write-Host ("VBE access failed: {0}" -f $_.Exception.Message)
}

Write-Host ""
Write-Host "=== Forms metadata via Access.Application ==="
try {
  $forms = @()
  foreach ($obj in $app.CurrentProject.AllForms) {
    $forms += [pscustomobject]@{ Name=$obj.Name; DateCreated=$obj.DateCreated; DateModified=$obj.DateModified }
  }
  Save $forms 'forms_meta.json'
  Write-Host ("AllForms: {0}" -f $forms.Count)
} catch { Write-Host ("AllForms failed: {0}" -f $_.Exception.Message) }

try {
  $reps = @()
  foreach ($obj in $app.CurrentProject.AllReports) {
    $reps += [pscustomobject]@{ Name=$obj.Name; DateCreated=$obj.DateCreated; DateModified=$obj.DateModified }
  }
  Save $reps 'reports_meta.json'
  Write-Host ("AllReports: {0}" -f $reps.Count)
} catch { Write-Host ("AllReports failed: {0}" -f $_.Exception.Message) }

try {
  $mods = @()
  foreach ($obj in $app.CurrentProject.AllModules) {
    $mods += [pscustomobject]@{ Name=$obj.Name; DateCreated=$obj.DateCreated; DateModified=$obj.DateModified }
  }
  Save $mods 'modules_meta.json'
  Write-Host ("AllModules: {0}" -f $mods.Count)
} catch { Write-Host ("AllModules failed: {0}" -f $_.Exception.Message) }

try {
  $macs = @()
  foreach ($obj in $app.CurrentProject.AllMacros) {
    $macs += [pscustomobject]@{ Name=$obj.Name; DateCreated=$obj.DateCreated; DateModified=$obj.DateModified }
  }
  Save $macs 'macros_meta.json'
  Write-Host ("AllMacros: {0}" -f $macs.Count)
} catch { Write-Host ("AllMacros failed: {0}" -f $_.Exception.Message) }

Write-Host ""
Write-Host "=== Form RecordSources via DoCmd (peek) ==="
# To get RecordSource we need to OPEN each form in design view briefly.
# That is a write-mutation though — even read-only mode. Skip.
# Instead: try to read .Properties on AccessObject which sometimes exposes RecordSource.
$frmRS = @()
foreach ($obj in $app.CurrentProject.AllForms) {
  $rs = ""
  try {
    foreach ($p in $obj.Properties) {
      if ($p.Name -eq 'RecordSource') { $rs = $p.Value; break }
    }
  } catch {}
  $frmRS += [pscustomobject]@{ Name=$obj.Name; RecordSource=$rs }
}
Save $frmRS 'forms_recordsource.json'
Write-Host ("Forms RecordSource peeked")

$rptRS = @()
foreach ($obj in $app.CurrentProject.AllReports) {
  $rs = ""
  try {
    foreach ($p in $obj.Properties) {
      if ($p.Name -eq 'RecordSource') { $rs = $p.Value; break }
    }
  } catch {}
  $rptRS += [pscustomobject]@{ Name=$obj.Name; RecordSource=$rs }
}
Save $rptRS 'reports_recordsource.json'
Write-Host ("Reports RecordSource peeked")

$app.CloseCurrentDatabase()
$app.Quit()
Write-Host "DONE fe_vba"
