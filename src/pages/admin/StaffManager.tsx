import { useState, useEffect } from 'react'
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
import type { Profile, TaskCategory } from '../../types/database'

type StaffWithAssignments = Profile & {
  staff_assignments: { task_categories: TaskCategory | null }[]
}

export default function StaffManager() {
  const [staffList, setStaffList] = useState<StaffWithAssignments[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null)
  
  // Form states
  const [nama, setNama] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [email, setEmail] = useState('') // Only for create
  const [password, setPassword] = useState('') // Only for create
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    // Fetch categories
    const { data: catData } = await supabase
      .from('task_categories')
      .select('*')
      .order('nomor_urut')
    
    if (catData) setCategories(catData)

    // Fetch staff with assignments
    const { data: staffData } = await supabase
      .from('profiles')
      .select(`
        *,
        staff_assignments(
          task_categories(*)
        )
      `)
      .eq('role', 'staff')

    if (staffData) setStaffList(staffData as StaffWithAssignments[])
    
    setLoading(false)
  }

  const resetForm = () => {
    setNama('')
    setJabatan('')
    setEmail('')
    setPassword('')
    setSelectedCategories([])
    setErrorMsg('')
  }

  const openAddDialog = () => {
    resetForm()
    setIsEditMode(false)
    setIsDialogOpen(true)
  }

  const openEditDialog = (staff: StaffWithAssignments) => {
    resetForm()
    setIsEditMode(true)
    setCurrentStaffId(staff.id)
    setNama(staff.nama)
    setJabatan(staff.jabatan || '')
    // Extract selected categories
    const assignments = staff.staff_assignments
      .map(sa => sa.task_categories?.id)
      .filter(Boolean) as string[]
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
        // 1. Buat auth user + profile lewat serverless function (service role key jalan di server)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Sesi tidak ditemukan, silakan login ulang')

        const res = await fetch('/api/create-staff-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email, password, nama, jabatan }),
        })

        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Gagal membuat user')

        userId = result.userId

      } else {
        // Edit Mode: Update profile
        if (!userId) throw new Error('Missing user ID')
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            nama,
            jabatan
          })
          .eq('id', userId)

        if (profileError) throw new Error(profileError.message)
      }

      // 3. Sync Assignments (Delete old ones, insert new ones)
      if (userId) {
        await supabase
          .from('staff_assignments')
          .delete()
          .eq('user_id', userId)

        if (selectedCategories.length > 0) {
          const assignmentsToInsert = selectedCategories.map(catId => ({
            user_id: userId,
            task_category_id: catId
          }))

          const { error: assignError } = await supabase
            .from('staff_assignments')
            .insert(assignmentsToInsert)

          if (assignError) throw new Error(assignError.message)
        }
      }

      setIsDialogOpen(false)
      fetchData() // Refresh table
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-2xl font-bold">Kelola Staff</h2>
        <Button onClick={openAddDialog}>Tambah Staff</Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Staff' : 'Tambah Staff Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 py-4">
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {errorMsg}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input value={nama} onChange={e => setNama(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Jabatan</Label>
                <Input value={jabatan} onChange={e => setJabatan(e.target.value)} />
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
                    <Checkbox 
                      id={`cat-${cat.id}`} 
                      checked={selectedCategories.includes(cat.id)}
                      onCheckedChange={() => toggleCategory(cat.id)}
                    />
                    <label 
                      htmlFor={`cat-${cat.id}`} 
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {cat.nama_bidang}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div>Loading data...</div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Bagian yang di-assign</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500 py-6">
                    Belum ada data staff.
                  </TableCell>
                </TableRow>
              ) : (
                staffList.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium">{staff.nama}</TableCell>
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
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(staff)}>
                        Edit
                      </Button>
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
