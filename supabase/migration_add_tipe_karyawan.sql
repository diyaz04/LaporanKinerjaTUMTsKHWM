-- ============================================================
-- MIGRATION: Tambah kolom tipe_karyawan ke tabel profiles
-- Jalankan query ini di Supabase Dashboard > SQL Editor
-- ============================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tipe_karyawan text 
  CHECK (tipe_karyawan IN ('Staf TU', 'Wakamad', 'Laboran', 'Guru', 'Lainnya'));

-- Opsional: Update data lama yang jabatan-nya mengandung kata kunci tertentu
-- UPDATE profiles SET tipe_karyawan = 'Staf TU' WHERE jabatan ILIKE '%TU%' OR jabatan ILIKE '%tata usaha%';
-- UPDATE profiles SET tipe_karyawan = 'Wakamad' WHERE jabatan ILIKE '%wakamad%' OR jabatan ILIKE '%wakil kepala%';
-- UPDATE profiles SET tipe_karyawan = 'Laboran' WHERE jabatan ILIKE '%laboran%' OR jabatan ILIKE '%lab%';
-- UPDATE profiles SET tipe_karyawan = 'Guru' WHERE jabatan ILIKE '%guru%';
