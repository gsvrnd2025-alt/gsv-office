import { useQuery } from '@tanstack/react-query';
import { Puzzle, Power, PowerOff, Trash2, Upload, CheckCircle } from 'lucide-react';
import { useState } from 'react';

// Static plugin registry (would be fetched from backend)
const BUILTIN_PLUGINS = [
  { id: 'gsv-pdf-viewer', name: 'PDF Viewer', description: 'View PDF files directly in the browser without downloading', version: '1.0.0', author: 'GSV Team', status: 'enabled', icon: '📄' },
  { id: 'gsv-barcode-scanner', name: 'Barcode Scanner', description: 'Scan barcodes and QR codes for inventory management', version: '1.0.0', author: 'GSV Team', status: 'disabled', icon: '📷' },
  { id: 'gsv-bulk-email', name: 'Bulk Email', description: 'Send bulk emails with templates to customers and team', version: '1.0.0', author: 'GSV Team', status: 'enabled', icon: '📧' },
  { id: 'gsv-sms-notify', name: 'SMS Notifications', description: 'Send SMS alerts for tickets, billing, and reminders', version: '1.0.0', author: 'GSV Team', status: 'disabled', icon: '📱' },
  { id: 'gsv-report-builder', name: 'Report Builder', description: 'Build and schedule custom business reports', version: '1.0.0', author: 'GSV Team', status: 'enabled', icon: '📊' },
  { id: 'gsv-crm', name: 'CRM Module', description: 'Customer relationship management with leads and pipeline', version: '1.0.0', author: 'GSV Team', status: 'disabled', icon: '🤝' },
];

export default function PluginsPage() {
  const [plugins, setPlugins] = useState(BUILTIN_PLUGINS);

  const toggle = (id: string) => {
    setPlugins(ps => ps.map(p => p.id === id ? { ...p, status: p.status === 'enabled' ? 'disabled' : 'enabled' } : p));
  };

  const enabled = plugins.filter(p => p.status === 'enabled').length;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div><h1>🧩 Plugin Framework</h1><p>Extend GSV Office with additional modules</p></div>
        <button className="btn btn-secondary"><Upload size={16} /> Install Plugin</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total Plugins', value: plugins.length, color: 'var(--brand-primary)' },
          { label: 'Enabled', value: enabled, color: 'var(--brand-success)' },
          { label: 'Disabled', value: plugins.length - enabled, color: 'var(--text-tertiary)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: '"Space Grotesk", sans-serif', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Plugin Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {plugins.map(plugin => (
          <div key={plugin.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                  {plugin.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{plugin.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>v{plugin.version} · {plugin.author}</div>
                </div>
              </div>
              <span className={`badge ${plugin.status === 'enabled' ? 'badge-success' : 'badge-secondary'}`}>
                {plugin.status === 'enabled' ? <CheckCircle size={9} /> : null}
                {plugin.status}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{plugin.description}</p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'auto' }}>
              <button
                className={`btn btn-sm ${plugin.status === 'enabled' ? 'btn-danger' : 'btn-success'}`}
                onClick={() => toggle(plugin.id)}
              >
                {plugin.status === 'enabled' ? <><PowerOff size={13} /> Disable</> : <><Power size={13} /> Enable</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
