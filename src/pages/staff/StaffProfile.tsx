import { useAuth } from '../../contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { LogOut, User } from 'lucide-react'

export default function StaffProfile() {
  const { profile, session, signOut } = useAuth()

  if (!profile) return <div>Memuat profil...</div>

  return (
    <div className="space-y-6 max-w-md mx-auto mt-4">
      <Card>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <User className="w-10 h-10" />
          </div>
          <CardTitle className="text-2xl">{profile.nama}</CardTitle>
          <p className="text-gray-500">{profile.jabatan || 'Staff TU'}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 mb-1">Email / Akun</p>
            <p className="font-medium">{session?.user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Peran Akses</p>
            <p className="font-medium capitalize">{profile.role}</p>
          </div>
          
          <div className="pt-6">
            <Button variant="destructive" className="w-full" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" /> Keluar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
