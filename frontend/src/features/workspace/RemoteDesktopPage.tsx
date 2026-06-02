import { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Play, Square, Settings, Share2, 
  MousePointer2, Keyboard, ShieldAlert, Cpu, Network,
  Volume2, Sliders, RefreshCw, X, Radio, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function RemoteDesktopPage() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [targetId, setTargetId] = useState('');
  
  // Dynamic Peer ID
  const [myId] = useState(() => {
    const p1 = Math.floor(100 + Math.random() * 900);
    const p2 = Math.floor(100 + Math.random() * 900);
    const p3 = Math.floor(100 + Math.random() * 900);
    return `${p1}-${p2}-${p3}`;
  });

  // Settings Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState({
    resolution: '1080p',
    fps: '60',
    audio: true,
    stunServer: 'stun:stun.l.google.com:19302',
    bandwidthLimit: 'unlimited',
  });

  // Typing Simulator logs inside mock remote desktop
  const [logText, setLogText] = useState('');
  const logLines = [
    'Connecting securely to TrueNAS backend tunnel...',
    'Establishing DTLS-SRTP key exchange resonance...',
    'Cipher Suite: ECDHE-RSA-AES128-GCM-SHA256 initialized.',
    'Screen stream sync established at 60fps (1080p).',
    'TrueNAS dataset pool mounted locally: /mnt/tank/gsv-office',
    'GSV Remote Core connection: STABLE. Latency: 14ms.',
  ];

  useEffect(() => {
    if (isConnected) {
      setLogText('');
      let currentLine = 0;
      let currentChar = 0;
      
      const interval = setInterval(() => {
        if (currentLine < logLines.length) {
          const line = logLines[currentLine];
          if (currentChar < line.length) {
            setLogText(prev => prev + line[currentChar]);
            currentChar++;
          } else {
            setLogText(prev => prev + '\n');
            currentLine++;
            currentChar = 0;
          }
        } else {
          clearInterval(interval);
        }
      }, 40);

      return () => clearInterval(interval);
    }
  }, [isConnected]);

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
    setIsConnected(false);
    toast.success("Remote hosting session ended.");
  };

  const connectToRemote = () => {
    setIsConnecting(true);
    toast.loading("Establishing secure connection handshake...", { id: 'remote-conn' });
    
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      toast.success("Connected successfully to peer remote! ⚡", { id: 'remote-conn' });
    }, 2000);
  };

  const disconnectRemote = () => {
    setIsConnected(false);
    toast.success("Disconnected from remote peer.");
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', color: 'var(--text-primary)' }}>
      
      {/* Header controls */}
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
          <div className="card d-flex flex-row align-items-center gap-2 px-3 py-1" style={{ fontSize: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <Network size={14} style={{ color: 'var(--brand-success)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>My ID:</span>
            <span style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>{myId}</span>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowConfigModal(true)}>
            <Settings size={14} /> Configure
          </button>
        </div>
      </div>

      <div className="row flex-grow-1" style={{ minHeight: '480px' }}>
        
        {/* Remote Screen Viewport */}
        <div className="col-lg-9 mb-4 mb-lg-0">
          <div 
            className="card h-100 p-0 overflow-hidden bg-black position-relative d-flex align-items-center justify-content-center" 
            style={{ 
              minHeight: '380px', 
              border: '1px solid var(--border-color)',
              background: '#090d16',
              boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.6)'
            }}
          >
            {isStreaming ? (
              <video ref={videoRef} autoPlay playsInline className="w-100 h-100" style={{ objectFit: 'contain' }} />
            ) : isConnected ? (
              /* Simulated OS Desktop Interface */
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', padding: '20px' }}>
                
                {/* Visual Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa' }}>
                    <Eye size={16} />
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>Controlling peer: {targetId}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Active Tunnel</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Latency: 12ms</span>
                  </div>
                </div>

                {/* Animated Console Typing Output */}
                <div style={{ flex: 1, marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', flex: 1, fontFamily: 'Courier New, monospace', fontSize: '13px', color: '#38bdf8', overflowY: 'auto' }}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '10px', color: '#f59e0b', fontWeight: 700 }}>
                      ⚡ GSV SECURE TERMINAL T1 - TRUEHOST
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#34d399', lineHeight: 1.6 }}>
                      {logText}
                      <span className="blink-cursor" style={{ marginLeft: '2px', background: '#34d399', width: '6px', height: '14px', display: 'inline-block', verticalAlign: 'middle' }}></span>
                    </pre>
                  </div>
                </div>

                {/* Remote App Screen Window Mock */}
                <div style={{ position: 'absolute', bottom: '80px', right: '40px', width: '280px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px', color: '#f8fafc', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: '#a78bfa', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '8px' }}>
                    <Sliders size={14} /> Server Pool status (TrueNAS)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                    <div className="d-flex justify-content-between"><span>Pool Status:</span><span style={{ color: '#10b981' }}>ONLINE</span></div>
                    <div className="d-flex justify-content-between"><span>CPU Usage:</span><span>14%</span></div>
                    <div className="d-flex justify-content-between"><span>ZFS scrub:</span><span style={{ color: '#60a5fa' }}>Completed (0 errors)</span></div>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Monitor size={80} style={{ marginBottom: '16px', opacity: 0.2 }} />
                <h5 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>No Active Session</h5>
                <p style={{ fontSize: '13px' }}>Start hosting or enter a target ID to connect to a remote peer</p>
              </div>
            )}

            {/* Viewport Overlay Controls */}
            {(isStreaming || isConnected) && (
              <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 card p-2 d-flex flex-row gap-2 bg-dark bg-opacity-90" style={{ border: '1.5px solid var(--brand-primary)', borderRadius: '12px', zIndex: 10 }}>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#fff' }} title="Toggle Control Pointer"><MousePointer2 size={16} /></button>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#fff' }} title="Toggle Virtual Keyboard"><Keyboard size={16} /></button>
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)', margin: '0 8px' }}></div>
                <button className="btn btn-danger btn-sm" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={isStreaming ? stopStreaming : disconnectRemote}>
                  <Square size={12} fill="white" /> End Session
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Connection Control panels */}
        <div className="col-lg-3 d-flex flex-column gap-3">
          
          <div className="card p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h6 style={{ color: 'var(--brand-primary)', fontWeight: 700, margin: '0 0 16px 0', fontSize: '14px' }}>Connect to Peer</h6>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Enter Remote ID</div>
            <input 
              type="text" 
              className="form-control mb-3" 
              placeholder="000-000-000" 
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '1px' }}
            />
            <button 
              className="btn btn-primary w-100" 
              disabled={!targetId || isConnecting || isStreaming}
              onClick={isConnected ? disconnectRemote : connectToRemote}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : <><Play size={14} /> Connect</>}
            </button>
          </div>

          <div className="card p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h6 style={{ color: 'var(--brand-primary)', fontWeight: 700, margin: '0 0 8px 0', fontSize: '14px' }}>Host Screen</h6>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
              Allow other authorized identities to view or control your desktop securely.
            </p>
            <button 
              className={`btn w-100 ${isStreaming ? 'btn-danger' : 'btn-outline-primary'}`}
              onClick={isStreaming ? stopStreaming : startStreaming}
              disabled={isConnected || isConnecting}
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

      {/* STUN/TURN WebRTC Configuration Settings Modal */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="modal animate-scale-in" style={{ maxWidth: '460px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h4 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)' }}>
                <Settings size={18} /> WebRTC Remote Settings
              </h4>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowConfigModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Streaming Resolution</label>
                <select 
                  className="form-control" 
                  value={config.resolution} 
                  onChange={e => setConfig(prev => ({ ...prev, resolution: e.target.value }))}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="720p">720p HD (Low bandwidth)</option>
                  <option value="1080p">1080p FHD (High fidelity)</option>
                  <option value="4k">4K UHD (Requires local fiber)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Streaming Framerate</label>
                <select 
                  className="form-control" 
                  value={config.fps} 
                  onChange={e => setConfig(prev => ({ ...prev, fps: e.target.value }))}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="30">30 FPS (Standard)</option>
                  <option value="60">60 FPS (Ultra Smooth)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Audio Stream Loopback</label>
                <div className="d-flex align-items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={config.audio} 
                    onChange={e => setConfig(prev => ({ ...prev, audio: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Transmit computer audio during control session</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">STUN / TURN Server Pool</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={config.stunServer} 
                  onChange={e => setConfig(prev => ({ ...prev, stunServer: e.target.value }))}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Bandwidth Cap</label>
                <select 
                  className="form-control" 
                  value={config.bandwidthLimit} 
                  onChange={e => setConfig(prev => ({ ...prev, bandwidthLimit: e.target.value }))}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="1mbps">1 Mbps (Strict economy)</option>
                  <option value="5mbps">5 Mbps (Broadband)</option>
                  <option value="unlimited">Unlimited (Zero Compression)</option>
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowConfigModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => {
                  setShowConfigModal(false);
                  toast.success("WebRTC configuration updated successfully! 🛠️");
                }}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled CSS animation for terminal cursor */}
      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
        .blink-cursor {
          animation: blink 1s step-start infinite;
        }
      `}</style>

    </div>
  );
}
