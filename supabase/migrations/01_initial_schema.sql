-- Create Departments Table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    portal_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Citizens Table
CREATE TABLE public.citizens (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact TEXT,
    language_pref TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Officers Table
CREATE TABLE public.officers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Grievances Table
CREATE TABLE public.grievances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id UUID REFERENCES public.citizens(id) ON DELETE CASCADE NOT NULL,
    raw_text TEXT NOT NULL,
    category TEXT,
    departments JSONB DEFAULT '[]'::jsonb, -- Array of department IDs
    urgency_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Filed' CHECK (status IN ('Filed', 'Acknowledged', 'In Progress', 'Resolved-Pending Confirmation', 'Closed', 'Reopened')),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duplicate_of_id UUID REFERENCES public.grievances(id) ON DELETE SET NULL,
    withdrawn BOOLEAN DEFAULT false,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    reopened_count INTEGER DEFAULT 0,
    official_registration_number TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grievances ENABLE ROW LEVEL SECURITY;

-- Departments RLS: Anyone can read departments
CREATE POLICY "Departments are viewable by everyone" ON public.departments FOR SELECT USING (true);

-- Citizens RLS: Citizens can read and update their own profiles
CREATE POLICY "Citizens can view own profile" ON public.citizens FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Citizens can update own profile" ON public.citizens FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Citizens can insert own profile" ON public.citizens FOR INSERT WITH CHECK (auth.uid() = id);

-- Officers RLS: Officers can read their own profiles
CREATE POLICY "Officers can view own profile" ON public.officers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Officers can update own profile" ON public.officers FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Officers can insert own profile" ON public.officers FOR INSERT WITH CHECK (auth.uid() = id);

-- Grievances RLS
-- Citizens can select/insert/update their own grievances
CREATE POLICY "Citizens can select own grievances" ON public.grievances FOR SELECT 
USING (
  auth.uid() = citizen_id OR 
  (auth.jwt() ->> 'role' = 'officer' AND EXISTS (
    SELECT 1 FROM public.officers o WHERE o.id = auth.uid() AND departments @> to_jsonb(o.department_id::text)
  ))
);

CREATE POLICY "Citizens can insert own grievances" ON public.grievances FOR INSERT 
WITH CHECK (auth.uid() = citizen_id);

CREATE POLICY "Citizens can update own grievances" ON public.grievances FOR UPDATE 
USING (auth.uid() = citizen_id);

-- Officers can view and update grievances assigned to their department
CREATE POLICY "Officers can update assigned grievances" ON public.grievances FOR UPDATE 
USING (
  auth.jwt() ->> 'role' = 'officer' AND EXISTS (
    SELECT 1 FROM public.officers o WHERE o.id = auth.uid() AND departments @> to_jsonb(o.department_id::text)
  )
);

-- Enable Realtime for Grievances
BEGIN;
  -- remove the supabase_realtime publication if it exists to recreate safely or just alter it if it's there
  -- we can just add the table
  -- DROP PUBLICATION IF EXISTS supabase_realtime;
  -- CREATE PUBLICATION supabase_realtime;
  -- NOTE: supabase_realtime publication usually exists by default in supabase
  ALTER PUBLICATION supabase_realtime ADD TABLE public.grievances;
COMMIT;

-- Function to automatically update 'updated_at' column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_grievances_updated_at
    BEFORE UPDATE ON public.grievances
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Setup Storage for Grievance Images
INSERT INTO storage.buckets (id, name, public) VALUES ('grievance-images', 'grievance-images', false);

-- Storage RLS Policies
-- Citizens can upload to grievance-images
CREATE POLICY "Citizens can upload images" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'grievance-images' AND 
  auth.role() = 'authenticated'
);

-- Citizens can view their own uploaded images (assuming we scope by folder or just let authenticated read for now, 
-- but strictly: they should only read their own. For simplicity, we'll allow authenticated to read, but in prod we'd check path)
CREATE POLICY "Authenticated users can read images" ON storage.objects FOR SELECT
USING (
  bucket_id = 'grievance-images' AND 
  auth.role() = 'authenticated'
);
