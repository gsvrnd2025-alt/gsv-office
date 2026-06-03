import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Mail, Inbox, Send, Trash2, Archive, Star, Plus, Reply, 
  Forward, Search, ChevronLeft, StarOff, CheckSquare, Square,
  Clock, ArrowLeft, RefreshCw, Paperclip, Minimize2, Maximize2, X,
  AlertCircle, Tag, Users, Bell
} from 'lucide-react';
import { emailApi, usersApi } from '../../api';
import toast from 'react-hot-toast';

export default function EmailPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [folder, setFolder] = useState('inbox');
  const [selected, setSelected] = useState<any>(null);
  const [compose, setCompose] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);

  // Parse compose param from URL query parameter (clicked from Chat page)
  useEffect(() => {
    const composeTarget = searchParams.get('compose');
    if (composeTarget) {
      setTo(composeTarget);
      setCompose(true);
      setComposeMinimized(false);
      
      // Clear query param to avoid reopening dialog on page refresh
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('compose');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Category tab state
  const [activeCategory, setActiveCategory] = useState<'primary' | 'social' | 'updates' | 'promotions'>('primary');

  // Compose Form states
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Auto-complete recipient selection states
  const [activeSearchInput, setActiveSearchInput] = useState<'to' | 'cc' | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  const { data: emails = [], isLoading, refetch } = useQuery({
    queryKey: ['emails', folder],
    queryFn: () => emailApi.getEmails(folder).then(r => r.data?.data || r.data || []),
    refetchInterval: 15000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-list-email'],
    queryFn: () => usersApi.getAll().then(r => r.data?.data?.data || r.data?.data || r.data || []),
  });

  const allUsers = Array.isArray(usersData) ? usersData : (usersData?.data ? usersData.data : []);

  const sendEmailMutation = useMutation({
    mutationFn: (variables: any) => emailApi.sendEmail(variables),
    onSuccess: () => {
      toast.success('Email sent successfully!');
      setCompose(false);
      setTo('');
      setCc('');
      setSubject('');
      setBody('');
      qc.invalidateQueries({ queryKey: ['emails', 'sent'] });
    },
    onError: () => {
      toast.error('Failed to send email');
    }
  });

  const deleteEmailMutation = useMutation({
    mutationFn: (id: string) => emailApi.deleteEmail(id),
    onSuccess: () => {
      toast.success('Email deleted');
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['emails', folder] });
    },
    onError: () => toast.error('Delete failed')
  });

  const toggleStarMutation = useMutation({
    mutationFn: ({ id, isStarred }: { id: string; isStarred: boolean }) => emailApi.toggleStar(id, isStarred),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emails', folder] });
    },
    onError: () => toast.error('Failed to update starred status')
  });

  const updateReadStatusMutation = useMutation({
    mutationFn: ({ id, isRead }: { id: string; isRead: boolean }) => emailApi.updateReadStatus(id, isRead),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emails', folder] });
    }
  });

  const handleToggleStar = (e: React.MouseEvent, email: any) => {
    e.stopPropagation();
    toggleStarMutation.mutate({ id: email.id, isStarred: !email.is_starred });
  };

  const handleRowClick = (email: any) => {
    setSelected(email);
    if (!email.is_read) {
      updateReadStatusMutation.mutate({ id: email.id, isRead: true });
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error('Please fill in To, Subject and Message body');
      return;
    }
    const toList = to.split(',').map(s => s.trim()).filter(Boolean);
    const ccList = cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : [];
    sendEmailMutation.mutate({
      to: toList,
      cc: ccList,
      subject,
      body,
      isHtml: false
    });
  };

  const handleSelectRecipient = (emailAddress: string) => {
    if (activeSearchInput === 'to') {
      const parts = to.split(',').map(s => s.trim()).filter(Boolean);
      parts.pop(); // Remove current search term segment
      parts.push(emailAddress);
      setTo(parts.join(', ') + ', ');
    } else if (activeSearchInput === 'cc') {
      const parts = cc.split(',').map(s => s.trim()).filter(Boolean);
      parts.pop();
      parts.push(emailAddress);
      setCc(parts.join(', ') + ', ');
    }
    setActiveSearchInput(null);
  };

  const folders = [
    { key: 'inbox', label: 'Inbox', icon: Inbox },
    { key: 'starred', label: 'Starred', icon: Star },
    { key: 'sent', label: 'Sent', icon: Send },
    { key: 'trash', label: 'Trash', icon: Trash2 },
  ];

  // Client-side search and category filtering
  const filteredEmails = emails
    .filter((email: any) => {
      if (folder === 'starred') {
        return email.is_starred;
      }
      return true;
    })
    .filter((email: any) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        email.subject?.toLowerCase().includes(q) ||
        email.body_text?.toLowerCase().includes(q) ||
        email.from_address?.toLowerCase().includes(q) ||
        email.from_name?.toLowerCase().includes(q)
      );
    })
    .filter((email: any) => {
      const subjectLower = (email.subject || '').toLowerCase();
      const bodyLower = (email.body_text || '').toLowerCase();
      if (activeCategory === 'social') {
        return subjectLower.includes('chat') || subjectLower.includes('group') || bodyLower.includes('teammate') || bodyLower.includes('department');
      }
      if (activeCategory === 'promotions') {
        return subjectLower.includes('offer') || subjectLower.includes('discount') || subjectLower.includes('quota') || bodyLower.includes('purchase');
      }
      if (activeCategory === 'updates') {
        return subjectLower.includes('sync') || subjectLower.includes('setting') || subjectLower.includes('audit') || bodyLower.includes('system');
      }
      const isSocial = subjectLower.includes('chat') || subjectLower.includes('group') || bodyLower.includes('teammate') || bodyLower.includes('department');
      const isPromo = subjectLower.includes('offer') || subjectLower.includes('discount') || subjectLower.includes('quota') || bodyLower.includes('purchase');
      const isUpdate = subjectLower.includes('sync') || subjectLower.includes('setting') || subjectLower.includes('audit') || bodyLower.includes('system');
      return !isSocial && !isPromo && !isUpdate;
    });

  const unreadInboxCount = emails.filter((e: any) => !e.is_read && e.folder === 'inbox').length;

  const filteredUsers = allUsers.filter((u: any) => {
    if (!searchFilter) return true;
    const sf = searchFilter.toLowerCase();
    return (
      (u.fullName || '').toLowerCase().includes(sf) ||
      (u.loginId || '').toLowerCase().includes(sf) ||
      (u.email || '').toLowerCase().includes(sf)
    );
  });

  return (
    <div className="page-enter" style={{ display: 'flex', gap: '16px', height: 'calc(100vh - var(--topbar-height) - 48px)', position: 'relative' }}>
      
      {/* Gmail-Style Left Sidebar */}
      <div className="card" style={{ width: '220px', flexShrink: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button 
          className="btn btn-primary" 
          onClick={() => { setCompose(true); setComposeMinimized(false); }} 
          style={{ marginBottom: '16px', borderRadius: '24px', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', height: '48px', fontWeight: 600 }}
        >
          <Plus size={20} /> Compose
        </button>

        {folders.map(f => {
          const isActive = folder === f.key;
          return (
            <div 
              key={f.key} 
              onClick={() => { setFolder(f.key); setSelected(null); }}
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', 
                background: isActive ? 'var(--bg-selected)' : 'transparent', 
                color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)', 
                fontSize: '13px', fontWeight: isActive ? 700 : 500, transition: 'all 0.2s' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <f.icon size={16} style={{ color: isActive ? 'var(--brand-primary)' : 'var(--text-tertiary)' }} />
                <span>{f.label}</span>
              </div>
              {f.key === 'inbox' && unreadInboxCount > 0 && (
                <span className="badge badge-secondary" style={{ fontSize: '10px', padding: '2px 6px', fontWeight: 700 }}>{unreadInboxCount}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Mail Workstation Area */}
      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        
        {selected ? (
          /* Email Reading Pane / Detail View */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header bar */}
            <div className="card-header" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(null)} title="Back to Inbox">
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{selected.subject || '(No subject)'}</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>From: **{selected.from_name || 'System'}** &lt;{selected.from_address}&gt;</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { if(confirm('Delete this email?')) { deleteEmailMutation.mutate(selected.id); } }}><Trash2 size={13} /> Delete</button>
                <button className="btn btn-secondary btn-sm"><Reply size={13} /> Reply</button>
                <button className="btn btn-secondary btn-sm"><Forward size={13} /> Forward</button>
              </div>
            </div>
            {/* Body */}
            <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--bg-secondary)' }}>
              <div 
                style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', padding: '20px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '300px' }} 
                dangerouslySetInnerHTML={{ __html: selected.body_html || selected.body_text || 'No content' }} 
              />
            </div>
          </div>
        ) : (
          /* Email List View with Gmail Layout */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Top Toolbar with Search bar */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                <div className="search-bar" style={{ flex: 1, position: 'relative' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-tertiary)' }} />
                  <input 
                    type="text" 
                    placeholder="Search mail..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="form-control" 
                    style={{ paddingLeft: '38px', borderRadius: '20px', height: '36px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => refetch()} title="Refresh Mailbox">
                  <RefreshCw size={14} />
                </button>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Showing: <strong>{filteredEmails.length}</strong> conversations
              </div>
            </div>

            {/* Horizontal Gmail Category Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              {[
                { key: 'primary', label: '✉️ Primary', icon: Inbox, desc: 'Personal messages' },
                { key: 'social', label: '👥 Social', icon: Users, desc: 'Team & department DMs' },
                { key: 'updates', label: '🔔 Updates', icon: Bell, desc: 'ZFS logs, backups, settings sync' },
                { key: 'promotions', label: '🏷️ Promotions', icon: Tag, desc: 'Billing, purchases, storage caps' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveCategory(tab.key as any)}
                  style={{
                    flex: 1, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    color: activeCategory === tab.key ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    borderBottom: activeCategory === tab.key ? '3px solid var(--brand-primary)' : 'none',
                    fontWeight: activeCategory === tab.key ? 700 : 500, fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.15s'
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{ fontSize: '9px', fontWeight: 'normal', color: 'var(--text-tertiary)' }}>{tab.desc}</span>
                </button>
              ))}
            </div>

            {/* Emails List Table */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {isLoading ? (
                <div style={{ padding: '48px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
              ) : filteredEmails.length === 0 ? (
                <div className="empty-state" style={{ padding: '80px 48px' }}>
                  <Mail size={48} style={{ color: 'var(--text-tertiary)', opacity: 0.3, marginBottom: '12px' }} />
                  <h3>No mail matching criteria</h3>
                  <p>Check spelling or select a different category tab</p>
                </div>
              ) : (
                filteredEmails.map((email: any) => {
                  const snippet = email.body_text || email.body_html?.replace(/<[^>]*>/g, '') || '';
                  return (
                    <div 
                      key={email.id} 
                      onClick={() => handleRowClick(email)}
                      className="group"
                      style={{ 
                        display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', 
                        background: !email.is_read ? 'rgba(99,102,241,0.03)' : 'transparent', 
                        fontWeight: !email.is_read ? 700 : 400, transition: 'all 0.15s', position: 'relative'
                      }}
                    >
                      {/* Checkbox and Star Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }} onClick={e => e.stopPropagation()}>
                        <Square size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.5 }} />
                        <span onClick={(e) => handleToggleStar(e, email)} style={{ display: 'inline-flex', cursor: 'pointer' }}>
                          <Star size={15} fill={email.is_starred ? '#f59e0b' : 'none'} style={{ color: email.is_starred ? '#f59e0b' : 'var(--text-tertiary)' }} />
                        </span>
                      </div>

                      {/* Sender */}
                      <div style={{ width: '150px', flexShrink: 0, fontSize: '13px', color: !email.is_read ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email.from_name || email.from_address || 'Unknown'}
                      </div>

                      {/* Subject + Snippet */}
                      <div style={{ flex: 1, minWidth: 0, fontSize: '13px', display: 'flex', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '80px' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: !email.is_read ? 700 : 500 }}>{email.subject || '(No subject)'}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>— {snippet}</span>
                      </div>

                      {/* Date & Hover Quick Actions */}
                      <div style={{ position: 'absolute', right: '16px', display: 'flex', alignItems: 'center' }}>
                        {/* Standard Date (hidden on hover) */}
                        <span className="group-hover-hide" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {email.received_at ? new Date(email.received_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                        </span>
                        
                        {/* Hover Quick Actions Bar */}
                        <div className="group-hover-show" style={{ display: 'none', gap: '6px', background: 'var(--bg-card)', paddingLeft: '8px' }} onClick={e => e.stopPropagation()}>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => deleteEmailMutation.mutate(email.id)}><Trash2 size={13} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Archive"><Archive size={13} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" title={email.is_read ? 'Mark Unread' : 'Mark Read'} onClick={() => updateReadStatusMutation.mutate({ id: email.id, isRead: !email.is_read })}><Mail size={13} /></button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}
      </div>

      {/* Floating Compose Dialog at Bottom Right */}
      {compose && (
        <div 
          className="card" 
          style={{ 
            position: 'fixed', bottom: 0, right: '80px', width: '500px', 
            height: composeMinimized ? '44px' : '450px', zIndex: 1100, 
            boxShadow: '0 12px 30px rgba(0,0,0,0.25)', border: '1px solid var(--border-color)',
            display: 'flex', flexDirection: 'column', overflow: composeMinimized ? 'hidden' : 'visible', transition: 'height 0.2s ease-in-out'
          }}
        >
          {/* Compose Header */}
          <div style={{ background: '#202c33', color: 'white', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setComposeMinimized(!composeMinimized)}>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>New Message</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={e => e.stopPropagation()}>
              <button style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }} onClick={() => setComposeMinimized(!composeMinimized)}>
                <Minimize2 size={13} />
              </button>
              <button style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }} onClick={() => setCompose(false)}>
                <X size={13} />
              </button>
            </div>
          </div>

          {!composeMinimized && (
            <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
              {/* Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', padding: '8px 16px', alignItems: 'center', position: 'relative' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', width: '40px' }}>To</span>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ border: 'none', padding: 0, height: 'auto', background: 'transparent' }} 
                    placeholder="recipients separated by comma..." 
                    value={to} 
                    onChange={e => {
                      setTo(e.target.value);
                      setSearchFilter(e.target.value.split(',').pop()?.trim() || '');
                    }}
                    onFocus={() => {
                      setActiveSearchInput('to');
                      setSearchFilter(to.split(',').pop()?.trim() || '');
                    }}
                    required 
                  />
                </div>
                <div style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', padding: '8px 16px', alignItems: 'center', position: 'relative' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', width: '40px' }}>Cc</span>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ border: 'none', padding: 0, height: 'auto', background: 'transparent' }} 
                    value={cc} 
                    onChange={e => {
                      setCc(e.target.value);
                      setSearchFilter(e.target.value.split(',').pop()?.trim() || '');
                    }} 
                    onFocus={() => {
                      setActiveSearchInput('cc');
                      setSearchFilter(cc.split(',').pop()?.trim() || '');
                    }}
                  />
                </div>
                <div style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', padding: '8px 16px', alignItems: 'center' }}>
                  <input type="text" className="form-control" style={{ border: 'none', padding: 0, height: 'auto', background: 'transparent' }} placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} required />
                </div>
              </div>

              {/* Autocomplete Recipient Search List */}
              {activeSearchInput && (
                <div 
                  style={{
                    position: 'absolute',
                    top: activeSearchInput === 'to' ? '38px' : '74px', // aligned directly under the respective field
                    left: '16px', right: '16px',
                    maxHeight: '180px', overflowY: 'auto',
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    borderRadius: '8px', zIndex: 1200, boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                  }}
                  onMouseLeave={() => setActiveSearchInput(null)}
                >
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-tertiary)' }}>No matching users found</div>
                  ) : (
                    filteredUsers.map((u: any) => (
                      <div
                        key={u.id}
                        onClick={() => handleSelectRecipient(u.email || `${u.loginId}@gsv.local`)}
                        style={{
                          padding: '8px 16px', fontSize: '12px', cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          display: 'flex', flexDirection: 'column', gap: '2px'
                        }}
                        className="dropdown-item-hover"
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.fullName}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{u.email || `${u.loginId}@gsv.local`}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Message body */}
              <div style={{ flex: 1, padding: '12px 16px' }}>
                <textarea 
                  className="form-control" 
                  style={{ border: 'none', width: '100%', height: '100%', resize: 'none', padding: 0, background: 'transparent' }} 
                  placeholder="Say hello here..."
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  required
                />
              </div>

              {/* Send controls footer */}
              <div style={{ borderTop: '1px solid var(--border-color)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '6px 18px', borderRadius: '18px' }} disabled={sendEmailMutation.isPending}>
                    {sendEmailMutation.isPending ? 'Sending...' : 'Send'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Attach file"><Paperclip size={14} /></button>
                </div>
                <button type="button" className="btn btn-ghost btn-icon btn-sm danger" onClick={() => setCompose(false)} title="Discard"><Trash2 size={14} /></button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Embedded CSS rules for hover elements */}
      <style>{`
        .group:hover .group-hover-show {
          display: flex !important;
        }
        .group:hover .group-hover-hide {
          display: none !important;
        }
        .dropdown-item-hover:hover {
          background: rgba(99,102,241,0.08) !important;
        }
      `}</style>

    </div>
  );
}
