import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { useAuthStore } from './store/auth.store';
import { authApi } from './api';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { SoundManager } from './utils/sound';

// Lazy-loaded pages
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const EOfficePage = lazy(() => import('./features/workspace/EOfficePage'));
const RemoteDesktopPage = lazy(() => import('./features/workspace/RemoteDesktopPage'));
const ChatPage = lazy(() => import('./features/chat/ChatPage'));
const FilesPage = lazy(() => import('./features/files/FilesPage'));
const TicketsPage = lazy(() => import('./features/tickets/TicketsPage'));
const EmailPage = lazy(() => import('./features/email/EmailPage'));
const UsersPage = lazy(() => import('./features/users/UsersPage'));
const RolesPage = lazy(() => import('./features/roles/RolesPage'));
const RequestsPage = lazy(() => import('./features/users/RequestsPage'));
const StoragePage = lazy(() => import('./features/storage/StoragePage'));
const BillingPage = lazy(() => import('./features/billing/BillingPage'));
const InventoryPage = lazy(() => import('./features/inventory/InventoryPage'));
const PurchasePage = lazy(() => import('./features/purchase/PurchasePage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const PluginsPage = lazy(() => import('./features/plugins/PluginsPage'));
const ServerPage = lazy(() => import('./features/server/ServerPage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const DownloadsPage = lazy(() => import('./features/plugins/DownloadsPage'));

function hasPermission(user: any, module: string, action: string): boolean {
  if (!user) return false;
  if (user.role?.name === 'Super Admin') return true;

  const effective = new Map<string, boolean>();

  if (user.role?.permissions) {
    for (const rp of user.role.permissions) {
      if (rp.granted) {
        effective.set(`${rp.permission?.module}:${rp.permission?.action}`, true);
      }
    }
  }

  if (user.userPermissions) {
    for (const up of user.userPermissions) {
      effective.set(`${up.permission?.module}:${up.permission?.action}`, up.granted);
    }
  }

  return effective.get(`${module}:${action}`) === true;
}

function PermittedRoute({ module, action, children }: { module: string; action: string; children: React.ReactNode }) {
  const { user } = useAuthStore();
  const permitted = hasPermission(user, module, action);

  if (!permitted) {
    return (
      <div 
        className="d-flex flex-column align-items-center justify-content-center text-center animate-scale-in" 
        style={{ 
          color: 'var(--text-secondary)', 
          background: 'transparent', 
          minHeight: '75vh',
          padding: '40px' 
        }}
      >
        <div style={{ fontSize: '72px', margin: '24px 0', filter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.35))' }}>🔒</div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '24px', letterSpacing: '-0.5px', marginBottom: '8px' }}>Access Locked</h2>
        <p style={{ maxWidth: '480px', fontSize: '14px', lineHeight: 1.6, margin: '0 auto 24px auto', color: 'var(--text-secondary)', fontWeight: 500 }}>
          Your user profile does not have access permissions for this module. Please coordinate with your department head or administrator to unlock access.
        </p>
        <div 
          className="badge bg-danger bg-opacity-10 text-danger border border-danger px-4 py-2 rounded-pill" 
          style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}
        >
          STATUS: LOCKED
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

import { UpdateChecker } from './components/ui/UpdateChecker';

export default function App() {
  const { isAuthenticated, setUser, logout } = useAuthStore();

  useEffect(() => {
    const autoLogin = localStorage.getItem('gsv-autologin') === 'true';
    const sessionActive = sessionStorage.getItem('gsv-session-active') === 'true';
    
    if (!autoLogin && !sessionActive) {
      logout();
    } else {
      sessionStorage.setItem('gsv-session-active', 'true');
    }
  }, [logout]);

  useEffect(() => {
    if (isAuthenticated) {
      authApi.me()
        .then(res => {
          if (res.data && res.data.success) {
            setUser(res.data.data);
          }
        })
        .catch(err => {
          console.error('Failed to sync profile permissions:', err);
          if (err.response?.status === 401) {
            logout();
          }
        });
    }
  }, [isAuthenticated, setUser, logout]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null;
      if (!target) return;

      let isClickable = false;
      let depth = 0;
      
      while (target && depth < 4) {
        const tag = target.tagName;
        const classes = target.className || '';
        
        let hasClickCursor = false;
        try {
          hasClickCursor = window.getComputedStyle(target).cursor === 'pointer';
        } catch {}

        if (
          tag === 'BUTTON' || 
          tag === 'A' || 
          tag === 'SELECT' || 
          (tag === 'INPUT' && (target as HTMLInputElement).type !== 'text' && (target as HTMLInputElement).type !== 'password' && (target as HTMLInputElement).type !== 'email') ||
          (typeof classes === 'string' && (
            classes.includes('dropdown-item') ||
            classes.includes('tab-item') ||
            classes.includes('hover-glass') ||
            classes.includes('btn') ||
            classes.includes('nav-item') ||
            classes.includes('convItem')
          )) ||
          target.getAttribute('role') === 'button' ||
          hasClickCursor
        ) {
          isClickable = true;
          break;
        }
        
        target = target.parentElement;
        depth++;
      }

      if (isClickable) {
        SoundManager.playClick();
      }
    };

    window.addEventListener('click', handleGlobalClick, { capture: true });
    return () => window.removeEventListener('click', handleGlobalClick, { capture: true });
  }, []);

  return (
    <BrowserRouter>
      <UpdateChecker />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={
            <GuestRoute><AuthLayout><LoginPage /></AuthLayout></GuestRoute>
          } />
          <Route path="/register" element={
            <GuestRoute><AuthLayout><RegisterPage /></AuthLayout></GuestRoute>
          } />

          {/* Protected app routes */}
          <Route path="/" element={
            <ProtectedRoute><AppLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="workspace" element={<EOfficePage />} />
            <Route path="remote-desktop" element={<PermittedRoute module="chat" action="read"><RemoteDesktopPage /></PermittedRoute>} />
            <Route path="chat" element={<PermittedRoute module="chat" action="read"><ChatPage /></PermittedRoute>} />
            <Route path="chat/:conversationId" element={<PermittedRoute module="chat" action="read"><ChatPage /></PermittedRoute>} />
            <Route path="files" element={<PermittedRoute module="files" action="read"><FilesPage /></PermittedRoute>} />
            <Route path="files/:folderId" element={<PermittedRoute module="files" action="read"><FilesPage /></PermittedRoute>} />
            <Route path="tickets" element={<PermittedRoute module="tickets" action="read"><TicketsPage /></PermittedRoute>} />
            <Route path="tickets/:ticketId" element={<PermittedRoute module="tickets" action="read"><TicketsPage /></PermittedRoute>} />
            <Route path="email" element={<PermittedRoute module="email" action="read"><EmailPage /></PermittedRoute>} />
            <Route path="users" element={<PermittedRoute module="users" action="read"><UsersPage /></PermittedRoute>} />
            <Route path="roles" element={<PermittedRoute module="roles" action="read"><RolesPage /></PermittedRoute>} />
            <Route path="requests" element={<PermittedRoute module="users" action="update"><RequestsPage /></PermittedRoute>} />
            <Route path="storage" element={<PermittedRoute module="server" action="view"><StoragePage /></PermittedRoute>} />
            <Route path="billing" element={<PermittedRoute module="billing" action="read"><BillingPage /></PermittedRoute>} />
            <Route path="billing/:section" element={<PermittedRoute module="billing" action="read"><BillingPage /></PermittedRoute>} />
            <Route path="inventory" element={<PermittedRoute module="inventory" action="read"><InventoryPage /></PermittedRoute>} />
            <Route path="purchase" element={<PermittedRoute module="purchase" action="read"><PurchasePage /></PermittedRoute>} />
            <Route path="analytics" element={<PermittedRoute module="dashboard" action="view_financials"><AnalyticsPage /></PermittedRoute>} />
            <Route path="plugins" element={<PermittedRoute module="plugins" action="read"><PluginsPage /></PermittedRoute>} />
            <Route path="server" element={<PermittedRoute module="server" action="view"><ServerPage /></PermittedRoute>} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="downloads" element={<DownloadsPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
