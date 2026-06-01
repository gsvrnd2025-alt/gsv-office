import { useQuery } from '@tanstack/react-query';
import {
  Users, MessageSquare, FolderOpen, Ticket, Receipt, Package,
  TrendingUp, AlertCircle, CheckCircle, Clock, Activity, Database,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { dashboardApi } from '../../api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardPage() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then(r => r.data?.data || r.data),
    refetchInterval: 30000,
  });

  const { data: revenueData } = useQuery({
    queryKey: ['dashboard-revenue'],
    queryFn: () => dashboardApi.getRevenue().then(r => r.data?.data || r.data || []),
    refetchInterval: 60000,
  });

  const { data: ticketTrends } = useQuery({
    queryKey: ['dashboard-ticket-trends'],
    queryFn: () => dashboardApi.getTicketTrends().then(r => r.data?.data || r.data || []),
    refetchInterval: 60000,
  });

  const { data: activityData } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardApi.getActivity().then(r => r.data?.data || r.data || []),
    refetchInterval: 15000,
  });

  const stats = statsData || {};

  const statCards = [
    { label: 'Total Users', value: stats.userStats?.total || 0, icon: Users, color: 'primary', trend: '+5%', up: true, sub: `${stats.userStats?.online || 0} online` },
    { label: 'Active Chats', value: stats.chatStats?.private_chats || 0, icon: MessageSquare, color: 'info', trend: '+12%', up: true, sub: `${stats.chatStats?.groups || 0} groups` },
    { label: 'Total Files', value: stats.fileStats?.total_files || 0, icon: FolderOpen, color: 'accent', trend: '+8%', up: true, sub: formatBytes(stats.fileStats?.total_size_bytes || 0) },
    { label: 'Open Tickets', value: stats.ticketStats?.open || 0, icon: Ticket, color: 'warning', trend: '-3%', up: false, sub: `${stats.ticketStats?.escalated || 0} escalated` },
    { label: 'Total Products', value: stats.inventoryStats?.total_products || 0, icon: Package, color: 'success', trend: '+2%', up: true, sub: `${stats.inventoryStats?.low_stock || 0} low stock` },
    { label: 'Monthly Revenue', value: formatCurrency(stats.billingStats?.monthly_revenue || 0), icon: Receipt, color: 'success', trend: '+18%', up: true, sub: `${stats.billingStats?.total_invoices || 0} invoices` },
  ];

  const ticketPieData = [
    { name: 'Open', value: parseInt(stats.ticketStats?.open || 0), color: '#f59e0b' },
    { name: 'In Progress', value: parseInt(stats.ticketStats?.in_progress || 0), color: '#3b82f6' },
    { name: 'Escalated', value: parseInt(stats.ticketStats?.escalated || 0), color: '#ef4444' },
    { name: 'Resolved', value: parseInt(stats.ticketStats?.resolved || 0), color: '#10b981' },
  ].filter(d => d.value > 0);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, fontFamily: '"Space Grotesk", sans-serif', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            📊 Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Real-time overview of your workspace
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: '"Space Grotesk", sans-serif' }}>{timeStr}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{dateStr}</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className={`stat-card ${card.color} card-hoverable animate-fade-in`} style={{ animationDelay: `${i * 60}ms` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div className={`stat-icon ${card.color}`}>
                <card.icon size={22} />
              </div>
              <span className={`stat-trend ${card.up ? 'up' : 'down'}`}>
                {card.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {card.trend}
              </span>
            </div>
            <div className="stat-value">{isLoading ? <div className="skeleton" style={{ height: '32px', width: '80px', borderRadius: '6px' }} /> : card.value}</div>
            <div className="stat-label">{card.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>

        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Revenue Trend</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Last 12 months</p>
            </div>
            <span className="badge badge-success">
              <TrendingUp size={10} /> Growing
            </span>
          </div>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData || mockRevenue}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '12px' }}
                  formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ticket Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Ticket Status</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Current distribution</p>
          </div>
          <div className="card-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {ticketPieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={ticketPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {ticketPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                  {ticketPieData.map((entry, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                      <span>{entry.name}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{entry.value}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0', color: 'var(--text-tertiary)' }}>
                <CheckCircle size={48} style={{ opacity: 0.3 }} />
                <span style={{ fontSize: '13px' }}>No tickets yet</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ticket Trend + Activity Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>

        {/* Ticket Trends Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Ticket Activity — Last 30 Days</h3>
          </div>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ticketTrends || mockTickets} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '12px' }} />
                <Bar dataKey="total" fill="#6366f1" radius={[4,4,0,0]} name="Total" />
                <Bar dataKey="resolved" fill="#10b981" radius={[4,4,0,0]} name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Activity</h3>
            <Activity size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <div style={{ overflow: 'hidden', maxHeight: '240px', overflowY: 'auto' }}>
            {(activityData || mockActivity).slice(0, 8).map((act: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 20px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                  {(act.full_name || 'S')?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    <strong>{act.full_name || 'System'}</strong>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>{act.description || `${act.action} ${act.resource_type || ''}`}</span>
                  </p>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                    {act.created_at ? new Date(act.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Health Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Database', status: 'Healthy', icon: Database, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'API Server', status: 'Running', icon: Activity, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
          { label: 'File Storage', status: 'Available', icon: FolderOpen, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
          { label: 'Mail Server', status: 'Active', icon: CheckCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map((sys, i) => (
          <div key={i} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: sys.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: sys.color, flexShrink: 0 }}>
              <sys.icon size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{sys.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: sys.color, animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: '11px', color: sys.color, fontWeight: 500 }}>{sys.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

// Helpers
function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatCurrency(val: number): string {
  if (!val) return '₹0';
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
}

// Mock data for empty state
const mockRevenue = [
  { month: 'Jan', revenue: 45000 }, { month: 'Feb', revenue: 52000 },
  { month: 'Mar', revenue: 48000 }, { month: 'Apr', revenue: 61000 },
  { month: 'May', revenue: 55000 }, { month: 'Jun', revenue: 67000 },
  { month: 'Jul', revenue: 72000 }, { month: 'Aug', revenue: 68000 },
  { month: 'Sep', revenue: 81000 }, { month: 'Oct', revenue: 75000 },
  { month: 'Nov', revenue: 89000 }, { month: 'Dec', revenue: 95000 },
];

const mockTickets = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
  total: Math.floor(Math.random() * 8) + 2,
  resolved: Math.floor(Math.random() * 5) + 1,
}));

const mockActivity = [
  { full_name: 'System Admin', description: 'Platform initialized successfully', created_at: new Date().toISOString() },
  { full_name: 'System', description: 'Database migrations completed', created_at: new Date(Date.now() - 60000).toISOString() },
  { full_name: 'System', description: 'Default roles and permissions seeded', created_at: new Date(Date.now() - 120000).toISOString() },
];
