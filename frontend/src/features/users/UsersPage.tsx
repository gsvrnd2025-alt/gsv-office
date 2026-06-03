import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, MoreVertical, Edit, Trash2, Lock, 
  UserX, UserCheck, RefreshCw, X, HardDrive, Database, Clock, Key, Settings 
} from 'lucide-react';
import { usersApi, rolesApi, departmentsApi, storageApi, serverApi } from '../../api';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  active: 'success', inactive: 'warning', blocked: 'danger', pending: 'secondary'
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showSheetsSettings, setShowSheetsSettings] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<any>(null);
  const [userQuotaLimit, setUserQuotaLimit] = useState<number>(10);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, statusFilter, page],
    queryFn: () => usersApi.getAll({ search, status: statusFilter || undefined, page, limit: 15 }).then(r => r.data),
  });

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => rolesApi.getAll().then(r => r.data?.data || r.data || []) });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.getAll().then(r => r.data?.data || r.data || []) });

  const { data: allUsersData = [] } = useQuery({
    queryKey: ['users-list-all'],
    queryFn: () => usersApi.getAll({ limit: 1000 }).then(r => r.data?.data?.data || r.data?.data || r.data || []),
  });

  const { data: settings = [] } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => serverApi.getSettings().then(r => r.data?.data || r.data || []),
  });

  const { data: userLogs = [] } = useQuery({
    queryKey: ['user-logs', selectedUserForDetail?.id],
    queryFn: () => usersApi.getUserLogs(selectedUserForDetail!.id).then(r => r.data?.data || r.data || []),
    enabled: !!selectedUserForDetail?.id,
  });

  useEffect(() => {
    if (selectedUserForDetail) {
      const quotaBytes = selectedUserForDetail.metadata?.storageQuotaBytes || (10 * 1024 * 1024 * 1024);
      setUserQuotaLimit(Math.round(quotaBytes / (1024 * 1024 * 1024)));
    }
  }, [selectedUserForDetail]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { 
      toast.success('User deleted'); 
      setSelectedUserForDetail(null);
      qc.invalidateQueries({ queryKey: ['users'] }); 
    },
    onError: () => toast.error('Delete failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => usersApi.updateStatus(id, status),
    onSuccess: (res: any, variables: any) => { 
      toast.success('Status updated'); 
      qc.invalidateQueries({ queryKey: ['users'] }); 
      if (selectedUserForDetail && selectedUserForDetail.id === variables.id) {
        setSelectedUserForDetail((prev: any) => ({ ...prev, status: variables.status }));
      }
    },
    onError: () => toast.error('Update failed'),
  });

  const resetPwdMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => usersApi.resetPassword(id, { newPassword: 'TempPass@123' }),
    onSuccess: () => toast.success('Password reset to: TempPass@123'),
    onError: () => toast.error('Reset failed'),
  });

  const quotaMutation = useMutation({
    mutationFn: (variables: { loginId: string; limitBytes: number }) => storageApi.updateQuota(variables),
    onSuccess: () => {
      toast.success('Storage quota updated successfully!');
      qc.invalidateQueries({ queryKey: ['users'] });
      if (selectedUserForDetail) {
        setSelectedUserForDetail((prev: any) => ({
          ...prev,
          metadata: {
            ...prev.metadata,
            storageQuotaBytes: userQuotaLimit * 1024 * 1024 * 1024
          }
        }));
      }
    },
    onError: () => toast.error('Failed to update storage quota'),
  });

  const saveSettingMutation = useMutation({
    mutationFn: (variables: { key: string; value: string }) => serverApi.updateSetting(variables.key, variables.value),
  });

  const [syncing, setSyncing] = useState(false);
  const syncMutation = useMutation({
    mutationFn: () => usersApi.syncSheets(),
    onMutate: () => { setSyncing(true); },
    onSuccess: () => {
      toast.success('Google Sheet synchronization successful');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['roles'] });
      qc.invalidateQueries({ queryKey: ['departments'] });
      if (selectedUserForDetail) setSelectedUserForDetail(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Sync failed');
    },
    onSettled: () => { setSyncing(false); }
  });

  const users = data?.data ? data.data : (Array.isArray(data) ? data : []);
  const meta = Array.isArray(data) ? { total: data.length, page: 1, limit: 15, totalPages: 1 } : (data?.meta || {});

  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleSaveQuota = () => {
    if (!selectedUserForDetail) return;
    quotaMutation.mutate({
      loginId: selectedUserForDetail.loginId,
      limitBytes: userQuotaLimit * 1024 * 1024 * 1024
    });
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>👥 User Management</h1>
          <p>Manage team members, roles, and access</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => syncMutation.mutate()} disabled={syncing} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing...' : 'Sync Google Sheet'}
          </button>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => setShowSheetsSettings(true)}
            title="Google Sheets Settings"
            style={{ width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Settings size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-tertiary)' }} />
            <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
              className="form-control" style={{ paddingLeft: '36px' }} />
          </div>
          <select className="form-control" style={{ width: '160px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
          </select>
          <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
            Total: <strong style={{ color: 'var(--text-primary)' }}>{meta.total || 0}</strong>
          </div>
        </div>
      </div>

      {/* Main content grid (supporting detail panel) */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', width: '100%' }}>
        {/* Table */}
        <div className="card" style={{ flex: 1, minWidth: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Last Seen</th>
                  <th style={{ width: '60px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: '16px', width: '80%' }} /></td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state" style={{ padding: '48px' }}>
                      <div style={{ fontSize: '48px' }}>👥</div>
                      <h3>No users found</h3>
                      <p>Create your first user to get started</p>
                    </div>
                  </td></tr>
                ) : (
                  users.map((u: any) => (
                    <tr key={u.id} onClick={() => setSelectedUserForDetail(u)} style={{ cursor: 'pointer', background: selectedUserForDetail?.id === u.id ? 'var(--bg-selected)' : undefined }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar" style={{ background: u.avatarUrl ? 'none' : 'var(--gradient-brand)' }}>
                            {u.avatarUrl ? <img src={u.avatarUrl} alt={u.fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials(u.fullName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{u.fullName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{u.employeeId}</td>
                      <td>
                        <span className="badge badge-primary" style={{ background: u.role?.color ? `${u.role.color}22` : undefined, color: u.role?.color }}>
                          {u.role?.name || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{u.department?.name || '—'}</td>
                      <td>
                        <span className={`badge badge-${STATUS_COLORS[u.status] || 'secondary'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        {u.isOnline ? <span style={{ color: 'var(--brand-success)' }}>🟢 Online</span> : (u.lastSeen ? new Date(u.lastSeen).toLocaleDateString('en-IN') : 'Never')}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditUser(u)} title="Edit"><Edit size={14} /></button>
                          <UserActionMenu user={u} onStatus={(status: string) => statusMutation.mutate({ id: u.id, status })} onReset={() => resetPwdMutation.mutate({ id: u.id })} onDelete={() => { if (confirm(`Delete ${u.fullName}?`)) deleteMutation.mutate(u.id); }} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="card-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Page {meta.page} of {meta.totalPages}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn btn-secondary btn-sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* User Detail Side Drawer */}
        {selectedUserForDetail && (
          <div className="card animate-fade-in" style={{ width: '400px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', border: '1px solid var(--border-color)', minHeight: '520px', position: 'sticky', top: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>User Profile Details</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedUserForDetail(null)}><X size={16} /></button>
            </div>

            {/* Profile Block */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-brand)', color: 'white', fontWeight: 'bold', fontSize: '20px' }}>
                {selectedUserForDetail.avatarUrl ? <img src={selectedUserForDetail.avatarUrl} alt={selectedUserForDetail.fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials(selectedUserForDetail.fullName)}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedUserForDetail.fullName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{selectedUserForDetail.loginId} • {selectedUserForDetail.email}</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <span className="badge badge-primary" style={{ fontSize: '10px' }}>{selectedUserForDetail.role?.name || 'User'}</span>
                  <span className="badge badge-secondary" style={{ fontSize: '10px' }}>{selectedUserForDetail.department?.name || 'No Dept'}</span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '12px 0' }}>
              <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => setEditUser(selectedUserForDetail)}>
                <Edit size={13} /> Edit Profile
              </button>
              <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} onClick={() => resetPwdMutation.mutate({ id: selectedUserForDetail.id })}>
                <Key size={13} /> Reset Pass
              </button>
              <button 
                className={`btn btn-sm ${selectedUserForDetail.status === 'blocked' ? 'btn-primary' : 'btn-outline-danger'}`} 
                onClick={() => statusMutation.mutate({ id: selectedUserForDetail.id, status: selectedUserForDetail.status === 'blocked' ? 'active' : 'blocked' })}
              >
                {selectedUserForDetail.status === 'blocked' ? 'Unblock Account' : 'Block Teammate'}
              </button>
              <button 
                className="btn btn-secondary btn-sm danger" 
                onClick={() => { if (confirm(`Delete ${selectedUserForDetail.fullName}?`)) deleteMutation.mutate(selectedUserForDetail.id); }}
              >
                <Trash2 size={13} /> Delete User
              </button>
            </div>

            {/* Storage Quota Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><HardDrive size={14} style={{ color: 'var(--brand-primary)' }} /> SMB Quota Cap</span>
                <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>{userQuotaLimit} GB</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                step="5"
                value={userQuotaLimit}
                onChange={(e) => setUserQuotaLimit(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
              />
              <button className="btn btn-primary btn-xs" style={{ alignSelf: 'flex-end', display: 'flex', gap: '4px', alignItems: 'center' }} onClick={handleSaveQuota} disabled={quotaMutation.isPending}>
                <Database size={12} /> Apply Quota
              </button>
            </div>

            {/* Audit Logs History */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '220px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} /> User Activity History
              </div>
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '240px', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                {userLogs.length === 0 ? (
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '11px', textAlign: 'center', padding: '24px 0' }}>No activity records found</div>
                ) : (
                  userLogs.map((log: any) => (
                    <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'var(--bg-secondary)', borderRadius: '6px', padding: '8px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '10px' }}>
                        <span style={{ textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--brand-primary)' }}>{log.action}</span>
                        <span>{new Date(log.createdAt || log.created_at).toLocaleDateString('en-IN')}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                        {log.description || `${log.action} on ${log.resourceType || 'resource'}`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Google Sheets Settings Modal */}
      {showSheetsSettings && (
        <SheetsSettingsModal
          settings={settings}
          saveSettingMutation={saveSettingMutation}
          onClose={() => setShowSheetsSettings(false)}
          qc={qc}
        />
      )}

      {/* Create/Edit Modal */}
      {(showCreate || editUser) && (
        <UserModal
          user={editUser}
          roles={roles}
          departments={departments}
          existingUsers={allUsersData}
          onClose={() => { setShowCreate(false); setEditUser(null); }}
          onSuccess={() => { setShowCreate(false); setEditUser(null); qc.invalidateQueries({ queryKey: ['users'] }); toast.success(editUser ? 'User updated' : 'User created'); }}
        />
      )}
    </div>
  );
}

function UserActionMenu({ user, onStatus, onReset, onDelete }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className="dropdown">
      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(!open)} title="Actions">
        <MoreVertical size={14} />
      </button>
      {open && (
        <div className="dropdown-menu" style={{ right: 0 }} onMouseLeave={() => setOpen(false)}>
          {user.status !== 'active' && user.status !== 'pending' && <div className="dropdown-item" onClick={() => { onStatus('active'); setOpen(false); }}><UserCheck size={14} />Reactivate</div>}
          {user.status === 'pending' && <div className="dropdown-item" onClick={() => { onStatus('active'); setOpen(false); }}><UserCheck size={14} />Approve / Activate</div>}
          {user.status === 'active' && <div className="dropdown-item" onClick={() => { onStatus('inactive'); setOpen(false); }}><UserX size={14} />Deactivate</div>}
          {user.status !== 'blocked' && <div className="dropdown-item" onClick={() => { onStatus('blocked'); setOpen(false); }}><UserX size={14} />Block User</div>}
          {user.status === 'blocked' && <div className="dropdown-item" onClick={() => { onStatus('active'); setOpen(false); }}><UserCheck size={14} />Unblock User</div>}
          {user.status !== 'suspended' && <div className="dropdown-item" onClick={() => { onStatus('suspended'); setOpen(false); }}><UserX size={14} />Suspend User</div>}
          {user.status === 'suspended' && <div className="dropdown-item" onClick={() => { onStatus('active'); setOpen(false); }}><UserCheck size={14} />Lift Suspension</div>}
          <div className="dropdown-item" onClick={() => { onReset(); setOpen(false); }}><RefreshCw size={14} />Reset Password</div>
          <div className="dropdown-separator" />
          <div className="dropdown-item danger" onClick={() => { onDelete(); setOpen(false); }}><Trash2 size={14} />Delete User</div>
        </div>
      )}
    </div>
  );
}

function SheetsSettingsModal({ settings, saveSettingMutation, onClose, qc }: any) {
  const deployIdObj = settings.find((s: any) => s.key === 'google_sheets_deployment_id');
  const sheetUrlObj = settings.find((s: any) => s.key === 'google_sheets_spreadsheet_url');

  const [deploymentId, setDeploymentId] = useState(deployIdObj?.value || '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(sheetUrlObj?.value || '');
  const [saving, setSaving] = useState(false);

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettingMutation.mutateAsync({ key: 'google_sheets_deployment_id', value: deploymentId });
      await saveSettingMutation.mutateAsync({ key: 'google_sheets_spreadsheet_url', value: spreadsheetUrl });
      toast.success('Google Sheets configuration configured successfully! 📊');
      qc.invalidateQueries({ queryKey: ['system-settings'] });
      onClose();
    } catch {
      toast.error('Failed to configure sync settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scale-in" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 className="modal-title">📊 Google Sheets Sync Settings</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleConfigure}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Configure your Google Sheets integration parameters. These settings sync roles, departments, and user database rosters with your corporate Google Spreadsheet.
            </p>
            <div className="form-group">
              <label className="form-label">Google Apps Script Deployment ID *</label>
              <input
                type="text"
                className="form-control"
                value={deploymentId}
                onChange={e => setDeploymentId(e.target.value)}
                placeholder="AKfycbw6pAarz91..."
                required
              />
              <small style={{ color: 'var(--text-tertiary)', fontSize: '10px', marginTop: '4px', display: 'block' }}>
                The script web app deployment ID from your Google Apps Script editor dashboard.
              </small>
            </div>
            <div className="form-group">
              <label className="form-label">Google Spreadsheet URL *</label>
              <input
                type="url"
                className="form-control"
                value={spreadsheetUrl}
                onChange={e => setSpreadsheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                required
              />
              <small style={{ color: 'var(--text-tertiary)', fontSize: '10px', marginTop: '4px', display: 'block' }}>
                The full HTTP address of the Google Sheets document to link with the GSV cloud network.
              </small>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Configuring...' : 'Configure Sync Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserModal({ user, roles, departments, existingUsers, onClose, onSuccess }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullName: user?.fullName || '', loginId: user?.loginId || '',
    email: user?.email || '', password: '',
    phone: user?.phone || '', designation: user?.designation || '',
    roleId: user?.roleId || '', departmentId: user?.departmentId || '',
  });
  const [loading, setLoading] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);

  const handleFieldChange = (key: string, value: string) => {
    setForm(f => {
      const updated = { ...f, [key]: value };

      // Auto-generate fields only when creating a new user
      if (!user) {
        if (key === 'fullName') {
          const base = value.trim().split(/\s+/)[0].replace(/[^a-zA-Z]/g, '');
          if (base) {
            const baseCapitalized = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
            
            // Calculate next unique serial number from existing users
            let maxSerial = 0;
            if (Array.isArray(existingUsers)) {
              existingUsers.forEach((u: any) => {
                const login = u.loginId || '';
                if (login.toLowerCase().startsWith(baseCapitalized.toLowerCase())) {
                  const serialPart = login.slice(baseCapitalized.length);
                  const num = parseInt(serialPart, 10);
                  if (!isNaN(num) && num > maxSerial) {
                    maxSerial = num;
                  }
                }
              });
            }
            const nextSerial = `${baseCapitalized}${String(maxSerial + 1).padStart(3, '0')}`;
            updated.loginId = nextSerial;
            updated.email = `${nextSerial.toLowerCase()}@gsv.local`;
            
            // Auto-generate password starting with first name and ending in @ABCD
            updated.password = `${baseCapitalized}@ABCD`;
          } else {
            updated.loginId = '';
            updated.email = '';
            updated.password = '';
          }
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (user) { 
        const { password, ...updateForm } = form;
        await usersApi.update(user.id, updateForm); 
      }
      else { await usersApi.create(form); }
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg animate-scale-in" style={{ position: 'relative' }}>
        <div className="modal-header">
          <h3 className="modal-title">{user ? 'Edit User' : 'Create New User'}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { key: 'fullName', label: 'Full Name', required: true, placeholder: 'John Doe' },
                { key: 'loginId', label: 'Login ID / Username', required: true, placeholder: 'john.doe' },
                { key: 'email', label: 'Email Address', required: true, type: 'email', placeholder: 'john@gsv.local' },
                { key: 'phone', label: 'Phone Number', placeholder: '+91 9876543210' },
                { key: 'designation', label: 'Designation', placeholder: 'Software Engineer' },
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label}{f.required && <span className="required">*</span>}</label>
                  <input
                    type={f.type || 'text'}
                    className="form-control"
                    value={(form as any)[f.key]}
                    onChange={e => handleFieldChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                </div>
              ))}
              {!user && (
                <div className="form-group">
                  <label className="form-label">Password <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.password}
                    onChange={e => handleFieldChange('password', e.target.value)}
                    placeholder="Min 8 chars"
                    required
                    minLength={8}
                  />
                </div>
              )}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Role</label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', fontSize: '11px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--brand-primary)' }}
                    onClick={() => setShowAddRole(true)}
                  >
                    + Add New
                  </button>
                </div>
                <select className="form-control" value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}>
                  <option value="">Select Role</option>
                  {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Department</label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', fontSize: '11px', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--brand-primary)' }}
                    onClick={() => setShowAddDept(true)}
                  >
                    + Add New
                  </button>
                </div>
                <select className="form-control" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                  <option value="">Select Department</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" />Saving...</> : user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>

        {showAddRole && (
          <QuickRoleModal
            onClose={() => setShowAddRole(false)}
            onSuccess={(newRole: any) => {
              qc.invalidateQueries({ queryKey: ['roles'] });
              setForm(f => ({ ...f, roleId: newRole.id }));
              setShowAddRole(false);
              toast.success('Role added successfully');
            }}
          />
        )}

        {showAddDept && (
          <QuickDeptModal
            onClose={() => setShowAddDept(false)}
            onSuccess={(newDept: any) => {
              qc.invalidateQueries({ queryKey: ['departments'] });
              setForm(f => ({ ...f, departmentId: newDept.id }));
              setShowAddDept(false);
              toast.success('Department added successfully');
            }}
          />
        )}
      </div>
    </div>
  );
}

function QuickRoleModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({ name: '', description: '', level: 5, color: '#6366f1' });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await rolesApi.create(form);
      onSuccess(res.data?.data || res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create role');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scale-in" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h4 className="modal-title">Quick Add Role</h4>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Role Name *</label>
              <input type="text" className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: '60px' }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickDeptModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({ name: '', description: '', color: '#0ea5e9' });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await departmentsApi.create(form);
      onSuccess(res.data?.data || res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create department');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scale-in" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h4 className="modal-title">Quick Add Department</h4>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Department Name *</label>
              <input type="text" className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: '60px' }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
