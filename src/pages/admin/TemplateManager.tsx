import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Badge } from '../../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { Edit2, Trash2, Plus, Users } from 'lucide-react'
import type { TaskCategory, TaskTemplate, Profile } from '../../types/database'

const PERIODES = ['harian', 'mingguan', 'bulanan', 'periodik', 'berkala', 'insidentil'] as const

type AssignmentMap = Record<string, string[]> // category_id -> user_id[]

export default function TemplateManager() {
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [staffList, setStaffList] = useState<Profile[]>([])
  const [assignments, setAssignments] = useState<AssignmentMap>({})
  const [loading, setLoading] = useState(true)

  // Dialog States for Category
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [catId, setCatId] = useState<string | null>(null)
  const [catNama, setCatNama] = useState('')
  const [catUrut, setCatUrut] = useState<number>(0)

  // Dialog States for Template
  const [tplDialogOpen, setTplDialogOpen] = useState(false)
  const [tplId, setTplId] = useState<string | null>(null)
  const [tplCategory, setTplCategory] = useState<string>('')
  const [tplPeriode, setTplPeriode] = useState<string>('harian')
  const [tplDeskripsi, setTplDeskripsi] = useState('')
  const [tplUrut, setTplUrut] = useState<number>(0)

  // Dialog States for Staff Assignment
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignCategoryId, setAssignCategoryId] = useState<string>('')
  const [assignCategoryName, setAssignCategoryName] = useState<string>('')
  const [assignSelected, setAssignSelected] = useState<Set<string>>(new Set())
  const [assignSaving, setAssignSaving] = useState(false)

  const [activeTab, setActiveTab] = useState('harian')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [catRes, tplRes, staffRes, assignRes] = await Promise.all([
      supabase.from('task_categories').select('*').order('nomor_urut'),
      supabase.from('task_templates').select('*').order('urutan_tampil'),
      supabase.from('profiles').select('*').eq('role', 'staff').order('nama'),
      supabase.from('staff_assignments').select('user_id, task_category_id'),
    ])
    if (catRes.data) setCategories(catRes.data)
    if (tplRes.data) setTemplates(tplRes.data)
    if (staffRes.data) setStaffList(staffRes.data)

    // Build assignment map: category_id -> [user_id, ...]
    if (assignRes.data) {
      const map: AssignmentMap = {}
      for (const row of assignRes.data) {
        if (!map[row.task_category_id]) map[row.task_category_id] = []
        map[row.task_category_id].push(row.user_id)
      }
      setAssignments(map)
    }
    setLoading(false)
  }

  // --- Category CRUD ---
  const openCatDialog = (cat?: TaskCategory) => {
    if (cat) {
      setCatId(cat.id)
      setCatNama(cat.nama_bidang)
      setCatUrut(cat.nomor_urut || 0)
    } else {
      setCatId(null)
      setCatNama('')
      setCatUrut(categories.length + 1)
    }
    setCatDialogOpen(true)
  }

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (catId) {
      await supabase.from('task_categories').update({ nama_bidang: catNama, nomor_urut: catUrut }).eq('id', catId)
    } else {
      await supabase.from('task_categories').insert({ nama_bidang: catNama, nomor_urut: catUrut })
    }
    setCatDialogOpen(false)
    fetchData()
  }

  const deleteCategory = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus bidang ini? Semua tugas di dalamnya juga akan terhapus.')) {
      await supabase.from('task_categories').delete().eq('id', id)
      fetchData()
    }
  }

  // --- Template CRUD ---
  const openTplDialog = (periode: string, tpl?: TaskTemplate) => {
    if (tpl) {
      setTplId(tpl.id)
      setTplCategory(tpl.category_id)
      setTplPeriode(tpl.periode)
      setTplDeskripsi(tpl.deskripsi_tugas)
      setTplUrut(tpl.urutan_tampil || 0)
    } else {
      setTplId(null)
      setTplCategory(categories.length > 0 ? categories[0].id : '')
      setTplPeriode(periode)
      setTplDeskripsi('')
      const currentCount = templates.filter(t => t.periode === periode).length
      setTplUrut(currentCount + 1)
    }
    setTplDialogOpen(true)
  }

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      category_id: tplCategory,
      periode: tplPeriode,
      deskripsi_tugas: tplDeskripsi,
      urutan_tampil: tplUrut
    }
    if (tplId) {
      await supabase.from('task_templates').update(payload).eq('id', tplId)
    } else {
      await supabase.from('task_templates').insert(payload)
    }
    setTplDialogOpen(false)
    fetchData()
  }

  const deleteTemplate = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus tugas ini?')) {
      await supabase.from('task_templates').delete().eq('id', id)
      fetchData()
    }
  }

  // --- Staff Assignment ---
  const openAssignDialog = (cat: TaskCategory) => {
    setAssignCategoryId(cat.id)
    setAssignCategoryName(cat.nama_bidang)
    const currentAssigned = assignments[cat.id] || []
    setAssignSelected(new Set(currentAssigned))
    setAssignDialogOpen(true)
  }

  const toggleStaff = (userId: string) => {
    setAssignSelected(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const saveAssignments = async () => {
    if (!assignCategoryId) return
    setAssignSaving(true)

    // Delete all existing assignments for this category
    await supabase.from('staff_assignments').delete().eq('task_category_id', assignCategoryId)

    // Re-insert the selected ones
    if (assignSelected.size > 0) {
      const rows = Array.from(assignSelected).map(userId => ({
        user_id: userId,
        task_category_id: assignCategoryId,
      }))
      await supabase.from('staff_assignments').insert(rows)
    }

    setAssignSaving(false)
    setAssignDialogOpen(false)
    fetchData()
  }

  if (loading) return <div>Loading data...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b pb-4">
        <h2 className="text-2xl font-bold">Kelola Template Tugas</h2>
        <Button variant="outline" onClick={() => openCatDialog()}>+ Kelola Bidang / Kategori</Button>
      </div>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catId ? 'Edit Bidang' : 'Tambah Bidang Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveCategory} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Bidang</Label>
              <Input value={catNama} onChange={(e) => setCatNama(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Nomor Urut</Label>
              <Input type="number" value={catUrut} onChange={(e) => setCatUrut(parseInt(e.target.value))} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCatDialogOpen(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
          
          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">Daftar Bidang Saat Ini</h4>
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {categories.map(cat => (
                <li key={cat.id} className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm">
                  <span>{cat.nomor_urut}. {cat.nama_bidang}</span>
                  <div className="flex space-x-2">
                    <button type="button" onClick={() => openCatDialog(cat)} className="text-blue-500"><Edit2 className="w-4 h-4"/></button>
                    <button type="button" onClick={() => deleteCategory(cat.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tplId ? 'Edit Tugas' : 'Tambah Tugas Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label>Bidang / Kategori</Label>
              <Select value={tplCategory} onValueChange={setTplCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Bidang" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nama_bidang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi Tugas</Label>
              <Textarea 
                value={tplDeskripsi} 
                onChange={(e) => setTplDeskripsi(e.target.value)} 
                required 
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label>Urutan Tampil</Label>
              <Input type="number" value={tplUrut} onChange={(e) => setTplUrut(parseInt(e.target.value))} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setTplDialogOpen(false)}>Batal</Button>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Staff Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atur Petugas — {assignCategoryName}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            Centang staff yang bertugas di bidang ini. Perubahan akan langsung berlaku di dashboard staff.
          </p>

          {staffList.length === 0 ? (
            <p className="text-center text-gray-400 py-4">Belum ada staff terdaftar.</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto py-2">
              {staffList.map(staff => {
                const checked = assignSelected.has(staff.id)
                return (
                  <li
                    key={staff.id}
                    onClick={() => toggleStaff(staff.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none
                      ${checked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:bg-slate-50'}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                      ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}
                    >
                      {checked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{staff.nama}</p>
                      <p className="text-xs text-gray-400">{staff.jabatan || 'Staff TU'}</p>
                    </div>
                    {checked && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Ditugaskan</Badge>}
                  </li>
                )
              })}
            </ul>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => setAssignDialogOpen(false)}>Batal</Button>
            <Button
              type="button"
              onClick={saveAssignments}
              disabled={assignSaving}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              {assignSaving ? 'Menyimpan...' : 'Simpan Penugasan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto">
          {PERIODES.map(p => (
            <TabsTrigger key={p} value={p} className="capitalize">{p}</TabsTrigger>
          ))}
        </TabsList>

        {PERIODES.map(periode => {
          const pTemplates = templates.filter(t => t.periode === periode)
          
          return (
            <TabsContent key={periode} value={periode} className="mt-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold capitalize">Tugas {periode}</h3>
                <Button size="sm" onClick={() => openTplDialog(periode)}>
                  <Plus className="w-4 h-4 mr-1" /> Tambah Tugas
                </Button>
              </div>

              {pTemplates.length === 0 ? (
                <div className="text-center text-gray-500 py-8 bg-white rounded-lg border">
                  Belum ada tugas untuk periode ini.
                </div>
              ) : (
                <div className="space-y-6">
                  {categories.map(cat => {
                    const catTemplates = pTemplates.filter(t => t.category_id === cat.id)
                    if (catTemplates.length === 0) return null

                    const assignedStaff = (assignments[cat.id] || [])
                      .map(uid => staffList.find(s => s.id === uid))
                      .filter(Boolean) as Profile[]

                    return (
                      <div key={cat.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                        {/* Category header with assign button */}
                        <div className="bg-slate-50 px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex-1">
                            <span className="font-semibold text-slate-800">{cat.nama_bidang}</span>
                            <span className="ml-2 text-xs text-gray-400">{catTemplates.length} tugas</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Assigned staff badges */}
                            {assignedStaff.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {assignedStaff.map(s => (
                                  <Badge key={s.id} variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                                    {s.nama.split(' ')[0]}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Belum ada petugas</span>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAssignDialog(cat)}
                              className="h-7 px-2 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            >
                              <Users className="w-3 h-3 mr-1" />
                              Atur Petugas
                            </Button>
                          </div>
                        </div>

                        <ul className="divide-y">
                          {catTemplates.map(t => (
                            <li key={t.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <p className="text-sm text-gray-800 whitespace-pre-wrap">{t.deskripsi_tugas}</p>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <Button variant="ghost" size="sm" onClick={() => openTplDialog(periode, t)} className="h-8 px-2 text-blue-600">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)} className="h-8 px-2 text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
