import React, { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { session, profile } = useAuth()

  // Redirect if already logged in
  if (session && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/staff'} replace />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 relative">
      {/* Tombol kembali ke Landing Page */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <Link to="/" className="flex items-center text-gray-500 hover:text-emerald-600 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span className="font-medium">Kembali ke Beranda</span>
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Logo MTs" className="w-20 h-20 object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
            Portal Kinerja Karyawan MTsU
          </CardTitle>
          <CardDescription>Masuk untuk mengelola dan melaporkan tugas Anda.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="nama@madrasah.sch.id" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
