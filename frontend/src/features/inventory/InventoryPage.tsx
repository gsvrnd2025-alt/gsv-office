import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package, AlertTriangle, TrendingDown, BarChart3, Edit, MinusCircle, PlusCircle } from 'lucide-react';
import { inventoryApi } from '../../api';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<any>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', search, lowStock],
    queryFn: () => inventoryApi.getProducts({ search: search || undefined, lowStock: lowStock ? 'true' : undefined }).then(r => r.data?.data || r.data || []),
    refetchInterval: 30000,
  });

  const { data: categories = [] } = useQuery({ queryKey: ['product-cats'], queryFn: () => inventoryApi.getCategories().then(r => r.data?.data || r.data || []) });

  const adjustMutation = useMutation({
    mutationFn: ({ id, qty, notes }: any) => inventoryApi.adjustStock(id, { qty, notes }),
    onSuccess: () => { toast.success('Stock adjusted'); setAdjustProduct(null); qc.invalidateQueries({ queryKey: ['products'] }); },
    onError: () => toast.error('Adjustment failed'),
  });

  const totalProducts = products.length;
  const lowStockCount = products.filter((p: any) => parseInt(p.stock_qty) <= parseInt(p.reorder_level || 0) && parseInt(p.reorder_level || 0) > 0).length;
  const outOfStock = products.filter((p: any) => parseInt(p.stock_qty) === 0).length;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div><h1>📦 Inventory Management</h1><p>Products, stock levels, and movements</p></div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Add Product</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total Products', value: totalProducts, color: 'primary', icon: Package },
          { label: 'Low Stock', value: lowStockCount, color: 'warning', icon: TrendingDown },
          { label: 'Out of Stock', value: outOfStock, color: 'danger', icon: AlertTriangle },
          { label: 'Categories', value: categories.length, color: 'info', icon: BarChart3 },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `var(--brand-${s.color})22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: `var(--brand-${s.color})` }}>
              <s.icon size={20} />
            </div>
            <div><div style={{ fontSize: '24px', fontWeight: 800, fontFamily: '"Space Grotesk", sans-serif' }}>{s.value}</div><div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" className="form-control" style={{ flex: 1, minWidth: '200px', height: '34px', fontSize: '13px' }} placeholder="Search by name, SKU, barcode..." value={search} onChange={e => setSearch(e.target.value)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={lowStock} onChange={e => setLowStock(e.target.checked)} />
          Low Stock Only
        </label>
      </div>

      {/* Product Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Sell Price</th><th>Stock</th><th>Reorder Lvl</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => <tr key={i}>{Array.from({length:8}).map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',width:'80%'}}/></td>)}</tr>) :
                products.length === 0 ? <tr><td colSpan={8}><div className="empty-state" style={{padding:'48px'}}><Package size={40}/><h3>No products</h3><p>Add your first product</p></div></td></tr> :
                products.map((p: any) => {
                  const stockQty = parseInt(p.stock_qty || 0);
                  const reorder = parseInt(p.reorder_level || 0);
                  const isLow = reorder > 0 && stockQty <= reorder;
                  const isOut = stockQty === 0;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                        {p.barcode && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{p.barcode}</div>}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--brand-primary)' }}>{p.sku || '—'}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.category_name || '—'}</td>
                      <td style={{ fontSize: '13px', fontWeight: 500 }}>₹{parseFloat(p.selling_price || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: isOut ? 'var(--brand-danger)' : isLow ? 'var(--brand-warning)' : 'var(--brand-success)' }}>
                          {stockQty} <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)' }}>{p.unit}</span>
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{reorder || '—'}</td>
                      <td>
                        <span className={`badge ${isOut ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-success'}`}>
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setAdjustProduct(p)} title="Adjust Stock"><BarChart3 size={14} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" title="Edit"><Edit size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustProduct && (
        <StockAdjustModal product={adjustProduct} onClose={() => setAdjustProduct(null)}
          onConfirm={(qty: number, notes: string) => adjustMutation.mutate({ id: adjustProduct.id, qty, notes })} />
      )}

      {/* Create Product Modal */}
      {showCreate && <CreateProductModal categories={categories} onClose={() => setShowCreate(false)}
        onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['products'] }); toast.success('Product created'); }} />}
    </div>
  );
}

function StockAdjustModal({ product, onClose, onConfirm }: any) {
  const [qty, setQty] = useState(0);
  const [notes, setNotes] = useState('');
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm animate-scale-in">
        <div className="modal-header"><h3 className="modal-title">Adjust Stock — {product.name}</h3><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Current Stock</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: '"Space Grotesk", sans-serif' }}>{product.stock_qty}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Adjustment (+ add / - remove)</label>
            <input type="number" className="form-control" value={qty} onChange={e => setQty(parseFloat(e.target.value))} placeholder="+10 or -5" />
          </div>
          <div className="form-group"><label className="form-label">Reason</label><input type="text" className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Purchase receipt, damage, etc." /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(qty, notes)}>Apply Adjustment</button>
        </div>
      </div>
    </div>
  );
}

function CreateProductModal({ categories, onClose, onSuccess }: any) {
  const [form, setForm] = useState({ name: '', sku: '', unit: 'pcs', sellingPrice: '', purchasePrice: '', taxRate: '18', stockQty: '0', reorderLevel: '0', categoryId: '', hsnCode: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await inventoryApi.createProduct({ ...form, sellingPrice: parseFloat(form.sellingPrice), purchasePrice: parseFloat(form.purchasePrice), taxRate: parseFloat(form.taxRate), stockQty: parseFloat(form.stockQty), reorderLevel: parseFloat(form.reorderLevel) }); onSuccess(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg animate-scale-in">
        <div className="modal-header"><h3 className="modal-title">Add New Product</h3><button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Product Name <span className="required">*</span></label><input type="text" className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">SKU</label><input type="text" className="form-control" value={form.sku} onChange={e => set('sku', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">HSN Code</label><input type="text" className="form-control" value={form.hsnCode} onChange={e => set('hsnCode', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Selling Price (₹)</label><input type="number" className="form-control" value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Purchase Price (₹)</label><input type="number" className="form-control" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Tax Rate (%)</label><select className="form-control" value={form.taxRate} onChange={e => set('taxRate', e.target.value)}><option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></select></div>
              <div className="form-group"><label className="form-label">Unit</label><select className="form-control" value={form.unit} onChange={e => set('unit', e.target.value)}>{['pcs','kg','ltr','mtr','box','set','pair'].map(u => <option key={u} value={u}>{u}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Opening Stock</label><input type="number" className="form-control" value={form.stockQty} onChange={e => set('stockQty', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Reorder Level</label><input type="number" className="form-control" value={form.reorderLevel} onChange={e => set('reorderLevel', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Category</label><select className="form-control" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}><option value="">No Category</option>{categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Add Product'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
