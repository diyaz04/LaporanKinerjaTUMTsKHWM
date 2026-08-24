import jsPDF from 'jspdf'
import QRCode from 'qrcode'

export type StaffCardData = {
  nama: string
  jabatan: string
  email: string
  password: string
}

/**
 * Generate QR Code sebagai data URL (PNG base64)
 */
async function generateQRDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 200,
    margin: 1,
    color: {
      dark: '#1e3a5f',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  })
}

/**
 * Generate PDF berisi kartu akses untuk satu atau lebih staff.
 * Layout: 2 kartu per halaman A4, ukuran kartu ~A6 (148 x 105mm)
 */
export async function generateAccessCardPDF(
  staffList: StaffCardData[],
  loginUrl?: string
) {
  const url = loginUrl || window.location.origin + '/login'

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // A4: 210 x 297mm
  // Kartu: 190 x 120mm dengan margin 10mm di tiap sisi, 2 per halaman
  const cardW = 190
  const cardH = 128
  const marginX = 10
  const gapY = 8
  const cardPositions = [
    { x: marginX, y: 10 },
    { x: marginX, y: 10 + cardH + gapY },
  ]

  // Warna
  const navy = [30, 58, 95] as [number, number, number]
  const gold = [212, 175, 55] as [number, number, number]
  const white = [255, 255, 255] as [number, number, number]
  const lightGray = [245, 247, 250] as [number, number, number]
  const darkText = [30, 30, 30] as [number, number, number]
  const grayText = [100, 110, 120] as [number, number, number]

  for (let i = 0; i < staffList.length; i++) {
    const staff = staffList[i]
    const posIndex = i % 2

    // Tambah halaman baru (kecuali halaman pertama)
    if (i > 0 && posIndex === 0) {
      doc.addPage()
    }

    const { x, y } = cardPositions[posIndex]

    // ── Background kartu ──
    doc.setFillColor(...lightGray)
    doc.roundedRect(x, y, cardW, cardH, 4, 4, 'F')

    // ── Header bar (navy) ──
    doc.setFillColor(...navy)
    doc.roundedRect(x, y, cardW, 28, 4, 4, 'F')
    // Fix sudut bawah kiri kanan header (override rounded jadi square)
    doc.setFillColor(...navy)
    doc.rect(x, y + 22, cardW, 6, 'F')

    // ── Garis aksen gold di bawah header ──
    doc.setFillColor(...gold)
    doc.rect(x, y + 27, cardW, 1.5, 'F')

    // ── Teks header ──
    doc.setTextColor(...white)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('MTs Khairul Wathon Manggala', x + cardW / 2, y + 11, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('KARTU AKSES SISTEM MONITORING KINERJA TU', x + cardW / 2, y + 19, { align: 'center' })

    // ── Area konten ──
    const contentY = y + 34
    const qrSize = 52
    const qrX = x + cardW - qrSize - 12
    const qrY = contentY

    // QR Code placeholder (akan diganti data URL)
    // Buat QR Code
    try {
      const qrDataUrl = await generateQRDataURL(url)
      // Background putih QR
      doc.setFillColor(...white)
      doc.roundedRect(qrX - 3, qrY - 3, qrSize + 6, qrSize + 6 + 10, 2, 2, 'F')
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)
      // Label di bawah QR
      doc.setTextColor(...grayText)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.text('Scan untuk Login', qrX + qrSize / 2, qrY + qrSize + 5, { align: 'center' })
    } catch {
      // Fallback jika QR gagal
      doc.setFillColor(...white)
      doc.rect(qrX, qrY, qrSize, qrSize, 'F')
      doc.setTextColor(...grayText)
      doc.setFontSize(6)
      doc.text('QR Error', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' })
    }

    // ── Info staff ──
    const infoX = x + 12
    let infoY = contentY + 4

    // Nama
    doc.setTextColor(...navy)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    const namaLines = doc.splitTextToSize(staff.nama, qrX - infoX - 6)
    doc.text(namaLines, infoX, infoY)
    infoY += namaLines.length * 7 + 2

    // Jabatan
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...grayText)
    const jabatanText = staff.jabatan || 'Staff TU'
    doc.text(jabatanText, infoX, infoY)
    infoY += 10

    // Separator
    doc.setDrawColor(...gold)
    doc.setLineWidth(0.8)
    doc.line(infoX, infoY, qrX - 6, infoY)
    infoY += 6

    // Label + value rows
    const drawField = (label: string, value: string, cy: number) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...grayText)
      doc.text(label, infoX, cy)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...darkText)
      const valLines = doc.splitTextToSize(value, qrX - infoX - 6)
      doc.text(valLines, infoX, cy + 5)
      return cy + 5 + valLines.length * 5 + 3
    }

    infoY = drawField('Email Login', staff.email, infoY)
    infoY = drawField('Password', staff.password, infoY)

    // ── Footer ──
    const footerY = y + cardH - 8
    doc.setFillColor(...navy)
    doc.rect(x, footerY, cardW, 8, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...white)
    doc.text(
      `Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}  •  ${url}`,
      x + cardW / 2,
      footerY + 5,
      { align: 'center' }
    )

    // ── Border kartu ──
    doc.setDrawColor(...navy)
    doc.setLineWidth(0.5)
    doc.roundedRect(x, y, cardW, cardH, 4, 4, 'S')
  }

  // Download
  const filename =
    staffList.length === 1
      ? `kartu_akses_${staffList[0].nama.replace(/\s+/g, '_').toLowerCase()}.pdf`
      : `kartu_akses_semua_staff_${staffList.length}orang.pdf`

  doc.save(filename)
}
