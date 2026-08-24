import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import type { ReportBatch, Profile } from '../../types/database'

type BatchWithProfile = ReportBatch & {
  profiles: Profile
}

export default function VerificationManager() {
  const [batches, setBatches] = useState<BatchWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBatches()
  }, [])

  const fetchBatches = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('report_batches')
      .select('*, profiles!report_batches_user_id_fkey(*)')
      .in('status', ['pending_verifikasi', 'approved', 'revisi'])
      .order('submitted_at', { ascending: false }) // sort newest first
    
    if (error) console.error('Fetch Batches Error:', error)
    if (data) setBatches(data as BatchWithProfile[])
    setLoading(false)
  }

  const pendingBatches = batches.filter(b => b.status === 'pending_verifikasi')
  const approvedBatches = batches.filter(b => b.status === 'approved')
  const revisiBatches = batches.filter(b => b.status === 'revisi')

  const renderTable = (batchList: BatchWithProfile[], emptyMessage: string) => (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Staff</TableHead>
            <TableHead>Periode</TableHead>
            <TableHead>Keterangan Waktu</TableHead>
            <TableHead>Waktu Submit / Verifikasi</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batchList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500 py-6">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            batchList.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell className="font-medium">{batch.profiles?.nama || 'Unknown'}</TableCell>
                <TableCell className="capitalize">{batch.periode}</TableCell>
                <TableCell className="font-mono text-sm">{batch.periode_key}</TableCell>
                <TableCell>
                  {batch.status === 'approved' && batch.verified_at
                    ? new Date(batch.verified_at).toLocaleString('id-ID')
                    : batch.submitted_at 
                      ? new Date(batch.submitted_at).toLocaleString('id-ID') 
                      : '-'}
                </TableCell>
                <TableCell>
                  {batch.status === 'pending_verifikasi' && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Menunggu</Badge>}
                  {batch.status === 'approved' && <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Disetujui</Badge>}
                  {batch.status === 'revisi' && <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">Revisi</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Link to={`/admin/verify/${batch.id}`}>
                    <Button size="sm" variant={batch.status === 'pending_verifikasi' ? 'default' : 'outline'}>
                      {batch.status === 'pending_verifikasi' ? 'Periksa' : 'Lihat Detail'}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-2xl font-bold">Verifikasi Laporan</h2>
      </div>

      {loading ? (
        <div>Memuat data...</div>
      ) : (
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Antrian Verifikasi 
              {pendingBatches.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">{pendingBatches.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="approved">Sudah Diverifikasi</TabsTrigger>
            <TabsTrigger value="revisi">Revisi</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            {renderTable(pendingBatches, "Tidak ada laporan yang menunggu verifikasi saat ini.")}
          </TabsContent>
          <TabsContent value="approved">
            {renderTable(approvedBatches, "Belum ada laporan yang disetujui.")}
          </TabsContent>
          <TabsContent value="revisi">
            {renderTable(revisiBatches, "Tidak ada laporan yang sedang direvisi.")}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
