import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { getTodayKey } from '../../lib/dateUtils'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Input } from '../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { CheckCircle, Clock, AlertTriangle, Sparkles } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminDashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    totalStaff: 0,
    harianFilled: 0,
    harianPending: 0,
    totalPendingVerifikasi: 0
  })
  const [loading, setLoading] = useState(true)

  // Buka Periode states
  const [bukaPeriode, setBukaPeriode] = useState('bulanan')
  const [bukaKey, setBukaKey] = useState('')
  const [bukaLoading, setBukaLoading] = useState(false)
  const [bukaMsg, setBukaMsg] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    const todayKey = getTodayKey()

    // 1. Total staff
    const { count: totalStaff } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'staff')

    // 2. Today's harian report batches
    const { data: todayBatches } = await supabase
      .from('report_batches')
      .select('status')
      .eq('periode', 'harian')
      .eq('periode_key', todayKey)

    // 3. Total pending verifications (all periods)
    const { count: pendingCount } = await supabase
      .from('report_batches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_verifikasi')

    const filledCount = todayBatches?.filter(b => b.status === 'pending_verifikasi' || b.status === 'approved').length || 0
    const draftCount = todayBatches?.filter(b => b.status === 'draft' || b.status === 'revisi').length || 0

    setStats({
      totalStaff: totalStaff || 0,
      harianFilled: filledCount,
      harianPending: draftCount,
      totalPendingVerifikasi: pendingCount || 0
    })
    setLoading(false)
  }

  const handleBukaPeriode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bukaKey) return
    setBukaLoading(true)
    setBukaMsg('')

    try {
      // 1. Find categories that have templates for this period
      const { data: templates } = await supabase
        .from('task_templates')
        .select('category_id')
        .eq('periode', bukaPeriode)
      
      const catIds = [...new Set(templates?.map(t => t.category_id) || [])]
      
      if (catIds.length === 0) {
        throw new Error(`Tidak ada template tugas untuk periode ${bukaPeriode}.`)
      }

      // 2. Find staff that have assignments in these categories
      const { data: assignments } = await supabase
        .from('staff_assignments')
        .select('user_id')
        .in('task_category_id', catIds)
      
      const staffIds = [...new Set(assignments?.map(a => a.user_id) || [])]

      if (staffIds.length === 0) {
        throw new Error('Tidak ada staff yang ditugaskan pada kategori terkait.')
      }

      // 3. Insert report batches for these staff
      const inserts = staffIds.map(uid => ({
        user_id: uid,
        periode: bukaPeriode,
        periode_key: bukaKey,
        status: 'draft'
      }))

      // Use upsert to avoid duplicate key errors if already opened
      const { error } = await supabase
        .from('report_batches')
        .upsert(inserts, { onConflict: 'user_id, periode, periode_key', ignoreDuplicates: true })

      if (error) throw new Error(error.message)

      setBukaMsg(`Berhasil membuka periode untuk ${staffIds.length} staff.`)
      setBukaKey('')
    } catch (err: any) {
      setBukaMsg(err.message || 'Terjadi kesalahan.')
    } finally {
      setBukaLoading(false)
    }
  }

  if (loading) return <div>Memuat dashboard...</div>

  return (
    <div className="space-y-6">
      {/* Greeting Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-700 p-8 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-10">
          <Sparkles className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl font-extrabold mb-2">Selamat datang kembali, {profile?.nama}! 👋</h2>
          <p className="text-emerald-100 text-lg">
            Pantau dan kelola kinerja staf tata usaha dengan mudah hari ini. Jangan lupa periksa laporan yang menunggu verifikasi.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Laporan Harian (Hari Ini)</p>
              <h3 className="text-2xl font-bold">{stats.harianFilled} / {stats.totalStaff} <span className="text-sm font-normal text-gray-500">Submisi</span></h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Menunggu Verifikasi</p>
              <h3 className="text-2xl font-bold">{stats.totalPendingVerifikasi} <span className="text-sm font-normal text-gray-500">Laporan</span></h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-100">Aksi Cepat</p>
              <h3 className="text-xl font-bold mt-1">Verifikasi Tugas</h3>
            </div>
            <Link to="/admin/verify">
              <Button variant="secondary" className="bg-white text-emerald-700 hover:bg-green-50">
                <CheckCircle className="w-4 h-4 mr-2" /> Buka
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Buka Periode Section */}
      <Card>
        <CardHeader>
          <CardTitle>Buka Periode Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBukaPeriode} className="space-y-4 max-w-md">
            <p className="text-sm text-gray-500">
              Generate laporan tugas kosong (draft) untuk staff secara massal sesuai bagian yang relevan.
            </p>
            
            {bukaMsg && (
              <div className={`p-3 rounded text-sm ${bukaMsg.includes('Berhasil') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {bukaMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label>Pilih Jenis Periode</Label>
              <Select value={bukaPeriode} onValueChange={setBukaPeriode}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                  <SelectItem value="periodik">Periodik</SelectItem>
                  <SelectItem value="berkala">Berkala</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Nama / Kunci Periode</Label>
              <Input 
                placeholder="Contoh: Agustus 2026 atau Ganjil 2026" 
                value={bukaKey} 
                onChange={e => setBukaKey(e.target.value)} 
                required 
              />
            </div>
            
            <Button type="submit" disabled={bukaLoading || !bukaKey}>
              {bukaLoading ? 'Memproses...' : 'Buka Periode'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
