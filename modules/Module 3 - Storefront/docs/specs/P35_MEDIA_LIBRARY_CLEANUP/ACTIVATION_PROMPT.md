You are the opticup-executor. The Foreman has authored P35 — Media Library Cleanup + Reconciliation.

SPEC location: modules/Module 3 - Storefront/docs/specs/P35_MEDIA_LIBRARY_CLEANUP/SPEC.md

NO CODE CHANGES. This is purely a DB + Storage data cleanup. ~1-2 hours work.

Four cleanups (in §1 of SPEC):
1. DELETE 12 dead WordPress-URL rows from media_library
2. DELETE 25 orphan backup files (~70 MB) under products-backup-2026-04-26/
3. REGISTER 30 wp-migrated storage files into media_library so they appear in admin UI
4. FIX 8 null-tenant files: dedupe (4 pairs), relocate to correct path, register in DB

START PROTOCOL:
1. Cowork-VM sync gate + CLAUDE.md First Action 1-8
2. Read SPEC.md in full
3. Apply all prior P23-P34 skill improvements during pre-flight (especially: live-state baseline reverification, since SPEC counts were captured a few hours before dispatch)
4. Pre-flight: rerun the 4 count queries from §2.1; if any count differs by >5, STOP and surface
5. Execute steps 1-4 in §8 sequentially. Each step starts with a pre-check count and ends with a post-check verification.
6. Final smoke: open https://app.opticalis.co.il/storefront-studio.html (with Prizma PIN 12345 if needed), scroll through media library, confirm thumbnails render
7. Write 3 reports (EXECUTION_REPORT.md + RECOVERED_INVENTORY.md + DELETED_INVENTORY.md) into the SPEC folder
8. End with clean working tree on develop, no source code changes

HARD CONSTRAINTS:
- NO source code changes (no .js, .ts, .html, .sql in modules/ or supabase/)
- DELETE operations are scoped to the 4 documented sets ONLY
- Step 2 (backup folder) is the most destructive — confirm Daniel's ack ("לך על זה" — already given) before running step 2b
- ALL deletes use RETURNING + verify count
- ALL inserts use ON CONFLICT DO NOTHING (idempotent)
- No --no-verify needed (no commits expected on source)
- If pre-step count differs from SPEC §2 numbers by >5 → STOP

EXECUTION DECISIONS (don't deviate):
- For the 4 null-tenant pairs (Hoya/Leica/Rodenstock/Zeiss), keep the dash-separated names (second upload), delete the underscore versions
- For 30 wp-migrated INSERTs, derive filename/mime_type/file_size from storage.objects.metadata; folder='wp-migrated'; uploaded_by='system-recovery-p35'
- For 4 null relocated INSERTs, folder='general'; uploaded_by='system-recovery-p35'

Stop on deviation per §5. When done, signal Daniel that the SPEC is ready for Foreman review.
