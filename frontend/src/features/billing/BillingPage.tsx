import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Receipt, Users, CreditCard, TrendingUp, Search, Download, Eye, Filter } from 'lucide-react';
import { billingApi } from '../../api';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = { draft: 'secondary', sent: 'info', viewed: 'primary', partially_paid: 'warning', paid: 'success', overdue: 'danger', cancelled: 'secondary' };

export default function BillingPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'invoices' | 'customers' | 'payments'>('invoices');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, typeFilter],
    queryFn: () => billingApi.getInvoices({ status: statusFilter || undefined, type: typeFilter || undefined }).then(r => r.data?.data || r.data || []),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => billingApi.getCustomers().then(r => r.data?.data || r.data || []),
  });

  const invoices = (Array.isArray(invoicesData) ? invoicesData : []).filter((i: any) => !search || i.number?.toLowerCase().includes(search.toLowerCase()) || i.customer_name?.toLowerCase().includes(search.toLowerCase()));

  const totalRevenue = invoices.filter((i: any) => i.type === 'invoice').reduce((sum: number, i: any) => sum + parseFloat(i.total || 0), 0);
  const outstanding = invoices.filter((i: any) => i.status !== 'paid').reduce((sum: number, i: any) => sum + parseFloat(i.balance_due || 0), 0);
  const paidInvoices = invoices.filter((i: any) => i.status === 'paid').length;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div><h1>💳 Billing & Finance</h1><p>Invoices, payments, and customer management</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Invoice</button>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        {[
          { label: 'Total Invoiced', value: `₹${(totalRevenue / 1000).toFixed(1)}K`, color: 'primary', sub: `${invoices.filter((i:any) => i.type === 'invoice').length} invoices` },
          { label: 'Outstanding', value: `₹${(outstanding / 1000).toFixed(1)}K`, color: 'warning', sub: 'Pending collection' },
          { label: 'Paid Invoices', value: paidInvoices, color: 'success', sub: 'Completed payments' },
          { label: 'Active Customers', value: customers.length, color: 'info', sub: 'Customer accounts' },
        ].map((stat, i) => (
          <div key={i} className={`stat-card ${stat.color}`}>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="card">
        <div style={{ padding: '0 20px' }}>
          <div className="tabs">
            {['invoices', 'customers', 'payments'].map(t => (
              <div key={t} className={`tab-item ${tab === t ? 'active' : ''}`} onClick={() => setTab(t as any)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </div>
            ))}
          </div>
        </div>

        {tab === 'invoices' && (
          <>
            <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <input type="text" className="form-control" style={{ flex: 1, minWidth: '180px', height: '34px', fontSize: '13px' }} placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
              <select className="form-control" style={{ width: '140px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                {['draft', 'sent', 'paid', 'partially_paid', 'overdue'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <select className="form-control" style={{ width: '140px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">All Types</option>
                {['invoice', 'quotation', 'estimate', 'credit_note'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>

            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead><tr><th>Number</th><th>Customer</th><th>Type</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({length:8}).map((_,j)=><td key={j}><div className="skeleton" style={{height:'16px',width:'80%'}}/></td>)}</tr>) :
                    invoices.length === 0 ? <tr><td colSpan={8}><div className="empty-state" style={{padding:'48px'}}><Receipt size={40}/><h3>No invoices found</h3><p>Create your first invoice</p></div></td></tr> :
                    invoices.map((inv: any) => (
                      <tr key={inv.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--brand-primary)' }}>{inv.number}</td>
                        <td style={{ fontSize: '13px' }}>{inv.customer_name || '—'}</td>
                        <td><span className="badge badge-secondary" style={{ fontSize: '10px' }}>{inv.type}</span></td>
                        <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '—'}</td>
                        <td style={{ fontSize: '13px', fontWeight: 600 }}>₹{parseFloat(inv.total || 0).toLocaleString('en-IN')}</td>
                        <td style={{ fontSize: '13px', color: parseFloat(inv.balance_due) > 0 ? 'var(--brand-warning)' : 'var(--brand-success)', fontWeight: 500 }}>₹{parseFloat(inv.balance_due || 0).toLocaleString('en-IN')}</td>
                        <td><span className={`badge badge-${STATUS_COLORS[inv.status] || 'secondary'}`}>{inv.status?.replace('_', ' ')}</span></td>
                        <td><div style={{display:'flex',gap:'4px'}}><button className="btn btn-ghost btn-icon btn-sm" title="View"><Eye size={14}/></button><button className="btn btn-ghost btn-icon btn-sm" title="Download"><Download size={14}/></button></div></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'customers' && (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>GSTIN</th><th>City</th></tr></thead>
              <tbody>
                {customers.length === 0 ? <tr><td colSpan={5}><div className="empty-state" style={{padding:'48px'}}><Users size={40}/><h3>No customers</h3><p>Add your first customer</p></div></td></tr> :
                  customers.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{fontWeight:600,fontSize:'13px'}}>{c.name}</td>
                      <td style={{fontSize:'12px',color:'var(--text-secondary)'}}>{c.email || '—'}</td>
                      <td style={{fontSize:'12px'}}>{c.phone || '—'}</td>
                      <td style={{fontFamily:'monospace',fontSize:'11px'}}>{c.gstin || '—'}</td>
                      <td style={{fontSize:'12px',color:'var(--text-secondary)'}}>{c.city || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'payments' && (
          <div className="empty-state" style={{padding:'64px'}}><CreditCard size={48}/><h3>Payment Records</h3><p>Payment transactions will appear here</p></div>
        )}
      </div>

      {showCreate && <CreateInvoiceModal customers={customers} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice created'); }} />}
    </div>
  );
}

function CreateInvoiceModal({ customers, onClose, onSuccess }: any) {
  const [form, setForm] = useState({ type: 'invoice', customerId: '', invoiceDate: new Date().toISOString().split('T')[0], dueDate: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await billingApi.createInvoice({ ...form, items: [] }); onSuccess(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scale-in">
        <div className="modal-header"><h3 className="modal-title">Create Invoice</h3><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group"><label className="form-label">Document Type</label>
                <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
                  {['invoice', 'quotation', 'estimate', 'sales_order'].map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Customer</label>
                <select className="form-control" value={form.customerId} onChange={e => set('customerId', e.target.value)}>
                  <option value="">Select customer</option>
                  {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Invoice Date</label><input type="date" className="form-control" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Due Date</label><input type="date" className="form-control" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Payment terms, notes..." style={{ minHeight: '80px' }} /></div>
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
