-- ==============================================================================
-- CURATED INDIA - SUPABASE SCHEMA & SECURITY HARDENING
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
  delivery_charge NUMERIC(10, 2) DEFAULT 0,
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

-- Ensure delivery_charge column exists if table is already created
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_charge NUMERIC(10, 2) DEFAULT 0;

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
-- 5. STORAGE BUCKET: product-images (SECURITY ADVISOR HARDENING)
-- ==============================================================================

-- Create bucket 'product-images' if not already present
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies on product-images
DROP POLICY IF EXISTS "Public Read Access for Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Public Can View Individual Images No Listing" ON storage.objects;
DROP POLICY IF EXISTS "Admin Select Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Product Images" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Product Images" ON storage.objects;

-- Fix Warning: 'Public Bucket Allows Listing on storage.product-images'
-- Allows viewing individual images by URL but blocks directory/bucket listing (.list())
CREATE POLICY "Public Can View Individual Images No Listing"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'product-images'
  AND NOT storage.allow_only_operation('object.list')
);

-- Allow Admin to list and inspect objects in product-images
CREATE POLICY "Admin Select Product Images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);

-- Storage Admin INSERT (Upload) strictly restricted to hello.curatedindia@gmail.com
CREATE POLICY "Admin Upload Product Images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);

-- Storage Admin UPDATE strictly restricted to hello.curatedindia@gmail.com
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

-- Storage Admin DELETE strictly restricted to hello.curatedindia@gmail.com
CREATE POLICY "Admin Delete Product Images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);

-- ==============================================================================
-- 6. SECURITY DEFINER HARDENING: rls_auto_enable()
-- Fix Warnings:
-- 'Public Can Execute SECURITY DEFINER Function on public.rls_auto_enable()'
-- 'Signed-In Users Can Execute SECURITY DEFINER Function on public.rls_auto_enable()'
-- ==============================================================================
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;

-- ==============================================================================
-- 7. ORDERS TABLE & ROW LEVEL SECURITY (RLS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  phone_number TEXT,
  product_image_url TEXT,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_status TEXT DEFAULT 'PAID',
  items JSONB DEFAULT '[]'::jsonb,
  shipping_address JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure orders table columns exist if table was already created
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_image_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_address JSONB DEFAULT '{}'::jsonb;

-- Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing orders policies to prevent conflicts
DROP POLICY IF EXISTS "Public Read Access on Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Insert Orders" ON public.orders;
DROP POLICY IF EXISTS "Admin Update Orders" ON public.orders;
DROP POLICY IF EXISTS "Admin Delete Orders" ON public.orders;

-- Public Insert: Customers can create orders upon checkout
CREATE POLICY "Public Insert Orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (true);

-- Public Read: View orders for tracking and admin dashboard
CREATE POLICY "Public Read Access on Orders"
ON public.orders
FOR SELECT
TO public
USING (true);

-- Admin Update: Strictly restricted so ONLY hello.curatedindia@gmail.com can update status (e.g. PACKED)
CREATE POLICY "Admin Update Orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
)
WITH CHECK (
  LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);

-- Admin Delete: Strictly restricted to hello.curatedindia@gmail.com
CREATE POLICY "Admin Delete Orders"
ON public.orders
FOR DELETE
TO authenticated
USING (
  LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);

-- ==============================================================================
-- 8. INVENTORY TRANSACTIONS TABLE (ACTIVITY LOG LEDGER)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT,
  product_name TEXT,
  quantity_change INTEGER DEFAULT 0,
  reason TEXT NOT NULL,
  admin_user TEXT DEFAULT 'hello.curatedindia@gmail.com',
  order_id TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access on Inventory Transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Admin Insert Inventory Transactions" ON public.inventory_transactions;

CREATE POLICY "Public Read Access on Inventory Transactions"
ON public.inventory_transactions
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admin Insert Inventory Transactions"
ON public.inventory_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);

-- ==============================================================================
-- 9. NEWSLETTER SUBSCRIBERS TABLE (DROP NOTIFICATIONS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Can Subscribe to Newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admin Read Newsletter Subscribers" ON public.newsletter_subscribers;

CREATE POLICY "Public Can Subscribe to Newsletter"
ON public.newsletter_subscribers
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admin Read Newsletter Subscribers"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (
  LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'hello.curatedindia@gmail.com'
);
