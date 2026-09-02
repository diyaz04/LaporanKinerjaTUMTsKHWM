import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { generatePDF, type PrintData } from '../../lib/pdfGenerator'
import type { Profile, ReportBatch } from '../../types/database'
import { FileText, Download } from 'lucide-react'

export default function ReportGenerator() {
  const [staffList, setStaffList] = useState<Profile[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  
  const [batches, setBatches] = useState<ReportBatch[]>([])
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  
  const [reportMode, setReportMode] = useState<'tunggal' | 'gabungan'>('tunggal')
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  const [exportMode, setExportMode] = useState<'replika' | 'simpel'>('replika')
  const [loading, setLoading] = useState(false)

  // Extract unique months from batches
  const availableMonths = [...new Set(batches.map(b => b.created_at.substring(0, 7)))].sort().reverse()

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    if (selectedStaff) fetchBatches(selectedStaff)
    else {
      setBatches([])
      setSelectedBatch('')
      setSelectedMonth('')
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
    setSelectedBatch('')
    setSelectedMonth('')
  }

  const handleDownload = async () => {
    if (!selectedStaff) return
    if (reportMode === 'tunggal' && !selectedBatch) return
    if (reportMode === 'gabungan' && !selectedMonth) return
    
    setLoading(true)
    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', selectedStaff).single()
      if (!profileData) throw new Error("Staff tidak ditemukan")

      if (reportMode === 'tunggal') {
        const { data: batchData } = await supabase.from('report_batches').select('*').eq('id', selectedBatch).single()
        const { data: submissionsData } = await supabase
          .from('task_submissions')
          .select('*, task_templates(*, task_categories(*))')
          .eq('report_batch_id', selectedBatch)
          .order('template_id')

        if (batchData && submissionsData) {
          const printData: PrintData = {
            batch: batchData as ReportBatch,
            profile: profileData as Profile,
            submissions: submissionsData as PrintData['submissions']
          }
          generatePDF(printData, exportMode)
        }
      } else {
        // Gabungan Mode
        const monthBatches = batches.filter(b => b.created_at.startsWith(selectedMonth))
        const batchIds = monthBatches.map(b => b.id)
        
        const { data: submissionsData } = await supabase
          .from('task_submissions')
          .select('*, task_templates(*, task_categories(*))')
          .in('report_batch_id', batchIds)
          
        if (submissionsData) {
          // Combine submissions and add date context
          const combinedSubmissions = submissionsData.map(sub => {
            const parentBatch = monthBatches.find(b => b.id === sub.report_batch_id)
            return {
              ...sub,
              catatan: `[${parentBatch?.periode_key}] ${sub.catatan || ''}`
            }
          }) as PrintData['submissions']
          
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

          const calcPct = (subs: any[]) => {
            if (subs.length === 0) return 0
            const yaCount = subs.filter(s => s.status === 'Ya').length
            return Math.round((yaCount / subs.length) * 100)
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
          generatePDF(printData, exportMode)
        }
      }
    } catch (err) {
      console.error(err)
      alert('Gagal generate PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-emerald-600" />
          Generate Laporan PDF
        </h2>
        <p className="text-gray-500 mt-1">Buat file PDF dari laporan tugas staff yang sudah disetujui (Approved).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parameter Laporan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>1. Pilih Staff</Label>
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger>
                <SelectValue placeholder="-- Pilih Staff --" />
              </SelectTrigger>
              <SelectContent>
                {staffList.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>2. Mode Laporan</Label>
            <Select value={reportMode} onValueChange={(v: 'tunggal'|'gabungan') => setReportMode(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Mode Laporan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tunggal">Tunggal (Per Laporan)</SelectItem>
                <SelectItem value="gabungan">Gabungan Bulanan (Semua dalam 1 bulan)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportMode === 'tunggal' ? (
            <div className="space-y-2">
              <Label>3. Pilih Periode Laporan (Approved)</Label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch} disabled={!selectedStaff || batches.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!selectedStaff ? "Pilih staff dulu" : batches.length === 0 ? "Tidak ada laporan disetujui" : "-- Pilih Laporan --"} />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.periode.toUpperCase()} - {b.periode_key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>3. Pilih Bulan (Approved)</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!selectedStaff || availableMonths.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={!selectedStaff ? "Pilih staff dulu" : availableMonths.length === 0 ? "Tidak ada laporan disetujui" : "-- Pilih Bulan --"} />
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
          )}

          <div className="space-y-2">
            <Label>4. Mode Export</Label>
            <Select value={exportMode} onValueChange={(v: 'replika'|'simpel') => setExportMode(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="replika">Replika Asli (Kop Surat & TTD)</SelectItem>
                <SelectItem value="simpel">Digital Simpel (Ringkas)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700" 
            disabled={(reportMode === 'tunggal' && !selectedBatch) || (reportMode === 'gabungan' && !selectedMonth) || loading} 
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Memproses...' : 'Download PDF'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
