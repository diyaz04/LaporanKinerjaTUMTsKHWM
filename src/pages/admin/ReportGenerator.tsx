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

  const [exportMode, setExportMode] = useState<'replika' | 'simpel'>('replika')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStaff()
  }, [])

  useEffect(() => {
    if (selectedStaff) fetchBatches(selectedStaff)
    else {
      setBatches([])
      setSelectedBatch('')
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
  }

  const handleDownload = async () => {
    if (!selectedStaff || !selectedBatch) return
    setLoading(true)
    try {
      // Fetch full data for PDF
      const { data: batchData } = await supabase.from('report_batches').select('*').eq('id', selectedBatch).single()
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', selectedStaff).single()
      const { data: submissionsData } = await supabase
        .from('task_submissions')
        .select('*, task_templates(*, task_categories(*))')
        .eq('report_batch_id', selectedBatch)
        .order('template_id')

      if (batchData && profileData && submissionsData) {
        const printData: PrintData = {
          batch: batchData as ReportBatch,
          profile: profileData as Profile,
          submissions: submissionsData as PrintData['submissions']
        }
        generatePDF(printData, exportMode)
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
            <Label>2. Pilih Periode Laporan (Approved)</Label>
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

          <div className="space-y-2">
            <Label>3. Mode Export</Label>
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
            disabled={!selectedBatch || loading} 
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
