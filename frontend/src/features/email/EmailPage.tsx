import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Inbox, Send, Trash2, Archive, Star, Plus, Reply, Forward } from 'lucide-react';
import { emailApi } from '../../api';

export default function EmailPage() {
  const [folder, setFolder] = useState('inbox');
  const [selected, setSelected] = useState<any>(null);
  const [compose, setCompose] = useState(false);

  const { data: emails = [] } = useQuery({
    queryKey: ['emails', folder],
    queryFn: () => emailApi.getEmails(folder).then(r => r.data?.data || r.data || []),
    refetchInterval: 30000,
  });

  const folders = [
    { key: 'inbox', label: 'Inbox', icon: Inbox },
    { key: 'sent', label: 'Sent', icon: Send },
    { key: 'archive', label: 'Archive', icon: Archive },
    { key: 'trash', label: 'Trash', icon: Trash2 },
  ];

  return (
    <div className="page-enter" style={{ display: 'flex', gap: '16px', height: 'calc(100vh - var(--topbar-height) - 48px)' }}>
      {/* Sidebar */}
      <div className="card" style={{ width: '200px', flexShrink: 0, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button className="btn btn-primary btn-sm" onClick={() => setCompose(true)} style={{ marginBottom: '8px' }}><Plus size={14} /> Compose</button>
        {folders.map(f => (
          <div key={f.key} onClick={() => setFolder(f.key)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: folder === f.key ? 'var(--bg-selected)' : 'transparent', color: folder === f.key ? 'var(--brand-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: folder === f.key ? 600 : 400, transition: 'all 0.15s' }}>
            <f.icon size={15} />{f.label}
          </div>
        ))}
      </div>

      {/* Email List */}
      <div className="card" style={{ width: '320px', flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="card-header" style={{ padding: '14px 16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700 }}>{folder.charAt(0).toUpperCase() + folder.slice(1)}</h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {emails.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px' }}><Mail size={36} /><h3>No emails</h3></div>
          ) : emails.map((email: any) => (
            <div key={email.id} onClick={() => setSelected(email)}
              style={{ padding: '12px 16px', borderBottom: '1px solid var(--divider)', cursor: 'pointer', background: selected?.id === email.id ? 'var(--bg-selected)' : (!email.is_read ? 'var(--bg-hover)' : 'transparent'), transition: 'background 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: email.is_read ? 400 : 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{email.from_name || email.from_address || 'Unknown'}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0 }}>{email.received_at ? new Date(email.received_at).toLocaleDateString('en-IN', {day:'numeric',month:'short'}) : ''}</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: email.is_read ? 400 : 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.subject || '(No subject)'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Detail */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selected ? (
          <>
            <div className="card-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{selected.subject || '(No subject)'}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>From: {selected.from_address}</p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm"><Reply size={14} /> Reply</button>
                <button className="btn btn-secondary btn-sm"><Forward size={14} /> Forward</button>
              </div>
            </div>
            <div className="card-body" style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: selected.body_html || selected.body_text || 'No content' }} />
            </div>
          </>
        ) : (
          <div className="empty-state"><Mail size={56} /><h3>Select an email</h3><p>Choose an email from the list to read it</p></div>
        )}
      </div>
    </div>
  );
}
