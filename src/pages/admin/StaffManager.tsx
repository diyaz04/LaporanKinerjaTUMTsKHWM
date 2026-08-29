import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Checkbox } from '../../components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2, CreditCard, Eye, EyeOff, FileText } from 'lucide-react'
import type { Profile, TaskCategory } from '../../types/database'
import { TIPE_KARYAWAN_OPTIONS } from '../../types/database'
import type { TipeKaryawan } from '../../types/database'
import { downloadExcelTemplate, parseExcelFile } from '../../lib/excelTemplate'
import type { StaffImportRow } from '../../lib/excelTemplate'
import { generateAccessCardPDF } from '../../lib/generateAccessCard'
import { generateJobdescPDF } from '../../lib/generateJobdesc'
type StaffWithAssignments = Profile & {
  staff_assignments: { task_categories: TaskCategory | null }[]
}

type ImportResult = {
  index: number
  nama: string
  email: string
  success: boolean
  error?: string
  userId?: string
}

const BADGE_COLORS: Record<string, string> = {
  'Staf TU': 'bg-blue-50 text-blue-700 border-blue-100',
  'Wakamad': 'bg-purple-50 text-purple-700 border-purple-100',
  'Laboran': 'bg-orange-50 text-orange-700 border-orange-100',
  'Guru': 'bg-teal-50 text-teal-700 border-teal-100',
  'Lainnya': 'bg-gray-50 text-gray-600 border-gray-200',
}

