# Cowork Skill Sync — Quick Reference

## What this is

The 5 Optic Up skills (`opticup-strategic`, `opticup-executor`, `opticup-guardian`,
`opticup-reviewer`, `opticup-sentinel`) live in the project repo at:

```
opticup/.claude/skills/opticup-*
```

This lets them be versioned in git. Claude Code sees them automatically.

**Cowork mode, however, auto-loads skills only from the user-level folder:**

```
$HOME/.claude/skills/opticup-*              (Mac)
C:\Users\User\.claude\skills\opticup-*      (Windows)
```

`sync-cowork-skills.ps1` mirrors the project skills into the user folder so
Cowork sees them too.

---

## When to run it

1. **Once**, after cloning/pulling this repo for the first time on a machine.
2. **Every time** a skill file under `opticup/.claude/skills/` is modified
   (new skill, template change, protocol update, etc.).
3. **After every `chore(skills): ...` commit** pulled from `develop`.

---

## Windows (PowerShell)

```powershell
cd C:\Users\User\opticup
powershell -ExecutionPolicy Bypass -File scripts\sync-cowork-skills.ps1
```

Dry-run (see what would change without touching anything):
```powershell
powershell -ExecutionPolicy Bypass -File scripts\sync-cowork-skills.ps1 -DryRun
```

---

## Mac (PowerShell 7)

If you don't have PowerShell on Mac yet:
```bash
brew install --cask powershell
```

Then:
```bash
cd ~/opticup
pwsh ./scripts/sync-cowork-skills.ps1
```

(A bash equivalent may be added later if needed — the PowerShell version works
on all three machines and keeps one source of truth.)

---

## After running

Close and reopen your Cowork chat (or restart Cowork). The new/updated skills
will be auto-loaded at the next Cowork session start.

**Verification:** in a fresh Cowork chat, type a trigger phrase like
"I want to write a SPEC for Module 4". The Cowork agent should auto-load
`opticup-strategic` without being told.

---

## Safety guarantees

- The script only touches subfolders named `opticup-*` inside
  `$HOME/.claude/skills/`.
- Built-in Cowork skills (docx, pdf, pptx, xlsx, schedule, setup-cowork,
  skill-creator) are **never** removed or modified.
- `robocopy /MIR` is scoped per-skill-folder. Stale files inside a mirrored
  opticup skill folder are removed, but no other skill is affected.
- Exit codes 0–3 from robocopy are success; 4+ is a real error and the script
  exits non-zero.

---

## Troubleshooting

**"User Claude folder not found":** Claude Code isn't installed on this
machine, or the path is non-standard. Install Claude Code first.

**Cowork still doesn't see the skill after sync:** close Cowork completely
(not just the chat tab) and reopen. Skill discovery happens at Cowork
startup.

**Skill is out of sync again next day:** someone pushed a skill change and
you haven't pulled + re-run the sync. Add the sync to your "after `git pull`"
habit, or run it as part of a git hook.
