import { useQuery } from '@tanstack/react-query';
import { Server, Database, Activity, Settings, Cpu, RefreshCw, Save, ShieldAlert, Key, HardDrive, Terminal } from 'lucide-react';
import { serverApi, securityApi } from '../../api';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ServerPage() {
  const [activeTab, setActiveTab] = useState<'system' | 'audit'>('system');
  const [logFilter, setLogFilter] = useState<string>('all');

  const { data: info, isLoading } = useQuery({
    queryKey: ['server-info'],
    queryFn: () => serverApi.getInfo().then(r => r.data?.data || r.data),
    refetchInterval: 15000
  });

  const { data: settings = [], refetch: refetchSettings } = useQuery({
    queryKey: ['server-settings'],
    queryFn: () => serverApi.getSettings().then(r => r.data?.data || r.data || [])
  });

  const { data: dbStatus } = useQuery({
    queryKey: ['db-status'],
    queryFn: () => serverApi.getDatabaseStatus().then(r => r.data?.data || r.data),
    refetchInterval: 30000
  });

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['security-logs'],
    queryFn: () => securityApi.getLogs().then(r => r.data?.data || r.data || []),
    refetchInterval: 10000
  });

  const memUsed = info ? info.totalMemoryMB - info.freeMemoryMB : 0;
  const memPct = info ? (memUsed / info.totalMemoryMB) * 100 : 0;

  const formatBytes = (mb: number) => mb > 1024 ? `${(mb/1024).toFixed(1)} GB` : `${mb} MB`;
  const formatUptime = (s: number) => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return `${h}h ${m}m`; };

  // Filter logs
  const filteredLogs = logs.filter((log: any) => {
    if (logFilter === 'all') return true;
    return log.type === logFilter;
  });

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>🖥️ Server Administration</h1>
          <p>System metrics, platform settings, security audit logs, and hardware tracking</p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            refetchSettings();
            refetchLogs();
          }}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', gap: '16px', marginBottom: '-8px' }}>
        <button
          onClick={() => setActiveTab('system')}
          style={{ background: 'none', border: 'none', padding: '8px 12px', color: activeTab === 'system' ? 'var(--brand-primary)' : 'var(--text-tertiary)', borderBottom: activeTab === 'system' ? '2px solid var(--brand-primary)' : 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
        >
          ⚡ Performance & Settings
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{ background: 'none', border: 'none', padding: '8px 12px', color: activeTab === 'audit' ? 'var(--brand-primary)' : 'var(--text-tertiary)', borderBottom: activeTab === 'audit' ? '2px solid var(--brand-primary)' : 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🛡️ Security Audit Board
        </button>
      </div>

      {activeTab === 'system' ? (
        <>
          {/* Performance Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
            {[
              { label: 'Hostname', value: info?.hostname || '—', icon: Server, color: 'var(--brand-primary)' },
              { label: 'Platform', value: info?.platform || '—', icon: Cpu, color: 'var(--brand-info)' },
              { label: 'CPUs', value: info ? `${info.cpus} cores` : '—', icon: Cpu, color: 'var(--brand-success)' },
              { label: 'Node Version', value: info?.nodeVersion || '—', icon: Activity, color: 'var(--brand-accent)' },
              { label: 'Uptime', value: info ? formatUptime(info.uptimeSeconds) : '—', icon: RefreshCw, color: 'var(--brand-warning)' },
              { label: 'DB Size', value: dbStatus ? formatBytes(parseInt(dbStatus.sizeBytes) / 1024 / 1024) : '—', icon: Database, color: 'var(--brand-secondary)' },
            ].map((item, i) => (
              <div key={i} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                  <item.icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{isLoading ? <div className="skeleton" style={{ height: '16px', width: '60px' }} /> : item.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Memory Metrics */}
          {info && (
            <div className="card card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HardDrive size={16} style={{ color: 'var(--brand-primary)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Memory Utilized</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: memPct > 80 ? 'var(--brand-danger)' : memPct > 60 ? 'var(--brand-warning)' : 'var(--brand-success)' }}>
                  {memPct.toFixed(1)}%
                </span>
              </div>
              <div className="progress" style={{ height: '10px' }}>
                <div className="progress-bar" style={{ width: `${memPct}%`, background: memPct > 80 ? 'var(--gradient-danger)' : memPct > 60 ? 'var(--gradient-warning)' : 'var(--gradient-brand)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                <span>{formatBytes(memUsed)} used</span>
                <span>{formatBytes(info.totalMemoryMB)} total capacity</span>
              </div>
            </div>
          )}

          {/* System Settings Table */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>System Settings Matrix</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Configure company details, currency, and defaults</p>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead><tr><th>Key</th><th>Category</th><th>Value</th><th>Actions</th></tr></thead>
                <tbody>
                  {settings.length === 0 ? <tr><td colSpan={4}><div className="empty-state" style={{ padding: '48px' }}><Settings size={40} /><h3>No settings configured</h3></div></td></tr> :
                    settings.map((s: any) => <SettingRow key={s.key} setting={s} onSave={() => refetchSettings()} />)}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Real-time Security Audit board */
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={18} style={{ color: 'var(--brand-danger)' }} /> Security Audit Trails
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Permission audits, storage quotas, and folder sharing logs</p>
            </div>

            {/* Logs Filter Toolbar */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[
                { key: 'all', label: 'All Logs' },
                { key: 'access', label: '🔒 File Access' },
                { key: 'quota', label: '💾 Quotas' },
                { key: 'permission', label: '🔑 Permissions' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setLogFilter(f.key)}
                  className={`btn btn-sm ${logFilter === f.key ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Responsible Agent</th>
                  <th>Log Type</th>
                  <th>Security Event Message</th>
                  <th>Source IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state" style={{ padding: '48px' }}>
                        <Terminal size={40} style={{ opacity: 0.3 }} />
                        <h3>No matching security events</h3>
                        <p>Real-time audit trails will populate as coworkers interact with SMB shares</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                        {new Date(log.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td style={{ fontWeight: 600 }}>@{log.username}</td>
                      <td>
                        <span className={`badge badge-${log.type === 'access' ? 'info' : log.type === 'quota' ? 'primary' : 'warning'}`} style={{ fontSize: '10px' }}>
                          {log.type.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', fontWeight: 500 }}>{log.message}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-tertiary)' }}>{log.ipAddress}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({ setting, onSave }: any) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(setting.value || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try { await serverApi.updateSetting(setting.key, value); toast.success('Setting saved'); setEditing(false); onSave(); }
    catch { toast.error('Save failed'); }
    finally { setLoading(false); }
  };

  return (
    <tr>
      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--brand-primary)' }}>{setting.key}</td>
      <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{setting.category}</td>
      <td>
        {editing ? (
          <input type="text" className="form-control" value={value} onChange={e => setValue(e.target.value)} style={{ height: '30px', fontSize: '12px' }} />
        ) : (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{setting.value || '—'}</span>
        )}
      </td>
      <td>
        {editing ? (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={loading}><Save size={12} /></button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>✕</button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(true)}><Settings size={13} /></button>
        )}
      </td>
    </tr>
  );
}
