-- CREATE TABLES

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text not null,
  jabatan text,
  role text not null check (role in ('admin', 'staff', 'komite')),
  created_at timestamptz default now()
);

create table task_categories (
  id uuid primary key default gen_random_uuid(),
  nomor_urut int,
  nama_bidang text not null,
  created_at timestamptz default now()
);

create table task_templates (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references task_categories(id) on delete cascade,
  periode text not null check (periode in ('harian','mingguan','bulanan','periodik','berkala','insidentil')),
  deskripsi_tugas text not null,
  urutan_tampil int default 0,
  created_at timestamptz default now()
);

create table staff_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  task_category_id uuid references task_categories(id) on delete cascade,
  unique(user_id, task_category_id)
);

create table report_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  periode text not null,
  periode_key text not null,
  status text not null default 'draft' check (status in ('draft','pending_verifikasi','approved','revisi')),
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  catatan_verifikasi text,
  submitted_at timestamptz,
  tugas_lainnya text,
  created_at timestamptz default now(),
  unique(user_id, periode, periode_key)
);

create table task_submissions (
  id uuid primary key default gen_random_uuid(),
  report_batch_id uuid references report_batches(id) on delete cascade,
  template_id uuid references task_templates(id),
  status text check (status in ('Ya','Tdk')),
  catatan text,
  updated_at timestamptz default now()
);


-- ROW LEVEL SECURITY (RLS)

-- Helper function to check if user is admin
create or replace function public.is_admin() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Helper function to check if user is komite
create or replace function public.is_komite() returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'komite'
  );
$$ language sql security definer;

alter table profiles enable row level security;
create policy "staff select self profiles" on profiles for select using (auth.uid() = id);
create policy "staff update self profiles" on profiles for update using (auth.uid() = id);
create policy "admin all profiles" on profiles for all using (public.is_admin());
create policy "komite select all profiles" on profiles for select using (public.is_komite());

alter table task_categories enable row level security;
create policy "select all task_categories" on task_categories for select using (auth.role() = 'authenticated');
create policy "admin all task_categories" on task_categories for all using (public.is_admin());

alter table task_templates enable row level security;
create policy "select all task_templates" on task_templates for select using (auth.role() = 'authenticated');
create policy "admin all task_templates" on task_templates for all using (public.is_admin());

alter table staff_assignments enable row level security;
create policy "staff select self assignments" on staff_assignments for select using (auth.uid() = user_id);
create policy "admin all staff_assignments" on staff_assignments for all using (public.is_admin());

alter table report_batches enable row level security;
create policy "staff select self report_batches" on report_batches for select using (auth.uid() = user_id);
create policy "staff insert self report_batches" on report_batches for insert with check (auth.uid() = user_id);
create policy "staff update self report_batches" on report_batches for update using (auth.uid() = user_id);
create policy "admin all report_batches" on report_batches for all using (public.is_admin());
create policy "komite select report_batches" on report_batches for select using (public.is_komite());

alter table task_submissions enable row level security;
create policy "staff select self task_submissions" on task_submissions for select using (
  exists (select 1 from report_batches where id = report_batch_id and user_id = auth.uid())
);
create policy "staff insert self task_submissions" on task_submissions for insert with check (
  exists (select 1 from report_batches where id = report_batch_id and user_id = auth.uid())
);
create policy "staff update self task_submissions" on task_submissions for update using (
  exists (select 1 from report_batches where id = report_batch_id and user_id = auth.uid())
);
create policy "admin all task_submissions" on task_submissions for all using (public.is_admin());
create policy "komite select task_submissions" on task_submissions for select using (public.is_komite());


-- SEED DATA

INSERT INTO task_categories (nama_bidang, nomor_urut) VALUES
('Pembelajaran & Akademik', 1),
('Layanan Perpustakaan', 2),
('Kehumasan & Kemitraan', 3),
('Persuratan & Umum', 4),
('Bendahara Keuangan', 5),
('Sosialisasi & Marketing', 6),
('Kesiswaan & Karakter', 7),
('Aset & Digital KBM', 8),
('Konten Media Sosial', 9),
('Web & Berita Madrasah', 10),
('Pembelajaran & KBM Digital', 11),
('Evaluasi Media & Marketing', 12),
('Kesiswaan (Apresiasi)', 13),
('Pelaporan Keuangan', 14),
('Evaluasi & Perangkat Guru', 15),
('Kearsipan Pusat', 16),
('Sekretariat Kemitraan', 17),
('Sarana & Pemeliharaan', 18),
('Legalitas & Verifikasi SK', 19),
('Kebendaharaan Operasional', 20);

