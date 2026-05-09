-- Down: 2026_05_09_branches_ashkelon_seed_down
DELETE FROM public.tenant_branches
 WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND slug = 'ashkelon';
