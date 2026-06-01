import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, Receipt, Ticket, Package, Download } from 'lucide-react';
import { dashboardApi } from '../../api';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function AnalyticsPage() {
  const { data: revenue = [] } = useQuery({ queryKey: ['revenue'], queryFn: () => dashboardApi.getRevenue().then(r => r.data?.data || r.data || []) });
  const { data: tickets = [] } = useQuery({ queryKey: ['ticket-trends'], queryFn: () => dashboardApi.getTicketTrends().then(r => r.data?.data || r.data || []) });
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: () => dashboardApi.getStats().then(r => r.data?.data || r.data) });

  const kpis = [
    { label: 'Total Revenue', value: `₹${((stats?.billingStats?.total_revenue || 0) / 1000).toFixed(1)}K`, change: '+18%', up: true },
    { label: 'Active Users', value: stats?.userStats?.active || 0, change: '+5%', up: true },
    { label: 'Tickets Resolved', value: stats?.ticketStats?.resolved || 0, change: '+22%', up: true },
    { label: 'Products Tracked', value: stats?.inventoryStats?.total_products || 0, change: '+2', up: true },
  ];

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div><h1>📈 Analytics & Reports</h1><p>Business intelligence and insights</p></div>
        <button className="btn btn-secondary"><Download size={16} /> Export Report</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: '"Space Grotesk", sans-serif', color: 'var(--text-primary)' }}>{kpi.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{kpi.label}</div>
            <div style={{ fontSize: '11px', color: kpi.up ? 'var(--brand-success)' : 'var(--brand-danger)', marginTop: '6px', fontWeight: 600 }}>
              {kpi.up ? '↑' : '↓'} {kpi.change} vs last month
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <div className="card-header"><h3 style={{fontSize:'15px',fontWeight:700}}>Monthly Revenue (₹)</h3></div>
          <div className="card-body" style={{padding:'12px 20px'}}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenue.length ? revenue : mockRevenue}>
                <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{fontSize:10,fill:'var(--text-tertiary)'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10,fill:'var(--text-tertiary)'}} axisLine={false} tickLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border-color)',borderRadius:'10px',fontSize:'12px'}} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#ag)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 style={{fontSize:'15px',fontWeight:700}}>Ticket Resolution Trend</h3></div>
          <div className="card-body" style={{padding:'12px 20px'}}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={tickets.length ? tickets : mockTickets}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" tick={{fontSize:9,fill:'var(--text-tertiary)'}} tickFormatter={d=>d?.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10,fill:'var(--text-tertiary)'}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border-color)',borderRadius:'10px',fontSize:'12px'}} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} name="Total" />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={false} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const mockRevenue = [{ month:'Jan',revenue:45000 },{ month:'Feb',revenue:52000 },{ month:'Mar',revenue:61000 },{ month:'Apr',revenue:55000 },{ month:'May',revenue:67000 },{ month:'Jun',revenue:72000 }];
const mockTickets = Array.from({length:14},(_,i)=>({ date: new Date(Date.now()-(13-i)*86400000).toISOString().split('T')[0], total: Math.floor(Math.random()*8)+2, resolved: Math.floor(Math.random()*5)+1 }));
