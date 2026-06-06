import { Menu, Bell, Sun, Moon, Search, Check, X } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, chatApi, usersApi } from '../../api';
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'chats' | 'system'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const navigate = useNavigate();

  // Queries for global search
  const { data: conversationsData } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.getConversations().then(r => r.data?.data || r.data || []),
    refetchInterval: 5000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', '', '', 1],
    queryFn: () => usersApi.getDirectory().then(r => r.data?.data || r.data || []),
  });

  const systemPages = [
    { title: 'Dashboard / Home', path: '/dashboard', keywords: ['home', 'dashboard', 'main', 'index'] },
    { title: 'Document Workspace', path: '/workspace', keywords: ['workspace', 'document', 'editor', 'compiler', 'notes', 'sticky'] },
    { title: 'Remote Desktop', path: '/remote-desktop', keywords: ['remote', 'desktop', 'rdp', 'vnc', 'connection'] },
    { title: 'Team Chat Rooms', path: '/chat', keywords: ['chat', 'message', 'team', 'dm', 'channel', 'group'] },
    { title: 'File Manager / Cloud', path: '/files', keywords: ['files', 'cloud', 'storage', 'folders', 'documents', 'photos'] },
    { title: 'Helpdesk Tickets', path: '/tickets', keywords: ['tickets', 'helpdesk', 'support', 'issues', 'bugs'] },
    { title: 'Email Inbox / Mail', path: '/email', keywords: ['email', 'mail', 'inbox', 'send', 'compose'] },
    { title: 'Users Directory', path: '/users', keywords: ['users', 'directory', 'teammates', 'employees', 'admin'] },
    { title: 'Roles & Access', path: '/roles', keywords: ['roles', 'permissions', 'access', 'security'] },
    { title: 'Requests Approval', path: '/requests', keywords: ['requests', 'approval', 'access requests'] },
    { title: 'ZFS Storage Quotas', path: '/storage', keywords: ['storage', 'quotas', 'zfs', 'disk'] },
    { title: 'Billing & GST Invoices', path: '/billing', keywords: ['billing', 'invoices', 'gst', 'tax', 'payments'] },
    { title: 'Inventory Management', path: '/inventory', keywords: ['inventory', 'products', 'stock', 'warehouse'] },
    { title: 'Purchase Orders', path: '/purchase', keywords: ['purchase', 'orders', 'supply', 'vendors'] },
    { title: 'System Analytics', path: '/analytics', keywords: ['analytics', 'charts', 'reports', 'usage'] },
    { title: 'App Plugins Manager', path: '/plugins', keywords: ['plugins', 'manager', 'extensions'] },
    { title: 'Server Administration', path: '/server', keywords: ['server', 'admin', 'docker', 'terminal', 'logs'] },
    { title: 'My Account Profile', path: '/profile', keywords: ['profile', 'account', 'settings', 'avatar'] },
  ];

  // Hotkey listener Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInputEl = document.getElementById('global-search-input');
        searchInputEl?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const normalizedQuery = searchQuery.toLowerCase().trim();

  // Extract a clean query by removing generic action/type words
  const cleanQuery = normalizedQuery
    .replace(/\b(chat|room|dm|message|msg|contact|teammate|user|people|page|screen|view|go|to|open|show|app|link)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Get matching pages
  const matchingPages = normalizedQuery === '' ? [] : systemPages.filter(p => {
    const title = p.title.toLowerCase();
    const matchesFull = title.includes(normalizedQuery) || p.keywords.some(k => k.includes(normalizedQuery));
    const matchesClean = cleanQuery !== '' && (title.includes(cleanQuery) || p.keywords.some(k => k.includes(cleanQuery)));
    return matchesFull || matchesClean;
  });

  // Get matching chats
  const conversations = conversationsData || [];
  const matchingChats = normalizedQuery === '' ? [] : conversations.filter((c: any) => {
    const nameLower = (c.name || '').toLowerCase();
    const descLower = (c.description || '').toLowerCase();
    const matchesFull = nameLower.includes(normalizedQuery) || descLower.includes(normalizedQuery);
    const matchesClean = cleanQuery !== '' && (nameLower.includes(cleanQuery) || descLower.includes(cleanQuery));
    return matchesFull || matchesClean;
  });

  // Get matching users
  const users = usersData?.data ? usersData.data : (Array.isArray(usersData) ? usersData : []);
  const otherUsers = users.filter((u: any) => u.id !== user?.id);
  const matchingUsers = normalizedQuery === '' ? [] : otherUsers.filter((u: any) => {
    const fullNameLower = (u.fullName || '').toLowerCase();
    const loginIdLower = (u.loginId || '').toLowerCase();
    const deptLower = (u.department?.name || '').toLowerCase();
    
    const matchesFull = fullNameLower.includes(normalizedQuery) ||
                        loginIdLower.includes(normalizedQuery) ||
                        deptLower.includes(normalizedQuery);
                        
    const matchesClean = cleanQuery !== '' && 
                         (fullNameLower.includes(cleanQuery) ||
                          loginIdLower.includes(cleanQuery) ||
                          deptLower.includes(cleanQuery));
                          
    return matchesFull || matchesClean;
  });

  // Combine suggestions
  const suggestions = [
    ...matchingPages.map(p => ({
      title: p.title,
      category: 'System Page 🖥️',
      action: () => { navigate(p.path); setSearchQuery(''); setShowSearchDropdown(false); }
    })),
    ...matchingChats.map((c: any) => ({
      title: c.name || `Chat with ${c.type}`,
      category: 'Active Chat 💬',
      action: () => { navigate(`/chat/${c.id}`); setSearchQuery(''); setShowSearchDropdown(false); }
    })),
    ...matchingUsers.map((u: any) => ({
      title: `${u.fullName} (${u.department?.name || 'LocalTeammate'})`,
      category: 'Teammate Contact 👥',
      action: () => { navigate(`/chat?userId=${u.id}`); setSearchQuery(''); setShowSearchDropdown(false); }
    }))
  ].slice(0, 10);

  // Queries
  const { data: notifCountData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => notificationsApi.getCount().then(r => r.data?.data || r.data || { count: 0 }),
    refetchInterval: 10000,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.get({ unreadOnly: 'true' }).then(r => r.data?.data || r.data || []),
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

  const markAllChatsRead = async () => {
    try {
      const unread = conversations.filter((c: any) => (Number(c.unread_count) || 0) > 0);
      if (unread.length === 0) return;
      
      await Promise.all(unread.map((c: any) => chatApi.markRead(c.id)));
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['global-conversations-unread'] });
      toast.success('All chats marked as read! 💬');
    } catch (err) {
      toast.error('Failed to mark all chats as read');
    }
  };



  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const location = useLocation();
  const isChatPage = location.pathname.startsWith('/chat');

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
      {!isChatPage && (
        <div className={styles.center} style={{ position: 'relative' }}>
          <div className={styles.searchBar}>
            <Search size={15} className={styles.searchIcon} />
            <input
              id="global-search-input"
              type="text"
              placeholder="Search anything... (Ctrl+K)"
              className={styles.searchInput}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 250)}
              autoComplete="off"
            />
            <kbd className={styles.searchKbd}>⌘K</kbd>
          </div>

          {/* Premium global search dropdown suggestions list */}
          {showSearchDropdown && normalizedQuery.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
              background: 'rgba(26, 21, 44, 0.96)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', zIndex: 1200,
              maxHeight: '320px', overflowY: 'auto', padding: '6px 0', backdropFilter: 'blur(20px)',
              animation: 'slideUp 0.2s ease', borderTop: '2px solid var(--brand-primary)'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-primary)', padding: '6px 16px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                🔍 Global Search Results ({suggestions.length})
              </div>
              {suggestions.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--text-tertiary)', fontSize: '11px', textAlign: 'center' }}>
                  No pages, chats or contacts matching "{searchQuery}"
                </div>
              ) : (
                suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => { e.preventDefault(); s.action(); }}
                    style={{
                      padding: '10px 16px', cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                    className="dropdown-item"
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{s.title}</span>
                    <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--brand-primary)' }}>
                      {s.category}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Right */}
      {!isChatPage && (
        <div className={styles.right}>
          {/* Theme toggle */}
          <button className={styles.iconBtn} onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            {(() => {
              const unreadChats = conversations.filter((c: any) => (Number(c.unread_count) || 0) > 0);
              const unreadChatSum = unreadChats.reduce((acc: number, c: any) => acc + (Number(c.unread_count) || 0), 0);
              const totalCombinedNotifCount = notifCount + unreadChatSum;

              return (
                <>
                  <button
                    className={styles.iconBtn}
                    onClick={() => setShowNotifications(!showNotifications)}
                    title="Notifications"
                    style={{ position: 'relative', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', color: 'var(--text-secondary)' }}
                  >
                    <Bell size={18} />
                    {totalCombinedNotifCount > 0 && (
                      <span style={{
                        position: 'absolute', top: '2px', right: '2px',
                        background: 'var(--brand-danger)', color: 'white',
                        fontSize: '9px', fontWeight: 700, padding: '2px 4px',
                        borderRadius: '8px', lineHeight: 1, minWidth: '14px', textAlign: 'center'
                      }}>
                        {totalCombinedNotifCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="animate-scale-in" style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                      width: '320px', background: 'rgba(26, 21, 44, 0.96)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.6)', zIndex: 1000,
                      padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px',
                      backdropFilter: 'blur(20px)'
                    }}>
                      {/* Tab toggles */}
                      <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setActiveNotifTab('chats')}
                          style={{
                            flex: 1, padding: '6px', fontSize: '11px', fontWeight: 700, border: 0, borderRadius: '6px',
                            background: activeNotifTab === 'chats' ? 'var(--brand-primary)' : 'transparent',
                            color: '#fff', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          Chats ({unreadChatSum})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveNotifTab('system')}
                          style={{
                            flex: 1, padding: '6px', fontSize: '11px', fontWeight: 700, border: 0, borderRadius: '6px',
                            background: activeNotifTab === 'system' ? 'var(--brand-primary)' : 'transparent',
                            color: '#fff', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          System ({notifCount})
                        </button>
                      </div>

                      {/* Chats tab: WhatsApp style grouped unread chats */}
                      {activeNotifTab === 'chats' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '250px', overflowY: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Grouped Chats</span>
                            {unreadChatSum > 0 && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '1px 5px', fontSize: '9px', height: 'auto', border: 0, background: 'transparent', color: 'var(--brand-primary)', cursor: 'pointer' }}
                                onClick={markAllChatsRead}
                              >
                                Mark all read
                              </button>
                            )}
                          </div>
                          {unreadChats.length === 0 ? (
                            <div style={{ padding: '24px 16px', color: 'var(--text-tertiary)', fontSize: '11px', textAlign: 'center' }}>
                              🟢 No unread messages
                            </div>
                          ) : (
                            unreadChats.map((c: any) => (
                              <div
                                key={c.id}
                                onClick={() => {
                                  navigate(`/chat/${c.id}`);
                                  setShowNotifications(false);
                                }}
                                style={{
                                  padding: '10px', background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid rgba(255, 255, 255, 0.05)',
                                  borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s',
                                  display: 'flex', alignItems: 'center', gap: '10px'
                                }}
                                className="hover-glass"
                              >
                                {/* Mini Letter Avatar */}
                                <div style={{
                                  width: '32px', height: '32px', borderRadius: '50%',
                                  background: 'var(--brand-primary)', color: '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 700, fontSize: '12px', flexShrink: 0
                                }}>
                                  {c.name ? c.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong style={{ fontSize: '12px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {c.name || 'Private Chat'}
                                    </strong>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <button
                                        type="button"
                                        title="Mark read"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          chatApi.markRead(c.id).then(() => {
                                            qc.invalidateQueries({ queryKey: ['conversations'] });
                                            qc.invalidateQueries({ queryKey: ['global-conversations-unread'] });
                                          });
                                        }}
                                        style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--brand-success)', display: 'flex', alignItems: 'center' }}
                                      >
                                        <Check size={12} />
                                      </button>
                                      <span style={{
                                        background: 'var(--brand-danger)', color: 'white',
                                        fontSize: '9px', fontWeight: 700, padding: '2px 6px',
                                        borderRadius: '8px', minWidth: '16px', textAlign: 'center'
                                      }}>
                                        {c.unread_count}
                                      </span>
                                    </div>
                                  </div>
                                  <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {c.last_message_preview || 'No messages yet'}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* System tab: standard system notifications */}
                      {activeNotifTab === 'system' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '250px', overflowY: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Workspace Alerts</span>
                            {notifCount > 0 && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '1px 5px', fontSize: '9px', height: 'auto', border: 0 }}
                                onClick={() => markAllReadMutation.mutate()}
                              >
                                Mark all read
                              </button>
                            )}
                          </div>
                          {notifications.length === 0 ? (
                            <div style={{ padding: '24px 16px', color: 'var(--text-tertiary)', fontSize: '11px', textAlign: 'center' }}>
                              No system alerts
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
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', flex: 1, marginRight: '8px' }}>{n.title}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {!n.isRead && (
                                      <button
                                        type="button"
                                        title="Mark read"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markReadMutation.mutate(n.id);
                                        }}
                                        style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--brand-success)', display: 'flex', alignItems: 'center' }}
                                      >
                                        <Check size={12} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      title="Close alert"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markReadMutation.mutate(n.id);
                                      }}
                                      style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                                <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{n.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
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
      )}
    </header>
  );
}
