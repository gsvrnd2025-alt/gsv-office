import { useQuery } from '@tanstack/react-query';
import { serverApi } from '../../api';
import { Shield, AlertTriangle, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function InternshipAdminPage() {
  const [loading, setLoading] = useState(true);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['server-settings'],
    queryFn: () => serverApi.getSettings().then(r => r.data?.data || r.data || [])
  });

  const appscriptId = settings.find((s: any) => s.key === 'google_appscript_deployment_id')?.value 
    || settings.find((s: any) => s.key === 'google_sheets_deployment_id')?.value 
    || '';

  const iframeUrl = appscriptId 
    ? `https://script.google.com/macros/s/${appscriptId.trim()}/exec?page=admin_dashboard`
    : '';

  if (isLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-secondary" style={{ fontWeight: 500 }}>Connecting to Internship Portal...</p>
        </div>
      </div>
    );
  }

  if (!appscriptId) {
    return (
      <div 
        className="d-flex flex-column align-items-center justify-content-center text-center animate-scale-in" 
        style={{ 
          color: 'var(--text-secondary)', 
          background: 'transparent', 
          minHeight: '75vh',
          padding: '40px' 
        }}
      >
        <div className="mb-4" style={{ fontSize: '72px', filter: 'drop-shadow(0 0 15px rgba(245, 158, 11, 0.35))' }}>
          <AlertTriangle className="text-warning" size={72} />
        </div>
        <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '24px', letterSpacing: '-0.5px', marginBottom: '8px' }}>
          Portal Deployment ID Missing
        </h2>
        <p className="text-secondary mb-4" style={{ maxWidth: '520px', fontSize: '14px', lineHeight: 1.6, margin: '0 auto 24px auto', fontWeight: 500 }}>
          The Google Apps Script Deployment ID is not configured in Server Administration. 
          Please configure the <strong>Google Sheets Apps Script Deployment ID</strong> in the server settings to access the admin portal.
        </p>
        <div 
          className="badge bg-warning bg-opacity-10 text-warning border border-warning px-4 py-2 rounded-pill" 
          style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}
        >
          STATUS: UNCONFIGURED
        </div>
      </div>
    );
  }

  return (
    <div className="h-100 w-100 d-flex flex-column animate-fade-in" style={{ height: 'calc(100vh - 120px)', minHeight: '80vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={22} className="text-primary" />
            Internship Admin Dashboard
          </h2>
          <span className="text-secondary" style={{ fontSize: '12px' }}>
            Review registrations, verify certificates, track student logs, and manage configuration
          </span>
        </div>
        <a 
          href={iframeUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
          style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600 }}
        >
          Open in New Tab <ExternalLink size={12} />
        </a>
      </div>

      <div 
        style={{ 
          flex: 1, 
          background: 'rgba(30, 41, 59, 0.4)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: '12px', 
          overflow: 'hidden', 
          position: 'relative' 
        }}
      >
        {loading && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading Portal...</span>
            </div>
          </div>
        )}
        <iframe
          src={iframeUrl}
          title="Internship Admin Portal"
          style={{ width: '100%', height: '100%', border: 'none' }}
          onLoad={() => setLoading(false)}
          allow="geolocation; microphone; camera; midi; encrypted-media;"
        />
      </div>
    </div>
  );
}
