import * as XLSX from 'xlsx'

export type TemplateImportRow = {
  nama_bidang: string
  periode: string
  deskripsi_tugas: string
  urutan_tampil: number
  _rowIndex: number
  _valid: boolean
  _errors: string[]
}

const VALID_PERIODES = ['harian', 'mingguan', 'bulanan', 'periodik', 'berkala', 'insidentil']

/**
 * Download template Excel untuk import tugas/template.
 * Sheet 1: Data contoh. Sheet 2: Petunjuk + daftar periode valid.
 */
export function downloadTemplateExcel() {
  const headers = ['nama_bidang', 'periode', 'deskripsi_tugas', 'urutan_tampil']

  const exampleRows = [
    ['Pembelajaran & Akademik', 'harian', 'Mengumpulkan & memilah materi harian (One Day One Ayat, Vocab, Mufrodat) dari guru/tim; Menginput ke aplikasi pembelajaran.', 1],
    ['Layanan Perpustakaan', 'harian', 'Menjaga meja layanan perpustakaan, memantau kerapihan ruang baca, & melayani pengunjung.', 2],
    ['Persuratan & Umum', 'harian', 'Mengelola surat masuk dan surat keluar madrasah, termasuk disposisi Kepala Madrasah.', 3],
    ['Konten Media Sosial', 'mingguan', 'Merancang content planner mingguan (IG, TikTok, FB, YouTube); Memproduksi materi visual.', 1],
    ['Pembelajaran & KBM Digital', 'bulanan', 'Mengelola database akun guru & siswa; Merekap laporan absensi digital bulanan.', 1],
    ['Bendahara Keuangan', 'bulanan', 'Menyusun rekapitulasi penerimaan biaya bulanan untuk Kepala Madrasah & Ketua Komite.', 2],
    ['Kesiswaan (Apresiasi)', 'periodik', 'Menyiapkan kelengkapan administrasi, sertifikat, dan piagam untuk Literacy Award.', 1],
    ['Evaluasi & Perangkat Guru', 'berkala', 'Mempersiapkan daftar hadir & mencatat notulensi sharing session; Mengarsipkan RPP guru.', 1],
    ['Sekretariat Kemitraan', 'insidentil', 'Mengelola penyusunan & pengiriman surat resmi ke pesantren mitra; Mengarsipkan MoU.', 1],
  ]

  const worksheetData = [headers, ...exampleRows]
  const ws = XLSX.utils.aoa_to_sheet(worksheetData)

  ws['!cols'] = [
    { wch: 30 }, // nama_bidang
    { wch: 15 }, // periode
    { wch: 80 }, // deskripsi_tugas
    { wch: 14 }, // urutan_tampil
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Template Tugas')

  // Sheet Petunjuk
  const petunjukData = [
    ['PETUNJUK PENGISIAN TEMPLATE IMPORT TUGAS'],
    [''],
    ['Kolom', 'Keterangan', 'Nilai yang Diizinkan', 'Wajib?'],
    ['nama_bidang', 'Nama bidang/kategori tugas. Jika sudah ada di sistem, tugas akan ditambahkan ke sana. Jika belum ada, bidang baru akan dibuat otomatis.', '-', 'Ya'],
    ['periode', 'Periode pelaksanaan tugas (huruf kecil semua)', 'harian | mingguan | bulanan | periodik | berkala | insidentil', 'Ya'],
    ['deskripsi_tugas', 'Deskripsi lengkap tugas. Boleh panjang. Gunakan titik-koma (;) sebagai pemisah sub-tugas.', '-', 'Ya'],
    ['urutan_tampil', 'Angka urutan tampil dalam daftar (bilangan bulat). Opsional, default 0.', 'Angka (mis. 1, 2, 3)', 'Tidak'],
    [''],
    ['PERIODE YANG VALID:'],
    ['', 'harian', '→ Tugas yang dikerjakan setiap hari'],
    ['', 'mingguan', '→ Tugas yang dikerjakan setiap minggu'],
    ['', 'bulanan', '→ Tugas yang dikerjakan setiap bulan'],
    ['', 'periodik', '→ Tugas periodik (per semester/tahun)'],
    ['', 'berkala', '→ Tugas berkala (terjadwal tidak rutin)'],
    ['', 'insidentil', '→ Tugas yang bersifat tidak terjadwal/mendadak'],
    [''],
    ['CATATAN PENTING:'],
    ['- Hapus baris contoh sebelum upload'],
    ['- Jangan ubah nama kolom di baris pertama'],
    ['- Tulis periode dengan huruf kecil semua'],
    ['- Satu baris = satu tugas'],
    ['- Nama bidang yang sama akan dikelompokkan ke kategori yang sama'],
    ['- Simpan file dalam format .xlsx'],
  ]
  const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData)
  wsPetunjuk['!cols'] = [{ wch: 20 }, { wch: 60 }, { wch: 45 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk')

  XLSX.writeFile(wb, 'template_import_tugas.xlsx')
}

/**
 * Parse file Excel upload, validasi tiap baris, return rows dengan status validasi.
 */
export async function parseTemplateExcel(file: File): Promise<TemplateImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, {
          header: 0,
          defval: '',
          raw: false,
        })

        const rows: TemplateImportRow[] = json.map((row, idx) => {
          const nama_bidang = String(row['nama_bidang'] || '').trim()
          const periode = String(row['periode'] || '').trim().toLowerCase()
          const deskripsi_tugas = String(row['deskripsi_tugas'] || '').trim()
          const urutan_tampil = parseInt(String(row['urutan_tampil'] || '0')) || 0

          const errors: string[] = []
          if (!nama_bidang) errors.push('nama_bidang kosong')
          if (!periode) errors.push('periode kosong')
          else if (!VALID_PERIODES.includes(periode)) errors.push(`periode "${periode}" tidak valid`)
          if (!deskripsi_tugas) errors.push('deskripsi_tugas kosong')

          return {
            nama_bidang,
            periode,
            deskripsi_tugas,
            urutan_tampil,
            _rowIndex: idx + 2,
            _valid: errors.length === 0,
            _errors: errors,
          }
        })

        resolve(rows)
      } catch {
        reject(new Error('Gagal membaca file Excel. Pastikan format .xlsx benar.'))
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file.'))
    reader.readAsArrayBuffer(file)
  })
}
