import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const anonKey = process.env.SUPABASE_ANON_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type StaffRow = {
  nama: string
  jabatan?: string
  email: string
  password: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Verifikasi token pemanggil
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Missing auth token' })
    }

    const callerClient = createClient(supabaseUrl, anonKey)
    const { data: callerData, error: callerError } = await callerClient.auth.getUser(token)
    if (callerError || !callerData.user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // 2. Cek admin
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .single()

    if (profileError || callerProfile?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' })
    }

    // 3. Validasi body
    const { staffRows } = req.body || {}
    if (!Array.isArray(staffRows) || staffRows.length === 0) {
      return res.status(400).json({ error: 'staffRows harus berupa array dan tidak boleh kosong' })
    }

    // 4. Proses tiap baris
    const results: { index: number; nama: string; email: string; success: boolean; error?: string; userId?: string }[] = []

    for (let i = 0; i < staffRows.length; i++) {
      const row: StaffRow = staffRows[i]
      const { nama, jabatan, email, password } = row

      if (!nama || !email || !password) {
        results.push({ index: i, nama: nama || '-', email: email || '-', success: false, error: 'nama, email, dan password wajib diisi' })
        continue
      }

      try {
        // Buat auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })

        if (authError || !authData.user) {
          results.push({ index: i, nama, email, success: false, error: authError?.message || 'Gagal membuat user' })
          continue
        }

        // Insert profile
        const { error: insertError } = await supabaseAdmin.from('profiles').insert({
          id: authData.user.id,
          nama,
          jabatan: jabatan || null,
          role: 'staff',
        })

        if (insertError) {
          // Rollback auth user
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
          results.push({ index: i, nama, email, success: false, error: insertError.message })
          continue
        }

        results.push({ index: i, nama, email, success: true, userId: authData.user.id })
      } catch (err: any) {
        results.push({ index: i, nama, email, success: false, error: err.message || 'Unknown error' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return res.status(200).json({ results, successCount, failCount })
  } catch (err) {
    console.error('import-staff-bulk error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
