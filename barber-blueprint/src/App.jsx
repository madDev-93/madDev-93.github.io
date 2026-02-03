import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Module from './pages/Module'
import Account from './pages/Account'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'

// Admin imports
import { AdminProvider } from './firebase/AdminContext'
import AdminProtectedRoute from './components/admin/AdminProtectedRoute'
import AdminLayout from './components/admin/AdminLayout'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import HeroEditor from './pages/admin/HeroEditor'
import AboutEditor from './pages/admin/AboutEditor'
import PricingEditor from './pages/admin/PricingEditor'
import TestimonialsManager from './pages/admin/TestimonialsManager'
import FAQsManager from './pages/admin/FAQsManager'
import BonusesManager from './pages/admin/BonusesManager'
import ModulesManager from './pages/admin/ModulesManager'
import LessonsManager from './pages/admin/LessonsManager'
import MediaLibrary from './pages/admin/MediaLibrary'
import PreviewPage from './pages/admin/PreviewPage'

// Wrapper for admin routes with shared provider and isolated error boundary
function AdminRoutes() {
  return (
    <ErrorBoundary>
      <AdminProvider>
        <Routes>
          <Route path="login" element={<AdminLogin />} />
          <Route
            path="*"
            element={
              <AdminProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route index element={<AdminDashboard />} />
                    <Route path="landing/hero" element={<HeroEditor />} />
                    <Route path="landing/about" element={<AboutEditor />} />
                    <Route path="landing/pricing" element={<PricingEditor />} />
                    <Route path="testimonials" element={<TestimonialsManager />} />
                    <Route path="faqs" element={<FAQsManager />} />
                    <Route path="bonuses" element={<BonusesManager />} />
                    <Route path="modules" element={<ModulesManager />} />
                    <Route path="modules/:moduleId/lessons" element={<LessonsManager />} />
                    <Route path="media" element={<MediaLibrary />} />
                    <Route path="preview" element={<PreviewPage />} />
                  </Routes>
                </AdminLayout>
              </AdminProtectedRoute>
            }
          />
        </Routes>
      </AdminProvider>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/modules/:id"
          element={
            <ProtectedRoute requirePurchase>
              <Module />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />

        {/* Admin routes - single AdminProvider for all */}
        <Route path="/admin/*" element={<AdminRoutes />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
