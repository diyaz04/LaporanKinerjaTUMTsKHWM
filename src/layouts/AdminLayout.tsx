import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  CheckSquare, 
  BarChart, 
  PieChart, 
  Menu, 
  X, 
  LogOut 
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const location = useLocation()
  const { signOut } = useAuth()

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Kelola Karyawan', path: '/admin/staff', icon: Users },
    { name: 'Template Tugas', path: '/admin/templates', icon: FileText },
    { name: 'Verifikasi', path: '/admin/verify', icon: CheckSquare },
    { name: 'Laporan', path: '/admin/reports', icon: BarChart },
    { name: 'Rekap', path: '/admin/summary', icon: PieChart },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:sticky top-0 left-0 z-30 h-screen w-64 bg-white border-r transform transition-transform duration-200 ease-in-out flex flex-col ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center bg-white">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">Admin MTsU</h1>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      isActive 
                        ? 'bg-green-50 text-green-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-start space-x-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header for Mobile */}
        <header className="bg-white border-b px-4 py-3 flex items-center md:hidden sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="mr-2">
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
            <h1 className="text-lg font-bold">Admin MTsU</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
