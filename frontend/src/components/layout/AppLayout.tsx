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
import { useAuthStore } from '../../store/auth.store';
import { io } from 'socket.io-client';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { theme } = useThemeStore();
  const location = useLocation();
  const { accessToken } = useAuthStore();

  // Connect globally to presence namespace
  useEffect(() => {
    if (!accessToken) return;
    const socket = io('/presence', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling']
    });

    socket.on('connect_error', async (err) => {
      console.warn('Presence socket connection error, attempting token refresh:', err.message);
      try {
        // Trigger a simple authenticated API call to trigger Axios interceptor token refresh
        await chatApi.getConversations();
        const freshToken = useAuthStore.getState().accessToken;
        if (freshToken && freshToken !== (socket.auth as any).token) {
          (socket.auth as any).token = freshToken;
          socket.connect();
        }
      } catch (refreshErr) {
        console.error('Failed to auto-refresh token for presence socket:', refreshErr);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);

  const isChatPage = location.pathname.startsWith('/chat');
  const pathParts = location.pathname.split('/');
  const activeConversationId = (isChatPage && pathParts[2]) ? pathParts[2] : null;

  // Background polling for unread chat sum across all conversations (polls every 5s)
  const { data: conversations = [] } = useQuery({
    queryKey: ['global-conversations-unread'],
    queryFn: () => chatApi.getConversations().then(r => r.data?.data || r.data || []),
    refetchInterval: 5000,
  });

  const prevUnreadCountSumRef = useRef(0);
  const isFirstRunRef = useRef(true);
  const unreadSum = conversations.reduce((acc: number, c: any) => {
    if (activeConversationId && c.id === activeConversationId) return acc;
    return acc + (Number(c.unread_count) || 0);
  }, 0);
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Tab Title Notification Flashing
  useEffect(() => {
    if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);

    if (unreadSum > 0) {
      if (!isFirstRunRef.current && unreadSum > prevUnreadCountSumRef.current) {
        SoundManager.playMessageRing();
      }
      let toggle = false;
      flashIntervalRef.current = setInterval(() => {
        toggle = !toggle;
        document.title = toggle 
          ? `🔔 (${unreadSum}) New Signal!` 
          : `💬 GSV E-Office Workspace`;
      }, 1000);
    } else {
      document.title = 'GSV E-Office Workspace';
    }

    isFirstRunRef.current = false;
    prevUnreadCountSumRef.current = unreadSum;
    return () => {
      if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
    };
  }, [unreadSum]);

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
