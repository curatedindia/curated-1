-- ==============================================================================
-- CURATED INDIA - SUPABASE SCHEMA & ROW LEVEL SECURITY (RLS) POLICIES
-- Target Admin: hello.curatedindia@gmail.com
-- ==============================================================================

-- 1. PRODUCTS TABLE DEFINITION
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT,
  category_id TEXT DEFAULT 't-shirts',
  subcategory_id TEXT,
  description TEXT,
  fabric TEXT,
  fit TEXT,
  care TEXT,
  condition TEXT DEFAULT 'New / Unused',
  condition_notes TEXT,
  selling_price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  cost_price NUMERIC(10, 2) DEFAULT 0,
  measurements JSONB DEFAULT '{"chest": 0, "length": 0, "shoulder": 0, "sleeve": 0, "unit": "in"}'::jsonb,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  variants JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'ACTIVE',
  is_new_drop BOOLEAN DEFAULT true,
  total_on_hand INTEGER DEFAULT 1,
  total_available INTEGER DEFAULT 1,
  pieces_sold INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ENABLE ROW LEVEL SECURITY (RLS) ON PRODUCTS TABLE
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 3. DROP EXISTING POLICIES TO AVOID DUPLICATION CONFLICTS
DROP POLICY IF EXISTS "Public Read Access on Products" ON public.products;
DROP POLICY IF EXISTS "Admin Insert Products" ON public.products;
DROP POLICY IF EXISTS "Admin Update Products" ON public.products;
DROP POLICY IF EXISTS "Admin Delete Products" ON public.products;

-- 4. PRODUCTS RLS POLICIES
-- Public Read Access: Anyone can read active catalog products
CREATE POLICY "Public Read Access on Products"
ON public.products
FOR SELECT
TO public
USING (true);

-- Admin INSERT: Only hello.curatedindia@gmail.com can add products
CREATE POLICY "Admin Insert Products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);

-- Admin UPDATE: Only hello.curatedindia@gmail.com can modify products
CREATE POLICY "Admin Update Products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
)
WITH CHECK (
  LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);

-- Admin DELETE: Only hello.curatedindia@gmail.com can delete products
CREATE POLICY "Admin Delete Products"
ON public.products
FOR DELETE
TO authenticated
USING (
  LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);

-- ==============================================================================
-- 5. STORAGE BUCKET: product-images
-- ==============================================================================

-- Create bucket 'product-images' if not already present
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies on product-images
DROP POLICY IF EXISTS "Public Read Access for Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Product Images" ON storage.objects;

-- Storage Policy 1: Public SELECT (Read)
CREATE POLICY "Public Read Access for Product Images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Storage Policy 2: Admin INSERT (Upload) strictly restricted to hello.curatedindia@gmail.com
CREATE POLICY "Admin Upload Product Images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);

-- Storage Policy 3: Admin UPDATE strictly restricted to hello.curatedindia@gmail.com
CREATE POLICY "Admin Update Product Images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
)
WITH CHECK (
  bucket_id = 'product-images'
  AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);

-- Storage Policy 4: Admin DELETE strictly restricted to hello.curatedindia@gmail.com
CREATE POLICY "Admin Delete Product Images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);
