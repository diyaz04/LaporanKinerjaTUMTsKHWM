import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { generatePDF, type PrintData } from '../../lib/pdfGenerator'
import { Download, Search } from 'lucide-react'
import type { ReportBatch, Profile } from '../../types/database'

type BatchWithProfile = ReportBatch & { profiles: Profile }

export default function SummaryRekap() {
  const [batches, setBatches] = useState<BatchWithProfile[]>([])
  const [filtered, setFiltered] = useState<BatchWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  const [searchName, setSearchName] = useState('')
  const [filterPeriode, setFilterPeriode] = useState('all')

  useEffect(() => {
    fetchBatches()
  }, [])

  useEffect(() => {
    let result = batches
    if (searchName) {
      result = result.filter(b => b.profiles.nama.toLowerCase().includes(searchName.toLowerCase()))
    }
    if (filterPeriode !== 'all') {
      result = result.filter(b => b.periode === filterPeriode)
    }
    setFiltered(result)
  }, [searchName, filterPeriode, batches])

  const fetchBatches = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('report_batches')
      .select('*, profiles!report_batches_user_id_fkey(*)')
      .eq('status', 'approved')
      .order('verified_at', { ascending: false })
    
    if (data) {
      setBatches(data as BatchWithProfile[])
    }
    setLoading(false)
  }

  const handleDownload = async (batch: BatchWithProfile) => {
    try {
      const { data: submissionsData } = await supabase
        .from('task_submissions')
        .select('*, task_templates(*, task_categories(*))')
        .eq('report_batch_id', batch.id)
        .order('template_id')

      if (submissionsData) {
        const printData: PrintData = {
          batch: batch as ReportBatch,
          profile: batch.profiles,
          submissions: submissionsData as PrintData['submissions']
        }
        // Default to replika for rekap list download
        generatePDF(printData, 'replika')
      }
    } catch (err) {
      console.error(err)
      alert('Gagal generate PDF')
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold">Rekapitulasi Laporan</h2>
        <p className="text-gray-500 mt-1">Riwayat seluruh laporan yang telah disetujui (Approved).</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Cari nama staff..." 
            className="pl-9" 
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={filterPeriode} onValueChange={setFilterPeriode}>
            <SelectTrigger>
              <SelectValue placeholder="Filter Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Periode</SelectItem>
              <SelectItem value="harian">Harian</SelectItem>
              <SelectItem value="mingguan">Mingguan</SelectItem>
              <SelectItem value="bulanan">Bulanan</SelectItem>
              <SelectItem value="periodik">Periodik</SelectItem>
              <SelectItem value="berkala">Berkala</SelectItem>
              <SelectItem value="insidentil">Insidentil</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div>Memuat data...</div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Staff</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Keterangan Waktu</TableHead>
                <TableHead>Disetujui Tanggal</TableHead>
                <TableHead className="text-right">Export</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                    Tidak ada data rekapitulasi.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.profiles?.nama || 'Unknown'}</TableCell>
                    <TableCell className="capitalize">{batch.periode}</TableCell>
                    <TableCell className="font-mono text-sm">{batch.periode_key}</TableCell>
                    <TableCell>
                      {batch.verified_at ? new Date(batch.verified_at).toLocaleDateString('id-ID') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleDownload(batch)} title="Download PDF Replika Asli">
                        <Download className="w-4 h-4 mr-2" /> PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
