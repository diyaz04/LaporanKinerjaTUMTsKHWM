import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { 
  ArrowRight, 
  BarChart3, 
  ClipboardList, 
  Bell,
  Layers, 
  CheckSquare, 
  TrendingUp, 
  Shield,
  CheckCircle2,
  UserCircle2
} from 'lucide-react'

const features = [
  { icon: BarChart3, text: "Monitoring kinerja real-time" },
  { icon: ClipboardList, text: "Laporan harian, mingguan, bulanan" },
  { icon: Bell, text: "Notifikasi laporan terkirim" },
]

const featureBanners = [
  { icon: Layers, title: "Terintegrasi", desc: "Semua data dan laporan terkelola dalam satu sistem terpadu." },
  { icon: CheckSquare, title: "Efisien", desc: "Proses pelaporan lebih cepat, mudah, dan paperless." },
  { icon: TrendingUp, title: "Transparan", desc: "Pantau progress dan kinerja secara real-time." },
  { icon: Shield, title: "Aman", desc: "Keamanan data terjamin dengan sistem terproteksi." }
]

// Shared illustration component
function Illustration({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative w-full ${compact ? 'max-w-sm mx-auto' : 'max-w-md'} animate-fade-in-up`}>
      {/* Floating Card 1: Chart */}
      <div className={`absolute ${compact ? '-top-8 -left-2 w-52' : '-top-12 -left-8 w-64'} bg-white p-4 rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-float-slow z-20`}>
        <h4 className="text-xs font-bold text-slate-800 mb-2">Ringkasan Kinerja</h4>
        {/* Line Chart SVG */}
        <div className="h-14 w-full mb-2 relative overflow-hidden">
          <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,45 C20,40 35,50 55,35 C75,20 90,30 110,18 C130,8 150,22 175,10 L175,60 L0,60 Z" fill="url(#chartGrad)" />
            <path d="M0,45 C20,40 35,50 55,35 C75,20 90,30 110,18 C130,8 150,22 175,10" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
            {[55,110,175].map((x,i) => {
              const y = [35,18,10][i]
              return <circle key={i} cx={x} cy={y} r="3" fill="white" stroke="#10b981" strokeWidth="2"/>
            })}
          </svg>
        </div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Harian</span><span>Mingguan</span><span>Bulanan</span>
        </div>
      </div>

      {/* Floating Card 2: Circle Progress */}
      <div className={`absolute ${compact ? 'top-4 -right-2' : 'top-8 -right-12'} bg-white p-3 rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center animate-float-delayed z-20`}>
        <h4 className="text-[9px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Tugas Selesai</h4>
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path className="text-emerald-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path className="text-emerald-500" strokeDasharray="96, 100" strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <span className="absolute font-bold text-slate-800 text-xs">96%</span>
        </div>
      </div>

      {/* Floating Card 3: Notification */}
      <div className={`absolute ${compact ? 'bottom-12 -left-2' : 'bottom-16 -left-16'} bg-white py-2.5 px-3 rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-2 animate-float-slow z-20`}>
        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
          <Bell className="w-3.5 h-3.5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-800">Laporan terkirim</h4>
          <p className="text-[10px] text-slate-500">Baru saja</p>
        </div>
        <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-2 shrink-0" />
      </div>

      {/* Laptop Graphic */}
      <div className={`relative z-10 mx-auto ${compact ? 'w-64' : 'w-80'} mt-20`}>
        <div className={`bg-slate-800 p-2 rounded-t-2xl shadow-2xl border-x-4 border-t-4 border-slate-900 relative ${compact ? 'h-40' : 'h-52'} flex flex-col overflow-hidden`}>
          <div className="bg-slate-50 flex-1 rounded-sm overflow-hidden flex flex-col">
            <div className="h-5 bg-white border-b flex items-center px-2 gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
            </div>
            <div className="flex-1 p-3 flex flex-col gap-2">
              <div className="w-1/3 h-2.5 bg-slate-200 rounded"></div>
              <div className="flex gap-2">
                <div className="w-1/2 h-12 bg-emerald-50 rounded border border-emerald-100"></div>
                <div className="w-1/2 h-12 bg-slate-100 rounded"></div>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded mt-auto"></div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/10 to-transparent pointer-events-none"></div>
        </div>
        <div className="relative">
          <div className={`bg-slate-300 h-3 rounded-b-2xl shadow-xl ${compact ? 'w-[110%] -ml-[5%]' : 'w-[110%] -ml-[5%]'} flex justify-center border-t border-slate-400`}>
            <div className="w-14 h-1 bg-slate-400 rounded-b-md"></div>
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] h-3 bg-black/10 blur-md rounded-full"></div>
        </div>
      </div>

      {/* Plant Pot */}
      <div className={`absolute ${compact ? 'bottom-0 right-4' : 'bottom-0 right-0'} z-0`}>
        <div className="relative w-12 h-20">
          <div className="absolute top-0 left-1 w-6 h-10 bg-emerald-500 rounded-t-full rounded-bl-full rotate-[-30deg] origin-bottom shadow-sm"></div>
          <div className="absolute top-1 right-0 w-7 h-8 bg-emerald-600 rounded-t-full rounded-br-full rotate-[40deg] origin-bottom shadow-sm"></div>
          <div className="absolute -top-3 left-3 w-4 h-11 bg-emerald-400 rounded-full shadow-sm"></div>
          <div className="absolute bottom-0 left-0 w-12 h-8 bg-slate-200 rounded-b-xl border-t-[5px] border-slate-300"></div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { isLoading } = useAuth()
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white">Loading...</div>

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -z-10 w-full h-full overflow-hidden opacity-40 pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-50 blur-3xl"></div>
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-green-50 blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-slate-100/80">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo MTs" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
          <div>
            <h1 className="font-bold text-emerald-800 leading-tight text-sm sm:text-base">MTs KH. A. Wahab Muhsin</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Integrity • Professional • Excellence</p>
          </div>
        </div>
        {/* Mobile: icon only. Desktop: full button */}
        <Link to="/login">
          <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50 sm:hidden">
            <UserCircle2 className="w-5 h-5" />
          </Button>
          <Button variant="outline" className="hidden sm:flex rounded-full text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 font-medium px-5">
            <UserCircle2 className="w-4 h-4 mr-2" /> Masuk ke Portal <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </header>

      {/* === DESKTOP LAYOUT === */}
      <main className="hidden lg:block max-w-7xl mx-auto px-8 pt-12 pb-24">
        <div className="grid grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-700 tracking-wide">SISTEM TERPADU</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                Portal Kontrol Kinerja <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-500">Tata Usaha</span>
              </h1>
              <h2 className="text-2xl font-bold text-emerald-700">MTs KH. A. Wahab Muhsin</h2>
              <p className="text-lg text-slate-500 max-w-lg leading-relaxed">
                Sistem digitalisasi laporan dan monitoring tugas harian, mingguan, dan bulanan untuk staf tata usaha secara terpadu.
              </p>
            </div>
            <ul className="space-y-4">
              {features.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-slate-700">{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-4 pt-4">
              <Link to="/login">
                <Button size="lg" className="rounded-full px-8 h-14 text-base font-bold shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5 transition-all bg-emerald-600 hover:bg-emerald-700 text-white">
                  Masuk ke Portal <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
          {/* Right */}
          <div className="relative h-[520px] flex items-center justify-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-slate-50 rounded-full blur-3xl -z-10"></div>
            <div className="relative -translate-y-16 w-full max-w-md">
              <Illustration />
            </div>
          </div>
        </div>
        {/* Features Banner */}
        <div className="mt-24 bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative z-10">
          <div className="grid grid-cols-4 gap-8 divide-x divide-slate-100">
            {featureBanners.map((feature, idx) => (
              <div key={idx} className={`flex flex-col gap-3 ${idx !== 0 ? 'pl-8' : ''}`}>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* === MOBILE LAYOUT === */}
      <main className="lg:hidden px-4 pt-8 pb-32">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-emerald-700 tracking-wide">SISTEM TERPADU</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-3">
          Portal Kontrol Kinerja <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-500">Tata Usaha</span>
        </h1>
        <h2 className="text-xl font-bold text-emerald-700 mb-3">MTs KH. A. Wahab Muhsin</h2>
        <p className="text-base text-slate-500 leading-relaxed mb-8">
          Sistem digitalisasi laporan dan monitoring tugas harian, mingguan, dan bulanan untuk staf tata usaha secara terpadu.
        </p>

        {/* Bullets */}
        <ul className="space-y-4 mb-10">
          {features.map((item, idx) => (
            <li key={idx} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-700">{item.text}</span>
            </li>
          ))}
        </ul>

        {/* Illustration — shown below text on mobile */}
        <div className="relative h-64 w-full overflow-visible mb-8">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[150%] bg-slate-50 rounded-full blur-3xl -z-10"></div>
          <div className="absolute inset-0 flex items-center justify-center -translate-y-4">
            <Illustration compact={true} />
          </div>
        </div>
      </main>

      {/* === MOBILE: Sticky Bottom CTA === */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-3 bg-white/90 backdrop-blur-sm border-t border-slate-100">
        <Link to="/login" className="block">
          <Button className="w-full h-14 text-base font-bold rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2">
            <UserCircle2 className="w-5 h-5" />
            Masuk ke Portal
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float-slow {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 4s ease-in-out infinite 2s;
        }
      `}</style>
    </div>
  )
}
