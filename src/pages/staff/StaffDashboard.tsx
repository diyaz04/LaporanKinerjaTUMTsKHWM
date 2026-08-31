import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getTodayKey, getWeekKey } from '../../lib/dateUtils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Calendar, Clock, PlusCircle } from 'lucide-react'
import type { ReportBatch } from '../../types/database'

export default function StaffDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [batches, setBatches] = useState<ReportBatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      initDashboard()
    }
  }, [session])

  const initDashboard = async () => {
    if (!session) return
    setLoading(true)

    // Check existing batches
    const { data: existingBatches } = await supabase
      .from('report_batches')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    let currentBatches = (existingBatches || []) as ReportBatch[]

    // Determine required auto batches
    const todayKey = getTodayKey()
    const weekKey = getWeekKey()
    const autoPeriods = [
      { periode: 'harian', key: todayKey },
      { periode: 'mingguan', key: weekKey },
    ]

    let needsRefresh = false

    for (const ap of autoPeriods) {
      const exists = currentBatches.find(b => b.periode === ap.periode && b.periode_key === ap.key)
      if (!exists) {
        const { error } = await supabase
          .from('report_batches')
          .insert({
            user_id: session.user.id,
            periode: ap.periode,
            periode_key: ap.key,
            status: 'draft'
          })
        if (!error) needsRefresh = true
      }
    }

    if (needsRefresh) {
      const { data: refreshedBatches } = await supabase
        .from('report_batches')
        .select('*')
        .eq('user_id', session.user.id)
      if (refreshedBatches) currentBatches = refreshedBatches as ReportBatch[]
    }

    // Filter to ONLY show active current period batches, OR anything that needs revision
    const activeBatches = currentBatches.filter(b => {
      // Selalu munculkan jika butuh revisi (agar tidak terlewat oleh staf)
      if (b.status === 'revisi') return true

      // Harian: hanya hari ini
      if (b.periode === 'harian') return b.periode_key === todayKey

      // Mingguan: hanya minggu ini
      if (b.periode === 'mingguan') return b.periode_key === weekKey
      
      // Bulanan: hanya bulan ini
      if (b.periode === 'bulanan') return b.periode_key === new Date().toISOString().substring(0, 7)

      // Insidentil, periodik, dsb: munculkan jika belum disetujui (biar bisa diisi/dipantau)
      return b.status !== 'approved'
    })

    setBatches(activeBatches)
    setLoading(false)
  }

  const handleCreateInsidentil = async () => {
    if (!session) return
    const ts = Date.now().toString()
    const { data, error } = await supabase
      .from('report_batches')
      .insert({
        user_id: session.user.id,
        periode: 'insidentil',
        periode_key: `INS-${ts}`,
        status: 'draft'
      })
      .select()
      .single()
    
    if (data && !error) {
      navigate(`/staff/isi/${data.id}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'draft': return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Belum Diisi</Badge>
      case 'pending_verifikasi': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Menunggu Verifikasi</Badge>
      case 'revisi': return <Badge variant="destructive">Perlu Revisi</Badge>
      case 'approved': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Disetujui</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  if (loading) return <div>Memuat tugas...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold">Tugas Saya</h2>
        <p className="text-gray-500">Daftar laporan tugas yang perlu Anda isi dan lengkapi.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {batches.map(batch => {
          const isSubmitted = batch.status === 'pending_verifikasi' || batch.status === 'approved'

          return (
            <Card key={batch.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg capitalize flex items-center gap-2">
                      {batch.periode === 'harian' && <Clock className="w-5 h-5 text-blue-500" />}
                      {batch.periode === 'mingguan' && <Calendar className="w-5 h-5 text-purple-500" />}
                      {['bulanan', 'periodik', 'berkala'].includes(batch.periode) && <Calendar className="w-5 h-5 text-orange-500" />}
                      {batch.periode === 'insidentil' && <Clock className="w-5 h-5 text-red-500" />}
                      {batch.periode}
                    </CardTitle>
                    <CardDescription className="mt-1 font-mono text-xs">{batch.periode_key}</CardDescription>
                  </div>
                  {getStatusBadge(batch.status)}
                </div>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <Button className="w-full mt-2 bg-gray-300 text-gray-600 cursor-not-allowed hover:bg-gray-300" disabled>
                    Sudah Mengisi
                  </Button>
                ) : (
                  <Link to={`/staff/isi/${batch.id}`}>
                    <Button className="w-full mt-2" variant={batch.status === 'revisi' ? 'destructive' : 'default'}>
                      {batch.status === 'revisi' ? 'Perbaiki Laporan' : 'Isi Laporan'}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* Action Card for Insidentil */}
        <Card className="border-dashed border-2 bg-slate-50 flex flex-col justify-center items-center py-8 text-center hover:bg-slate-100 transition-colors">
          <Button variant="ghost" className="h-auto flex-col space-y-2 text-gray-600 hover:text-green-600 hover:bg-transparent" onClick={handleCreateInsidentil}>
            <PlusCircle className="w-10 h-10" />
            <span className="font-semibold">Buat Laporan Insidentil</span>
          </Button>
        </Card>
      </div>
    </div>
  )
}
