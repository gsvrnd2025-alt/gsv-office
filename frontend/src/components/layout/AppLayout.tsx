import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sidebar } from '../ui/Sidebar';
import { Topbar } from '../ui/Topbar';
import { useThemeStore } from '../../store/theme.store';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { theme } = useThemeStore();
  const location = useLocation();

  const isChatPage = location.pathname.startsWith('/chat');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className={`${styles.layout} page-enter`}>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className={styles.overlay} onClick={() => setMobileSidebarOpen(false)} />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ''}`}>
        <Topbar
          onMenuClick={() => setMobileSidebarOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className={isChatPage ? styles.chatPageContent : styles.pageContent}>
          <Outlet context={{ sidebarCollapsed, setSidebarCollapsed }} />
        </main>
      </div>
    </div>
  );
}
