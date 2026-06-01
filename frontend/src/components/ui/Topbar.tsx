import { Menu, Bell, Sun, Moon, Search, Play, Server } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api';
import styles from './Topbar.module.css';
import toast from 'react-hot-toast';

interface TopbarProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const qc = useQueryClient();
  const [demoMode, setDemoMode] = useState(() => localStorage.getItem('gsv-demo-mode') === 'true');
  const [showNotifications, setShowNotifications] = useState(false);

  // Queries
  const { data: notifCountData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsApi.getCount().then(r => r.data?.data || r.data || { count: 0 }),
    refetchInterval: 10000,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.get().then(r => r.data?.data || r.data || []),
    enabled: showNotifications,
  });

  const notifCount = notifCountData?.count !== undefined ? notifCountData.count : 0;
  const notifications = notificationsData || [];

  // Mutations
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
      toast.success('All notifications marked as read! 🔔');
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    }
  });

  const toggleDemoMode = () => {
    const next = !demoMode;
    setDemoMode(next);
    if (next) {
      localStorage.setItem('gsv-demo-mode', 'true');
      toast.success('Offline Demo Mode Activated! 🧪');
    } else {
      localStorage.removeItem('gsv-demo-mode');
      toast.success('Live API Mode Activated! ⚡ Connecting to backend...');
    }
    setTimeout(() => window.location.reload(), 600);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className={styles.topbar}>
      {/* Left */}
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <div className={styles.greeting}>
          <span className={styles.greetingText}>{getGreeting()},</span>
          <span className={styles.userName}>{user?.fullName?.split(' ')[0]}</span>
          <span>👋</span>
        </div>
      </div>

      {/* Center: Search */}
      <div className={styles.center}>
        <div className={styles.searchBar}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search anything..."
            className={styles.searchInput}
          />
          <kbd className={styles.searchKbd}>⌘K</kbd>
        </div>
      </div>

      {/* Right */}
      <div className={styles.right}>
        {/* Demo Mode Toggle */}
        <button
          onClick={toggleDemoMode}
          title={`Switch to ${demoMode ? 'Live Database' : 'Offline Demo'} Mode`}
          style={{
            background: demoMode ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            color: demoMode ? '#6366f1' : 'var(--text-secondary)',
            border: `1.5px solid ${demoMode ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 700,
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            height: '34px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          {demoMode ? <Server size={14} /> : <Play size={14} />}
          <span>{demoMode ? '🧪 Demo' : '⚡ Live'}</span>
        </button>

        {/* Theme toggle */}
        <button className={styles.iconBtn} onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className={styles.iconBtn}
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            style={{ position: 'relative', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', color: 'var(--text-secondary)' }}
          >
            <Bell size={18} />
            {notifCount > 0 && (
              <span style={{
                position: 'absolute', top: '2px', right: '2px',
                background: 'var(--brand-danger)', color: 'white',
                fontSize: '9px', fontWeight: 700, padding: '2px 4px',
                borderRadius: '8px', lineHeight: 1, minWidth: '14px', textAlign: 'center'
              }}>
                {notifCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="animate-scale-in" style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              width: '280px', background: 'rgba(26, 21, 44, 0.95)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 1000,
              padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
              backdropFilter: 'blur(20px)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>🔔 Notifications</span>
                {notifCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', fontSize: '9px', height: 'auto' }}
                    onClick={() => markAllReadMutation.mutate()}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '16px', color: 'var(--text-tertiary)', fontSize: '11px', textAlign: 'center' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                      style={{
                        padding: '8px', background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                        border: `1px solid ${n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.1)'}`,
                        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', gap: '2px'
                      }}
                      className="hover-glass"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{n.title}</span>
                        {!n.isRead && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand-danger)' }} />}
                      </div>
                      <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <NavLink to="/profile" className={styles.userAvatar} title="Profile">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName} />
          ) : (
            <span>{user?.fullName?.charAt(0).toUpperCase()}</span>
          )}
          <span className={`${styles.statusDot} status-dot online`} />
        </NavLink>
      </div>
    </header>
  );
}
