import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Truck, Plus, Package, Search } from 'lucide-react';
import { purchaseApi } from '../../api';
import { useState } from 'react';

export default function PurchasePage() {
  const [tab, setTab] = useState<'orders' | 'suppliers'>('orders');
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['purchase-orders'], queryFn: () => purchaseApi.getOrders().then(r => r.data?.data || r.data || []) });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: () => purchaseApi.getSuppliers().then(r => r.data?.data || r.data || []) });

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div><h1>🛒 Purchase Management</h1><p>Purchase orders and supplier management</p></div>
        <button className="btn btn-primary"><Plus size={16} /> New Purchase Order</button>
      </div>

      <div className="card">
        <div style={{ padding: '0 20px' }}>
          <div className="tabs">
            <div className={`tab-item ${tab === 'orders' ? 'active' : ''}`} onClick={() => setTab('orders')}>Purchase Orders</div>
            <div className={`tab-item ${tab === 'suppliers' ? 'active' : ''}`} onClick={() => setTab('suppliers')}>Suppliers</div>
          </div>
        </div>

        {tab === 'orders' && (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead><tr><th>PO Number</th><th>Supplier</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {orders.length === 0 ? <tr><td colSpan={5}><div className="empty-state" style={{padding:'48px'}}><ShoppingCart size={40}/><h3>No purchase orders</h3></div></td></tr> :
                  orders.map((o: any) => (
                    <tr key={o.id}>
                      <td style={{fontFamily:'monospace',color:'var(--brand-primary)',fontSize:'12px'}}>{o.number}</td>
                      <td style={{fontSize:'13px'}}>{o.supplier_name || '—'}</td>
                      <td style={{fontSize:'12px',color:'var(--text-tertiary)'}}>{o.order_date ? new Date(o.order_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td><span className="badge badge-secondary">{o.status}</span></td>
                      <td style={{fontWeight:600}}>₹{parseFloat(o.total_amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'suppliers' && (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead><tr><th>Supplier</th><th>Email</th><th>Phone</th><th>GSTIN</th></tr></thead>
              <tbody>
                {suppliers.length === 0 ? <tr><td colSpan={4}><div className="empty-state" style={{padding:'48px'}}><Truck size={40}/><h3>No suppliers</h3></div></td></tr> :
                  suppliers.map((s: any) => (
                    <tr key={s.id}>
                      <td style={{fontWeight:600,fontSize:'13px'}}>{s.name}</td>
                      <td style={{fontSize:'12px',color:'var(--text-secondary)'}}>{s.email || '—'}</td>
                      <td style={{fontSize:'12px'}}>{s.phone || '—'}</td>
                      <td style={{fontFamily:'monospace',fontSize:'11px'}}>{s.gstin || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
