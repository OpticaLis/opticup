param(
  [string]$Path = "C:\Users\User\opticup\tests\optic_dt.accdb",
  [string]$Out  = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data"
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $Out -Force | Out-Null
Add-Type -AssemblyName System.Data

$cs = "Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$Path;ReadOnly=1;"
$conn = New-Object System.Data.Odbc.OdbcConnection $cs
$conn.Open()

function Save-DataTable($dt, $name) {
  $file = Join-Path $Out "$name.json"
  $rows = @()
  foreach ($r in $dt.Rows) {
    $obj = [ordered]@{}
    foreach ($c in $dt.Columns) {
      $obj[$c.ColumnName] = $r[$c]
    }
    $rows += [pscustomobject]$obj
  }
  $rows | ConvertTo-Json -Depth 5 -Compress | Out-File -Encoding utf8 $file
  Write-Output ("WROTE {0} rows={1}" -f $file, $dt.Rows.Count)
}

# 1) Tables — schema rowset
$tables = $conn.GetSchema("Tables")
Save-DataTable $tables "schema_tables"

# 2) Columns — full
$cols = $conn.GetSchema("Columns")
Save-DataTable $cols "schema_columns"

# 3) Indexes
try {
  $idx = $conn.GetSchema("Indexes")
  Save-DataTable $idx "schema_indexes"
} catch { Write-Output ("WARN Indexes: {0}" -f $_.Exception.Message) }

# 4) Views (queries in Access)
try {
  $views = $conn.GetSchema("Views")
  Save-DataTable $views "schema_views"
} catch { Write-Output ("WARN Views: {0}" -f $_.Exception.Message) }

# 5) Procedures
try {
  $procs = $conn.GetSchema("Procedures")
  Save-DataTable $procs "schema_procedures"
} catch { Write-Output ("WARN Procedures: {0}" -f $_.Exception.Message) }

# 6) ProcedureParameters
try {
  $pp = $conn.GetSchema("ProcedureParameters")
  Save-DataTable $pp "schema_procedure_parameters"
} catch { Write-Output ("WARN ProcParams: {0}" -f $_.Exception.Message) }

# 7) ForeignKeys (Access ODBC may or may not support)
try {
  $fks = $conn.GetSchema("ForeignKeys")
  Save-DataTable $fks "schema_foreignkeys"
} catch { Write-Output ("WARN FKs: {0}" -f $_.Exception.Message) }

# 8) MetaDataCollections — what schemas does this driver support?
try {
  $mdc = $conn.GetSchema("MetaDataCollections")
  Save-DataTable $mdc "schema_metadata_collections"
} catch { Write-Output ("WARN MDC: {0}" -f $_.Exception.Message) }

# 9) PrimaryKeys (try)
try {
  $pks = $conn.GetSchema("Indexes") | Where-Object { $true }
  # Some drivers also expose "PrimaryKeys"
} catch {}

# 10) Try MSysObjects — typically requires explicit permission, but worth trying
try {
  $cmd = $conn.CreateCommand()
  $cmd.CommandText = "SELECT Id, Name, Type, Flags, ParentId FROM MSysObjects"
  $rdr = $cmd.ExecuteReader()
  $tab = New-Object System.Data.DataTable
  $tab.Load($rdr)
  Save-DataTable $tab "msys_objects"
} catch {
  Write-Output ("WARN MSysObjects access denied: {0}" -f $_.Exception.Message)
}

$conn.Close()
Write-Output "DONE inventory"
