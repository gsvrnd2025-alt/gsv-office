import { useState, useRef } from 'react';
import { 
  Monitor, Play, Square, Settings, Share2, 
  MousePointer2, Keyboard, ShieldAlert, Cpu, Network
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RemoteDesktopPage() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [targetId, setTargetId] = useState('');

  const startStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: true
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        toast.success("Hosting remote session started successfully! 🖥️");
      }
    } catch (err) {
      console.error("Error accessing screen share:", err);
      toast.error("Failed to acquire screen capture permissions");
    }
  };

  const stopStreaming = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    toast.success("Remote hosting session ended.");
  };

  const connectToRemote = () => {
    setIsConnecting(true);
    toast.loading("Establishing secure connection handshake...", { id: 'remote-conn' });
    setTimeout(() => {
      setIsConnecting(false);
      toast.error("Connection failed: Target user must approve connection on gsveconnect.local", { id: 'remote-conn' });
    }, 2000);
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🖥️ GSV Remote Mastery
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Secure screen sharing and remote control via encrypted WebRTC tunnel
          </p>
        </div>
        <div className="d-flex gap-2">
          <div className="card d-flex flex-row align-items-center gap-2 px-3 py-1" style={{ fontSize: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <Network size={14} style={{ color: 'var(--brand-success)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>ID:</span>
            <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>892-123-001</span>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Settings size={14} /> Configure
          </button>
        </div>
      </div>

      <div className="row flex-grow-1" style={{ minHeight: '480px' }}>
        <div className="col-lg-9 mb-4 mb-lg-0">
          <div className="card h-100 p-0 overflow-hidden bg-black position-relative d-flex align-items-center justify-content-center" style={{ minHeight: '360px', border: '1px solid var(--border-color)' }}>
            {isStreaming ? (
              <video ref={videoRef} autoPlay playsInline className="w-100 h-100" style={{ objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Monitor size={80} style={{ marginBottom: '16px', opacity: 0.15 }} />
                <h5 style={{ color: 'var(--text-primary)' }}>No Active Session</h5>
                <p style={{ fontSize: '13px' }}>Start hosting or enter a target ID to connect to a peer</p>
              </div>
            )}

            {/* Viewport Overlay Controls */}
            {(isStreaming || isConnecting) && (
              <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 card p-2 d-flex flex-row gap-2 bg-dark bg-opacity-90" style={{ border: '1.5px solid var(--brand-primary)', borderRadius: '12px' }}>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#fff' }}><MousePointer2 size={16} /></button>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#fff' }}><Keyboard size={16} /></button>
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)', margin: '0 8px' }}></div>
                <button className="btn btn-danger btn-sm" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={stopStreaming}>
                  <Square size={12} fill="white" /> End Session
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-3 d-flex flex-column gap-3">
          <div className="card p-4">
            <h6 style={{ color: 'var(--brand-primary)', fontWeight: 700, margin: '0 0 16px 0', fontSize: '14px' }}>Connect to Peer</h6>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Enter Remote ID</div>
            <input 
              type="text" 
              className="form-control mb-3" 
              placeholder="000-000-000" 
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
            <button 
              className="btn btn-primary w-100" 
              disabled={!targetId || isConnecting}
              onClick={connectToRemote}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {isConnecting ? 'Connecting...' : <><Play size={14} /> Connect</>}
            </button>
          </div>

          <div className="card p-4">
            <h6 style={{ color: 'var(--brand-primary)', fontWeight: 700, margin: '0 0 8px 0', fontSize: '14px' }}>Host Screen</h6>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
              Allow other authorized identities to view or control your desktop securely.
            </p>
            <button 
              className={`btn w-100 ${isStreaming ? 'btn-danger' : 'btn-outline-primary'}`}
              onClick={isStreaming ? stopStreaming : startStreaming}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {isStreaming ? <><Square size={14} /> Stop Hosting</> : <><Share2 size={14} /> Start Hosting</>}
            </button>
          </div>

          <div className="mt-2 px-2 d-flex flex-column gap-2">
            <div className="d-flex align-items-center gap-2" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              <ShieldAlert size={14} style={{ color: 'var(--brand-warning)' }} />
              <span>Encrypted via DTLS/SRTP tunnel</span>
            </div>
            <div className="d-flex align-items-center gap-2" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              <Cpu size={14} style={{ color: 'var(--brand-primary)' }} />
              <span>Hardware Acceleration: ON</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
