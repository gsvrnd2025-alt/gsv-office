import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send, Plus, Search, MessageSquare, Hash, Phone, Video,
  MoreVertical, Smile, Paperclip, CheckCheck, Check, File, Image,
  Download, Folder, Volume2, ChevronRight, ChevronLeft, X, Users2,
  Pin, ArrowRight, ArrowLeft, Mic, Sparkles, Copy, Trash2, Menu, CheckSquare, Info, StickyNote, ChevronDown,
  Bold, Italic, List, Code, Maximize2, Minimize2, Heart, LogOut, Link, AlertTriangle, UserPlus, Camera,
  PhoneOff, MicOff, VideoOff, Share2, Settings
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { chatApi, usersApi, filesApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { SoundManager } from '../../utils/sound';
import { copyTextToClipboard, copyUrlOrTextToClipboard } from '../../utils/clipboard';
import toast from 'react-hot-toast';
import styles from './ChatPage.module.css';

const FILE_EXTENSIONS = [
  { ext: 'txt', name: 'Plain Text (.txt)' },
  { ext: 'md', name: 'Markdown (.md)' },
  { ext: 'py', name: 'Python (.py)' },
  { ext: 'js', name: 'JavaScript (.js)' },
  { ext: 'jsx', name: 'React JS (.jsx)' },
  { ext: 'ts', name: 'TypeScript (.ts)' },
  { ext: 'tsx', name: 'React TS (.tsx)' },
  { ext: 'html', name: 'HTML (.html)' },
  { ext: 'css', name: 'CSS (.css)' },
  { ext: 'json', name: 'JSON (.json)' },
  { ext: 'sql', name: 'SQL Query (.sql)' },
  { ext: 'yaml', name: 'YAML (.yaml)' },
  { ext: 'yml', name: 'YAML (.yml)' },
  { ext: 'sh', name: 'Shell Script (.sh)' },
  { ext: 'bat', name: 'Batch Script (.bat)' },
  { ext: 'c', name: 'C Source (.c)' },
  { ext: 'cpp', name: 'C++ Source (.cpp)' },
  { ext: 'cs', name: 'C# Source (.cs)' },
  { ext: 'java', name: 'Java (.java)' },
  { ext: 'go', name: 'Go (.go)' },
  { ext: 'rs', name: 'Rust (.rs)' },
  { ext: 'php', name: 'PHP (.php)' },
  { ext: 'rb', name: 'Ruby (.rb)' },
  { ext: 'swift', name: 'Swift (.swift)' },
  { ext: 'kt', name: 'Kotlin (.kt)' },
  { ext: 'dart', name: 'Dart (.dart)' },
  { ext: 'xml', name: 'XML (.xml)' },
  { ext: 'ini', name: 'Configuration (.ini)' },
  { ext: 'env', name: 'Environment (.env)' },
  { ext: 'log', name: 'Log File (.log)' },
  { ext: 'zip', name: 'ZIP Archive (.zip)' },
  { ext: 'rar', name: 'RAR Archive (.rar)' },
  { ext: '7z', name: '7-Zip Archive (.7z)' },
  { ext: 'tar', name: 'TAR Archive (.tar)' },
  { ext: 'gz', name: 'GZIP Archive (.gz)' },
];

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = 2;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface StagedFile {
  name: string;
  size: string;
  blob: File;
  type: string;
}

const normalizeMessage = (m: any) => {
  if (!m) return m;
  return {
    ...m,
    fileName: m.file_name !== undefined ? m.file_name : m.fileName,
    fileUrl: m.file_url !== undefined ? m.file_url : m.fileUrl,
    fileSize: m.file_size !== undefined ? m.file_size : m.fileSize,
    mimeType: m.mime_type !== undefined ? m.mime_type : m.mimeType,
    folderId: m.folder_id !== undefined ? m.folder_id : m.folderId,
  };
};

function DraggableRow({ children, className, style }: any) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    
    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.style.cursor = 'grabbing';
    };
    const handleMouseLeave = () => {
      isDown = false;
      el.style.cursor = 'pointer';
    };
    const handleMouseUp = () => {
      isDown = false;
      el.style.cursor = 'pointer';
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    };
    
    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('mouseup', handleMouseUp);
    el.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.removeEventListener('mouseup', handleMouseUp);
      el.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  return (
    <div ref={ref} className={className} style={{ cursor: 'pointer', ...style }}>
      {children}
    </div>
  );
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dmUserId = searchParams.get('userId');
  const { sidebarCollapsed, setSidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } = useOutletContext<any>() || {};
  const { user, accessToken } = useAuthStore();
  const qc = useQueryClient();
  const isMobileDevice = typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);

  // Standard states
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'channels' | 'dms' | 'groups' | 'online' | 'teammates' | 'bookmarks'>('all');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeDropdownMsgId, setActiveDropdownMsgId] = useState<string | null>(null);
  const [forwardingMsgsList, setForwardingMsgsList] = useState<any[]>([]);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [chatSidebarCollapsed, setChatSidebarCollapsed] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'chats' | 'teammates' | 'bookmarks'>('chats');
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showFileSearchBar, setShowFileSearchBar] = useState(false);
  
  // Custom states
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', members: [] as string[] });

  // Custom states for premium chat page
  const [msgContextMenu, setMsgContextMenu] = useState<{ x: number; y: number; msg: any } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    iconType?: 'trash' | 'folder' | 'download' | 'info';
    confirmText?: string;
    cancelText?: string;
    brandColor?: string;
  } | null>(null);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [showMicWarningModal, setShowMicWarningModal] = useState(false);
  
  // ── Calling / WebRTC state ────────────────────────────────────────────────
  const socketRef = useRef<Socket | null>(null);
  const currentCallRoomIdRef = useRef<string | null>(null);
  const callTimeoutRef = useRef<any>(null);
  const callTimerRef = useRef<any>(null);
  // Real WebRTC peer connection + media stream refs
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const callerSocketIdRef = useRef<string | null>(null); // remote peer's socket ID for ICE/offer/answer

  const [incomingCallData, setIncomingCallData] = useState<{
    roomId: string;
    callerId: string;
    callerSocketId?: string;
    callerName: string;
    callerAvatar?: string;
    type: 'audio' | 'video';
    isConference?: boolean;
  } | null>(null);

  interface MissedCall {
    id: string;
    callerName: string;
    callerAvatar?: string;
    type: 'audio' | 'video';
    timestamp: string;
    isOutgoing: boolean;
  }
  const [missedCalls, setMissedCalls] = useState<MissedCall[]>([]);

  const [callParticipants, setCallParticipants] = useState<string[]>([]);
  const [showConferenceModal, setShowConferenceModal] = useState(false);
  const [showRoomSettingsModal, setShowRoomSettingsModal] = useState(false);
  const [roomSettings, setRoomSettings] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gsv_room_settings') || '{"soundEnabled":true,"enterToSend":true,"autoScroll":true}');
    } catch {
      return { soundEnabled: true, enterToSend: true, autoScroll: true };
    }
  });

  const [activeCall, setActiveCall] = useState(false);
  const [callingState, setCallingState] = useState<'idle' | 'calling' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callSeconds, setCallSeconds] = useState(0);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  // WhatsApp-style Custom Features
  const [showAttachmentsDropdown, setShowAttachmentsDropdown] = useState(false);
  const [showSmbModal, setShowSmbModal] = useState(false);
  const [smbForm, setSmbForm] = useState({ path: '\\\\192.168.0.177\\GSVR_Movies', name: '', note: '', tab: 'smb' as 'smb' | 'cloud' | 'local' });
  const [selectedCloudFolderId, setSelectedCloudFolderId] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [fileCategory, setFileCategory] = useState<'all' | 'image' | 'doc' | 'zip' | 'folder'>('all');
  const [sendingMessages, setSendingMessages] = useState<any[]>([]);
  const [uploadAccept, setUploadAccept] = useState('*');
  
  // 1. Mentions (@) popup
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  
  // 2. Message Pinning
  const [pinnedMessage, setPinnedMessage] = useState<any>(null);

  // 3. Message Forwarding
  const [forwardingMsg, setForwardingMsg] = useState<any>(null);

  // Chat Privacy, Blocking & Handshakes
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('gsv_blocked_users') || '[]'); }
    catch { return []; }
  });
  const [approvedHandshakes, setApprovedHandshakes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('gsv_approved_handshakes') || '[]'); }
    catch { return []; }
  });
  const [sentHandshakes, setSentHandshakes] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('gsv_sent_handshakes') || '[]'); }
    catch { return []; }
  });
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [deletedFiles, setDeletedFiles] = useState<string[]>([]);
  const [clearTimestamp, setClearTimestamp] = useState<number | null>(null);

  // Sync deletedFiles and clearTimestamp when user or conversation changes
  useEffect(() => {
    if (user && conversationId) {
      const df = localStorage.getItem(`gsv-deleted-files-${user.id}-${conversationId}`);
      setDeletedFiles(df ? JSON.parse(df) : []);
      
      const ct = localStorage.getItem(`gsv-chat-clear-${user.id}-${conversationId}`);
      setClearTimestamp(ct ? Number(ct) : null);
    } else {
      setDeletedFiles([]);
      setClearTimestamp(null);
    }
  }, [user?.id, conversationId]);

  // Note Editor states
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [showExtDropdown, setShowExtDropdown] = useState(false);
  const [noteFileName, setNoteFileName] = useState('note.txt');
  const [noteContent, setNoteContent] = useState('');

  // Scratchpad / Notepad (Personal Ideas) states
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpadText, setScratchpadText] = useState(() => localStorage.getItem('gsv_scratchpad') || '');
  const [showScratchpadMenu, setShowScratchpadMenu] = useState(false);
  const [scratchpadTitle, setScratchpadTitle] = useState('');
  const [selectedExtension, setSelectedExtension] = useState('txt');
  const [extensionSearch, setExtensionSearch] = useState('');
  const [isScratchpadMaximized, setIsScratchpadMaximized] = useState(false);
  const [scratchpadPos, setScratchpadPos] = useState({ x: 150, y: 150 });
  const [isDraggingScratchpad, setIsDraggingScratchpad] = useState(false);
  const scratchpadDragStartRef = useRef({ mouseX: 0, mouseY: 0, popupX: 0, popupY: 0 });

  useEffect(() => {
    localStorage.setItem('gsv_scratchpad', scratchpadText);
  }, [scratchpadText]);

  const handleScratchpadHeaderMouseDown = (e: React.MouseEvent) => {
    if (isScratchpadMaximized) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    
    setIsDraggingScratchpad(true);
    scratchpadDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      popupX: scratchpadPos.x,
      popupY: scratchpadPos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingScratchpad) return;
      const dx = e.clientX - scratchpadDragStartRef.current.mouseX;
      const dy = e.clientY - scratchpadDragStartRef.current.mouseY;
      
      const newX = Math.max(0, Math.min(window.innerWidth - 330, scratchpadDragStartRef.current.popupX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - 380, scratchpadDragStartRef.current.popupY + dy));
      
      setScratchpadPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDraggingScratchpad(false);
    };

    if (isDraggingScratchpad) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingScratchpad]);

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('scratchpad-textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = prefix + selectedText + suffix;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setScratchpadText(newValue);
    localStorage.setItem('gsv_scratchpad', newValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const handleSendScratchpadDirect = async () => {
    if (!scratchpadText.trim()) {
      toast.error('Scratchpad is empty.');
      return;
    }
    if (!conversationId) {
      toast.error('No active conversation selected.');
      return;
    }
    try {
      await sendMutation.mutateAsync({ content: scratchpadText });
      toast.success('Note sent directly to chat! 🚀');
      setShowScratchpad(false);
    } catch (err) {
      toast.error('Failed to send note.');
    }
  };

  const handleInsertScratchpadToChat = () => {
    if (!scratchpadText.trim()) {
      toast.error('Scratchpad is empty.');
      return;
    }
    setMessage(prev => prev ? prev + '\n' + scratchpadText : scratchpadText);
    toast.success('Note inserted into chat input! 📝');
    setShowScratchpad(false);
  };

  const sendScratchpadAsFile = async () => {
    if (!scratchpadText.trim()) {
      toast.error('Scratchpad content is empty.');
      return;
    }
    if (!conversationId) {
      toast.error('No active conversation selected.');
      return;
    }

    const title = scratchpadTitle.trim() || 'note';
    const filename = `${title}.${selectedExtension}`;
    
    const getMimeType = (ext: string) => {
      const mimes: Record<string, string> = {
        txt: 'text/plain',
        md: 'text/markdown',
        py: 'text/x-python',
        js: 'application/javascript',
        jsx: 'text/javascript',
        ts: 'application/x-typescript',
        tsx: 'text/typescript',
        html: 'text/html',
        css: 'text/css',
        json: 'application/json',
        sql: 'application/sql',
        java: 'text/x-java-source',
        ino: 'text/plain',
        log: 'text/plain',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
        zip: 'application/zip',
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif'
      };
      return mimes[ext] || 'application/octet-stream';
    };

    const mime = getMimeType(selectedExtension);
    const blob = new Blob([scratchpadText], { type: mime });
    const file = new window.File([blob], filename, { type: mime });

    const staged: StagedFile = {
      name: filename,
      size: formatBytes(blob.size),
      blob: file,
      type: 'file'
    };

    const toastId = toast.loading(`Uploading document "${filename}"...`);
    try {
      const fd = new FormData();
      fd.append('file', staged.blob);
      
      const uploadRes = await filesApi.upload(fd);
      const fileData = uploadRes.data?.data || uploadRes.data;
      if (!fileData) throw new Error('No file data returned');
      
      const fileId = fileData.id;
      const fileUrl = fileData.storage_url || fileData.storageUrl || fileData.url;
      const fileSize = fileData.size || fileData.sizeBytes;
      const mimeType = fileData.mime_type || fileData.mimeType;
      
      await chatApi.sendMessage(conversationId!, {
        content: '',
        type: 'file',
        fileId,
        fileName: filename,
        fileUrl,
        fileSize,
        mimeType
      });
      
      toast.success(`Sent document "${filename}" to chat! 🚀`, { id: toastId });
      setShowScratchpad(false);
      
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to send document: ${err.message || 'Server error'}`, { id: toastId });
    }
  };

  const handleDeleteFile = (msgId: string) => {
    const updated = [...deletedFiles, msgId];
    setDeletedFiles(updated);
    if (user && conversationId) {
      localStorage.setItem(`gsv-deleted-files-${user.id}-${conversationId}`, JSON.stringify(updated));
    }
    toast.success('File hidden from files list.');
  };

  const handleClearHistory = () => {
    const now = Date.now();
    setClearTimestamp(now);
    if (user && conversationId) {
      localStorage.setItem(`gsv-chat-clear-${user.id}-${conversationId}`, String(now));
    }
    toast.success('Chat history cleared locally.');
  };
  const [requestCategory, setRequestCategory] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [simulatedRequests, setSimulatedRequests] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('gsv_simulated_requests');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      { id: 'sim-req-1', fullName: 'Syed Rahim Basha', loginId: 'syed.rahim', employeeId: 'EMP-0003', status: 'pending', requestedAt: new Date().toISOString() },
      { id: 'sim-req-2', fullName: 'Jane Smith', loginId: 'jane.smith', employeeId: 'EMP-0004', status: 'pending', requestedAt: new Date().toISOString() }
    ];
  });

  const toggleBlockUser = (userId: string) => {
    const next = blockedUsers.includes(userId)
      ? blockedUsers.filter(id => id !== userId)
      : [...blockedUsers, userId];
    setBlockedUsers(next);
    localStorage.setItem('gsv_blocked_users', JSON.stringify(next));
    if (next.includes(userId)) {
      toast.success('Teammate blocked');
    } else {
      toast.success('Teammate unblocked');
    }
  };

  const handleSidebarSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = search.trim().toLowerCase();
      if (!q) return;

      // 1. Check if it matches a page name
      const pagesMap: Record<string, string> = {
        'email': '/email',
        'mail': '/email',
        'files': '/files',
        'file': '/files',
        'storage': '/storage',
        'dashboard': '/dashboard',
        'users': '/users',
        'user': '/users',
        'roles': '/roles',
        'role': '/roles',
        'tickets': '/tickets',
        'ticket': '/tickets',
        'billing': '/billing',
        'inventory': '/inventory',
        'purchase': '/purchase',
        'analytics': '/analytics',
        'plugins': '/plugins',
        'server': '/server',
        'profile': '/profile',
        'remote': '/remote-desktop',
        'remote desktop': '/remote-desktop',
        'workspace': '/workspace',
      };

      if (pagesMap[q]) {
        navigate(pagesMap[q]);
        setSearch('');
        return;
      }

      // 2. Check if it matches an active conversation name
      const matchingConv = conversations.find((c: any) => c.name?.toLowerCase().includes(q));
      if (matchingConv) {
        navigate(`/chat/${matchingConv.id}`);
        setSearch('');
        return;
      }

      // 3. Check if it matches a user from the directory
      const matchingUser = otherUsers.find((u: any) => u.fullName?.toLowerCase().includes(q) || u.loginId?.toLowerCase().includes(q));
      if (matchingUser) {
        startDM(matchingUser);
        setSearch('');
        return;
      }
    }
  };

  const sendHandshakeRequest = (partnerId: string) => {
    if (sentHandshakes.includes(partnerId)) return;
    const next = [...sentHandshakes, partnerId];
    setSentHandshakes(next);
    localStorage.setItem('gsv_sent_handshakes', JSON.stringify(next));
    toast.success('Handshake request sent to partner');
    
    // Auto-approve simulation: after 3 seconds, simulate other department user approving it!
    setTimeout(() => {
      setApprovedHandshakes(prev => {
        const nextApp = [...prev, partnerId];
        localStorage.setItem('gsv_approved_handshakes', JSON.stringify(nextApp));
        return nextApp;
      });
      toast.success('Cross-department handshake established!');
    }, 3000);
  };
  const [forwardTargets, setForwardTargets] = useState<string[]>([]);

  // 4. Voice Recorder HUD Simulation
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);

  // Lightbox / File Preview Modal
  const [previewFile, setPreviewFile] = useState<{ url: string, name: string, type: string } | null>(null);
  const [previewTextContent, setPreviewTextContent] = useState<string>('');
  const [loadingTextContent, setLoadingTextContent] = useState<boolean>(false);

  useEffect(() => {
    if (!previewFile) {
      setPreviewTextContent('');
      return;
    }
    const ext = previewFile.name.split('.').pop()?.toLowerCase() || '';
    const isText = ['json', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'html', 'css', 'txt', 'md', 'xml', 'yaml', 'yml', 'sh', 'bat', 'ini', 'log'].includes(ext);
    if (isText && previewFile.url && previewFile.url !== '#') {
      setLoadingTextContent(true);
      fetch(previewFile.url)
        .then(res => res.text())
        .then(txt => {
          setPreviewTextContent(txt);
          setLoadingTextContent(false);
        })
        .catch(err => {
          setPreviewTextContent('Error loading content.');
          setLoadingTextContent(false);
        });
    }
  }, [previewFile]);

  // Microphone permission query
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then((permissionStatus) => {
          setMicPermission(permissionStatus.state);
          permissionStatus.onchange = () => {
            setMicPermission(permissionStatus.state);
          };
        })
        .catch((err) => {
          console.warn('Microphone permission query not supported:', err);
          setMicPermission('unknown');
        });
    } else {
      setMicPermission('unknown');
    }
  }, []);

  // Click outside to dismiss context menu & more options dropdown
  useEffect(() => {
    const handleClose = () => {
      setMsgContextMenu(null);
      setShowMoreOptions(false);
    };
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  // 5. Message Reactions Store (Local mock state)
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});

  // 6. Bookmarks list
  const [bookmarks, setBookmarks] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gsv-bookmarks') || '[]');
    } catch {
      return [];
    }
  });

  const handleAddBookmark = (msg: any) => {
    const defaultName = msg.type === 'folder' ? 'GSV_Office_Init Folder' : 'Shared Document';
    const favoriteName = prompt('Enter favorite name for this bookmark:', defaultName);
    if (!favoriteName) return;

    const newBookmark = {
      id: `bookmark-${Date.now()}`,
      favoriteName,
      fileName: msg.type === 'folder' ? 'GSV_Office_Init' : 'System_Audit_Report.pdf',
      type: msg.type,
      content: msg.content,
      createdAt: new Date().toISOString()
    };
    const updated = [...bookmarks, newBookmark];
    setBookmarks(updated);
    localStorage.setItem('gsv-bookmarks', JSON.stringify(updated));
    toast.success('File bookmarked successfully! 🔖');
  };

  const handleRemoveBookmark = (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem('gsv-bookmarks', JSON.stringify(updated));
    toast.success('Bookmark removed');
  };

  const handleSaveToPC = async (fileName: string, content: string = 'GSV Office Mock SMB Shared Payload Content', fileUrl?: string) => {
    try {
      if (fileUrl) {
        const targetUrl = fileUrl.startsWith('http') ? fileUrl : `${window.location.origin}${fileUrl}`;
        const toastId = toast.loading(`Downloading ${fileName}... 💾`);

        // On mobile, blob URL anchor click fails (e.g. "Cannot download from blob:http://...")
        // Use navigator.share (Web Share API) or fallback to opening the URL directly
        if (isMobileDevice) {
          try {
            const response = await fetch(targetUrl, { mode: 'cors' });
            if (!response.ok) throw new Error(`Server returned status: ${response.status}`);
            const contentType = response.headers.get('content-type') || 'application/octet-stream';
            if (contentType.includes('text/html')) throw new Error('File not found (received HTML)');
            const blob = await response.blob();
            const FileConstructor = (window as any).File as any;
            const file = new FileConstructor([blob], fileName, { type: blob.type || contentType });
            const navShare = navigator as any;
            if (navShare.canShare && navShare.canShare({ files: [file] })) {
              toast.dismiss(toastId);
              await navShare.share({ files: [file], title: fileName });
              toast.success(`"${fileName}" shared/saved successfully! 💾`);
            } else {
              // Fallback: open URL directly in new tab so browser handles download
              toast.dismiss(toastId);
              window.open(targetUrl, '_blank');
              toast.success(`Opening "${fileName}" — use browser Save option 💾`);
            }
          } catch (mobileErr: any) {
            if (mobileErr.name === 'AbortError') { toast.dismiss(toastId); return; }
            console.error('Mobile download fallback to direct open:', mobileErr);
            // Last resort: open directly
            toast.dismiss(toastId);
            window.open(targetUrl, '_blank');
            toast.success(`Opening "${fileName}" — use browser Save option 💾`);
          }
          return;
        }

        // Desktop path: fetch + blob URL anchor click
        try {
          const response = await fetch(targetUrl);
          if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
          }
          
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            throw new Error('File not found (received HTML instead of binary)');
          }

          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fileName || 'download';
          document.body.appendChild(a);
          a.click();
          
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
          toast.success(`"${fileName}" downloaded successfully! 💾`, { id: toastId });
        } catch (fetchErr: any) {
          console.error('Fetch download failed:', fetchErr);
          toast.error(`Download failed: ${fetchErr.message || 'File not found'}`, { id: toastId });
        }
        return;
      }

      const blob = new Blob([content], { type: 'text/plain' });

      // Never use showSaveFilePicker on mobile — it's unsupported and may throw
      if (!isMobileDevice && 'showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success('Saved to PC successfully! 💾');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(isMobileDevice ? 'Downloaded to device successfully! 💾' : 'Downloaded to PC successfully! 💾');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(isMobileDevice ? 'Failed to save to device' : 'Failed to save to PC');
      }
    }
  };

  const handleShareFile = async (msg: any) => {
    const url = msg.file_url || msg.fileUrl;
    const name = msg.file_name || msg.fileName || 'shared-file';
    if (!url) {
      toast.error('No file available to share.');
      return;
    }
    const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    const toastId = toast.loading('Preparing file to share... 📤');

    try {
      // Step 1: Fetch the actual file bytes
      const response = await fetch(absoluteUrl, { mode: 'cors' });
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      if (contentType.includes('text/html')) throw new Error('File not found on server');
      const blob = await response.blob();

      // Step 2: Create a real File object (so WhatsApp/Gmail/etc get the actual file)
      const FileCtor = (window as any).File as any;
      const file = new FileCtor([blob], name, { type: blob.type || contentType });
      const navShare = navigator as any;

      // Step 3: Try Web Share API Level 2 with the real file
      if (navShare.canShare && navShare.canShare({ files: [file] })) {
        toast.dismiss(toastId);
        await navShare.share({
          files: [file],
          title: name,
          text: `Shared from GSV Office: ${name}`,
        });
        toast.success('File shared successfully! 🚀');
        return;
      }

      // Step 4: Fallback — share URL (text/link share)
      if (navShare.share) {
        toast.dismiss(toastId);
        await navShare.share({ title: name, url: absoluteUrl, text: `Shared via GSV Office: ${name}` });
        toast.success('Link shared! 🔗');
        return;
      }

      throw new Error('Web Share API not supported on this browser');
    } catch (err: any) {
      toast.dismiss(toastId);
      if (err.name === 'AbortError') return; // User cancelled share sheet
      // Final fallback — copy link to clipboard
      console.warn('Share failed, copying link:', err.message);
      const ok = copyTextToClipboard(absoluteUrl);
      if (ok) {
        toast.success('Link copied to clipboard! 📋 (File sharing not supported on this browser)');
      } else {
        toast.error('Could not share file. Try a different browser.');
      }
    }
  };

  const handleNativeShare = async (item: { text?: string; url?: string; title?: string }) => {
    const shareTitle = item.title || 'GSV Team Chat';
    const shareText = item.text || '';
    const shareUrl = item.url ? (item.url.startsWith('http') ? item.url : `${window.location.origin}${item.url}`) : undefined;

    if (navigator.share) {
      try {
        const dataToShare: ShareData = { title: shareTitle };
        if (shareText) dataToShare.text = shareText;
        if (shareUrl) dataToShare.url = shareUrl;
        await navigator.share(dataToShare);
        toast.success('Shared successfully! 🚀');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Native share failed, falling back to clipboard:', err);
      }
    }

    const content = shareUrl ? (shareText ? `${shareText}\n${shareUrl}` : shareUrl) : shareText;
    if (content) {
      const ok = copyTextToClipboard(content);
      if (ok) toast.success('Copied to clipboard for external sharing! 📋');
      else toast.error('Failed to copy to clipboard.');
    } else {
      toast.error('Nothing to share.');
    }
  };

  const handleBulkNativeShare = () => {
    if (selectedMessages.length === 0) return;
    const msgs = sortedMessages.filter((m: any) => selectedMessages.includes(m.id));
    const textParts = msgs.map((m: any) => {
      const sender = m.sender_name || m.senderName || 'Teammate';
      const url = m.file_url || m.fileUrl;
      return `[${sender}]: ${m.content || ''}${url ? ` (${url})` : ''}`;
    }).join('\n\n');

    handleNativeShare({
      title: `${selectedMessages.length} Messages from GSV Chat`,
      text: textParts
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipFolderInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSaveToCloud = async (fileId: string) => {
    try {
      await filesApi.saveToCloud(fileId);
      toast.success('Signal saved to Cloud successfully! ☁️');
    } catch (err) {
      toast.error('Failed to sync signal with cloud storage.');
    }
  };

  // React Queries
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => chatApi.getConversations().then(r => r.data?.data || r.data || []),
    refetchInterval: 5000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => chatApi.getMessages(conversationId!).then(r => {
      const data = r.data?.data || r.data || [];
      // Backend returns messages DESC (newest first) — reverse for chronological display
      return [...data].reverse().map(normalizeMessage);
    }),
    enabled: !!conversationId,
    refetchInterval: 2000,
  });

  // Use /users/directory — no 'users:read' permission required, available to all logged-in users
  const { data: usersData } = useQuery({
    queryKey: ['users-directory'],
    queryFn: () => usersApi.getDirectory().then(r => r.data?.data || r.data || []),
    refetchInterval: 30000, // refresh every 30 seconds (directory changes rarely)
  });

  const users = usersData?.data ? usersData.data : (Array.isArray(usersData) ? usersData : []);
  const uniqueUsers: any[] = Array.from(new Map<any, any>(users.map((u: any) => [u.id, u])).values());
  const otherUsers: any[] = uniqueUsers.filter((u: any) => u.id !== user?.id);

  // User folders for direct cloud sharing
  const { data: userFolders = [] } = useQuery({
    queryKey: ['user-folders-for-chat'],
    queryFn: () => filesApi.getFolders().then(r => r.data?.data || r.data || []),
    enabled: showSmbModal
  });

  // Mutations
  const sendMutation = useMutation({
    mutationFn: async (payload: { content: string; type?: string; files?: any[]; tempId?: string; metadata?: any }) => {
      // 1. Direct SMB Network Folder Share
      if (payload.type === 'smb_folder') {
        return chatApi.sendMessage(conversationId!, {
          content: payload.content,
          type: 'smb_folder',
          metadata: payload.metadata
        }).then(r => r.data?.data || r.data);
      }

      // 2. Direct Existing Cloud Folder Share (no re-upload)
      if (payload.type === 'folder' && payload.metadata?.folderId) {
        return chatApi.sendMessage(conversationId!, {
          content: payload.content,
          type: 'folder',
          folderId: payload.metadata.folderId,
          fileName: payload.metadata.folderName || 'Cloud Folder',
        }).then(r => r.data?.data || r.data);
      }

      if (payload.files && payload.files.length > 0) {
        if (payload.type === 'folder_zip' || (payload.type === 'folder' && payload.files[0]?.type === 'folder_zip')) {
          const staged = payload.files[0];
          const fd = new FormData();
          fd.append('file', staged.blob);
          const folderName = staged.name.split('/')[0]?.replace(/\s*\(Zip Auto-Extract\)/i, '') || staged.blob.name?.replace(/\.(zip|tar|gz|7z|rar)$/i, '') || 'Extracted Folder';
          fd.append('folderName', folderName);
          if (conversationId) {
            fd.append('conversationId', conversationId);
          }
          let folderId = undefined;
          let fileName = undefined;
          
          try {
            const uploadRes = await filesApi.uploadFolderZip(fd, (progressEvent: any) => {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgressPercent(percent);
            });
            const fileData = uploadRes.data?.data || uploadRes.data;
            if (fileData) {
              folderId = fileData.id;
              fileName = fileData.name || folderName;
            }
          } catch (err: any) {
            console.error('ZIP Folder upload failed in chat propagation:', err);
            const errMsg = err?.response?.data?.message || err?.message || 'Folder extraction failed';
            toast.error(`Folder extraction failed: ${errMsg}`);
            throw err;
          }

          if (!folderId) {
            throw new Error('Folder upload failed to return a valid folder identifier');
          }

          return chatApi.sendMessage(conversationId!, {
            content: payload.content,
            type: 'folder',
            folderId,
            fileName,
          }).then(r => r.data?.data || r.data);
        } else if (payload.type === 'folder') {
          const staged = payload.files[0];
          if (!staged || !staged.files || staged.files.length === 0) {
            throw new Error('No files provided in staged folder');
          }
          if (staged.files.length > 500) {
            toast.error(`Folder exceeds maximum loose file limit (${staged.files.length} files). Please upload as ZIP archive.`);
            throw new Error('Folder contains too many loose files for direct HTTP upload. Please use ZIP upload.');
          }
          const fd = new FormData();
          let folderId = undefined;
          let fileName = undefined;
          
          try {
            staged.files.forEach((file: File) => {
              fd.append('files', file);
            });
            const relativePaths = staged.files.map((file: any) => file.webkitRelativePath || file.name);
            fd.append('relativePaths', JSON.stringify(relativePaths));
            const folderName = staged.name.split('/')[0]?.replace(/\s*\(\d+.*files\)/i, '') || 'Uploaded_Folder';
            fd.append('folderName', folderName);
            if (conversationId) {
              fd.append('conversationId', conversationId);
            }
            const uploadRes = await filesApi.uploadFolder(fd, (progressEvent: any) => {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgressPercent(percent);
            });
            const fileData = uploadRes.data?.data || uploadRes.data;
            if (fileData) {
              folderId = fileData.id;
              fileName = fileData.name || folderName;
            }
          } catch (err: any) {
            console.error('Folder upload failed in chat propagation:', err);
            const errMsg = err?.response?.data?.message || err?.message || 'Folder upload failed';
            toast.error(`Folder upload failed: ${errMsg}`);
            throw err;
          }

          if (!folderId) {
            throw new Error('Folder upload failed to return a valid folder identifier');
          }

          return chatApi.sendMessage(conversationId!, {
            content: payload.content,
            type: 'folder',
            folderId,
            fileName,
          }).then(r => r.data?.data || r.data);
        } else {
          // Multiple standard file uploads loop (up to 30 files)
          let lastRes = null;
          for (let i = 0; i < payload.files.length; i++) {
            setUploadProgress({ current: i + 1, total: payload.files.length });
            const staged = payload.files[i];
            const fd = new FormData();
            fd.append('file', staged.blob);
            
            let fileId = undefined;
            let fileName = undefined;
            let fileUrl = undefined;
            let fileSize = undefined;
            let mimeType = undefined;

            try {
              const uploadRes = await filesApi.upload(fd, (progressEvent: any) => {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgressPercent(percent);
              });
              const fileData = uploadRes.data?.data || uploadRes.data;
              if (fileData) {
                fileId = fileData.id;
                fileName = fileData.original_name || fileData.originalName || fileData.name;
                fileUrl = fileData.storage_url || fileData.storageUrl || fileData.url;
                fileSize = fileData.size || fileData.sizeBytes;
                mimeType = fileData.mime_type || fileData.mimeType;
              }
            } catch (err) {
              console.error(`File ${staged.name} upload failed:`, err);
              continue;
            }

            const contentText = i === 0 ? payload.content : '';
            lastRes = await chatApi.sendMessage(conversationId!, {
              content: contentText || '',
              type: staged.type || 'file',
              fileId,
              fileName,
              fileUrl,
              fileSize,
              mimeType
            }).then(r => r.data?.data || r.data);
          }
          setUploadProgress(null);
          setUploadProgressPercent(null);
          return lastRes;
        }
      } else {
        // Plain text message
        return chatApi.sendMessage(conversationId!, {
          content: payload.content,
          type: 'text'
        }).then(r => r.data?.data || r.data);
      }
    },
    onSuccess: (data, variables) => {
      setMessage('');
      setStagedFiles([]);
      setUploadProgress(null);
      setUploadProgressPercent(null);
      if (variables.tempId) {
        setSendingMessages(prev => prev.filter(m => m.id !== variables.tempId));
      }
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err, variables) => {
      setUploadProgress(null);
      setUploadProgressPercent(null);
      if (variables.tempId) {
        setSendingMessages(prev => prev.filter(m => m.id !== variables.tempId));
      }
      toast.error('Failed to propagate chat signal');
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: { name: string; description: string; type: string; members?: string[] }) =>
      chatApi.createConversation(data),
    onSuccess: (res: any, variables: any) => {
      const newRoom = res.data?.data || res.data;
      if (variables.type === 'private') {
        toast.success(`Secure chat with ${variables.name.replace('DM with ', '')} established! 💬`);
      } else {
        toast.success(`Group "${newRoom.name || 'Room'}" established! 🏢`);
      }
      setShowCreateGroup(false);
      setGroupForm({ name: '', description: '', members: [] });
      
      if (newRoom && newRoom.id) {
        qc.setQueryData(['conversations'], (old: any) => {
          const list = Array.isArray(old) ? old : [];
          if (list.some((c: any) => c.id === newRoom.id)) return list;
          return [newRoom, ...list];
        });
      }
      
      qc.invalidateQueries({ queryKey: ['conversations'] });
      if (newRoom && newRoom.id) navigate(`/chat/${newRoom.id}`);
    },
    onError: (err: any, variables: any) => {
      if (variables.type === 'private') {
        toast.error('Failed to initiate secure chat handshake');
      } else {
        toast.error('Failed to create department group');
      }
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => chatApi.deleteMessage(messageId),
    onSuccess: () => {
      toast.success('Message deleted successfully!');
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Failed to delete message');
    }
  });

  const markAllChatsRead = async () => {
    try {
      const unread = conversations.filter((c: any) => (Number(c.unread_count) || 0) > 0);
      if (unread.length === 0) {
        toast.error('No unread messages');
        return;
      }
      
      await Promise.all(unread.map((c: any) => chatApi.markRead(c.id)));
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['global-conversations-unread'] });
      toast.success('All chats marked as read! 💬');
    } catch (err) {
      toast.error('Failed to mark all chats as read');
    }
  };

  // 1. Play synthesized message ring and scroll for new messages in the currently active chat room
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    if (messages.length > prevMessagesLengthRef.current) {
      const lastMsg = messages[messages.length - 1];
      // Only play the sound if the message exists and was not sent by the logged-in user
      if (lastMsg && lastMsg.sender_id !== user?.id && lastMsg.sender?.id !== user?.id) {
        SoundManager.playMessageRing();
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, user?.id]);

  // 2. Play synthesized message ring for new background messages (across all conversations unread sum)
  const prevUnreadCountSumRef = useRef(0);
  const isFirstRunRef = useRef(true);
  useEffect(() => {
    const currentUnreadSum = conversations.reduce((acc: number, c: any) => {
      if (conversationId && c.id === conversationId) return acc;
      return acc + (Number(c.unread_count) || 0);
    }, 0);
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
    } else if (currentUnreadSum > prevUnreadCountSumRef.current) {
      SoundManager.playMessageRing();
    }
    prevUnreadCountSumRef.current = currentUnreadSum;
  }, [conversations, conversationId]);

  // 2.5. Automatically mark the active conversation as read
  useEffect(() => {
    if (conversationId) {
      chatApi.markRead(conversationId)
        .then(() => {
          qc.invalidateQueries({ queryKey: ['conversations'] });
          qc.invalidateQueries({ queryKey: ['global-conversations-unread'] });
        })
        .catch(err => console.error('Failed to mark conversation as read:', err));
    }
  }, [conversationId, messages.length, qc]);

  // 3. Handle global search routing for DM chats
  useEffect(() => {
    if (dmUserId && users.length > 0) {
      const targetUser = users.find((u: any) => u.id === dmUserId);
      if (targetUser) {
        startDM(targetUser);
      }
      setSearchParams({}, { replace: true });
    }
  }, [dmUserId, users, conversations]);

  // Mentions monitoring
  const handleInputChange = (val: string) => {
    setMessage(val);
    const lastWord = val.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionQuery(lastWord.slice(1));
    } else {
      setShowMentions(false);
    }
  };

  const selectMention = (u: any) => {
    const words = message.split(' ');
    words.pop(); // Remove the '@query'
    setMessage([...words, `@${u.fullName} `].join(' '));
    setShowMentions(false);
  };

  // Recording Visualizer Trigger
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const timeStr = new Date().toLocaleTimeString().replace(/:/g, '-');
          const audioFile = new window.File([audioBlob], `VoiceNote_${timeStr}.webm`, { type: 'audio/webm' });
          
          sendMutation.mutate({
            content: '',
            type: 'music',
            files: [{
              id: `voice-${Date.now()}`,
              name: `VoiceNote_${timeStr}.webm`,
              size: audioFile.size,
              type: 'music',
              blob: audioFile
            }]
          });
          toast.success('Voice note uploaded and sent! 📻');
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
      toast('🎤 Voice recording started.');
    } catch (err: any) {
      console.error('Mic access failed:', err);
      setMicPermission('denied');
      toast.error('Could not access microphone.');
      setShowMicWarningModal(true);
    }
  };

  const handleMicClick = async () => {
    if (micPermission === 'denied') {
      setShowMicWarningModal(true);
      return;
    }
    try {
      await startRecording();
    } catch (err) {
      setMicPermission('denied');
      setShowMicWarningModal(true);
    }
  };

  const stopRecording = (discard = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (discard) {
        mediaRecorderRef.current.onstop = () => {
          if (mediaRecorderRef.current) {
            const stream = mediaRecorderRef.current.stream;
            stream.getTracks().forEach(track => track.stop());
          }
          toast('Voice recording discarded.');
        };
      }
      mediaRecorderRef.current.stop();
    }
    setRecordingSeconds(0);
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setMessageReactions(prev => {
      const current = prev[msgId] || [];
      if (current.includes(emoji)) {
        return { ...prev, [msgId]: current.filter(e => e !== emoji) };
      }
      return { ...prev, [msgId]: [...current, emoji].slice(-3) }; // Keep top 3 reactions
    });
  };

  const handleShareSmbFolder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smbForm.path.trim()) {
      toast.error('Please specify a valid Windows SMB network path');
      return;
    }
    const folderName = smbForm.name.trim() || smbForm.path.split('\\').filter(Boolean).pop() || 'Shared SMB Folder';
    const noteText = smbForm.note.trim() ? `\n📝 ${smbForm.note.trim()}` : '';
    const contentText = `📁 **SMB Network Folder Share**:\n\`${smbForm.path.trim()}\`${noteText}`;
    
    sendMutation.mutate({
      content: contentText,
      type: 'smb_folder',
      metadata: {
        smbPath: smbForm.path.trim(),
        folderName,
        isSmb: true,
      }
    } as any);
    
    setShowSmbModal(false);
    setSmbForm({ path: '\\\\192.168.0.177\\GSVR_Movies', name: '', note: '', tab: 'smb' });
    toast.success('SMB Folder Share link sent to chat! 📁');
  };

  const handleShareExistingCloudFolder = (f: any) => {
    sendMutation.mutate({
      content: `📁 Shared Cloud Folder: **${f.name}**`,
      type: 'folder',
      files: [{
        name: f.name,
        size: 'Cloud Folder',
        blob: new Blob([]),
        type: 'folder'
      }],
      metadata: {
        folderId: f.id,
        folderName: f.name
      }
    } as any);
    setShowSmbModal(false);
    toast.success(`Cloud Folder "${f.name}" shared to chat! ☁️`);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && stagedFiles.length === 0) return;
    
    const tempId = `temp-${Date.now()}`;
    const isFolder = stagedFiles.some(f => f.type === 'folder' || f.type === 'folder_zip');
    const attachmentType = stagedFiles.length > 0 ? (isFolder ? (stagedFiles[0].type === 'folder_zip' ? 'folder_zip' : 'folder') : stagedFiles[0].type) : 'text';

    const tempMsg = {
      id: tempId,
      content: message.trim() || '',
      sender_id: user?.id,
      sender: { id: user?.id, fullName: user?.fullName || 'Me' },
      created_at: new Date().toISOString(),
      type: attachmentType,
      isSending: true,
      file_name: stagedFiles[0]?.name,
      file_size: stagedFiles[0]?.size,
    };
    
    setSendingMessages(prev => [...prev, tempMsg]);

    if (stagedFiles.length > 0) {
      sendMutation.mutate({
        content: message.trim() || '',
        type: attachmentType,
        files: stagedFiles,
        tempId
      });
    } else {
      sendMutation.mutate({ content: message.trim(), tempId });
    }
  };

  // Moved bulk actions below sortedMessages

  const startDM = async (targetUser: any) => {
    setActiveMainTab('chats');
    setSearch('');
    // Check locally first
    const existing = conversations.find(
      (c: any) => c.type === 'private' && 
        (c.members?.some((m: any) => m.id === targetUser.id) ||
         c.name?.toLowerCase().includes(targetUser.fullName.toLowerCase()) || 
         c.name?.toLowerCase().includes(targetUser.loginId.toLowerCase()))
    );
    
    if (existing) {
      navigate(`/chat/${existing.id}`);
      return;
    }

    // Otherwise, request backend (backend will return existing if we missed it locally)
    createGroupMutation.mutate({
      name: `DM with ${targetUser.fullName}`,
      description: `Direct secure handshake with ${targetUser.fullName}`,
      type: 'private',
      members: [targetUser.id]
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isFolder = false) => {
    let files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (isFolder) {
        const relativePath = (files[0] as any).webkitRelativePath || '';
        const folderName = relativePath.split('/')[0] || 'Staged Folder';
        
        let totalSize = 0;
        const count = files.length;
        const sampleLimit = Math.min(count, 5000);
        for (let i = 0; i < sampleLimit; i++) {
          totalSize += files[i].size || 0;
        }
        if (count > 5000) {
          totalSize = Math.round((totalSize / sampleLimit) * count);
        }
        const sizeMB = (totalSize / 1024 / 1024).toFixed(1);

        if (files.length > 200) {
          setConfirmModal({
            title: `Massive Folder Detected (${files.length.toLocaleString()} files)`,
            message: `Folder "${folderName}" contains ${files.length.toLocaleString()} files (~${sizeMB} MB).\n\nUploading tens of thousands of loose files over a single browser HTTP session causes browser memory exhaustion and network connection timeouts.\n\nRecommended: Compress this directory into a .zip archive (Zip File Upload) or use the connected TrueNAS SMB network share (/mnt/smb).`,
            iconType: 'folder',
            confirmText: '📦 Upload as ZIP Instead',
            cancelText: '🔗 Share via TrueNAS SMB',
            brandColor: '#f59e0b',
            onConfirm: () => {
              setTimeout(() => zipFolderInputRef.current?.click(), 100);
            },
            onCancel: () => {
              setSmbForm(prev => ({ ...prev, name: folderName, path: `\\\\192.168.0.177\\GSVR_Movies\\${folderName}` }));
              setShowSmbModal(true);
            }
          });
          return;
        }

        const stagedFolder = {
          name: `${folderName}/ (${files.length} files)`,
          size: `${sizeMB} MB`,
          blob: files[0],
          files: files,
          type: 'folder'
        };
        setStagedFiles(prev => [...prev, stagedFolder]);
        toast.success(`Folder "${folderName}" (${files.length} files, ${sizeMB} MB) staged successfully! 📁`);
      } else {
        if (files.length > 30) {
          toast.error("You can select a maximum of 30 files at a time. Slicing to the first 30 files.");
          files = files.slice(0, 30);
        }
        if (stagedFiles.length + files.length > 30) {
          toast.error("You can stage a maximum of 30 files total.");
          return;
        }
        const staged = files.map(file => {
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          let type = 'file';
          if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) type = 'photo';
          else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) type = 'video';
          else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) type = 'music';
          
          return {
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            blob: file,
            type: type
          };
        });
        setStagedFiles(prev => [...prev, ...staged]);
        toast.success(`${files.length} file(s) staged.`);
      }
    }
    // Clear input value to allow re-selection
    e.target.value = '';
  };

  const handleZipFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const baseName = file.name.replace(/\.(zip|tar|gz|7z|rar)$/i, '') || 'Extracted Folder';
    const staged = {
      name: `${baseName}/ (Zip Auto-Extract)`,
      size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
      blob: file,
      files: [file],
      type: 'folder_zip'
    };
    setStagedFiles(prev => [...prev, staged]);
    toast.success(`Archive "${file.name}" staged as Folder! It will auto-extract on the server into Cloud Files. 📦`);
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      let filesToStage = files;
      if (filesToStage.length > 30) {
        toast.error("You can paste a maximum of 30 files at a time. Slicing to the first 30 files.");
        filesToStage = filesToStage.slice(0, 30);
      }
      if (stagedFiles.length + filesToStage.length > 30) {
        toast.error("You can stage a maximum of 30 files total.");
        return;
      }
      const staged = filesToStage.map(file => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let type = 'file';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) type = 'photo';
        else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) type = 'video';
        else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) type = 'music';
        
        return {
          name: file.name || `Pasted_Asset_${Date.now()}.${ext || 'png'}`,
          size: (file.size / 1024).toFixed(1) + ' KB',
          blob: file,
          type: type
        };
      });
      setStagedFiles(prev => [...prev, ...staged]);
      toast.success(`${filesToStage.length} pasted file(s) staged successfully! 📋`);
    }
  };


  // ── Real WebRTC Intercom Engine ───────────────────────────────────────────────
  // STUN for LAN peer-to-peer hole punching
  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  /** Create and wire up a new RTCPeerConnection */
  const createPeerConnection = (onIceCandidate: (candidate: RTCIceCandidate) => void): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) onIceCandidate(e.candidate);
    };

    pc.ontrack = (e) => {
      console.log('Remote track received:', e.track.kind);
      if (e.track.kind === 'audio' || e.streams[0]) {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = e.streams[0] || null;
          remoteAudioRef.current.play().catch(console.warn);
        }
      }
      if (e.track.kind === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0] || null;
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('RTCPeerConnection state:', state);
      if (state === 'connected') {
        setCallingState('connected');
        SoundManager.stopAll();
        toast.success('Call connected! 📞');
      } else if (state === 'failed' || state === 'disconnected') {
        toast.error('Call connection lost. Please try again.');
        cleanupCall();
      }
    };

    return pc;
  };

  /** Get microphone/camera stream. Returns null and shows mic warning if blocked. */
  const getMediaStream = async (video: boolean): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: video ? { width: 640, height: 480, frameRate: 24 } : false,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current && video) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.play().catch(console.warn);
      }
      return stream;
    } catch (err: any) {
      console.error('getUserMedia error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setShowMicWarningModal(true);
      } else {
        toast.error(`Microphone error: ${err.message}`);
      }
      return null;
    }
  };

  /** Stop all media tracks and close the peer connection */
  const cleanupCall = () => {
    SoundManager.stopAll();
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    // Close peer
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    // Clear video elements
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    callerSocketIdRef.current = null;
    currentCallRoomIdRef.current = null;
    setActiveCall(false);
    setCallingState('idle');
    setCallSeconds(0);
    setCallParticipants([]);
  };

  // Connect to WebRTC socket namespace for real-time calling and presence signals
  useEffect(() => {
    if (!accessToken) return;
    const s = io('/webrtc', {
      auth: { token: accessToken },
      transports: ['websocket', 'polling']
    });
    socketRef.current = s;

    s.on('connect', () => {
      console.log('Chat WebRTC socket established:', s.id);
    });

    // ── Incoming call from a teammate ──────────────────────────────────────────
    s.on('call:incoming', (data: any) => {
      console.log('Incoming call received:', data);
      // If already in a call, auto-reject
      if (activeCall) {
        s.emit('call:reject', { roomId: data.roomId, callerId: data.callerId });
        return;
      }
      const caller = otherUsers.find((u: any) => u.id === data.callerId);
      const callerName = data.callerName || caller?.fullName || 'Teammate';
      setIncomingCallData({
        roomId: data.roomId,
        callerId: data.callerId,
        callerSocketId: data.callerSocketId,
        callerName,
        callerAvatar: data.callerAvatar || caller?.avatarUrl,
        type: data.type || 'audio',
        isConference: !!data.isConference
      });
      SoundManager.playIncomingRing();
    });

    // ── Callee accepted — exchange WebRTC offer ─────────────────────────────────
    s.on('call:participant-joined', (data: any) => {
      console.log('Participant joined call:', data);
      SoundManager.stopAll();
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
      const joinedName = data.userName || otherUsers.find((u: any) => u.id === data.userId)?.fullName || 'Teammate';
      setCallParticipants(prev => prev.includes(joinedName) ? prev : [...prev, joinedName]);
      // Caller creates the WebRTC offer now that callee has joined
      callerSocketIdRef.current = data.socketId;
      if (peerRef.current && currentCallRoomIdRef.current) {
        peerRef.current.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: callType === 'video' })
          .then(async (offer) => {
            await peerRef.current!.setLocalDescription(offer);
            s.emit('webrtc:offer', { to: data.socketId, offer, roomId: currentCallRoomIdRef.current });
          }).catch(console.error);
      }
    });

    // ── WebRTC Offer received (callee side) ────────────────────────────────────
    s.on('webrtc:offer', async (data: { from: string; offer: RTCSessionDescriptionInit; roomId: string }) => {
      console.log('Received WebRTC offer from:', data.from);
      callerSocketIdRef.current = data.from;
      if (!peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);
        s.emit('webrtc:answer', { to: data.from, answer });
        setCallingState('connected');
        SoundManager.stopAll();
        toast.success('Call connected! 📞');
      } catch (err) { console.error('Error handling offer:', err); }
    });

    // ── WebRTC Answer received (caller side) ───────────────────────────────────
    s.on('webrtc:answer', async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      console.log('Received WebRTC answer from:', data.from);
      if (!peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (err) { console.error('Error handling answer:', err); }
    });

    // ── ICE Candidate exchange ─────────────────────────────────────────────────
    s.on('webrtc:ice-candidate', async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      if (!peerRef.current) return;
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) { console.error('Error adding ICE candidate:', err); }
    });

    // ── Call was rejected ──────────────────────────────────────────────────────
    s.on('call:rejected', () => {
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
      SoundManager.playBusyTone();
      cleanupCall();
      toast.error('Call declined 📵');
    });

    // ── Callee offline ─────────────────────────────────────────────────────────
    s.on('call:unavailable', (data: any) => {
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
      SoundManager.stopAll();
      cleanupCall();
      toast.error(`${data?.calleeName || 'Teammate'} is offline ⚠️`);
    });

    // ── Participant left active call ───────────────────────────────────────────
    s.on('call:participant-left', (data: any) => {
      const leftName = otherUsers.find((u: any) => u.id === data.userId)?.fullName || 'Teammate';
      setCallParticipants(prev => prev.filter(n => n !== leftName));
      toast(`${leftName} left the call.`);
      // If no participants remain and we were connected, end the call
      setCallParticipants(prev => {
        if (prev.length <= 1) {
          SoundManager.playCallEnd();
          cleanupCall();
          toast.error('Call ended — all participants left');
        }
        return prev.filter(n => n !== leftName);
      });
    });

    // ── Missed call notification ───────────────────────────────────────────────
    s.on('call:missed', (data: any) => {
      console.log('Missed call from:', data);
      SoundManager.stopAll();
      setIncomingCallData(null);
      const mc: MissedCall = {
        id: `missed-${Date.now()}`,
        callerName: data.callerName || 'Teammate',
        callerAvatar: data.callerAvatar,
        type: data.type || 'audio',
        timestamp: data.timestamp || new Date().toISOString(),
        isOutgoing: false,
      };
      setMissedCalls(prev => [mc, ...prev]);
      toast(`📞 Missed ${data.type === 'video' ? 'video' : 'voice'} call from ${data.callerName || 'Teammate'}`);
    });

    // ── Presence updates ───────────────────────────────────────────────────────
    s.on('presence:update', (_data: { userId: string; isOnline: boolean }) => {
      // Presence handled by main chat socket; this is just for awareness
    });

    return () => {
      SoundManager.stopAll();
      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      cleanupCall();
      s.disconnect();
    };
  }, [accessToken, otherUsers]);

  // ── Initiate a call (caller side) ──────────────────────────────────────────────
  const handleCallHandshake = async (type: 'audio' | 'video', targetPartnerId?: string) => {
    const targetPartner = targetPartnerId ? otherUsers.find((u: any) => u.id === targetPartnerId) : partner;
    const targetName = targetPartner?.fullName || partnerName || activeConv?.name || 'Teammate';

    if (targetPartner && targetPartner.isOnline === false) {
      toast.error(`${targetName} is currently offline ⚠️`);
      return;
    }

    setCallType(type);
    setCallSeconds(0);
    setIsCallMuted(false);
    setIsVideoMuted(false);
    setCallingState('calling');
    setActiveCall(true);
    setCallParticipants([user?.fullName || 'Me']);

    // Get mic/camera
    const stream = await getMediaStream(type === 'video');
    if (!stream) {
      setActiveCall(false);
      setCallingState('idle');
      return;
    }

    // Create peer connection — ICE candidates sent to callee
    const calleeId = targetPartner?.id || partner?.id;
    const pc = createPeerConnection((candidate) => {
      if (callerSocketIdRef.current && socketRef.current) {
        socketRef.current.emit('webrtc:ice-candidate', { to: callerSocketIdRef.current, candidate });
      }
    });

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Play outgoing ringback tone (caller hears "ring ring")
    SoundManager.playRingback();

    // Signal the server
    if (socketRef.current && calleeId) {
      socketRef.current.emit('call:initiate', {
        calleeId,
        type,
        callerName: user?.fullName || 'Teammate',
        callerAvatar: user?.avatarUrl,
        callerRole: user?.role?.name
      }, (res: any) => {
        if (res && res.roomId) {
          currentCallRoomIdRef.current = res.roomId;
        }
      });
    }

    toast(`📞 Calling ${targetName}...`);

    // 35-second unanswered timeout → emit call:cancel → callee gets missed call
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = setTimeout(() => {
      SoundManager.stopAll();
      if (socketRef.current && currentCallRoomIdRef.current && calleeId) {
        socketRef.current.emit('call:cancel', {
          calleeId,
          roomId: currentCallRoomIdRef.current,
          callerName: user?.fullName || 'Teammate',
          type,
        });
        socketRef.current.emit('call:leave', { roomId: currentCallRoomIdRef.current });
      }
      // Add to local outgoing missed calls list
      const mc: MissedCall = {
        id: `missed-out-${Date.now()}`,
        callerName: targetName,
        type,
        timestamp: new Date().toISOString(),
        isOutgoing: true,
      };
      setMissedCalls(prev => [mc, ...prev]);
      cleanupCall();
      toast.error(`No answer from ${targetName} ⏱️`);
    }, 35000);
  };

  // ── Accept incoming call (callee side) ─────────────────────────────────────────
  const acceptIncomingCall = async () => {
    if (!incomingCallData) return;
    SoundManager.stopAll();

    const roomId = incomingCallData.roomId;
    currentCallRoomIdRef.current = roomId;
    const callTypeLocal = incomingCallData.type;
    setCallType(callTypeLocal);
    setCallSeconds(0);
    setIsCallMuted(false);
    setIsVideoMuted(false);
    setActiveCall(true);
    setCallingState('calling'); // will switch to 'connected' after ICE
    setCallParticipants([incomingCallData.callerName, user?.fullName || 'Me']);

    // Get mic/camera
    const stream = await getMediaStream(callTypeLocal === 'video');
    if (!stream) {
      setActiveCall(false);
      setCallingState('idle');
      setIncomingCallData(null);
      return;
    }

    // Create peer connection — ICE candidates sent back to caller
    const pc = createPeerConnection((candidate) => {
      if (callerSocketIdRef.current && socketRef.current) {
        socketRef.current.emit('webrtc:ice-candidate', { to: callerSocketIdRef.current, candidate });
      }
    });

    // Store caller socket ID for offer/answer routing
    if (incomingCallData.callerSocketId) {
      callerSocketIdRef.current = incomingCallData.callerSocketId;
    }

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Join the room (this triggers call:participant-joined on caller who then sends offer)
    if (socketRef.current) {
      socketRef.current.emit('call:join', { roomId, userName: user?.fullName || 'Teammate' });
    }
    setIncomingCallData(null);
  };

  // ── Decline incoming call ───────────────────────────────────────────────────────
  const declineIncomingCall = () => {
    if (!incomingCallData) return;
    SoundManager.playBusyTone();

    if (socketRef.current) {
      socketRef.current.emit('call:reject', {
        roomId: incomingCallData.roomId,
        callerId: incomingCallData.callerId
      });
      socketRef.current.emit('call:leave', { roomId: incomingCallData.roomId });
    }
    setIncomingCallData(null);
  };

  // ── End active call ─────────────────────────────────────────────────────────────
  const endActiveCall = () => {
    SoundManager.playCallEnd();
    if (socketRef.current && currentCallRoomIdRef.current) {
      socketRef.current.emit('call:leave', { roomId: currentCallRoomIdRef.current });
    }
    cleanupCall();
    toast('Call ended.');
  };

  // ── Toggle mic mute ─────────────────────────────────────────────────────────────
  const toggleCallMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(t => { t.enabled = isCallMuted; }); // toggle
    }
    setIsCallMuted(m => !m);
    toast(isCallMuted ? 'Microphone unmuted 🎤' : 'Microphone muted 🔇');
  };

  // ── Toggle video ────────────────────────────────────────────────────────────────
  const toggleVideoMute = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(t => { t.enabled = isVideoMuted; });
    }
    setIsVideoMuted(v => !v);
  };

  // ── Conference invite ───────────────────────────────────────────────────────────
  const inviteTeammateToConference = (targetUser: any) => {
    if (!targetUser || !currentCallRoomIdRef.current) {
      toast.error('No active call room to invite to.');
      return;
    }
    if (socketRef.current) {
      socketRef.current.emit('call:initiate', {
        calleeId: targetUser.id,
        roomId: currentCallRoomIdRef.current,
        type: callType,
        callerName: user?.fullName || 'Teammate',
        isConference: true
      });
      toast.success(`Invited ${targetUser.fullName} to conference call! 👥`);
      setShowConferenceModal(false);
    }
  };

  const formatCallDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Active call duration timer
  useEffect(() => {
    if (activeCall && callingState === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallSeconds(s => s + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [activeCall, callingState]);



  const filteredConvs = conversations.filter((c: any) => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    
    if (activeFilter === 'channels') return c.type === 'channel' || c.type === 'department';
    if (activeFilter === 'dms') return c.type === 'private';
    if (activeFilter === 'groups') return c.type === 'group';
    if (activeFilter === 'online') {
      if (c.type !== 'private') return false;
      const otherUserName = c.name?.replace('DM with ', '').trim().toLowerCase();
      const isOnline = otherUsers.find((u: any) => u.fullName?.toLowerCase() === otherUserName)?.isOnline;
      return !!isOnline;
    }
    return true;
  });

  const sortedFilteredConvs = [...filteredConvs].sort((a: any, b: any) => {
    const isOnline = (c: any) => {
      if (c.type !== 'private') return false;
      const partnerName = c.name?.replace('DM with ', '').trim().toLowerCase();
      const partner = otherUsers.find((u: any) => u.fullName?.toLowerCase() === partnerName || u.loginId?.toLowerCase() === partnerName);
      return partner ? partner.isOnline : false;
    };

    const aOnline = isOnline(a);
    const bOnline = isOnline(b);

    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;

    const dateA = new Date(a.last_message_at || a.created_at || a.createdAt || 0).getTime();
    const dateB = new Date(b.last_message_at || b.created_at || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const deduplicatedSortedConvs = (() => {
    const seenPartners = new Set<string>();
    const result = [];
    for (const c of sortedFilteredConvs) {
      if (c.type === 'private') {
        const partnerName = c.name?.replace('DM with ', '').trim().toLowerCase();
        if (partnerName) {
          if (seenPartners.has(partnerName)) {
            continue;
          }
          seenPartners.add(partnerName);
        }
      }
      result.push(c);
    }
    return result;
  })();
  
  const displayedTeammates = otherUsers
    .filter((u: any) => {
      if (activeFilter === 'online' && !u.isOnline) return false;
      return u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.loginId?.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a: any, b: any) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.fullName?.localeCompare(b.fullName || '');
    });
  
  const displayedBookmarks = bookmarks.filter((b: any) => {
    return b.favoriteName?.toLowerCase().includes(search.toLowerCase()) || b.fileName?.toLowerCase().includes(search.toLowerCase());
  });

  const activeConv = conversations.find((c: any) => c.id === conversationId) || (conversationId ? {
    id: conversationId,
    type: 'private',
    name: 'Loading Chat...',
    description: 'Direct secure handshake channel',
  } : null);
  const partner = activeConv?.type === 'private' 
    ? (activeConv.members?.find((m: any) => m.id !== user?.id) || 
       otherUsers.find((u: any) => {
         const pName = activeConv.name?.replace('DM with ', '');
         return u.fullName?.toLowerCase() === pName?.toLowerCase() || u.loginId?.toLowerCase() === pName?.toLowerCase();
       })) 
    : null;
  const partnerName = partner?.fullName || activeConv?.name?.replace('DM with ', '');
  const handshakeRequired = activeConv?.type === 'private' && partner && (partner as any).departmentId !== (user as any)?.departmentId && (partner as any).department_id !== (user as any)?.department_id && !approvedHandshakes.includes((partner as any).id);
  
  let sortedMessages = [...messages].sort((a: any, b: any) => {
    const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
    const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
    return timeA - timeB;
  });
  if (clearTimestamp) {
    sortedMessages = sortedMessages.filter((m: any) => {
      const msgTime = new Date(m.created_at || m.createdAt || 0).getTime();
      return msgTime > clearTimestamp;
    });
  }
  sortedMessages = sortedMessages.filter((msg: any) => !blockedUsers.includes(msg.sender_id));
  sortedMessages = [...sortedMessages, ...sendingMessages];
  if (fileSearch.trim() || fileCategory !== 'all') {
    const query = fileSearch.toLowerCase();
    sortedMessages = sortedMessages.filter((m: any) => {
      if (m.type === 'text' || m.type === undefined) return false;

      if (fileCategory !== 'all') {
        const name = (m.file_name || m.fileName || '').toLowerCase();
        if (fileCategory === 'image') {
          if (m.type !== 'photo' && m.type !== 'video' && m.type !== 'music') return false;
        } else if (fileCategory === 'doc') {
          if (m.type !== 'file' || !(name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.txt') || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv'))) return false;
        } else if (fileCategory === 'zip') {
          if (m.type !== 'file' || !(name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.tar') || name.endsWith('.gz') || name.endsWith('.7z'))) return false;
        } else if (fileCategory === 'folder') {
          if (m.type !== 'folder') return false;
        }
      }

      if (query) {
        return (
          m.content?.toLowerCase().includes(query) || 
          m.type?.toLowerCase().includes(query) ||
          m.file_name?.toLowerCase().includes(query) ||
          m.fileName?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }

  const allMessageIds = sortedMessages.map((m: any) => m.id).filter(Boolean);
  const isAllSelected = allMessageIds.length > 0 && allMessageIds.every(id => selectedMessages.includes(id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(allMessageIds);
    }
  };

  const copySelectedText = () => {
    const textToCopy = sortedMessages
      .filter((m: any) => selectedMessages.includes(m.id))
      .map((m: any) => `[${formatTime(m.created_at || m.createdAt)}] ${m.sender?.fullName || 'Teammate'}: ${m.content || ''}`)
      .join('\n');
    const success = copyTextToClipboard(textToCopy);
    if (success) {
      toast.success('Selected messages copied to clipboard! 📋');
    } else {
      toast.error('Failed to copy messages.');
    }
  };

  const deleteSelectedMessages = async () => {
    setConfirmModal({
      title: 'Delete Selected Messages',
      message: `Are you sure you want to delete these ${selectedMessages.length} messages permanently?`,
      onConfirm: async () => {
        try {
          await Promise.all(selectedMessages.map(id => deleteMessageMutation.mutateAsync(id)));
          setSelectedMessages([]);
          setIsSelectionMode(false);
          toast.success('Selected messages deleted.');
        } catch (err) {
          toast.error('Some messages could not be deleted.');
        }
      }
    });
  };

  const handleBulkForwardClick = () => {
    const selectedMsgs = sortedMessages.filter((m: any) => selectedMessages.includes(m.id));
    setForwardingMsgsList(selectedMsgs);
    setForwardingMsg(selectedMsgs[0]);
  };

  const handleForwardMessage = async () => {
    if ((!forwardingMsg && forwardingMsgsList.length === 0) || forwardTargets.length === 0) return;
    try {
      const msgsToForward = forwardingMsgsList.length > 0 ? forwardingMsgsList : [forwardingMsg];
      await Promise.all(
        forwardTargets.flatMap(targetId =>
          msgsToForward.map(msg =>
            chatApi.sendMessage(targetId, {
              content: `➡️ Forwarded Signal: ${msg.content || ''}`,
              type: msg.type || 'text',
              fileId: msg.file_id || msg.fileId,
              fileName: msg.file_name || msg.fileName,
              fileUrl: msg.file_url || msg.fileUrl,
              fileSize: msg.file_size || msg.fileSize,
              mimeType: msg.mime_type || msg.mimeType
            })
          )
        )
      );
      toast.success(`Messages forwarded securely to ${forwardTargets.length} node(s) 🚀`);
    } catch (e) {
      toast.error(`Partial forwarding failure. Some nodes unreachable.`);
    }
    setForwardingMsg(null);
    setForwardingMsgsList([]);
    setForwardTargets([]);
    setSelectedMessages([]);
    setIsSelectionMode(false);
  };

  // Bytes Formatter helper
  const formatBytes = (bytes: any) => {
    const num = Number(bytes);
    if (isNaN(num) || num <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return `${(num / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Filter mentionable users
  const filteredMentionUsers = otherUsers.filter((u: any) =>
    u.fullName.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const formatRecordTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Text URL Link highlight parser
  const renderMessageContent = (text: string) => {
    if (!text) return '';
    // Use anchored regexes for per-word tests to avoid global flag test bugs
    const urlRegex = /^https?:\/\/[^\s]+$/;
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+$/;
    const phoneRegex = /^\+?\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{4}$/;

    const parts = text.split(/(\s+)/);
    return parts.map((part, idx) => {
      if (urlRegex.test(part)) {
        return (
          <a key={idx} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'underline', fontWeight: 600 }}>
            {part}
          </a>
        );
      }
      if (emailRegex.test(part)) {
        return (
          <a 
            key={idx} 
            href={`mailto:${part}`} 
            style={{ color: 'var(--brand-primary)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
            onClick={(e) => {
              e.preventDefault();
              setConfirmModal({
                title: 'Compose Email',
                message: `Would you like to compose an email to ${part} using GSV Office Mail or your default external email app?`,
                onConfirm: () => {
                  navigate(`/email?compose=${encodeURIComponent(part)}`);
                },
                onCancel: () => {
                  window.open(`mailto:${part}`, '_self');
                },
                confirmText: 'GSV Office Mail',
                cancelText: 'External App',
                iconType: 'info',
                brandColor: 'var(--brand-primary)'
              });
            }}
          >
            {part}
          </a>
        );
      }
      if (phoneRegex.test(part)) {
        return (
          <a key={idx} href={`tel:${part}`} style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className={`${styles.chatLayout} ${conversationId && activeConv ? styles.chatOpen : ''}`} style={{ animation: 'slideUp 0.3s ease', position: 'relative' }}>
      
      {chatSidebarCollapsed && (!conversationId || !activeConv) && (
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setChatSidebarCollapsed(false)}
          style={{
            position: 'absolute',
            left: '16px',
            top: '16px',
            zIndex: 100,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Expand Conversation List"
        >
          <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
      )}

      {/* Message Forwarding Selection Dialog */}
      {forwardingMsg && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card card-body" style={{ width: '360px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowRight size={16} style={{ color: 'var(--brand-primary)' }} /> Forward Message
            </h3>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Choose a secure conversation node to forward the signal content</p>
            
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 0' }}>
              {conversations.map((c: any) => {
                const isSelected = forwardTargets.includes(c.id);
                return (
                  <div
                    key={c.id}
                    className="dropdown-item hover-glass"
                    onClick={() => {
                      if (isSelected) setForwardTargets(prev => prev.filter(id => id !== c.id));
                      else setForwardTargets(prev => [...prev, c.id]);
                    }}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent', border: `1px solid ${isSelected ? 'rgba(99, 102, 241, 0.3)' : 'transparent'}`, transition: 'all 0.15s' }}
                  >
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `1.5px solid ${isSelected ? '#6366f1' : 'var(--border-color)'}`, background: isSelected ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {isSelected && <Check size={12} style={{ color: '#fff' }} />}
                    </div>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--brand-primary)', border: '1px solid var(--border-color)' }}>
                      {c.type === 'private' ? <Users2 size={14} /> : <Hash size={14} />}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{forwardTargets.length} selected</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost" onClick={() => { setForwardingMsg(null); setForwardTargets([]); }}>Cancel</button>
                <button className="btn btn-primary" disabled={forwardTargets.length === 0} onClick={handleForwardMessage}>Forward</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / File Preview Modal */}
      {previewFile && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPreviewFile(null)}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {previewFile.type === 'photo' ? <Image size={20} /> : previewFile.type === 'video' ? <Video size={20} /> : <File size={20} />}
              <span style={{ fontSize: '15px', fontWeight: 600 }}>{previewFile.name}</span>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); handleShareFile({ fileUrl: previewFile.url, fileName: previewFile.name }); }} title="Share Link">
                <Send size={18} />
              </button>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); setForwardingMsg({ fileUrl: previewFile.url, fileName: previewFile.name, type: previewFile.type === 'photo' ? 'photo' : previewFile.type === 'video' ? 'video' : 'file', content: `Shared file: ${previewFile.name}` }); setPreviewFile(null); }} title="Forward File">
                <ArrowRight size={18} />
              </button>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); handleSaveToPC(previewFile.name, '', previewFile.url); }} title="Download">
                <Download size={20} />
              </button>
              <button style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPreviewFile(null)} title="Close">
                <X size={22} />
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 40px 40px 40px' }} onClick={() => setPreviewFile(null)}>
            {(() => {
              const ext = previewFile.name.split('.').pop()?.toLowerCase() || '';
              const isText = ['json', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'html', 'css', 'txt', 'md', 'xml', 'yaml', 'yml', 'sh', 'bat', 'ini', 'log'].includes(ext);
              if (previewFile.type === 'photo') {
                return <img src={previewFile.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} alt={previewFile.name} onClick={(e) => e.stopPropagation()} />;
              } else if (previewFile.type === 'video') {
                return <video src={previewFile.url} controls style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()} autoPlay />;
              } else if (previewFile.type === 'pdf') {
                return (
                  <div style={{ width: '90%', height: '85%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
                    <iframe src={previewFile.url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: '#fff' }} title={previewFile.name}></iframe>
                  </div>
                );
              } else if (isText) {
                return (
                  <div style={{ width: '90%', height: '85%', background: '#1e1e1e', borderRadius: '8px', padding: '20px', overflow: 'auto', border: '1px solid #333', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
                    {loadingTextContent ? (
                      <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        Loading file content...
                      </div>
                    ) : (
                      <pre style={{ margin: 0, color: '#d4d4d4', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {previewTextContent}
                      </pre>
                    )}
                  </div>
                );
              } else {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', color: '#fff' }} onClick={(e) => e.stopPropagation()}>
                    <File size={80} style={{ color: 'var(--wa-accent)', opacity: 0.8 }} />
                    <div style={{ fontSize: '16px' }}>No preview available for this file type.</div>
                    <button className="btn btn-primary" onClick={() => handleSaveToPC(previewFile.name, '', previewFile.url)}>
                      <Download size={16} /> Download File
                    </button>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${styles.convSidebar} ${chatSidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.convHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className={`btn btn-ghost btn-icon btn-sm ${styles.mobileOnly}`}
              onClick={() => setMobileSidebarOpen && setMobileSidebarOpen(true)}
              style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              title="Open Navigation Menu"
            >
              <Menu size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <button
              className={`btn btn-ghost btn-icon btn-sm ${styles.desktopOnly}`}
              onClick={() => setChatSidebarCollapsed(true)}
              style={{ width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              title="Collapse Conversation List"
            >
              <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <h2 className={styles.convTitle} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} style={{ color: 'var(--brand-primary)' }} />
              Node Matrix
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className="btn btn-ghost btn-sm btn-icon" 
              onClick={markAllChatsRead} 
              title="Mark all chats as read"
              style={{ width: '32px', height: '32px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <CheckCheck size={16} />
            </button>
            <button className="btn btn-primary btn-sm btn-icon" onClick={() => setShowCreateGroup(true)} title="Create group channel" style={{ width: '32px', height: '32px' }}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px' }}>
          <div className="search-bar">
            <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search rooms..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSidebarSearchSubmit}
              className="form-control"
              style={{ paddingLeft: '36px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Main top-level navigation tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--wa-border)', background: 'var(--wa-header)' }}>
          {[
            { key: 'chats', label: 'Chats', icon: <MessageSquare size={14} /> },
            { key: 'teammates', label: 'Teammates', icon: <Users2 size={14} /> },
            { key: 'bookmarks', label: 'Bookmarks', icon: <Pin size={14} /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveMainTab(tab.key as any);
                if (tab.key === 'chats') {
                  setActiveFilter('all');
                }
              }}
              style={{
                flex: 1,
                padding: '12px 6px',
                fontSize: '12px',
                fontWeight: 700,
                color: activeMainTab === tab.key ? 'var(--wa-accent)' : 'var(--wa-text-secondary)',
                borderBottom: activeMainTab === tab.key ? '3px solid var(--wa-accent)' : '3px solid transparent',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Filters Single Draggable Row (Only for Chats tab) */}
        {activeMainTab === 'chats' && (
          <DraggableRow className={styles.filterScrollContainer}>
            {[
              { key: 'all', label: 'All' },
              { key: 'dms', label: 'DMs' },
              { key: 'groups', label: 'Groups' },
              { key: 'channels', label: 'Channels' },
              { key: 'online', label: 'Online' }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveFilter(t.key as any)}
                className={`${styles.filterPill} ${activeFilter === t.key ? styles.filterPillActive : ''}`}
              >
                {t.label}
              </button>
            ))}
          </DraggableRow>
        )}

        {/* Scrollable Wrapper for the active sidebar section */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeMainTab === 'chats' && (
            <div className={`${styles.sidebarSection} ${styles.activeConversationsSection}`} style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0, borderBottom: 'none', padding: '4px 0' }}>
              <div className={styles.convList} style={{ overflowY: 'auto', flex: 1 }}>
                {deduplicatedSortedConvs.length === 0 ? (
                  <div className={styles.emptyConvs}>
                    <MessageSquare size={36} />
                    <p>No active conversations matching filter</p>
                  </div>
                ) : (
                  deduplicatedSortedConvs.map((conv: any) => (
                    <div
                      key={conv.id}
                      className={`${styles.convItem} ${conv.id === conversationId ? styles.active : ''}`}
                      onClick={() => navigate(`/chat/${conv.id}`)}
                      style={{
                        borderRadius: '8px', margin: '4px 8px', padding: '8px 12px',
                        borderLeft: conv.id === conversationId ? '4px solid #6366f1' : '4px solid transparent'
                      }}
                    >
                      <div className={`${styles.convAvatar} ${conv.type === 'group' || conv.type === 'department' || conv.type === 'broadcast' ? styles.groupAvatar : ''}`} style={{ background: 'var(--gradient-brand)' }}>
                        {conv.type === 'group' || conv.type === 'department' || conv.type === 'broadcast' ? (
                          conv.type === 'broadcast' ? <Users2 size={16} /> : <Hash size={16} />
                        ) : (
                          (() => {
                            const other = conv.members?.find((m: any) => m.id !== user?.id);
                            const displayName = other ? other.fullName : conv.name;
                            return displayName?.charAt(0).toUpperCase() || 'U';
                          })()
                        )}
                      </div>
                      <div className={styles.convMeta}>
                        <div className={styles.convName}>
                          <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                            {(() => {
                              if (conv.type === 'private') {
                                const other = conv.members?.find((m: any) => m.id !== user?.id);
                                return other ? other.fullName : (conv.name || 'Secure DM');
                              }
                              return conv.name || 'Secure Group';
                            })()}
                          </span>
                          {conv.last_message_at && (
                            <span className={styles.convTime}>
                              {(() => {
                                const date = new Date(conv.last_message_at);
                                const today = new Date();
                                if (date.toDateString() === today.toDateString()) {
                                  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                              })()}
                            </span>
                          )}
                        </div>
                        <div className={styles.convPreview}>
                          <span>{conv.last_message_preview || 'Ready to resonance.'}</span>
                          {(Number(conv.unread_count) || 0) > 0 && (
                            <span className={styles.unreadBadge}>
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeMainTab === 'teammates' && (
            <div className={`${styles.sidebarSection} ${styles.teammatesSection}`} style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0, borderBottom: 'none', padding: '4px 0' }}>
              <div className={styles.sectionHeader}>
                👥 Teammate Directories DMs
              </div>
              <div className={styles.sectionList} style={{ overflowY: 'auto', flex: 1, padding: '0 8px' }}>
                {displayedTeammates.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--wa-text-secondary)', padding: '16px', textAlign: 'center' }}>No teammates matching search</div>
                ) : (
                  (() => {
                    const onlineUsers = displayedTeammates.filter((u: any) => u.isOnline);
                    const offlineUsers = displayedTeammates.filter((u: any) => !u.isOnline);
                    
                    const renderTeammate = (u: any) => (
                      <div
                        key={u.id}
                        onClick={() => startDM(u)}
                        className={styles.teammateRow}
                      >
                        <div className={styles.teammateAvatar}>
                          {initials(u.fullName)}
                          {u.isOnline && (
                            <span className={styles.statusDot} />
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.fullName}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{u.isOnline ? '🟢 Online' : '⚪ Offline'}</span>
                        </div>
                      </div>
                    );

                    return (
                      <>
                        {onlineUsers.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 750, color: 'var(--brand-success)', padding: '6px 8px', letterSpacing: '0.5px' }}>🟢 ONLINE ({onlineUsers.length})</div>
                            {onlineUsers.map(renderTeammate)}
                          </div>
                        )}
                        {offlineUsers.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 750, color: 'var(--text-tertiary)', padding: '6px 8px', letterSpacing: '0.5px' }}>⚪ OFFLINE ({offlineUsers.length})</div>
                            {offlineUsers.map(renderTeammate)}
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {activeMainTab === 'bookmarks' && (
            <div className={`${styles.sidebarSection} ${styles.bookmarksSection}`} style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0, borderBottom: 'none', padding: '4px 0' }}>
              <div className={styles.sectionHeader}>
                <span>🔖 Bookmarked Files</span>
                <span className="badge badge-primary" style={{ fontSize: '9px', padding: '1px 4px' }}>{bookmarks.length}</span>
              </div>
              <div className={styles.sectionList} style={{ overflowY: 'auto', flex: 1, padding: '0 8px' }}>
                {displayedBookmarks.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--wa-text-secondary)', padding: '16px', textAlign: 'center' }}>No bookmarked files matching search</div>
                ) : (
                  displayedBookmarks.map((b: any) => (
                    <div key={b.id} className={styles.bookmarkRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        {b.type === 'folder' ? <Folder size={12} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} /> : <File size={12} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />}
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.favoriteName}>
                          {b.favoriteName}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span onClick={() => handleSaveToPC(b.fileName)} title="Download" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                          <Download size={12} style={{ color: 'var(--brand-primary)' }} />
                        </span>
                        <span onClick={() => handleRemoveBookmark(b.id)} title="Remove Bookmark" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                          <X size={12} style={{ color: 'var(--brand-danger)' }} />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Arena */}
      {conversationId && activeConv ? (
        <div className={styles.chatMain}>
          {/* Sticky Pinned Message Banner */}
          {pinnedMessage && (
            <div style={{
              background: 'var(--bg-secondary)',
              borderBottom: '1.5px solid var(--border-color)',
              backdropFilter: 'blur(8px)',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 10
            }} className="animate-slide-down">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <Pin size={14} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brand-primary)', flexShrink: 0 }}>Pinned Message:</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pinnedMessage.content}
                </span>
              </div>
              <button
                onClick={() => setPinnedMessage(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
              >
                ✕ Unpin
              </button>
            </div>
          )}

          {/* Header */}
          <div className={styles.chatHeader} style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
            <div className={styles.chatHeaderInfo}>
              {/* Mobile Back Button to Conversation List */}
              <button 
                className={`btn btn-ghost btn-icon ${styles.mobileBackBtn}`}
                onClick={() => navigate('/chat')}
                title="Back to Conversations"
              >
                <ArrowLeft size={22} strokeWidth={2.6} style={{ color: 'var(--brand-primary)' }} />
              </button>
              <button 
                className={`btn btn-ghost btn-icon ${styles.desktopOnly}`} 
                onClick={() => setSidebarCollapsed && setSidebarCollapsed(!sidebarCollapsed)}
                style={{ marginRight: '8px' }}
                title="Toggle Sidebar"
              >
                <Menu size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button 
                className={`btn btn-ghost btn-icon ${styles.desktopOnly}`} 
                onClick={() => setChatSidebarCollapsed(!chatSidebarCollapsed)}
                style={{ marginRight: '8px' }}
                title={chatSidebarCollapsed ? "Expand Conversation List" : "Collapse Conversation List"}
              >
                {chatSidebarCollapsed ? <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-secondary)', transform: 'rotate(180deg)' }} />}
              </button>
              <div className={styles.convAvatar} style={{ background: 'var(--gradient-brand)', cursor: 'pointer' }} onClick={() => setShowGroupDetails(!showGroupDetails)}>
                {activeConv.type === 'group' || activeConv.type === 'department' ? (
                  <Hash size={16} />
                ) : (
                  (partnerName?.charAt(0).toUpperCase() || 'U')
                )}
              </div>
              <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => setShowGroupDetails(!showGroupDetails)}>
                <div className={styles.chatName}>
                  {activeConv.type === 'private' ? partnerName : (activeConv.name || 'Secure Group')}
                </div>
                <div className={styles.chatStatus}>
                  {activeConv.type === 'private' ? (
                    (() => {
                      const isOnline = partner ? partner.isOnline : false;
                      if (isOnline) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="status-dot online" style={{ width: '6px', height: '6px', background: 'var(--brand-success)' }} />
                            <span>Online</span>
                          </div>
                        );
                      } else {
                        return (
                          <span>Offline {partner?.lastSeen ? `| Last seen ${new Date(partner.lastSeen).toLocaleDateString('en-IN')}` : ''}</span>
                        );
                      }
                    })()
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="status-dot online" style={{ width: '6px', height: '6px', background: 'var(--brand-primary)' }} />
                      <span>Department Public Room</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
              {/* Desktop Quick Search & Filter */}
              <div className={styles.desktopOnly} style={{ alignItems: 'center', gap: '8px' }}>
                <select
                  value={fileCategory}
                  onChange={e => setFileCategory(e.target.value as any)}
                  className="form-control"
                  style={{
                    width: '90px',
                    height: '28px',
                    fontSize: '11px',
                    padding: '0 4px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px'
                  }}
                  title="Filter by file type"
                >
                  <option value="all">All Files</option>
                  <option value="image">Images</option>
                  <option value="doc">Docs</option>
                  <option value="zip">Zips</option>
                  <option value="folder">Folders</option>
                </select>
                <div className="search-bar" style={{ width: '150px' }}>
                  <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="🔍 Search Files..."
                    value={fileSearch}
                    onChange={e => setFileSearch(e.target.value)}
                    className="form-control"
                    style={{ paddingLeft: '28px', height: '28px', fontSize: '11px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                {activeConv?.type === 'private' && partner && (
                  <button 
                    className="btn btn-xs" 
                    onClick={() => toggleBlockUser(partner.id)} 
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      height: 'auto',
                      border: 'none',
                      borderRadius: '16px',
                      background: blockedUsers.includes(partner.id) ? 'var(--brand-success)' : 'rgba(239, 68, 68, 0.15)',
                      color: blockedUsers.includes(partner.id) ? 'white' : 'var(--brand-danger)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title={blockedUsers.includes(partner.id) ? "Unblock teammate" : "Block teammate"}
                  >
                    {blockedUsers.includes(partner.id) ? "🔓 Unblock" : "🚫 Block"}
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedMessages([]);
                  }}
                  title="Select Bulk Messages"
                  style={{ color: isSelectionMode ? 'var(--brand-primary)' : 'var(--text-secondary)' }}
                >
                  <CheckSquare size={18} />
                </button>
              </div>

              {/* Audio & Video Handshake Actions (Available on Desktop & Mobile, always working) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button 
                  className={`btn btn-ghost btn-icon btn-sm ${styles.chatHeaderBtn}`} 
                  onClick={() => handleCallHandshake('audio')} 
                  title="Audio Handshake Call"
                  style={{ width: '36px', height: '36px', color: 'var(--wa-accent)' }}
                >
                  <Phone size={19} strokeWidth={2.5} />
                </button>
                <button 
                  className={`btn btn-ghost btn-icon btn-sm ${styles.chatHeaderBtn}`} 
                  onClick={() => handleCallHandshake('video')} 
                  title="Video Resonance Call"
                  style={{ width: '36px', height: '36px', color: 'var(--brand-primary)' }}
                >
                  <Video size={19} strokeWidth={2.5} />
                </button>
              </div>

              {/* Info Button */}
              {activeConv && (
                <button
                  className={`btn btn-ghost btn-icon btn-sm ${styles.chatHeaderBtn}`}
                  onClick={() => setShowGroupDetails(!showGroupDetails)}
                  title="Conversation Info & Files"
                  style={{ width: '36px', height: '36px', color: showGroupDetails ? 'var(--brand-primary)' : 'var(--text-secondary)' }}
                >
                  <Info size={19} strokeWidth={2.5} />
                </button>
              )}

              {/* FULL "MORE OPTIONS" (⋮) BUTTON & COMPREHENSIVE DROPDOWN MENU */}
              <div style={{ position: 'relative' }}>
                <button 
                  className={`btn btn-ghost btn-icon btn-sm ${styles.chatHeaderBtn}`} 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreOptions(!showMoreOptions);
                  }} 
                  title="More Options"
                  style={{ width: '36px', height: '36px', color: showMoreOptions ? 'var(--brand-primary)' : 'var(--text-secondary)' }}
                >
                  <MoreVertical size={20} strokeWidth={2.5} />
                </button>

                {showMoreOptions && (
                  <div className={styles.moreOptionsMenu} onClick={e => e.stopPropagation()}>
                    {/* Search in Files */}
                    <button
                      type="button"
                      className={styles.moreOptionItem}
                      onClick={() => {
                        setShowFileSearchBar(!showFileSearchBar);
                        setShowMoreOptions(false);
                      }}
                    >
                      <Search size={18} strokeWidth={2.4} style={{ color: 'var(--brand-primary)' }} />
                      <span>{showFileSearchBar ? 'Hide File Search' : 'Search Files in Room'}</span>
                    </button>

                    {/* Room Info & Files */}
                    <button
                      type="button"
                      className={styles.moreOptionItem}
                      onClick={() => {
                        setShowGroupDetails(true);
                        setShowMoreOptions(false);
                      }}
                    >
                      <Info size={18} strokeWidth={2.4} style={{ color: 'var(--brand-primary)' }} />
                      <span>Conversation Info & Files</span>
                    </button>

                    {/* Bulk Selection Mode */}
                    <button
                      type="button"
                      className={styles.moreOptionItem}
                      onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        setSelectedMessages([]);
                        setShowMoreOptions(false);
                      }}
                    >
                      <CheckSquare size={18} strokeWidth={2.4} style={{ color: isSelectionMode ? 'var(--brand-primary)' : 'var(--text-secondary)' }} />
                      <span>{isSelectionMode ? 'Exit Selection Mode' : 'Select Multiple Messages'}</span>
                    </button>

                    {/* Block / Unblock Teammate (Private DM) */}
                    {activeConv?.type === 'private' && partner && (
                      <button
                        type="button"
                        className={styles.moreOptionItem}
                        onClick={() => {
                          toggleBlockUser(partner.id);
                          setShowMoreOptions(false);
                        }}
                      >
                        <AlertTriangle size={18} strokeWidth={2.4} style={{ color: blockedUsers.includes(partner.id) ? 'var(--brand-success)' : 'var(--brand-danger)' }} />
                        <span>{blockedUsers.includes(partner.id) ? '🔓 Unblock Teammate' : '🚫 Block Teammate'}</span>
                      </button>
                    )}

                    {/* Quick Note Creator */}
                    <button
                      type="button"
                      className={styles.moreOptionItem}
                      onClick={() => {
                        setShowNoteEditor(true);
                        setShowMoreOptions(false);
                      }}
                    >
                      <StickyNote size={18} strokeWidth={2.4} style={{ color: '#00a884' }} />
                      <span>Create & Send Note</span>
                    </button>

                    {/* Personal Scratchpad / Notepad */}
                    <button
                      type="button"
                      className={styles.moreOptionItem}
                      onClick={() => {
                        setShowScratchpad(true);
                        setScratchpadPos({
                          x: Math.max(10, Math.min(window.innerWidth - 350, 40)),
                          y: Math.max(10, Math.min(window.innerHeight - 420, 60))
                        });
                        setShowMoreOptions(false);
                      }}
                    >
                      <Sparkles size={18} strokeWidth={2.4} style={{ color: '#6366f1' }} />
                      <span>Personal Ideas / Scratchpad</span>
                    </button>

                    {/* Room Settings & Preferences */}
                    <button
                      type="button"
                      className={styles.moreOptionItem}
                      onClick={() => {
                        setShowRoomSettingsModal(true);
                        setShowMoreOptions(false);
                      }}
                    >
                      <Settings size={18} strokeWidth={2.4} style={{ color: 'var(--brand-primary)' }} />
                      <span>Room Settings & Preferences</span>
                    </button>

                    <div className={styles.moreOptionDivider} />

                    {/* Test Audio Handshake */}
                    <button
                      type="button"
                      className={styles.moreOptionItem}
                      onClick={() => {
                        handleCallHandshake('audio');
                        setShowMoreOptions(false);
                      }}
                    >
                      <Phone size={18} strokeWidth={2.4} style={{ color: 'var(--brand-warning)' }} />
                      <span>Test Call Handshake</span>
                    </button>

                    {/* Clear Chat History */}
                    <button
                      type="button"
                      className={styles.moreOptionItem}
                      style={{ color: 'var(--brand-danger)' }}
                      onClick={() => {
                        setShowMoreOptions(false);
                        setConfirmModal({
                          title: 'Clear Chat History',
                          message: 'Are you sure you want to clear all messages locally for this conversation?',
                          onConfirm: handleClearHistory,
                          iconType: 'trash',
                          confirmText: 'Clear Messages',
                          cancelText: 'Cancel'
                        });
                      }}
                    >
                      <Trash2 size={18} strokeWidth={2.4} style={{ color: 'var(--brand-danger)' }} />
                      <span>Clear Chat History</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expandable File Search & Filter Bar (Mobile & Desktop) */}
          {showFileSearchBar && (
            <div className={styles.searchFilterBar}>
              <div className={styles.searchFilterRow}>
                <div className="search-bar" style={{ flex: 1, position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="Search files in this chat by name or extension..."
                    value={fileSearch}
                    onChange={e => setFileSearch(e.target.value)}
                    className="form-control"
                    style={{ paddingLeft: '32px', height: '34px', fontSize: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '100%', borderRadius: '8px' }}
                    autoFocus
                  />
                  {fileSearch && (
                    <button
                      type="button"
                      onClick={() => setFileSearch('')}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon"
                  onClick={() => setShowFileSearchBar(false)}
                  title="Close Search"
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                {[
                  { val: 'all', label: 'All Files' },
                  { val: 'image', label: 'Images' },
                  { val: 'doc', label: 'Documents' },
                  { val: 'zip', label: 'Archives' },
                  { val: 'folder', label: 'Folders' }
                ].map(f => (
                  <button
                    key={f.val}
                    type="button"
                    onClick={() => setFileCategory(f.val as any)}
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-color)',
                      background: fileCategory === f.val ? 'var(--wa-accent)' : 'var(--bg-secondary)',
                      color: fileCategory === f.val ? '#fff' : 'var(--text-secondary)',
                      fontWeight: fileCategory === f.val ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages list */}
          <div className={styles.messagesArea}>
            {sortedMessages.map((msg: any, i: number) => {
              const isOwn = msg.sender_id === user?.id || msg.sender?.id === user?.id;
              const senderName = msg.sender_name || msg.sender?.fullName || 'System Teammate';
              const showAvatar = !isOwn && (i === 0 || sortedMessages[i - 1]?.sender_id !== msg.sender_id);
              const hasAttachment = msg.type !== 'text' && msg.type !== undefined;

              const reactions = messageReactions[msg.id] || [];

              return (
                <div key={msg.id || i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }} className="message-row-wrapper hover-glass">
                  {(isSelectionMode || selectedMessages.length > 0) && msg.id && (
                    <div style={{ opacity: 1, width: '24px', flexShrink: 0 }} className="message-checkbox-container">
                      <input
                        type="checkbox"
                        checked={selectedMessages.includes(msg.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMessages(prev => [...prev, msg.id]);
                          else setSelectedMessages(prev => prev.filter(id => id !== msg.id));
                        }}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </div>
                  )}
                  <div className={`${styles.messageBubbleWrapper} ${isOwn ? styles.own : ''}`} style={{ flex: 1 }}>
                    {!isOwn && showAvatar && (
                    <div className={styles.msgAvatar} style={{ background: 'var(--gradient-brand)' }}>
                      {senderName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {!isOwn && !showAvatar && <div style={{ width: '28px' }} />}
                  
                  {/* Bubble Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', position: 'relative' }}>
                    
                    {/* Message Bubble body */}
                    <div
                      className={`${styles.messageBubble} ${isOwn ? styles.ownBubble : styles.otherBubble}`}
                      style={{ 
                        border: '1px solid var(--border-color)', 
                        position: 'relative', 
                        cursor: 'context-menu',
                        padding: (msg.type === 'photo' || msg.type === 'video') ? '4px' : undefined
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const menuWidth = 240;
                        const menuHeight = 350;
                        let x = e.clientX;
                        let y = e.clientY;
                        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 16;
                        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 16;
                        if (x < 16) x = 16;
                        if (y < 16) y = 16;
                        setMsgContextMenu({
                          x,
                          y,
                          msg: msg
                        });
                      }}
                    >
                      {!isOwn && showAvatar && (
                        <div className={styles.senderName} style={{ color: 'var(--brand-primary)' }}>{senderName}</div>
                      )}
                      
                      {/* Render text with live link highlight detection */}
                      {msg.type !== 'photo' && msg.type !== 'video' && (
                        <div className={styles.messageText} style={{ lineHeight: 1.5 }}>
                          {renderMessageContent(msg.content)}
                        </div>
                      )}

                      {/* YouTube Video Inline Embed */}
                      {(() => {
                        const ytId = getYouTubeId(msg.content);
                        if (ytId) {
                          return (
                            <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--wa-border)', maxWidth: '320px', aspectRatio: '16/9' }} onClick={(e) => e.stopPropagation()}>
                              <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${ytId}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                style={{ width: '100%', height: '100%' }}
                              ></iframe>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Rich attachments */}
                      {hasAttachment && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', position: 'relative' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {msg.type === 'photo' && (msg.file_url || msg.fileUrl) && (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <div
                                    style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', maxWidth: '420px', cursor: 'zoom-in', position: 'relative' }}
                                    onClick={() => setPreviewFile({ url: msg.file_url || msg.fileUrl, name: msg.file_name || msg.fileName || 'photo.jpg', type: 'photo' })}
                                    onDoubleClick={(e) => { e.stopPropagation(); window.open(msg.file_url || msg.fileUrl, '_blank'); }}
                                  >
                                    <img
                                      src={msg.file_url || msg.fileUrl}
                                      alt={msg.file_name || msg.fileName || 'photo'}
                                      style={{ width: '100%', height: 'auto', display: 'block', minHeight: '60px', background: 'var(--bg-secondary)', maxHeight: '360px', objectFit: 'cover' }}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                      }}
                                    />
                                    <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', gap: '8px', color: 'var(--text-secondary)', background: 'var(--wa-bg)', borderRadius: '8px', border: '1px solid var(--wa-border)', minWidth: '200px' }}>
                                      <Image size={24} style={{ color: 'var(--brand-primary)' }} />
                                      <span style={{ fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={msg.file_name || msg.fileName}>{msg.file_name || msg.fileName || 'Image preview unavailable'}</span>
                                      <a href={msg.file_url || msg.fileUrl} download={msg.file_name || msg.fileName} style={{ fontSize: '10px', color: 'var(--brand-primary)', textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>Download Image</a>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: '4px', right: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', padding: '1px 5px' }}>{msg.file_name || msg.fileName || ''}</div>
                                  </div>
                                  {msg.content && (
                                    <div style={{ padding: '6px 8px 2px 8px', fontSize: '15px', color: 'inherit', wordBreak: 'break-word' }}>
                                      {renderMessageContent(msg.content)}
                                    </div>
                                  )}
                                </div>
                              )}
                              {msg.type === 'video' && (msg.file_url || msg.fileUrl) && (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', maxWidth: '420px', position: 'relative' }}>
                                    <video controls preload="metadata" style={{ width: '100%', display: 'block', maxHeight: '240px', objectFit: 'contain', background: '#000' }}>
                                      <source src={msg.file_url || msg.fileUrl} type={msg.mime_type || msg.mimeType || 'video/mp4'} />
                                      Your browser does not support the video tag.
                                    </video>
                                  </div>
                                  {msg.content && (
                                    <div style={{ padding: '6px 8px 2px 8px', fontSize: '15px', color: 'inherit', wordBreak: 'break-word' }}>
                                      {renderMessageContent(msg.content)}
                                    </div>
                                  )}
                                </div>
                              )}
                              {msg.type === 'music' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-card)', borderRadius: '8px', padding: '8px', border: '1px solid var(--border-color)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <Volume2 size={16} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.file_name || msg.fileName || "Voice_Note.webm"}</div>
                                      <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>{formatBytes(msg.file_size || msg.fileSize || 0)} — Voice Note</div>
                                    </div>
                                  </div>
                                  {msg.file_url || msg.fileUrl ? (
                                    <audio controls src={msg.file_url || msg.fileUrl} style={{ width: '100%', marginTop: '4px', height: '40px' }} />
                                  ) : (
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Audio file loading...</div>
                                  )}
                                </div>
                              )}
                              {msg.type === 'file' && (
                                <div style={{
                                  background: 'var(--wa-bg)', borderRadius: '8px', padding: '8px 12px',
                                  display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '280px',
                                  border: '1px solid var(--wa-border)', cursor: 'pointer'
                                }} className="hover-glass" 
                                onClick={() => {
                                  const fName = msg.file_name || msg.fileName || "document";
                                  const pType = fName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'file';
                                  setPreviewFile({ url: msg.file_url || msg.fileUrl || "#", name: fName, type: pType });
                                }}
                                onDoubleClick={() => {
                                  const fName = msg.file_name || msg.fileName || "document";
                                  const pType = fName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'file';
                                  setPreviewFile({ url: msg.file_url || msg.fileUrl || "#", name: fName, type: pType });
                                }}>
                                  {getFileIcon(msg.file_name || msg.fileName || "document")}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--wa-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.file_name || msg.fileName || "document"}</div>
                                    <span style={{ fontSize: '9px', color: 'var(--wa-text-secondary)' }}>{formatBytes(msg.file_size || msg.fileSize || 0)} — Document</span>
                                  </div>
                                </div>
                              )}
                              {msg.type === 'folder' && (
                                <div 
                                  style={{
                                    background: 'var(--wa-bg)', borderRadius: '12px', padding: '12px',
                                    display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '280px',
                                    border: '1.5px solid rgba(0, 168, 132, 0.25)', boxShadow: '0 4px 12px rgba(0, 168, 132, 0.05)',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--wa-border)', paddingBottom: '6px' }}>
                                    <Folder size={18} style={{ color: 'var(--wa-accent)', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--wa-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.file_name || msg.fileName || "Uploaded_Folder/"}</div>
                                      <div style={{ fontSize: '9px', color: 'var(--wa-text-secondary)' }}>Shared Folder Workspace</div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                    {(() => {
                                      const fid = msg.folder_id || msg.folderId || msg.file_id || msg.fileId;
                                      return (
                                        <>
                                          <button
                                            type="button"
                                            className="btn btn-primary btn-xs"
                                            style={{ flex: 1, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px 8px' }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (fid) {
                                                window.open(`/api/files/folders/${fid}/download`, '_blank');
                                              } else {
                                                toast.error('Folder ID not available for download');
                                              }
                                            }}
                                            title="Download entire folder as a single .ZIP archive"
                                          >
                                            <Download size={12} /> Download ZIP
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-ghost btn-xs"
                                            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', border: '1px solid var(--wa-border)' }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (fid) {
                                                navigate(`/files?folderId=${fid}`);
                                              } else {
                                                toast.error('Folder ID not available');
                                              }
                                            }}
                                            title="Open folder in Cloud Files explorer"
                                          >
                                            <Folder size={12} /> View
                                          </button>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              )}
                              {(msg.type === 'smb_folder' || msg.metadata?.isSmb) && (
                                <div 
                                  style={{
                                    background: 'linear-gradient(135deg, rgba(0, 168, 132, 0.08), rgba(0, 92, 75, 0.12))',
                                    borderRadius: '12px', padding: '12px',
                                    display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '340px',
                                    border: '1.5px solid rgba(0, 168, 132, 0.35)', boxShadow: '0 4px 12px rgba(0, 168, 132, 0.08)'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--wa-border)', paddingBottom: '6px' }}>
                                    <Folder size={20} style={{ color: 'var(--wa-accent)', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--wa-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {msg.metadata?.folderName || msg.file_name || msg.fileName || "TrueNAS SMB Network Folder"}
                                      </div>
                                      <div style={{ fontSize: '10px', color: 'var(--wa-accent)', fontWeight: 600 }}>⚡ Windows SMB Network Share (LAN)</div>
                                    </div>
                                  </div>
                                  <div style={{ background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)', wordBreak: 'break-all', border: '1px solid var(--border-color)' }}>
                                    {msg.metadata?.smbPath || (msg.content?.includes('\\\\') ? msg.content.match(/\\\\[^\n`]+/)?.[0] : '\\\\192.168.0.177\\GSVR_Movies')}
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-xs"
                                      style={{ flex: 1, fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 8px' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const p = msg.metadata?.smbPath || (msg.content?.includes('\\\\') ? msg.content.match(/\\\\[^\n`]+/)?.[0] : '\\\\192.168.0.177\\GSVR_Movies');
                                        if (p) {
                                          const copied = copyTextToClipboard(p);
                                          if (copied) toast.success(`Copied "${p}"! Press Win+R or paste in File Explorer to open! 🚀`);
                                          else toast.error('Failed to copy SMB path');
                                        }
                                      }}
                                      title="Copy Windows SMB Path to clipboard"
                                    >
                                      <Copy size={12} /> Copy SMB Path
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-xs"
                                      style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 8px', border: '1px solid var(--wa-border)' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const p = msg.metadata?.smbPath || (msg.content?.includes('\\\\') ? msg.content.match(/\\\\[^\n`]+/)?.[0] : '\\\\192.168.0.177\\GSVR_Movies');
                                        if (p) {
                                          const formatted = 'file:///' + p.replace(/\\/g, '/').replace(/^\/\//, '//');
                                          window.open(formatted, '_blank');
                                        }
                                      }}
                                      title="Open Network Link"
                                    >
                                      <Folder size={12} /> Open Link
                                    </button>
                                  </div>
                                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', lineHeight: '1.2' }}>
                                    💡 Direct LAN Share: Instant access to 300,000+ files and massive multi-GB folders with zero upload waiting.
                                  </div>
                                </div>
                              )}
                            </div>


                          </div>
                        </div>
                      )}
 
                      {/* Reactions Overlay Panel on Hover */}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '4px', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {['👍', '❤️', '😂', '😮', '🙏'].map(e => (
                            <span
                              key={e}
                              onClick={() => handleReaction(msg.id || i.toString(), e)}
                              style={{ cursor: 'pointer', fontSize: '18px', padding: '2px' }}
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span title="Copy Message Text" onClick={() => {
                            const copied = copyTextToClipboard(msg.content);
                            if (copied) toast.success('Message content copied to clipboard.');
                            else toast.error('Failed to copy message content.');
                          }} style={{ display: 'inline-flex', cursor: 'pointer', color: isOwn ? 'var(--wa-own-text)' : 'var(--wa-other-text)' }}>
                            <Copy size={18} strokeWidth={2.4} />
                          </span>
                          <span title="Share to External Apps (WhatsApp, Drive, etc.)" onClick={() => {
                            handleNativeShare({
                              text: msg.content,
                              url: msg.file_url || msg.fileUrl,
                              title: msg.file_name || 'GSV Message'
                            });
                          }} style={{ display: 'inline-flex', cursor: 'pointer', color: isOwn ? 'var(--wa-own-text)' : 'var(--wa-other-text)' }}>
                            <Share2 size={18} strokeWidth={2.4} />
                          </span>
                          <span title="Pin Message" onClick={() => setPinnedMessage(msg)} style={{ display: 'inline-flex', cursor: 'pointer', color: isOwn ? 'var(--wa-own-text)' : 'var(--wa-other-text)' }}>
                            <Pin size={18} strokeWidth={2.4} />
                          </span>
                          <span title="Forward Message" onClick={() => setForwardingMsg(msg)} style={{ display: 'inline-flex', cursor: 'pointer', color: isOwn ? 'var(--wa-own-text)' : 'var(--wa-other-text)' }}>
                            <ArrowRight size={18} strokeWidth={2.4} />
                          </span>
                          {isOwn && (
                            <span title="Delete Message" onClick={() => {
                              setConfirmModal({
                                title: 'Delete Message',
                                message: 'Are you sure you want to delete this message permanently?',
                                onConfirm: () => deleteMessageMutation.mutate(msg.id)
                              });
                            }} style={{ display: 'inline-flex', cursor: 'pointer', color: 'var(--brand-danger)' }}>
                              <Trash2 size={18} strokeWidth={2.4} />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Displayed active reactions bubbles */}
                      {reactions.length > 0 && (
                        <div style={{
                          position: 'absolute', bottom: '-12px', right: isOwn ? '12px' : 'auto', left: !isOwn ? '12px' : 'auto',
                          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                          borderRadius: '8px', padding: '2px 6px', display: 'flex', gap: '2px', fontSize: '10px', zIndex: 5
                        }}>
                          {reactions.map((r, rIdx) => <span key={rIdx}>{r}</span>)}
                        </div>
                      )}

                      <div className={styles.messageTime} style={{ marginTop: reactions.length > 0 ? '10px' : '4px' }}>
                        {formatTime(msg.created_at || msg.createdAt)}
                        {isOwn && (
                          msg.isSending ? (
                            <span className="spinner-border" style={{ display: 'inline-block', width: '8px', height: '8px', border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginLeft: '4px' }} />
                          ) : (
                            (() => {
                              if (activeConv && activeConv.type === 'private') {
                                const partnerName = activeConv.name?.replace('DM with ', '');
                                const partnerUser = otherUsers.find(
                                  (u: any) => u.fullName?.toLowerCase() === partnerName?.toLowerCase() || u.loginId?.toLowerCase() === partnerName?.toLowerCase()
                                );
                                const isPartnerOnline = partnerUser ? partnerUser.isOnline : false;
                                if (!isPartnerOnline) {
                                  return <Check size={15} strokeWidth={2.5} style={{ color: 'var(--text-tertiary)', marginLeft: '4px' }} />;
                                } else {
                                  return <CheckCheck size={15} strokeWidth={2.5} style={{ color: '#34b7f1', marginLeft: '4px' }} />;
                                }
                              }
                              return <CheckCheck size={15} strokeWidth={2.5} style={{ color: 'var(--text-tertiary)', marginLeft: '4px' }} />;
                            })()
                          )
                        )}
                      </div>
                    </div>

                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Bulk Action Bar */}
          {(isSelectionMode || selectedMessages.length > 0) && (
            <div style={{
              position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100,
              background: 'var(--bg-card)', border: '1.5px solid var(--brand-primary)',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)', borderRadius: '32px',
              padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '16px',
              color: 'var(--text-primary)', backdropFilter: 'blur(8px)', animation: 'slideUp 0.3s ease'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700 }}>{selectedMessages.length} selected</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={toggleSelectAll}>
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={copySelectedText}>
                  Copy Text
                </button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={selectedMessages.length === 0} onClick={handleBulkForwardClick}>
                  Forward
                </button>
                <button type="button" className="btn btn-primary btn-sm" disabled={selectedMessages.length === 0} onClick={handleBulkNativeShare} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Share2 size={13} strokeWidth={2.4} /> Share to Apps
                </button>
                <button type="button" className="btn btn-danger btn-sm" disabled={selectedMessages.length === 0} onClick={deleteSelectedMessages}>
                  Delete
                </button>
                <button type="button" className="btn btn-secondary btn-sm btn-icon" onClick={() => { setSelectedMessages([]); setIsSelectionMode(false); }}><X size={14} /></button>
              </div>
            </div>
          )}

          {/* Staged attachments file list */}
          {stagedFiles.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                  Staged SMB Upload Bundle ({stagedFiles.length}) {uploadProgressPercent !== null ? `(Uploading: ${uploadProgressPercent}%)` : ''}
                </span>
                <X size={12} style={{ color: 'var(--brand-danger)', cursor: 'pointer' }} onClick={() => setStagedFiles([])} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {stagedFiles.map((file, idx) => (
                  <span key={idx} style={{ background: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                    {file.type === 'folder' ? <Folder size={12} style={{ color: '#6366f1' }} /> : <File size={12} style={{ color: '#6366f1' }} />}
                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                    <X size={10} style={{ color: 'var(--brand-danger)', cursor: 'pointer' }} onClick={() => setStagedFiles(prev => prev.filter((_, fIdx) => fIdx !== idx))} />
                  </span>
                ))}
              </div>
              {uploadProgressPercent !== null && (
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                  <div style={{ width: `${uploadProgressPercent}%`, height: '100%', background: 'var(--brand-primary)', transition: 'width 0.2s ease-in-out' }} />
                </div>
              )}
            </div>
          )}

          {/* Mention dropdown popup suggestions */}
          {showMentions && filteredMentionUsers.length > 0 && (
            <div style={{
              position: 'absolute', bottom: '60px', left: '80px', zIndex: 1000,
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: '12px', padding: '6px 0', width: '220px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
            }} className="animate-scale-in">
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-primary)', padding: '4px 12px', textTransform: 'uppercase' }}>Mention Teammate</div>
              {filteredMentionUsers.map((u: any) => (
                <div
                  key={u.id}
                  onClick={() => selectMention(u)}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}
                  className="dropdown-item"
                >
                  @{u.fullName}
                </div>
              ))}
            </div>
          )}

          {/* Chat Input controls bar */}
          <div className={styles.chatInput} style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', position: 'relative', padding: handshakeRequired || (partner && blockedUsers.includes(partner.id)) ? '0' : undefined }}>
            {handshakeRequired ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1.5px dashed var(--brand-primary)', margin: '8px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔒</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Cross-Department Handshake Required</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', textAlign: 'center', maxWidth: '360px' }}>
                  You and {partner?.fullName} belong to different departments ({user?.department?.name || 'Local'} vs {partner?.department?.name || 'Remote'}). Establish a handshake to verify resonance.
                </div>
                {sentHandshakes.includes(partner!.id) ? (
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} disabled>
                    ⏳ Request Pending Approval...
                  </button>
                ) : (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: '12px', background: 'var(--gradient-brand)', border: 'none' }} onClick={() => sendHandshakeRequest(partner!.id)}>
                    🤝 Request Contact Handshake
                  </button>
                )}
              </div>
            ) : partner && blockedUsers.includes(partner.id) ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1.5px dashed var(--brand-danger)', margin: '8px' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚫</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-danger)' }}>Coworker Blocked</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', textAlign: 'center' }}>
                  You have blocked {partner?.fullName}. Unblock to enable message transmission.
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '12px', background: 'var(--gradient-danger)', border: 'none' }} onClick={() => toggleBlockUser(partner!.id)}>
                  🔓 Unblock Teammate
                </button>
              </div>
            ) : isRecording ? (
              /* Voice Recording sliding timeline HUD */
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1.5px dashed var(--brand-danger)' }} className="animate-slide-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-danger)', animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: '12px', color: 'var(--brand-danger)', fontWeight: 700 }}>🎤 VOCAL HANDSHAKE ACTIVE:</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{formatRecordTime(recordingSeconds)}</span>
                </div>
                {/* Simulated fluctuating canvas wave */}
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '18px' }}>
                  {[4, 10, 16, 8, 12, 18, 10, 14, 6, 12].map((h, wIdx) => (
                    <span key={wIdx} style={{ width: '2px', height: `${h}px`, background: 'var(--brand-danger)', borderRadius: '1px', animation: 'bounce 0.8s infinite', animationDelay: `${wIdx * 0.08}s` }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary btn-sm px-3" onClick={() => stopRecording(true)}>Cancel</button>
                  <button type="button" className="btn btn-primary btn-sm px-3" style={{ background: 'var(--gradient-danger)', borderColor: 'var(--brand-danger)' }} onClick={() => stopRecording(false)}>Send Note</button>
                </div>
              </div>
            ) : (
              /* Standard Input control form - Button in Button Capsule */
              <form onSubmit={handleSend} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                <div className={styles.inputCapsule}>
                  {/* Inside Left: Emoji Picker Toggle */}
                  <button
                    type="button"
                    className={styles.insideInputBtn}
                    title="Emoji resonance picker"
                    onClick={() => setShowEmoji(!showEmoji)}
                  >
                    <Smile size={22} strokeWidth={2.4} style={{ color: showEmoji ? 'var(--brand-primary)' : 'var(--wa-accent)' }} />
                  </button>

                  {/* Inside Center: Text Input */}
                  <input
                    type="text"
                    value={message}
                    onChange={e => handleInputChange(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Type secure signal resonance (@ to mention)..."
                    className={styles.insideTextInput}
                    disabled={sendMutation.isPending}
                    autoFocus
                  />

                  {/* Inside Right: Attachments Dropdown Toggle */}
                  <div className="dropdown" style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                    <button
                      type="button"
                      className={styles.insideInputBtn}
                      title="Attach Files/Folders"
                      onClick={() => setShowAttachmentsDropdown(!showAttachmentsDropdown)}
                    >
                      <Paperclip size={21} strokeWidth={2.4} style={{ color: showAttachmentsDropdown ? 'var(--brand-primary)' : 'var(--wa-accent)' }} />
                    </button>
                    {showAttachmentsDropdown && (
                      <div className="dropdown-menu" style={{ bottom: '100%', top: 'auto', right: 0, left: 'auto', marginBottom: '10px', display: 'block', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '14px', boxShadow: '0 12px 36px rgba(0,0,0,0.5)', zIndex: 1100 }}>
                        <div className="dropdown-item" onClick={() => { setUploadAccept('image/*'); setShowAttachmentsDropdown(false); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                          📸 Photos
                        </div>
                        <div className="dropdown-item" onClick={() => { setUploadAccept('video/*'); setShowAttachmentsDropdown(false); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                          🎥 Videos
                        </div>
                        <div className="dropdown-item" onClick={() => { setUploadAccept('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.js,.jsx,.ts,.tsx,.json,.py,.java,.html,.css,.xml,.yaml,.yml,.sh,.bat,.ini,.log'); setShowAttachmentsDropdown(false); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                          📄 Documents
                        </div>
                        <div className="dropdown-item" onClick={() => { setUploadAccept('.zip,.rar,.tar,.gz,.7z'); setShowAttachmentsDropdown(false); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                          🤐 Zip File Upload
                        </div>
                        <div className="dropdown-item" onClick={() => { setUploadAccept('*'); setShowAttachmentsDropdown(false); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                          📁 Files (All Types)
                        </div>
                        <div className="dropdown-item" onClick={() => {
                          setShowAttachmentsDropdown(false);
                          setTimeout(() => folderInputRef.current?.click(), 100);
                        }}>
                          📁 ⬆️ Upload PC Folder (Direct)
                        </div>
                        <div className="dropdown-item" onClick={() => {
                          setShowAttachmentsDropdown(false);
                          setTimeout(() => zipFolderInputRef.current?.click(), 100);
                        }}>
                          📦 ⚡ Upload ZIP as Folder (Auto-Extract)
                        </div>
                        <div className="dropdown-item" onClick={() => {
                          setShowAttachmentsDropdown(false);
                          setShowSmbModal(true);
                        }}>
                          📁 ⚡ Direct SMB & Cloud Folder Share
                        </div>
                        <div className="dropdown-item" onClick={() => {
                          setShowAttachmentsDropdown(false);
                          setShowNoteEditor(true);
                        }}>
                          📝 Create Note
                        </div>
                        <div className="dropdown-item" onClick={() => {
                          setShowAttachmentsDropdown(false);
                          setShowScratchpad(true);
                          setScratchpadPos({
                            x: Math.max(20, window.innerWidth - 370),
                            y: Math.max(20, window.innerHeight - 440)
                          });
                        }}>
                          💡 Personal Ideas / Notepad
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Inside Right: Share Folder (SMB/Cloud) */}
                  <button
                    type="button"
                    className={styles.insideInputBtn}
                    title="Share Folder (Direct SMB Network / Cloud / Local PC)"
                    onClick={() => setShowSmbModal(true)}
                  >
                    <Folder size={20} strokeWidth={2.4} style={{ color: 'var(--wa-accent)' }} />
                  </button>

                  {/* Inside Right: Notepad / Scratchpad (Desktop only) */}
                  <button
                    type="button"
                    className={`${styles.insideInputBtn} ${styles.desktopOnly}`}
                    title="Personal Ideas / Notepad"
                    onClick={() => {
                      setShowScratchpad(!showScratchpad);
                      if (!showScratchpad) {
                        setScratchpadPos({
                          x: Math.max(20, window.innerWidth - 370),
                          y: Math.max(20, window.innerHeight - 440)
                        });
                      }
                    }}
                  >
                    <StickyNote size={20} strokeWidth={2.4} style={{ color: showScratchpad ? 'var(--wa-accent)' : 'var(--text-secondary)' }} />
                  </button>
                </div>

                {/* Emoji Picker Popover */}
                {showEmoji && (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: '8px', marginBottom: '10px', zIndex: 1200,
                    background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', borderRadius: '16px',
                    padding: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '270px',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.5)'
                  }} className="animate-scale-in">
                    {['😀','😂','🔥','👍','🎉','🚀','👏','❤️','🔒','🤖','😮','😢','🙏','🌟','💡','💻','📈','🎨','✈️','🍕','🎈','🧸','👑','🎯'].map(emoji => (
                      <span
                        key={emoji}
                        onClick={() => { setMessage(prev => prev + emoji); setShowEmoji(false); }}
                        style={{ fontSize: '22px', cursor: 'pointer', padding: '4px', borderRadius: '8px' }}
                        className="hover-glass"
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}

                {/* Outside Action Button: Send or Mic */}
                {message.trim() || stagedFiles.length > 0 ? (
                  <button
                    type="submit"
                    disabled={sendMutation.isPending}
                    className={styles.sendActionBtn}
                    title="Send secure signal"
                  >
                    <Send size={20} strokeWidth={2.6} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.sendActionBtn}
                    title={micPermission === 'granted' ? "Voice Recording Handshake (Connected)" : micPermission === 'denied' ? "Microphone Access Blocked" : "Voice Recording Handshake"}
                    onClick={handleMicClick}
                    style={{
                      position: 'relative'
                    }}
                  >
                    <Mic size={20} strokeWidth={2.6} />
                    <span style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      border: '1.5px solid var(--wa-sidebar)',
                      background: micPermission === 'granted' ? 'var(--brand-success)' : micPermission === 'denied' ? 'var(--brand-danger)' : 'var(--brand-warning)'
                    }} />
                  </button>
                )}

                <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept={uploadAccept === '*' ? undefined : uploadAccept} onChange={e => handleFileUpload(e, false)} />
                <input
                  type="file"
                  ref={folderInputRef}
                  style={{ display: 'none' }}
                  {...{ webkitdirectory: "", directory: "", multiple: true } as any}
                  onChange={e => handleFileUpload(e, true)}
                />
                <input
                  type="file"
                  ref={zipFolderInputRef}
                  style={{ display: 'none' }}
                  accept=".zip,.tar,.gz,.7z,.rar"
                  onChange={handleZipFolderUpload}
                />
              </form>
            )}

            {sendMutation.isPending && stagedFiles.length > 0 && (
              <div style={{
                position: 'absolute', bottom: '80px', right: '20px', zIndex: 1100,
                background: 'var(--bg-card)', border: '1.5px solid var(--brand-primary)',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)', borderRadius: '12px',
                padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px',
                color: 'var(--text-primary)', backdropFilter: 'blur(8px)', animation: 'slideUp 0.3s ease'
              }}>
                <div style={{ width: '18px', height: '18px', border: '2px solid var(--border-color)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--brand-primary)' }}>
                    {uploadProgress 
                      ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}`
                      : `Uploading ${stagedFiles.length > 1 ? `${stagedFiles.length} Attachments` : 'Attachment'}`}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 500, opacity: 0.9, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {uploadProgress
                      ? stagedFiles[uploadProgress.current - 1]?.name
                      : (stagedFiles.length > 1 ? `${stagedFiles.length} files staged` : stagedFiles[0]?.name)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Conversation details sidebar */}
          {showGroupDetails && (
            <div style={{
              width: '320px', borderLeft: '1px solid var(--border-color)', height: '100%',
              background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', flexShrink: 0,
              animation: 'slideLeft 0.25s ease', overflowY: 'auto'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={16} style={{ color: 'var(--brand-primary)' }} />
                  Conversation Details
                </span>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowGroupDetails(false)}>✕</button>
              </div>

              {/* Body */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Profile block */}
                {activeConv.type === 'private' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '28px', fontWeight: 'bold' }}>
                      {partnerName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{partnerName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      <div><strong>Login ID:</strong> @{partner?.loginId || 'N/A'}</div>
                      <div><strong>Department:</strong> {partner?.department?.name || 'Local'}</div>
                      {partner?.phone && <div><strong>Phone:</strong> {partner.phone}</div>}
                      {partner?.email && <div><strong>Email:</strong> {partner.email}</div>}
                      <div style={{ marginTop: '4px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600,
                          background: partner?.isOnline ? 'rgba(74, 222, 128, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: partner?.isOnline ? 'var(--brand-success)' : 'var(--text-secondary)'
                        }}>
                          {partner?.isOnline ? '🟢 Online' : '⚪ Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #00a884, #005c4b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '28px', fontWeight: 'bold' }}>
                      {activeConv.name?.charAt(0).toUpperCase() || 'G'}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{activeConv.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{activeConv.description || 'Secure group resonance channel'}</div>
                  </div>
                )}

                {/* Actions Block */}
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    ⚙️ Chat Actions
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--brand-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      setConfirmModal({
                        title: 'Clear Chat History?',
                        message: 'This will locally clear all messages in this conversation from your screen. The other participant will still retain their message history.',
                        iconType: 'trash',
                        confirmText: 'Clear History',
                        brandColor: 'var(--brand-danger)',
                        onConfirm: handleClearHistory
                      });
                    }}
                  >
                    🗑️ Clear Chat History
                  </button>
                </div>

                {/* Shared Files List block */}
                <div style={{ borderBottom: (activeConv.type === 'group' || activeConv.type === 'department') ? '1px solid var(--border-color)' : 'none', paddingBottom: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📁 Shared Files ({
                      sortedMessages.filter(
                        (m: any) => m.type && m.type !== 'text' && (m.file_url || m.fileUrl) && !deletedFiles.includes(m.id)
                      ).length
                    })</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                    {(() => {
                      const files = sortedMessages.filter(
                        (m: any) => m.type && m.type !== 'text' && (m.file_url || m.fileUrl) && !deletedFiles.includes(m.id)
                      );
                      
                      if (files.length === 0) {
                        return <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>No files shared in this chat</div>;
                      }

                      return files.map((fileMsg: any) => {
                        const fileName = fileMsg.file_name || fileMsg.fileName || 'file';
                        const fileUrl = fileMsg.file_url || fileMsg.fileUrl;
                        return (
                          <div
                            key={fileMsg.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
                              background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)'
                            }}
                          >
                            <File size={16} style={{ color: 'var(--wa-accent)', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                title={fileName}
                                onClick={() => setPreviewFile({ url: fileUrl, name: fileName, type: fileMsg.type })}
                              >
                                {fileName}
                              </div>
                              <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                {new Date(fileMsg.created_at || fileMsg.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <a
                                href={fileUrl}
                                download={fileName}
                                className="btn btn-ghost btn-icon btn-xs"
                                title="Download File"
                                onClick={e => e.stopPropagation()}
                                style={{ padding: '2px', color: 'var(--wa-accent)', width: '20px', height: '20px' }}
                              >
                                <Download size={12} />
                              </a>
                              <button
                                type="button"
                                className="btn btn-ghost btn-icon btn-xs"
                                title="Hide from list"
                                onClick={() => handleDeleteFile(fileMsg.id)}
                                style={{ padding: '2px', color: 'var(--brand-danger)', width: '20px', height: '20px' }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Group details: Requests & Members (Only for Groups) */}
                {(activeConv.type === 'group' || activeConv.type === 'department') && (
                  <>
                    {/* Simulated Requests Area with Tabs */}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        📥 Group Access Requests
                      </div>
                      
                      {/* Category tabs */}
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '6px' }}>
                        {[
                          { key: 'pending', label: 'Pending' },
                          { key: 'approved', label: 'Approved' },
                          { key: 'rejected', label: 'Rejected' }
                        ].map(tab => {
                          const count = simulatedRequests.filter((r: any) => r.status === tab.key).length;
                          return (
                            <button
                              key={tab.key}
                              type="button"
                              className="btn btn-xs"
                              style={{
                                flex: 1,
                                fontSize: '10px',
                                padding: '3px',
                                background: requestCategory === tab.key ? 'var(--brand-primary)' : 'transparent',
                                color: requestCategory === tab.key ? 'white' : 'var(--text-secondary)',
                                border: 'none',
                                borderRadius: '4px'
                              }}
                              onClick={() => { setRequestCategory(tab.key as any); localStorage.setItem('gsv_req_cat', tab.key); }}
                            >
                              {tab.label} ({count})
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {simulatedRequests.filter((r: any) => r.status === requestCategory).length === 0 ? (
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>No {requestCategory} requests</div>
                        ) : (
                          simulatedRequests.filter((r: any) => r.status === requestCategory).map((req: any) => (
                            <div key={req.id} style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px', border: '1px solid var(--border-color)' }}>
                              <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>{req.fullName}</div>
                              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{req.employeeId} • @{req.loginId}</div>
                              {req.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                                  <button
                                    className="btn btn-primary btn-xs"
                                    style={{ flex: 1, height: '24px', fontSize: '10px', background: '#00a884', border: 'none' }}
                                    onClick={async () => {
                                      try {
                                        await chatApi.sendMessage(activeConv.id, { content: `Approved join request from @${req.loginId}`, type: 'system' });
                                        toast.success(`Approved ${req.fullName} to join group!`);
                                        
                                        const nextReqs = simulatedRequests.map((r: any) => r.id === req.id ? { ...r, status: 'approved' } : r);
                                        setSimulatedRequests(nextReqs);
                                        localStorage.setItem('gsv_simulated_requests', JSON.stringify(nextReqs));
                                      } catch (err) {
                                        toast.error('Failed to add member to database');
                                      }
                                    }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-xs danger"
                                    style={{ flex: 1, height: '24px', fontSize: '10px' }}
                                    onClick={() => {
                                      toast.success(`Rejected request from ${req.fullName}`);
                                      const nextReqs = simulatedRequests.map((r: any) => r.id === req.id ? { ...r, status: 'rejected' } : r);
                                      setSimulatedRequests(nextReqs);
                                      localStorage.setItem('gsv_simulated_requests', JSON.stringify(nextReqs));
                                    }}
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Members list (Simulated or actual) */}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        👥 Active Members
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--gradient-brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>ME</div>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{user?.fullName} (You)</span>
                        </div>
                        {otherUsers.slice(0, 3).map((u: any) => (
                          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>{initials(u.fullName)}</div>
                            <span style={{ fontSize: '12px' }}>{u.fullName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.chatEmpty} style={{ background: 'var(--bg-secondary)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', animation: 'pulse 3s infinite' }}>💬</div>
            <h2 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Welcome to Node Chat Matrix
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '340px', margin: '0 auto', lineHeight: 1.6 }}>
              Select a secure department room, custom group, or teammate directory from the left side matrix to start messaging.
            </p>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowCreateGroup(false)}>
          <div className="modal animate-scale-in" style={{ maxWidth: '440px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h4 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users2 size={18} style={{ color: 'var(--brand-primary)' }} />
                Create Group Channel
              </h4>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowCreateGroup(false)}>✕</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              if (!groupForm.name.trim()) return;
              createGroupMutation.mutate({
                name: groupForm.name,
                description: groupForm.description || 'Custom secure room',
                type: 'group',
                members: groupForm.members
              });
            }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Group Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. IT support node"
                    required
                    value={groupForm.name}
                    onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    placeholder="Brief description of the room..."
                    value={groupForm.description}
                    onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))}
                    style={{ minHeight: '60px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Add Members (Optional)</label>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {otherUsers.map((u: any) => (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={groupForm.members.includes(u.id)}
                          onChange={e => {
                            if (e.target.checked) setGroupForm(f => ({ ...f, members: [...f.members, u.id] }));
                            else setGroupForm(f => ({ ...f, members: f.members.filter(id => id !== u.id) }));
                          }}
                        />
                        {u.fullName}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateGroup(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={createGroupMutation.isPending}>
                  Establish Group Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Hidden WebRTC Audio/Video Output Elements ───────────────────────── */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
      {callType === 'video' && (
        <div style={{
          position: 'fixed', bottom: '100px', right: '16px', zIndex: 1200,
          display: activeCall && callingState === 'connected' ? 'flex' : 'none',
          flexDirection: 'column', gap: '8px'
        }}>
          <video ref={remoteVideoRef} autoPlay playsInline
            style={{ width: '240px', borderRadius: '12px', border: '2px solid var(--brand-primary)', background: '#000' }} />
          <video ref={localVideoRef} autoPlay playsInline muted
            style={{ width: '120px', borderRadius: '8px', border: '2px solid var(--wa-border)', background: '#000', alignSelf: 'flex-end' }} />
        </div>
      )}

      {/* Incoming Call Overlay Modal */}
      {incomingCallData && (
        <div className="modal-backdrop" style={{ zIndex: 1300 }}>
          <div className="modal animate-scale-in" style={{ maxWidth: '360px', textAlign: 'center', background: 'var(--bg-card)', border: '1.5px solid var(--wa-accent)', borderRadius: '20px', boxShadow: '0 16px 48px rgba(0,0,0,0.5)', padding: '24px 20px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #00a884, #005c4b)',
              color: '#ffffff', display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '16px',
              animation: 'pulse 1.4s infinite',
              boxShadow: '0 0 24px rgba(0, 168, 132, 0.6)'
            }}>
              {incomingCallData.type === 'video' ? <Video size={30} strokeWidth={2.5} /> : <Phone size={30} strokeWidth={2.5} />}
            </div>
            <h4 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {incomingCallData.isConference ? 'CONFERENCE CALL INVITATION' : `INCOMING ${incomingCallData.type === 'video' ? 'VIDEO' : 'VOICE'} CALL`}
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              <strong>{incomingCallData.callerName}</strong> is calling you...
            </p>
            
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn btn-danger rounded-pill px-4" 
                onClick={declineIncomingCall}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                <PhoneOff size={16} strokeWidth={2.4} /> DECLINE
              </button>
              <button 
                type="button" 
                className="btn btn-success rounded-pill px-4" 
                onClick={acceptIncomingCall}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: 'var(--brand-success)' }}
              >
                <Phone size={16} strokeWidth={2.4} /> ACCEPT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Resonance HUD - Floating interactive card */}
      {activeCall && (
        <div className={styles.callHudFloating}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: callingState === 'connected' ? 'var(--brand-success)' : 'var(--wa-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
              boxShadow: callingState === 'connected' ? '0 0 16px rgba(34, 197, 94, 0.6)' : '0 0 16px rgba(0, 168, 132, 0.5)',
              animation: 'pulse 1.8s infinite', flexShrink: 0
            }}>
              {callType === 'video' ? <Video size={20} strokeWidth={2.5} /> : <Phone size={20} strokeWidth={2.5} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: callingState === 'connected' ? '#22c55e' : '#eab308',
                  display: 'inline-block'
                }} />
                {callingState === 'connected' ? (
                  <span>
                    {formatCallDuration(callSeconds)} • {callParticipants.length > 2 ? `Conference (${callParticipants.length})` : 'Connected'}
                  </span>
                ) : (
                  <span>Calling {partnerName || activeConv?.name || 'Teammate'}...</span>
                )}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {callingState === 'connected' ? (
                  callParticipants.length > 1 ? `Participants: ${callParticipants.join(', ')}` : (callType === 'video' ? 'Encrypted HD Video Link' : 'Secure P2P Voice Resonance')
                ) : 'Ringing teammate device...'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Conference Add Member Button */}
            {callingState === 'connected' && (
              <button
                type="button"
                className={styles.chatHeaderBtn}
                onClick={() => setShowConferenceModal(true)}
                title="Add Teammate to Conference Call"
                style={{
                  width: '38px', height: '38px',
                  background: 'var(--wa-hover)',
                  color: 'var(--brand-primary)',
                  border: '1px solid var(--wa-border)'
                }}
              >
                <UserPlus size={18} strokeWidth={2.4} />
              </button>
            )}

            {/* Mute Mic Toggle */}
            <button
              type="button"
              className={styles.chatHeaderBtn}
              onClick={() => {
                setIsCallMuted(!isCallMuted);
                toast(isCallMuted ? 'Microphone unmuted 🎙️' : 'Microphone muted 🔇');
              }}
              title={isCallMuted ? 'Unmute Mic' : 'Mute Mic'}
              style={{
                width: '38px', height: '38px',
                background: isCallMuted ? 'rgba(239, 68, 68, 0.2)' : 'var(--wa-hover)',
                color: isCallMuted ? 'var(--brand-danger)' : 'var(--text-primary)',
                border: isCallMuted ? '1.5px solid var(--brand-danger)' : '1px solid var(--wa-border)'
              }}
            >
              {isCallMuted ? <MicOff size={18} strokeWidth={2.4} /> : <Mic size={18} strokeWidth={2.4} />}
            </button>

            {/* Video Feed Toggle */}
            {callType === 'video' && (
              <button
                type="button"
                className={styles.chatHeaderBtn}
                onClick={toggleVideoMute}
                title={isVideoMuted ? 'Enable Camera' : 'Disable Camera'}
                style={{
                  width: '38px', height: '38px',
                  background: isVideoMuted ? 'rgba(239, 68, 68, 0.2)' : 'var(--wa-hover)',
                  color: isVideoMuted ? 'var(--brand-danger)' : 'var(--text-primary)',
                  border: isVideoMuted ? '1.5px solid var(--brand-danger)' : '1px solid var(--wa-border)'
                }}
              >
                {isVideoMuted ? <VideoOff size={18} strokeWidth={2.4} /> : <Video size={18} strokeWidth={2.4} />}
              </button>
            )}

            {/* End Call Button */}
            <button
              type="button"
              className={styles.chatHeaderBtn}
              onClick={endActiveCall}
              title="End Call"
              style={{
                width: '38px', height: '38px',
                background: 'var(--brand-danger)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
              }}
            >
              <PhoneOff size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Conference Add Teammate Modal */}
      {showConferenceModal && (
        <div className="modal-backdrop" style={{ zIndex: 1300 }} onClick={() => setShowConferenceModal(false)}>
          <div className="modal animate-scale-in" style={{ maxWidth: '420px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={20} style={{ color: 'var(--wa-accent)' }} />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Invite to Conference Call</h4>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowConferenceModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '350px', overflowY: 'auto', padding: '12px 16px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Select an active teammate to add them to this ongoing {callType} call:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {otherUsers.map((u: any) => {
                  const isAlreadyIn = callParticipants.includes(u.fullName);
                  return (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: 'var(--wa-hover)', borderRadius: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gradient-brand)',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '12px', fontWeight: 700, position: 'relative'
                        }}>
                          {u.fullName?.charAt(0).toUpperCase()}
                          <span style={{
                            position: 'absolute', bottom: '-1px', right: '-1px', width: '8px', height: '8px',
                            borderRadius: '50%', background: u.isOnline ? 'var(--brand-success)' : 'var(--text-tertiary)',
                            border: '1.5px solid var(--bg-card)'
                          }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{u.fullName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.isOnline ? 'Online' : 'Offline'} • {u.department?.name || 'Department'}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        disabled={isAlreadyIn}
                        onClick={() => inviteTeammateToConference(u)}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px' }}
                      >
                        {isAlreadyIn ? 'In Call' : '+ Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Settings & Preferences Modal */}
      {showRoomSettingsModal && (
        <div className="modal-backdrop" style={{ zIndex: 1300 }} onClick={() => setShowRoomSettingsModal(false)}>
          <div className="modal animate-scale-in" style={{ maxWidth: '440px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Settings size={20} style={{ color: 'var(--brand-primary)' }} />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Room Settings & Preferences</h4>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowRoomSettingsModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Sound Notifications 🔔</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Play sound on incoming signals and calls</div>
                </div>
                <input
                  type="checkbox"
                  checked={roomSettings.soundEnabled}
                  onChange={e => {
                    const updated = { ...roomSettings, soundEnabled: e.target.checked };
                    setRoomSettings(updated);
                    localStorage.setItem('gsv_room_settings', JSON.stringify(updated));
                    toast.success(e.target.checked ? 'Sound alerts enabled' : 'Sound alerts muted');
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
              <div style={{ height: '1px', background: 'var(--border-color)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Enter to Send ⌨️</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Press Enter to dispatch messages quickly</div>
                </div>
                <input
                  type="checkbox"
                  checked={roomSettings.enterToSend}
                  onChange={e => {
                    const updated = { ...roomSettings, enterToSend: e.target.checked };
                    setRoomSettings(updated);
                    localStorage.setItem('gsv_room_settings', JSON.stringify(updated));
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
              <div style={{ height: '1px', background: 'var(--border-color)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Auto Scroll to Latest 📜</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Automatically scroll down when new messages arrive</div>
                </div>
                <input
                  type="checkbox"
                  checked={roomSettings.autoScroll}
                  onChange={e => {
                    const updated = { ...roomSettings, autoScroll: e.target.checked };
                    setRoomSettings(updated);
                    localStorage.setItem('gsv_room_settings', JSON.stringify(updated));
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowRoomSettingsModal(false)}>Close & Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Right-Click Context Menu */}
      {msgContextMenu && (
        <div style={{
          position: 'fixed',
          top: msgContextMenu.y,
          left: msgContextMenu.x,
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          zIndex: 1400,
          display: 'flex',
          flexDirection: 'column',
          padding: '6px',
          minWidth: '200px',
          animation: 'scaleIn 0.15s ease'
        }} onClick={e => e.stopPropagation()}>
          {/* Reaction row on top of the context menu */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 10px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '6px',
            gap: '8px'
          }}>
            {['👍', '❤️', '😂', '😮', '🙏'].map(e => (
              <span
                key={e}
                onClick={() => {
                  handleReaction(msgContextMenu.msg.id || 'temp', e);
                  setMsgContextMenu(null);
                }}
                style={{ cursor: 'pointer', fontSize: '20px', transition: 'transform 0.1s', display: 'inline-block' }}
                className="hover-scale"
              >
                {e}
              </span>
            ))}
          </div>

          {/* Context Menu Options */}
          {msgContextMenu.msg.content && (
            <div className="dropdown-item" onClick={() => {
              copyTextToClipboard(msgContextMenu.msg.content);
              toast.success('Message content copied! 📋');
              setMsgContextMenu(null);
            }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
              <Copy size={15} /> Copy Text
            </div>
          )}

          {(() => {
            if (!msgContextMenu.msg.content) return null;
            const urlMatch = msgContextMenu.msg.content.match(/https?:\/\/[^\s]+/);
            const emailMatch = msgContextMenu.msg.content.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+/);
            
            return (
              <>
                {urlMatch && (
                  <div 
                    className="dropdown-item" 
                    onClick={() => {
                      window.open(urlMatch[0], '_blank', 'noopener,noreferrer');
                      setMsgContextMenu(null);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    🔗 Open Link in New Tab
                  </div>
                )}
                {emailMatch && (
                  <div 
                    className="dropdown-item" 
                    onClick={() => {
                      const emailAddr = emailMatch[0];
                      setMsgContextMenu(null);
                      setConfirmModal({
                        title: 'Compose Email',
                        message: `Would you like to compose an email to ${emailAddr} using GSV Office Mail or your default external email app?`,
                        onConfirm: () => {
                          navigate(`/email?compose=${encodeURIComponent(emailAddr)}`);
                        },
                        onCancel: () => {
                          window.open(`mailto:${emailAddr}`, '_self');
                        },
                        confirmText: 'GSV Office Mail',
                        cancelText: 'External App',
                        iconType: 'info',
                        brandColor: 'var(--brand-primary)'
                      });
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    📧 Compose Email
                  </div>
                )}
              </>
            );
          })()}

          {/* Folder Context Menu Actions */}
          {(msgContextMenu.msg.type === 'folder' || msgContextMenu.msg.folder_id || msgContextMenu.msg.folderId) && (
            <>
              <div className="dropdown-item" onClick={() => {
                const fid = msgContextMenu.msg.folder_id || msgContextMenu.msg.folderId;
                if (fid) {
                  window.open(`/api/files/folders/${fid}/download`, '_blank');
                  toast.success('Downloading folder as ZIP archive... 📦');
                } else {
                  toast.error('Folder ID not available for download');
                }
                setMsgContextMenu(null);
              }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
                <Download size={15} /> Download Folder (ZIP)
              </div>
              <div className="dropdown-item" onClick={() => {
                const fid = msgContextMenu.msg.folder_id || msgContextMenu.msg.folderId;
                if (fid) {
                  navigate(`/files?folderId=${fid}`);
                }
                setMsgContextMenu(null);
              }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
                <Folder size={15} /> View in Cloud Files
              </div>
            </>
          )}

          {/* Windows SMB Folder Actions */}
          {(msgContextMenu.msg.type === 'smb_folder' || msgContextMenu.msg.metadata?.isSmb) && (
            <div className="dropdown-item" onClick={() => {
              const p = msgContextMenu.msg.metadata?.smbPath || (msgContextMenu.msg.content?.includes('\\\\') ? msgContextMenu.msg.content.match(/\\\\[^\n`]+/)?.[0] : '\\\\192.168.0.177\\GSVR_Movies');
              if (p) {
                copyTextToClipboard(p);
                toast.success(`Copied SMB Path "${p}"! 📋`);
              }
              setMsgContextMenu(null);
            }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
              <Copy size={15} /> Copy Windows SMB Path
            </div>
          )}

          {(msgContextMenu.msg.file_url || msgContextMenu.msg.fileUrl) && (
            <div className="dropdown-item" onClick={() => {
              handleSaveToPC(msgContextMenu.msg.file_name || msgContextMenu.msg.fileName || 'file', '', msgContextMenu.msg.file_url || msgContextMenu.msg.fileUrl);
              setMsgContextMenu(null);
            }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
              <Download size={15} /> {isMobileDevice ? 'Download File' : 'Copy to PC (Download)'}
            </div>
          )}

          {(msgContextMenu.msg.file_url || msgContextMenu.msg.fileUrl) && (
            <div className="dropdown-item" onClick={() => {
              const url = msgContextMenu.msg.file_url || msgContextMenu.msg.fileUrl;
              copyUrlOrTextToClipboard(url);
              toast.success('Asset URL copied to clipboard! 📋');
              setMsgContextMenu(null);
            }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
              <Copy size={15} /> Copy Asset Link
            </div>
          )}

          {(msgContextMenu.msg.file_url || msgContextMenu.msg.fileUrl) && (
            <div className="dropdown-item" onClick={() => {
              handleShareFile(msgContextMenu.msg);
              setMsgContextMenu(null);
            }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
              <Send size={15} /> Share Link
            </div>
          )}

          <div className="dropdown-item" onClick={() => {
            handleNativeShare({
              text: msgContextMenu.msg.content,
              url: msgContextMenu.msg.file_url || msgContextMenu.msg.fileUrl,
              title: msgContextMenu.msg.file_name || msgContextMenu.msg.fileName || 'GSV Message'
            });
            setMsgContextMenu(null);
          }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600, color: 'var(--brand-primary)' }}>
            <Share2 size={15} /> Share to External Apps (WhatsApp, etc.)
          </div>

          <div className="dropdown-item" onClick={() => {
            setForwardingMsg(msgContextMenu.msg);
            setMsgContextMenu(null);
          }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
            <ArrowRight size={15} /> Forward Message
          </div>

          <div className="dropdown-item" onClick={() => {
            handleAddBookmark(msgContextMenu.msg);
            setMsgContextMenu(null);
          }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
            <Pin size={15} /> Bookmark File
          </div>

          {(msgContextMenu.msg.file_id || msgContextMenu.msg.fileId) && (
            <div className="dropdown-item" onClick={() => {
              handleSaveToCloud(msgContextMenu.msg.file_id || msgContextMenu.msg.fileId);
              setMsgContextMenu(null);
            }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
              <Sparkles size={15} /> Save to Cloud
            </div>
          )}

          <div className="dropdown-item" onClick={() => {
            setPinnedMessage(msgContextMenu.msg);
            setMsgContextMenu(null);
          }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
            <Pin size={15} /> Pin Message
          </div>

          {(msgContextMenu.msg.sender_id === user?.id || msgContextMenu.msg.sender?.id === user?.id) && (
            <div className="dropdown-item" onClick={() => {
              setConfirmModal({
                title: 'Delete Message',
                message: 'Are you sure you want to delete this message permanently?',
                onConfirm: () => deleteMessageMutation.mutate(msgContextMenu.msg.id)
              });
              setMsgContextMenu(null);
            }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', color: 'var(--brand-danger)', fontWeight: 600 }}>
              <Trash2 size={15} /> Delete Message
            </div>
          )}
        </div>
      )}

      {/* Centered Grand Confirm Modal */}
      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)', borderRadius: '16px',
            padding: '24px', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: confirmModal.iconType === 'folder' ? 'rgba(0, 168, 132, 0.1)' : 
                            confirmModal.iconType === 'download' ? 'rgba(99, 102, 241, 0.1)' :
                            confirmModal.iconType === 'trash' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 168, 132, 0.1)', 
                color: confirmModal.iconType === 'folder' ? 'var(--wa-accent)' : 
                       confirmModal.iconType === 'download' ? 'var(--brand-primary)' :
                       confirmModal.iconType === 'trash' ? 'var(--brand-danger)' : 'var(--wa-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                {confirmModal.iconType === 'folder' ? <Folder size={22} /> : 
                 confirmModal.iconType === 'download' ? <Download size={22} /> :
                 confirmModal.iconType === 'trash' ? <Trash2 size={22} /> : <Info size={22} />}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{confirmModal.title}</h3>
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {confirmModal.message}
            </p>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ padding: '8px 16px', borderRadius: '8px' }} 
                onClick={() => {
                  if (confirmModal.onCancel) confirmModal.onCancel();
                  setConfirmModal(null);
                }}
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button 
                className="btn btn-primary btn-sm" 
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px',
                  background: confirmModal.brandColor || 'var(--brand-danger)', 
                  borderColor: confirmModal.brandColor || 'var(--brand-danger)',
                  color: '#fff'
                }} 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct SMB & Cloud Folder Share Modal */}
      {showSmbModal && (
        <div className="modal-overlay animate-fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(10px)', zIndex: 2200, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowSmbModal(false)}>
          <div className="card animate-scale-in" style={{
            width: '520px', maxWidth: '95vw', background: 'var(--bg-card)',
            border: '1.5px solid var(--wa-accent)', borderRadius: '16px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.5)', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '18px'
          }} onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0, 168, 132, 0.15)', color: 'var(--wa-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Folder size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Share Folder (Direct SMB / Cloud)</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Zero-upload instant folder sharing for large sizes & 300,000+ files</span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowSmbModal(false)}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px' }}>
              {[
                { key: 'smb', label: '⚡ Windows SMB Share', icon: '🖥️' },
                { key: 'cloud', label: '☁️ From Cloud Files', icon: '📁' },
                { key: 'local', label: '💻 Upload PC Folder', icon: '⬆️' }
              ].map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSmbForm(prev => ({ ...prev, tab: t.key as any }))}
                  style={{
                    flex: 1, padding: '8px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px',
                    background: smbForm.tab === t.key ? 'var(--wa-accent)' : 'transparent',
                    color: smbForm.tab === t.key ? '#fff' : 'var(--text-secondary)',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Content: SMB */}
            {smbForm.tab === 'smb' && (
              <form onSubmit={handleShareSmbFolder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    TrueNAS SMB Network Path:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={smbForm.path}
                    onChange={e => setSmbForm({ ...smbForm, path: e.target.value })}
                    placeholder="e.g. \\192.168.0.177\GSVR_Movies\Projects"
                    style={{ fontFamily: 'monospace', fontSize: '13px' }}
                    required
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Presets:</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid var(--border-color)' }}
                      onClick={() => setSmbForm({ ...smbForm, path: '\\\\192.168.0.177\\GSVR_Movies', name: 'GSVR_Movies' })}
                    >
                      📁 GSVR_Movies
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid var(--border-color)' }}
                      onClick={() => setSmbForm({ ...smbForm, path: '\\\\192.168.0.177\\gsv_storage', name: 'gsv_storage' })}
                    >
                      📁 gsv_storage
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid var(--border-color)' }}
                      onClick={() => setSmbForm({ ...smbForm, path: '\\\\192.168.0.177\\GSVR_Movies\\RnD Projects', name: 'RnD Projects' })}
                    >
                      📁 RnD Projects
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid var(--border-color)' }}
                      onClick={() => setSmbForm({ ...smbForm, path: '\\\\192.168.0.177\\GSVR_Movies\\apps', name: 'apps' })}
                    >
                      📁 apps
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ fontSize: '10px', padding: '2px 6px', border: '1px solid var(--border-color)' }}
                      onClick={() => setSmbForm({ ...smbForm, path: '\\\\192.168.0.177\\GSVR_Movies\\dataset', name: 'dataset' })}
                    >
                      📁 dataset
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Folder Display Name:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={smbForm.name}
                    onChange={e => setSmbForm({ ...smbForm, name: e.target.value })}
                    placeholder="e.g. Main Projects Archive"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                    Note / Instructions (Optional):
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={smbForm.note}
                    onChange={e => setSmbForm({ ...smbForm, note: e.target.value })}
                    placeholder="e.g. Contains all 300,000 export files"
                  />
                </div>

                <div style={{ background: 'rgba(0, 168, 132, 0.08)', borderRadius: '8px', padding: '10px', border: '1px solid rgba(0, 168, 132, 0.2)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  💡 <strong>Why SMB Share?</strong> Teammates receive a direct network folder link that opens in Windows Explorer immediately with zero waiting, perfect for 50GB+ data and 300,000 files.
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowSmbModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'var(--wa-accent)', borderColor: 'var(--wa-accent)' }}>
                    🚀 Share SMB Folder
                  </button>
                </div>
              </form>
            )}

            {/* Tab Content: Cloud Folders */}
            {smbForm.tab === 'cloud' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Select an existing folder from your Cloud Files to share directly into this chat:
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                  {userFolders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                      No folders found in your Cloud Files.
                    </div>
                  ) : (
                    userFolders.map((f: any) => (
                      <div
                        key={f.id}
                        onClick={() => handleShareExistingCloudFolder(f)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
                          background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)',
                          cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                        className="hover-glass"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Folder size={18} style={{ color: 'var(--wa-accent)' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</span>
                        </div>
                        <button className="btn btn-primary btn-xs" style={{ fontSize: '11px', padding: '3px 8px' }}>
                          Share ➡️
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab Content: Upload Local */}
            {smbForm.tab === 'local' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center', padding: '12px 0' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 168, 132, 0.12)', color: 'var(--wa-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Folder size={28} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Upload Folder from PC</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: 1.4 }}>
                    Choose to upload an uncompressed directory or upload a compressed .zip archive which the server automatically unpacks into a full folder hierarchy.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setShowSmbModal(false);
                      setTimeout(() => zipFolderInputRef.current?.click(), 100);
                    }}
                    style={{ background: 'var(--wa-accent)', borderColor: 'var(--wa-accent)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    📦 Select .ZIP Archive (Auto-Extracts)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setShowSmbModal(false);
                      setTimeout(() => folderInputRef.current?.click(), 100);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    📁 Select Directory from PC
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Create Note Modal */}
      {showNoteEditor && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card card-body" style={{ width: '600px', maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              📝 Create Note
            </h3>
            
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>File Name (with extension)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  value={noteFileName}
                  onChange={e => setNoteFileName(e.target.value)}
                  placeholder="e.g. script.py, config.json, notes.txt"
                  style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
                <div style={{ position: 'relative' }}>
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowExtDropdown(!showExtDropdown)}>
                    <MoreVertical size={18} />
                  </button>
                  {showExtDropdown && (
                    <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '2px', width: '80px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                      {['.txt', '.py', '.json', '.js', '.ts', '.md', '.html', '.css', '.yaml'].map(ext => (
                        <div 
                          key={ext}
                          onClick={() => {
                            const name = noteFileName.includes('.') ? noteFileName.substring(0, noteFileName.lastIndexOf('.')) : noteFileName || 'note';
                            setNoteFileName(name + ext);
                            setShowExtDropdown(false);
                          }}
                          style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', borderRadius: '4px', color: 'var(--text-primary)' }}
                          className="hover-glass"
                        >
                          {ext}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div style={{ flex: 1, minHeight: '250px', display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Content</label>
              <textarea 
                className="form-control"
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Start typing your note or code here..."
                style={{ 
                  flex: 1, 
                  width: '100%', 
                  resize: 'vertical',
                  minHeight: '250px',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  background: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)' 
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => {
                setShowNoteEditor(false);
                setShowExtDropdown(false);
              }}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={!noteContent.trim() || !noteFileName.trim()} onClick={async () => {
                if (!conversationId) {
                  toast.error('No conversation selected');
                  return;
                }
                const toastId = toast.loading(`Uploading note "${noteFileName}"...`);
                try {
                  const blob = new Blob([noteContent], { type: 'text/plain' });
                  const file = new window.File([blob], noteFileName, { type: 'text/plain' });
                  
                  const fd = new FormData();
                  fd.append('file', file);
                  const uploadRes = await filesApi.upload(fd);
                  const fileData = uploadRes.data?.data || uploadRes.data;
                  if (!fileData) throw new Error('No file data returned');
                  
                  const fileId = fileData.id;
                  const fileUrl = fileData.storage_url || fileData.storageUrl || fileData.url;
                  const fileSize = fileData.size || fileData.sizeBytes;
                  const mimeType = fileData.mime_type || fileData.mimeType || 'text/plain';
                  
                  await chatApi.sendMessage(conversationId, {
                    content: '',
                    type: 'file',
                    fileId,
                    fileName: noteFileName,
                    fileUrl,
                    fileSize,
                    mimeType
                  });
                  
                  toast.success(`Note "${noteFileName}" sent successfully! 🚀`, { id: toastId });
                  setShowNoteEditor(false);
                  setShowExtDropdown(false);
                  setNoteContent('');
                  setNoteFileName('note.txt');
                  qc.invalidateQueries({ queryKey: ['messages', conversationId] });
                  qc.invalidateQueries({ queryKey: ['conversations'] });
                } catch (err: any) {
                  console.error(err);
                  toast.error(`Failed to send note: ${err.message || 'Error'}`, { id: toastId });
                }
              }}>
                <Send size={16} style={{ marginRight: '6px' }} /> Send Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Draggable Scratchpad (Personal Ideas / Notepad) */}
      {showScratchpad && (
        <div 
          id="scratchpad-popup"
          style={{
            position: 'fixed',
            left: isScratchpadMaximized || window.innerWidth <= 768 ? '5vw' : `${scratchpadPos.x}px`,
            top: isScratchpadMaximized || window.innerWidth <= 768 ? '10vh' : `${scratchpadPos.y}px`,
            width: isScratchpadMaximized || window.innerWidth <= 768 ? '90vw' : '330px',
            height: isScratchpadMaximized || window.innerWidth <= 768 ? '80vh' : '380px',
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)', 
            overflow: 'hidden',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            transition: isDraggingScratchpad ? 'none' : 'width 0.2s ease, height 0.2s ease, left 0.2s ease, top 0.2s ease',
          }} 
          className="animate-scale-in"
        >
          {/* Header Row - Drag handle */}
          <div 
            onMouseDown={handleScratchpadHeaderMouseDown}
            style={{
              padding: '10px 14px',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: isScratchpadMaximized ? 'default' : 'grab'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <StickyNote size={14} color="var(--wa-accent)" /> 
              Personal Ideas
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                type="button" 
                className="btn btn-ghost btn-icon btn-sm" 
                onClick={() => setIsScratchpadMaximized(!isScratchpadMaximized)} 
                style={{ width: '24px', height: '24px', minHeight: '24px', padding: 0 }}
                title={isScratchpadMaximized ? "Minimize" : "Maximize"}
              >
                {isScratchpadMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button 
                type="button" 
                className="btn btn-ghost btn-icon btn-sm" 
                onClick={() => setShowScratchpad(false)} 
                style={{ width: '24px', height: '24px', minHeight: '24px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Document Title Input */}
          <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>File Name:</span>
            <input
              type="text"
              value={scratchpadTitle}
              onChange={e => setScratchpadTitle(e.target.value)}
              placeholder="e.g. Stage One"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none',
                padding: '2px 4px'
              }}
            />
            <select
              value={selectedExtension}
              onChange={e => setSelectedExtension(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none',
                padding: '2px 6px',
                cursor: 'pointer'
              }}
            >
              {FILE_EXTENSIONS.map(fe => (
                <option key={fe.ext} value={fe.ext} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  .{fe.ext}
                </option>
              ))}
            </select>
          </div>
          
          {/* Text Formatting Toolbar */}
          <div style={{
            padding: '6px 12px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <button
              type="button"
              onClick={() => insertFormatting('**', '**')}
              title="Bold"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Bold size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('_', '_')}
              title="Italic"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Italic size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('`', '`')}
              title="Inline Code"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Code size={14} />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('```\n', '\n```')}
              title="Code Block"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Block
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('- ')}
              title="Bullet List"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <List size={14} />
            </button>
          </div>

          <textarea
            id="scratchpad-textarea"
            value={scratchpadText}
            onChange={e => setScratchpadText(e.target.value)}
            placeholder="Type your brilliant ideas here... (Auto-saves locally)"
            style={{
              flex: 1, padding: '12px', background: 'transparent', border: 'none', resize: 'none',
              color: 'var(--text-primary)', fontSize: '13px', outline: 'none', fontFamily: 'inherit'
            }}
          />

          {/* Bottom Action Bar */}
          <div style={{
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Menu Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  title="Options"
                  onClick={() => setShowScratchpadMenu(!showScratchpadMenu)}
                  style={{ width: '28px', height: '28px', minHeight: '28px', padding: 0 }}
                >
                  <MoreVertical size={16} />
                </button>
                {showScratchpadMenu && (
                  <div style={{
                    position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px', zIndex: 1100,
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)', width: '220px', display: 'flex', flexDirection: 'column',
                    maxHeight: '320px', overflow: 'hidden'
                  }} className="animate-scale-in">
                    <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', fontWeight: 750, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
                      CHOOSE FILE EXTENSION
                    </div>
                    
                    {/* Extension Search Input */}
                    <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>
                      <input
                        type="text"
                        placeholder="Search extension..."
                        value={extensionSearch}
                        onChange={e => setExtensionSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: '100%',
                          background: 'rgba(0,0,0,0.2)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          padding: '4px 8px',
                          outline: 'none'
                        }}
                      />
                    </div>
                    
                    {/* Scrollable Extensions List */}
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '180px' }}>
                      {FILE_EXTENSIONS.filter(fe => 
                        fe.ext.toLowerCase().includes(extensionSearch.toLowerCase()) || 
                        fe.name.toLowerCase().includes(extensionSearch.toLowerCase())
                      ).map(fe => {
                        const isSelected = selectedExtension === fe.ext;
                        return (
                          <div
                            key={fe.ext}
                            onClick={() => {
                              setSelectedExtension(fe.ext);
                              toast.success(`Selected format: .${fe.ext}`);
                            }}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: isSelected ? 'rgba(0, 168, 132, 0.12)' : 'transparent',
                              color: isSelected ? 'var(--brand-success)' : 'var(--text-primary)'
                            }}
                            className="dropdown-item"
                          >
                            <span>{fe.name}</span>
                            {isSelected && <span style={{ fontSize: '10px' }}>🟢</span>}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* General Actions Section */}
                    <div style={{ borderTop: '1px solid var(--border-color)', padding: '4px 0', background: 'var(--bg-secondary)' }}>
                      <div
                        onClick={handleInsertScratchpadToChat}
                        style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        className="dropdown-item"
                      >
                        <Plus size={12} /> Insert as Text to Input
                      </div>
                      <div
                        onClick={() => {
                          copyTextToClipboard(scratchpadText);
                          toast.success('Note copied to clipboard!');
                          setShowScratchpadMenu(false);
                        }}
                        style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        className="dropdown-item"
                      >
                        <Copy size={12} /> Copy to Clipboard
                      </div>
                      <div
                        onClick={() => {
                          setScratchpadText('');
                          localStorage.setItem('gsv_scratchpad', '');
                          toast.success('Scratchpad cleared.');
                          setShowScratchpadMenu(false);
                        }}
                        style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--brand-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        className="dropdown-item"
                      >
                        <Trash2 size={12} /> Clear Note
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                title="Clear Note"
                onClick={() => {
                  setScratchpadText('');
                  localStorage.setItem('gsv_scratchpad', '');
                  toast.success('Note cleared 🧹');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 6px', color: 'var(--brand-danger)', background: 'transparent', border: 'none' }}
              >
                <Trash2 size={12} /> Clear
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                title="Copy Note"
                onClick={() => {
                  copyTextToClipboard(scratchpadText);
                  toast.success('Note copied 📋');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 6px', color: 'var(--text-primary)', background: 'transparent', border: 'none' }}
              >
                <Copy size={12} /> Copy
              </button>
            </div>
            {/* Send button (primary) */}
            <button
              type="button"
              className="btn btn-primary btn-sm px-3"
              style={{
                background: 'var(--wa-accent, #00a884)',
                borderColor: 'var(--wa-accent, #00a884)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px'
              }}
              onClick={sendScratchpadAsFile}
            >
              <Send size={12} /> Send to Chat
            </button>
          </div>
        </div>
      )}

      {/* Mic Access Blocked Custom Warning Dialog */}
      {showMicWarningModal && (
        <div className="modal-overlay animate-fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)', zIndex: 1500, display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowMicWarningModal(false)}>
          <div className="card animate-scale-in" style={{
            width: '440px', background: 'var(--bg-card)',
            border: '2.5px solid var(--brand-danger)', borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '16px'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)', color: 'var(--brand-danger)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Mic size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Microphone Access Blocked</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Action Required: Allow site permissions in your browser settings</p>
              </div>
            </div>
            
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p>The application could not access your microphone. If you are using an IP address (HTTP), browsers block microphone access by default. To enable secure voice note recordings, please follow these steps:</p>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <strong style={{ color: 'var(--brand-danger)' }}>🌐 Using Local Network IP (e.g. 192.168.x.x)?</strong><br/>
                Chrome blocks microphones on non-HTTPS sites. To fix this:<br/>
                1. Open a new tab and go to <code style={{ userSelect: 'all', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px' }}>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code><br/>
                2. Enter <code style={{ userSelect: 'all', background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px' }}>{window.location.origin}</code> in the box.<br/>
                3. Change the dropdown to <strong>Enabled</strong> and click <strong>Relaunch</strong>.
              </div>
              <p>Otherwise (if using HTTPS), ensure you clicked "Allow" in the URL bar.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" style={{ padding: '8px 16px' }} onClick={() => setShowMicWarningModal(false)}>
                Dismiss
              </button>
              <button className="btn btn-primary btn-sm" style={{ padding: '8px 16px', background: 'var(--wa-accent)', borderColor: 'var(--wa-accent)' }} onClick={async () => {
                setShowMicWarningModal(false);
                try {
                  await startRecording();
                } catch {
                  setShowMicWarningModal(true);
                }
              }}>
                🎤 Try Again
              </button>
              <button className="btn btn-primary btn-sm" style={{ padding: '8px 16px', background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)' }} onClick={() => {
                window.location.reload();
              }}>
                🔄 Reload Page
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function initials(name: string): string {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function getFileIcon(fileName: string) {
  const ext = (fileName || '').toLowerCase().split('.').pop() || '';
  if (ext === 'apk') {
    return <Sparkles size={16} style={{ color: '#a4c639', flexShrink: 0 }} />;
  }
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
    return <Folder size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />;
  }
  if (ext === 'pdf') {
    return <File size={16} style={{ color: '#ef4444', flexShrink: 0 }} />;
  }
  return <File size={16} style={{ color: 'var(--wa-accent)', flexShrink: 0 }} />;
}
