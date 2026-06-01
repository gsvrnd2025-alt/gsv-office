import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { useAuthStore } from './store/auth.store';
import { LoadingScreen } from './components/ui/LoadingScreen';

// Lazy-loaded pages
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
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

export default function App() {
  return (
    <BrowserRouter>
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
            <Route path="chat" element={<ChatPage />} />
            <Route path="chat/:conversationId" element={<ChatPage />} />
            <Route path="files" element={<FilesPage />} />
            <Route path="files/:folderId" element={<FilesPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="tickets/:ticketId" element={<TicketsPage />} />
            <Route path="email" element={<EmailPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="requests" element={<RequestsPage />} />
            <Route path="storage" element={<StoragePage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="billing/:section" element={<BillingPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="purchase" element={<PurchasePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="plugins" element={<PluginsPage />} />
            <Route path="server" element={<ServerPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
