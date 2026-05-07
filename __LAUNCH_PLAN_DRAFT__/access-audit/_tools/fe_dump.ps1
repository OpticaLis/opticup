param(
  [string]$Path = "C:\Users\User\opticup\tests\optic.accdr",
  [string]$Out  = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe"
)

New-Item -ItemType Directory -Path $Out -Force | Out-Null

$engine = New-Object -ComObject "DAO.DBEngine.120"
$db = $engine.OpenDatabase($Path, $false, $true)
Write-Host "DB opened"

function Save([object]$o, [string]$f) {
  ($o | ConvertTo-Json -Depth 6) | Out-File -Encoding utf8 (Join-Path $Out $f)
}

# 1) ALL QueryDefs with full SQL (1,035 queries)
Write-Host "Dumping QueryDefs..."
$qarr = @()
foreach ($qd in $db.QueryDefs) {
  $qarr += [pscustomobject]@{
    Name = $qd.Name
    Type = $qd.Type
    SQL = $qd.SQL
    DateCreated = $qd.DateCreated
    LastUpdated = $qd.LastUpdated
    ReturnsRecords = $qd.ReturnsRecords
  }
}
Save $qarr 'querydefs_full.json'
Write-Host ("QueryDefs saved: {0}" -f $qarr.Count)

# 2) TableDefs (with Connect for linked tables)
Write-Host "Dumping TableDefs..."
$tarr = @()
foreach ($td in $db.TableDefs) {
  $fcount = 0; try { $fcount = $td.Fields.Count } catch {}
  $tarr += [pscustomobject]@{
    Name = $td.Name
    Connect = $td.Connect
    SourceTableName = $td.SourceTableName
    DateCreated = $td.DateCreated
    LastUpdated = $td.LastUpdated
    RecordCount = $td.RecordCount
    Attributes = $td.Attributes
    FieldCount = $fcount
  }
}
Save $tarr 'tabledefs_full.json'
Write-Host ("TableDefs saved: {0}" -f $tarr.Count)

# 3) Containers — Forms, Reports, Modules, Scripts
Write-Host "Dumping Containers..."
$contMap = @{}
foreach ($c in $db.Containers) {
  $docs = @()
  foreach ($d in $c.Documents) {
    $docs += [pscustomobject]@{
      Name = $d.Name
      DateCreated = $d.DateCreated
      LastUpdated = $d.LastUpdated
      Owner = $d.Owner
    }
  }
  $contMap[$c.Name] = $docs
  Write-Host ("  {0,-20} {1}" -f $c.Name, $docs.Count)
}
Save $contMap 'containers_full.json'

$db.Close()
Write-Host "DAO part done"

# 4) Now try Access.Application for VBProject access
Write-Host ""
Write-Host "=== Trying Access.Application for VBA source ==="
$app = $null
try {
  $app = New-Object -ComObject "Access.Application"
  Write-Host "OK Access.Application created"
  $app.Visible = $false
  try {
    $app.OpenCurrentDatabase($Path, $true)
    Write-Host "OpenCurrentDatabase OK (read-only)"
  } catch {
    Write-Host ("OpenCurrentDatabase failed: {0}" -f $_.Exception.Message)
  }
} catch {
  Write-Host ("Access.Application failed: {0}" -f $_.Exception.Message)
}

if ($app -and $app.CurrentDb) {
  Write-Host ""
  Write-Host "=== VBA modules ==="
  try {
    $vbp = $app.VBE.ActiveVBProject
    Write-Host ("VBProject Name={0} Mode={1}" -f $vbp.Name, $vbp.Mode)

    $vbaArr = @()
    foreach ($comp in $vbp.VBComponents) {
      $info = [pscustomobject]@{
        Name = $comp.Name
        Type = $comp.Type
        TypeName = ""
        Lines = 0
        SourceFirst40 = ""
      }
      switch ([int]$comp.Type) {
        1 { $info.TypeName = "Standard Module" }
        2 { $info.TypeName = "Class Module" }
        3 { $info.TypeName = "MSForm" }
        11 { $info.TypeName = "ActiveX Designer" }
        100 { $info.TypeName = "Document Module (Form/Report)" }
        default { $info.TypeName = "Type$($comp.Type)" }
      }
      try {
        $cm = $comp.CodeModule
        $info.Lines = $cm.CountOfLines
        if ($cm.CountOfLines -gt 0) {
          $first = $cm.Lines(1, [Math]::Min(40, $cm.CountOfLines))
          $info.SourceFirst40 = $first
        }
      } catch {}
      $vbaArr += $info
    }
    Save $vbaArr 'vba_modules.json'
    Write-Host ("VBComponents: {0}" -f $vbaArr.Count)
  } catch {
    Write-Host ("VBE access failed: {0}" -f $_.Exception.Message)
  }

  Write-Host ""
  Write-Host "=== Forms via AccessObject ==="
  try {
    $formsObj = @()
    foreach ($obj in $app.CurrentProject.AllForms) {
      $formsObj += [pscustomobject]@{
        Name = $obj.Name
        DateCreated = $obj.DateCreated
        DateModified = $obj.DateModified
        Type = $obj.Type
      }
    }
    Save $formsObj 'forms_meta.json'
    Write-Host ("AllForms: {0}" -f $formsObj.Count)
  } catch { Write-Host ("AllForms failed: {0}" -f $_.Exception.Message) }

  try {
    $reportsObj = @()
    foreach ($obj in $app.CurrentProject.AllReports) {
      $reportsObj += [pscustomobject]@{
        Name = $obj.Name
        DateCreated = $obj.DateCreated
        DateModified = $obj.DateModified
        Type = $obj.Type
      }
    }
    Save $reportsObj 'reports_meta.json'
    Write-Host ("AllReports: {0}" -f $reportsObj.Count)
  } catch { Write-Host ("AllReports failed: {0}" -f $_.Exception.Message) }

  try {
    $modulesObj = @()
    foreach ($obj in $app.CurrentProject.AllModules) {
      $modulesObj += [pscustomobject]@{
        Name = $obj.Name
        DateCreated = $obj.DateCreated
        DateModified = $obj.DateModified
        Type = $obj.Type
      }
    }
    Save $modulesObj 'modules_meta.json'
    Write-Host ("AllModules: {0}" -f $modulesObj.Count)
  } catch { Write-Host ("AllModules failed: {0}" -f $_.Exception.Message) }

  try {
    $macrosObj = @()
    foreach ($obj in $app.CurrentProject.AllMacros) {
      $macrosObj += [pscustomobject]@{
        Name = $obj.Name
        DateCreated = $obj.DateCreated
        DateModified = $obj.DateModified
        Type = $obj.Type
      }
    }
    Save $macrosObj 'macros_meta.json'
    Write-Host ("AllMacros: {0}" -f $macrosObj.Count)
  } catch { Write-Host ("AllMacros failed: {0}" -f $_.Exception.Message) }

  try {
    $app.CloseCurrentDatabase()
    $app.Quit()
  } catch {}
}

Write-Host "DONE fe_dump"
