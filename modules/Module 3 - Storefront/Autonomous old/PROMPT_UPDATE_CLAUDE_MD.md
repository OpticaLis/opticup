# Update CLAUDE.md — Add Backup Policy

Context: Optic Up — multi-tenant SaaS optical store management.
Repo: OpticaLis/opticup-storefront
Working directory: C:\Users\User\opticup-storefront
Machine: 🖥️ Windows

## Task

Update `CLAUDE.md` in the storefront repo to add a mandatory backup rule.
This is a documentation-only change — no code changes.

## Steps

### Step 1 — Setup
```bash
cd C:/Users/User/opticup-storefront
git checkout develop
git pull origin develop
```
Read `CLAUDE.md` to understand the current structure.

### Step 2 — Add rule #10 to the Rules section

After the last numbered rule (currently rule 9), add:

```
10. **Backup before every phase** — Before starting ANY phase, create a timestamped backup:
    - Location: `C:\Users\User\opticup\modules\Module 3 - Storefront\backups\[YYYY-MM-DD_HH-MM]_pre-[phase-name]\`
    - Include: full `opticup-storefront` directory (excluding node_modules, .git, dist, .vercel, .env)
    - Why: backup is taken at phase START, meaning the previous phase was already verified. Every backup = known-good state.
    - Verify backup contains src/, CLAUDE.md, SESSION_CONTEXT.md before proceeding.
```

### Step 3 — Add Backup Policy section

After the "Known Issues & Learnings" section, add this new section:

```markdown
---

## Backup Policy

**Every phase starts with a backup. No exceptions.**

- **Location:** `C:\Users\User\opticup\modules\Module 3 - Storefront\backups\`
- **Format:** `[YYYY-MM-DD_HH-MM]_pre-[phase-name]\opticup-storefront\`
- **Excludes:** node_modules, .git, dist, .vercel, .env
- **Logic:** Backup happens BEFORE any changes. Previous phase was verified as working → backup = known-good state.

**To restore from backup:**
```powershell
# 1. Copy backup files back (preserves .git)
robocopy "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\[BACKUP_DIR]\opticup-storefront" "C:\Users\User\opticup-storefront" /E /XD .git
# 2. Reinstall dependencies
npm install
# 3. Verify
npm run build
```

**Existing backups:**
| Timestamp | Phase | Status |
|-----------|-------|--------|
| (will be filled as phases complete) | | |
```

### Step 4 — Update ERP CLAUDE.md too

In `C:\Users\User\opticup\CLAUDE.md`, find the Module 3 related section and add:

```markdown
### Storefront Backup Policy
- Storefront backups are stored in `modules/Module 3 - Storefront/backups/`
- Each backup is a timestamped directory containing the full opticup-storefront repo (minus node_modules/.git/.env)
- Backups are created at the START of each storefront phase
- See `opticup-storefront/CLAUDE.md` for restore instructions
```

### Step 5 — Commit both repos

```bash
cd C:/Users/User/opticup-storefront
git add CLAUDE.md
git commit -m "Add backup policy to CLAUDE.md"
git push origin develop

cd C:/Users/User/opticup
git checkout develop
git pull origin develop
git add CLAUDE.md
git commit -m "Add storefront backup policy reference to CLAUDE.md"
git push origin develop
```

Done. Output what was changed.
