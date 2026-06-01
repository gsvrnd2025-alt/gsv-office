import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Clock, AlertCircle, CheckCircle, ArrowUp, Tag, User, MessageCircle } from 'lucide-react';
import { ticketsApi } from '../../api';
import toast from 'react-hot-toast';

const PRIORITY_COLORS: Record<string, string> = { critical: 'danger', high: 'warning', medium: 'primary', low: 'secondary' };
const STATUS_ICONS: Record<string, React.ReactNode> = {
  open: <Clock size={12} />, in_progress: <AlertCircle size={12} />,
  escalated: <ArrowUp size={12} />, resolved: <CheckCircle size={12} />, closed: <CheckCircle size={12} />,
};
const STATUS_COLORS: Record<string, string> = { open: 'primary', in_progress: 'info', escalated: 'danger', resolved: 'success', closed: 'secondary' };

export default function TicketsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const [comment, setComment] = useState('');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', status, priority],
    queryFn: () => ticketsApi.getAll({ status: status || undefined, priority: priority || undefined }).then(r => r.data?.data || r.data || []),
    refetchInterval: 15000,
  });

  const { data: categories = [] } = useQuery({ queryKey: ['ticket-cats'], queryFn: () => ticketsApi.getCategories().then(r => r.data?.data || r.data || []) });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => ticketsApi.update(id, data),
    onSuccess: () => { toast.success('Ticket updated'); qc.invalidateQueries({ queryKey: ['tickets'] }); },
    onError: () => toast.error('Update failed'),
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }: any) => ticketsApi.addComment(id, { content }),
    onSuccess: () => { toast.success('Comment added'); setComment(''); qc.invalidateQueries({ queryKey: ['tickets'] }); },
    onError: () => toast.error('Comment failed'),
  });

  const filtered = tickets.filter((t: any) => !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.number?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header">
        <div><h1>🎫 Helpdesk & Ticketing</h1><p>Track and resolve team issues efficiently</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Ticket</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Open', val: tickets.filter((t: any) => t.status === 'open').length, color: 'var(--brand-primary)', icon: Clock },
          { label: 'In Progress', val: tickets.filter((t: any) => t.status === 'in_progress').length, color: 'var(--brand-info)', icon: AlertCircle },
          { label: 'Escalated', val: tickets.filter((t: any) => t.status === 'escalated').length, color: 'var(--brand-danger)', icon: ArrowUp },
          { label: 'Resolved', val: tickets.filter((t: any) => t.status === 'resolved' || t.status === 'closed').length, color: 'var(--brand-success)', icon: CheckCircle },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              <s.icon size={20} />
            </div>
            <div><div style={{ fontSize: '24px', fontWeight: 800, color: s.color, fontFamily: '"Space Grotesk", sans-serif' }}>{s.val}</div><div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.label}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '20px' }}>
        {/* Ticket List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Filters */}
          <div className="card card-body" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}><input type="text" className="form-control" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} style={{ height: '34px', fontSize: '13px' }} /></div>
            <select className="form-control" style={{ width: '130px' }} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">All Status</option>
              {['open', 'in_progress', 'escalated', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select className="form-control" style={{ width: '120px' }} value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="">All Priority</option>
              {['critical', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '12px' }} />) :
              filtered.length === 0 ? (
                <div className="card"><div className="empty-state"><CheckCircle size={40} /><h3>All clear!</h3><p>No tickets match your filters</p></div></div>
              ) : filtered.map((ticket: any) => (
                <div key={ticket.id} onClick={() => setSelected(ticket)} className={`card card-hoverable`}
                  style={{ padding: '16px', cursor: 'pointer', borderColor: selected?.id === ticket.id ? 'var(--brand-primary)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--brand-primary)', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{ticket.number}</span>
                        <span className={`badge badge-${STATUS_COLORS[ticket.status] || 'secondary'}`} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {STATUS_ICONS[ticket.status]}{ticket.status?.replace('_', ' ')}
                        </span>
                        <span className={`badge badge-${PRIORITY_COLORS[ticket.priority] || 'secondary'}`}>{ticket.priority}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        <span><User size={10} /> {ticket.raised_by_name || 'Unknown'}</span>
                        {ticket.category_name && <span><Tag size={10} /> {ticket.category_name}</span>}
                        <span><Clock size={10} /> {new Date(ticket.created_at).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="card" style={{ position: 'sticky', top: 'calc(var(--topbar-height) + 16px)', height: 'fit-content', maxHeight: 'calc(100vh - var(--topbar-height) - 120px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--brand-primary)' }}>{selected.number}</span>
                  <span className={`badge badge-${STATUS_COLORS[selected.status]}`}>{selected.status?.replace('_', ' ')}</span>
                  <span className={`badge badge-${PRIORITY_COLORS[selected.priority]}`}>{selected.priority}</span>
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginTop: '8px' }}>{selected.title}</h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selected.description || 'No description provided.'}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <select className="form-control" style={{ flex: 1 }} value={selected.status}
                    onChange={e => { updateMutation.mutate({ id: selected.id, data: { status: e.target.value } }); setSelected({ ...selected, status: e.target.value }); }}>
                    {['open', 'in_progress', 'escalated', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" className="form-control" placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && comment) commentMutation.mutate({ id: selected.id, content: comment }); }} />
                    <button className="btn btn-primary btn-sm" onClick={() => comment && commentMutation.mutate({ id: selected.id, content: comment })} disabled={!comment || commentMutation.isPending}>
                      <MessageCircle size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state"><CheckCircle size={40} /><h3>Select a Ticket</h3><p>Click a ticket to view details</p></div>
          )}
        </div>
      </div>

      {showCreate && <CreateTicketModal categories={categories} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['tickets'] }); toast.success('Ticket created'); }} />}
    </div>
  );
}

function CreateTicketModal({ categories, onClose, onSuccess }: any) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', categoryId: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await ticketsApi.create(form); onSuccess(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scale-in">
        <div className="modal-header"><h3 className="modal-title">New Support Ticket</h3><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group"><label className="form-label">Title <span className="required">*</span></label><input type="text" className="form-control" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Brief description of the issue" /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detailed description..." /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group"><label className="form-label">Priority</label>
                <select className="form-control" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {['critical', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Category</label>
                <select className="form-control" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                  <option value="">Select category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Ticket'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
