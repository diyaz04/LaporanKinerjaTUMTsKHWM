export type TipeKaryawan = 'Staf TU' | 'Wakamad' | 'Laboran' | 'Guru' | 'Lainnya'

export const TIPE_KARYAWAN_OPTIONS: TipeKaryawan[] = [
  'Staf TU',
  'Wakamad',
  'Laboran',
  'Guru',
  'Lainnya',
]

export type Profile = {
  id: string
  nama: string
  jabatan: string | null
  tipe_karyawan: TipeKaryawan | null
  role: 'admin' | 'staff'
  created_at: string
}

export type TaskCategory = {
  id: string
  nomor_urut: number | null
  nama_bidang: string
  parent_group?: string | null
  created_at: string
}

export type TaskTemplate = {
  id: string
  category_id: string
  periode: 'harian' | 'mingguan' | 'bulanan' | 'periodik' | 'berkala' | 'insidentil'
  deskripsi_tugas: string
  urutan_tampil: number
  created_at: string
}

export type StaffAssignment = {
  id: string
  user_id: string
  task_category_id: string
}

export type ReportBatch = {
  id: string
  user_id: string
  periode: string
  periode_key: string
  status: 'draft' | 'pending_verifikasi' | 'approved' | 'revisi'
  verified_by: string | null
  verified_at: string | null
  catatan_verifikasi: string | null
  submitted_at: string | null
  created_at: string
}

export type TaskSubmission = {
  id: string
  report_batch_id: string
  template_id: string | null
  status: 'Ya' | 'Tdk' | null
  catatan: string | null
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      task_categories: {
        Row: TaskCategory
        Insert: Omit<TaskCategory, 'id' | 'created_at'> & { id?: string, created_at?: string }
        Update: Partial<Omit<TaskCategory, 'id' | 'created_at'>>
      }
      task_templates: {
        Row: TaskTemplate
        Insert: Omit<TaskTemplate, 'id' | 'created_at'> & { id?: string, created_at?: string }
        Update: Partial<Omit<TaskTemplate, 'id' | 'created_at'>>
      }
      staff_assignments: {
        Row: StaffAssignment
        Insert: Omit<StaffAssignment, 'id'> & { id?: string }
        Update: Partial<Omit<StaffAssignment, 'id'>>
      }
      report_batches: {
        Row: ReportBatch
        Insert: Omit<ReportBatch, 'id' | 'created_at'> & { id?: string, created_at?: string }
        Update: Partial<Omit<ReportBatch, 'id' | 'created_at'>>
      }
      task_submissions: {
        Row: TaskSubmission
        Insert: Omit<TaskSubmission, 'id' | 'updated_at'> & { id?: string, updated_at?: string }
        Update: Partial<Omit<TaskSubmission, 'id' | 'updated_at'>>
      }
    }
  }
}