INSERT INTO task_templates (category_id, periode, deskripsi_tugas, urutan_tampil) VALUES
-- Harian
((SELECT id FROM task_categories WHERE nama_bidang = 'Pembelajaran & Akademik' LIMIT 1), 'harian', 'Mengumpulkan & memilah materi harian (One Day One Ayat, Vocab, Mufrodat) dari guru/tim; Menginput/upload bank materi pembiasaan secara berkala ke Aplikasi Pembelajaran Terpadu.', 1),
((SELECT id FROM task_categories WHERE nama_bidang = 'Layanan Perpustakaan' LIMIT 1), 'harian', 'Menjaga meja layanan perpustakaan, memantau kerapihan ruang baca, & melayani pengunjung; Mengatur, merapikan, dan mengembalikan buku (shelving) sesuai kode call number.', 2),
((SELECT id FROM task_categories WHERE nama_bidang = 'Kehumasan & Kemitraan' LIMIT 1), 'harian', 'Mengumpulkan dan mengarsipkan dokumentasi foto/video kegiatan pembiasaan nyata di madrasah untuk bahan publikasi.', 3),
((SELECT id FROM task_categories WHERE nama_bidang = 'Persuratan & Umum' LIMIT 1), 'harian', 'Mengelola lalu lintas surat masuk dan surat keluar madrasah, termasuk disposisi Kepala Madrasah.', 4),
((SELECT id FROM task_categories WHERE nama_bidang = 'Bendahara Keuangan' LIMIT 1), 'harian', 'Menerima iuran/biaya Program Unggulan dari orang tua/wali; Entry data transaksi secara real-time ke Aplikasi Keuangan Terpadu agar terpantau transparan.', 5),
((SELECT id FROM task_categories WHERE nama_bidang = 'Sosialisasi & Marketing' LIMIT 1), 'harian', 'Memantau & merespons pesan (DM/komentar) medsos & web terkait informasi/PPDB secara ramah; Menyebarkan pengumuman & flyer sosialisasi ke grup WhatsApp (orang tua/alumni/kemitraan).', 6),

-- Mingguan
((SELECT id FROM task_categories WHERE nama_bidang = 'Kesiswaan & Karakter' LIMIT 1), 'mingguan', 'Mengelola dan mengarsipkan berkas rekam jejak kedisiplinan & catatan adab/etika siswa berkoordinasi dengan Guru BK dan Kesiswaan.', 1),
((SELECT id FROM task_categories WHERE nama_bidang = 'Aset & Digital KBM' LIMIT 1), 'mingguan', 'Melakukan pelabelan kode inventaris pada Google TV, router Wi-Fi, & perangkat audio-visual; Mengelola Log Book pemantauan kondisi teknis & riwayat perawatan Google TV dan jaringan internet.', 2),
((SELECT id FROM task_categories WHERE nama_bidang = 'Konten Media Sosial' LIMIT 1), 'mingguan', 'Merancang content planner mingguan (IG, TikTok, FB, YouTube); Mengambil dokumentasi foto/video kegiatan harian (bahasa, tahfidz, KBM digital, event); Memproduksi materi visual (desain grafis, reels/shorts, flyer, banner).', 3),
((SELECT id FROM task_categories WHERE nama_bidang = 'Konten Media Sosial' LIMIT 1), 'mingguan', 'Membuat konten pembiasaan nyata (evidence-based content: cuplikan video siswa berbahasa Arab/Inggris atau hafalan santri).', 4),
((SELECT id FROM task_categories WHERE nama_bidang = 'Web & Berita Madrasah' LIMIT 1), 'mingguan', 'Mengelola, memperbarui, dan mengunggah artikel berita/kegiatan terbaru di situs web resmi madrasah; Menulis rilis berita (press release) prestasi, pembiasaan, & sinergi Tri-Pesantren.', 5),
((SELECT id FROM task_categories WHERE nama_bidang = 'Web & Berita Madrasah' LIMIT 1), 'mingguan', 'Menyusun dan mengorganisir database/galeri foto & video kegiatan madrasah di media penyimpanan digital (cloud/Drive).', 6),

