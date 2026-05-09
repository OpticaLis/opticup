param(
  [string]$Path = "C:\Users\User\opticup\tests\optic.accdr",
  [string]$Out  = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data_fe"
)

New-Item -ItemType Directory -Path $Out -Force | Out-Null

Write-Host "=== STEP 1: Try DAO.DBEngine.120 ==="
$engine = $null
try {
  $engine = New-Object -ComObject "DAO.DBEngine.120"
  Write-Host "OK DAO.DBEngine.120"
} catch {
  Write-Host ("FAIL DAO.DBEngine.120: {0}" -f $_.Exception.Message)
}

if (-not $engine) {
  Write-Host "Trying DAO.DBEngine.36..."
  try {
    $engine = New-Object -ComObject "DAO.DBEngine.36"
    Write-Host "OK DAO.DBEngine.36"
  } catch { Write-Host ("FAIL: {0}" -f $_.Exception.Message); throw }
}

Write-Host ""
Write-Host "=== STEP 2: OpenDatabase ==="
$db = $null
try {
  $db = $engine.OpenDatabase($Path, $false, $true)
  Write-Host ("OK opened. Name={0} Version={1}" -f $db.Name, $db.Version)
} catch {
  Write-Host ("OpenDatabase plain failed: {0}" -f $_.Exception.Message)
  Write-Host "Trying with locale..."
  try {
    $db = $engine.OpenDatabase($Path, $false, $true, ";LANGID=0x040D;CP=1255;COUNTRY=0")
    Write-Host "OK opened with locale string"
  } catch {
    Write-Host ("Failed with locale string: {0}" -f $_.Exception.Message)
    throw
  }
}

Write-Host ""
Write-Host "=== STEP 3: Container summary ==="
foreach ($c in $db.Containers) {
  Write-Host ("  {0,-20} docs={1}" -f $c.Name, $c.Documents.Count)
}

Write-Host ""
Write-Host "=== STEP 4: Counts ==="
Write-Host ("TableDefs: {0}" -f $db.TableDefs.Count)
Write-Host ("QueryDefs: {0}" -f $db.QueryDefs.Count)
Write-Host ("Relations: {0}" -f $db.Relations.Count)

Write-Host ""
Write-Host "=== STEP 5: Sample linked tables (first 5) ==="
$linkedCount = 0
foreach ($td in $db.TableDefs) {
  if ($td.Connect) {
    if ($linkedCount -lt 5) {
      Write-Host ("  [LINK] {0,-30} -> {1}" -f $td.Name, $td.Connect)
    }
    $linkedCount++
  }
}
Write-Host ("Total linked tables: {0}" -f $linkedCount)

Write-Host ""
Write-Host "=== STEP 6: Forms container ==="
$formContainer = $null
foreach ($c in $db.Containers) {
  if ($c.Name -eq 'Forms') { $formContainer = $c; break }
}
if ($formContainer) {
  Write-Host ("Forms container has {0} documents" -f $formContainer.Documents.Count)
}

$db.Close()
Write-Host ""
Write-Host "DONE probe"
