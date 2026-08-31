import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { getTodayKey, getWeekKey } from '../../lib/dateUtils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Search, RefreshCw } from 'lucide-react'
import type { Profile, ReportBatch } from '../../types/database'

export default function RekapPengisian() {
  const [staff, setStaff] = useState<Profile[]>([])
  const [batches, setBatches] = useState<ReportBatch[]>([])
  const [loading, setLoading] = useState(true)

  const [periode, setPeriode] = useState('harian')
  const [periodeKey, setPeriodeKey] = useState(getTodayKey())
  const [searchName, setSearchName] = useState('')

  useEffect(() => {
    // Update default periodeKey when periode changes
    if (periode === 'harian') setPeriodeKey(getTodayKey())
    else if (periode === 'mingguan') setPeriodeKey(getWeekKey())
    else if (periode === 'bulanan') setPeriodeKey(new Date().toISOString().substring(0, 7)) // YYYY-MM
  }, [periode])

  useEffect(() => {
    fetchData()
  }, [periode, periodeKey])

  const fetchData = async () => {
    setLoading(true)
    const [staffRes, batchRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'staff').order('nama'),
      supabase.from('report_batches').select('*').eq('periode', periode).eq('periode_key', periodeKey)
    ])

    if (staffRes.data) setStaff(staffRes.data)
    if (batchRes.data) setBatches(batchRes.data)
    setLoading(false)
  }

  const getStatus = (userId: string) => {
    const batch = batches.find(b => b.user_id === userId)
    if (!batch) return { label: 'Belum Mengisi', color: 'bg-red-100 text-red-800' }
    if (batch.status === 'draft') return { label: 'Belum Submit (Draft)', color: 'bg-orange-100 text-orange-800' }
    if (batch.status === 'pending_verifikasi') return { label: 'Sudah (Menunggu Verif)', color: 'bg-yellow-100 text-yellow-800' }
    if (batch.status === 'revisi') return { label: 'Perlu Revisi', color: 'bg-red-100 text-red-800' }
    if (batch.status === 'approved') return { label: 'Sudah (Disetujui)', color: 'bg-green-100 text-green-800' }
    return { label: batch.status, color: 'bg-gray-100 text-gray-800' }
  }

  const filteredStaff = staff.filter(s => s.nama.toLowerCase().includes(searchName.toLowerCase()))

  const sudahCount = staff.filter(s => {
    const b = batches.find(batch => batch.user_id === s.id)
    return b && (b.status === 'pending_verifikasi' || b.status === 'approved')
  }).length

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold">Rekap Pengisian Laporan</h2>
        <p className="text-gray-500 mt-1">Pantau siapa saja karyawan yang sudah atau belum mengisi laporan berdasarkan periode waktu tertentu.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium text-gray-700">Periode</label>
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="harian">Harian</SelectItem>
              <SelectItem value="mingguan">Mingguan</SelectItem>
              <SelectItem value="bulanan">Bulanan</SelectItem>
              <SelectItem value="periodik">Periodik</SelectItem>
              <SelectItem value="berkala">Berkala</SelectItem>
              <SelectItem value="insidentil">Insidentil</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium text-gray-700">Keterangan Waktu (Periode Key)</label>
          <Input 
            value={periodeKey} 
            onChange={e => setPeriodeKey(e.target.value)} 
            placeholder="Contoh: 2026-08-31" 
          />
        </div>
        <div className="flex items-end">
          <Button onClick={fetchData} className="w-full md:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" /> Segarkan Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-800">{staff.length}</div>
          <div className="text-sm text-gray-500">Total Karyawan</div>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{sudahCount}</div>
          <div className="text-sm text-green-600">Sudah Mengisi</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-red-700">{staff.length - sudahCount}</div>
          <div className="text-sm text-red-600">Belum Mengisi</div>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="Cari nama karyawan..." 
          className="pl-9 max-w-md" 
          value={searchName}
          onChange={e => setSearchName(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-500">Memuat data...</div>
      ) : (
        <div className="rounded-md border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Karyawan</TableHead>
                <TableHead>Jabatan / Posisi</TableHead>
                <TableHead>Status Pengisian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-gray-500 py-6">
                    Karyawan tidak ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map(s => {
                  const status = getStatus(s.id)
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nama}</TableCell>
                      <TableCell>{s.jabatan || s.tipe_karyawan || '-'}</TableCell>
                      <TableCell>
                        <Badge className={`${status.color} border-none`}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
