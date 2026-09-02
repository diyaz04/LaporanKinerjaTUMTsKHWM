
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'
import Login from './pages/auth/Login'
import StaffLayout from './layouts/StaffLayout'
import AdminLayout from './layouts/AdminLayout'
import ProtectedRoute from './layouts/ProtectedRoute'

import StaffManager from './pages/admin/StaffManager'
import TemplateManager from './pages/admin/TemplateManager'
import StaffDashboard from './pages/staff/StaffDashboard'
import ChecklistForm from './pages/staff/ChecklistForm'
import StaffHistory from './pages/staff/StaffHistory'
import StaffProfile from './pages/staff/StaffProfile'
import AdminDashboard from './pages/admin/AdminDashboard'
import VerificationManager from './pages/admin/VerificationManager'
import VerificationDetail from './pages/admin/VerificationDetail'
import ReportGenerator from './pages/admin/ReportGenerator'
import SummaryRekap from './pages/admin/SummaryRekap'
import RekapPengisian from './pages/admin/RekapPengisian'
import KomiteLayout from './layouts/KomiteLayout'
import KomiteDashboard from './pages/komite/KomiteDashboard'

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          
          {/* Staff Routes */}
          <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff']} />}>
            <Route element={<StaffLayout />}>
              <Route index element={<StaffDashboard />} />
              <Route path="isi/:id" element={<ChecklistForm />} />
              <Route path="history" element={<StaffHistory />} />
              <Route path="profile" element={<StaffProfile />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="staff" element={<StaffManager />} />
              <Route path="templates" element={<TemplateManager />} />
              <Route path="verify" element={<VerificationManager />} />
              <Route path="verify/:id" element={<VerificationDetail />} />
              <Route path="reports" element={<ReportGenerator />} />
              <Route path="summary" element={<SummaryRekap />} />
              <Route path="status" element={<RekapPengisian />} />
            </Route>
          </Route>
          {/* Komite Routes */}
          <Route path="/komite" element={<ProtectedRoute allowedRoles={['komite']} />}>
            <Route element={<KomiteLayout />}>
              <Route index element={<KomiteDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}
