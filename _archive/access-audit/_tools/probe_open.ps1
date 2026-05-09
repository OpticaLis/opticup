param(
  [string]$Path = "C:\Users\User\opticup\tests\optic_dt.accdb"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Data

function Try-Open([string]$cs, [string]$label) {
  $conn = New-Object System.Data.OleDb.OleDbConnection $cs
  try {
    $conn.Open()
    Write-Output "OPEN_OK $label"
    $conn.Close()
    return $true
  } catch {
    Write-Output ("OPEN_FAIL {0} :: {1}" -f $label, $_.Exception.Message)
    return $false
  }
}

$cs16 = "Provider=Microsoft.ACE.OLEDB.16.0;Data Source=$Path;Persist Security Info=False;Mode=Read"
$cs12 = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$Path;Persist Security Info=False;Mode=Read"
$cs120 = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$Path;Persist Security Info=False"

$ok16  = Try-Open $cs16  "OLEDB-16-RO"
$ok12  = Try-Open $cs12  "OLEDB-12-RO"
$ok120 = Try-Open $cs120 "OLEDB-12-RW"

# Try ODBC fallback
try {
  $odbcCs = "Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$Path;ReadOnly=1;"
  $oconn = New-Object System.Data.Odbc.OdbcConnection $odbcCs
  $oconn.Open()
  Write-Output "OPEN_OK ODBC-ACCDB-RO"
  $oconn.Close()
} catch {
  Write-Output ("OPEN_FAIL ODBC-ACCDB-RO :: {0}" -f $_.Exception.Message)
}

# 64-bit ACE.OLEDB only if installed (we likely fail; that's diagnostic)
Write-Output ("Process is 64-bit: {0}" -f [Environment]::Is64BitProcess)
