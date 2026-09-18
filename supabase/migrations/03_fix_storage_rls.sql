-- 03_fix_storage_rls.sql
-- Fixes the storage RLS policy so citizens can only read their own images, and officers can read assigned images.

BEGIN;

-- Drop the old policy
DROP POLICY IF EXISTS "Authenticated users can read images" ON storage.objects;

-- Create the new policy for Citizens (must match folder name to their UID)
CREATE POLICY "Citizens can read own images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'grievance-images' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: To allow Officers to read images assigned to their department, they need a separate policy.
-- Because storage.objects doesn't link directly to public.grievances, we join through the grievances table
-- where the image_url contains the object name, or where the citizen_id matches the foldername.
-- For simplicity, since the file name is {user.id}/{filename}, we check if the officer is assigned
-- to any grievance that belongs to the citizen (the foldername).
CREATE POLICY "Officers can read assigned images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'grievance-images' AND
  auth.jwt() -> 'user_metadata' ->> 'role' = 'officer' AND
  EXISTS (
    SELECT 1 FROM public.grievances g
    JOIN public.officers o ON o.id = auth.uid()
    WHERE g.citizen_id::text = (storage.foldername(name))[1]
    AND g.departments @> to_jsonb(o.department_id::text)
  )
);

COMMIT;
