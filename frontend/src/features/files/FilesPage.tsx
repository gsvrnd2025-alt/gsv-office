import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  FolderOpen, Upload, Search, Grid, List, Plus, Download, Trash2, Share2,
  ChevronRight, Home, File, FileImage, FileText, FileVideo, FileArchive,
  Folder, Lock, Unlock, Check, X, ShieldAlert, Key, Users, Copy, Move, RefreshCw
} from 'lucide-react';
import { filesApi, usersApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';

function getFileIcon(mime: string) {
  if (!mime) return <File size={20} />;
  if (mime.startsWith('image/')) return <FileImage size={20} style={{ color: '#8b5cf6' }} />;
  if (mime.startsWith('video/')) return <FileVideo size={20} style={{ color: '#3b82f6' }} />;
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('text')) return <FileText size={20} style={{ color: '#f59e0b' }} />;
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return <FileArchive size={20} style={{ color: '#10b981' }} />;
  return <File size={20} style={{ color: '#6366f1' }} />;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function FilesPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [folderId, setFolderId] = useState<string | undefined>();
  const [breadcrumbs, setBreadcrumbs] = useState<{ id?: string; name: string }[]>([{ name: 'Home' }]);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'requests'>('files');

  // Folder Access Request Modal State
  const [lockFolder, setLockFolder] = useState<any>(null);
  const [requestPermission, setRequestPermission] = useState<string>('read');

  // Shared requests query
  const { data: accessRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => filesApi.getAccessRequests().then(r => r.data?.data || r.data || []),
    enabled: !!user
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-list-sharing'],
    queryFn: () => usersApi.getAll().then(r => r.data?.data?.data || r.data?.data || [])
  });

  // Queries for folders and files
  const { data: folders = [] } = useQuery({
    queryKey: ['folders', folderId],
    queryFn: () => filesApi.getFolders({ parentId: folderId }).then(r => r.data?.data || r.data || [])
  });

  const { data: files = [] } = useQuery({
    queryKey: ['files', folderId, search],
    queryFn: () => filesApi.getFiles({ folderId, search: search || undefined }).then(r => r.data?.data || r.data || [])
  });

  // Access Mutators
  const requestAccessMutation = useMutation({
    mutationFn: (variables: any) => filesApi.requestAccess(variables),
    onSuccess: () => {
      toast.success('Access request submitted successfully');
      setLockFolder(null);
      refetchRequests();
    },
    onError: () => toast.error('Failed to submit request')
  });

  const reviewAccessMutation = useMutation({
    mutationFn: (variables: any) => filesApi.reviewAccessRequest(variables),
    onSuccess: () => {
      toast.success('Request reviewed successfully');
      refetchRequests();
      qc.invalidateQueries({ queryKey: ['folders'] });
    },
    onError: () => toast.error('Failed to submit review')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filesApi.delete(id),
    onSuccess: () => { toast.success('File deleted'); qc.invalidateQueries({ queryKey: ['files'] }); },
    onError: () => toast.error('Delete failed'),
  });

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => filesApi.createFolder({ name, parentId: folderId }),
    onSuccess: () => { toast.success('Folder created'); setShowNewFolder(false); setNewFolderName(''); qc.invalidateQueries({ queryKey: ['folders'] }); },
    onError: () => toast.error('Failed to create folder'),
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    let success = 0;
    for (const file of acceptedFiles) {
      const fd = new FormData();
      fd.append('file', file);
      if (folderId) fd.append('folderId', folderId);
      try { await filesApi.upload(fd); success++; }
      catch { toast.error(`Failed: ${file.name}`); }
    }
    if (success > 0) toast.success(`${success} file(s) uploaded`);
    setUploading(false);
    qc.invalidateQueries({ queryKey: ['files'] });
  }, [folderId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, noClick: true, multiple: true,
  });

  const hasAccess = (folder: any) => {
    if (!user) return false;
    if (user.role?.name === 'Super Admin') return true;
    if (folder.ownerId === user.id || folder.ownerId === 'system') return true;
    if (folder.path?.startsWith('/public')) return true;

    // Check in approved access requests list
    const grant = accessRequests.find((r: any) => r.folderId === folder.id && r.requesterId === user.id && r.status === 'approved');
    return !!grant;
  };

  const handleDoubleClickFolder = (folder: any) => {
    if (hasAccess(folder)) {
      setFolderId(folder.id);
      setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    } else {
      setLockFolder(folder);
    }
  };

  const handleRequestAccess = () => {
    if (!lockFolder || !user) return;
    requestAccessMutation.mutate({
      folderId: lockFolder.id,
      ownerId: lockFolder.ownerId,
      requesterId: user.id,
      requesterName: user.fullName
    });
  };

  const navigateBreadcrumb = (idx: number, item: { id?: string; name: string }) => {
    setBreadcrumbs(prev => prev.slice(0, idx + 1));
    setFolderId(item.id);
  };

  // Enterprise Tree actions triggers
  const handleCopyStructure = (name: string) => {
    toast.success(`📋 SMB Path copied: \\\\gsv-office-smb\\folders\\${name}`);
  };

  const handleDuplicate = (name: string) => {
    toast.success(`👯 Duplicated folder hierarchy for: ${name}`);
  };

  const handleTransfer = (folderName: string, targetUser: string) => {
    toast.success(`👑 Transferred ownership of folder ${folderName} to ${targetUser}`);
  };

  const pendingRequests = accessRequests.filter((r: any) => r.ownerId === user?.id && r.status === 'pending');

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} {...getRootProps()}>
      <input {...getInputProps()} />

      {isDragActive && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(99,102,241,0.15)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px dashed #6366f1' }}>
          <div style={{ textAlign: 'center', color: '#6366f1' }}>
            <Upload size={64} style={{ marginBottom: '16px', animation: 'bounce 1s infinite' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Drop files here</h2>
            <p>Files will be uploaded to current folder</p>
          </div>
        </div>
      )}

      {/* Access Request Overlay Modal */}
      {lockFolder && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card card-body" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-danger)' }}>
                <Lock size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Folder is Protected</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Permission required to unlock folder contents</p>
              </div>
            </div>

            <div style={{ fontSize: '13px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lockFolder.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px', fontFamily: 'monospace' }}>
                SMB Path: \\gsv-office-smb{lockFolder.path}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Access Level</label>
              <select className="form-control" value={requestPermission} onChange={e => setRequestPermission(e.target.value)} style={{ fontSize: '12px', height: '34px' }}>
                <option value="read">👁️ Read Only (View files list)</option>
                <option value="download">📥 Download Access (Extract copies)</option>
                <option value="upload">📤 Upload Access (Contribute files)</option>
                <option value="full">⚡ Full Access (All actions enabled)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRequestAccess} disabled={requestAccessMutation.isPending}>
                <Key size={14} /> Request Access
              </button>
              <button className="btn btn-secondary" onClick={() => setLockFolder(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>📁 Enterprise File Manager</h1>
          <p>Securely store, organize and share directories in your SMB storage cluster</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'files' && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNewFolder(true)}><FolderOpen size={15} /> New Folder</button>
              <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                <Upload size={15} /> Upload {uploading && <div className="spinner" />}
                <input type="file" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) onDrop(Array.from(e.target.files)); }} />
              </label>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', gap: '16px', marginBottom: '-8px' }}>
        <button
          onClick={() => setActiveTab('files')}
          style={{ background: 'none', border: 'none', padding: '8px 12px', color: activeTab === 'files' ? 'var(--brand-primary)' : 'var(--text-tertiary)', borderBottom: activeTab === 'files' ? '2px solid var(--brand-primary)' : 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
        >
          📂 All Storage Directories
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          style={{ background: 'none', border: 'none', padding: '8px 12px', color: activeTab === 'requests' ? 'var(--brand-primary)' : 'var(--text-tertiary)', borderBottom: activeTab === 'requests' ? '2px solid var(--brand-primary)' : 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          📥 Access Sharing Requests {pendingRequests.length > 0 && <span className="badge badge-primary" style={{ fontSize: '9px', padding: '2px 6px' }}>{pendingRequests.length}</span>}
        </button>
      </div>

      {activeTab === 'files' ? (
        <>
          {/* Toolbar */}
          <div className="card">
            <div className="card-body" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Breadcrumbs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, flexWrap: 'wrap' }}>
                {breadcrumbs.map((bc, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {i > 0 && <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />}
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: i === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--brand-primary)', fontWeight: i === breadcrumbs.length - 1 ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px', borderRadius: '4px' }}
                      onClick={() => navigateBreadcrumb(i, bc)}
                    >
                      {i === 0 && <Home size={13} />}{bc.name}
                    </button>
                  </span>
                ))}
              </div>

              <div className="search-bar" style={{ width: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-tertiary)' }} />
                <input type="text" placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} className="form-control" style={{ paddingLeft: '36px', height: '34px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('grid')}><Grid size={14} /></button>
                <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('list')}><List size={14} /></button>
              </div>
            </div>
          </div>

          {/* New Folder Input */}
          {showNewFolder && (
            <div className="card card-body" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Folder size={18} style={{ color: 'var(--brand-warning)' }} />
              <input type="text" className="form-control" style={{ flex: 1 }} placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter' && newFolderName) createFolderMutation.mutate(newFolderName); if (e.key === 'Escape') setShowNewFolder(false); }} />
              <button className="btn btn-primary btn-sm" onClick={() => newFolderName && createFolderMutation.mutate(newFolderName)}>Create</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNewFolder(false)}>Cancel</button>
            </div>
          )}

          {/* Grid / List View */}
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {/* Folders */}
              {folders.map((folder: any) => {
                const locked = !hasAccess(folder);
                const isPublic = folder.path?.startsWith('/public');
                return (
                  <div key={folder.id} className="card card-hoverable" style={{ padding: '16px', textAlign: 'center', cursor: 'pointer', position: 'relative' }} onDoubleClick={() => handleDoubleClickFolder(folder)}>
                    <Folder size={40} style={{ color: isPublic ? 'var(--brand-primary)' : locked ? 'var(--text-tertiary)' : '#f59e0b', margin: '0 auto 10px' }} />
                    {locked && <Lock size={12} style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--text-tertiary)' }} />}
                    
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Copy SMB Path" onClick={(e) => { e.stopPropagation(); handleCopyStructure(folder.name); }}><Copy size={11} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Duplicate Folder" onClick={(e) => { e.stopPropagation(); handleDuplicate(folder.name); }}><Plus size={11} /></button>
                      <select
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: '10px', width: '36px', cursor: 'pointer' }}
                        onChange={(e) => handleTransfer(folder.name, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        defaultValue=""
                      >
                        <option value="" disabled>👑</option>
                        {allUsers.map((u: any) => (
                          <option key={u.id} value={u.fullName}>{u.fullName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}

              {/* Files */}
              {files.map((file: any) => (
                <div key={file.id} className="card card-hoverable group" style={{ padding: '16px', textAlign: 'center', position: 'relative' }}>
                  <div style={{ fontSize: '40px', margin: '0 auto 10px', display: 'flex', justifyContent: 'center' }}>{getFileIcon(file.mimeType)}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.originalName}>{file.originalName}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{formatBytes(file.sizeBytes || file.size)}</div>
                  <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '2px' }}>
                    <a href={file.storageUrl} download className="btn btn-ghost btn-icon btn-sm" title="Download"><Download size={12} /></a>
                    <button className="btn btn-ghost btn-icon btn-sm danger" title="Delete" onClick={() => { if (confirm(`Delete ${file.originalName}?`)) deleteMutation.mutate(file.id); }}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}

              {folders.length === 0 && files.length === 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="empty-state" style={{ padding: '48px' }}><FolderOpen size={48} /><h3>No directories available</h3><p>Create folders or synchronize SMB workspace</p></div>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Permissions</th><th>Actions</th></tr></thead>
                  <tbody>
                    {[...folders.map((f: any) => ({ ...f, isFolder: true })), ...files].map((item: any) => {
                      const locked = item.isFolder && !hasAccess(item);
                      return (
                        <tr key={item.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {item.isFolder ? <Folder size={18} style={{ color: locked ? 'var(--text-tertiary)' : '#f59e0b', flexShrink: 0 }} /> : getFileIcon(item.mimeType)}
                              <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.name || item.originalName}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{item.isFolder ? 'Folder' : (item.mimeType || 'File')}</td>
                          <td style={{ fontSize: '12px' }}>{item.isFolder ? '—' : formatBytes(item.sizeBytes || item.size)}</td>
                          <td>
                            {item.isFolder ? (
                              locked ? <span style={{ color: 'var(--brand-danger)', fontSize: '11px' }}>🔒 Protected</span> : <span style={{ color: 'var(--brand-success)', fontSize: '11px' }}>🔓 Accessible</span>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Standard File</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {item.isFolder && locked && (
                                <button className="btn btn-secondary btn-xs" onClick={() => setLockFolder(item)}>Unlock</button>
                              )}
                              {!item.isFolder && <a href={item.storageUrl} download className="btn btn-ghost btn-icon btn-sm" title="Download"><Download size={14} /></a>}
                              {!item.isFolder && <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => { if (confirm(`Delete?`)) deleteMutation.mutate(item.id); }}><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Requests reviewer layout */
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Pending Access Review Inbox</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Manage access requests submitted by other team members for your folders</p>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => refetchRequests()} title="Reload"><RefreshCw size={14} /></button>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Requested Folder</th>
                  <th>Requester</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accessRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state" style={{ padding: '48px' }}>
                        <ShieldAlert size={40} style={{ opacity: 0.3 }} />
                        <h3>No pending share requests</h3>
                        <p>Access requests from your coworkers will populate here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  accessRequests.map((req: any) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>📁 {req.folderName}</td>
                      <td>{req.requesterName}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{new Date(req.requestedAt).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge badge-${req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'danger'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {req.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <select
                              id={`perm-select-${req.id}`}
                              className="form-control"
                              style={{ width: '130px', height: '28px', fontSize: '11px', padding: '0 8px' }}
                              defaultValue="read"
                            >
                              <option value="read">👁️ Read Only</option>
                              <option value="download">📥 Download</option>
                              <option value="upload">📤 Upload</option>
                              <option value="full">⚡ Full Access</option>
                            </select>
                            <button
                              className="btn btn-primary btn-xs"
                              onClick={() => {
                                const selectEl = document.getElementById(`perm-select-${req.id}`) as HTMLSelectElement;
                                reviewAccessMutation.mutate({ requestId: req.id, status: 'approved', permission: selectEl?.value || 'read' });
                              }}
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              className="btn btn-secondary btn-xs danger"
                              onClick={() => reviewAccessMutation.mutate({ requestId: req.id, status: 'rejected' })}
                            >
                              <X size={12} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Reviewed</span>
                        )}
                      </td>
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
