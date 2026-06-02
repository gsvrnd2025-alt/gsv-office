import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, MessageSquare, FolderOpen, Ticket, Mail, Users,
  Shield, Receipt, Package, ShoppingCart, BarChart3, Puzzle, Server,
  ChevronLeft, ChevronRight, LogOut, Settings, Inbox, HardDrive, Laptop, Monitor
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { authApi, usersApi } from '../../api';
import styles from './Sidebar.module.css';

import logoImg from '../../assets/gsvlogo.png';

interface NavItem {
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  badge?: number;
  section?: string;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'main' },
  { to: '/workspace', icon: Laptop, label: 'Workspace', section: 'main' },
  { to: '/remote-desktop', icon: Monitor, label: 'Remote Desktop', section: 'main' },
  { to: '/chat', icon: MessageSquare, label: 'Team Chat', section: 'main' },
  { to: '/files', icon: FolderOpen, label: 'Files', section: 'main' },
  { to: '/tickets', icon: Ticket, label: 'Helpdesk', section: 'main' },
  { to: '/email', icon: Mail, label: 'Email', section: 'main' },
  { to: '/users', icon: Users, label: 'Users', section: 'admin' },
  { to: '/roles', icon: Shield, label: 'Roles & Access', section: 'admin' },
  { to: '/requests', icon: Inbox, label: 'Requests', section: 'admin' },
  { to: '/storage', icon: HardDrive, label: 'Storage Quotas', section: 'admin' },
  { to: '/billing', icon: Receipt, label: 'Billing', section: 'business' },
  { to: '/inventory', icon: Package, label: 'Inventory', section: 'business' },
  { to: '/purchase', icon: ShoppingCart, label: 'Purchase', section: 'business' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', section: 'business' },
  { to: '/plugins', icon: Puzzle, label: 'Plugins', section: 'system' },
  { to: '/server', icon: Server, label: 'Server Admin', section: 'system' },
];

const sections: { key: string; label: string }[] = [
  { key: 'main', label: 'Workspace' },
  { key: 'admin', label: 'Administration' },
  { key: 'business', label: 'Business' },
  { key: 'system', label: 'System' },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuthStore();

  const { data: pendingUsers } = useQuery({
    queryKey: ['users', '', 'pending', 1],
    queryFn: () => usersApi.getAll({ status: 'pending' }).then(r => r.data?.data || r.data || []),
    enabled: !!user && user.role?.name?.toLowerCase().includes('admin'),
    refetchInterval: 10000
  });

  const pendingCount = pendingUsers?.data ? pendingUsers.data.length : (Array.isArray(pendingUsers) ? pendingUsers.length : 0);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
  };

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        {!collapsed && (
          <div className={styles.logoIcon}>
            <img src={logoImg} alt="GSV Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          </div>
        )}
        {!collapsed && <span className={styles.logoText}>GSV Office</span>}
        <button className={styles.collapseBtn} onClick={onToggle} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {sections.map(section => {
          const items = navItems.filter(i => i.section === section.key).map(item => {
            if (item.to === '/requests') {
              return { ...item, badge: pendingCount > 0 ? pendingCount : undefined };
            }
            return item;
          });
          return (
            <div key={section.key} className={styles.navSection}>
              {!collapsed && <span className={styles.sectionLabel}>{section.label}</span>}
              {items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={styles.navIcon}><item.icon size={18} /></span>
                  {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                  {!collapsed && item.badge ? <span className={styles.badge}>{item.badge}</span> : null}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Bottom: User profile */}
      <div className={styles.userArea}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName} />
            ) : (
              <span>{initials}</span>
            )}
            <span className={`${styles.onlineDot} status-dot online`} />
          </div>
          {!collapsed && (
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user?.fullName}</span>
              <span className={styles.userRole}>{user?.role?.name}</span>
            </div>
          )}
        </div>
        <div className={styles.userActions}>
          <NavLink to="/profile" className={styles.actionBtn} title="Settings" onClick={onMobileClose}>
            <Settings size={16} />
          </NavLink>
          <button className={styles.actionBtn} onClick={handleLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
