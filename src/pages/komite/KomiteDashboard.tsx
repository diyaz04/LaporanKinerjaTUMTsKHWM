import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { generatePDF, type PrintData } from '../../lib/pdfGenerator'
import type { Profile, ReportBatch } from '../../types/database'
import { FileText, Download, Sparkles } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function KomiteDashboard() {
  const { profile } = useAuth()
  const [staffList, setStaffList] = useState<Profile[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  
  const [batches, setBatches] = useState<ReportBatch[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>('')

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
    setSelectedMonth('')
  }

  const handleDownload = async () => {
    if (!selectedStaff || !selectedMonth) return
    
    setLoading(true)
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

        const printData: PrintData = {
          batch: dummyBatch,
          profile: profileData as Profile,
          submissions: combinedSubmissions
        }
        
        // Komite gets Replika mode by default
        generatePDF(printData, 'replika')
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

      <Card>
        <CardHeader>
          <CardTitle>Pilih Karyawan & Bulan</CardTitle>
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
            <Label>2. Pilih Bulan (Laporan Disetujui)</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!selectedStaff || availableMonths.length === 0}>
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
            className="w-full bg-emerald-600 hover:bg-emerald-700" 
            disabled={!selectedMonth || loading} 
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            {loading ? 'Memproses...' : 'Unduh Laporan PDF'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
