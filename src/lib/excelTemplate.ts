import * as XLSX from 'xlsx'

/**
 * Generate dan download file Excel template untuk import pegawai.
 * Kolom: nama, jabatan, email, password
 */
export function downloadExcelTemplate() {
  // Header kolom
  const headers = ['nama', 'jabatan', 'email', 'password']

  // Contoh data (2 baris agar admin paham formatnya)
  const exampleRows = [
    ['Ahmad Fauzi', 'Staf TU', 'ahmad.fauzi@mtskhwm.sch.id', 'Password123'],
    ['Siti Rahayu', 'Bendahara', 'siti.rahayu@mtskhwm.sch.id', 'Password456'],
  ]

  const worksheetData = [headers, ...exampleRows]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

  // Atur lebar kolom
  worksheet['!cols'] = [
    { wch: 30 }, // nama
    { wch: 25 }, // jabatan
    { wch: 35 }, // email
    { wch: 20 }, // password
  ]

  // Style header (bold) — xlsx community edition tidak mendukung rich style,
  // tapi kita bisa pakai SheetJS Pro workaround via komentar cell
  // Untuk sekarang cukup format data saja

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pegawai')

  // Tambah sheet petunjuk
  const instruksiData = [
    ['PETUNJUK PENGISIAN TEMPLATE IMPORT PEGAWAI'],
    [''],
    ['Kolom', 'Keterangan', 'Wajib?'],
    ['nama', 'Nama lengkap pegawai/guru', 'Ya'],
    ['jabatan', 'Jabatan atau bidang tugas (boleh kosong)', 'Tidak'],
    ['email', 'Email untuk login ke sistem (harus unik)', 'Ya'],
    ['password', 'Password awal (minimal 6 karakter)', 'Ya'],
    [''],
    ['CATATAN:'],
    ['- Hapus baris contoh sebelum upload'],
    ['- Jangan ubah nama kolom di baris pertama'],
    ['- Email tidak boleh sama dengan akun yang sudah ada'],
    ['- Simpan file dalam format .xlsx'],
  ]
  const instrSheet = XLSX.utils.aoa_to_sheet(instruksiData)
  instrSheet['!cols'] = [{ wch: 15 }, { wch: 45 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(workbook, instrSheet, 'Petunjuk')

  XLSX.writeFile(workbook, 'template_import_pegawai.xlsx')
}

/**
 * Parse file Excel yang diupload, return array of StaffImportRow
 */
export type StaffImportRow = {
  nama: string
  jabatan: string
  email: string
  password: string
  _rowIndex: number
}

export async function parseExcelFile(file: File): Promise<StaffImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Ambil sheet pertama
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Convert ke JSON, skip baris header
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, {
          header: 0,
          defval: '',
          raw: false,
        })

        const rows: StaffImportRow[] = jsonData.map((row, index) => ({
          nama: String(row['nama'] || '').trim(),
          jabatan: String(row['jabatan'] || '').trim(),
          email: String(row['email'] || '').trim().toLowerCase(),
          password: String(row['password'] || '').trim(),
          _rowIndex: index + 2, // +2 karena row 1 = header di Excel
        }))

        resolve(rows)
      } catch (err) {
        reject(new Error('Gagal membaca file Excel. Pastikan format file .xlsx benar.'))
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsArrayBuffer(file)
  })
}
