# Mission 5: Technical Debt — Checklist

Find code that works but isn't optimal. Not bugs — but friction, risk, and maintenance burden.

## Scan Categories

### 5.1 Oversized Files (Rule 12)
```bash
find . -name "*.js" -not -path "*/node_modules/*" -not -path "*/backups/*" -exec wc -l {} + | sort -rn | head -30
```
- Over 300 lines → MEDIUM (target limit exceeded)
- Over 350 lines → HIGH (absolute limit exceeded)

### 5.2 Duplicate Functions
```bash
grep -rn "^function \|^async function \|^const .* = function\|^const .* = async" --include="*.js" . | grep -v node_modules | sort -t: -k3
```
Look for: functions with same or very similar names across different files.
Cross-reference with GLOBAL_MAP to identify intentional vs accidental duplicates.

### 5.3 Dead Code — Unused Exports
```bash
grep -rn "^export " --include="*.js" . | grep -v node_modules
```
For each exported function, check if it's imported or used elsewhere:
```bash
grep -rn "importFunctionName\|functionName(" --include="*.js" --include="*.html" . | grep -v node_modules
```
Export with zero imports elsewhere → potential dead code → LOW.

### 5.4 TODO / FIXME / HACK Comments
```bash
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP\|TEMPORARY" --include="*.js" --include="*.html" . | grep -v node_modules
```
Report each with context. Old TODOs (in files not modified for weeks) → MEDIUM.

### 5.5 Console.log Left in Code
```bash
grep -rn "console\.log\|console\.warn\|console\.error" --include="*.js" . | grep -v node_modules | grep -v "scripts/"
```
Debug console.log in production code → LOW (noise, potential info leak).
console.error for error handling → OK, not a finding.

### 5.6 Commented-Out Code
Look for large blocks of commented-out code (>5 lines):
```bash
grep -rn "^[[:space:]]*//" --include="*.js" . | grep -v node_modules
```
Large commented blocks → LOW (should be deleted, git has history).

### 5.7 Complex Functions
Look for functions that are excessively long (>50 lines) or deeply nested (>4 levels):
This requires manual review — flag files identified in 5.1 as candidates.

### 5.8 Inconsistent Error Handling
```bash
grep -rn "\.catch\|try.*{" --include="*.js" . | grep -v node_modules
```
Look for: empty catch blocks, swallowed errors, inconsistent patterns.

## Severity Guidelines

- File over 350 lines → HIGH
- File over 300 lines → MEDIUM
- Duplicate function names → MEDIUM
- Old TODO/FIXME (>2 weeks) → MEDIUM
- Dead code (unused export) → LOW
- Console.log in production → LOW
- Commented-out code blocks → LOW
