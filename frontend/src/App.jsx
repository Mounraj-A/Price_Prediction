import { useEffect } from 'react'; // 🔥 NEW: Added useEffect import
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute, PublicRoute } from './components/RouteGuard';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import HomePage         from './pages/HomePage';
import ProfilePage      from './pages/ProfilePage';
import SavedItemsPage   from './pages/SavedItemsPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage     from './pages/SettingsPage';

export default function App() {

  // 🔥 NEW: Global Theme Initialization
  // This runs once when the app starts, immediately applying the saved theme.
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('omni_prefs')) || {};
      const root = document.documentElement;
      const body = document.body;
      
      if (prefs.darkMode === false) {
        root.classList.add('light-mode', 'light');
        body.classList.add('light-mode', 'light');
        root.setAttribute('data-theme', 'light');
      } else {
        root.classList.remove('light-mode', 'light');
        body.classList.remove('light-mode', 'light');
        root.setAttribute('data-theme', 'dark');
      }
    } catch (e) {
      console.error("Failed to load theme prefs");
    }
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicRoute />}>
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/"              element={<HomePage />} />
              <Route path="/profile"       element={<ProfilePage />} />
              <Route path="/saved"         element={<SavedItemsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings"      element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<LoginPage />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}