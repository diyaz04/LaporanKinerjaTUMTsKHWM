import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import type { ReportBatch } from '../../types/database'

export default function StaffHistory() {
  const { session } = useAuth()
  const [batches, setBatches] = useState<ReportBatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchHistory()
    }
  }, [session])

  const fetchHistory = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('report_batches')
      .select('*')
      .eq('user_id', session!.user.id)
      .in('status', ['pending_verifikasi', 'approved'])
      .order('created_at', { ascending: false })
    
    if (data) setBatches(data as ReportBatch[])
    setLoading(false)
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending_verifikasi': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1"/> Menunggu</Badge>
      case 'approved': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle className="w-3 h-3 mr-1"/> Disetujui</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  if (loading) return <div>Memuat riwayat...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold">Riwayat Laporan</h2>
        <p className="text-gray-500">Laporan tugas yang sudah disubmit atau disetujui.</p>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">Belum ada riwayat laporan yang disubmit.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {batches.map(batch => (
            <Card key={batch.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg capitalize flex items-center gap-2">
                    {batch.periode === 'harian' ? <Clock className="w-5 h-5 text-gray-400" /> : <Calendar className="w-5 h-5 text-gray-400" />}
                    {batch.periode}
                  </CardTitle>
                  <p className="mt-1 font-mono text-sm text-gray-500">{batch.periode_key}</p>
                </div>
                {getStatusBadge(batch.status)}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600">
                  <p>Disubmit: {batch.submitted_at ? new Date(batch.submitted_at).toLocaleDateString('id-ID') : '-'}</p>
                  {batch.status === 'approved' && (
                    <p>Disetujui: {batch.verified_at ? new Date(batch.verified_at).toLocaleDateString('id-ID') : '-'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
