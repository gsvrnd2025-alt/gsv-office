import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Lock, UserX, UserCheck, Mail, RefreshCw } from 'lucide-react';
import { usersApi, rolesApi, departmentsApi } from '../../api';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  active: 'success', inactive: 'warning', blocked: 'danger', pending: 'secondary'
};

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, statusFilter, page],
    queryFn: () => usersApi.getAll({ search, status: statusFilter || undefined, page, limit: 15 }).then(r => r.data?.data || r.data),
  });

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: () => rolesApi.getAll().then(r => r.data?.data || r.data || []) });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.getAll().then(r => r.data?.data || r.data || []) });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: () => toast.error('Delete failed'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => usersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['users'] }); },
    onError: () => toast.error('Update failed'),
  });

  const resetPwdMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => usersApi.resetPassword(id, { newPassword: 'TempPass@123' }),
    onSuccess: () => toast.success('Password reset to: TempPass@123'),
    onError: () => toast.error('Reset failed'),
  });

  const users = data?.data || [];
  const meta = data?.meta || {};

  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>👥 User Management</h1>
          <p>Manage team members, roles, and access</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New User
        </button>
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

      {/* Table */}
      <div className="card">
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
                  <tr key={u.id}>
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
                    <td>
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

      {/* Create/Edit Modal */}
      {(showCreate || editUser) && (
        <UserModal
          user={editUser}
          roles={roles}
          departments={departments}
          totalUsers={meta.total || 0}
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

function getStarting4Letters(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, '');
  if (clean.length === 0) return 'Gsvo';
  const raw = clean.slice(0, 4);
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function UserModal({ user, roles, departments, totalUsers, onClose, onSuccess }: any) {
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
          const cleanName = value.toLowerCase().replace(/[^a-z]/g, '');
          updated.loginId = cleanName ? `${cleanName}${totalUsers + 1}` : '';

          const first4 = getStarting4Letters(value);
          const last4 = f.phone ? f.phone.replace(/[^0-9]/g, '').slice(-4) : '2026';
          updated.password = value ? `${first4}@${last4}` : '';
        }

        if (key === 'phone') {
          const first4 = getStarting4Letters(f.fullName);
          const last4 = value.replace(/[^0-9]/g, '').slice(-4) || '2026';
          updated.password = f.fullName ? `${first4}@${last4}` : '';
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (user) { await usersApi.update(user.id, form); }
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
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
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
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

