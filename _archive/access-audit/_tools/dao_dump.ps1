param(
  [string]$Path = "C:\Users\User\opticup\tests\optic_dt.accdb",
  [string]$Out  = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data"
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $Out -Force | Out-Null

# DAO type constants
$dbVersionAccess2007 = 128
$dbDenyWrite = 1
$dbReadOnly  = 2 # for OpenRecordset

$progids = @("DAO.DBEngine.120", "DAO.DBEngine.36", "Access.Application")
$engine  = $null
foreach ($p in $progids) {
  try {
    $obj = New-Object -ComObject $p
    Write-Output "COM_OK $p"
    if ($p -like 'Access.Application*') {
      # Use Access.Application - but we want DAO directly
      # Access can give us DBEngine via .DBEngine
      $engine = $obj.DBEngine
    } else {
      $engine = $obj
    }
    break
  } catch {
    Write-Output ("COM_FAIL {0} :: {1}" -f $p, $_.Exception.Message)
  }
}

if (-not $engine) { throw "No DAO engine available" }

# Read-only open
$db = $engine.OpenDatabase($Path, $false, $true)  # Exclusive=false, ReadOnly=true
Write-Output "DB_OPEN $Path"

# 1) TableDefs (includes user tables + system tables; we'll filter)
$tdefs = @()
foreach ($td in $db.TableDefs) {
  $tdefs += [pscustomobject]@{
    Name = $td.Name
    Attributes = $td.Attributes
    RecordCount = $td.RecordCount
    DateCreated = $td.DateCreated
    LastUpdated = $td.LastUpdated
    Connect = $td.Connect
    SourceTableName = $td.SourceTableName
    ValidationRule = $td.ValidationRule
    ValidationText = $td.ValidationText
  }
}
$tdefs | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 (Join-Path $Out 'dao_tabledefs.json')
Write-Output ("TABLEDEFS {0}" -f $tdefs.Count)

# 2) QueryDefs (this is the gold — Access queries with SQL)
$qdefs = @()
foreach ($qd in $db.QueryDefs) {
  $qdefs += [pscustomobject]@{
    Name = $qd.Name
    Type = $qd.Type
    DateCreated = $qd.DateCreated
    LastUpdated = $qd.LastUpdated
    SQL  = $qd.SQL
    ReturnsRecords = $qd.ReturnsRecords
  }
}
$qdefs | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 (Join-Path $Out 'dao_querydefs.json')
Write-Output ("QUERYDEFS {0}" -f $qdefs.Count)

# 3) Relations
$rels = @()
foreach ($r in $db.Relations) {
  $fields = @()
  foreach ($f in $r.Fields) {
    $fields += [pscustomobject]@{ Name=$f.Name; ForeignName=$f.ForeignName }
  }
  $rels += [pscustomobject]@{
    Name = $r.Name
    Table = $r.Table
    ForeignTable = $r.ForeignTable
    Attributes = $r.Attributes
    Fields = $fields
  }
}
$rels | ConvertTo-Json -Depth 5 | Out-File -Encoding utf8 (Join-Path $Out 'dao_relations.json')
Write-Output ("RELATIONS {0}" -f $rels.Count)

# 4) Per-table: columns full detail + indexes
$colDump = @()
$idxDump = @()
foreach ($td in $db.TableDefs) {
  if ($td.Attributes -band 2) { continue } # skip system table flag
  $tn = $td.Name
  if ($tn -like 'MSys*') { continue }
  if ($tn -like '~*')   { continue }
  foreach ($f in $td.Fields) {
    $colDump += [pscustomobject]@{
      Table = $tn
      Field = $f.Name
      Type = $f.Type
      Size = $f.Size
      Required = $f.Required
      AllowZeroLength = $f.AllowZeroLength
      Attributes = $f.Attributes
      DefaultValue = $f.DefaultValue
      ValidationRule = $f.ValidationRule
      ValidationText = $f.ValidationText
      OrdinalPosition = $f.OrdinalPosition
    }
  }
  foreach ($ix in $td.Indexes) {
    $ifields = @()
    foreach ($if in $ix.Fields) { $ifields += $if.Name }
    $idxDump += [pscustomobject]@{
      Table   = $tn
      Name    = $ix.Name
      Primary = $ix.Primary
      Unique  = $ix.Unique
      Required= $ix.Required
      Fields  = ($ifields -join ',')
    }
  }
}
$colDump | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 (Join-Path $Out 'dao_columns.json')
$idxDump | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 (Join-Path $Out 'dao_indexes.json')
Write-Output ("COLS {0} INDEXES {1}" -f $colDump.Count, $idxDump.Count)

# 5) Containers / Documents (Forms, Reports, Modules, Macros, Scripts)
$contDump = @()
foreach ($c in $db.Containers) {
  foreach ($d in $c.Documents) {
    $contDump += [pscustomobject]@{
      Container = $c.Name
      Name      = $d.Name
      DateCreated = $d.DateCreated
      LastUpdated = $d.LastUpdated
      Owner = $d.Owner
    }
  }
}
$contDump | ConvertTo-Json -Depth 3 | Out-File -Encoding utf8 (Join-Path $Out 'dao_documents.json')
Write-Output ("DOCUMENTS {0}" -f $contDump.Count)

$db.Close()
Write-Output "DONE dao"
