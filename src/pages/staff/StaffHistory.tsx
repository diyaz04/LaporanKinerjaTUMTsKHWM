import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Calendar, Clock, AlertTriangle, CheckCircle, Eye } from 'lucide-react'
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

  if (loading) return <div className="p-4">Memuat riwayat...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-bold">Riwayat Laporan</h2>
        <p className="text-gray-500">Daftar (List) laporan tugas yang sudah Anda kirimkan.</p>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">Belum ada riwayat laporan yang disubmit.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Periode</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Tgl Dikirim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map(batch => (
                <TableRow key={batch.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium capitalize whitespace-nowrap flex items-center gap-2">
                    {batch.periode === 'harian' ? <Clock className="w-4 h-4 text-gray-400" /> : <Calendar className="w-4 h-4 text-gray-400" />}
                    {batch.periode}
                  </TableCell>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{batch.periode_key}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {batch.submitted_at ? new Date(batch.submitted_at).toLocaleDateString('id-ID') : '-'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {getStatusBadge(batch.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/staff/isi/${batch.id}`}>
                      <Button variant="outline" size="sm" className="h-8">
                        <Eye className="w-4 h-4 mr-1.5" /> Detail
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
