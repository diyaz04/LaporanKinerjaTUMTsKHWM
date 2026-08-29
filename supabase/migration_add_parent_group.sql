-- Migration: Add parent_group column and backfill existing data

-- 1. Add the new column
ALTER TABLE task_categories ADD COLUMN IF NOT EXISTS parent_group text;

-- 2. Backfill existing categories based on name matching
UPDATE task_categories 
SET parent_group = 'Wakamad Kurikulum' 
WHERE nama_bidang ILIKE '%pembelajaran & akademik%' 
   OR nama_bidang ILIKE '%layanan perpustakaan%' 
   OR nama_bidang ILIKE '%evaluasi & perangkat guru%' 
   OR nama_bidang ILIKE '%pembelajaran & kbm digital%' 
   OR nama_bidang ILIKE 'wakamad kurikulum';

UPDATE task_categories 
SET parent_group = 'Wakamad Kesiswaan' 
WHERE nama_bidang ILIKE '%kesiswaan & karakter%' 
   OR nama_bidang ILIKE '%kesiswaan (apresiasi)%' 
   OR nama_bidang ILIKE 'wakamad kesiswaan';

UPDATE task_categories 
SET parent_group = 'Wakamad Sarpras' 
WHERE nama_bidang ILIKE '%aset & digital kbm%' 
   OR nama_bidang ILIKE '%sarana & pemeliharaan%' 
   OR nama_bidang ILIKE '%sarana & pemliharaan%' 
   OR nama_bidang ILIKE 'wakamad sarpras';

UPDATE task_categories 
SET parent_group = 'Wakamad Humas' 
WHERE nama_bidang ILIKE '%kehumasan & kemitraan%' 
   OR nama_bidang ILIKE '%sosialisasi & marketing%' 
   OR nama_bidang ILIKE '%sosisalisasi & marketing%' 
   OR nama_bidang ILIKE '%web & berita madrasah%' 
   OR nama_bidang ILIKE '%konten media sosial%' 
   OR nama_bidang ILIKE 'wakamad humas';

UPDATE task_categories 
SET parent_group = 'Bendahara' 
WHERE nama_bidang ILIKE '%bendahara keuangan%' 
   OR nama_bidang ILIKE '%pelaporan keuangan%' 
   OR nama_bidang ILIKE '%kebendaharaan operasional%' 
   OR nama_bidang ILIKE '%kebendaharaan operasioanal%' 
   OR nama_bidang ILIKE 'bendahara%';

UPDATE task_categories 
SET parent_group = 'Ketatausahaan' 
WHERE nama_bidang ILIKE '%persuratan & umum%' 
   OR nama_bidang ILIKE '%kearsipan pusat%' 
   OR nama_bidang ILIKE '%sekretariat kemitraan%' 
   OR nama_bidang ILIKE 'ketatausahaan' 
   OR nama_bidang ILIKE 'kepala tu';
