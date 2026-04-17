# Mission 7: Progress Tracking — Checklist

Compare documented progress against actual project state.
Catch stale docs that claim work is "in progress" when it's done (or vice versa).

## Scan Categories

### 7.1 ROADMAP Status Accuracy
For each module with a ROADMAP.md:
1. Read `modules/Module X/ROADMAP.md`
2. For items marked ✅ (complete):
   - Spot-check: does the feature/file exist?
   - Are there recent git commits that suggest rework on "completed" items?
3. For items marked ⬜ (not started):
   - Check git log for commits that might already address this item
4. For items marked 🟡 (in progress):
   - When was the last commit touching related files?
   - If >2 weeks with no activity → flag as potentially stalled

### 7.2 SESSION_CONTEXT.md Currency
For each module:
1. Read `modules/Module X/docs/SESSION_CONTEXT.md`
2. Compare the stated "current status" against:
   - Recent git log for that module
   - ROADMAP markers
   - CHANGELOG.md entries
3. If SESSION_CONTEXT says "Phase B in progress" but ROADMAP says Phase B ✅ → mismatch

### 7.3 CHANGELOG.md Completeness
For each module:
1. Read `modules/Module X/docs/CHANGELOG.md`
2. Compare against git log:
   ```bash
   git log --oneline -- "modules/Module X/"
   ```
3. Commits not reflected in CHANGELOG → finding

### 7.4 Open Items from Previous Phases
Check if there are deferred items from previous phases that haven't been picked up:
1. Read SESSION_CONTEXT for mentions of "deferred", "pending", "TODO"
2. Cross-reference with ROADMAP — are deferred items tracked?

### 7.5 Git Activity Analysis
```bash
git log --oneline --since="1 week ago" --stat
```
Summarize: which modules had activity, which were dormant.
Compare against stated priorities in SESSION_CONTEXT.

## Severity Guidelines

- ROADMAP says ✅ but feature doesn't exist → HIGH
- SESSION_CONTEXT contradicts ROADMAP → MEDIUM
- SESSION_CONTEXT stale >2 weeks → MEDIUM
- Commits not in CHANGELOG → LOW
- Deferred items not tracked → LOW
