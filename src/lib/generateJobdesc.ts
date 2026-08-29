import jsPDF from 'jspdf'
import 'jspdf-autotable'

type TaskTemplate = {
  id: string
  periode: string
  deskripsi_tugas: string
  urutan_tampil: number
}

type TaskCategory = {
  id: string
  nama_bidang: string
  nomor_urut: number
  task_templates: TaskTemplate[]
}

export type StaffJobdescData = {
  nama: string
  jabatan: string
  tipe_karyawan: string
  categories: TaskCategory[]
}

const PERIODE_ORDER = {
  harian: 1,
  mingguan: 2,
  bulanan: 3,
  periodik: 4,
  berkala: 5,
  insidentil: 6
} as Record<string, number>

export async function generateJobdescPDF(staff: StaffJobdescData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const navy = [26, 58, 92] as [number, number, number]
  const green = [21, 128, 61] as [number, number, number]
  const grayText = [100, 110, 120] as [number, number, number]

  const pageW = 210
  const mL = 20
  const mR = 20

  // 1. KOP SURAT
  doc.setFillColor(...navy)
  doc.rect(0, 0, pageW, 4, 'F')
  doc.setFillColor(...green)
  doc.rect(0, 4, pageW, 1.5, 'F')

  let kopY = 18
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...navy)
  doc.text('MTs KH A WAHAB MUHSIN', pageW / 2, kopY, { align: 'center' })

  kopY += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...grayText)
  doc.text(
    'Ds. Sukarapih, Kec. Sukarame, Kab. Tasikmalaya 46461',
    pageW / 2, kopY, { align: 'center' }
  )

  kopY += 5
  doc.setDrawColor(...navy)
  doc.setLineWidth(1.2)
  doc.line(mL, kopY, pageW - mR, kopY)
  doc.setLineWidth(0.3)
  doc.setDrawColor(...green)
  doc.line(mL, kopY + 1.8, pageW - mR, kopY + 1.8)

  // 2. JUDUL
  let curY = kopY + 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(20, 20, 20)
  doc.text('RINCIAN TUGAS POKOK DAN FUNGSI', pageW / 2, curY, { align: 'center' })

  // 3. BIODATA
  curY += 12
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Nama Lengkap', mL, curY)
  doc.text(':', mL + 30, curY)
  doc.setFont('helvetica', 'bold')
  doc.text(staff.nama, mL + 34, curY)

  curY += 6
  doc.setFont('helvetica', 'normal')
  doc.text('Tipe / Posisi', mL, curY)
  doc.text(':', mL + 30, curY)
  doc.setFont('helvetica', 'bold')
  doc.text(staff.tipe_karyawan || 'Karyawan', mL + 34, curY)

  curY += 6
  doc.setFont('helvetica', 'normal')
  doc.text('Jabatan Utama', mL, curY)
  doc.text(':', mL + 30, curY)
  doc.setFont('helvetica', 'bold')
  doc.text(staff.jabatan || '-', mL + 34, curY)

  curY += 10

  // 4. DAFTAR TUGAS (Tabel)
  if (staff.categories.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(...grayText)
    doc.text('Belum ada bidang tugas yang ditugaskan kepada karyawan ini.', mL, curY)
  } else {
    // Sort categories
    const sortedCats = [...staff.categories].sort((a, b) => (a.nomor_urut || 0) - (b.nomor_urut || 0))

    const tableBody: any[] = []

    sortedCats.forEach(cat => {
      // Row header kategori
      tableBody.push([{
        content: `Bidang: ${cat.nama_bidang.toUpperCase()}`,
        colSpan: 3,
        styles: { fillColor: [240, 244, 248], fontStyle: 'bold', textColor: navy }
      }])

      if (cat.task_templates.length === 0) {
        tableBody.push([{
          content: 'Belum ada tugas di bidang ini.',
          colSpan: 3,
          styles: { fontStyle: 'italic', textColor: [150, 150, 150] }
        }])
      } else {
        // Sort tugas berdasarkan periode dan urutan_tampil
        const sortedTasks = [...cat.task_templates].sort((a, b) => {
          const pA = PERIODE_ORDER[a.periode] || 99
          const pB = PERIODE_ORDER[b.periode] || 99
          if (pA !== pB) return pA - pB
          return (a.urutan_tampil || 0) - (b.urutan_tampil || 0)
        })

        sortedTasks.forEach((t, index) => {
          tableBody.push([
            index + 1,
            t.periode.charAt(0).toUpperCase() + t.periode.slice(1),
            t.deskripsi_tugas
          ])
        })
      }
    })

    // @ts-ignore
    doc.autoTable({
      startY: curY,
      head: [['No', 'Periode', 'Deskripsi Tugas']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: navy, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 'auto' }
      },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: mL, right: mR }
    })
  }

  const filename = `Tugas_${staff.nama.replace(/\s+/g, '_').toLowerCase()}.pdf`
  doc.save(filename)
}
