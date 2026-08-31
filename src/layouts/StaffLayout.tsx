
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Home, History, User, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'

export default function StaffLayout() {
  const location = useLocation()
  const { signOut } = useAuth()

  const navItems = [
    { name: 'Home', path: '/staff', icon: Home },
    { name: 'Riwayat', path: '/staff/history', icon: History },
    { name: 'Profil', path: '/staff/profile', icon: User },
  ]

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent leading-none">Portal Karyawan</h1>
            <p className="text-xs text-gray-500 font-medium mt-1">{currentDate}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} title="Logout">
          <LogOut className="h-5 w-5 text-gray-600" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t flex justify-around items-center h-16 z-10 safe-area-pb">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-green-600' : 'text-gray-500 hover:text-green-500'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
