import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Checkbox } from '../../components/ui/checkbox'
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
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [submittedTemplateIds, setSubmittedTemplateIds] = useState<string[]>([])
  const [tugasLainnya, setTugasLainnya] = useState('')
  
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
    setTugasLainnya((batchData as ReportBatch).tugas_lainnya || '')

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

      // 4. Fetch sibling batches to find already submitted tasks
      const { data: siblingBatches } = await supabase
        .from('report_batches')
        .select('id, status')
        .eq('user_id', session.user.id)
        .eq('periode', batchData.periode)
        .eq('periode_key', batchData.periode_key)

      const submittedBatchIds = siblingBatches
        ?.filter(b => b.id !== id && (b.status === 'pending_verifikasi' || b.status === 'approved'))
        .map(b => b.id) || []

      let alreadySubmittedIds: string[] = []
      if (submittedBatchIds.length > 0) {
        const { data: siblingSubs } = await supabase
          .from('task_submissions')
          .select('template_id')
          .in('report_batch_id', submittedBatchIds)
        
        alreadySubmittedIds = siblingSubs?.map(s => s.template_id).filter(Boolean) as string[] || []
        setSubmittedTemplateIds(alreadySubmittedIds)
      }

      // 5. Fetch existing submissions for this batch
      const { data: subs } = await supabase
        .from('task_submissions')
        .select('*')
        .eq('report_batch_id', id)

      const initialAnswers: typeof answers = {}
      const initialSelected: string[] = []
      subs?.forEach(sub => {
        if (sub.template_id) {
          initialSelected.push(sub.template_id)
          initialAnswers[sub.template_id] = {
            id: sub.id,
            status: sub.status || '',
            catatan: sub.catatan || ''
          }
        }
      })
      
      // Select all unsubmitted templates by default if creating a new draft
      if (subs?.length === 0) {
         tpls?.forEach(t => {
           if (!alreadySubmittedIds.includes(t.id)) {
             initialSelected.push(t.id)
           }
         })
      }
      
      setAnswers(initialAnswers)
      setSelectedTaskIds(initialSelected)
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
    
    if (submit && selectedTaskIds.length === 0 && !tugasLainnya.trim()) {
      alert('Pilih minimal 1 tugas atau isi Tugas Lainnya sebelum mensubmit laporan.')
      return
    }

    setSaving(true)

    try {
      const inserts: any[] = []
      const updates: any[] = []
      const idsToDelete: string[] = []

      templates.forEach(tpl => {
        const isSelected = selectedTaskIds.includes(tpl.id)
        const ans = answers[tpl.id]
        
        if (isSelected) {
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
        } else if (ans?.id) {
          idsToDelete.push(ans.id)
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

      if (idsToDelete.length > 0) {
        const { error: err3 } = await supabase.from('task_submissions').delete().in('id', idsToDelete)
        if (err3) throw err3
      }

      const batchUpdatePayload: any = { tugas_lainnya: tugasLainnya || null }
      if (submit) {
        batchUpdatePayload.status = 'pending_verifikasi'
        batchUpdatePayload.submitted_at = new Date().toISOString()
      }

      const { error: errBatch } = await supabase
        .from('report_batches')
        .update(batchUpdatePayload)
        .eq('id', id)
        
      if (errBatch) throw errBatch

      if (submit) {
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

      {templates.length === 0 && (
        <div className="text-center py-6 bg-white rounded-lg border mb-6">
          <p className="text-gray-500">Tidak ada rincian tugas untuk bidang Anda pada periode ini.</p>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(groupedTemplates).map(([catName, tpls]) => (
          <Card key={catName}>
            <CardHeader className="bg-slate-50 border-b pb-3 pt-4">
              <CardTitle className="text-lg text-emerald-800">{catName}</CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {tpls.map(tpl => {
                const isAlreadySubmitted = submittedTemplateIds.includes(tpl.id)
                const isSelected = selectedTaskIds.includes(tpl.id)
                
                const handleToggleSelect = (checked: boolean) => {
                  if (checked) setSelectedTaskIds(prev => [...prev, tpl.id])
                  else setSelectedTaskIds(prev => prev.filter(id => id !== tpl.id))
                }

                return (
                  <div key={tpl.id} className={`p-4 space-y-4 ${isAlreadySubmitted ? 'opacity-50 grayscale bg-gray-50' : isSelected ? 'bg-emerald-50/20' : ''}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={isAlreadySubmitted ? true : isSelected}
                        disabled={isAlreadySubmitted || isReadonly}
                        onCheckedChange={handleToggleSelect}
                        className="mt-1"
                        id={`check-${tpl.id}`}
                      />
                      <div className="flex-1">
                        <Label htmlFor={`check-${tpl.id}`} className={`text-sm font-medium leading-relaxed cursor-pointer ${isAlreadySubmitted ? 'text-gray-500' : 'text-gray-900'}`}>
                          {tpl.deskripsi_tugas}
                        </Label>
                        {isAlreadySubmitted && <p className="text-xs text-blue-600 mt-1 font-semibold">Tugas ini sudah dilaporkan pada draf/batch lain.</p>}
                      </div>
                    </div>
                  
                  <div className={`flex flex-col sm:flex-row sm:items-start gap-4 pl-7 ${(!isSelected && !isAlreadySubmitted) ? 'opacity-40 pointer-events-none' : ''}`}>
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
                )
              })}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="bg-slate-50 border-b pb-3 pt-4">
            <CardTitle className="text-lg text-emerald-800">Tugas Lainnya / Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Label className="mb-2 block text-sm text-gray-700">Deskripsikan tugas atau pekerjaan lain yang Anda kerjakan pada periode ini:</Label>
            <Textarea 
              value={tugasLainnya}
              onChange={(e) => setTugasLainnya(e.target.value)}
              disabled={isReadonly}
              placeholder={isReadonly ? '-' : "Tuliskan tugas tambahan atau pekerjaan lainnya di sini..."}
              className="resize-y bg-white min-h-[100px]"
            />
          </CardContent>
        </Card>

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
    </div>
  )
}
