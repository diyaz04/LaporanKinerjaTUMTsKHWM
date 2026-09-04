import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { generatePDF, type PrintData } from '../../lib/pdfGenerator'
import type { Profile, ReportBatch } from '../../types/database'
import { FileText, Download, Sparkles, Eye } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function KomiteDashboard() {
  const { profile } = useAuth()
  const [staffList, setStaffList] = useState<Profile[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  
  const [batches, setBatches] = useState<ReportBatch[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<PrintData | null>(null)

  // Extract unique months from batches
  const availableMonths = [...new Set(batches.map(b => b.created_at.substring(0, 7)))].sort().reverse()

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    if (selectedStaff) fetchBatches(selectedStaff)
    else {
      setBatches([])
      setSelectedMonth('')
      setPreviewData(null)
    }
  }, [selectedStaff])

  const fetchStaff = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'staff').order('nama')
    if (data) setStaffList(data as Profile[])
  }

  const fetchBatches = async (userId: string) => {
    const { data } = await supabase
      .from('report_batches')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    
    if (data) setBatches(data as ReportBatch[])
    setSelectedMonth('')
    setPreviewData(null)
  }

  const handleFetchPreview = async () => {
    if (!selectedStaff || !selectedMonth) return
    
    setLoading(true)
    setPreviewData(null)
    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', selectedStaff).single()
      if (!profileData) throw new Error("Staff tidak ditemukan")

      const monthBatches = batches.filter(b => b.created_at.startsWith(selectedMonth))
      const batchIds = monthBatches.map(b => b.id)
      
      const { data: submissionsData } = await supabase
        .from('task_submissions')
        .select('*, task_templates(*, task_categories(*))')
        .in('report_batch_id', batchIds)
        
      if (submissionsData) {
        const calcPct = (subs: any[]) => {
          if (subs.length === 0) return 0
          const yaCount = subs.filter(s => s.status === 'Ya').length
          return Math.round((yaCount / subs.length) * 100)
        }
        // Combine submissions and add date context
        const combinedSubmissions = submissionsData.map(sub => {
          const parentBatch = monthBatches.find(b => b.id === sub.report_batch_id)
          return {
            ...sub,
            catatan: `[${parentBatch?.periode_key}] ${sub.catatan || ''}`
          }
        }) as PrintData['submissions']
        
        // Sort grouped by category logic could be done here, but we will rely on UI or just sort by category name
        combinedSubmissions.sort((a, b) => {
          const catA = a.task_templates?.task_categories?.nama_bidang || ''
          const catB = b.task_templates?.task_categories?.nama_bidang || ''
          return catA.localeCompare(catB)
        })
        
        // Combine tugas_lainnya
        const allTugasLainnya = monthBatches
          .filter(b => b.tugas_lainnya)
          .map(b => `[${b.periode_key}] ${b.tugas_lainnya}`)
          .join('\n\n')

        const dummyBatch: ReportBatch = {
          id: 'gabungan',
          user_id: selectedStaff,
          periode: 'Gabungan Bulanan',
          periode_key: selectedMonth,
          status: 'approved',
          verified_by: null,
          verified_at: null,
          catatan_verifikasi: null,
          submitted_at: null,
          created_at: selectedMonth,
          tugas_lainnya: allTugasLainnya || null
        }

        const printData: PrintData = {
          batch: dummyBatch,
          profile: profileData as Profile,
          submissions: combinedSubmissions,
          statistics: {
            harian: calcPct(combinedSubmissions.filter(s => s.task_templates?.periode === 'harian')),
            mingguan: calcPct(combinedSubmissions.filter(s => s.task_templates?.periode === 'mingguan')),
            bulanan: calcPct(combinedSubmissions.filter(s => s.task_templates?.periode === 'bulanan'))
          }
        }
        
        setPreviewData(printData)
      }
    } catch (err) {
      console.error(err)
      alert('Gagal menampilkan pratinjau data laporan')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = () => {
    if (previewData) {
      generatePDF(previewData, 'replika')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Greeting Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-700 via-orange-600 to-amber-500 p-8 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-10">
          <Sparkles className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl font-extrabold mb-2">Selamat datang, {profile?.nama}! 👋</h2>
          <p className="text-orange-100 text-lg">
            Sebagai Ketua Komite, Anda dapat memantau dan mengunduh laporan rekapitulasi kinerja bulanan dari seluruh karyawan.
          </p>
        </div>
      </div>

      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-600" />
          Laporan Kinerja Karyawan (Bulanan)
        </h2>
        <p className="text-gray-500 mt-1">Lihat dan unduh laporan hasil kinerja karyawan per bulan.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <Card className="md:col-span-1 sticky top-6">
          <CardHeader>
            <CardTitle>Filter Laporan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>1. Pilih Karyawan</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Pilih Karyawan --" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>2. Pilih Bulan</Label>
              <Select value={selectedMonth} onValueChange={(val) => { setSelectedMonth(val); setPreviewData(null) }} disabled={!selectedStaff || availableMonths.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!selectedStaff ? "Pilih karyawan dulu" : availableMonths.length === 0 ? "Tidak ada laporan disetujui" : "-- Pilih Bulan --"} />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map(m => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full" 
              disabled={!selectedMonth || loading} 
              onClick={handleFetchPreview}
            >
              <Eye className="w-4 h-4 mr-2" />
              {loading ? 'Memuat Data...' : 'Tampilkan Data'}
            </Button>
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          {previewData ? (
            <Card className="shadow-md border-t-4 border-t-emerald-500">
              <CardHeader className="flex flex-row items-start justify-between bg-emerald-50/50 pb-6 border-b">
                <div>
                  <CardTitle className="text-xl">Preview Laporan - {previewData.profile.nama}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Periode: {previewData.batch.periode_key} | Jabatan: {previewData.profile.jabatan || '-'}
                  </p>
                </div>
                <Button onClick={handleDownloadPDF} className="bg-emerald-600 hover:bg-emerald-700">
                  <Download className="w-4 h-4 mr-2" />
                  Cetak PDF
                </Button>
              </CardHeader>
              
              {previewData.statistics && (
                <div className="bg-white px-6 py-4 border-b flex gap-6 text-sm">
                  <div className="font-semibold text-gray-700">Keaktifan Laporan (Selesai):</div>
                  <div className="flex gap-4">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">Harian: {previewData.statistics.harian}%</span>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">Mingguan: {previewData.statistics.mingguan}%</span>
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">Bulanan: {previewData.statistics.bulanan}%</span>
                  </div>
                </div>
              )}

              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader className="bg-gray-100 sticky top-0 shadow-sm z-10">
                      <TableRow>
                        <TableHead className="w-12 text-center">No</TableHead>
                        <TableHead>Bidang / Urusan</TableHead>
                        <TableHead>Rincian Tugas</TableHead>
                        <TableHead className="w-24 text-center">Status</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.submissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                            Tidak ada data rincian tugas untuk bulan ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        previewData.submissions.map((sub, idx) => (
                          <TableRow key={sub.id || idx}>
                            <TableCell className="text-center">{idx + 1}</TableCell>
                            <TableCell className="font-medium text-gray-700">
                              {sub.task_templates?.task_categories?.nama_bidang || 'Lainnya'}
                            </TableCell>
                            <TableCell>{sub.task_templates?.deskripsi_tugas}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs px-2 py-1 rounded-full border ${sub.status === 'Ya' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'}`}>
                                {sub.status || '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm whitespace-pre-wrap">
                              <div>{sub.catatan || '-'}</div>
                              {sub.admin_note && (
                                <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded">
                                  <strong>Catatan Admin:</strong> {sub.admin_note}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {previewData.batch.tugas_lainnya && (
                        <TableRow>
                          <TableCell className="text-center">{previewData.submissions.length + 1}</TableCell>
                          <TableCell className="font-medium text-gray-700">Tugas Tambahan</TableCell>
                          <TableCell className="whitespace-pre-wrap">{previewData.batch.tugas_lainnya}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs px-2 py-1 rounded-full border bg-green-100 text-green-700 border-green-200">
                              Ya
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">-</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-400">
              <FileText className="w-12 h-12 mb-3 text-gray-300" />
              <p>Pilih Karyawan dan Bulan lalu klik "Tampilkan Data" untuk melihat preview.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
