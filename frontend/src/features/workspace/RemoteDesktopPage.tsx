import { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Play, Square, Settings, Share2, 
  MousePointer2, Keyboard, ShieldAlert, Cpu, Network,
  Volume2, Sliders, RefreshCw, X, Radio, Eye, FileCode2,
  Download, Copy, ClipboardCopy, ShieldCheck, AlertCircle, 
  AlertTriangle, Folder, HardDrive, Terminal
} from 'lucide-react';
import toast from 'react-hot-toast';

// Mock files available on the simulated remote desktop
interface MockFile {
  name: string;
  type: string;
  size: string;
  content: string;
}

const REMOTE_FILES: MockFile[] = [
  { 
    name: 'audit_logs.xlsx', 
    type: 'excel', 
    size: '1.2 MB', 
    content: 'GSV Office Audit Log Export\nDate Range: 2026-05-01 to 2026-06-03\nEvents Logged: 1,429\nSystem Health Index: 98.4%\nData sync: COMPLETE' 
  },
  { 
    name: 'truenas_dataset_config.json', 
    type: 'json', 
    size: '4.8 KB', 
    content: JSON.stringify({
      pool: 'tank',
      dataset: 'gsv-office-storage',
      compression: 'lz4',
      deduplication: 'off',
      encryption: 'aes-256-gcm',
      mountpoint: '/mnt/tank/gsv-office',
      owner: 'gsv-admin'
    }, null, 2)
  },
  { 
    name: 'api_credentials.env', 
    type: 'env', 
    size: '1.1 KB', 
    content: '# GSV Office Security Context\nPORT=8080\nJWT_SECRET=gsv_jwt_enc_key_3882910\nDB_PASS=truenas_postgres_secure_2026\nSTUN_SERVER=stun:stun.l.google.com:19302\nSHEETS_DEPLOYMENT_ID=AKfycbz_9281a_gsv_sheets_deployment' 
  },
  { 
    name: 'readme_deployment.txt', 
    type: 'text', 
    size: '15 KB', 
    content: '=== GSV OFFICE ENTERPRISE DEPLOYMENT ===\n1. Run deploy-all.js to push configurations to TrueNAS\n2. Verify the SMB share is isolated per user\n3. Sync sheets with deployment ID on Admin page\n4. For support, contact super_admin@gsv.rnd' 
  }
];

