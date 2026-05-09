param(
  [string]$Data = "C:\Users\User\opticup\__LAUNCH_PLAN_DRAFT__\access-audit\_data"
)

$ErrorActionPreference = 'Stop'

# DAO Field Type lookup
$dt = @{
  1='Boolean'; 2='Byte'; 3='Integer'; 4='Long'; 5='Currency'; 6='Single'; 7='Double';
  8='Date/Time'; 9='Binary'; 10='Text'; 11='LongBinary(OLE)'; 12='Memo'; 15='GUID';
  16='BigInt'; 17='Decimal'; 18='Float'; 19='Numeric'; 20='Char'; 21='Time'; 22='TimeStamp';
  101='Attachment'; 102='Complex'
}

$cols = Get-Content (Join-Path $Data 'dao_columns.json') -Raw -Encoding UTF8 | ConvertFrom-Json

$grouped = $cols | Group-Object Table | Sort-Object Name

foreach ($g in $grouped) {
  $tbl = $g.Name
  Write-Output "============================================================"
  Write-Output "TABLE: $tbl  (cols=$($g.Count))"
  Write-Output "============================================================"
  $i = 0
  foreach ($c in ($g.Group | Sort-Object OrdinalPosition)) {
    $type = if ($dt.ContainsKey([int]$c.Type)) { $dt[[int]$c.Type] } else { "T($($c.Type))" }
    $req  = if ($c.Required) { 'NN' } else { '..' }
    $sz   = if ($c.Size) { "[$($c.Size)]" } else { '' }
    Write-Output ("  {0,-2} {1,-26} {2,-15} {3} {4}" -f $c.OrdinalPosition, $c.Field, $type, $sz, $req)
    $i++
  }
  Write-Output ""
}
