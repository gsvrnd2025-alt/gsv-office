import { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Play, Square, Settings, Share2, 
  MousePointer2, Keyboard, ShieldAlert, Cpu, Network,
  Volume2, Sliders, RefreshCw, X, Radio, Eye, FileCode2,
  Download, Copy, ClipboardCopy, ShieldCheck, AlertCircle, 
  AlertTriangle, Folder, HardDrive, Terminal, Users, Phone,
  Mic, MicOff, Shield, CheckSquare, Clock, ChevronDown, ChevronUp, Link
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { usersApi } from '../../api';
import { useThemeStore } from '../../store/theme.store';
import { io, Socket } from 'socket.io-client';

function createMockStream(): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  
  let animationFrameId: number;
  const draw = () => {
    if (!ctx) return;
    // Gradient dark background
    const grad = ctx.createRadialGradient(640, 360, 50, 640, 360, 600);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);
    
    // Draw grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1280; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 720);
      ctx.stroke();
    }
    for (let y = 0; y < 720; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1280, y);
      ctx.stroke();
    }
    
    // Draw folder icons
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(60, 60, 70, 50);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('GSV Share', 65, 130);
    
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(170, 60, 70, 50);
    ctx.fillStyle = '#fff';
    ctx.fillText('Database', 178, 130);

    // Draw active desktop info card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(340, 180, 600, 360);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(340, 180, 600, 360);
    
    // Title
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 22px Courier New, monospace';
    ctx.fillText('🖥️ GSV ULTRAVIEWER REMOTE DESKTOP', 380, 230);
    
    // Connection info
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px sans-serif';
    ctx.fillText('Status: Connected & Streaming (Simulated)', 380, 280);
    ctx.fillText(`Mode: WebRTC P2P Data Tunnel`, 380, 310);
    ctx.fillText(`Resolution: 1280x720 @ 30fps`, 380, 340);
    ctx.fillText(`Secure Connection: DTLS / SRTP Active`, 380, 370);
    
    // Clock
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px Courier New, monospace';
    ctx.fillText(`System Time: ${new Date().toLocaleTimeString()}`, 380, 420);
    
    // Animated connection dots
    const dots = '.'.repeat(Math.floor((Date.now() / 500) % 4));
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText(`Streaming screen feed${dots}`, 380, 470);
    
    animationFrameId = requestAnimationFrame(draw);
  };
  
  draw();
  
  const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : (canvas as any).mozCaptureStream(30);
  
  // Attach canvas cleanup to stream track stop
  const originalGetTracks = stream.getTracks;
  stream.getTracks = function() {
    const tracks = originalGetTracks.call(stream);
    tracks.forEach((t: any) => {
      const originalStop = t.stop;
      t.stop = function() {
        originalStop.call(t);
        cancelAnimationFrame(animationFrameId);
      };
    });
    return tracks;
  };
  
  return stream;
}

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
    name: 'readme_deployment.txt', 
    type: 'text', 
    size: '15 KB', 
    content: '=== GSV OFFICE ENTERPRISE DEPLOYMENT ===\n1. Run deploy-all.js to push configurations to TrueNAS\n2. Verify the SMB share is isolated per user\n3. Sync sheets with deployment ID on Admin page\n4. For support, contact super_admin@gsv.rnd' 
  }
];

