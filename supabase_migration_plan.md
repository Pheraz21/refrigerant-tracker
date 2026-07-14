# Supabase Migration Plan

To migrate the Refrigerant Tracker to Supabase, you need to create the database schema and configure your environment variables.

## 1. SQL Schema
Run the following SQL in your Supabase SQL Editor to create the necessary tables:

```sql
-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'engineer',
  available_roles TEXT[] DEFAULT '{engineer}',
  status TEXT NOT NULL DEFAULT 'pending',
  vehicle_reg TEXT,
  employer TEXT NOT NULL DEFAULT 'Direct Staff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOTTLES TABLE
CREATE TABLE IF NOT EXISTS bottles (
  serial TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  gas_type TEXT NOT NULL,
  initial_weight NUMERIC NOT NULL,
  current_weight NUMERIC NOT NULL,
  location_type TEXT NOT NULL,
  location_id TEXT NOT NULL,
  po_number TEXT,
  supplier TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  intended_destination TEXT,
  intended_location_type TEXT,
  active_hwcn TEXT,
  supplier_hwcn_photo_pending BOOLEAN DEFAULT FALSE,
  supplier_hwcn_photo_url TEXT,
  producer_sites JSONB DEFAULT '[]'::jsonb,
  returned_by TEXT,
  returned_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  registered_by TEXT,
  location_changed_at TIMESTAMPTZ DEFAULT NOW(),
  vehicle_reg TEXT,
  rental_expiry_date TIMESTAMPTZ
);

-- MOVEMENT LOGS TABLE
CREATE TABLE IF NOT EXISTS movement_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial TEXT REFERENCES bottles(serial) ON DELETE CASCADE,
  date TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL,
  from_location TEXT,
  to_location TEXT,
  engineer TEXT,
  notes TEXT,
  vehicle_reg TEXT
);

-- USAGE LOGS TABLE
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial TEXT REFERENCES bottles(serial) ON DELETE CASCADE,
  date TIMESTAMPTZ DEFAULT NOW(),
  job_type TEXT NOT NULL,
  site_ref TEXT,
  site_name TEXT,
  site_address TEXT,
  engineer TEXT,
  weight_used NUMERIC NOT NULL,
  weight_before NUMERIC NOT NULL,
  weight_after NUMERIC NOT NULL
);

-- HWCNs TABLE
CREATE TABLE IF NOT EXISTS hwcns (
  id TEXT PRIMARY KEY,
  serial TEXT REFERENCES bottles(serial),
  destination TEXT NOT NULL,
  sites JSONB NOT NULL DEFAULT '[]'::jsonb,
  vehicle_reg TEXT,
  engineer TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  gas_type TEXT NOT NULL,
  fill_weight NUMERIC NOT NULL,
  delivered_at TIMESTAMPTZ,
  received_by TEXT,
  received_signature TEXT,
  hwcn_status TEXT NOT NULL DEFAULT 'draft',
  rejection_details TEXT,
  vehicle_reg_consignee TEXT,
  part_e_completed_at TIMESTAMPTZ,
  accepted BOOLEAN
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'new',
  metadata JSONB
);

-- SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-fill supplier data
INSERT INTO suppliers (id, name, address, phone) VALUES 
('SUP-001', 'Bejer Ref', 'Units 17-23, Invincible Drive, Armstrong Centre Industrial Park, Scotswood, NE4 7HX', '0191 272 0434'),
('SUP-002', 'TF Solutions', 'Unit 2, City Park Industrial Estate, Gelderd Road, Leeds, LS12 6DR', '0113 487 1985'),
('SUP-003', 'Kooltech', 'Unit 2, Eastern Avenue Trade Park, Eastern Avenue, Newcastle, NE11 0ZJ', '0345 034 4172'),
('SUP-004', 'BOC Gas & Gear', 'Portobello Industrial Estate, Shadon Way, Birtley, DH3 2SW', '0191 411 3042')
ON CONFLICT (id) DO NOTHING;

-- GASES TABLE
CREATE TABLE IF NOT EXISTS gases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  type TEXT,
  un_number TEXT,
  gwp NUMERIC,
  odp NUMERIC,
  hazard_class TEXT,
  can_be_bought_new BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-fill detailed gas data
INSERT INTO gases (name, type, un_number, gwp, odp, hazard_class, can_be_bought_new) VALUES 
('R32', 'HFC', 'UN 3252', 675, 0, '2.1 (Flammable gas)', TRUE),
('R410A', 'HFC Blend', 'UN 3163', 2088, 0, '2.2', TRUE),
('R407C', 'HFC Blend', 'UN 3340', 1774, 0, '2.2', FALSE),
('R22', 'HCFC', 'UN 1018', 1810, 0.055, '2.2', FALSE)
ON CONFLICT (name) DO NOTHING;

-- DECOMMISSIONED EQUIPMENT TABLE
CREATE TABLE IF NOT EXISTS decommissioned_equipment (
  id TEXT PRIMARY KEY,
  bottle_serial TEXT REFERENCES bottles(serial),
  job_number TEXT NOT NULL,
  site_name TEXT,
  site_address TEXT,
  site_postcode TEXT,
  engineer TEXT,
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  gas_type TEXT,
  total_weight_recovered NUMERIC NOT NULL DEFAULT 0,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- COMPANY SETTINGS TABLE (single row, id='main')
CREATE TABLE IF NOT EXISTS company_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  carrier_reg_no TEXT DEFAULT 'CBDU368286',
  company_name TEXT DEFAULT '21 Degrees Ltd',
  company_address TEXT,
  company_postcode TEXT,
  company_phone TEXT,
  waste_carrier_licence TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO company_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;
```

## 1b. Additional Column (run separately if schema already exists)

```sql
-- Missing column added after initial schema creation
ALTER TABLE bottles ADD COLUMN IF NOT EXISTS return_hwcn_number TEXT;
```

## 2. Environment Variables
Create a `.env.local` file in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. Row Level Security (RLS)
Disable RLS or add broad policies for the prototype:
```sql
ALTER TABLE bottles DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE movement_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE hwcns DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE gases DISABLE ROW LEVEL SECURITY;
ALTER TABLE decommissioned_equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings DISABLE ROW LEVEL SECURITY;
```

## 4. Storage Buckets
The app uploads photos of completed physical HWCN paperwork to Supabase Storage.
This bucket is **required** — without it, supplier-return photo uploads throw
`Bucket not found` and the "Upload & Complete Return" / office batch-return actions
silently fail to complete.

**Bucket:** `hwcn-photos` (public) — used by:
- `app/engineer/bottle/[serial]/page.tsx` — engineer direct-to-supplier returns (`uploadHwcnPhotoToStorage`)
- `app/admin/supplier-returns-waste/page.tsx` — office batch supplier returns

Objects are written under the `supplier-returns/` prefix and read back via `getPublicUrl`
(hence the bucket must be public so the photo renders on the admin bottle-detail HWCN tab).

Users are logged in via `supabase.auth.signInWithPassword`, so uploads run as the
`authenticated` role and need write policies on `storage.objects`.

```sql
-- Create the public bucket the app expects
INSERT INTO storage.buckets (id, name, public)
VALUES ('hwcn-photos', 'hwcn-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow logged-in users (engineers + office) to upload the HWCN photos
CREATE POLICY "hwcn-photos authenticated write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hwcn-photos');

CREATE POLICY "hwcn-photos authenticated update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'hwcn-photos');
```
