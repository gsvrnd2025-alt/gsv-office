import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '../ui/Sidebar';
import { Topbar } from '../ui/Topbar';
import { useThemeStore } from '../../store/theme.store';
import { chatApi, usersApi } from '../../api';
import { SoundManager } from '../../utils/sound';
import FloatingStickyNotes from './FloatingStickyNotes';
import styles from './AppLayout.module.css';
import { useAuthStore } from '../../store/auth.store';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Phone, PhoneOff, Mic, MicOff, Shield } from 'lucide-react';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { theme } = useThemeStore();
  const location = useLocation();
  const { accessToken } = useAuthStore();
  const qc = useQueryClient();

  // WebRTC socket state and call states
  const [webrtcSocket, setWebrtcSocket] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState(false);
  const [callingState, setCallingState] = useState<'idle' | 'calling' | 'connected'>('idle');
  const [callHistory, setCallHistory] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('gsv_call_history') || '[]'); }
    catch { return []; }
  });
  const [callPartnerName, setCallPartnerName] = useState('');
  const [callPartnerId, setCallPartnerId] = useState('');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeCallPos, setActiveCallPos] = useState<{x: number, y: number} | null>(null);
  const [isDraggingCall, setIsDraggingCall] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<any>(null);
  const callTypeRef = useRef<'audio' | 'video'>('audio');
  const callTimeoutRef = useRef<any>(null);
  const ringIntervalRef = useRef<any>(null);
  const iceCandidatesQueueRef = useRef<any[]>([]);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeRoomIdRef = useRef<string>('');
  const callTimerRef = useRef<any>(null);

  const activeCallRef = useRef(false);
  const incomingCallRef = useRef<any>(null);

  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { socketRef.current = webrtcSocket; }, [webrtcSocket]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

  // Fetch users directory for caller lookup
  const { data: usersData } = useQuery({
    queryKey: ['users-directory'],
    queryFn: () => usersApi.getDirectory().then(r => r.data?.data || r.data || []),
    refetchInterval: 30000,
    enabled: !!accessToken
  });
  const users = usersData?.data ? usersData.data : (Array.isArray(usersData) ? usersData : []);

  const findUserName = (userId: string): string => {
    const found = users.find((u: any) => u.id === userId);
    return found ? found.fullName : 'Teammate';
  };

  // Connect globally to presence namespace
  useEffect(() => {
    if (!accessToken) return;
    const socket = io('/presence', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling']
    });

    socket.on('presence:update', (data) => {
      qc.invalidateQueries({ queryKey: ['users-directory'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    });

    socket.on('connect_error', async (err) => {
      console.warn('Presence socket connection error, attempting token refresh:', err.message);
      try {
        await chatApi.getConversations();
        const freshToken = useAuthStore.getState().accessToken;
        if (freshToken && freshToken !== (socket.auth as any).token) {
          (socket.auth as any).token = freshToken;
          socket.connect();
        }
      } catch (refreshErr) {
        console.error('Failed to auto-refresh token for presence socket:', refreshErr);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, qc]);

  // Connect globally to webrtc namespace for background calling alerts
  useEffect(() => {
    if (!accessToken) return;
    const socket = io('/webrtc', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true
    });
    setWebrtcSocket(socket);

    socket.on('call:incoming', (data) => {
      // data: { roomId, callerId, type }
      if (activeCallRef.current || incomingCallRef.current) {
        socket.emit('call:busy', { callerId: data.callerId, roomId: data.roomId });
        return;
      }
      const callerName = findUserName(data.callerId);
      setIncomingCall({
        roomId: data.roomId,
        callerId: data.callerId,
        callerName,
        type: data.type || 'audio'
      });

      // Play ringing sound loop
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      SoundManager.playRing(4.0);
      ringIntervalRef.current = setInterval(() => {
        SoundManager.playRing(4.0);
      }, 5000);

      // Trigger Web Notification and Electron Popup
      if ((window as any).gsvDesktop && typeof (window as any).gsvDesktop.showIncomingCallPopup === 'function') {
        (window as any).gsvDesktop.showIncomingCallPopup({
          roomId: data.roomId,
          callerName,
          type: data.type || 'audio'
        });
      } else if (Notification.permission === 'granted') {
        new Notification(`Incoming Call from ${callerName}`, {
          body: 'Open GSV Office to answer this secure voice call.'
        });
      }
    });

    // Handle IPC from popup
    const handlePopupAction = (e: any) => {
      if (e.detail === 'accept') {
        acceptIncomingCall();
      } else if (e.detail === 'reject') {
        rejectIncomingCall();
      }
    };
    window.addEventListener('gsv-call-action', handlePopupAction);

    socket.on('call:participant-joined', async (data) => {
      // Received by the caller
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      
      toast.success('Connected! Voice resonance synced.');
      setCallingState('connected');
      
      await setupPeerConnection(activeRoomIdRef.current, true, data.socketId);
    });

    socket.on('webrtc:offer', async (data) => {
      // Received by the callee
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      const pc = await setupPeerConnection(data.roomId, false, data.from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        for (const candidate of iceCandidatesQueueRef.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
        }
        iceCandidatesQueueRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { to: data.from, answer });
      }
    });

    socket.on('webrtc:answer', async (data) => {
      // Received by the caller
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        for (const candidate of iceCandidatesQueueRef.current) {
          try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) {}
        }
        iceCandidatesQueueRef.current = [];
      }
    });

    socket.on('webrtc:ice-candidate', async (data) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) {}
      } else {
        iceCandidatesQueueRef.current.push(data.candidate);
      }
    });

    socket.on('call:participant-left', () => {
      toast.error('The call was terminated.');
      hangUpCall();
    });

    socket.on('call:busy', () => {
      toast.error('The teammate is currently busy in another call.');
      hangUpCall();
    });

    return () => {
      window.removeEventListener('gsv-call-action', handlePopupAction);
      socket.disconnect();
    };
  }, [accessToken, users]);

  // Call history helpers
  const addCallLog = (status: 'incoming' | 'outgoing' | 'missed' | 'rejected', name: string, duration: string) => {
    const newLog = {
      name,
      status,
      time: new Date().toLocaleString(),
      duration
    };
    setCallHistory(prev => {
      const updated = [newLog, ...prev].slice(0, 50);
      localStorage.setItem('gsv_call_history', JSON.stringify(updated));
      return updated;
    });
  };

  const updateLastCallDuration = (durationSec: number) => {
    const formatted = formatDuration(durationSec);
    setCallHistory(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[0] = { ...updated[0], duration: formatted };
      localStorage.setItem('gsv_call_history', JSON.stringify(updated));
      return updated;
    });
  };

  // WebRTC Connection Logic
  const setupPeerConnection = async (roomId: string, isCaller: boolean, targetSocketId: string) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = pc;

      let stream = localStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callTypeRef.current === 'video' });
        setLocalStream(stream);
        localStreamRef.current = stream;
      }
      stream.getTracks().forEach(track => pc.addTrack(track, stream!));

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc:ice-candidate', { to: targetSocketId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        }
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit('webrtc:offer', { to: targetSocketId, offer, roomId });
      }

      return pc;
    } catch (e) {
      console.error('setupPeerConnection error:', e);
      toast.error('Failed to set up calling peer connection.');
      hangUpCall();
    }
  };

  // Call API Actions
  const initiateCall = async (calleeId: string, calleeName: string, type: 'audio' | 'video' = 'audio') => {
    if (!webrtcSocket) {
      toast.error('Signaling socket not connected.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      localStreamRef.current = stream;
    } catch (err) {
      toast.error('Could not access microphone. Call blocked.');
      return;
    }

    setCallingState('calling');
    setActiveCall(true);
    setCallPartnerName(calleeName);
    setCallPartnerId(calleeId);
    setCallType(type);

    addCallLog('outgoing', calleeName, '00:00');

    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    SoundManager.playRing(3.0);
    ringIntervalRef.current = setInterval(() => {
      SoundManager.playRing(3.0);
    }, 4000);

    webrtcSocket.emit('call:initiate', { calleeId, type }, (response: any) => {
      if (response && response.roomId) {
        activeRoomIdRef.current = response.roomId;
      }
    });

    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = setTimeout(() => {
      if (callingState === 'calling') {
        toast.error('No answer.');
        hangUpCall();
      }
    }, 30000);
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;

    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incomingCall.type === 'video' });
      setLocalStream(stream);
      localStreamRef.current = stream;
    } catch (err) {
      toast.error('Could not access microphone. Call blocked.');
      rejectIncomingCall();
      return;
    }

    const roomId = incomingCall.roomId;
    const partnerName = incomingCall.callerName;
    const partnerId = incomingCall.callerId;
    const type = incomingCall.type;

    setCallPartnerName(partnerName);
    setCallPartnerId(partnerId);
    setCallType(type);
    setIncomingCall(null);
    setActiveCall(true);
    setCallingState('connected');

    addCallLog('incoming', partnerName, '00:00');

    activeRoomIdRef.current = roomId;
    webrtcSocket.emit('call:join', { roomId });

    if ((window as any).gsvDesktop && typeof (window as any).gsvDesktop.closeIncomingCallPopup === 'function') {
      (window as any).gsvDesktop.closeIncomingCallPopup();
    }
  };

  const rejectIncomingCall = () => {
    if (!incomingCall) return;

    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);

    addCallLog('rejected', incomingCall.callerName, '00:00');

    webrtcSocket.emit('call:leave', { roomId: incomingCall.roomId });
    setIncomingCall(null);

    if ((window as any).gsvDesktop && typeof (window as any).gsvDesktop.closeIncomingCallPopup === 'function') {
      (window as any).gsvDesktop.closeIncomingCallPopup();
    }
  };

  const hangUpCall = () => {
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (callingState === 'connected' && callDuration > 0) {
      updateLastCallDuration(callDuration);
    }

    if (webrtcSocket && activeRoomIdRef.current) {
      webrtcSocket.emit('call:leave', { roomId: activeRoomIdRef.current });
    }

    setActiveCall(false);
    setCallingState('idle');
    setCallDuration(0);
    setIsMuted(false);
    activeRoomIdRef.current = '';
  };

  // Call Duration Timer
  useEffect(() => {
    if (callingState === 'connected') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callingState]);

  // Drag logic for Active Call HUD
  useEffect(() => {
    if (!isDraggingCall) return;
    const handleDrag = (e: MouseEvent) => {
      setActiveCallPos({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    };
    const handleDragEnd = () => setIsDraggingCall(false);
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDraggingCall]);

  const [showInviteModal, setShowInviteModal] = useState(false);

  const inviteParticipantToCall = (userId: string) => {
    if (activeRoomIdRef.current && webrtcSocket) {
      webrtcSocket.emit('call:invite-participant', { calleeId: userId, roomId: activeRoomIdRef.current, type: callType });
      toast.success('Invitation sent to join the call.');
      setShowInviteModal(false);
    }
  };

  const isChatPage = location.pathname.startsWith('/chat');
  const pathParts = location.pathname.split('/');
  const activeConversationId = (isChatPage && pathParts[2]) ? pathParts[2] : null;

  // Background polling for unread chat sum across all conversations (polls every 5s)
  const { data: conversations = [] } = useQuery({
    queryKey: ['global-conversations-unread'],
    queryFn: () => chatApi.getConversations().then(r => r.data?.data || r.data || []),
    refetchInterval: 5000,
  });

  const prevUnreadCountSumRef = useRef(0);
  const isFirstRunRef = useRef(true);
  const unreadSum = conversations.reduce((acc: number, c: any) => {
    if (activeConversationId && c.id === activeConversationId) return acc;
    return acc + (Number(c.unread_count) || 0);
  }, 0);
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Tab Title Notification Flashing
  useEffect(() => {
    if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);

    if (unreadSum > 0) {
      if (!isFirstRunRef.current && unreadSum > prevUnreadCountSumRef.current) {
        SoundManager.playMessageRing();
        if (Notification.permission === 'granted') {
          new Notification('New Message', {
            body: 'You have a new message in GSV Office',
            icon: '/assets/icon.png'
          });
        }
      }
      let toggle = false;
      flashIntervalRef.current = setInterval(() => {
        toggle = !toggle;
        document.title = toggle 
          ? `🔔 (${unreadSum}) New Signal!` 
          : `💬 GSV E-Office Workspace`;
      }, 1000);
    } else {
      document.title = 'GSV E-Office Workspace';
    }

    isFirstRunRef.current = false;
    prevUnreadCountSumRef.current = unreadSum;
    return () => {
      if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
    };
  }, [unreadSum]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [isRemoteDesktopExpanded, setIsRemoteDesktopExpanded] = useState(false);

  return (
    <div className={`${styles.layout} page-enter`}>
      {/* Hidden audio element to play remote stream */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Global Incoming Call Overlay */}
      {incomingCall && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          color: '#fff', fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
            textAlign: 'center', padding: '40px', background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', width: '360px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--gradient-brand)', fontSize: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)',
              animation: 'pulse 2s infinite'
            }}>
              {incomingCall.callerName.charAt(0).toUpperCase()}
            </div>
            
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 800 }}>{incomingCall.callerName}</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                Incoming Secure {incomingCall.type === 'video' ? 'Video' : 'Voice'} Call...
              </p>
            </div>

            <div style={{ display: 'flex', gap: '24px', marginTop: '16px', width: '100%', justifyContent: 'center' }}>
              <button 
                onClick={rejectIncomingCall}
                style={{
                  width: '56px', height: '56px', borderRadius: '50%', border: 'none',
                  background: '#ef4444', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)'
                }}
                title="Reject Call"
              >
                <PhoneOff size={24} />
              </button>
              <button 
                onClick={acceptIncomingCall}
                style={{
                  width: '56px', height: '56px', borderRadius: '50%', border: 'none',
                  background: '#22c55e', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 10px 15px -3px rgba(34, 197, 94, 0.4)',
                  animation: 'bounce 1s infinite'
                }}
                title="Accept Call"
              >
                <Phone size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Active Call HUD */}
      {activeCall && (
        <div 
          onMouseDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setIsDraggingCall(true);
            dragStartRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            if (!activeCallPos) {
              setActiveCallPos({ x: rect.left, y: rect.top });
            }
          }}
          style={{
          position: 'fixed', 
          ...(activeCallPos ? { left: `${activeCallPos.x}px`, top: `${activeCallPos.y}px` } : { bottom: '24px', right: '24px' }), 
          zIndex: 9998,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', minWidth: '280px',
          color: '#fff', animation: 'slideIn 0.3s ease', fontFamily: 'system-ui, sans-serif',
          cursor: isDraggingCall ? 'grabbing' : 'grab', userSelect: 'none'
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'var(--gradient-brand)', fontSize: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            {callPartnerName.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {callPartnerName}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              {callingState === 'connected' ? (
                <>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                  <span>Resonance Connected — {formatDuration(callDuration)}</span>
                </>
              ) : (
                <>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#eab308', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                  <span>Calling Teammate...</span>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setShowInviteModal(true)}
              style={{
                width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                background: 'rgba(255,255,255,0.08)', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Add Participant"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                if (localStreamRef.current) {
                  const audioTrack = localStreamRef.current.getAudioTracks()[0];
                  if (audioTrack) {
                    audioTrack.enabled = !audioTrack.enabled;
                    setIsMuted(!audioTrack.enabled);
                  }
                }
              }}
              style={{
                width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                background: isMuted ? '#ef4444' : 'rgba(255,255,255,0.08)', color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={hangUpCall}
              style={{
                width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                background: '#ef4444', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              title="Hang Up"
            >
              <PhoneOff size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '16px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-primary)' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Add Participant</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Select a teammate to invite to the ongoing resonance.</p>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users.filter((u: any) => u.id !== useAuthStore.getState().user?.id && u.id !== callPartnerId).map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => inviteParticipantToCall(u.id)}
                  style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px',
                    padding: '8px 12px', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)'
                  }}
                >
                  {u.fullName}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className={styles.overlay} onClick={() => setMobileSidebarOpen(false)} />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onMobileClose={() => setMobileSidebarOpen(false)}
        hiddenCompletely={isRemoteDesktopExpanded && sidebarCollapsed}
      />

      <div 
        className={`${styles.mainContent} ${sidebarCollapsed ? styles.collapsed : ''}`}
        style={isRemoteDesktopExpanded ? { marginLeft: 0 } : undefined}
      >
        {!isChatPage && !isRemoteDesktopExpanded && (
          <Topbar
            onMenuClick={() => setMobileSidebarOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
          />
        )}
        <main 
          className={isChatPage ? styles.chatPageContent : styles.pageContent}
          style={isRemoteDesktopExpanded ? { padding: 0 } : undefined}
        >
          <Outlet context={{
            sidebarCollapsed,
            setSidebarCollapsed,
            isRemoteDesktopExpanded,
            setIsRemoteDesktopExpanded,
            webrtcSocket,
            initiateCall,
            activeCall,
            setActiveCall,
            callingState,
            setCallingState,
            callHistory,
            setCallHistory,
            incomingCall,
            setIncomingCall,
            hangUpCall,
            acceptIncomingCall,
            rejectIncomingCall,
            callPartnerName,
            setCallPartnerName,
            callPartnerId,
            setCallPartnerId,
            callType,
            setCallType,
            callDuration,
            isMuted,
            setIsMuted
          }} />
        </main>
      </div>

      {/* Floating Sticky Notes rendered globally */}
      {!isRemoteDesktopExpanded && <FloatingStickyNotes />}
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

