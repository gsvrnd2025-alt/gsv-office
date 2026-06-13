import { Laptop, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function InternshipStudentPage() {
  const [loading, setLoading] = useState(true);
  const iframeUrl = '/internship/student.html';

  return (
    <div className="h-100 w-100 d-flex flex-column animate-fade-in" style={{ height: 'calc(100vh - 120px)', minHeight: '80vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Laptop size={22} className="text-primary" />
            Student Internship Portal
          </h2>
          <span className="text-secondary" style={{ fontSize: '12px' }}>
            Manage your daily tasks, diary entries, and internship details
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
          title="Student Internship Portal"
          style={{ width: '100%', height: '100%', border: 'none' }}
          onLoad={() => setLoading(false)}
          allow="geolocation; microphone; camera; midi; encrypted-media;"
        />
      </div>
    </div>
  );
}
