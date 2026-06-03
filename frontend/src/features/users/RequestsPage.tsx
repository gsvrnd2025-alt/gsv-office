import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check, X, Shield, Clock, CheckSquare, Square, RefreshCw, KeyRound
} from 'lucide-react';
import api, { usersApi, rolesApi, permissionsApi, authApi } from '../../api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';

export default function RequestsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role?.name === 'Super Admin';
  const [viewType, setViewType] = useState<'signup' | 'forgot'>('signup');

  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'blocked'>('pending');
  const [approveUser, setApproveUser] = useState<any>(null);
  const [requestComments, setRequestComments] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('gsv-request-comments') || '{}');
    } catch {
      return {};
    }
  });

  // Queries
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users-requests', activeTab],
    queryFn: () => usersApi.getAll({ status: activeTab }).then((r: any) => r.data?.data || r.data || []),
    enabled: viewType === 'signup',
  });

  const usersList = usersData?.data ? usersData.data : (Array.isArray(usersData) ? usersData : []);

  // Forgot password queries - always fetch for superadmin (don't wait for tab click)
  const { data: forgotRequestsData, isLoading: loadingForgot, refetch: refetchForgot } = useQuery({
    queryKey: ['forgot-password-requests'],
    queryFn: () => authApi.getForgotPasswordRequests().then((r: any) => r.data?.data || r.data || []),
    enabled: isSuperAdmin,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000,
  });

  const forgotList = Array.isArray(forgotRequestsData) ? forgotRequestsData : [];

  // Forgot password mutations
  const approveForgotMutation = useMutation({
    mutationFn: (userId: string) => authApi.approveForgotPassword(userId),
    onSuccess: () => {
      toast.success('Password reset request approved! User can now reset.');
      qc.invalidateQueries({ queryKey: ['forgot-password-requests'] });
    },
    onError: () => toast.error('Approval failed'),
  });

  const rejectForgotMutation = useMutation({
    mutationFn: (userId: string) => authApi.rejectForgotPassword(userId),
    onSuccess: () => {
      toast.success('Password reset request rejected.');
      qc.invalidateQueries({ queryKey: ['forgot-password-requests'] });
    },
    onError: () => toast.error('Rejection failed'),
  });

  const { data: pendingUsersData } = useQuery({
    queryKey: ['users-requests', 'pending'],
    queryFn: () => usersApi.getAll({ status: 'pending' }).then((r: any) => r.data?.data || r.data || []),
  });

  const pendingCount = pendingUsersData?.data ? pendingUsersData.data.length : (Array.isArray(pendingUsersData) ? pendingUsersData.length : 0);

  // Mutations
  const approveUserMutation = useMutation({
    mutationFn: ({ id, roleId, permissions }: { id: string; roleId: string; permissions: string[] }) =>
      usersApi.updateStatus(id, 'active', roleId, permissions),
    onSuccess: () => {
      toast.success('Registration request approved successfully! 🎉');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-requests'] });
      qc.invalidateQueries({ queryKey: ['pending-users-count'] });
      setApproveUser(null);
    },
    onError: () => toast.error('Approval failed'),
  });

  const rejectUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.updateStatus(id, 'blocked'),
    onSuccess: () => {
      toast.success('User has been blocked/disabled');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['users-requests'] });
      qc.invalidateQueries({ queryKey: ['pending-users-count'] });
    },
    onError: () => toast.error('Action failed'),
  });

  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>📥 Request Management</h1>
          <p>Review self-registrations, assign system roles, and configure secure custom access permissions</p>
        </div>
      </div>

      {isSuperAdmin && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
          <button
            type="button"
            className={`btn ${viewType === 'signup' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewType('signup')}
            style={{ fontWeight: 700 }}
          >
            👥 Signup Requests
          </button>
          <button
            type="button"
            className={`btn ${viewType === 'forgot' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setViewType('forgot')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
          >
            <KeyRound size={16} /> Password Resets
            {forgotList.length > 0 && (
              <span className="badge badge-primary" style={{ fontSize: '9px', padding: '1px 5px', background: 'var(--brand-danger)' }}>{forgotList.length}</span>
            )}
          </button>
        </div>
      )}

      {viewType === 'signup' && (
        <div className="card" style={{ backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            👥 Account Registration & Signup Logs
          </h3>
        </div>

        {/* Tab Filters */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', gap: '16px', padding: '0 20px', background: 'rgba(255,255,255,0.01)' }}>
          {[
            { key: 'pending', label: '📥 Pending Review', badge: pendingCount },
            { key: 'active', label: '✅ Approved / Active' },
            { key: 'blocked', label: '🚫 Rejected / Blocked' }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                background: 'none', border: 'none', padding: '12px 6px',
                color: activeTab === tab.key ? 'var(--brand-primary)' : 'var(--text-tertiary)',
                borderBottom: activeTab === tab.key ? '2px solid var(--brand-primary)' : '2px solid transparent',
                fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="badge badge-primary" style={{ fontSize: '9px', padding: '1px 5px' }}>{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="table-container" style={{ minHeight: '300px' }}>
          <table>
            <thead>
              <tr>
                <th>Requester</th>
                <th>Dept / Designation</th>
                <th>Email Address</th>
                <th>Requested At</th>
                <th style={{ width: '180px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingUsers ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '16px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
                      <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>All caught up!</h4>
                      <p style={{ fontSize: '13px' }}>No requests in this category</p>
                    </div>
                  </td>
                </tr>
              ) : (
                usersList.map((u: any) => (
                  <React.Fragment key={u.id}>
                    <tr>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar" style={{ background: 'var(--gradient-brand)' }}>
                            {initials(u.fullName)}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{u.fullName}</div>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{u.department?.name || 'General'}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', display: 'block' }}>{u.designation || 'Staff'}</span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Pending review'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {activeTab === 'pending' && (
                            <>
                              <button
                                className="btn btn-sm btn-ghost"
                                style={{ color: 'var(--brand-danger)', padding: '6px' }}
                                title="Reject Request"
                                onClick={() => { if (confirm(`Reject registration for ${u.fullName}?`)) rejectUserMutation.mutate(u.id); }}
                              >
                                <X size={16} />
                              </button>
                              <button
                                className="btn btn-sm btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
                                onClick={() => setApproveUser(u)}
                              >
                                <Check size={14} /> Approve
                              </button>
                            </>
                          )}
                          {activeTab === 'active' && (
                            <button
                              className="btn btn-sm btn-ghost"
                              style={{ color: 'var(--brand-danger)', padding: '4px 10px', fontSize: '11px', border: '1px solid rgba(239,68,68,0.2)', height: 'auto' }}
                              title="Block User"
                              onClick={() => { if (confirm(`Block and disable account for ${u.fullName}?`)) rejectUserMutation.mutate(u.id); }}
                            >
                              <X size={12} /> Block User
                            </button>
                          )}
                          {activeTab === 'blocked' && (
                            <button
                              className="btn btn-sm btn-primary"
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 12px', fontSize: '11px', height: 'auto' }}
                              onClick={() => setApproveUser(u)}
                            >
                              <Check size={12} /> Approve / Unblock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {activeTab === 'pending' && (
                      <tr style={{ background: 'transparent' }}>
                        <td colSpan={5} style={{ paddingTop: 0, paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '46px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>💬 Admin Comment:</span>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Add optional admin review note here..."
                              style={{ height: '28px', padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px' }}
                              value={requestComments[u.id] || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setRequestComments(prev => ({ ...prev, [u.id]: val }));
                                localStorage.setItem('gsv-request-comments', JSON.stringify({ ...requestComments, [u.id]: val }));
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Password Reset Requests Tab */}
      {viewType === 'forgot' && (
        <div className="card" style={{ backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-primary)' }}>
              🔑 Pending Password Reset Approvals
              {forgotList.length > 0 && (
                <span className="badge badge-primary" style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--brand-danger)' }}>{forgotList.length} pending</span>
              )}
            </h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => refetchForgot()}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          <div className="table-container" style={{ minHeight: '300px' }}>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Login ID / Emp ID</th>
                  <th>Email Address</th>
                  <th>Requested At</th>
                  <th style={{ width: '220px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingForgot ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: '16px' }} /></td>
                      ))}
                    </tr>
                  ))
                ) : forgotList.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
                        <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>All clear!</h4>
                        <p style={{ fontSize: '13px' }}>No password reset requests pending admin approval</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  forgotList.map((u: any) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar" style={{ background: 'var(--gradient-brand)' }}>
                            {initials(u.fullName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{u.fullName}</div>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{u.phone || 'No phone'}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{u.loginId}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', display: 'block' }}>{u.employeeId || 'No Emp ID'}</span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        {u.metadata?.passwordResetRequestedAt ? new Date(u.metadata.passwordResetRequestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            style={{ color: 'var(--brand-danger)', padding: '6px' }}
                            title="Reject Request"
                            onClick={() => { if (confirm(`Reject reset request for ${u.fullName}?`)) rejectForgotMutation.mutate(u.id); }}
                          >
                            <X size={14} style={{ marginRight: '4px' }} /> Reject
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px' }}
                            onClick={() => { if (confirm(`Approve reset request for ${u.fullName}?`)) approveForgotMutation.mutate(u.id); }}
                          >
                            <Check size={14} /> Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve signup modal overlay */}
      {approveUser && (
        <ApproveModal
          user={approveUser}
          onClose={() => setApproveUser(null)}
          onSave={({ roleId, permissions }: any) => {
            approveUserMutation.mutate({ id: approveUser.id, roleId, permissions });
          }}
        />
      )}
    </div>
  );
}

function ApproveModal({ user, onClose, onSave }: any) {
  const [roleId, setRoleId] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [loadingDefaultPerms, setLoadingDefaultPerms] = useState(false);

  // Queries
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll().then(r => r.data?.data || r.data || []),
  });

  const { data: groupedPermsData } = useQuery({
    queryKey: ['permissions-grouped'],
    queryFn: () => permissionsApi.getGrouped().then(r => r.data?.data || r.data || {}),
  });

  const groupedPermissions = groupedPermsData || {};

  const handleRoleChange = async (id: string) => {
    setRoleId(id);
    if (!id) {
      setSelectedPerms([]);
      return;
    }
    setLoadingDefaultPerms(true);
    try {
      const res = await rolesApi.getPermissions(id);
      const permList = res.data?.data || res.data || [];
      const activeIds = permList.filter((p: any) => p.granted || p.role_granted).map((p: any) => p.id);
      setSelectedPerms(activeIds);
    } catch {
      toast.error('Failed to load role permissions');
    } finally {
      setLoadingDefaultPerms(false);
    }
  };

  const togglePermission = (id: string) => {
    setSelectedPerms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCheckAll = (moduleKey: string) => {
    const ids = (groupedPermissions[moduleKey] || []).map((p: any) => p.id);
    const hasAll = ids.every((id: string) => selectedPerms.includes(id));
    if (hasAll) {
      setSelectedPerms(prev => prev.filter(p => !ids.includes(p)));
    } else {
      setSelectedPerms(prev => [...new Set([...prev, ...ids])]);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg animate-scale-in" style={{ maxWidth: '640px', background: 'rgba(26, 21, 44, 0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} style={{ color: 'var(--brand-primary)' }} />
            Approve Registration: {user.fullName}
          </h3>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Section 1: Role Assign */}
          <div className="form-group" style={{ maxWidth: '300px' }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Assign System Role *</label>
            <select
              className="form-control"
              value={roleId}
              onChange={e => handleRoleChange(e.target.value)}
              required
              style={{ padding: '10px 12px' }}
            >
              <option value="">Select Role</option>
              {roles.map((r: any) => (
                <option key={r.id} value={r.id}>{r.name} (Lvl {r.level})</option>
              ))}
            </select>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
              Assigning a role sets default access permissions which you can customize below.
            </span>
          </div>

          {/* Section 2: Permissions customize */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>
                Granular Permissions Customizer
              </h4>
              {loadingDefaultPerms && <RefreshCw size={12} className="spin" style={{ color: 'var(--brand-primary)' }} />}
            </div>

            {Object.keys(groupedPermissions).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                Please select a role to populate granular permission templates.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.keys(groupedPermissions).map(moduleKey => {
                  const perms = groupedPermissions[moduleKey] || [];
                  const ids = perms.map((p: any) => p.id);
                  const hasAll = ids.every((id: string) => selectedPerms.includes(id));

                  return (
                    <div
                      key={moduleKey}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--brand-primary)' }}>
                          {moduleKey}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleCheckAll(moduleKey)}
                          style={{ padding: '2px 8px', fontSize: '11px', height: 'auto' }}
                        >
                          {hasAll ? 'Clear All' : 'Select All'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {perms.map((p: any) => {
                          const checked = selectedPerms.includes(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => togglePermission(p.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                background: checked ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                border: `1px solid ${checked ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                            >
                              {checked ? (
                                <CheckSquare size={14} style={{ color: 'var(--brand-primary)' }} />
                              ) : (
                                <Square size={14} style={{ color: 'var(--text-tertiary)' }} />
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                  {p.description}
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                  ID: {p.id}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!roleId}
            onClick={() => onSave({ roleId, permissions: selectedPerms })}
          >
            Approve & Save Access Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
