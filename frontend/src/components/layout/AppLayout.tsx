import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '../ui/Sidebar';
import { Topbar } from '../ui/Topbar';
import { useThemeStore } from '../../store/theme.store';
import { chatApi } from '../../api';
import { SoundManager } from '../../utils/sound';
import FloatingStickyNotes from './FloatingStickyNotes';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { theme } = useThemeStore();
  const location = useLocation();

  const isChatPage = location.pathname.startsWith('/chat');

  // Background polling for unread chat sum across all conversations (polls every 5s)
  const { data: conversations = [] } = useQuery({
    queryKey: ['global-conversations-unread'],
    queryFn: () => chatApi.getConversations().then(r => r.data?.data || r.data || []),
    refetchInterval: 5000,
  });

  const prevUnreadCountSumRef = useRef(0);
  const unreadSum = conversations.reduce((acc: number, c: any) => acc + (Number(c.unread_count) || 0), 0);

  useEffect(() => {
    if (unreadSum > prevUnreadCountSumRef.current) {
      if (!isChatPage) {
        // If they are on another route of the workspace app, play notifications globally and update title
        SoundManager.playNotification();
        document.title = `(${unreadSum}) New Secure Signal`;
      } else if (document.visibilityState !== 'visible') {
        // If they are on Chat page but the tab itself is backgrounded, let local listener play sound, just update tab title
        document.title = `(${unreadSum}) New Secure Signal`;
      }
    } else if (unreadSum === 0) {
      document.title = 'GSV Office — Enterprise Workspace';
    }
    prevUnreadCountSumRef.current = unreadSum;
  }, [unreadSum, isChatPage]);

  // Reset tab title immediately when unread sum becomes 0 or when entering Chat Page
  useEffect(() => {
    if (isChatPage && unreadSum === 0) {
      document.title = 'GSV Office — Enterprise Workspace';
    }
  }, [isChatPage, unreadSum]);

  // Reset title when tab returns to focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isChatPage) {
        document.title = 'GSV Office — Enterprise Workspace';
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isChatPage]);

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
        {!isChatPage && (
          <Topbar
            onMenuClick={() => setMobileSidebarOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
          />
        )}
        <main className={isChatPage ? styles.chatPageContent : styles.pageContent}>
          <Outlet context={{ sidebarCollapsed, setSidebarCollapsed }} />
        </main>
      </div>

      {/* Floating Sticky Notes rendered globally */}
      <FloatingStickyNotes />
    </div>
  );
}
