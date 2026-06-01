import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Shield, CheckSquare, Square } from 'lucide-react';
import { rolesApi, permissionsApi } from '../../api';
import toast from 'react-hot-toast';

const ROLE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4'];

export default function RolesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreatePerm, setShowCreatePerm] = useState(false);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll().then(r => r.data?.data || r.data || []),
  });

  const { data: permissionsGrouped = {} } = useQuery({
    queryKey: ['permissions-grouped'],
    queryFn: () => permissionsApi.getGrouped().then(r => r.data?.data || r.data || {}),
  });

  const { data: rolePerms = [] } = useQuery({
    queryKey: ['role-perms', selected?.id],
    queryFn: () => rolesApi.getPermissions(selected!.id).then(r => r.data?.data || r.data || []),
    enabled: !!selected?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => { toast.success('Role deleted'); qc.invalidateQueries({ queryKey: ['roles'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Delete failed'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ roleId, permIds }: { roleId: string; permIds: string[] }) => rolesApi.assignPermissions(roleId, permIds),
    onSuccess: () => { toast.success('Permissions saved'); qc.invalidateQueries({ queryKey: ['role-perms', selected?.id] }); },
    onError: () => toast.error('Failed to save permissions'),
  });

  const grantedPerms = new Set(rolePerms.filter((p: any) => p.granted || p.role_granted).map((p: any) => p.id));

  const togglePerm = (permId: string) => {
    const next = new Set(grantedPerms);
    if (next.has(permId)) next.delete(permId); else next.add(permId);
    assignMutation.mutate({ roleId: selected.id, permIds: Array.from(next) as string[] });
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div><h1>🛡️ Roles & Permissions</h1><p>Control access and capabilities</p></div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline" onClick={() => setShowCreatePerm(true)}><Plus size={16} /> New Permission</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Role</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        {/* Roles List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {isLoading ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />
          )) : roles.map((role: any) => (
            <div key={role.id} onClick={() => setSelected(role)}
              className={`card card-hoverable`}
              style={{ padding: '16px', cursor: 'pointer', borderColor: selected?.id === role.id ? 'var(--brand-primary)' : undefined, boxShadow: selected?.id === role.id ? 'var(--shadow-brand)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: role.color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{role.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Level {role.level}</div>
                  </div>
                </div>
                {!role.isSystem && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Delete role" onClick={e => { e.stopPropagation(); if (confirm(`Delete role "${role.name}"?`)) deleteMutation.mutate(role.id); }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
              {role.description && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>{role.description}</p>}
              {role.isSystem && <span className="badge badge-secondary" style={{ marginTop: '8px', fontSize: '10px' }}>System Role</span>}
            </div>
          ))}
        </div>

        {/* Permissions Panel */}
        <div className="card">
          {selected ? (
            <>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Permissions — {selected.name}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Click to toggle permissions for this role</p>
                </div>
                <span className="badge badge-primary">{grantedPerms.size} granted</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {Object.entries(permissionsGrouped).map(([module, perms]: [string, any]) => (
                  <div key={module}>
                    <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '10px' }}>{module}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {perms.map((p: any) => {
                        const granted = grantedPerms.has(p.id);
                        return (
                          <div key={p.id}
                            onClick={() => !selected.isSystem && togglePerm(p.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              padding: '8px 12px', borderRadius: '8px',
                              background: granted ? 'rgba(99,102,241,0.1)' : 'var(--bg-secondary)',
                              border: `1px solid ${granted ? '#6366f1' : 'var(--border-color)'}`,
                              cursor: selected.isSystem ? 'default' : 'pointer',
                              transition: 'all 0.15s',
                            }}>
                            {granted ? <CheckSquare size={15} style={{ color: '#6366f1', flexShrink: 0 }} /> : <Square size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />}
                            <span style={{ fontSize: '12px', fontWeight: 500, color: granted ? '#6366f1' : 'var(--text-secondary)' }}>{p.action}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Shield size={48} />
              <h3>Select a Role</h3>
              <p>Click a role on the left to view and edit its permissions</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateRoleModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role created'); }} />}
      {showCreatePerm && <CreatePermissionModal onClose={() => setShowCreatePerm(false)} onSuccess={() => { setShowCreatePerm(false); qc.invalidateQueries({ queryKey: ['permissions-grouped'] }); toast.success('Permission created'); }} />}
    </div>
  );
}

function CreateRoleModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({ name: '', description: '', level: 1, color: '#6366f1' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await rolesApi.create(form); onSuccess(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scale-in">
        <div className="modal-header">
          <h3 className="modal-title">Create New Role</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group"><label className="form-label">Role Name <span className="required">*</span></label><input type="text" className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ minHeight: '80px' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group"><label className="form-label">Level (1-10)</label><input type="number" min={1} max={10} className="form-control" value={form.level} onChange={e => setForm(f => ({ ...f, level: parseInt(e.target.value) }))} /></div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {ROLE_COLORS.map(c => (
                    <div key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid var(--text-primary)' : '2px solid transparent', transition: 'border 0.15s' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Role'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatePermissionModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({ id: '', action: '', module: 'users', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id || !form.action || !form.description) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await permissionsApi.create(form);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create permission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scale-in" style={{ maxWidth: '440px', background: 'rgba(26, 21, 44, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="modal-title">Create Custom Permission</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Permission ID <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. analytics-export"
                value={form.id}
                onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Action Name <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. export_data"
                value={form.action}
                onChange={e => setForm(f => ({ ...f, action: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Module / Category *</label>
              <select
                className="form-control"
                value={form.module}
                onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
                required
                style={{ padding: '8px 12px' }}
              >
                <option value="users">Users</option>
                <option value="roles">Roles</option>
                <option value="tickets">Tickets</option>
                <option value="business">Business</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description <span className="required">*</span></label>
              <textarea
                className="form-control"
                placeholder="e.g. Allows exporting system reports and spreadsheets..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ minHeight: '80px' }}
                required
              />
            </div>
          </div>
          <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Permission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
