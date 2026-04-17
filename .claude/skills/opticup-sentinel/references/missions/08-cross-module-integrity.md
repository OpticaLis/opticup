# Mission 8: Cross-Module Integrity — Checklist

Verify modules respect boundaries. No module should reach into another's internals.

## Scan Categories

### 8.1 Direct Cross-Module Table Access
Each module owns specific tables (defined in its db-schema.sql).
Check that no module's JS files reference tables owned by another module.

1. Build a module→tables ownership map from each module's `db-schema.sql`
2. For each module's JS files, scan for table references:
   ```bash
   grep -rn "from('\|from(\"" --include="*.js" modules/Module\ X/ | grep -v node_modules
   ```
3. Flag any reference to a table NOT owned by that module → HIGH

### 8.2 Contract Function Usage
1. Read `docs/GLOBAL_MAP.md` — contracts section
2. For each inter-module call, verify it goes through a declared contract function
3. Look for direct function imports from another module's internal files:
   ```bash
   grep -rn "import.*from.*modules/Module" --include="*.js" . | grep -v node_modules
   ```

### 8.3 Shared.js Completeness
Functions used by multiple modules should be in shared.js (or shared/ directory).
1. Find functions defined in one module but called from another:
   ```bash
   # For each module, find its exported functions
   grep -rn "^function \|^export " --include="*.js" modules/Module\ X/
   # Then check if other modules call them
   ```
2. If a function is used cross-module but not in shared → should be moved

### 8.4 GLOBAL_MAP.md Contract Registry
1. Read `docs/GLOBAL_MAP.md`
2. Verify all contract functions listed actually exist in code
3. Verify all cross-module function calls in code are listed as contracts

### 8.5 CSS/HTML Isolation
Modules should not leak CSS that affects other modules:
```bash
grep -rn "body\s*{.*}\|html\s*{.*}\|\*\s*{" --include="*.css" --include="*.html" modules/ | grep -v node_modules
```
Global CSS selectors in module files → MEDIUM

## Severity Guidelines

- Direct cross-module table access → HIGH
- Cross-module function call without contract → HIGH
- Shared function not in shared.js → MEDIUM
- Contract in GLOBAL_MAP but function doesn't exist → MEDIUM
- Module CSS affecting global scope → LOW