-- Bulanan
((SELECT id FROM task_categories WHERE nama_bidang = 'Pembelajaran & KBM Digital' LIMIT 1), 'bulanan', 'Mengelola database akun guru & siswa (buat akun, reset password, pemutakhiran data); Mengunduh, merekap, dan menyajikan laporan bulanan rekapitulasi absensi digital & agenda mengajar guru ke Wakamad Kurikulum.', 1),
((SELECT id FROM task_categories WHERE nama_bidang = 'Bendahara Keuangan' LIMIT 1), 'bulanan', 'Melayani konfirmasi/verifikasi pembayaran orang tua via aplikasi atau tatap muka; Menyusun rekapitulasi tunggakan & realisasi penerimaan biaya Program Unggulan bulanan untuk Kepala Madrasah & Ketua Komite.', 2),
((SELECT id FROM task_categories WHERE nama_bidang = 'Evaluasi Media & Marketing' LIMIT 1), 'bulanan', 'Merekapitulasi data jangkauan (reach), interaksi (engagement), dan statistik pengunjung sosmed & web madrasah; Melaporkan hasil evaluasi performa konten ke Kepala TU & Wakamad Humas.', 3),

-- Periodik
((SELECT id FROM task_categories WHERE nama_bidang = 'Kesiswaan (Apresiasi)' LIMIT 1), 'periodik', 'Menyiapkan kelengkapan administrasi, sertifikat, dan piagam untuk Literacy Award & Program Unggulan Award; Menarik data dari aplikasi perpustakaan dan aplikasi terpadu untuk daftar calon penerima penghargaan.', 1),
((SELECT id FROM task_categories WHERE nama_bidang = 'Pelaporan Keuangan' LIMIT 1), 'periodik', 'Menyusun laporan keuangan bulanan, semesteran, dan tahunan untuk dana BOS maupun dana Komite; Melakukan rekonsiliasi data penerimaan aplikasi dengan kondisi kas nyata (real cash) secara berkala.', 2),

-- Berkala
((SELECT id FROM task_categories WHERE nama_bidang = 'Evaluasi & Perangkat Guru' LIMIT 1), 'berkala', 'Mempersiapkan, mencetak daftar hadir, & mencatat notulensi agenda sharing session serta pendampingan KBM guru; Mengarsipkan berkas perangkat pembelajaran (RPP/Modul Ajar, Silabus) yang disusun oleh guru.', 1),
((SELECT id FROM task_categories WHERE nama_bidang = 'Kearsipan Pusat' LIMIT 1), 'berkala', 'Mengelola sistem kearsipan pusat madrasah (dokumen pendirian, akreditasi, izin operasional, MoU Kemitraan, & berkas kepegawaian) secara rapi & aman.', 2),

-- Insidentil
((SELECT id FROM task_categories WHERE nama_bidang = 'Layanan Perpustakaan' LIMIT 1), 'insidentil', 'Mengolah fisik buku baru yang masuk (stempel, label call number, barcode, & sampul) sebelum diinput ke aplikasi perpustakaan digital; Melakukan stock opname / pengecekan fisik buku secara berkala.', 1),
((SELECT id FROM task_categories WHERE nama_bidang = 'Kesiswaan & Karakter' LIMIT 1), 'insidentil', 'Memproduksi & memajang media fisik/cetak (banner/stiker) panduan kosakata dasar (Arab & Inggris) di area strategis madrasah.', 2),
((SELECT id FROM task_categories WHERE nama_bidang = 'Sekretariat Kemitraan' LIMIT 1), 'insidentil', 'Mengelola penyusunan, pencatatan, & pengiriman surat resmi ke Pesantren Sukahideng, Sukamanah, dan Al-Makmur Rancabolang; Mengarsipkan berkas kesepakatan (MoU) dan dokumen kerja sama inter-lembaga.', 3),
((SELECT id FROM task_categories WHERE nama_bidang = 'Sarana & Pemeliharaan' LIMIT 1), 'insidentil', 'Mencatat & memproses pengajuan kebutuhan sarana penunjang KBM & program unggulan; Mengelola kuitansi, nota pengadaan, dan Berita Acara Serah Terima (BAST) barang fasilitas.', 4),
((SELECT id FROM task_categories WHERE nama_bidang = 'Legalitas & Verifikasi SK' LIMIT 1), 'insidentil', 'Menandatangani dokumen administrasi tingkat ketatausahaan & memverifikasi keabsahan dokumen/surat keputusan (SK) yang diterbitkan madrasah.', 5),
((SELECT id FROM task_categories WHERE nama_bidang = 'Kebendaharaan Operasional' LIMIT 1), 'insidentil', 'Mengeluarkan anggaran untuk mendukung operasional Program Unggulan berdasarkan pengajuan yang telah disetujui.', 6);
