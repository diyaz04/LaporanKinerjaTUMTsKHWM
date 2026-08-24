import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ReportBatch, Profile, TaskSubmission, TaskTemplate, TaskCategory } from '../types/database'

export type PrintData = {
  batch: ReportBatch
  profile: Profile
  submissions: (TaskSubmission & {
    task_templates: TaskTemplate & { task_categories: TaskCategory }
  })[]
}

export function generatePDF(data: PrintData, mode: 'replika' | 'simpel') {
  const doc = new jsPDF('p', 'mm', 'a4')
  
  if (mode === 'replika') {
    generateReplika(doc, data)
  } else {
    generateSimpel(doc, data)
  }
  
  doc.save(`Laporan_${data.batch.periode}_${data.profile.nama.replace(/\s+/g, '_')}_${data.batch.periode_key}.pdf`)
}

function generateReplika(doc: jsPDF, data: PrintData) {
  // Title / Kop
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(`LEMBAR KONTROL TUGAS ${data.batch.periode.toUpperCase()}`, 105, 20, { align: 'center' })
  doc.setFontSize(12)
  doc.text("MTS KH. A. WAHAB MUHSIN", 105, 27, { align: 'center' })
  
  doc.setLineWidth(0.5)
  doc.line(14, 32, 196, 32)
  
  // Info
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Nama Staff : ${data.profile.nama}`, 14, 40)
  doc.text(`Jabatan    : ${data.profile.jabatan || '-'}`, 14, 46)
  doc.text(`Periode    : ${data.batch.periode_key}`, 14, 52)
  
  // Table Data
  const tableData: any[][] = []
  
  // Group submissions by category
  const grouped = data.submissions.reduce((acc, sub) => {
    const cat = sub.task_templates?.task_categories?.nama_bidang || 'Lainnya'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(sub)
    return acc
  }, {} as Record<string, typeof data.submissions>)

  let counter = 1
  Object.entries(grouped).forEach(([catName, subs]) => {
    // Add category row as a subheader (spans across columns conceptually, but we put it in col 2 or span)
    tableData.push([
      { content: '', styles: { fillColor: [240, 240, 240] } },
      { content: catName, colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }
    ])
    
    subs.forEach(sub => {
      tableData.push([
        counter++,
        catName, // We can keep or hide it, since we grouped it. Let's put it as text if needed
        sub.task_templates.deskripsi_tugas,
        sub.status || '',
        sub.catatan || ''
      ])
    })
  })

  autoTable(doc, {
    startY: 58,
    head: [['No', 'Bidang/Urusan', 'Rincian Tugas & Item Output', 'Status', 'Keterangan']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], textColor: 255 }, // Emerald 600
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 80 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      // Bold category headers
      if (data.row.raw && (data.row.raw as any)[1]?.colSpan === 4) {
        data.cell.styles.fontStyle = 'bold'
      }
    }
  })

  const finalY = (doc as any).lastAutoTable.finalY + 20

  // Signatures
  doc.setFontSize(10)
  const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
  
  doc.text("Mengetahui,", 40, finalY, { align: 'center' })
  doc.text("Kepala MTs KH. A. Wahab Muhsin", 40, finalY + 5, { align: 'center' })
  doc.text("H. E. Anwar Sanusi, S.Ag.", 40, finalY + 30, { align: 'center' })
  
  doc.text(`Tasikmalaya, ${today}`, 160, finalY, { align: 'center' })
  doc.text("Kepala Tata Usaha", 160, finalY + 5, { align: 'center' })
  doc.text("Robi Nurtsani, S.Pd.I.", 160, finalY + 30, { align: 'center' })
}

function generateSimpel(doc: jsPDF, data: PrintData) {
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(`Laporan Tugas Digital - ${data.profile.nama}`, 14, 20)
  
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Periode: ${data.batch.periode} (${data.batch.periode_key})`, 14, 28)
  doc.text(`Jabatan: ${data.profile.jabatan || '-'}`, 14, 34)
  
  const tableData = data.submissions.map((sub, i) => [
    i + 1,
    sub.task_templates.task_categories.nama_bidang,
    sub.task_templates.deskripsi_tugas,
    sub.status || '-',
    sub.catatan || '-'
  ])

  autoTable(doc, {
    startY: 42,
    head: [['No', 'Bidang', 'Tugas', 'Status', 'Catatan']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85] }, // Slate 700
    styles: { fontSize: 9 },
  })
}
