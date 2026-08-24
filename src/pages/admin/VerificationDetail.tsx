import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import type { ReportBatch, TaskSubmission, TaskTemplate, TaskCategory, Profile } from '../../types/database'

type BatchDetail = ReportBatch & { profiles: Profile }
type SubmissionDetail = TaskSubmission & { 
  task_templates: TaskTemplate & { task_categories: TaskCategory } 
}

export default function VerificationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  
  const [batch, setBatch] = useState<BatchDetail | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([])
  const [catatanVerifikasi, setCatatanVerifikasi] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    const { data: bData } = await supabase
      .from('report_batches')
      .select('*, profiles!report_batches_user_id_fkey(*)')
      .eq('id', id)
      .single()
    
    if (bData) setBatch(bData as BatchDetail)

    const { data: sData } = await supabase
      .from('task_submissions')
      .select('*, task_templates(*, task_categories(*))')
      .eq('report_batch_id', id)
      .order('template_id') // we ideally order by urutan_tampil but nested ordering is tricky

    if (sData) setSubmissions(sData as SubmissionDetail[])
    
    setLoading(false)
  }

  const handleVerdict = async (verdict: 'approved' | 'revisi') => {
    if (!id || !session) return
    if (verdict === 'revisi' && !catatanVerifikasi.trim()) {
      alert('Catatan verifikasi wajib diisi jika meminta revisi.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        status: verdict,
        verified_by: session.user.id,
        verified_at: new Date().toISOString(),
        catatan_verifikasi: catatanVerifikasi
      }
      
      const { error } = await supabase.from('report_batches').update(payload).eq('id', id)
      if (error) throw error
      
      navigate('/admin/verify')
    } catch (err) {
      console.error(err)
      alert('Gagal menyimpan hasil verifikasi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Memuat detail...</div>
  if (!batch) return <div>Laporan tidak ditemukan.</div>

  // Group by category
  const groupedSubs = submissions.reduce((acc, sub) => {
    const catName = sub.task_templates?.task_categories?.nama_bidang || 'Lainnya'
    if (!acc[catName]) acc[catName] = []
    acc[catName].push(sub)
    return acc
  }, {} as Record<string, SubmissionDetail[]>)

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center space-x-4 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/verify')}><ArrowLeft className="w-5 h-5"/></Button>
        <div>
          <h2 className="text-2xl font-bold capitalize">Verifikasi {batch.periode}</h2>
          <p className="text-gray-500">
            {batch.profiles?.nama} • {batch.periode_key}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedSubs).map(([catName, subs]) => (
          <Card key={catName}>
            <CardHeader className="bg-slate-50 border-b pb-3 pt-4">
              <CardTitle className="text-lg text-emerald-800">{catName}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {subs.map(sub => (
                <div key={sub.id} className="p-4 space-y-2">
                  <p className="text-sm font-medium leading-relaxed">{sub.task_templates?.deskripsi_tugas}</p>
                  <div className="flex flex-col sm:flex-row gap-4 bg-gray-50 p-3 rounded border">
                    <div className="shrink-0 w-24">
                      <Label className="text-xs text-gray-500 block mb-1">Status</Label>
                      <span className={`font-semibold ${sub.status === 'Ya' ? 'text-green-600' : sub.status === 'Tdk' ? 'text-red-600' : 'text-gray-400'}`}>
                        {sub.status || 'Kosong'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-gray-500 block mb-1">Catatan / Bukti</Label>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{sub.catatan || '-'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {batch.status === 'pending_verifikasi' && (
          <Card className="border-emerald-200">
            <CardHeader className="bg-emerald-50">
              <CardTitle className="text-emerald-800">Tindakan Verifikasi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Catatan Verifikator (Wajib jika Revisi)</Label>
                <Textarea 
                  value={catatanVerifikasi}
                  onChange={e => setCatatanVerifikasi(e.target.value)}
                  placeholder="Beri catatan untuk staff..."
                  rows={3}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  type="button" 
                  variant="destructive" 
                  className="flex-1" 
                  onClick={() => handleVerdict('revisi')} 
                  disabled={submitting}
                >
                  <XCircle className="w-4 h-4 mr-2" /> Minta Revisi
                </Button>
                <Button 
                  type="button" 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  onClick={() => handleVerdict('approved')} 
                  disabled={submitting}
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> Setujui Laporan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
