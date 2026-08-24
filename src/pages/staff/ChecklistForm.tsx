import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import type { ReportBatch, TaskTemplate, TaskCategory } from '../../types/database'

type TemplateWithCategory = TaskTemplate & {
  task_categories: TaskCategory
}

export default function ChecklistForm() {
  const { id } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  
  const [batch, setBatch] = useState<ReportBatch | null>(null)
  const [templates, setTemplates] = useState<TemplateWithCategory[]>([])
  
  // Local state for answers: { template_id: { status: 'Ya'|'Tdk', catatan: '' } }
  const [answers, setAnswers] = useState<Record<string, { status: string; catatan: string; id?: string }>>({})
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session && id) {
      loadData()
    }
  }, [session, id])

  const loadData = async () => {
    if (!session || !id) return
    setLoading(true)

    // 1. Fetch batch
    const { data: batchData } = await supabase
      .from('report_batches')
      .select('*')
      .eq('id', id)
      .single()
    
    if (!batchData) {
      navigate('/staff')
      return
    }
    setBatch(batchData as ReportBatch)

    // 2. Fetch staff assignments
    const { data: assignments } = await supabase
      .from('staff_assignments')
      .select('task_category_id')
      .eq('user_id', session.user.id)
    
    const assignedCategoryIds = assignments?.map(a => a.task_category_id) || []

    // 3. Fetch task templates for this period AND assigned categories
    if (assignedCategoryIds.length > 0) {
      const { data: tpls } = await supabase
        .from('task_templates')
        .select('*, task_categories(*)')
        .eq('periode', batchData.periode)
        .in('category_id', assignedCategoryIds)
        .order('urutan_tampil')
      
      if (tpls) setTemplates(tpls as TemplateWithCategory[])

      // 4. Fetch existing submissions for this batch
      const { data: subs } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('report_batch_id', id)

      const initialAnswers: typeof answers = {}
      subs?.forEach(sub => {
        if (sub.template_id) {
          initialAnswers[sub.template_id] = {
            id: sub.id,
            status: sub.status || '',
            catatan: sub.catatan || ''
          }
        }
      })
      setAnswers(initialAnswers)
    }

    setLoading(false)
  }

  const handleAnswerChange = (templateId: string, field: 'status' | 'catatan', value: string) => {
    setAnswers(prev => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        [field]: value
      }
    }))
  }

  const saveAnswers = async (submit: boolean) => {
    if (!id || !batch) return
    setSaving(true)

    try {
      const inserts: any[] = []
      const updates: any[] = []

      templates.forEach(tpl => {
        const ans = answers[tpl.id]
        const payload = {
          report_batch_id: id,
          template_id: tpl.id,
          status: ans?.status || null,
          catatan: ans?.catatan || null
        }
        if (ans?.id) {
          updates.push({ ...payload, id: ans.id })
        } else {
          inserts.push(payload)
        }
      })
      
      if (inserts.length > 0) {
        const { error: err1 } = await supabase.from('task_submissions').insert(inserts)
        if (err1) throw err1
      }
      
      if (updates.length > 0) {
        const { error: err2 } = await supabase.from('task_submissions').upsert(updates)
        if (err2) throw err2
      }

      if (submit) {
        await supabase
          .from('report_batches')
          .update({ 
            status: 'pending_verifikasi',
            submitted_at: new Date().toISOString()
          })
          .eq('id', id)
        
        navigate('/staff')
      } else {
        // Just reload to get new IDs
        loadData()
        alert('Draft berhasil disimpan!')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan saat menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Memuat form checklist...</div>
  if (!batch) return null

  // Group templates by category
  const groupedTemplates = templates.reduce((acc, tpl) => {
    const catName = tpl.task_categories.nama_bidang
    if (!acc[catName]) acc[catName] = []
    acc[catName].push(tpl)
    return acc
  }, {} as Record<string, TemplateWithCategory[]>)

  const isReadonly = batch.status === 'pending_verifikasi' || batch.status === 'approved'

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/staff')}><ArrowLeft className="w-5 h-5"/></Button>
        <div>
          <h2 className="text-2xl font-bold capitalize">Laporan {batch.periode}</h2>
          <p className="text-gray-500 font-mono text-sm">{batch.periode_key}</p>
        </div>
      </div>

      {batch.status === 'revisi' && batch.catatan_verifikasi && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start space-x-3 text-red-800">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold">Perlu Revisi</h4>
            <p className="text-sm mt-1">{batch.catatan_verifikasi}</p>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-gray-500">Tidak ada rincian tugas untuk bidang Anda pada periode ini.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([catName, tpls]) => (
            <Card key={catName}>
              <CardHeader className="bg-slate-50 border-b pb-3 pt-4">
                <CardTitle className="text-lg text-emerald-800">{catName}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {tpls.map(tpl => (
                  <div key={tpl.id} className="p-4 space-y-4">
                    <p className="text-sm font-medium leading-relaxed">{tpl.deskripsi_tugas}</p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="sm:w-1/4 shrink-0">
                        <Label className="mb-2 block text-xs text-gray-500 uppercase tracking-wider">Status Pelaksanaan</Label>
                        <RadioGroup 
                          value={answers[tpl.id]?.status || ''} 
                          onValueChange={(val) => handleAnswerChange(tpl.id, 'status', val)}
                          disabled={isReadonly}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Ya" id={`ya-${tpl.id}`} />
                            <Label htmlFor={`ya-${tpl.id}`} className="font-normal">Ya</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Tdk" id={`tdk-${tpl.id}`} />
                            <Label htmlFor={`tdk-${tpl.id}`} className="font-normal">Tdk</Label>
                          </div>
                        </RadioGroup>
                      </div>
                      
                      <div className="flex-1">
                        <Label className="mb-2 block text-xs text-gray-500 uppercase tracking-wider">Catatan Tambahan / Bukti</Label>
                        <Textarea 
                          value={answers[tpl.id]?.catatan || ''}
                          onChange={(e) => handleAnswerChange(tpl.id, 'catatan', e.target.value)}
                          disabled={isReadonly}
                          placeholder={isReadonly ? '-' : "Opsional: isi link drive foto bukti atau keterangan kendala"}
                          className="resize-none bg-white"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {!isReadonly && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button type="button" variant="outline" className="flex-1" onClick={() => saveAnswers(false)} disabled={saving}>
                Simpan Draft
              </Button>
              <Button type="button" className="flex-1" onClick={() => saveAnswers(true)} disabled={saving}>
                Submit untuk Verifikasi
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
