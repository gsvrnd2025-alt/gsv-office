import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Check, X, Shield, Play, ExternalLink, Clock, CheckSquare, Square, RefreshCw, AlertCircle
} from 'lucide-react';
import api, { usersApi, rolesApi, permissionsApi } from '../../api';
import toast from 'react-hot-toast';

interface SyncStep {
  text: string;
  status: 'pending' | 'loading' | 'success' | 'error';
}

export default function RequestsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'users' | 'chats' | 'teams' | 'files'>('users');
  const [approveUser, setApproveUser] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('gsv-sheet-url') || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv1a39dxv5WYpH7RP05g4fU2b168/edit');
  const [requestComments, setRequestComments] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('gsv-request-comments') || '{}');
    } catch {
      return {};
    }
  });

  const handleSaveSheetUrl = () => {
    localStorage.setItem('gsv-sheet-url', sheetUrl);
    toast.success('Google Sheet URL saved successfully! 💾');
  };

  // Queries
  const { data: pendingUsersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', '', 'pending', 1],
    queryFn: () => usersApi.getAll({ status: 'pending' }).then((r: any) => r.data?.data || r.data || []),
  });

  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ['requests-categories'],
    queryFn: () => api.get('/requests/categories').then((r: any) => r.data?.data || r.data || {}),
  });

  const pendingUsers = pendingUsersData?.data ? pendingUsersData.data : (Array.isArray(pendingUsersData) ? pendingUsersData : []);
  const chatRequests = categoriesData?.chat || [];
  const teamRequests = categoriesData?.team || [];
  const fileRequests = categoriesData?.file || [];

  // Mutations
  const approveUserMutation = useMutation({
    mutationFn: ({ id, roleId, permissions }: { id: string; roleId: string; permissions: string[] }) =>
      usersApi.updateStatus(id, 'active', roleId, permissions),
    onSuccess: () => {
      toast.success('Registration request approved successfully! 🎉');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['pending-users-count'] });
      setApproveUser(null);
    },
    onError: () => toast.error('Approval failed'),
  });

  const rejectUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.updateStatus(id, 'blocked'),
    onSuccess: () => {
      toast.success('Registration request rejected');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['pending-users-count'] });
    },
    onError: () => toast.error('Rejection failed'),
  });

  const approveRequestMutation = useMutation({
    mutationFn: ({ category, id }: { category: string; id: string }) =>
      api.post(`/requests/${category}/${id}/approve`),
    onSuccess: () => {
      toast.success('Access request approved! 👍');
      qc.invalidateQueries({ queryKey: ['requests-categories'] });
    },
    onError: () => toast.error('Operation failed'),
  });

  const denyRequestMutation = useMutation({
    mutationFn: ({ category, id }: { category: string; id: string }) =>
      api.post(`/requests/${category}/${id}/deny`),
    onSuccess: () => {
      toast.success('Access request rejected');
      qc.invalidateQueries({ queryKey: ['requests-categories'] });
    },
    onError: () => toast.error('Operation failed'),
  });

  const handleSheetsSync = async () => {
    setSyncing(true);
    setSyncSteps([
      { text: 'Connecting to Google Sheets API...', status: 'loading' },
      { text: 'Extracting user registry and logs...', status: 'pending' },
      { text: 'Syncing channel permissions & file access requests...', status: 'pending' },
      { text: 'Writing cells to spreadsheet database...', status: 'pending' }
    ]);

    await new Promise(resolve => setTimeout(resolve, 800));
    setSyncSteps(steps => {
      const next = [...steps];
      next[0].status = 'success';
      next[1].status = 'loading';
      return next;
    });

    await new Promise(resolve => setTimeout(resolve, 800));
    setSyncSteps(steps => {
      const next = [...steps];
      next[1].status = 'success';
      next[2].status = 'loading';
      return next;
    });

    await new Promise(resolve => setTimeout(resolve, 700));
    setSyncSteps(steps => {
      const next = [...steps];
      next[2].status = 'success';
      next[3].status = 'loading';
      return next;
    });

    await new Promise(resolve => setTimeout(resolve, 700));
    try {
      await api.post('/requests/sync-sheets');
      setSyncSteps(steps => steps.map(s => ({ ...s, status: 'success' })));
      toast.success('Google Sheets fully synchronized! 📊');
      setLastSync(new Date().toLocaleTimeString('en-IN'));
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const getBadgeCount = (type: 'users' | 'chats' | 'teams' | 'files') => {
    if (type === 'users') return pendingUsers.length;
    if (type === 'chats') return chatRequests.filter((c: any) => c.status === 'pending').length;
    if (type === 'teams') return teamRequests.filter((t: any) => t.status === 'pending').length;
    if (type === 'files') return fileRequests.filter((f: any) => f.status === 'pending').length;
    return 0;
  };

  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>📥 Request Management</h1>
          <p>Review self-registrations, secure permissions, and channel joins</p>
        </div>
      </div>

      {/* Main Grid split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Side: Requests List Card */}
        <div className="card" style={{ backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="card-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { key: 'users', label: '👥 User Signups', count: getBadgeCount('users') },
                { key: 'chats', label: '💬 Chat Channels', count: getBadgeCount('chats') },
                { key: 'teams', label: '🏢 Teams', count: getBadgeCount('teams') },
                { key: 'files', label: '📂 File Access', count: getBadgeCount('files') }
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '10px'
                  }}
                  onClick={() => setActiveTab(tab.key as any)}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{
                      background: activeTab === tab.key ? '#fff' : 'var(--brand-primary)',
                      color: activeTab === tab.key ? 'var(--brand-primary)' : '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '8px',
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="table-container" style={{ minHeight: '300px' }}>
            {activeTab === 'users' && (
              <table>
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Dept / Designation</th>
                    <th>Email Address</th>
                    <th>Requested At</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
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
                  ) : pendingUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
                          <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>All caught up!</h4>
                          <p style={{ fontSize: '13px' }}>No pending user registration requests</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pendingUsers.map((u: any) => (
                      <React.Fragment key={u.id}>
                        <tr key={u.id}>
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
                            Just now
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-sm btn-ghost"
                                style={{ color: 'var(--brand-danger)', padding: '6px' }}
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
                            </div>
                          </td>
                        </tr>
                        <tr key={`${u.id}-comment`} style={{ background: 'transparent' }}>
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
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'chats' && (
              <table>
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Channel Requested</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCategories ? (
                    <tr><td colSpan={5}><div className="skeleton" style={{ height: '80px' }} /></td></tr>
                  ) : chatRequests.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>No channel join requests</td></tr>
                  ) : (
                    chatRequests.map((r: any) => (
                      <React.Fragment key={r.id}>
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.user.fullName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{r.user.email}</div>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '13px' }}>{r.channelName}</td>
                          <td style={{ fontSize: '12px' }}><span className="badge badge-secondary">{r.category}</span></td>
                          <td>
                            <span className={`badge badge-${r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'danger'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            {r.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn btn-sm btn-ghost" style={{ color: 'var(--brand-danger)' }} onClick={() => denyRequestMutation.mutate({ category: 'chat', id: r.id })}><X size={14} /></button>
                                <button className="btn btn-sm btn-primary" onClick={() => approveRequestMutation.mutate({ category: 'chat', id: r.id })}><Check size={14} /></button>
                              </div>
                            ) : <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>}
                          </td>
                        </tr>
                        <tr key={`${r.id}-comment`} style={{ background: 'transparent' }}>
                          <td colSpan={5} style={{ paddingTop: 0, paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '24px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>💬 Admin Comment:</span>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Add optional admin review note here..."
                                style={{ height: '28px', padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px' }}
                                value={requestComments[r.id] || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setRequestComments(prev => ({ ...prev, [r.id]: val }));
                                  localStorage.setItem('gsv-request-comments', JSON.stringify({ ...requestComments, [r.id]: val }));
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'teams' && (
              <table>
                <thead>
                  <tr>
                    <th>Creator</th>
                    <th>Proposed Team Name</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCategories ? (
                    <tr><td colSpan={5}><div className="skeleton" style={{ height: '80px' }} /></td></tr>
                  ) : teamRequests.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>No team creation requests</td></tr>
                  ) : (
                    teamRequests.map((r: any) => (
                      <React.Fragment key={r.id}>
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.creator.fullName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{r.creator.email}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.teamName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{r.description}</div>
                          </td>
                          <td style={{ fontSize: '13px' }}>{r.departmentName}</td>
                          <td>
                            <span className={`badge badge-${r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'danger'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            {r.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn btn-sm btn-ghost" style={{ color: 'var(--brand-danger)' }} onClick={() => denyRequestMutation.mutate({ category: 'team', id: r.id })}><X size={14} /></button>
                                <button className="btn btn-sm btn-primary" onClick={() => approveRequestMutation.mutate({ category: 'team', id: r.id })}><Check size={14} /></button>
                              </div>
                            ) : <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>}
                          </td>
                        </tr>
                        <tr key={`${r.id}-comment`} style={{ background: 'transparent' }}>
                          <td colSpan={5} style={{ paddingTop: 0, paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '24px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>💬 Admin Comment:</span>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Add optional admin review note here..."
                                style={{ height: '28px', padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px' }}
                                value={requestComments[r.id] || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setRequestComments(prev => ({ ...prev, [r.id]: val }));
                                  localStorage.setItem('gsv-request-comments', JSON.stringify({ ...requestComments, [r.id]: val }));
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'files' && (
              <table>
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Folder/File</th>
                    <th>Access Type</th>
                    <th>Reason</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCategories ? (
                    <tr><td colSpan={5}><div className="skeleton" style={{ height: '80px' }} /></td></tr>
                  ) : fileRequests.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>No file access requests</td></tr>
                  ) : (
                    fileRequests.map((r: any) => (
                      <React.Fragment key={r.id}>
                        <tr key={r.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.user.fullName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{r.user.email}</div>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '13px' }}>{r.fileName}</td>
                          <td><span className="badge badge-secondary">{r.accessType}</span></td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.reason}</td>
                          <td>
                            {r.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn btn-sm btn-ghost" style={{ color: 'var(--brand-danger)' }} onClick={() => denyRequestMutation.mutate({ category: 'file', id: r.id })}><X size={14} /></button>
                                <button className="btn btn-sm btn-primary" onClick={() => approveRequestMutation.mutate({ category: 'file', id: r.id })}><Check size={14} /></button>
                              </div>
                            ) : (
                              <span className={`badge badge-${r.status === 'approved' ? 'success' : 'danger'}`}>
                                {r.status}
                              </span>
                            )}
                          </td>
                        </tr>
                        <tr key={`${r.id}-comment`} style={{ background: 'transparent' }}>
                          <td colSpan={5} style={{ paddingTop: 0, paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '24px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>💬 Admin Comment:</span>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Add optional admin review note here..."
                                style={{ height: '28px', padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px' }}
                                value={requestComments[r.id] || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setRequestComments(prev => ({ ...prev, [r.id]: val }));
                                  localStorage.setItem('gsv-request-comments', JSON.stringify({ ...requestComments, [r.id]: val }));
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Side: Google Sheets Sync Controls */}
        <div className="card" style={{ backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="card-header" style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', margin: 0, fontWeight: 700 }}>
              📊 Google Sheets Integration
            </h4>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
              Export system registers, audit history, and access registries dynamically to your corporate Google Sheet.
            </p>

            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                <span>Sync Status:</span>
                <strong style={{ color: 'var(--brand-success)' }}>🟢 Connected</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                <span>Spreadsheet:</span>
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--brand-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  Open Sheet <ExternalLink size={10} />
                </a>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                <span>Last Synced:</span>
                <strong>{lastSync || 'Never'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Spreadsheet Sync URL</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ padding: '6px 10px', fontSize: '12px', height: '32px', background: 'rgba(0,0,0,0.2)' }}
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  placeholder="Paste Google Sheet URL..."
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ height: '32px', padding: '6px 12px', fontSize: '11px' }}
                  onClick={handleSaveSheetUrl}
                >
                  Save
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              disabled={syncing}
              onClick={handleSheetsSync}
              style={{
                width: '100%',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.2)'
              }}
            >
              {syncing ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
              <span>Sync Registers Now</span>
            </button>

            {/* Sync Progress Logs */}
            {syncSteps.length > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                  Sync Logs
                </div>
                {syncSteps.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                    {step.status === 'loading' && <RefreshCw size={12} className="spin" style={{ color: 'var(--brand-primary)' }} />}
                    {step.status === 'success' && <Check size={12} style={{ color: 'var(--brand-success)' }} />}
                    {step.status === 'pending' && <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />}
                    {step.status === 'error' && <AlertCircle size={12} style={{ color: 'var(--brand-danger)' }} />}
                    <span style={{
                      color: step.status === 'pending' ? 'var(--text-tertiary)' : step.status === 'loading' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      textDecoration: step.status === 'success' ? 'line-through' : 'none',
                      opacity: step.status === 'success' ? 0.6 : 1
                    }}>
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
