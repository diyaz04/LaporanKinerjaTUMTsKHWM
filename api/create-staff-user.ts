import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Server-side only client — service role key lives here, never shipped to the browser.
// NOTE: env vars here must NOT have the VITE_ prefix, or Vite would try to bundle them.
const supabaseUrl = process.env.SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const anonKey = process.env.SUPABASE_ANON_KEY || ''

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 1. Ambil token dari header Authorization: Bearer <token>
    const authHeader = req.headers.authorization || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'Missing auth token' })
    }

    // 2. Verifikasi token itu valid & ambil user pemanggil (pakai anon key, bukan admin key)
    const callerClient = createClient(supabaseUrl, anonKey)
    const { data: callerData, error: callerError } = await callerClient.auth.getUser(token)
    if (callerError || !callerData.user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // 3. Cek role pemanggil di tabel profiles — cuma admin yang boleh bikin staff baru
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .single()

    if (profileError || callerProfile?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' })
    }

    // 4. Validasi input dasar
    const { email, password, nama, jabatan, tipe_karyawan } = req.body || {}
    if (!email || !password || !nama) {
      return res.status(400).json({ error: 'email, password, dan nama wajib diisi' })
    }

    // 5. Bikin auth user pakai admin client (service role key dipakai di sini, di server)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Gagal membuat user' })
    }

    // 6. Insert profile staff baru
    const { error: insertError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      nama,
      jabatan: jabatan || null,
      tipe_karyawan: tipe_karyawan || null,
      role: req.body.role === 'komite' ? 'komite' : 'staff',
    })

    if (insertError) {
      // Rollback: hapus auth user kalau insert profile gagal, biar gak nyangkut
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return res.status(400).json({ error: insertError.message })
    }

    return res.status(200).json({ userId: authData.user.id })
  } catch (err) {
    console.error('create-staff-user error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
