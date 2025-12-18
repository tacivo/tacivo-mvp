-- Create storage bucket for public assets (organization logos, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-assets',
  'public-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload public assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-assets');

-- Allow authenticated users to update their organization's files
CREATE POLICY "Allow authenticated users to update public assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-assets');

-- Allow everyone to read public assets
CREATE POLICY "Allow public read access to public assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-assets');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete public assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-assets');
