# Mission 6: Supabase Health — Checklist

Monitor Supabase for runtime issues invisible in code review.

## Prerequisites

This mission requires the Supabase MCP tools. If not available, skip and note
"Mission 6 skipped — Supabase MCP not connected" in the report.

## Scan Categories

### 6.1 Recent Errors in Logs
Use Supabase MCP `get_logs` to check for recent errors:
- Check Postgres logs for errors
- Check Edge Function logs for failures
- Check Auth logs for unusual patterns

Report: recurring error patterns, frequency, affected components.

### 6.2 RLS Violations
Look for permission denied errors that indicate RLS blocking legitimate requests:
This shows up as specific Postgres error codes in logs.

### 6.3 Edge Function Health
Use `list_edge_functions` to get all functions, then check logs for each:
- Functions that haven't been invoked recently (may be orphaned)
- Functions with high error rates
- Functions with unusually long execution times

### 6.4 Table Size and Growth
```sql
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as total_size,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 20;
```
Flag: tables growing unusually fast, tables with millions of rows that might need indexing.

### 6.5 Missing Indexes
```sql
SELECT schemaname, tablename, seq_scan, seq_tup_read,
  idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE schemaname = 'public'
AND seq_scan > 100
AND idx_scan < seq_scan / 10
ORDER BY seq_tup_read DESC
LIMIT 10;
```
Tables with many sequential scans and few index scans → potential missing index → MEDIUM.

### 6.6 Orphaned Storage Objects
Check if there are storage buckets or objects not referenced by any table.

### 6.7 Connection Pool Status
Check if connection pool is healthy and not approaching limits.

## Severity Guidelines

- Recurring RLS violations → HIGH (may indicate broken policy)
- Edge Function with >10% error rate → HIGH
- Table with no indexes and high scan count → MEDIUM
- Orphaned storage objects → LOW
- Edge Function not invoked in 30+ days → LOW
