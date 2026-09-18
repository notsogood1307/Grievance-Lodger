-- 02_fix_role_claim.sql
-- Fixes the RLS policies that incorrectly read auth.jwt() ->> 'role' instead of user_metadata.

BEGIN;

-- Drop the old policies
DROP POLICY IF EXISTS "Citizens can select own grievances" ON public.grievances;
DROP POLICY IF EXISTS "Officers can update assigned grievances" ON public.grievances;

-- Create the new policies
CREATE POLICY "Citizens can select own grievances" ON public.grievances FOR SELECT 
USING (
  auth.uid() = citizen_id OR 
  (auth.jwt() -> 'user_metadata' ->> 'role' = 'officer' AND EXISTS (
    SELECT 1 FROM public.officers o WHERE o.id = auth.uid() AND departments @> to_jsonb(o.department_id::text)
  ))
);

CREATE POLICY "Officers can update assigned grievances" ON public.grievances FOR UPDATE 
USING (
  auth.jwt() -> 'user_metadata' ->> 'role' = 'officer' AND EXISTS (
    SELECT 1 FROM public.officers o WHERE o.id = auth.uid() AND departments @> to_jsonb(o.department_id::text)
  )
);

COMMIT;

/* 
======================================================
HOW TO CREATE AN OFFICER ACCOUNT
======================================================
Since there is no frontend signup for officers, you must create them manually via Supabase dashboard or SQL.
When creating an officer, you MUST set the `user_metadata` field in `auth.users` to contain `{"role": "officer"}`.

Example SQL snippet for creating an officer (run in Supabase SQL editor):

-- 1. Create the user in auth.users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'officer@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"role": "officer"}'::jsonb
) RETURNING id;

-- 2. Insert into public.officers using the returned ID and the correct department ID.
-- INSERT INTO public.officers (id, department_id, name) VALUES ('<id_from_above>', '<department_id>', 'Officer Name');

*/