export default function RemoteDesktopPage() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Connected as CLIENT (controlling peer)
  const [isHostControlled, setIsHostControlled] = useState(false); // Hosting and CLIENT has taken control
  const [targetId, setTargetId] = useState('');
  
  // Handshake Dialog states
  const [showHandshake, setShowHandshake] = useState(false);
  const [handshakeType, setHandshakeType] = useState<'incoming' | 'outgoing' | null>(null);
  const [handshakePartnerId, setHandshakePartnerId] = useState('');

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

  // Remote desktop simulation interactive state
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [remoteClipboard, setRemoteClipboard] = useState<MockFile | null>(null);
  
  // Coordinates overlay & cursor simulation
  const [clientPointer, setClientPointer] = useState({ x: 250, y: 180 });
  const [localPointerCoords, setLocalPointerCoords] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Guard timeline / console logs
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  // Connection timer references
  const incomingRequestTimer = useRef<NodeJS.Timeout | null>(null);
  const hostPointerTimer = useRef<NodeJS.Timeout | null>(null);
  const lockEnableTime = useRef<number>(0);

  // Setup logging in simulated console
  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Host mouse move detection during active remote control
  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (isHostControlled) {
        // Enforce a small delay after control starts to prevent accidental triggers from click
        if (Date.now() - lockEnableTime.current < 800) return;
        
        // Detect movement change
        const mvX = Math.abs(e.movementX);
        const mvY = Math.abs(e.movementY);
        if (mvX > 6 || mvY > 6) {
          triggerEmergencyStop("Host physical mouse movement detected");
        }
      }
    };

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === viewportRef.current;
      setIsPointerLocked(locked);
      if (!locked && isHostControlled) {
        // Host exited pointer lock manually (e.g. Esc key)
        triggerEmergencyStop("Host pointer lock released");
      }
    };

    if (isHostControlled) {
      document.addEventListener('mousemove', handleMouseMoveGlobal);
      document.addEventListener('pointerlockchange', handlePointerLockChange);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveGlobal);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, [isHostControlled]);

  // Escape key emergency listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isHostControlled || isConnected) {
          triggerEmergencyStop("Escape key override triggered");
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHostControlled, isConnected]);

  // Simulate client pointer moving around on the HOST screen when Host is controlled
  useEffect(() => {
    if (isHostControlled) {
      hostPointerTimer.current = setInterval(() => {
        setClientPointer(prev => {
          const deltaX = Math.floor(Math.random() * 40) - 20;
          const deltaY = Math.floor(Math.random() * 30) - 15;
          const nextX = Math.max(20, Math.min(prev.x + deltaX, 780));
          const nextY = Math.max(20, Math.min(prev.y + deltaY, 440));
          return { x: nextX, y: nextY };
        });
        
        if (Math.random() > 0.7) {
          const mockActions = [
            "Syncing directories...",
            "Checking local TrueNAS dataset mounts",
            "Reading system_report.log",
            "Simulating cursor drag action",
            "WebRTC channels active: DTLS-SRTP key sync"
          ];
          addLog(mockActions[Math.floor(Math.random() * mockActions.length)]);
        }
      }, 800);
    } else {
      if (hostPointerTimer.current) {
        clearInterval(hostPointerTimer.current);
      }
    }
    return () => {
      if (hostPointerTimer.current) clearInterval(hostPointerTimer.current);
    };
  }, [isHostControlled]);

  // Simulate incoming connection request when hosting
  useEffect(() => {
    if (isStreaming && !isHostControlled && !showHandshake) {
      // Simulate client attempting to connect after 4 seconds
      incomingRequestTimer.current = setTimeout(() => {
        setHandshakeType('incoming');
        const randomClients = ['482-192-302', '551-923-884', '201-382-774'];
        const randomId = randomClients[Math.floor(Math.random() * randomClients.length)];
        setHandshakePartnerId(randomId);
        setShowHandshake(true);
        addLog(`Inbound WebRTC connection initiated from client ID: ${randomId}`);
      }, 4000);
    } else {
      if (incomingRequestTimer.current) {
        clearTimeout(incomingRequestTimer.current);
      }
    }

    return () => {
      if (incomingRequestTimer.current) clearTimeout(incomingRequestTimer.current);
    };
  }, [isStreaming, isHostControlled, showHandshake]);

  const startStreaming = async () => {
    try {
      addLog("Initializing media sharing capture...");
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: true
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        addLog("Screen sharing pipeline established. Ready for remote clients.");
        toast.success("Hosting remote session started successfully! 🖥️");
      }
    } catch (err) {
      console.error("Error accessing screen share:", err);
      addLog("Failed to start screen capture: Permission Denied");
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
    setIsHostControlled(false);
    setShowHandshake(false);
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    addLog("Screen hosting terminated.");
    toast.success("Remote hosting session ended.");
  };

  // Client Initiating Connection
  const connectToRemote = () => {
    setIsConnecting(true);
    addLog(`Sending negotiation offer to Peer ID: ${targetId}`);
    toast.loading("Establishing secure WebRTC tunnel connection...", { id: 'remote-conn' });
    
    setTimeout(() => {
      setIsConnecting(false);
      setHandshakeType('outgoing');
      setHandshakePartnerId(targetId);
      setShowHandshake(true);
      toast.dismiss('remote-conn');
      addLog(`Handshake request acknowledged by remote peer ${targetId}. Awaiting remote security validation.`);
    }, 1500);
  };

  const approveHandshake = () => {
    setShowHandshake(false);
    if (handshakeType === 'incoming') {
      // We are host, allowing client to take control
      setIsHostControlled(true);
      lockEnableTime.current = Date.now();
      addLog(`Handshake approved. Client ${handshakePartnerId} granted pointer control.`);
      toast.success(`Connection established! Client ${handshakePartnerId} is now controlling your screen.`);
      
      // Request pointer lock to lock local mouse in center
      setTimeout(() => {
        if (viewportRef.current) {
          viewportRef.current.requestPointerLock();
        }
      }, 500);
    } else {
      // We are client, host approved connection, we now control remote
      setIsConnected(true);
      addLog(`Tunnel sync established with host ${handshakePartnerId}. Render remote viewport initialized.`);
      toast.success(`Successfully connected to remote peer ${handshakePartnerId}! ⚡`);
    }
  };

  const rejectHandshake = () => {
    setShowHandshake(false);
    const partner = handshakePartnerId;
    setHandshakeType(null);
    setHandshakePartnerId('');
    if (handshakeType === 'incoming') {
      addLog(`Rejected connection handshake request from ${partner}`);
      toast.error("Incoming remote control request rejected.");
    } else {
      setIsConnected(false);
      addLog(`Host ${partner} rejected connection negotiation.`);
      toast.error("Remote host rejected connection handshake request.");
    }
  };

  const triggerEmergencyStop = (reason: string) => {
    setIsConnected(false);
    setIsHostControlled(false);
    setShowHandshake(false);
    setIsConnecting(false);
    
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // Stop local sharing if we were hosting
    if (isStreaming) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setIsStreaming(false);
    }

    addLog(`🚨 EMERGENCY STOP: ${reason}. Session revoked.`);
    toast.error(`Emergency Stop Triggered! ${reason}. Remote control revoked.`, {
      duration: 5000,
      icon: '🚨'
    });
  };

  const disconnectRemote = () => {
    setIsConnected(false);
    addLog(`Disconnected cleanly from remote host.`);
    toast.success("Disconnected from remote peer.");
  };

  // Tracking mouse movement coordinates in CLIENT view
  const handleClientMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    
    // Scale client pointer coordinates to nominal resolution (1920x1080) for simulation display
    const scaleX = Math.round((x / rect.width) * 1920);
    const scaleY = Math.round((y / rect.height) * 1080);
    
    setLocalPointerCoords({ x: scaleX, y: scaleY });
  };

  // Remote Explorer file selection and copying
  const selectFile = (index: number) => {
    setSelectedFileIndex(index);
    addLog(`Selected remote file: ${REMOTE_FILES[index].name}`);
  };

  const copyRemoteFileToClipboard = (file: MockFile) => {
    setRemoteClipboard(file);
    addLog(`Copied file data metadata for "${file.name}" to clipboard channel.`);
    toast.success(`Remote file "${file.name}" copied to clipboard! Click 'Paste to Local' in panel.`);
  };

  const pasteFileToLocal = () => {
    if (!remoteClipboard) {
      toast.error("No file found in the remote clipboard!");
      return;
    }
    
    // Trigger browser file download
    try {
      const blob = new Blob([remoteClipboard.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `local_copy_${remoteClipboard.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      addLog(`Downloaded "${remoteClipboard.name}" from remote clipboard onto local storage.`);
      toast.success(`Successfully downloaded copy of "${remoteClipboard.name}"! 📥`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy file to local disk.");
    }
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', color: 'var(--text-primary)' }}>
      
      {/* Header controls */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🖥️ GSV UltraViewer Remote Sync
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Secure remote console and pointer coordination system via peer-to-peer WebRTC connection
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
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

      <div className="row flex-grow-1" style={{ minHeight: '520px' }}>
        
        {/* Remote Screen Viewport */}
        <div className="col-lg-9 mb-4 mb-lg-0 d-flex flex-column">
          <div 
            ref={viewportRef}
            onMouseMove={isConnected ? handleClientMouseMove : undefined}
            className="card p-0 overflow-hidden bg-black position-relative d-flex align-items-center justify-content-center flex-grow-1" 
            style={{ 
              minHeight: '440px', 
              border: '1.5px solid ' + (isHostControlled ? '#ef4444' : isConnected ? 'var(--brand-primary)' : 'var(--border-color)'),
              background: '#090d16',
              boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.6)',
              cursor: isConnected ? 'crosshair' : 'default'
            }}
          >
            {/* 1. Hosting State - showing video share */}
            {isStreaming && (
              <div className="w-100 h-100 position-relative">
                <video ref={videoRef} autoPlay playsInline className="w-100 h-100" style={{ objectFit: 'contain' }} />
                
                {/* Controlled warning overlay */}
                {isHostControlled ? (
                  <div className="position-absolute inset-0 d-flex flex-column align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 5, padding: '20px' }}>
                    <div className="card p-4 text-center animate-scale-in" style={{ maxWidth: '480px', border: '2px solid #ef4444', background: '#111827', color: '#f9fafb' }}>
                      <AlertCircle size={48} className="text-danger mx-auto mb-3 animate-pulse" />
                      <h4 style={{ fontWeight: 700, color: '#ef4444' }}>Remote User is Controlling Your Screen</h4>
                      <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.5 }}>
                        Client <span className="badge bg-danger">{handshakePartnerId}</span> has taken mouse control.
                      </p>
                      
                      {/* Host Cursor Locked info */}
                      <div className="alert alert-warning py-2 px-3 text-start mb-4" style={{ fontSize: '12px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                        <AlertTriangle size={14} className="me-2 d-inline-block" style={{ verticalAlign: 'middle' }} />
                        <strong>Host Cursor Locked:</strong> Your physical mouse pointer is pinned. Move your mouse or hit <strong>ESC</strong> to disconnect instantly.
                      </div>

                      <div className="d-flex justify-content-center gap-2">
                        <button className="btn btn-danger w-100" onClick={() => triggerEmergencyStop("Host manually terminated session")} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <X size={16} /> EMERGENCY STOP
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="position-absolute top-3 start-3 card py-1 px-3 d-flex flex-row align-items-center gap-2" style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid var(--border-color)', color: '#38bdf8', fontSize: '12px' }}>
                    <span className="pulse-dot bg-success" style={{ width: '8px', height: '8px', borderRadius: '50%' }}></span>
                    <span>Hosting Live Stream... Awaiting Peer connections</span>
                  </div>
                )}

                {/* Simulated client cursor overlay during Host Controlled mode */}
                {isHostControlled && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      left: `${clientPointer.x}px`, 
                      top: `${clientPointer.y}px`, 
                      transition: 'left 0.2s ease-out, top 0.2s ease-out',
                      zIndex: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      pointerEvents: 'none'
                    }}
                  >
                    <MousePointer2 size={18} fill="#ef4444" color="#fff" />
                    <span style={{ fontSize: '10px', background: '#ef4444', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                      Client ({clientPointer.x}, {clientPointer.y})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 2. Connected Client Mode - Simulated OS desktop view */}
            {!isStreaming && isConnected && (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', padding: '20px', userSelect: 'none' }}>
                
                {/* Remote Connection Header bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa' }}>
                    <Eye size={16} />
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>Controlling peer: {handshakePartnerId}</span>
                  </div>
                  
                  {/* Local Simulated pointer tracking indicators */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px', color: '#94a3b8' }}>
                    <span className="badge bg-success bg-opacity-20 text-success border border-success border-opacity-30">Encrypted</span>
                    <span style={{ fontFamily: 'monospace' }}>Host Pointer: {localPointerCoords.x}, {localPointerCoords.y} px</span>
                    <span>Latency: 14ms</span>
                    <span>FPS: {config.fps} ({config.resolution})</span>
                  </div>
                </div>

                {/* Simulated Desktop Items Grid */}
                <div style={{ flex: 1, marginTop: '20px', position: 'relative', display: 'flex', gap: '20px', alignContent: 'flex-start', flexWrap: 'wrap' }}>
                  <div 
                    onClick={() => setExplorerOpen(true)}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      width: '80px', 
                      cursor: 'pointer',
                      padding: '8px', 
                      borderRadius: '8px', 
                      background: explorerOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    <HardDrive size={36} color="#60a5fa" style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))' }} />
                    <span style={{ fontSize: '11px', color: '#fff', marginTop: '6px', textAlign: 'center', fontWeight: 600 }}>GSV dataset</span>
                  </div>

                  <div 
                    onClick={() => toast.success("TrueNAS system control initialized")}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px', cursor: 'pointer', padding: '8px' }}
                  >
                    <Terminal size={36} color="#34d399" />
                    <span style={{ fontSize: '11px', color: '#fff', marginTop: '6px', textAlign: 'center' }}>SSH Terminal</span>
                  </div>

                  {/* Simulated File Explorer Window */}
                  {explorerOpen && (
                    <div 
                      className="animate-scale-in"
                      style={{ 
                        position: 'absolute', 
                        top: '10px', 
                        left: '100px', 
                        width: '560px', 
                        height: '320px', 
                        background: 'rgba(15, 23, 42, 0.9)', 
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                        zIndex: 10
                      }}
                    >
                      {/* Window titlebar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#f8fafc', fontWeight: 700 }}>
                          <Folder size={14} className="text-warning" />
                          <span>GSV Datasets mount — TrueNAS SMB shares</span>
                        </div>
                        <button 
                          className="btn btn-ghost btn-icon btn-sm p-0 m-0" 
                          onClick={() => setExplorerOpen(false)}
                          style={{ color: '#94a3b8', width: '20px', height: '20px' }}
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Explorer Workspace */}
                      <div className="d-flex flex-grow-1" style={{ overflow: 'hidden' }}>
                        
                        {/* Sidebar */}
                        <div style={{ width: '150px', background: 'rgba(0,0,0,0.2)', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ color: '#94a3b8', fontWeight: 700, fontSize: '10px' }}>MOUNT PATHS</div>
                          <div style={{ color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(96,165,250,0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                            <HardDrive size={12} /> tank/gsv-office
                          </div>
                          <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}>
                            <Folder size={12} /> uploads/users
                          </div>
                        </div>

                        {/* Files grid view */}
                        <div className="p-3 flex-grow-1 d-flex flex-column gap-2" style={{ overflowY: 'auto' }}>
                          <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>FILES</div>
                          
                          {REMOTE_FILES.map((file, index) => (
                            <div 
                              key={file.name}
                              onClick={() => selectFile(index)}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                background: selectedFileIndex === index ? 'rgba(59,130,246,0.2)' : 'transparent',
                                border: selectedFileIndex === index ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <FileCode2 size={16} style={{ color: selectedFileIndex === index ? '#60a5fa' : '#94a3b8' }} />
                                <span style={{ fontSize: '12px', color: selectedFileIndex === index ? '#ffffff' : '#cbd5e1' }}>{file.name}</span>
                              </div>
                              <span style={{ fontSize: '10px', color: '#64748b' }}>{file.size}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Explorer Footer Action bar */}
                      <div style={{ background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '8px 12px', display: 'flex', justifySelf: 'flex-end', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Selected: <strong style={{ color: '#fff' }}>{REMOTE_FILES[selectedFileIndex]?.name}</strong>
                        </div>
                        
                        <button 
                          className="btn btn-primary btn-sm px-3" 
                          onClick={() => copyRemoteFileToClipboard(REMOTE_FILES[selectedFileIndex])}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '4px 10px' }}
                        >
                          <Copy size={12} /> Copy File content
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Console Log Panel inside simulated Desktop */}
                <div style={{ height: '110px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 14px', fontFamily: 'Courier New, monospace', fontSize: '11px', color: '#10b981', overflowY: 'auto' }}>
                  <div style={{ color: '#fbbf24', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px', marginBottom: '6px' }}>
                    💻 CONNECTED LOGS (Peer Tunnel Console)
                  </div>
                  {terminalLogs.length === 0 ? (
                    <div>Waiting for terminal synchronization metrics...</div>
                  ) : (
                    terminalLogs.map((lg, i) => <div key={i}>{lg}</div>)
                  )}
                </div>

              </div>
            )}

            {/* 3. Disconnected Idle View */}
            {!isStreaming && !isConnected && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Monitor size={80} style={{ marginBottom: '16px', opacity: 0.2 }} />
                <h5 style={{ color: 'var(--text-primary)', fontWeight: 700 }}>No Active Session</h5>
                <p style={{ fontSize: '13px' }}>Start hosting or enter a target ID to connect to a remote peer</p>
                <div style={{ fontSize: '11px', marginTop: '12px', color: 'var(--text-muted)' }}>
                  Secure connection via WebRTC STUN relay configuration.
                </div>
              </div>
            )}

            {/* Handshake Permission Dialog Modal */}
            {showHandshake && (
              <div className="position-absolute inset-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.75)', zIndex: 100, padding: '20px' }}>
                <div className="card p-4 animate-scale-in" style={{ maxWidth: '420px', background: '#1e293b', border: '1.5px solid var(--brand-primary)', color: '#f8fafc', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
                  
                  {handshakeType === 'incoming' ? (
                    <>
                      <div className="d-flex align-items-center gap-2 mb-3 text-warning">
                        <ShieldAlert size={28} />
                        <h5 className="m-0" style={{ fontWeight: 700, color: '#fbbf24' }}>Remote Handshake Request</h5>
                      </div>
                      <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
                        Client ID <strong style={{ color: '#60a5fa' }}>{handshakePartnerId}</strong> is requesting remote pointer control authorization to connect to your desktop.
                      </p>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', fontSize: '11px', color: '#94a3b8', marginBottom: '20px' }}>
                        🛡️ This allows the remote user to sync keyboard and mouse coordinates directly. You can hit Escape to revoke control anytime.
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-primary w-100" onClick={approveHandshake} style={{ fontWeight: 600 }}>
                          Accept Control
                        </button>
                        <button className="btn btn-outline-light w-100" onClick={rejectHandshake}>
                          Reject Request
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="d-flex align-items-center gap-2 mb-3 text-primary">
                        <ShieldCheck size={28} style={{ color: 'var(--brand-primary)' }} />
                        <h5 className="m-0" style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>Accept Outgoing Connection?</h5>
                      </div>
                      <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
                        Confirm you wish to finalize connection handshake and assume screen control parameters of Remote Host <strong style={{ color: '#60a5fa' }}>{handshakePartnerId}</strong>.
                      </p>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', fontSize: '11px', color: '#94a3b8', marginBottom: '20px' }}>
                        📡 Tunnel coordinates sync ready. Establish connection pipeline?
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-primary w-100" onClick={approveHandshake}>
                          Establish Connection
                        </button>
                        <button className="btn btn-outline-light w-100" onClick={rejectHandshake}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Viewport Floating Action Bar */}
            {(isStreaming || isConnected) && (
              <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 card p-2 d-flex flex-row gap-2 bg-dark bg-opacity-90 align-items-center" style={{ border: '1.5px solid var(--brand-primary)', borderRadius: '12px', zIndex: 8 }}>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#fff' }} title="Toggle Control Pointer"><MousePointer2 size={16} /></button>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#fff' }} title="Toggle Virtual Keyboard"><Keyboard size={16} /></button>
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)', height: '20px', margin: '0 8px' }}></div>
                
                {/* Emergency Stop pulsing red button */}
                <button 
                  className="btn btn-danger btn-sm px-3 py-1 btn-emergency animate-pulse" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ef4444', border: 'none', fontWeight: 700 }}
                  onClick={() => triggerEmergencyStop("Emergency stop manual activation")}
                >
                  <X size={14} fill="white" /> Emergency Stop (ESC)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Connection Control panels */}
        <div className="col-lg-3 d-flex flex-column gap-3">
          
          {/* Peer connection Widget */}
          <div className="card p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h6 style={{ color: 'var(--brand-primary)', fontWeight: 700, margin: '0 0 16px 0', fontSize: '14px' }}>Connect to Peer</h6>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Enter Remote ID</div>
            <input 
              type="text" 
              className="form-control mb-3" 
              placeholder="000-000-000" 
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              disabled={isConnecting || isConnected || isStreaming}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '1px' }}
            />
            
            {isConnected ? (
              <button 
                className="btn btn-outline-danger w-100" 
                onClick={disconnectRemote}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Square size={14} /> Disconnect
              </button>
            ) : (
              <button 
                className="btn btn-primary w-100" 
                disabled={!targetId || isConnecting || isStreaming}
                onClick={connectToRemote}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isConnecting ? 'Connecting...' : <><Play size={14} /> Connect</>}
              </button>
            )}
          </div>

          {/* Hosting Widget */}
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

          {/* Remote Clipboard widget */}
          <div className="card p-4 d-flex flex-column gap-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <h6 style={{ color: 'var(--brand-primary)', fontWeight: 700, margin: '0 0 8px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClipboardCopy size={16} /> Remote Clipboard
            </h6>
            
            {remoteClipboard ? (
              <div className="animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', fontSize: '12px' }}>
                  <div style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{remoteClipboard.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>Size: {remoteClipboard.size}</div>
                </div>

                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-primary btn-sm w-100" 
                    onClick={pasteFileToLocal}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                  >
                    <Download size={14} /> Paste to Local
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => { setRemoteClipboard(null); addLog("Clipboard buffer cleared."); }}
                    style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '14px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', marginTop: '6px' }}>
                Clipboard is empty. Connect to remote peer and copy a file to sync.
              </div>
            )}
          </div>

          <div className="mt-1 px-2 d-flex flex-column gap-2">
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

      {/* Styled CSS animation for components */}
      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
        .blink-cursor {
          animation: blink 1s step-start infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.03); }
        }
        .btn-emergency {
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
        }
        .btn-emergency:hover {
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.7);
        }
        .pulse-dot {
          animation: blink 1.2s step-start infinite;
        }
      `}</style>

    </div>
  );
}

