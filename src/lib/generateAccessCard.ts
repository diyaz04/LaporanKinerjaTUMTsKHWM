import jsPDF from 'jspdf'
import QRCode from 'qrcode'

export type StaffCardData = {
  nama: string
  jabatan: string
  email: string
  password: string
}

async function generateQRDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 200,
    margin: 1,
    color: { dark: '#1a3a5c', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  })
}

/**
 * Fetch logo dari /logo.png dan return sebagai base64 data URL.
 * Return null jika gagal agar kop tetap tampil tanpa logo.
 */
async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/logo.png')
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Generate PDF format surat resmi kop madrasah.
 * 1 halaman A4 per orang.
 */
export async function generateAccessCardPDF(
  staffList: StaffCardData[],
  loginUrl?: string
) {
  const url = loginUrl || window.location.origin + '/login'

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // ── Palet warna ──
  const navy     = [26,  58,  92]  as [number, number, number]
  const green    = [21, 128,  61]  as [number, number, number]
  const darkText = [20,  20,  20]  as [number, number, number]
  const grayText = [100, 110, 120] as [number, number, number]
  const white    = [255, 255, 255] as [number, number, number]
  const lightBg  = [248, 250, 252] as [number, number, number]
  const borderGray = [220, 224, 228] as [number, number, number]

  const pageW = 210
  const pageH = 297
  const mL = 20  // margin kiri
  const mR = 20  // margin kanan
  const contentW = pageW - mL - mR // 170mm

  const tanggal = new Date().toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  })

  // Fetch logo sekali untuk semua halaman
  const logoBase64 = await fetchLogoBase64()
  const logoSize = 22 // mm — ukuran logo di kop

  for (let i = 0; i < staffList.length; i++) {
    const staff = staffList[i]
    if (i > 0) doc.addPage()

    // ═══════════════════════════════════════════════════
    // KOP SURAT
    // ═══════════════════════════════════════════════════

    // Garis atas kop (navy tebal)
    doc.setFillColor(...navy)
    doc.rect(0, 0, pageW, 4, 'F')

    // Garis tipis hijau di bawah navy
    doc.setFillColor(...green)
    doc.rect(0, 4, pageW, 1.5, 'F')

    // Logo madrasah — kiri
    const logoX = mL
    const logoY = 7
    if (logoBase64) {
      // Lingkaran putih sebagai background logo agar terlihat di semua background
      doc.setFillColor(...white)
      doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1, 'F')
      doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize)
    }

    // Nama madrasah — tengah (sisakan ruang untuk logo di kiri)
    const textCenterX = logoBase64 ? (mL + logoSize + pageW - mR) / 2 : pageW / 2
    let kopY = 15
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...navy)
    doc.text('MTs KH A WAHAB MUHSIN', textCenterX, kopY, { align: 'center' })

    kopY += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...grayText)
    doc.text(
      'Ds. Sukarapih, Kec. Sukarame, Kab. Tasikmalaya 46461',
      textCenterX, kopY, { align: 'center' }
    )

    // Garis pemisah kop — double line style
    kopY += 5
    doc.setDrawColor(...navy)
    doc.setLineWidth(1.2)
    doc.line(mL, kopY, pageW - mR, kopY)
    doc.setLineWidth(0.3)
    doc.setDrawColor(...green)
    doc.line(mL, kopY + 1.8, pageW - mR, kopY + 1.8)

    // ═══════════════════════════════════════════════════
    // JUDUL SURAT
    // ═══════════════════════════════════════════════════
    let curY = kopY + 14

    // Badge judul
    const judulText = 'SURAT KETERANGAN AKSES SISTEM'
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    const judulW = doc.getTextWidth(judulText)
    const badgeX = (pageW - judulW - 16) / 2
    const badgeY = curY - 5.5
    doc.setFillColor(...navy)
    doc.roundedRect(badgeX, badgeY, judulW + 16, 9, 2, 2, 'F')
    doc.setTextColor(...white)
    doc.text(judulText, pageW / 2, curY, { align: 'center' })

    curY += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...grayText)
    doc.text('Monitoring Kinerja Karyawan MTsU', pageW / 2, curY, { align: 'center' })

    // ═══════════════════════════════════════════════════
    // NOMOR & TANGGAL
    // ═══════════════════════════════════════════════════
    curY += 10
    doc.setDrawColor(...borderGray)
    doc.setLineWidth(0.3)
    doc.line(mL, curY, pageW - mR, curY)
    curY += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...grayText)
    doc.text(`Tanggal : ${tanggal}`, mL, curY)
    doc.text(`No. Dok : SKA/${new Date().getFullYear()}/${String(i + 1).padStart(3, '0')}`, pageW - mR, curY, { align: 'right' })

    curY += 4
    doc.setLineWidth(0.3)
    doc.line(mL, curY, pageW - mR, curY)

    // ═══════════════════════════════════════════════════
    // PEMBUKA
    // ═══════════════════════════════════════════════════
    curY += 10
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...darkText)
    const pembukaText = 'Yang bertanda tangan di bawah ini, Kepala MTs Khairul Wathon Manggala, memberikan akses sistem monitoring kinerja karyawan kepada:'
    const pembukaLines = doc.splitTextToSize(pembukaText, contentW)
    doc.text(pembukaLines, mL, curY)
    curY += pembukaLines.length * 5 + 4

    // ═══════════════════════════════════════════════════
    // BIODATA KARYAWAN (kotak info)
    // ═══════════════════════════════════════════════════
    const boxX = mL
    const boxW = contentW * 0.58   // ~98mm — kotak biodata
    const qrAreaW = contentW - boxW - 6  // sisa untuk QR
    const boxStartY = curY

    // Baris biodata
    const fields = [
      { label: 'Nama Lengkap', value: staff.nama },
      { label: 'Jabatan', value: staff.jabatan || 'Karyawan' },
    ]

    let bioY = curY
    for (const f of fields) {
      // label
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...grayText)
      doc.text(f.label, boxX, bioY)
      // titik dua
      doc.text(':', boxX + 36, bioY)
      // value
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...darkText)
      const valLines = doc.splitTextToSize(f.value, boxW - 42)
      doc.text(valLines, boxX + 40, bioY)
      bioY += valLines.length * 5.5 + 2
    }

    const boxEndY = bioY

    // ═══════════════════════════════════════════════════
    // KOTAK KREDENSIAL LOGIN (menonjol)
    // ═══════════════════════════════════════════════════
    curY = boxEndY + 8

    // Header kotak kredensial
    const credBoxH = 46
    doc.setFillColor(...navy)
    doc.roundedRect(boxX, curY, boxW + qrAreaW + 6, 8.5, 2, 2, 'F')
    doc.setFillColor(...navy)
    doc.rect(boxX, curY + 6, boxW + qrAreaW + 6, 2.5, 'F') // tutup rounded bawah
    doc.setTextColor(...white)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('🔐  INFORMASI LOGIN SISTEM', boxX + 6, curY + 5.8)

    const credBodyY = curY + 8.5
    // Body kotak
    doc.setFillColor(...lightBg)
    doc.rect(boxX, credBodyY, boxW + qrAreaW + 6, credBoxH - 8.5, 'F')
    // Border full box
    doc.setDrawColor(...navy)
    doc.setLineWidth(0.5)
    doc.roundedRect(boxX, curY, boxW + qrAreaW + 6, credBoxH, 2, 2, 'S')

    // Email
    let credY = credBodyY + 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...grayText)
    doc.text('Email / Username', boxX + 6, credY)

    credY += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...navy)
    doc.text(staff.email || '-', boxX + 6, credY)

    // Garis pemisah
    credY += 5
    doc.setDrawColor(...borderGray)
    doc.setLineWidth(0.2)
    doc.line(boxX + 6, credY, boxX + boxW + qrAreaW, credY)

    // Password
    credY += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...grayText)
    doc.text('Password', boxX + 6, credY)

    credY += 5
    // Password box (pill style)
    const passBoxW = Math.min(doc.getTextWidth(staff.password) * 1.4 + 12, boxW + qrAreaW - 10)
    doc.setFillColor(...navy)
    doc.roundedRect(boxX + 6, credY - 4.5, passBoxW, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...white)
    doc.text(staff.password, boxX + 12, credY + 0.5)

    curY = credBodyY + credBoxH - 8.5 + 10

    // ═══════════════════════════════════════════════════
    // QR CODE (kanan, sejajar dengan biodata & kredensial)
    // ═══════════════════════════════════════════════════
    const qrX = mL + boxW + 8
    const qrSize = 45
    const qrStartY = boxStartY - 4

    try {
      const qrDataUrl = await generateQRDataURL(url)
      // Background putih dengan border
      doc.setFillColor(...white)
      doc.setDrawColor(...borderGray)
      doc.setLineWidth(0.4)
      doc.roundedRect(qrX - 3, qrStartY - 3, qrSize + 6, qrSize + 16, 2, 2, 'FD')

      doc.addImage(qrDataUrl, 'PNG', qrX, qrStartY, qrSize, qrSize)

      // Label di bawah QR
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...navy)
      doc.text('SCAN UNTUK LOGIN', qrX + qrSize / 2, qrStartY + qrSize + 5, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(...grayText)
      const shortUrl = url.replace(/^https?:\/\//, '')
      doc.text(shortUrl, qrX + qrSize / 2, qrStartY + qrSize + 9.5, { align: 'center' })
    } catch {
      doc.setFillColor(...lightBg)
      doc.roundedRect(qrX - 3, qrStartY - 3, qrSize + 6, qrSize + 16, 2, 2, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...grayText)
      doc.text('QR Code', qrX + qrSize / 2, qrStartY + qrSize / 2, { align: 'center' })
    }

    // ═══════════════════════════════════════════════════
    // CATATAN KEAMANAN
    // ═══════════════════════════════════════════════════
    curY += 4
    doc.setFillColor(254, 249, 195) // kuning muda
    doc.setDrawColor(234, 179, 8)
    doc.setLineWidth(0.3)
    doc.roundedRect(mL, curY, contentW, 16, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(113, 63, 18) // cokelat tua
    doc.text('⚠  HARAP DIPERHATIKAN', mL + 5, curY + 5.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(133, 77, 14)
    const noteText = 'Jaga kerahasiaan akun ini. Jangan berikan email dan password kepada pihak lain. Ganti password segera setelah login pertama kali melalui menu Profil.'
    const noteLines = doc.splitTextToSize(noteText, contentW - 10)
    doc.text(noteLines, mL + 5, curY + 10.5)

    curY += 22

    // ═══════════════════════════════════════════════════
    // AREA TANDA TANGAN
    // ═══════════════════════════════════════════════════
    curY += 6

    // Kolom kiri: Penerima
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...grayText)
    doc.text('Penerima Akses,', mL, curY)

    // Kolom kanan: Kepala Madrasah
    doc.text(`Manggala, ${tanggal}`, pageW - mR, curY, { align: 'right' })
    doc.text('Kepala MTs Khairul Wathon Manggala,', pageW - mR, curY + 5, { align: 'right' })

    // Garis TTD kiri
    const ttdY = curY + 28
    doc.setDrawColor(...borderGray)
    doc.setLineWidth(0.4)
    doc.line(mL, ttdY, mL + 60, ttdY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...darkText)
    doc.text(staff.nama, mL, ttdY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...grayText)
    doc.text(staff.jabatan || 'Karyawan', mL, ttdY + 10)

    // Garis TTD kanan
    doc.setDrawColor(...borderGray)
    doc.setLineWidth(0.4)
    doc.line(pageW - mR - 70, ttdY, pageW - mR, ttdY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...darkText)
    doc.text('_________________________', pageW - mR - 70, ttdY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...grayText)
    doc.text('NIP. ................................', pageW - mR - 70, ttdY + 10)

    // ═══════════════════════════════════════════════════
    // FOOTER HALAMAN
    // ═══════════════════════════════════════════════════
    // Garis footer
    doc.setDrawColor(...borderGray)
    doc.setLineWidth(0.3)
    doc.line(mL, pageH - 14, pageW - mR, pageH - 14)

    // Garis tebal bawah
    doc.setFillColor(...navy)
    doc.rect(0, pageH - 4, pageW, 4, 'F')
    doc.setFillColor(...green)
    doc.rect(0, pageH - 5.5, pageW, 1.5, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...grayText)
    doc.text(
      `Dokumen ini dicetak secara otomatis oleh Sistem Monitoring Kinerja Karyawan MTsU  •  ${url}`,
      pageW / 2, pageH - 8, { align: 'center' }
    )
  }

  const filename =
    staffList.length === 1
      ? `surat_akses_${staffList[0].nama.replace(/\s+/g, '_').toLowerCase()}.pdf`
      : `surat_akses_karyawan_${staffList.length}orang.pdf`

  doc.save(filename)
}