export default function StaffManager() {
  const [staffList, setStaffList] = useState<StaffWithAssignments[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipe, setFilterTipe] = useState<string>('all')

  // ── Dialog: Add / Edit Staff ──
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null)
  const [nama, setNama] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [tipeKaryawan, setTipeKaryawan] = useState<TipeKaryawan | ''>('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // ── Dialog: Import Excel ──
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<StaffImportRow[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [importPhase, setImportPhase] = useState<'upload' | 'preview' | 'processing' | 'done'>('upload')
  const [importError, setImportError] = useState('')
  const [postImportCards, setPostImportCards] = useState<{ nama: string; jabatan: string; email: string; password: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Dialog: Kartu Akses Individual ──
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false)
  const [cardStaff, setCardStaff] = useState<StaffWithAssignments | null>(null)
  const [cardEmail, setCardEmail] = useState('')
  const [cardPassword, setCardPassword] = useState('')
  const [showCardPassword, setShowCardPassword] = useState(false)
  const [isGeneratingCard, setIsGeneratingCard] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: catData } = await supabase.from('task_categories').select('*').order('nomor_urut')
    if (catData) setCategories(catData)

    const { data: staffData } = await supabase
      .from('profiles')
      .select(`*, staff_assignments(task_categories(*))`)
      .eq('role', 'staff')
    if (staffData) setStaffList(staffData as StaffWithAssignments[])
    setLoading(false)
  }

  // Filtered list
  const filteredList = filterTipe === 'all'
    ? staffList
    : staffList.filter(s => (s.tipe_karyawan || 'Lainnya') === filterTipe)

  // ── Add / Edit handlers ──
  const resetForm = () => {
    setNama(''); setJabatan(''); setTipeKaryawan(''); setEmail(''); setPassword('')
    setSelectedCategories([]); setErrorMsg('')
  }

  const openAddDialog = () => { resetForm(); setIsEditMode(false); setIsDialogOpen(true) }

  const openEditDialog = (staff: StaffWithAssignments) => {
    resetForm()
    setIsEditMode(true)
    setCurrentStaffId(staff.id)
    setNama(staff.nama)
    setJabatan(staff.jabatan || '')
    setTipeKaryawan(staff.tipe_karyawan || '')
    const assignments = staff.staff_assignments.map(sa => sa.task_categories?.id).filter(Boolean) as string[]
    setSelectedCategories(assignments)
    setIsDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg('')
    try {
      let userId = currentStaffId
      if (!isEditMode) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Sesi tidak ditemukan, silakan login ulang')
        const res = await fetch('/api/create-staff-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ email, password, nama, jabatan, tipe_karyawan: tipeKaryawan || null }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Gagal membuat user')
        userId = result.userId
      } else {
        if (!userId) throw new Error('Missing user ID')
        const { error: profileError } = await supabase.from('profiles')
          .update({ nama, jabatan, tipe_karyawan: tipeKaryawan || null })
          .eq('id', userId)
        if (profileError) throw new Error(profileError.message)
      }

      if (userId) {
        await supabase.from('staff_assignments').delete().eq('user_id', userId)
        if (selectedCategories.length > 0) {
          const { error: assignError } = await supabase.from('staff_assignments')
            .insert(selectedCategories.map(catId => ({ user_id: userId, task_category_id: catId })))
          if (assignError) throw new Error(assignError.message)
        }
      }
      setIsDialogOpen(false)
      fetchData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId])
  }

  // ── Import Excel handlers ──
  const openImportDialog = () => {
    setImportRows([]); setImportFileName(''); setImportProgress(0); setImportTotal(0)
    setImportResults([]); setImportPhase('upload'); setImportError(''); setPostImportCards([])
    setIsImportOpen(true)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    try {
      const rows = await parseExcelFile(file)
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
    setImportPhase('processing')
    setImportProgress(0)
    setImportTotal(importRows.length)
    setImportResults([])

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setImportError('Sesi habis, silakan login ulang.'); setImportPhase('preview'); return }

    try {
      const staffRows = importRows.map(r => ({
        nama: r.nama, jabatan: r.jabatan, tipe_karyawan: r.tipe_karyawan, email: r.email, password: r.password,
      }))

      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 1, importRows.length - 1))
      }, 200)

      const res = await fetch('/api/import-staff-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ staffRows }),
      })

      clearInterval(progressInterval)
      setImportProgress(importRows.length)

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal import')

      setImportResults(result.results as ImportResult[])

      const successCards = (result.results as ImportResult[])
        .filter(r => r.success)
        .map(r => {
          const row = importRows.find(ir => ir.email === r.email)
          return { nama: r.nama, jabatan: row?.jabatan || '', email: r.email, password: row?.password || '' }
        })
      setPostImportCards(successCards)
      setImportPhase('done')
      fetchData()
    } catch (err: any) {
      setImportError(err.message || 'Terjadi kesalahan saat import')
      setImportPhase('preview')
    }
  }

  const handleDownloadAllCards = async () => {
    if (postImportCards.length === 0) return
    await generateAccessCardPDF(postImportCards)
  }

  // ── Kartu Akses Individual ──
  const openCardDialog = (staff: StaffWithAssignments) => {
    setCardStaff(staff); setCardEmail(''); setCardPassword(''); setShowCardPassword(false); setIsCardDialogOpen(true)
  }

  const handleGenerateCard = async () => {
    if (!cardStaff || !cardPassword || !cardEmail) return
    setIsGeneratingCard(true)
    try {
      await generateAccessCardPDF([{ nama: cardStaff.nama, jabatan: cardStaff.jabatan || '', email: cardEmail, password: cardPassword }])
    } finally {
      setIsGeneratingCard(false)
      setIsCardDialogOpen(false)
    }
  }

  const [isGeneratingJobdesc, setIsGeneratingJobdesc] = useState<string | null>(null)

  const handleDownloadTugas = async (staff: StaffWithAssignments) => {
    setIsGeneratingJobdesc(staff.id)
    try {
      // Fetch full task templates for assigned categories
      const categoryIds = staff.staff_assignments.map(sa => sa.task_categories?.id).filter(Boolean) as string[]
      
      const categoriesData = []
      for (const catId of categoryIds) {
        // Get category info
        const { data: cat } = await supabase.from('task_categories').select('*').eq('id', catId).single()
        if (cat) {
          // Get templates
          const { data: tpls } = await supabase.from('task_templates').select('*').eq('category_id', catId)
          categoriesData.push({
            id: cat.id,
            nama_bidang: cat.nama_bidang,
            nomor_urut: cat.nomor_urut || 0,
            task_templates: tpls || []
          })
        }
      }

      await generateJobdescPDF({
        nama: staff.nama,
        jabatan: staff.jabatan || '',
        tipe_karyawan: staff.tipe_karyawan || 'Karyawan',
        categories: categoriesData
      })
    } catch (err) {
      console.error(err)
      alert('Gagal mendownload rincian tugas.')
    } finally {
      setIsGeneratingJobdesc(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Kelola Karyawan</h2>
          <p className="text-sm text-gray-500 mt-0.5">Staf TU, Wakamad, Laboran, Guru, dan lainnya</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={openImportDialog}>
            <Upload className="w-4 h-4 mr-2" />
            Import Excel
          </Button>
          <Button onClick={openAddDialog}>Tambah Karyawan</Button>
        </div>
      </div>

      {/* Filter Tipe */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterTipe('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterTipe === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
        >
          Semua ({staffList.length})
        </button>
        {TIPE_KARYAWAN_OPTIONS.map(tipe => {
          const count = staffList.filter(s => s.tipe_karyawan === tipe).length
          const colors = BADGE_COLORS[tipe] || 'bg-gray-50 text-gray-600 border-gray-200'
          const activeColors = tipe === 'Staf TU' ? 'bg-blue-600 text-white border-blue-600'
            : tipe === 'Wakamad' ? 'bg-purple-600 text-white border-purple-600'
            : tipe === 'Laboran' ? 'bg-orange-600 text-white border-orange-600'
            : tipe === 'Guru' ? 'bg-teal-600 text-white border-teal-600'
            : 'bg-gray-600 text-white border-gray-600'
          return (
            <button
              key={tipe}
              onClick={() => setFilterTipe(tipe)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filterTipe === tipe ? activeColors : colors}`}
            >
              {tipe} ({count})
            </button>
          )
        })}
      </div>

      {/* ════════════════════════════════════════════
          Dialog: Add / Edit Karyawan
      ════════════════════════════════════════════ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 py-4">
            {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{errorMsg}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input value={nama} onChange={e => setNama(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tipe Karyawan</Label>
                <Select value={tipeKaryawan} onValueChange={v => setTipeKaryawan(v as TipeKaryawan)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe karyawan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPE_KARYAWAN_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Jabatan <span className="text-gray-400 font-normal">(opsional)</span></Label>
                <Input value={jabatan} onChange={e => setJabatan(e.target.value)} placeholder="mis. Kepala TU, Wakil Kepala Kurikulum, Pengelola Lab IPA" />
              </div>

              {!isEditMode && (
                <>
                  <div className="space-y-2">
                    <Label>Email (untuk Login)</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Password Awal</Label>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                  </div>
                </>
              )}
            </div>
            <div className="space-y-3">
              <Label className="text-base">Bagian / Urusan (Assignments)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border p-4 rounded-md bg-slate-50">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-start space-x-2">
                    <Checkbox id={`cat-${cat.id}`} checked={selectedCategories.includes(cat.id)} onCheckedChange={() => toggleCategory(cat.id)} />
                    <label htmlFor={`cat-${cat.id}`} className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">{cat.nama_bidang}</label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════
          Dialog: Import Excel
      ════════════════════════════════════════════ */}
      <Dialog open={isImportOpen} onOpenChange={v => { if (!v && importPhase !== 'processing') setIsImportOpen(false) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Import Karyawan dari Excel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div>
                <p className="font-semibold text-blue-800 text-sm">Belum punya template?</p>
                <p className="text-xs text-blue-600 mt-0.5">Download template Excel, isi data karyawan (Staf TU, Wakamad, Laboran, dll), lalu upload.</p>
              </div>
              <Button variant="outline" size="sm" onClick={downloadExcelTemplate} className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100">
                <Download className="w-4 h-4 mr-1.5" />
                Download Template
              </Button>
            </div>

            {importError && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">{importError}</div>}

            {/* FASE: Upload */}
            {importPhase === 'upload' && (
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">Klik atau seret file Excel ke sini</p>
                <p className="text-sm text-gray-500 mt-1">Format: .xlsx — Kolom: nama, jabatan, tipe_karyawan, email, password</p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              </div>
            )}

            {/* FASE: Preview */}
            {importPhase === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{importFileName}</p>
                    <p className="text-sm text-gray-500">{importRows.length} baris data ditemukan</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setImportPhase('upload'); setImportRows([]) }}>Ganti File</Button>
                </div>
                <div className="border rounded-lg overflow-auto max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Jabatan</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRows.map((row, idx) => {
                        const isValid = !!row.nama && !!row.email && !!row.password
                        return (
                          <TableRow key={idx} className={!isValid ? 'bg-red-50' : ''}>
                            <TableCell className="text-gray-400 text-xs">{row._rowIndex}</TableCell>
                            <TableCell>{row.nama || <span className="text-red-500 italic text-xs">kosong</span>}</TableCell>
                            <TableCell>
                              {row.tipe_karyawan
                                ? <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${BADGE_COLORS[row.tipe_karyawan] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{row.tipe_karyawan}</span>
                                : <span className="text-gray-400 text-xs">-</span>
                              }
                            </TableCell>
                            <TableCell>{row.jabatan || '-'}</TableCell>
                            <TableCell className="text-xs font-mono">{row.email || <span className="text-red-500 italic text-xs">kosong</span>}</TableCell>
                            <TableCell className="text-xs font-mono">{row.password ? '••••••' : <span className="text-red-500 italic text-xs">kosong</span>}</TableCell>
                            <TableCell>
                              {isValid
                                ? <span className="text-xs text-green-600 font-semibold">✓ Valid</span>
                                : <span className="text-xs text-red-600 font-semibold">✗ Wajib diisi</span>
                              }
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsImportOpen(false)}>Batal</Button>
                  <Button onClick={handleProcessImport} disabled={importRows.filter(r => r.nama && r.email && r.password).length === 0}>
                    Proses Import ({importRows.filter(r => r.nama && r.email && r.password).length} data valid)
                  </Button>
                </div>
              </div>
            )}

            {/* FASE: Processing */}
            {importPhase === 'processing' && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <p className="font-semibold text-gray-700">Sedang memproses import...</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: importTotal > 0 ? `${(importProgress / importTotal) * 100}%` : '0%' }} />
                </div>
                <p className="text-sm text-gray-500 text-center">{importProgress} / {importTotal} karyawan diproses</p>
              </div>
            )}

            {/* FASE: Done */}
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
                <div className="border rounded-lg overflow-auto max-h-52">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResults.map((r, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{r.nama}</TableCell>
                          <TableCell className="text-xs font-mono">{r.email}</TableCell>
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
                {postImportCards.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="font-semibold text-amber-800 text-sm">⚠️ Download Kartu Akses Sekarang</p>
                    <p className="text-xs text-amber-700 mt-1 mb-3">Password hanya tersedia sekarang (tidak disimpan di database). Download kartu akses sebelum menutup dialog ini.</p>
                    <Button onClick={handleDownloadAllCards} className="bg-amber-600 hover:bg-amber-700 text-white">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Download {postImportCards.length} Kartu Akses (PDF)
                    </Button>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => setIsImportOpen(false)}>Selesai</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════
          Dialog: Kartu Akses Individual
      ════════════════════════════════════════════ */}
      <Dialog open={isCardDialogOpen} onOpenChange={setIsCardDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Export Kartu Akses
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {cardStaff && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-semibold">{cardStaff.nama}</p>
                    <p className="text-sm text-gray-500">{cardStaff.jabatan || 'Karyawan'}</p>
                  </div>
                  {cardStaff.tipe_karyawan && (
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border font-semibold ${BADGE_COLORS[cardStaff.tipe_karyawan] || ''}`}>
                      {cardStaff.tipe_karyawan}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Email Login</Label>
              <p className="text-xs text-gray-500">Email akun yang digunakan untuk login ke sistem</p>
              <Input
                type="email"
                value={cardEmail}
                onChange={e => setCardEmail(e.target.value)}
                placeholder="nama@madrasah.sch.id"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <p className="text-xs text-gray-500">Password akun untuk dicetak di surat akses</p>
              <div className="relative">
                <Input
                  type={showCardPassword ? 'text' : 'password'}
                  value={cardPassword}
                  onChange={e => setCardPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowCardPassword(!showCardPassword)}
                >
                  {showCardPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCardDialogOpen(false)}>Batal</Button>
            <Button onClick={handleGenerateCard} disabled={!cardEmail || !cardPassword || isGeneratingCard}>
              {isGeneratingCard
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                : <><Download className="w-4 h-4 mr-2" /> Download PDF</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════
          Tabel Karyawan
      ════════════════════════════════════════════ */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Memuat data...</div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Bagian yang di-assign</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-6">
                    {filterTipe === 'all' ? 'Belum ada data karyawan.' : `Tidak ada karyawan dengan tipe "${filterTipe}".`}
                  </TableCell>
                </TableRow>
              ) : (
                filteredList.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.nama}</TableCell>
                    <TableCell>
                      {staff.tipe_karyawan
                        ? <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${BADGE_COLORS[staff.tipe_karyawan] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{staff.tipe_karyawan}</span>
                        : <span className="text-xs text-gray-400 italic">-</span>
                      }
                    </TableCell>
                    <TableCell>{staff.jabatan || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {staff.staff_assignments.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">Belum ada</span>
                        ) : (
                          staff.staff_assignments.map((sa, idx) => (
                            <span key={idx} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full border border-blue-100">
                              {sa.task_categories?.nama_bidang}
                            </span>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadTugas(staff)} disabled={isGeneratingJobdesc === staff.id}>
                          {isGeneratingJobdesc === staff.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileText className="w-3.5 h-3.5 mr-1.5" />}
                          Cetak Tugas
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openCardDialog(staff)}>
                          <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                          Kartu Akses
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(staff)}>Edit</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
