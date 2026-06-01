import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HardDrive, ShieldAlert, Users, Percent, ArrowUpRight, BarChart, Database, RefreshCw, Save } from 'lucide-react';
import { storageApi } from '../../api';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function StoragePage() {
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [quotaSlider, setQuotaSlider] = useState<number>(50); // Default to 50 GB

  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ['storage-metrics'],
    queryFn: () => storageApi.getMetrics().then(r => r.data?.data || r.data)
  });

  const updateQuotaMutation = useMutation({
    mutationFn: (variables: { loginId: string; limitBytes: number }) => storageApi.updateQuota(variables),
    onSuccess: () => {
      toast.success('Quota updated successfully');
      setSelectedUser(null);
      qc.invalidateQueries({ queryKey: ['storage-metrics'] });
    },
    onError: () => {
      toast.error('Failed to update quota limit');
    }
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleOpenSlider = (user: any) => {
    setSelectedUser(user);
    // Convert limitBytes to GB for slider scale (1GB to 200GB)
    const limitGb = Math.round(user.limitBytes / (1024 * 1024 * 1024));
    setQuotaSlider(limitGb || 50);
  };

  const handleSaveQuota = () => {
    if (!selectedUser) return;
    const limitBytes = quotaSlider * 1024 * 1024 * 1024;
    updateQuotaMutation.mutate({
      loginId: selectedUser.loginId,
      limitBytes
    });
  };

  const pctUsed = metrics ? (metrics.totalUsedBytes / metrics.totalLimitBytes) * 100 : 0;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>💾 Storage Administration</h1>
          <p>Configure drive capacities, monitor SMB shares, and manage user quotas</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {[
          { label: 'Total Capacity', value: metrics ? formatBytes(metrics.totalLimitBytes) : '—', icon: HardDrive, color: 'var(--brand-primary)' },
          { label: 'Space Occupied', value: metrics ? formatBytes(metrics.totalUsedBytes) : '—', icon: Database, color: 'var(--brand-warning)' },
          { label: 'Available Space', value: metrics ? formatBytes(metrics.freeBytes) : '—', icon: Database, color: 'var(--brand-success)' },
          { label: 'Active Shares', value: metrics ? `${metrics.users.length} Users` : '—', icon: Users, color: 'var(--brand-accent)' },
          { label: 'Disk Utilized', value: `${pctUsed.toFixed(1)}%`, icon: Percent, color: pctUsed > 80 ? 'var(--brand-danger)' : 'var(--brand-info)' },
        ].map((item, i) => (
          <div key={i} className="stat-card">
            <div className="stat-header">
              <span className="stat-label">{item.label}</span>
              <div className="stat-icon-wrapper" style={{ background: `${item.color}15`, color: item.color }}>
                <item.icon size={16} />
              </div>
            </div>
            <div className="stat-value">{isLoading ? <div className="skeleton" style={{ height: '24px', width: '80px' }} /> : item.value}</div>
          </div>
        ))}
      </div>

      {/* Drive Bar */}
      {metrics && (
        <div className="card card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><HardDrive size={15} style={{ color: 'var(--brand-primary)' }} /> SMB Storage Cluster Metrics</span>
            <span style={{ color: pctUsed > 80 ? 'var(--brand-danger)' : pctUsed > 60 ? 'var(--brand-warning)' : 'var(--brand-success)' }}>{pctUsed.toFixed(1)}% Utilized</span>
          </div>
          <div className="progress" style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
            <div className="progress-bar" style={{ width: `${pctUsed}%`, background: pctUsed > 80 ? 'var(--gradient-danger)' : pctUsed > 60 ? 'var(--gradient-warning)' : 'var(--gradient-brand)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>
            <span>{formatBytes(metrics.totalUsedBytes)} Used</span>
            <span>{formatBytes(metrics.freeBytes)} Free Space</span>
          </div>
        </div>
      )}

      {/* Main Grid: User allocation and quota panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px', alignItems: 'flex-start' }}>
        {/* Allocations Table */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Drive Allocations per User</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Adjust folder quotas for registered members</p>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Occupied Space</th>
                  <th>Quota Allocation</th>
                  <th>Usage Indicator</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center' }}>
                      <div className="spinner" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : metrics?.users.map((item: any) => {
                  const itemPct = (item.usedBytes / item.limitBytes) * 100;
                  return (
                    <tr key={item.userId}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.fullName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>@{item.loginId}</div>
                      </td>
                      <td>
                        <span className="badge badge-secondary" style={{ fontSize: '10px' }}>{item.roleName}</span>
                      </td>
                      <td style={{ fontSize: '12px', fontWeight: 600 }}>{formatBytes(item.usedBytes)}</td>
                      <td style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600 }}>{formatBytes(item.limitBytes)}</td>
                      <td style={{ width: '120px' }}>
                        <div className="progress" style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                          <div className="progress-bar" style={{ width: `${itemPct}%`, background: itemPct > 80 ? 'var(--brand-danger)' : 'var(--brand-primary)' }} />
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px', textAlign: 'right' }}>{itemPct.toFixed(1)}%</div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenSlider(item)}>Scale Quota</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quota slider side panel */}
        <div className="card card-body" style={{ minHeight: '360px', display: 'flex', flexDirection: 'column', justifyContent: selectedUser ? 'space-between' : 'center', alignItems: selectedUser ? 'stretch' : 'center', textAlign: selectedUser ? 'left' : 'center', gap: '20px' }}>
          {selectedUser ? (
            <>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HardDrive size={18} style={{ color: 'var(--brand-primary)' }} /> Adjust Storage Limit
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  Update maximum SMB limit allocated for **{selectedUser.fullName}**
                </p>
              </div>

              <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Selected limit:</span>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-primary)' }}>{quotaSlider} GB</span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={quotaSlider}
                  onChange={(e) => setQuotaSlider(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  <span>5 GB (Min)</span>
                  <span>200 GB (Max)</span>
                </div>
              </div>

              <div className="card" style={{ padding: '12px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--brand-primary)', marginBottom: '4px' }}>SMB Storage Path</div>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  \\gsv-office-smb\users\{selectedUser.loginId}-private
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleSaveQuota}
                  disabled={updateQuotaMutation.isPending}
                >
                  <Save size={14} /> Save Limit
                </button>
                <button className="btn btn-secondary" onClick={() => setSelectedUser(null)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-tertiary)', padding: '40px' }}>
              <HardDrive size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>No User Selected</h4>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>Select "Scale Quota" next to a user in the table to modify their allocated storage space.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
