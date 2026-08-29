import { useState, useEffect, useRef } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { Edit2, Trash2, Plus, Users, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import type { TaskCategory, TaskTemplate, Profile } from '../../types/database'
import { downloadTemplateExcel, parseTemplateExcel } from '../../lib/templateExcelImport'
import type { TemplateImportRow } from '../../lib/templateExcelImport'

const PERIODES = ['harian', 'mingguan', 'bulanan', 'periodik', 'berkala', 'insidentil'] as const

const PERIODE_COLORS: Record<string, string> = {
  harian: 'bg-blue-50 text-blue-700',
  mingguan: 'bg-purple-50 text-purple-700',
  bulanan: 'bg-orange-50 text-orange-700',
  periodik: 'bg-rose-50 text-rose-700',
  berkala: 'bg-yellow-50 text-yellow-700',
  insidentil: 'bg-red-50 text-red-700',
}

type AssignmentMap = Record<string, string[]> // category_id -> user_id[]

type ImportResult = {
  rowIndex: number
  nama_bidang: string
  periode: string
  deskripsi_pendek: string
  success: boolean
  error?: string
}

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

  // ── Import Excel states ──
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importPhase, setImportPhase] = useState<'upload' | 'preview' | 'processing' | 'done'>('upload')
  const [importRows, setImportRows] = useState<TemplateImportRow[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importError, setImportError] = useState('')
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setCatId(cat.id); setCatNama(cat.nama_bidang); setCatUrut(cat.nomor_urut || 0)
    } else {
      setCatId(null); setCatNama(''); setCatUrut(categories.length + 1)
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
      setTplId(tpl.id); setTplCategory(tpl.category_id); setTplPeriode(tpl.periode)
      setTplDeskripsi(tpl.deskripsi_tugas); setTplUrut(tpl.urutan_tampil || 0)
    } else {
      setTplId(null); setTplCategory(categories.length > 0 ? categories[0].id : '')
      setTplPeriode(periode); setTplDeskripsi('')
      setTplUrut(templates.filter(t => t.periode === periode).length + 1)
    }
    setTplDialogOpen(true)
  }

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { category_id: tplCategory, periode: tplPeriode, deskripsi_tugas: tplDeskripsi, urutan_tampil: tplUrut }
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
    setAssignCategoryId(cat.id); setAssignCategoryName(cat.nama_bidang)
    setAssignSelected(new Set(assignments[cat.id] || []))
    setAssignDialogOpen(true)
  }

  const toggleStaff = (userId: string) => {
    setAssignSelected(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const saveAssignments = async () => {
    if (!assignCategoryId) return
    setAssignSaving(true)
    await supabase.from('staff_assignments').delete().eq('task_category_id', assignCategoryId)
    if (assignSelected.size > 0) {
      await supabase.from('staff_assignments').insert(
        Array.from(assignSelected).map(userId => ({ user_id: userId, task_category_id: assignCategoryId }))
      )
    }
    setAssignSaving(false)
    setAssignDialogOpen(false)
    fetchData()
  }

  // ── Import Excel handlers ──
  const openImportDialog = () => {
    setImportPhase('upload'); setImportRows([]); setImportFileName('')
    setImportError(''); setImportResults([]); setImportProgress(0); setImportTotal(0)
    setImportDialogOpen(true)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    try {
      const rows = await parseTemplateExcel(file)
      if (rows.length === 0) throw new Error('File Excel kosong atau tidak ada data.')
      setImportRows(rows)
      setImportFileName(file.name)
      setImportPhase('preview')
    } catch (err: any) {
      setImportError(err.message)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleProcessImport = async () => {
    const validRows = importRows.filter(r => r._valid)
    if (validRows.length === 0) return

    setImportPhase('processing')
    setImportProgress(0)
    setImportTotal(validRows.length)
    setImportResults([])

    // Ambil kategori terkini (fresh dari DB untuk dapat ID yang benar)
    const { data: freshCats } = await supabase.from('task_categories').select('*').order('nomor_urut')
    const catMap = new Map<string, string>() // nama_bidang (lower) -> id
    let maxUrut = 0
    for (const c of (freshCats || [])) {
      catMap.set(c.nama_bidang.toLowerCase().trim(), c.id)
      if ((c.nomor_urut || 0) > maxUrut) maxUrut = c.nomor_urut || 0
    }

    const results: ImportResult[] = []

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      try {
        // Resolve atau buat kategori
        const namaBidangKey = row.nama_bidang.toLowerCase().trim()
        let resolvedCatId: string = catMap.get(namaBidangKey) ?? ''

        if (!resolvedCatId) {
          maxUrut += 1
          const { data: newCat, error: catErr } = await supabase
            .from('task_categories')
            .insert({ nama_bidang: row.nama_bidang.trim(), nomor_urut: maxUrut })
            .select()
            .single()

          if (catErr || !newCat) throw new Error(catErr?.message || 'Gagal membuat bidang baru')
          resolvedCatId = newCat.id
          catMap.set(namaBidangKey, resolvedCatId)
        }

        // Insert template tugas
        const { error: tplErr } = await supabase.from('task_templates').insert({
          category_id: resolvedCatId,
          periode: row.periode,
          deskripsi_tugas: row.deskripsi_tugas,
          urutan_tampil: row.urutan_tampil || 0,
        })

        if (tplErr) throw new Error(tplErr.message)

        results.push({
          rowIndex: row._rowIndex,
          nama_bidang: row.nama_bidang,
          periode: row.periode,
          deskripsi_pendek: row.deskripsi_tugas.slice(0, 60) + (row.deskripsi_tugas.length > 60 ? '…' : ''),
          success: true,
        })
      } catch (err: any) {
        results.push({
          rowIndex: row._rowIndex,
          nama_bidang: row.nama_bidang,
          periode: row.periode,
          deskripsi_pendek: row.deskripsi_tugas.slice(0, 60) + (row.deskripsi_tugas.length > 60 ? '…' : ''),
          success: false,
          error: err.message,
        })
      }

      setImportProgress(i + 1)
    }

    setImportResults(results)
    setImportPhase('done')
    fetchData()
  }

  if (loading) return <div className="flex items-center gap-2 text-gray-500 p-4"><Loader2 className="w-4 h-4 animate-spin" /> Memuat data...</div>

  const validCount = importRows.filter(r => r._valid).length
  const invalidCount = importRows.filter(r => !r._valid).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b pb-4">
        <h2 className="text-2xl font-bold">Kelola Template Tugas</h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={openImportDialog}>
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </Button>
          <Button variant="outline" onClick={() => openCatDialog()}>
            + Kelola Bidang / Kategori
          </Button>
        </div>
      </div>

      {/* ════════════ Dialog: Import Excel ════════════ */}
      <Dialog open={importDialogOpen} onOpenChange={v => { if (!v && importPhase !== 'processing') setImportDialogOpen(false) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Import Template Tugas dari Excel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Download Template Banner */}
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg p-4 gap-3">
              <div>
                <p className="font-semibold text-emerald-800 text-sm">Download Template Excel dari Sistem</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Template berisi kolom: <code className="bg-emerald-100 px-1 rounded">nama_bidang</code>, <code className="bg-emerald-100 px-1 rounded">periode</code>, <code className="bg-emerald-100 px-1 rounded">deskripsi_tugas</code>, <code className="bg-emerald-100 px-1 rounded">urutan_tampil</code>. Tersedia contoh data & petunjuk.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplateExcel} className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                <Download className="w-4 h-4 mr-1.5" />
                Download Template
              </Button>
            </div>

            {importError && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{importError}</div>}

            {/* ── FASE: Upload ── */}
            {importPhase === 'upload' && (
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">Klik atau seret file Excel ke sini</p>
                <p className="text-sm text-gray-500 mt-1">Format: .xlsx — gunakan template yang sudah disediakan sistem</p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              </div>
            )}

            {/* ── FASE: Preview ── */}
            {importPhase === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-gray-800">{importFileName}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      <span className="text-green-600 font-semibold">{validCount} valid</span>
                      {invalidCount > 0 && <span className="text-red-600 font-semibold ml-2">{invalidCount} ada error</span>}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setImportPhase('upload'); setImportRows([]) }}>
                    Ganti File
                  </Button>
                </div>

                {invalidCount > 0 && (
                  <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Baris yang tidak valid akan <strong>dilewati</strong>. Hanya {validCount} baris valid yang akan diimport.</span>
                  </div>
                )}

                <div className="border rounded-lg overflow-auto max-h-72">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Bidang</TableHead>
                        <TableHead>Periode</TableHead>
                        <TableHead>Deskripsi Tugas</TableHead>
                        <TableHead className="w-10">Urut</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.map((row, idx) => (
                        <TableRow key={idx} className={!row._valid ? 'bg-red-50' : ''}>
                          <TableCell className="text-gray-400 text-xs">{row._rowIndex}</TableCell>
                          <TableCell className="font-medium text-sm max-w-[140px] truncate">{row.nama_bidang || <span className="text-red-500 italic text-xs">kosong</span>}</TableCell>
                          <TableCell>
                            {row.periode
                              ? <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PERIODE_COLORS[row.periode] || 'bg-gray-100 text-gray-600'}`}>{row.periode}</span>
                              : <span className="text-red-500 italic text-xs">kosong</span>
                            }
                          </TableCell>
                          <TableCell className="text-xs text-gray-700 max-w-[280px]">
                            <span className="line-clamp-2">{row.deskripsi_tugas || <span className="text-red-500 italic">kosong</span>}</span>
                          </TableCell>
                          <TableCell className="text-center text-xs text-gray-500">{row.urutan_tampil}</TableCell>
                          <TableCell>
                            {row._valid
                              ? <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Valid</span>
                              : <span className="text-xs text-red-600 flex flex-col gap-0.5">{row._errors.map((e, i) => <span key={i} className="flex items-center gap-1"><XCircle className="w-3 h-3 shrink-0" />{e}</span>)}</span>
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Batal</Button>
                  <Button onClick={handleProcessImport} disabled={validCount === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Import {validCount} Tugas Valid
                  </Button>
                </div>
              </div>
            )}

            {/* ── FASE: Processing ── */}
            {importPhase === 'processing' && (
              <div className="space-y-5 py-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <p className="font-semibold text-gray-700">Sedang mengimport template tugas...</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: importTotal > 0 ? `${(importProgress / importTotal) * 100}%` : '0%' }}
                  />
                </div>
                <p className="text-sm text-gray-500 text-center">{importProgress} / {importTotal} tugas diproses</p>
              </div>
            )}

            {/* ── FASE: Done ── */}
            {importPhase === 'done' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{importResults.filter(r => r.success).length}</p>
                    <p className="text-sm text-green-700 mt-1">Berhasil diimport</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">{importResults.filter(r => !r.success).length}</p>
                    <p className="text-sm text-red-700 mt-1">Gagal</p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>#</TableHead>
                        <TableHead>Bidang</TableHead>
                        <TableHead>Periode</TableHead>
                        <TableHead>Deskripsi (pendek)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.map((r, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs text-gray-400">{r.rowIndex}</TableCell>
                          <TableCell className="text-sm font-medium">{r.nama_bidang}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PERIODE_COLORS[r.periode] || 'bg-gray-100 text-gray-600'}`}>{r.periode}</span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 max-w-[220px] truncate">{r.deskripsi_pendek}</TableCell>
                          <TableCell>
                            {r.success
                              ? <span className="flex items-center gap-1 text-green-600 text-xs font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Berhasil</span>
                              : <span className="flex items-center gap-1 text-red-600 text-xs"><XCircle className="w-3.5 h-3.5" /> {r.error}</span>
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {importResults.some(r => r.success) && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
                    ✅ Template tugas yang berhasil sudah langsung tersimpan dan bisa dilihat di tab periode masing-masing.
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => setImportDialogOpen(false)}>Selesai</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════ Dialog: Category ════════════ */}
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
                    <button type="button" onClick={() => openCatDialog(cat)} className="text-blue-500"><Edit2 className="w-4 h-4" /></button>
                    <button type="button" onClick={() => deleteCategory(cat.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════ Dialog: Template ════════════ */}
      <Dialog open={tplDialogOpen} onOpenChange={setTplDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tplId ? 'Edit Tugas' : 'Tambah Tugas Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveTemplate} className="space-y-4">
            <div className="space-y-2">
              <Label>Bidang / Kategori</Label>
              <Select value={tplCategory} onValueChange={setTplCategory} required>
                <SelectTrigger><SelectValue placeholder="Pilih Bidang" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.nama_bidang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deskripsi Tugas</Label>
              <Textarea value={tplDeskripsi} onChange={(e) => setTplDeskripsi(e.target.value)} required rows={4} className="resize-none" />
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

      {/* ════════════ Dialog: Staff Assignment ════════════ */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atur Petugas — {assignCategoryName}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            Centang karyawan yang bertugas di bidang ini. Perubahan akan langsung berlaku di dashboard karyawan.
          </p>

          {staffList.length === 0 ? (
            <p className="text-center text-gray-400 py-4">Belum ada karyawan terdaftar.</p>
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
                      ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                      {checked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{staff.nama}</p>
                      <p className="text-xs text-gray-400">{staff.jabatan || 'Karyawan'}</p>
                    </div>
                    {checked && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Ditugaskan</Badge>}
                  </li>
                )
              })}
            </ul>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => setAssignDialogOpen(false)}>Batal</Button>
            <Button type="button" onClick={saveAssignments} disabled={assignSaving}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
              {assignSaving ? 'Menyimpan...' : 'Simpan Penugasan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════ Tabs ════════════ */}
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
                <h3 className="text-lg font-semibold capitalize">Tugas {periode}
                  <span className="ml-2 text-sm font-normal text-gray-400">({pTemplates.length} tugas)</span>
                </h3>
                <Button size="sm" onClick={() => openTplDialog(periode)}>
                  <Plus className="w-4 h-4 mr-1" /> Tambah Tugas
                </Button>
              </div>

              {pTemplates.length === 0 ? (
                <div className="text-center text-gray-500 py-8 bg-white rounded-lg border">
                  Belum ada tugas untuk periode ini.
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={openImportDialog}>
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Import dari Excel
                    </Button>
                  </div>
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
                        <div className="bg-slate-50 px-4 py-3 border-b flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex-1">
                            <span className="font-semibold text-slate-800">{cat.nama_bidang}</span>
                            <span className="ml-2 text-xs text-gray-400">{catTemplates.length} tugas</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {assignedStaff.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {assignedStaff.map(s => (
                                  <Badge key={s.id} variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">{s.nama.split(' ')[0]}</Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Belum ada petugas</span>
                            )}
                            <Button size="sm" variant="outline" onClick={() => openAssignDialog(cat)}
                              className="h-7 px-2 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                              <Users className="w-3 h-3 mr-1" /> Atur Petugas
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