export default function RemoteDesktopPage() {
  const { user, accessToken } = useAuthStore();
  const { theme } = useThemeStore();
  const [socket, setSocket] = useState<Socket | null>(null);

  // User directory states
  const [teammates, setTeammates] = useState<any[]>([]);
  
  // Connection states
  const [targetPhone, setTargetPhone] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [dialingStatus, setDialingStatus] = useState<'idle' | 'calling' | 'accepted' | 'rejected' | 'timeout'>('idle');
  const [isConnected, setIsConnected] = useState(false); // Connected as CLIENT (controlling remote)
  const [isHosting, setIsHosting] = useState(false); // Currently streaming local screen
  const [isHostControlled, setIsHostControlled] = useState(false); // Host is currently controlled by remote client
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [activePartnerName, setActivePartnerName] = useState<string>('');

  // Voice Chat
  const [isVoiceChatEnabled, setIsVoiceChatEnabled] = useState(false);
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);

  // Layout View constraints
  const [videoFit, setVideoFit] = useState<'contain' | 'cover' | 'fill'>('contain');

  // Settings
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState({
    resolution: '1080p',
    fps: '60',
    audio: true,
    stunServer: 'stun:stun.l.google.com:19302',
    bandwidthLimit: 'unlimited',
  });

  // Interlock Method state
  const [isControlLocked, setIsControlLocked] = useState(false);

  // Permissions settings modal
  const [showIncomingRequest, setShowIncomingRequest] = useState(false);
  const [incomingRequestData, setIncomingRequestData] = useState<any | null>(null);
  const [grantedPermissions, setGrantedPermissions] = useState({
    fullControl: true,
    keyboard: true,
    mouse: true,
    fileTransfer: true,
  });
  const [sessionDuration, setSessionDuration] = useState('1h');

  // Viewport / WebRTC simulation objects
  const [clientPointer, setClientPointer] = useState({ x: 250, y: 180 });
  const [localPointerCoords, setLocalPointerCoords] = useState({ x: 0, y: 0 });
  
  const viewportRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const dialingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [remoteClipboard, setRemoteClipboard] = useState<MockFile | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Double escape tracker
  const lastEscPressTime = useRef<number>(0);

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Socket Connection setup
  useEffect(() => {
    if (!accessToken) return;
    
    // Connect to /webrtc namespace
    const s = io('/webrtc', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      addLog('Secure signaling socket tunnel online.');
    });

    s.on('remote:request', (data: any) => {
      addLog(`Incoming remote connection request from ${data.callerName} (${data.callerPhone})`);
      setIncomingRequestData(data);
      setShowIncomingRequest(true);
    });

    s.on('remote:response', async (data: any) => {
      if (dialingTimeoutRef.current) clearTimeout(dialingTimeoutRef.current);
      if (data.status === 'rejected') {
        setIsConnecting(false);
        setDialingStatus('rejected');
        toast.error('Remote access request was rejected by host.');
        addLog(`Host rejected remote access request.`);
      } else {
        setDialingStatus('accepted');
        addLog('Host accepted request. Setting up WebRTC session...');
        // Establish WebRTC connection
        setActivePartnerId(data.hostId);
        setupWebRTC(false, data.hostId);
      }
    });

    s.on('remote:signal', async (data: any) => {
      if (!peerConnectionRef.current) return;
      try {
        const signal = data.signal;
        if (signal.type === 'offer') {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          s.emit('remote:signal', { targetUserId: data.fromId, signal: answer });
        } else if (signal.type === 'answer') {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
        }
      } catch (e) {
        console.error('Signal error', e);
      }
    });

    s.on('remote:ice-candidate', async (data: any) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Error adding ICE candidate', e);
      }
    });

    s.on('remote:control-lock', (data: any) => {
      setIsControlLocked(data.isLocked);
      if (data.isLocked) {
        toast.error('Control Lock: Host is typing or moving mouse. Inputs paused.', { id: 'lock-alert' });
        addLog('Control Lock: Remote host physical input active.');
      } else {
        toast.success('Control released. Inputs enabled.', { id: 'lock-alert' });
        addLog('Control released: Host yielded controls.');
      }
    });

    s.on('remote:terminate', () => {
      terminateSession(true);
    });

    setSocket(s);

    return () => {
      s.disconnect();
      if (dialingTimeoutRef.current) clearTimeout(dialingTimeoutRef.current);
    };
  }, [accessToken]);

  // Fetch users for directories (online/offline)
  const fetchTeammates = async () => {
    try {
      const res = await usersApi.getAll();
      const list = res.data?.data || res.data || [];
      // Filter out self
      const cleanList = list.filter((u: any) => u.id !== user?.id);
      setTeammates(cleanList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTeammates();
    const interval = setInterval(fetchTeammates, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Emergency double Escape press listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscPressTime.current < 500) {
          addLog('🚨 Emergency escape keys detected.');
          terminateSession(false);
          toast.error('Emergency Exit: Remote connection killed instantly.', { icon: '🚨' });
        }
        lastEscPressTime.current = now;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnected, isHosting]);

  // Host local input tracking for Interlock mechanism
  useEffect(() => {
    const handleLocalInput = () => {
      if (isHosting && isHostControlled && socket && activePartnerId && !isControlLocked) {
        // Host physically moved mouse or typed: lock control
        socket.emit('remote:control-lock', { targetUserId: activePartnerId, isLocked: true });
        setIsControlLocked(true);
      }
    };

    if (isHosting && isHostControlled) {
      window.addEventListener('mousemove', handleLocalInput);
      window.addEventListener('keydown', handleLocalInput);
    }

    return () => {
      window.removeEventListener('mousemove', handleLocalInput);
      window.removeEventListener('keydown', handleLocalInput);
    };
  }, [isHosting, isHostControlled, socket, activePartnerId, isControlLocked]);

  // WebRTC Setup Helper
  const setupWebRTC = async (isHost: boolean, partnerId: string) => {
    try {
      const configuration = {
        iceServers: [{ urls: config.stunServer }]
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      // ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('remote:ice-candidate', { targetUserId: partnerId, candidate: event.candidate });
        }
      };

      if (isHost) {
        // Add stream tracks (screen share)
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
        }

        // Set up WebRTC Data Channel
        const dc = pc.createDataChannel('control');
        dataChannelRef.current = dc;
        setupDataChannel(dc);

        // Create Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('remote:signal', { targetUserId: partnerId, signal: offer });
        addLog('Signaling offer dispatched.');
      } else {
        // Requester side
        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            setIsConnected(true);
            setIsConnecting(false);
            setDialingStatus('accepted');
            addLog('WebRTC Screen mirror feed attached.');
          }
        };

        pc.ondatachannel = (event) => {
          dataChannelRef.current = event.channel;
          setupDataChannel(event.channel);
        };
      }
    } catch (e) {
      console.error(e);
      addLog('Failed to negotiate WebRTC tunnel.');
      setIsConnecting(false);
      setDialingStatus('idle');
    }
  };

  const setupDataChannel = (dc: RTCDataChannel) => {
    dc.onopen = () => addLog('Control data channel linked.');
    dc.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'mouse') {
          setClientPointer({ x: payload.x, y: payload.y });
          addLog(`Remote mouse: (${payload.x}, ${payload.y})`);
        } else if (payload.type === 'key') {
          addLog(`Remote keyboard input: ${payload.key}`);
        } else if (payload.type === 'file-transfer') {
          addLog(`File transfer received: ${payload.fileName} (${payload.fileSize})`);
          toast.success(`Received shared file: ${payload.fileName}`);
          setRemoteClipboard({
            name: payload.fileName,
            type: 'text',
            size: payload.fileSize,
            content: payload.content || 'File payload synchronised'
          });
        }
      } catch (e) {}
    };
  };

  // Connect via phone number or code
  const initiateConnection = () => {
    const targetId = targetPhone.replace(/\s+/g, '');
    const target = teammates.find(t => t.phone?.replace(/\s+/g, '') === targetId || t.loginId === targetId);
    if (!target) {
      toast.error('User not found in online directory.');
      return;
    }
    if (!target.isOnline) {
      toast.error('User is currently offline.');
      return;
    }

    setIsConnecting(true);
    setDialingStatus('calling');
    addLog(`Requesting connection handshake with ${target.fullName}...`);
    
    socket?.emit('remote:request', {
      targetUserId: target.id,
      callerName: user?.fullName,
      callerPhone: user?.phone || user?.loginId,
      callerDept: user?.department?.name || 'Workspace'
    });

    // Start 30 seconds connection request timeout timer
    if (dialingTimeoutRef.current) clearTimeout(dialingTimeoutRef.current);
    dialingTimeoutRef.current = setTimeout(() => {
      setDialingStatus('timeout');
      setIsConnecting(false);
      addLog('Dialing handshake request timed out.');
      toast.error('Dial handshake request timed out.', { icon: '⏰' });
    }, 30000);
  };

  // Cancel Dialing Handshake
  const cancelConnectionRequest = () => {
    if (dialingTimeoutRef.current) clearTimeout(dialingTimeoutRef.current);
    const targetId = targetPhone.replace(/\s+/g, '');
    const target = teammates.find(t => t.phone?.replace(/\s+/g, '') === targetId || t.loginId === targetId);
    if (socket && target) {
      socket.emit('remote:terminate', { targetUserId: target.id });
    }
    setIsConnecting(false);
    setDialingStatus('idle');
    addLog('Handshake calling request cancelled.');
    toast.success('Dial handshake request cancelled.');
  };

  // Host Action: Accept Request
  const acceptRequest = async () => {
    if (!incomingRequestData) return;
    setShowIncomingRequest(false);
    
    try {
      addLog('Acquiring display share capture...');
      let stream: MediaStream;
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: config.resolution === '4k' ? 3840 : config.resolution === '1080p' ? 1920 : 1280,
              height: config.resolution === '4k' ? 2160 : config.resolution === '1080p' ? 1080 : 720,
              frameRate: Number(config.fps)
            },
            audio: config.audio
          });
        } catch (err) {
          console.warn('Real screen share blocked or failed, using mock canvas stream:', err);
          stream = createMockStream();
        }
      } else {
        console.warn('Display Media not supported in this browser, using mock canvas stream.');
        stream = createMockStream();
      }

      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsHosting(true);
      setIsHostControlled(true);
      setActivePartnerId(incomingRequestData.callerId);
      setActivePartnerName(incomingRequestData.callerName);

      socket?.emit('remote:response', {
        targetUserId: incomingRequestData.callerId,
        status: 'accepted',
        permissions: grantedPermissions,
        duration: sessionDuration
      });

      setupWebRTC(true, incomingRequestData.callerId);
      toast.success(`Sharing screen and control permissions!`);
      
      // Auto close/terminate after duration
      const durationMs = sessionDuration === '1h' ? 3600000 : sessionDuration === '3h' ? 10800000 : 0;
      if (durationMs > 0) {
        setTimeout(() => {
          terminateSession(false);
          toast.error('Session expired.');
        }, durationMs);
      }
    } catch (e) {
      console.error(e);
      rejectRequest();
    }
  };

  // Host Action: Reject Request
  const rejectRequest = () => {
    setShowIncomingRequest(false);
    if (incomingRequestData) {
      socket?.emit('remote:response', {
        targetUserId: incomingRequestData.callerId,
        status: 'rejected'
      });
    }
    setIncomingRequestData(null);
  };

  // Start Hosting screen manually
  const startHostingManually = async () => {
    try {
      addLog('Acquiring manual screen capture...');
      let stream: MediaStream;
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1920, height: 1080, frameRate: 30 },
            audio: true
          });
        } catch (err) {
          console.warn('Manual display capture failed, using canvas fallback:', err);
          stream = createMockStream();
        }
      } else {
        console.warn('Display Media not supported, using canvas fallback');
        stream = createMockStream();
      }
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsHosting(true);
      toast.success('Started sharing screen! Waiting for remote connections.');
    } catch (e) {
      toast.error('Screen capture permission denied.');
    }
  };

  // Release Control lock (Interlock check)
  const requestControlRelease = () => {
    if (socket && activePartnerId) {
      socket.emit('remote:control-lock', { targetUserId: activePartnerId, isLocked: false });
      setIsControlLocked(false);
    }
  };

  // Voice chat toggle (Zoom style meetings)
  const toggleVoiceCall = async () => {
    try {
      if (isVoiceChatEnabled) {
        localAudioStream?.getTracks().forEach(t => t.stop());
        setLocalAudioStream(null);
        setIsVoiceChatEnabled(false);
        addLog('Voice meeting audio stopped.');
      } else {
        addLog('Acquiring mic access for voice chat...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalAudioStream(stream);
        setIsVoiceChatEnabled(true);
        addLog('Voice chat online.');
        toast.success('Mic connected! Voice meeting active.');
      }
    } catch (e) {
      toast.error('Failed to get microphone permissions.');
    }
  };

  // Clean disconnect
  const terminateSession = (remoteEvent = false) => {
    if (socket && activePartnerId && !remoteEvent) {
      socket.emit('remote:terminate', { targetUserId: activePartnerId });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localAudioStream) {
      localAudioStream.getTracks().forEach(t => t.stop());
      setLocalAudioStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsConnecting(false);
    setDialingStatus('idle');
    setIsConnected(false);
    setIsHosting(false);
    setIsHostControlled(false);
    setIsVoiceChatEnabled(false);
    setActivePartnerId(null);
    setIsControlLocked(false);

    addLog('Remote Desk connection closed.');
    toast.success('Session disconnected.');
  };

  // Format remote phone numbers (e.g. 9092610415 -> 909 261 0415)
  const formatPhoneId = (phoneNum?: string) => {
    if (!phoneNum) return 'No Phone ID';
    const clean = phoneNum.replace(/\s+/g, '');
    if (clean.length === 10) {
      return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
    }
    return clean;
  };

  // Send control metrics over data channel
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isConnected || isControlLocked || !dataChannelRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1920);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1080);
    
    dataChannelRef.current.send(JSON.stringify({ type: 'mouse', x, y }));
    addLog(`Click coordinate dispatched: (${x}, ${y})`);
  };

  const handleViewportKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isConnected || isControlLocked || !dataChannelRef.current) return;
    dataChannelRef.current.send(JSON.stringify({ type: 'key', key: e.key }));
  };

  // Paste / File transfer simulation
  const simulateFileTransfer = (file: MockFile) => {
    if (!isConnected || !dataChannelRef.current) {
      toast.error('No connection tunnel active.');
      return;
    }
    dataChannelRef.current.send(JSON.stringify({
      type: 'file-transfer',
      fileName: file.name,
      fileSize: file.size,
      content: file.content
    }));
    toast.success(`Dispatched ${file.name} over WebRTC data channel!`);
    addLog(`File transfer upload initiated: ${file.name}`);
  };

  // Online / Offline count
  const onlinePeers = teammates.filter(t => t.isOnline);

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', color: 'var(--text-primary)' }}>
      
      {/* Upper header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            🖥️ GSV Remote Desk Ultra Viewer
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            P2P WebRTC screen mirroring, control coordination and meetings
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowConfigModal(true)}>
          <Settings size={14} /> Configure
        </button>
      </div>

      {/* AnyDesk Style 2-Column Grid */}
      <div className="row flex-grow-1" style={{ minHeight: '540px' }}>
        
        {/* Left Column: Viewport (Screen Mirror) */}
        <div className="col-lg-8 col-xl-9 d-flex flex-column">
          <div 
            ref={viewportRef}
            onClick={handleViewportClick}
            onKeyDown={handleViewportKeyPress}
            tabIndex={0}
            className="card p-0 overflow-hidden bg-black position-relative d-flex align-items-center justify-content-center flex-grow-1" 
            style={{ 
              minHeight: '450px', 
              border: '2px solid ' + (isHostControlled ? '#ef4444' : isConnected ? 'var(--brand-primary)' : 'var(--border-color)'),
              background: '#090d16',
              boxShadow: 'inset 0 4px 25px rgba(0,0,0,0.85)',
              cursor: isConnected ? (isControlLocked ? 'not-allowed' : 'crosshair') : 'default',
              outline: 'none',
              borderRadius: '12px'
            }}
          >
            {/* Hosting Screen Capture Feed */}
            {isHosting && (
              <div className="w-100 h-100 position-relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-100 h-100" style={{ objectFit: videoFit }} />
                
                <div className="position-absolute inset-0 d-flex flex-column align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(3px)', zIndex: 5, padding: '20px' }}>
                  <div className="card p-4 text-center animate-scale-in" style={{ maxWidth: '420px', border: '2px solid #ef4444', background: '#111827', color: '#f9fafb' }}>
                    <AlertCircle size={44} className="text-danger mx-auto mb-3 animate-pulse" />
                    <h4 style={{ fontWeight: 700, color: '#ef4444' }}>Remote Sync Active</h4>
                    <p style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.5 }}>
                      Client <strong className="text-primary">{activePartnerName}</strong> is accessing your desktop.
                    </p>
                    
                    {isControlLocked ? (
                      <div className="alert alert-danger py-2 px-3 text-start mb-3" style={{ fontSize: '11px' }}>
                        🔒 <strong>Inputs Interlocked:</strong> Host keyboard and mouse overrides are active. Client inputs are locked.
                      </div>
                    ) : (
                      <div className="alert alert-warning py-2 px-3 text-start mb-3" style={{ fontSize: '11px' }}>
                        🔑 Client has input control. Type or move physical mouse to temporarily interlock & lock client inputs.
                      </div>
                    )}

                    <div className="d-flex gap-2">
                      <button className="btn btn-danger w-100 btn-sm" onClick={() => terminateSession(false)}>
                        EMERGENCY TERMINATE (ESC)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Controlling Client Mirror Feed */}
            {isConnected && (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', padding: '16px' }}>
                
                {/* Overlay Lock for Interlock system */}
                {isControlLocked && (
                  <div className="position-absolute inset-0 d-flex flex-column align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', zIndex: 20 }}>
                    <div className="card p-3 text-center" style={{ background: '#1e293b', border: '1.5px solid #ef4444', color: '#fff' }}>
                      <AlertTriangle size={36} className="text-danger mx-auto mb-2" />
                      <h6 style={{ fontWeight: 700 }}>Host Input Interlock Active</h6>
                      <p style={{ fontSize: '12px', color: '#cbd5e1' }}>Host is currently active on their system. Controls paused.</p>
                      <button className="btn btn-sm btn-primary mt-2" onClick={requestControlRelease}>
                        Request Control Release
                      </button>
                    </div>
                  </div>
                )}

                {/* Remote Connection Header bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa' }}>
                    <Eye size={14} />
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>P2P Mirror Session</span>
                  </div>
                  
                  {/* Screen scaling controls */}
                  <div className="d-flex align-items-center gap-3">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Screen Fit:</span>
                      <select 
                        value={videoFit}
                        onChange={e => setVideoFit(e.target.value as any)}
                        className="bg-dark text-white border-0"
                        style={{ fontSize: '11px', padding: '2px 4px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }}
                      >
                        <option value="contain">Contain (16:9)</option>
                        <option value="cover">Maximize Fit (Cover)</option>
                        <option value="fill">Stretch Fill</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#94a3b8' }}>
                      <span>Latency: 12ms</span>
                      <span>FPS: {config.fps}</span>
                    </div>
                  </div>
                </div>

                {/* Video container with applied fit controls */}
                <div style={{ flex: 1, marginTop: '16px', position: 'relative', overflow: 'hidden' }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-100 h-100" 
                    style={{ objectFit: videoFit, background: '#000' }} 
                  />
                  
                  {explorerOpen && (
                    <div 
                      className="animate-scale-in"
                      style={{ 
                        position: 'absolute', top: '10px', left: '10px', width: '380px', height: '240px', 
                        background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 10
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '6px 10px' }}>
                        <span style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>Host Datasets Mount</span>
                        <X size={12} className="cursor-pointer" onClick={() => setExplorerOpen(false)} />
                      </div>
                      <div className="p-2 flex-grow-1" style={{ overflowY: 'auto', fontSize: '11px' }}>
                        {REMOTE_FILES.map((file, i) => (
                          <div 
                            key={i} 
                            onClick={() => setSelectedFileIndex(i)}
                            style={{ 
                              padding: '6px', cursor: 'pointer', borderRadius: '4px',
                              background: selectedFileIndex === i ? 'rgba(59,130,246,0.2)' : 'transparent',
                              color: selectedFileIndex === i ? '#fff' : '#cbd5e1'
                            }}
                          >
                            📁 {file.name} ({file.size})
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-xs btn-primary" onClick={() => simulateFileTransfer(REMOTE_FILES[selectedFileIndex])}>
                          Sync to Clipboard
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ height: '80px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px', fontFamily: 'monospace', fontSize: '10px', color: '#10b981', overflowY: 'auto' }}>
                  {terminalLogs.map((lg, i) => <div key={i}>{lg}</div>)}
                </div>
              </div>
            )}

            {/* Disconnected default View */}
            {!isHosting && !isConnected && dialingStatus === 'idle' && (
              <div className="text-center p-4" style={{ color: 'var(--text-secondary)' }}>
                <Monitor size={64} style={{ opacity: 0.15, marginBottom: '12px' }} />
                <h6 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>No Active Session</h6>
                <p style={{ fontSize: '13px' }}>Enter a Remote ID on the right to connect, or click Start Hosting to share your screen.</p>
              </div>
            )}

            {/* Dialing Connection status modals (calling/timeout/rejected overlays) */}
            {isConnecting && dialingStatus === 'calling' && (
              <div className="position-absolute inset-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 100 }}>
                <div className="card p-4 text-center animate-scale-in" style={{ width: '330px', border: '1.5px solid var(--brand-primary)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <RefreshCw size={40} className="text-warning mx-auto mb-3 spin" />
                  <h5 style={{ fontWeight: 700 }}>Connecting Handshake</h5>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Calling host user. Waiting for authorization response...
                  </p>
                  <button className="btn btn-danger btn-sm w-100" onClick={cancelConnectionRequest}>
                    Cancel Request
                  </button>
                </div>
              </div>
            )}

            {dialingStatus === 'timeout' && (
              <div className="position-absolute inset-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 100 }}>
                <div className="card p-4 text-center animate-scale-in" style={{ width: '330px', border: '1.5px solid #ef4444', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <AlertCircle size={40} className="text-danger mx-auto mb-3" />
                  <h5 style={{ fontWeight: 700, color: '#ef4444' }}>Handshake Timeout</h5>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    No response was received from the host within 30 seconds.
                  </p>
                  <button className="btn btn-sm btn-secondary w-100" onClick={() => setDialingStatus('idle')}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {dialingStatus === 'rejected' && (
              <div className="position-absolute inset-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 100 }}>
                <div className="card p-4 text-center animate-scale-in" style={{ width: '330px', border: '1.5px solid #ef4444', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <X size={40} className="text-danger mx-auto mb-3" />
                  <h5 style={{ fontWeight: 700, color: '#ef4444' }}>Request Rejected</h5>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    The host has rejected your remote access invitation.
                  </p>
                  <button className="btn btn-sm btn-secondary w-100" onClick={() => setDialingStatus('idle')}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Handshake authorization request pop-up on host side */}
            {showIncomingRequest && incomingRequestData && (
              <div className="position-absolute inset-0 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.75)', zIndex: 100 }}>
                <div className="card p-3 animate-scale-in" style={{ width: '340px', background: 'var(--bg-card)', border: '1.5px solid var(--brand-primary)', color: 'var(--text-primary)' }}>
                  <div className="d-flex align-items-center gap-2 mb-2 text-warning">
                    <ShieldAlert size={24} />
                    <strong style={{ fontSize: '13px' }}>Incoming UltraViewer Link</strong>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    User <strong>{incomingRequestData.callerName}</strong> ({incomingRequestData.callerPhone}) requests access to your desktop.
                  </p>
                  
                  {/* Permissions checkboxes */}
                  <div className="mb-2 p-2 rounded" style={{ background: 'var(--bg-secondary)', fontSize: '11px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>Permissions Scope:</div>
                    <label className="d-flex align-items-center gap-2 mb-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={grantedPermissions.fullControl} 
                        onChange={e => setGrantedPermissions(p => ({ ...p, fullControl: e.target.checked }))} 
                      />
                      <span>Full Remote Control</span>
                    </label>
                    <label className="d-flex align-items-center gap-2 mb-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={grantedPermissions.fileTransfer} 
                        onChange={e => setGrantedPermissions(p => ({ ...p, fileTransfer: e.target.checked }))} 
                      />
                      <span>Allow File Clipboard Sharing</span>
                    </label>
                  </div>

                  {/* Session limit dropdown */}
                  <div className="mb-3" style={{ fontSize: '11px' }}>
                    <label style={{ display: 'block', marginBottom: '2px', color: 'var(--text-secondary)' }}>Session Duration:</label>
                    <select 
                      value={sessionDuration} 
                      onChange={e => setSessionDuration(e.target.value)}
                      className="bg-dark text-white border-0 w-100 p-1 rounded"
                    >
                      <option value="1h">1 Hour limit</option>
                      <option value="3h">3 Hours limit</option>
                      <option value="unlimited">Until closed</option>
                    </select>
                  </div>

                  <div className="d-flex gap-2">
                    <button className="btn btn-primary btn-sm w-100" onClick={acceptRequest}>Accept</button>
                    <button className="btn btn-outline-light btn-sm w-100" onClick={rejectRequest} style={{ color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>Reject</button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom floating meeting controller */}
            {(isConnected || isHosting) && (
              <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3 card p-2 d-flex flex-row gap-2 bg-dark bg-opacity-95 align-items-center" style={{ border: '1.5px solid var(--brand-primary)', borderRadius: '10px', zIndex: 30 }}>
                {/* Voice Call meeting trigger */}
                <button 
                  onClick={toggleVoiceCall}
                  className={`btn btn-sm btn-icon ${isVoiceChatEnabled ? 'btn-success' : 'btn-ghost'}`}
                  style={{ color: '#fff' }}
                  title="Voice Call Meeting"
                >
                  {isVoiceChatEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" style={{ color: '#fff' }}><MousePointer2 size={15} /></button>
                
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)', height: '16px', margin: '0 4px' }}></div>
                
                <button className="btn btn-danger btn-sm px-2 py-1" style={{ fontSize: '11px', fontWeight: 700 }} onClick={() => terminateSession(false)}>
                  Disconnect (ESC)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AnyDesk controls (Modular cards aligned for Day/Night themes) */}
        <div className="col-lg-4 col-xl-3 d-flex flex-column gap-3">
          
          {/* Card 1: MY REMOTE ID */}
          <div className="card p-3 d-flex flex-column gap-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Network size={14} className="text-primary" /> MY REMOTE ID
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '1px', padding: '4px 0' }}>
              {formatPhoneId(user?.phone || user?.loginId)}
            </div>
            <button 
              className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontWeight: 600 }}
              onClick={() => {
                navigator.clipboard.writeText(user?.phone || user?.loginId || '');
                toast.success('Remote ID copied to clipboard');
              }}
            >
              <Copy size={13} /> Copy ID
            </button>
          </div>

          {/* Card 2: Connect to Peer */}
          <div className="card p-3 d-flex flex-column gap-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Connect to Peer</strong>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Enter Remote ID of target PC</div>
            <input 
              type="text" 
              className="form-control form-control-sm" 
              placeholder="e.g. 892-123-002" 
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              disabled={isConnecting || isConnected || isHosting}
              style={{ 
                background: 'var(--bg-input)', 
                border: '1.5px solid var(--border-input)', 
                color: 'var(--text-primary)', 
                fontWeight: 700, 
                fontSize: '14px',
                fontFamily: 'monospace',
                height: '36px'
              }}
            />
            <button 
              className="btn w-100 d-flex align-items-center justify-content-center gap-2"
              disabled={!targetPhone || isConnecting || isHosting}
              onClick={initiateConnection}
              style={{
                background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
                color: '#000',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                height: '36px',
                boxShadow: '0 4px 10px rgba(234,179,8,0.25)'
              }}
            >
              <Play size={14} fill="#000" /> Connect
            </button>
          </div>

          {/* Card 3: Host My Screen */}
          <div className="card p-3 d-flex flex-column gap-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Host My Screen</strong>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Share your desktop. Others can view and control it remotely using your Remote ID.
            </div>
            <button 
              className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={startHostingManually}
              disabled={isConnecting || isHosting || isConnected}
              style={{ fontWeight: 600, height: '34px' }}
            >
              <Share2 size={13} /> Start Hosting
            </button>
          </div>

          {/* Card 4: Network Peers Directory */}
          <div className="card p-3 d-flex flex-column gap-2 flex-grow-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', minHeight: '180px', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} className="text-primary" /> Network Peers
              </span>
              <span className="badge bg-secondary text-white" style={{ fontSize: '10px' }}>{onlinePeers.length} online</span>
            </div>

            <div className="d-flex flex-column gap-2 mt-2">
              {teammates.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>No peers available</div>
              ) : (
                teammates.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => {
                      if (t.isOnline) {
                        setTargetPhone(t.phone || t.loginId);
                        toast.success(`Selected peer ${t.fullName}`);
                      } else {
                        toast.error(`${t.fullName} is offline`);
                      }
                    }}
                    className="p-2 border rounded cursor-pointer d-flex align-items-center justify-content-between transition-all hover-peer-row"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      opacity: t.isOnline ? 1 : 0.55
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block' }}>{t.fullName}</strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{formatPhoneId(t.phone || t.loginId)}</span>
                    </div>
                    <span 
                      style={{ 
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: t.isOnline ? 'var(--brand-success)' : '#94a3b8',
                        display: 'block'
                      }} 
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Security / Acceleration Indicators */}
          <div className="d-flex flex-column gap-1 px-1" style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={13} style={{ color: 'var(--brand-success)' }} />
              <span>Encrypted via DTLS/SRTP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={13} style={{ color: 'var(--brand-primary)' }} />
              <span>Hardware Acceleration: ON</span>
            </div>
          </div>

        </div>

      </div>

      {/* STUN Configuration modal */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="modal animate-scale-in" style={{ maxWidth: '440px', background: 'var(--bg-modal)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h5 className="modal-title">WebRTC Tunnel Configuration</h5>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowConfigModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
              <div className="form-group">
                <label className="form-label">Streaming Quality Constraint</label>
                <select 
                  className="form-control" 
                  value={config.resolution} 
                  onChange={e => setConfig(prev => ({ ...prev, resolution: e.target.value }))}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="720p">720p HD (Low latency)</option>
                  <option value="1080p">1080p FHD (Fidelity)</option>
                  <option value="4k">4K Ultra HD (Lossless)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Framerate Cap</label>
                <select 
                  className="form-control" 
                  value={config.fps} 
                  onChange={e => setConfig(prev => ({ ...prev, fps: e.target.value }))}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="30">30 FPS</option>
                  <option value="60">60 FPS</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">STUN Host Server</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={config.stunServer} 
                  onChange={e => setConfig(prev => ({ ...prev, stunServer: e.target.value }))}
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowConfigModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowConfigModal(false); toast.success('Constraints updated.'); }}>Save</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-peer-row:hover {
          background: var(--bg-hover) !important;
          border-color: var(--brand-primary) !important;
        }
      `}</style>

    </div>
  );
}
