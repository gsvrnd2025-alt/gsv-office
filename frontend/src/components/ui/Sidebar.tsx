import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, MessageSquare, FolderOpen, Ticket, Mail, Users,
  Shield, Receipt, Package, ShoppingCart, BarChart3, Puzzle, Server,
  ChevronLeft, ChevronRight, LogOut, Settings, Inbox, HardDrive, Laptop, Monitor, Download
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
  module?: string;
  action?: string;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'main' },
  { to: '/workspace', icon: Laptop, label: 'Workspace', section: 'main' },
  { to: '/remote-desktop', icon: Monitor, label: 'Remote Desktop', section: 'main', module: 'chat', action: 'read' },
  { to: '/chat', icon: MessageSquare, label: 'Team Chat', section: 'main', module: 'chat', action: 'read' },
  { to: '/files', icon: FolderOpen, label: 'Files', section: 'main', module: 'files', action: 'read' },
  { to: '/tickets', icon: Ticket, label: 'Helpdesk', section: 'main', module: 'tickets', action: 'read' },
  { to: '/email', icon: Mail, label: 'Email', section: 'main', module: 'email', action: 'read' },
  { to: '/downloads', icon: Download, label: 'Downloads & App', section: 'main' },
  { to: '/users', icon: Users, label: 'Users', section: 'admin', module: 'users', action: 'read' },
  { to: '/roles', icon: Shield, label: 'Roles & Access', section: 'admin', module: 'roles', action: 'read' },
  { to: '/requests', icon: Inbox, label: 'Requests', section: 'admin', module: 'users', action: 'update' },
  { to: '/storage', icon: HardDrive, label: 'Storage Quotas', section: 'admin', module: 'server', action: 'view' },
  { to: '/billing', icon: Receipt, label: 'Billing', section: 'business', module: 'billing', action: 'read' },
  { to: '/inventory', icon: Package, label: 'Inventory', section: 'business', module: 'inventory', action: 'read' },
  { to: '/purchase', icon: ShoppingCart, label: 'Purchase', section: 'business', module: 'purchase', action: 'read' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', section: 'business', module: 'dashboard', action: 'view_financials' },
  { to: '/plugins', icon: Puzzle, label: 'Plugins', section: 'system', module: 'plugins', action: 'read' },
  { to: '/server', icon: Server, label: 'Server Admin', section: 'system', module: 'server', action: 'view' },
];

const sections: { key: string; label: string }[] = [
  { key: 'main', label: 'Workspace' },
  { key: 'admin', label: 'Administration' },
  { key: 'business', label: 'Business' },
  { key: 'system', label: 'System' },
];

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

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
  hiddenCompletely?: boolean;
}

export function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose, hiddenCompletely }: SidebarProps) {
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
    <aside 
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}
      style={hiddenCompletely ? { transform: 'translateX(-100%)', width: 0, borderRight: 'none', transition: 'width 0.25s, transform 0.25s' } : undefined}
    >
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
              {!collapsed && <span className={section.key === 'main' ? styles.sectionLabel : styles.sectionLabel}>{section.label}</span>}
              {items.map(item => {
                const isLocked = item.module && item.action && !hasPermission(user, item.module, item.action);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                    onClick={onMobileClose}
                    title={collapsed ? item.label + (isLocked ? ' (Locked)' : '') : undefined}
                    style={isLocked ? { opacity: 0.65 } : undefined}
                  >
                    <span className={styles.navIcon}><item.icon size={18} /></span>
                    {!collapsed && <span className={styles.navLabel} style={isLocked ? { color: 'var(--text-secondary)' } : undefined}>{item.label}</span>}
                    {!collapsed && isLocked && (
                      <span style={{ fontSize: '11px', marginLeft: 'auto', opacity: 0.7 }} title="Access Locked">
                        🔒
                      </span>
                    )}
                    {!collapsed && item.badge ? <span className={styles.badge}>{item.badge}</span> : null}
                  </NavLink>
                );
              })}
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
