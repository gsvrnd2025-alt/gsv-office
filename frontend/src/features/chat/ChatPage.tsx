import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useParams, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

const getMessageDateString = (msg: any) => {
  if (!msg) return '';
  const date = new Date(msg.created_at || msg.createdAt || 0);
  return date.toDateString();
};

const formatDividerDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
};
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send, Plus, Search, MessageSquare, Hash, Phone, Video,
  MoreVertical, Smile, Paperclip, CheckCheck, Check, File, Image,
  Download, Folder, FolderOpen, Volume2, ChevronRight, ChevronLeft, X, Users2, CheckCircle,
  Pin, ArrowRight, ArrowLeft, Mic, Sparkles, Copy, Trash2, Menu, CheckSquare, Info, StickyNote, ChevronDown,
  Bold, Italic, List, Code, Maximize2, Minimize2
} from 'lucide-react';

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
  { ext: 'java', name: 'Java (.java)' },
  { ext: 'c', name: 'C Source (.c)' },
  { ext: 'cpp', name: 'C++ Source (.cpp)' },
  { ext: 'cs', name: 'C# Source (.cs)' },
  { ext: 'go', name: 'Go (.go)' },
  { ext: 'rs', name: 'Rust (.rs)' },
  { ext: 'php', name: 'PHP (.php)' },
  { ext: 'rb', name: 'Ruby (.rb)' },
  { ext: 'sh', name: 'Shell Script (.sh)' },
  { ext: 'bat', name: 'Batch File (.bat)' },
  { ext: 'ps1', name: 'PowerShell (.ps1)' },
  { ext: 'sql', name: 'SQL Query (.sql)' },
  { ext: 'xml', name: 'XML (.xml)' },
  { ext: 'yaml', name: 'YAML (.yaml)' },
  { ext: 'yml', name: 'YAML (.yml)' },
  { ext: 'ino', name: 'Arduino (.ino)' },
  { ext: 'log', name: 'Log File (.log)' },
  { ext: 'ini', name: 'Configuration (.ini)' },
  { ext: 'conf', name: 'Config (.conf)' },
  
  { ext: 'doc', name: 'Word Document (.doc)' },
  { ext: 'docx', name: 'Word Document (.docx)' },
  { ext: 'xls', name: 'Excel Sheet (.xls)' },
  { ext: 'xlsx', name: 'Excel Sheet (.xlsx)' },
  { ext: 'ppt', name: 'PowerPoint (.ppt)' },
  { ext: 'pptx', name: 'PowerPoint (.pptx)' },
  { ext: 'pdf', name: 'PDF (.pdf)' },
  { ext: 'rtf', name: 'Rich Text (.rtf)' },
  { ext: 'csv', name: 'CSV Data (.csv)' },
  
  { ext: 'zip', name: 'ZIP Archive (.zip)' },
  { ext: 'rar', name: 'RAR Archive (.rar)' },
  { ext: '7z', name: '7-Zip Archive (.7z)' },
  { ext: 'tar', name: 'TAR Archive (.tar)' },
  { ext: 'gz', name: 'GZIP Archive (.gz)' },
  
  { ext: 'mp3', name: 'Audio MP3 (.mp3)' },
  { ext: 'wav', name: 'Audio WAV (.wav)' },
  { ext: 'ogg', name: 'Audio OGG (.ogg)' },
  { ext: 'm4a', name: 'Audio M4A (.m4a)' },
  
  { ext: 'mp4', name: 'Video MP4 (.mp4)' },
  { ext: 'mkv', name: 'Video MKV (.mkv)' },
  { ext: 'avi', name: 'Video AVI (.avi)' },
  { ext: 'mov', name: 'Video MOV (.mov)' },
  { ext: 'webm', name: 'Video WebM (.webm)' },
  
  { ext: 'png', name: 'Image PNG (.png)' },
  { ext: 'jpg', name: 'Image JPG (.jpg)' },
  { ext: 'jpeg', name: 'Image JPEG (.jpeg)' },
  { ext: 'gif', name: 'Image GIF (.gif)' },
  { ext: 'svg', name: 'Image SVG (.svg)' }
];
import { filesApi, chatApi, usersApi } from '../../api';
import Editor from '@monaco-editor/react';
import { useAuthStore } from '../../store/auth.store';
import logoImg from '../../assets/gsvlogo.png';
import { SoundManager } from '../../utils/sound';
import { copyTextToClipboard } from '../../utils/clipboard';
import toast from 'react-hot-toast';
import styles from './ChatPage.module.css';

interface StagedFile {
  name: string;
  size: string;
  blob: File;
  type: string;
}

const getFullUrl = (url: string) => {
  if (!url) return '#';
  if (url.startsWith('http')) return url;
  return url;
};

const normalizeMessage = (m: any) => {
  if (!m) return m;
  const rawUrl = m.file_url !== undefined ? m.file_url : m.fileUrl;
  const fullUrl = rawUrl ? getFullUrl(rawUrl) : rawUrl;
  return {
    ...m,
    fileName: m.file_name !== undefined ? m.file_name : m.fileName,
    fileUrl: fullUrl,
    file_url: fullUrl,
    fileSize: m.file_size !== undefined ? m.file_size : m.fileSize,
    mimeType: m.mime_type !== undefined ? m.mime_type : m.mimeType,
    folderId: m.folder_id !== undefined ? m.folder_id : m.folderId,
  };
};

const normalizeFile = (f: any) => {
  if (!f) return f;
  const rawUrl = f.storage_url !== undefined ? f.storage_url : f.storageUrl;
  const fullUrl = rawUrl ? getFullUrl(rawUrl) : rawUrl;
  return {
    ...f,
    originalName: f.original_name !== undefined ? f.original_name : f.originalName,
    mimeType: f.mime_type !== undefined ? f.mime_type : f.mimeType,
    sizeBytes: f.size !== undefined ? Number(f.size) : f.sizeBytes,
    size: f.size !== undefined ? Number(f.size) : f.size,
    storagePath: f.storage_path !== undefined ? f.storage_path : f.storagePath,
    storageUrl: fullUrl,
    ownerId: f.owner_id !== undefined ? f.owner_id : f.ownerId,
    folderId: f.folder_id !== undefined ? f.folder_id : f.folderId,
    conversationId: f.conversation_id !== undefined ? f.conversation_id : f.conversationId,
    deletedAt: f.deleted_at !== undefined ? f.deleted_at : f.deletedAt,
    createdAt: f.created_at !== undefined ? f.created_at : f.createdAt,
    updatedAt: f.updated_at !== undefined ? f.updated_at : f.updatedAt,
    ownerName: f.owner_name !== undefined ? f.owner_name : f.ownerName,
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

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const dmUserId = searchParams.get('userId');
  const { 
    sidebarCollapsed, 
    setSidebarCollapsed,
    initiateCall,
    chatSocket,
    callHistory = [],
    setCallHistory,
    onlineUsers = new Set()
  } = useOutletContext<any>() || {};
  const { user } = useAuthStore();
  const qc = useQueryClient();

  // Standard states
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'channels' | 'dms' | 'groups' | 'online' | 'teammates' | 'bookmarks'>('all');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [activeDropdownMsgId, setActiveDropdownMsgId] = useState<string | null>(null);
  const [forwardingMsgsList, setForwardingMsgsList] = useState<any[]>([]);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [chatSidebarCollapsed, setChatSidebarCollapsed] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'chats' | 'teammates' | 'bookmarks'>('chats');
  
  // Custom states
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [stagedFilesPendingConfirm, setStagedFilesPendingConfirm] = useState<StagedFile[]>([]);
  const [showAttachConfirmModal, setShowAttachConfirmModal] = useState(false);
  const [uploadStates, setUploadStates] = useState<Record<number, { status: 'queued' | 'uploading' | 'completed' | 'failed'; percent: number }>>({});
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [otherUploads, setOtherUploads] = useState<Record<string, { fileName: string; percent: number; senderName: string }>>({});
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', members: [] as string[] });
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');

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
  
  const [activeChatTab, setActiveChatTab] = useState<'messages' | 'calls'>('messages');

  useEffect(() => {
    setActiveChatTab('messages');
  }, [conversationId]);

  // WhatsApp-style Custom Features
  const [showAttachmentsDropdown, setShowAttachmentsDropdown] = useState(false);
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

  // Chat Folder Browser State
  const [chatBrowseFolderId, setChatBrowseFolderId] = useState<string | null>(null);
  const [chatBrowseFolderName, setChatBrowseFolderName] = useState<string>('');
  const [folderHistory, setFolderHistory] = useState<{ id: string | null; name: string }[]>([]);

  // Lightbox / File Preview Modal
  const [previewFile, setPreviewFile] = useState<{ url: string, name: string, type: string } | null>(null);
  const [previewTextContent, setPreviewTextContent] = useState<string>('');
  const [loadingTextContent, setLoadingTextContent] = useState<boolean>(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [showExtDropdown, setShowExtDropdown] = useState(false);
  const [noteFileName, setNoteFileName] = useState('note.txt');
  const [noteContent, setNoteContent] = useState('');
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpadText, setScratchpadText] = useState(() => localStorage.getItem('gsv_scratchpad') || '');

  useEffect(() => {
    localStorage.setItem('gsv_scratchpad', scratchpadText);
  }, [scratchpadText]);

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShowScrollBottom(!isAtBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  // Click outside to dismiss context menu
  useEffect(() => {
    const handleClose = () => setMsgContextMenu(null);
    window.addEventListener('click', handleClose);

    const handleSendToChat = (e: any) => {
      setMessage((prev) => prev ? prev + '\n\n' + e.detail : e.detail);
    };
    window.addEventListener('send-note-to-chat', handleSendToChat);

    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('send-note-to-chat', handleSendToChat);
    };
  }, []);

  // Global message listener to ensure real-time updates of sidebar conversation list
  useEffect(() => {
    if (!chatSocket) return;
    
    const handleNewMsgGlobal = (data: any) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      if (conversationId && data.conversationId === conversationId) {
        qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      }
    };

    // Handle being removed from a conversation
    const handleConversationRemoved = (data: any) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      // If viewing the removed conversation, navigate away
      if (conversationId && data.conversationId === conversationId) {
        navigate('/chat');
        toast('You were removed from this group.', { icon: 'ℹ️' });
      }
    };
    
    chatSocket.on('message:new', handleNewMsgGlobal);
    chatSocket.on('conversation:removed', handleConversationRemoved);
    
    return () => {
      chatSocket.off('message:new', handleNewMsgGlobal);
      chatSocket.off('conversation:removed', handleConversationRemoved);
    };
  }, [chatSocket, conversationId, qc, navigate]);

  // Join/leave active conversation room via socket
  useEffect(() => {
    if (!chatSocket || !conversationId) return;
    
    chatSocket.emit('join:conversation', { conversationId });
    
    return () => {
      chatSocket.emit('leave:conversation', { conversationId });
    };
  }, [chatSocket, conversationId]);

  // Real-time upload progress tracking for other users
  useEffect(() => {
    if (!chatSocket) return;
    
    const handleUploadProgress = (data: any) => {
      if (data.conversationId !== conversationId) return;
      
      setOtherUploads(prev => {
        const next = { ...prev };
        if (data.percent === null || data.percent >= 100) {
          delete next[data.senderId];
        } else {
          next[data.senderId] = {
            fileName: data.fileName,
            percent: data.percent,
            senderName: data.senderName
          };
        }
        return next;
      });
    };
    
    chatSocket.on('chat:upload_progress', handleUploadProgress);
    
    return () => {
      chatSocket.off('chat:upload_progress', handleUploadProgress);
    };
  }, [chatSocket, conversationId]);

  const [showScratchpadMenu, setShowScratchpadMenu] = useState(false);
  const [scratchpadTitle, setScratchpadTitle] = useState('');
  const [selectedExtension, setSelectedExtension] = useState('txt');
  const [extensionSearch, setExtensionSearch] = useState('');
  const [isScratchpadMaximized, setIsScratchpadMaximized] = useState(false);
  const [scratchpadPos, setScratchpadPos] = useState({ x: 150, y: 150 });
  const [isDraggingScratchpad, setIsDraggingScratchpad] = useState(false);
  const scratchpadDragStartRef = useRef({ mouseX: 0, mouseY: 0, popupX: 0, popupY: 0 });

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
    
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const dm = 2;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

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
      
      const uploadRes = await filesApi.upload(fd, (progressEvent: any) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        if (chatSocket) {
          chatSocket.emit('chat:upload_progress', {
            conversationId,
            fileName: filename,
            percent,
            senderName: user?.fullName || 'Teammate'
          });
        }
      });
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
    } finally {
      if (chatSocket) {
        chatSocket.emit('chat:upload_progress', {
          conversationId,
          fileName: filename,
          percent: null,
          senderName: user?.fullName || 'Teammate'
        });
      }
    }
  };


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
        
        try {
          const response = await fetch(targetUrl, {
            headers: {
              'Authorization': `Bearer ${useAuthStore.getState().accessToken}`
            }
          });
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

      if ('showSaveFilePicker' in window) {
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
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Downloaded to PC successfully! 💾');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to save to PC');
      }
    }
  };

  const handleShareFile = (msg: any) => {
    const url = msg.file_url || msg.fileUrl;
    const name = msg.file_name || msg.fileName || 'Shared file';
    if (!url) {
      toast.error('No link available to share.');
      return;
    }
    const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    
    if (navigator.share) {
      navigator.share({
        title: name,
        text: `Shared via GSV Office: ${name}`,
        url: absoluteUrl,
      }).then(() => {
        toast.success('Shared successfully!');
      }).catch((err: any) => {
        if (err.name !== 'AbortError') {
          const success = copyTextToClipboard(absoluteUrl);
          if (success) {
            toast.success('Link copied to clipboard! 🔗');
          } else {
            toast.error('Failed to copy link.');
          }
        }
      });
    } else {
      const success = copyTextToClipboard(absoluteUrl);
      if (success) {
        toast.success('Link copied to clipboard! 🔗');
      } else {
        toast.error('Failed to copy link.');
      }
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [folderInputKey, setFolderInputKey] = useState(0);
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
    queryFn: () => chatApi.getConversations({ limit: 500 }).then(r => r.data?.data || r.data || []),
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

  const { data: invitations = [], refetch: refetchInvitations } = useQuery({
    queryKey: ['group-invitations'],
    queryFn: () => chatApi.getInvitations().then(r => r.data?.data || r.data || []),
    refetchInterval: 5000,
  });


  const handleInviteMember = async (inviteeId: string) => {
    if (!conversationId) return;
    try {
      await chatApi.addMember(conversationId, inviteeId);
      toast.success('Teammate added to group! 👥');
      setShowInviteModal(false);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add member');
    }
  };

  const handleUpdateMemberRole = async (targetUserId: string, role: string) => {
    if (!conversationId) return;
    try {
      await chatApi.changeMemberRole(conversationId, targetUserId, role);
      toast.success(`Member role updated to ${role}.`);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!conversationId) return;
    try {
      await chatApi.removeMember(conversationId, targetUserId);
      toast.success('Member removed from group.');
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to remove member');
    }
  };

  const { data: browseFiles = [], isLoading: loadingBrowseFiles } = useQuery({
    queryKey: ['chat-browse-files', chatBrowseFolderId],
    queryFn: () => {
      if (!chatBrowseFolderId) return Promise.resolve([]);
      return filesApi.getFiles({ folderId: chatBrowseFolderId }).then(r => r.data?.data || r.data || []);
    },
    enabled: !!chatBrowseFolderId
  });

  const { data: browseFolders = [], isLoading: loadingBrowseFolders } = useQuery({
    queryKey: ['chat-browse-folders', chatBrowseFolderId],
    queryFn: () => {
      if (!chatBrowseFolderId) return Promise.resolve([]);
      return filesApi.getFolders({ parentId: chatBrowseFolderId }).then(r => r.data?.data || r.data || []);
    },
    enabled: !!chatBrowseFolderId
  });

  const users = usersData?.data ? usersData.data : (Array.isArray(usersData) ? usersData : []);
  const uniqueUsers: any[] = Array.from(new Map<any, any>(users.map((u: any) => [u.id, u])).values());
  const otherUsers: any[] = uniqueUsers.filter((u: any) => u.id !== user?.id);

  // Mutations
  const sendMutation = useMutation({
    mutationFn: async (payload: { content: string; type?: string; files?: any[]; tempId?: string }) => {
      if (payload.files && payload.files.length > 0) {
        const isCloudRef = payload.files.some(f => f.isCloudReference);
        if (isCloudRef) {
          const targetUserId = partner?.id || activeConv.members?.find((m: any) => m.id !== user?.id)?.id;
          if (!targetUserId) throw new Error('Recipient teammate not found');
          
          let lastRes = null;
          for (let i = 0; i < payload.files.length; i++) {
            const staged = payload.files[i];
            
            const shareRes = await filesApi.shareToUser({
              itemType: staged.type === 'folder' ? 'folder' : 'file',
              itemId: staged.id,
              targetUserId,
              action: staged.shareAction || 'copy'
            });

            const newId = (shareRes.data as any)?.id || staged.id;
            const contentText = i === 0 ? payload.content : '';

            if (staged.type === 'folder') {
              lastRes = await chatApi.sendMessage(conversationId!, {
                content: contentText || '',
                type: 'folder',
                folderId: newId,
                fileName: staged.name
              }).then(r => r.data?.data || r.data);
            } else {
              lastRes = await chatApi.sendMessage(conversationId!, {
                content: contentText || '',
                type: staged.type || 'file',
                fileId: newId,
                fileName: staged.name,
                fileUrl: staged.storageUrl,
                fileSize: staged.rawSize ? Number(staged.rawSize) : undefined,
                mimeType: staged.mimeType
              }).then(r => r.data?.data || r.data);
            }
          }
          return lastRes;
        }

        if (payload.type === 'folder') {
          console.log('[Upload Flow] Upload started');
          const uploadStart = performance.now();
          const staged = payload.files[0];
          const fd = new FormData();
          let folderId = undefined;
          let fileName = undefined;
          const folderName = staged.name ? (staged.name.split('/')[0] || 'Uploaded_Folder') : 'Uploaded_Folder';
          
          setUploadStates({ 0: { status: 'uploading', percent: 0 } });
          let toastId: string | undefined;
          try {
            console.log('[Upload Flow] Constructing FormData for folder files...');
            const fdStart = performance.now();
            staged.files.forEach((file: File) => {
              fd.append('files', file);
            });
            const relativePaths = staged.files.map((file: any) => file.webkitRelativePath || file.name);
            fd.append('relativePaths', JSON.stringify(relativePaths));
            fd.append('folderName', folderName);
            console.log(`[Upload Flow] FormData construction finished. Time taken: ${(performance.now() - fdStart).toFixed(2)} ms`);
            
            toastId = toast.loading(`Uploading Folder: 0%`);
            let lastProgressTime = 0;
            const uploadRes = await filesApi.uploadFolder(fd, (progressEvent: any) => {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              const now = performance.now();
              if (percent === 0 || percent === 100 || now - lastProgressTime >= 200) {
                lastProgressTime = now;
                setUploadProgressPercent(percent);
                setUploadStates({ 0: { status: 'uploading', percent } });
                if (chatSocket) {
                  chatSocket.emit('chat:upload_progress', {
                    conversationId,
                    fileName: folderName,
                    percent,
                    senderName: user?.fullName || 'Teammate'
                  });
                }
                if (toastId) toast.loading(`Uploading Folder: ${percent}%`, { id: toastId });
              }
            });
            if (toastId) toast.success('Folder uploaded successfully!', { id: toastId });
            console.log(`[Upload Flow] Upload completed successfully. Total upload time: ${((performance.now() - uploadStart) / 1000).toFixed(2)} s`);
            setUploadStates({ 0: { status: 'completed', percent: 100 } });
            
            const fileData = uploadRes.data?.data || uploadRes.data;
            if (fileData) {
              folderId = fileData.id;
              fileName = fileData.name || folderName;
            }
          } catch (err) {
            console.error('[Upload Flow] Folder upload failed in chat propagation:', err);
            setUploadStates({ 0: { status: 'failed', percent: 0 } });
            if (toastId) toast.error('Folder upload failed.', { id: toastId });
            else toast.error('Folder upload failed.');
            throw new Error('Folder upload aborted');
          } finally {
            if (chatSocket) {
              chatSocket.emit('chat:upload_progress', {
                conversationId,
                fileName: folderName,
                percent: null,
                senderName: user?.fullName || 'Teammate'
              });
            }
          }

          return chatApi.sendMessage(conversationId!, {
            content: payload.content,
            type: 'folder',
            folderId: folderId,
            fileName: fileName,
          }).then(r => r.data?.data || r.data);
        } else {
          // Multiple standard file uploads loop (up to 30 files)
          const initialStates: any = {};
          payload.files.forEach((_, idx) => {
            initialStates[idx] = { status: 'queued', percent: 0 };
          });
          setUploadStates(initialStates);

          let lastRes = null;
          for (let i = 0; i < payload.files.length; i++) {
            setUploadProgress({ current: i + 1, total: payload.files.length });
            const staged = payload.files[i];
            const fd = new FormData();
            fd.append('file', staged.blob);
            
            setUploadStates(prev => ({
              ...prev,
              [i]: { status: 'uploading', percent: 0 }
            }));

            let fileId = undefined;
            let fileName = undefined;
            let fileUrl = undefined;
            let fileSize = undefined;
            let mimeType = undefined;

            try {
              let lastProgressTime = 0;
              const uploadRes = await filesApi.upload(fd, (progressEvent: any) => {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                const now = performance.now();
                if (percent === 0 || percent === 100 || now - lastProgressTime >= 200) {
                  lastProgressTime = now;
                  setUploadProgressPercent(percent);
                  setUploadStates(prev => ({
                    ...prev,
                    [i]: { status: 'uploading', percent }
                  }));
                  if (chatSocket) {
                    chatSocket.emit('chat:upload_progress', {
                      conversationId,
                      fileName: staged.name,
                      percent,
                      senderName: user?.fullName || 'Teammate'
                    });
                  }
                }
              });
              const fileData = uploadRes.data?.data || uploadRes.data;
              if (fileData) {
                fileId = fileData.id;
                fileName = fileData.original_name || fileData.originalName || fileData.name;
                fileUrl = fileData.storage_url || fileData.storageUrl || fileData.url;
                fileSize = fileData.size || fileData.sizeBytes;
                mimeType = fileData.mime_type || fileData.mimeType;
              }
              setUploadStates(prev => ({
                ...prev,
                [i]: { status: 'completed', percent: 100 }
              }));
            } catch (err) {
              console.error(`File ${staged.name} upload failed:`, err);
              setUploadStates(prev => ({
                ...prev,
                [i]: { status: 'failed', percent: 0 }
              }));
              continue;
            } finally {
              if (chatSocket) {
                chatSocket.emit('chat:upload_progress', {
                  conversationId,
                  fileName: staged.name,
                  percent: null,
                  senderName: user?.fullName || 'Teammate'
                });
              }
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
      setUploadStates({});
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
      setUploadStates({});
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
      if (newRoom && newRoom.id) navigate(`/chat/${newRoom.id}${window.location.search}`);
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && stagedFiles.length === 0) return;
    
    const tempId = `temp-${Date.now()}`;
    const isFolder = stagedFiles.some(f => f.type === 'folder');
    const attachmentType = stagedFiles.length > 0 ? (isFolder ? 'folder' : stagedFiles[0].type) : 'text';

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

  const startDM = async (targetUser: any, preservedParams?: string) => {
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
      navigate(`/chat/${existing.id}${preservedParams || ''}`);
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

  // Handle teammate file/folder sharing redirection and staging
  useEffect(() => {
    const shareItemId = searchParams.get('shareItemId');
    const shareItemType = searchParams.get('shareItemType');
    const targetUserId = searchParams.get('targetUserId');
    const shareItemName = searchParams.get('name');
    const shareAction = searchParams.get('action') || 'copy';

    if (targetUserId && shareItemId && users.length > 0 && conversations.length > 0) {
      const targetUser = users.find((u: any) => u.id === targetUserId);
      if (!targetUser) return;

      const currentDM = conversations.find(
        (c: any) => c.type === 'private' && 
          (c.members?.some((m: any) => m.id === targetUserId) ||
           c.name?.toLowerCase().includes(targetUser.fullName.toLowerCase()) || 
           c.name?.toLowerCase().includes(targetUser.loginId.toLowerCase()))
      );

      if (!currentDM || conversationId !== currentDM.id) {
        startDM(targetUser, `?${searchParams.toString()}`);
        return;
      }

      const ids = shareItemId.split(',');
      const types = shareItemType?.split(',') || [];
      const names = decodeURIComponent(shareItemName || '').split(',');

      const stagedCloudRefs = ids.map((id, idx) => {
        const type = types[idx] || 'file';
        const name = names[idx] || 'Shared Item';
        return {
          id,
          name,
          type: type === 'folder' ? 'folder' : type,
          size: 'Cloud File ☁️',
          blob: null as any,
          isCloudReference: true,
          shareAction: shareAction
        };
      });

      setStagedFilesPendingConfirm(stagedCloudRefs);
      setShowAttachConfirmModal(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, conversationId, users, conversations]);

  const confirmStagedAttachments = () => {
    const queueStart = performance.now();
    console.log('[Upload Flow] Upload queue created');
    setStagedFiles(prev => [...prev, ...stagedFilesPendingConfirm]);
    setStagedFilesPendingConfirm([]);
    setShowAttachConfirmModal(false);
    console.log(`[Upload Flow] Staged attachments confirmed. Time taken: ${(performance.now() - queueStart).toFixed(2)} ms`);
    toast.success(`${stagedFilesPendingConfirm.length} item(s) staged.`);
  };

  const cancelStagedAttachments = () => {
    setStagedFilesPendingConfirm([]);
    setShowAttachConfirmModal(false);
    toast.error('Staging cancelled.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isFolder = false) => {
    const startTime = performance.now();
    console.log('[Upload Flow] Folder selected');
    console.log('[Upload Flow] Folder scan start');
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) {
      console.log('[Upload Flow] No files selected or folder empty');
      return;
    }

    if (isFolder) {
      const MAX_FOLDER_FILES = 10000;
      if (rawFiles.length > MAX_FOLDER_FILES) {
        toast.error(`Folder contains too many files (${rawFiles.length.toLocaleString()}). For directories with more than ${MAX_FOLDER_FILES} files (like code projects), please compress them into a .zip or .tar archive before uploading.`);
        setFolderInputKey(prev => prev + 1);
        return;
      }
    }

    // Defer file parsing and size calculations to the next tick.
    // This allows the browser to immediately close the file chooser and render any pending UI/loading states.
    setTimeout(() => {
      let files = Array.from(rawFiles);
      const scanEndTime = performance.now();
      console.log(`[Upload Flow] Folder scan end. Time taken: ${(scanEndTime - startTime).toFixed(2)} ms. Files count: ${files.length}`);

      if (files.length > 0) {
        if (isFolder) {
          const totalSize = files.reduce((acc, f) => acc + f.size, 0);
          const totalSizeMB = totalSize / 1024 / 1024;
          console.log(`[Upload Flow] Total folder size: ${totalSizeMB.toFixed(2)} MB`);
          
          const MAX_FOLDER_SIZE_MB = 5000; // 5 GB limit for folders in chat
          if (totalSizeMB > MAX_FOLDER_SIZE_MB) {
            toast.error(`Folder size (${totalSizeMB.toFixed(1)} MB) exceeds the folder upload limit of ${MAX_FOLDER_SIZE_MB} MB. Please compress the folder into a .zip file before uploading.`);
            setFolderInputKey(prev => prev + 1);
            return;
          }

          const relativePath = (files[0] as any).webkitRelativePath || '';
          const folderName = relativePath.split('/')[0] || 'Staged Folder';
          
          const stagedFolder = {
            name: `${folderName}/ (${files.length} files)`,
            size: totalSizeMB.toFixed(1) + ' MB',
            blob: files[0],
            files: files,
            type: 'folder'
          };
          const previewStart = performance.now();
          setStagedFilesPendingConfirm([stagedFolder]);
          setShowAttachConfirmModal(true);
          console.log(`[Upload Flow] Attachment preview rendered. Time taken: ${(performance.now() - previewStart).toFixed(2)} ms`);
        } else {
          const MAX_FILE_SIZE_MB = 5000; // 5 GB limit
          const oversized = files.filter(f => f.size / 1024 / 1024 > MAX_FILE_SIZE_MB);
          if (oversized.length > 0) {
            toast.error(`File "${oversized[0].name}" exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB.`);
            e.target.value = '';
            return;
          }

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
              size: formatBytes(file.size),
              rawSize: file.size,
              blob: file,
              type: type
            };
          });
          setStagedFilesPendingConfirm(staged);
          setShowAttachConfirmModal(true);
        }
      }
    }, 0);
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
      const MAX_FILE_SIZE_MB = 5000; // 5 GB limit
      const oversized = files.filter(f => f.size / 1024 / 1024 > MAX_FILE_SIZE_MB);
      if (oversized.length > 0) {
        toast.error(`Pasted file "${oversized[0].name || 'Asset'}" exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB.`);
        return;
      }

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
          size: formatBytes(file.size),
          rawSize: file.size,
          blob: file,
          type: type
        };
      });
      setStagedFilesPendingConfirm(staged);
      setShowAttachConfirmModal(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const items = Array.from(e.dataTransfer.items);
    if (items.length === 0) return;

    let filesToStage: File[] = [];

    // Simple check for folder drop using webkitGetAsEntry
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry && entry.isDirectory) {
          // It's a folder, but reading all files recursively without a library is complex.
          // For now, we will fallback to the input type="file" webkitdirectory method 
          // or just prompt the user to use the folder button.
          toast.error("Folder drops are not fully supported yet. Please use the 'Attach Folder' button instead.");
          return;
        } else {
          const file = item.getAsFile();
          if (file) filesToStage.push(file);
        }
      }
    }

    if (filesToStage.length > 0) {
      const MAX_FILE_SIZE_MB = 5000; // 5 GB limit
      const oversized = filesToStage.filter(f => f.size / 1024 / 1024 > MAX_FILE_SIZE_MB);
      if (oversized.length > 0) {
        toast.error(`Dropped file "${oversized[0].name}" exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB.`);
        return;
      }

      if (filesToStage.length > 30) {
        toast.error("You can drop a maximum of 30 files at a time. Slicing to the first 30 files.");
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
          name: file.name,
          size: formatBytes(file.size),
          rawSize: file.size,
          blob: file,
          type: type
        };
      });
      setStagedFilesPendingConfirm(staged);
      setShowAttachConfirmModal(true);
    }
  };

  const handleCallHandshake = (type: 'audio' | 'video') => {
    if (activeConv && activeConv.type === 'private') {
      const partnerName = activeConv.name?.replace('DM with ', '');
      const partnerUser = otherUsers.find(
        (u: any) => u.fullName.toLowerCase() === partnerName?.toLowerCase() || u.loginId.toLowerCase() === partnerName?.toLowerCase()
      );
      
      const targetPartner = partnerUser || partner;
      if (targetPartner && initiateCall) {
        initiateCall(targetPartner.id, partnerName || targetPartner.fullName, type);
      } else {
        toast.error('Calling services are unavailable.');
      }
    }
  };

  const filteredConvs = conversations.filter((c: any) => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    
    if (activeFilter === 'channels') return c.type === 'channel' || c.type === 'department';
    if (activeFilter === 'dms') return c.type === 'private';
    if (activeFilter === 'groups') return c.type === 'group';
    if (activeFilter === 'online') {
      if (c.type !== 'private') return false;
      const partner = c.members?.find((m: any) => m.id !== user?.id) ||
                      otherUsers.find((u: any) => {
                        const pName = c.name?.replace('DM with ', '').trim().toLowerCase();
                        return u.fullName?.toLowerCase() === pName || u.loginId?.toLowerCase() === pName;
                      });
      return partner ? onlineUsers.has(partner.id) : false;
    }
    return true;
  });

  const sortedFilteredConvs = [...filteredConvs].sort((a: any, b: any) => {
    const isOnline = (c: any) => {
      if (c.type === 'group' || c.type === 'channel') return false;
      const partner = c.members?.find((m: any) => m.id !== user?.id) ||
                      otherUsers.find((u: any) => {
                        const pName = c.name?.replace('DM with ', '').trim().toLowerCase();
                        return u.fullName?.toLowerCase() === pName || u.loginId?.toLowerCase() === pName;
                      });
      return partner ? onlineUsers.has(partner.id) : false;
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
        const partner = c.members?.find((m: any) => m.id !== user?.id) ||
                        otherUsers.find((u: any) => {
                          const pName = c.name?.replace('DM with ', '').trim().toLowerCase();
                          return u.fullName?.toLowerCase() === pName || u.loginId?.toLowerCase() === pName;
                        });
        const partnerId = partner?.id;
        if (partnerId) {
          if (seenPartners.has(partnerId)) {
            continue;
          }
          seenPartners.add(partnerId);
        } else {
          const partnerName = c.name?.replace('DM with ', '').trim().toLowerCase();
          if (partnerName) {
            if (seenPartners.has(partnerName)) {
              continue;
            }
            seenPartners.add(partnerName);
          }
        }
      }
      result.push(c);
    }
    return result;
  })();
  
  const displayedTeammates = otherUsers
    .filter((u: any) => {
      if (activeFilter === 'online' && !onlineUsers.has(u.id)) return false;
      return u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.loginId?.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a: any, b: any) => {
      const aIsOnline = onlineUsers.has(a.id);
      const bIsOnline = onlineUsers.has(b.id);
      if (aIsOnline && !bIsOnline) return -1;
      if (!aIsOnline && bIsOnline) return 1;
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

  const currentUserMember = activeConv?.members?.find((m: any) => m.id === user?.id);
  const isCurrentUserAdmin = currentUserMember?.role === 'admin' || activeConv?.created_by === user?.id;

  useEffect(() => {
    if (activeConv) {
      setEditGroupName(activeConv.name || '');
      setEditGroupDesc(activeConv.description || '');
      setIsEditingGroup(false);
    }
  }, [activeConv?.id]);

  const handleUpdateGroupDetails = async () => {
    if (!activeConv || !editGroupName.trim()) return;
    try {
      await chatApi.updateConversation(activeConv.id, {
        name: editGroupName,
        description: editGroupDesc
      });
      toast.success('Group details updated! ✏️');
      setIsEditingGroup(false);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update group details');
    }
  };

  const partner = activeConv?.type === 'private' 
    ? (activeConv.members?.find((m: any) => m.id !== user?.id) || 
       otherUsers.find((u: any) => {
         const pName = activeConv.name?.replace('DM with ', '');
         return u.fullName?.toLowerCase() === pName?.toLowerCase() || u.loginId?.toLowerCase() === pName?.toLowerCase();
       })) 
    : null;
  const partnerName = partner?.fullName || activeConv?.name?.replace('DM with ', '');
  
  const partnerIsAdmin = partner && (
    (partner as any).role?.name === 'Super Admin' ||
    (partner as any).role_name === 'Super Admin' ||
    partner.fullName === 'System Administrator' ||
    partner.id === '20000000-0000-0000-0000-000000000001'
  );
  const userIsAdmin = user && (
    (user as any).role?.name === 'Super Admin' ||
    (user as any).role_name === 'Super Admin' ||
    user.fullName === 'System Administrator' ||
    user.id === '20000000-0000-0000-0000-000000000001'
  );

  const handshakeRequired = false; // Cross-department calling is now allowed globally without handshakes.

  const partnerCallLogs = (callHistory || []).filter((log: any) => 
    log.name?.toLowerCase() === partnerName?.toLowerCase()
  );
  
  let sortedMessages = [...messages].sort((a: any, b: any) => {
    const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
    const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
    return timeA - timeB;
  });

  const callMessages = partnerCallLogs.map((log: any, idx: number) => ({
    id: `call-log-${idx}-${log.timestamp}`,
    type: 'call',
    content: JSON.stringify(log),
    created_at: log.timestamp,
    sender_id: log.status === 'incoming' || log.status === 'missed' ? partner?.id : user?.id,
    sender: log.status === 'incoming' || log.status === 'missed' ? partner : user,
    call_status: log.status
  }));

  sortedMessages = [...sortedMessages, ...callMessages].sort((a: any, b: any) => {
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
    <div className={`${styles.chatLayout} ${conversationId ? styles.chatOpen : ''}`} style={{ animation: 'slideUp 0.3s ease', position: 'relative' }}>
      
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
      {showNoteEditor && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card card-body" style={{ width: '600px', maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <button className="btn btn-ghost btn-icon" onClick={() => setShowExtDropdown(!showExtDropdown)}>
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
              <button className="btn btn-ghost" onClick={() => {
                setShowNoteEditor(false);
                setShowExtDropdown(false);
              }}>Cancel</button>
              <button className="btn btn-primary" disabled={!noteContent.trim() || !noteFileName.trim() || sendMutation.isPending} onClick={() => {
                const blob = new Blob([noteContent], { type: 'text/plain' });
                const file = new window.File([blob], noteFileName, { type: 'text/plain' });
                
                const ext = noteFileName.split('.').pop()?.toLowerCase() || '';
                let type = 'file';
                if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) type = 'photo';
                else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) type = 'video';
                else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) type = 'music';

                const newStagedFile = {
                  name: file.name,
                  size: formatBytes(file.size),
                  rawSize: file.size,
                  blob: file,
                  type: type
                };

                sendMutation.mutate({ content: '', type: type, files: [newStagedFile] });
                toast.success(`Note "${noteFileName}" sent successfully! 🚀`);
                
                setShowNoteEditor(false);
                setShowExtDropdown(false);
                setNoteContent('');
                setNoteFileName('note.txt');
              }}>
                <Send size={16} style={{ marginRight: '6px' }} /> Send Note
              </button>
            </div>
          </div>
        </div>
      )}

      {showAttachConfirmModal && stagedFilesPendingConfirm.length > 0 && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card card-body" style={{ width: '450px', maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'scaleIn 0.2s ease' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              📎 Stage Attachments?
            </h3>
            
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Are you sure you want to attach these items to the conversation room?
            </p>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Total Items:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stagedFilesPendingConfirm.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Attachment Type:</span>
                <span style={{ fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'capitalize' }}>
                  {stagedFilesPendingConfirm.some(f => f.type === 'folder') ? 'Folder Upload 📁' : 'Files 📄'}
                </span>
              </div>
            </div>

            {/* Scrollable list of files */}
            <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-secondary)' }}>
              {stagedFilesPendingConfirm.map((file, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: idx < stagedFilesPendingConfirm.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                    {file.type === 'folder' ? <Folder size={14} style={{ color: 'var(--brand-primary)' }} /> : <File size={14} style={{ color: 'var(--brand-primary)' }} />}
                    <span>{file.name}</span>
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{file.size}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button className="btn btn-secondary" onClick={cancelStagedAttachments} style={{ padding: '8px 16px', fontSize: '13px' }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmStagedAttachments} style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 600 }}>
                Confirm Attachment
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Folder Browser Modal in Chat */}
      {chatBrowseFolderId && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card card-body" style={{ width: '500px', maxWidth: '95vw', background: 'var(--wa-bg-card, var(--bg-card))', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '80vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                {folderHistory.length > 0 && (
                  <button 
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', marginRight: '4px' }}
                    onClick={() => {
                      const prev = folderHistory[folderHistory.length - 1];
                      setFolderHistory(history => history.slice(0, -1));
                      setChatBrowseFolderId(prev.id);
                      setChatBrowseFolderName(prev.name);
                    }}
                    title="Go Back"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <FolderOpen size={20} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chatBrowseFolderName || 'Browse Folder'}
                </h3>
              </div>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }} onClick={() => { setChatBrowseFolderId(null); setChatBrowseFolderName(''); setFolderHistory([]); }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px', paddingRight: '4px' }}>
              {loadingBrowseFiles || loadingBrowseFolders ? (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: 'var(--text-secondary)' }}>
                  <div className="spinner" />
                  <span style={{ fontSize: '13px' }}>Loading folder items...</span>
                </div>
              ) : (browseFiles.length === 0 && browseFolders.length === 0) ? (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '13px', flexDirection: 'column', gap: '8px', margin: '40px 0' }}>
                  <FolderOpen size={36} style={{ opacity: 0.3 }} />
                  <span>This folder is empty</span>
                </div>
              ) : (
                <>
                  {/* Render Subfolders */}
                  {browseFolders.map((f: any) => (
                    <div 
                      key={f.id} 
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.2s' }}
                      onClick={() => {
                        setFolderHistory(prev => [...prev, { id: chatBrowseFolderId, name: chatBrowseFolderName }]);
                        setChatBrowseFolderId(f.id);
                        setChatBrowseFolderName(f.name);
                      }}
                      className="hover-glass"
                    >
                      <Folder size={18} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    </div>
                  ))}

                  {/* Render Files */}
                  {browseFiles.map((file: any) => {
                    const normalized = normalizeFile(file);
                    const ext = normalized.originalName?.split('.').pop()?.toLowerCase() || '';
                    let pType = 'file';
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) pType = 'photo';
                    else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) pType = 'video';
                    else if (ext === 'pdf') pType = 'pdf';

                    const fUrl = normalized.storageUrl || normalized.url || '#';

                    return (
                      <div 
                        key={normalized.id} 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.2s' }}
                        onClick={() => {
                          setPreviewFile({ url: fUrl, name: normalized.originalName, type: pType });
                        }}
                        className="hover-glass"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          {getFileIcon(normalized.originalName)}
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{normalized.originalName}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{formatBytes(normalized.sizeBytes || normalized.size || 0)}</span>
                          </div>
                        </div>
                        <button 
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveToPC(normalized.originalName, '', fUrl);
                          }}
                          title="Download File"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button className="btn btn-secondary" onClick={() => { setChatBrowseFolderId(null); setChatBrowseFolderName(''); setFolderHistory([]); }}>
                Close
              </button>
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
                  <div style={{ width: '90%', height: '85%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }} onClick={(e) => e.stopPropagation()}>
                    {loadingTextContent ? (
                      <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1e1e1e' }}>
                        Loading file content...
                      </div>
                    ) : (
                      <Editor
                        height="100%"
                        width="100%"
                        language={(previewFile.name.split('.').pop() || 'text').toLowerCase()}
                        theme="vs-dark"
                        value={previewTextContent}
                        options={{
                          readOnly: true,
                          minimap: { enabled: true },
                          scrollBeyondLastLine: false,
                          fontSize: 14,
                          wordWrap: 'on'
                        }}
                      />
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
          <h2 className={styles.convTitle}>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setChatSidebarCollapsed(true)}
              style={{ marginRight: '6px', width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              title="Collapse Conversation List"
            >
              <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <img src={logoImg} alt="GSV Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            GSVConnect
          </h2>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              className="btn btn-ghost btn-sm btn-icon" 
              onClick={markAllChatsRead} 
              title="Mark all chats as read"
              style={{ width: '28px', height: '28px', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <CheckCheck size={16} />
            </button>
            <button className="btn btn-primary btn-sm btn-icon" onClick={() => setShowCreateGroup(true)} title="Create group channel">
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
              {invitations.length > 0 && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    📩 Pending Group Invites ({invitations.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                    {invitations.map((inv: any) => (
                      <div key={inv.id} style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.conversation_name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '2px' }}>Invited by {inv.inviter_name}</div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            style={{ flex: 1, padding: '2px 4px', fontSize: '9px', background: '#00a884', border: 'none', height: '18px' }}
                            onClick={async () => {
                              try {
                                await chatApi.acceptInvitation(inv.id);
                                toast.success('Joined group!');
                                refetchInvitations();
                                qc.invalidateQueries({ queryKey: ['conversations'] });
                                navigate(`/chat/${inv.conversation_id}`);
                              } catch (err: any) {
                                toast.error('Failed to accept invitation');
                              }
                            }}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            style={{ flex: 1, padding: '2px 4px', fontSize: '9px', height: '18px' }}
                            onClick={async () => {
                              try {
                                await chatApi.rejectInvitation(inv.id);
                                toast.success('Invitation declined');
                                refetchInvitations();
                              } catch (err: any) {
                                toast.error('Failed to reject invitation');
                              }
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                              return conv.name || 'GSVConnect Group';
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
                    const onlineUsersList = displayedTeammates.filter((u: any) => onlineUsers.has(u.id));
                    const offlineUsers = displayedTeammates.filter((u: any) => !onlineUsers.has(u.id));
                    
                    const renderTeammate = (u: any) => (
                      <div
                        key={u.id}
                        onClick={() => startDM(u)}
                        className={styles.teammateRow}
                      >
                        <div className={styles.teammateAvatar} style={{ position: 'relative' }}>
                          {initials(u.fullName)}
                          {onlineUsers.has(u.id) && (
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-success)', position: 'absolute', bottom: '0', right: '0', border: '2px solid var(--bg-primary)' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{u.fullName}</div>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{onlineUsers.has(u.id) ? '🟢 Online' : '⚪ Offline'}</span>
                        </div>
                      </div>
                    );

                    return (
                      <>
                        {onlineUsersList.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 750, color: 'var(--brand-success)', padding: '6px 8px', letterSpacing: '0.5px' }}>🟢 ONLINE ({onlineUsersList.length})</div>
                            {onlineUsersList.map(renderTeammate)}
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
              <button 
                className={`btn btn-ghost btn-icon ${styles['mobile-only-back-btn']}`} 
                onClick={() => navigate('/chat')}
                style={{ marginRight: '8px' }}
                title="Back to Chats"
              >
                <ArrowLeft size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button 
                className={`btn btn-ghost btn-icon ${styles['desktop-only-btn']}`} 
                onClick={() => setSidebarCollapsed && setSidebarCollapsed(!sidebarCollapsed)}
                style={{ marginRight: '8px' }}
                title="Toggle Sidebar"
              >
                <Menu size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button 
                className={`btn btn-ghost btn-icon ${styles['desktop-only-btn']}`} 
                onClick={() => setChatSidebarCollapsed(!chatSidebarCollapsed)}
                style={{ marginRight: '8px' }}
                title={chatSidebarCollapsed ? "Expand Conversation List" : "Collapse Conversation List"}
              >
                {chatSidebarCollapsed ? <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-secondary)', transform: 'rotate(180deg)' }} />}
              </button>
              <div className={styles.convAvatar} style={{ background: 'var(--gradient-brand)' }}>
                {activeConv.type === 'group' || activeConv.type === 'department' ? (
                  <Hash size={16} />
                ) : (
                  (partnerName?.charAt(0).toUpperCase() || 'U')
                )}
              </div>
              <div>
                <div className={styles.chatName}>
                  {activeConv.type === 'private' ? partnerName : (activeConv.name || 'GSVConnect Group')}
                </div>
                <div className={styles.chatStatus}>
                  {activeConv.type === 'private' ? (
                    (() => {
                      const isOnline = partner ? onlineUsers.has(partner.id) : false;
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <div className="search-bar" style={{ width: '160px', marginRight: '8px' }}>
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
              <div className={styles.chatActions}>
                {activeConv?.type === 'private' && partner && (
                  <button 
                    className="btn btn-xs" 
                    onClick={() => toggleBlockUser(partner.id)} 
                    style={{
                      marginRight: '8px',
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
                {activeConv && (
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setShowGroupDetails(!showGroupDetails)}
                    title="Conversation Info & Files"
                    style={{ marginRight: '8px' }}
                  >
                    <Info size={18} style={{ color: showGroupDetails ? 'var(--brand-primary)' : 'var(--text-secondary)' }} />
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
                <button 
                  className="btn btn-ghost btn-icon" 
                  onClick={() => handleCallHandshake('audio')} 
                  title="Audio Handshake"
                  style={{ cursor: 'pointer' }}
                >
                  <Phone size={18} style={{ color: 'var(--brand-primary)' }} />
                </button>
                <button 
                  className="btn btn-ghost btn-icon" 
                  onClick={() => handleCallHandshake('video')} 
                  title="Video Resonance"
                  style={{ cursor: 'pointer' }}
                >
                  <Video size={18} style={{ color: 'var(--brand-primary)' }} />
                </button>
              </div>
            </div>
          </div>

          {/* Sub-header Tab switcher for private DMs */}
          {activeConv?.type === 'private' && partner && (
            <div style={{
              display: 'flex',
              background: 'rgba(30, 41, 59, 0.4)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid var(--border-color)',
              padding: '6px 16px',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={() => setActiveChatTab('messages')}
                style={{
                  background: activeChatTab === 'messages' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: 'none',
                  color: activeChatTab === 'messages' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderBottom: activeChatTab === 'messages' ? '2px solid var(--brand-primary)' : '2px solid transparent'
                }}
              >
                Messages
              </button>
              <button
                type="button"
                onClick={() => setActiveChatTab('calls')}
                style={{
                  background: activeChatTab === 'calls' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: 'none',
                  color: activeChatTab === 'calls' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderBottom: activeChatTab === 'calls' ? '2px solid var(--brand-primary)' : '2px solid transparent'
                }}
              >
                Call History
              </button>
            </div>
          )}

          {activeChatTab === 'calls' ? (
            <div className={styles.messagesArea} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={18} style={{ color: 'var(--brand-primary)' }} />
                <span>Call Resonance History — {partnerName}</span>
              </div>
              {partnerCallLogs.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6, padding: '40px 0' }}>
                  <Volume2 size={48} style={{ marginBottom: '16px', color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: '13px' }}>No Call Resonance Logs Found</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {partnerCallLogs.map((log: any) => {
                    const isIncoming = log.status === 'incoming';
                    const isOutgoing = log.status === 'outgoing';
                    const isMissed = log.status === 'missed';
                    const isRejected = log.status === 'rejected';
                    
                    return (
                      <div key={log.id} style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(8px)',
                        border: '1.5px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)'
                      }} className="hover-glass">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: isMissed || isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: isMissed || isRejected ? '#ef4444' : '#22c55e'
                          }}>
                            {isIncoming || isMissed ? <Phone size={16} style={{ transform: 'rotate(135deg)' }} /> : <Phone size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                              {log.status === 'missed' ? 'Missed Call' : log.status === 'rejected' ? 'Rejected Call' : log.status === 'outgoing' ? 'Outgoing Call' : 'Incoming Call'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                              {new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {log.duration || '00:00'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Messages list */}
              <div className={styles.messagesArea} onScroll={handleScroll} onDragOver={handleDragOver} onDrop={handleDrop}>
                {sortedMessages.map((msg: any, i: number) => {
                  const isOwn = msg.sender_id === user?.id || msg.sender?.id === user?.id;
                  const senderName = msg.sender_name || msg.sender?.fullName || 'System Teammate';
                  const showAvatar = !isOwn && (i === 0 || sortedMessages[i - 1]?.sender_id !== msg.sender_id);
                  const hasAttachment = msg.type !== 'text' && msg.type !== undefined;

                  const reactions = messageReactions[msg.id] || [];

                  const msgDateStr = getMessageDateString(msg);
                  const prevMsgDateStr = i > 0 ? getMessageDateString(sortedMessages[i - 1]) : '';
                  const showDateDivider = msgDateStr && msgDateStr !== prevMsgDateStr;

                  return (
                    <Fragment key={msg.id || i}>
                      {showDateDivider && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          margin: '16px 0',
                          position: 'relative'
                        }}>
                          <span style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '6px 16px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                          }}>
                            {formatDividerDate(msg.created_at || msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px 0' }} className="message-row-wrapper hover-glass">
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
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    const fid = msg.folder_id || msg.folderId || msg.file_id || msg.fileId;
                                    const fName = msg.file_name || msg.fileName || "Uploaded_Folder";
                                    if (fid) {
                                      setChatBrowseFolderId(fid);
                                      setChatBrowseFolderName(fName);
                                      setFolderHistory([]);
                                    }
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--wa-border)', paddingBottom: '6px' }}>
                                    <Folder size={18} style={{ color: 'var(--wa-accent)' }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--wa-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.file_name || msg.fileName || "Uploaded_Folder/"}</div>
                                      <div style={{ fontSize: '9px', color: 'var(--wa-text-secondary)' }}>Click to open folder in chat</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>


                          </div>
                        </div>
                      )}
 

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

                      <div className={styles.messageTime} style={{ marginTop: reactions.length > 0 ? '10px' : '4px', fontWeight: 'bold' }}>
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
                                const isPartnerOnline = partnerUser ? onlineUsers.has(partnerUser.id) : false;
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
                  </Fragment>
                );
              })}
            <div ref={messagesEndRef} />
          </div>

          {showScrollBottom && (
            <button
              onClick={scrollToBottom}
              style={{
                position: 'absolute',
                bottom: '90px',
                right: '20px',
                background: 'var(--bg-secondary, #1f2c34)',
                color: 'var(--text-primary, #e9edef)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                zIndex: 20,
                transition: 'all 0.2s ease',
                animation: 'fadeInUp 0.25s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-primary, #00a884)';
                (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary, #1f2c34)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary, #e9edef)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              }}
              title="Jump to latest messages"
            >
              <ChevronDown size={22} strokeWidth={2.5} />
            </button>
          )}

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
                <button type="button" className="btn btn-danger btn-sm" disabled={selectedMessages.length === 0} onClick={deleteSelectedMessages}>
                  Delete
                </button>
                <button type="button" className="btn btn-secondary btn-sm btn-icon" onClick={() => { setSelectedMessages([]); setIsSelectionMode(false); }}><X size={14} /></button>
              </div>
            </div>
          )}

          {/* Staged attachments file list */}
          {stagedFiles.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📋 staged attachments bundle</span>
                  <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 8px', borderRadius: '12px', color: 'var(--brand-primary)' }}>
                    {stagedFiles.length} item(s)
                  </span>
                </span>
                {!sendMutation.isPending && (
                  <X size={14} style={{ color: 'var(--brand-danger)', cursor: 'pointer' }} onClick={() => setStagedFiles([])} />
                )}
              </div>

              {sendMutation.isPending ? (
                // Detailed Upload Timeline Progress
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
                  {stagedFiles.map((file, idx) => {
                    const state = uploadStates[idx] || { status: 'queued', percent: 0 };
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--border-color)', position: 'relative' }}>
                        {/* Status Icon/Timeline Indicator */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', flexShrink: 0 }} title={state.status.toUpperCase()}>
                          {state.status === 'queued' && (
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#64748b' }} />
                          )}
                          {state.status === 'uploading' && (
                            <div style={{ width: '14px', height: '14px', border: '2px solid var(--border-color)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                          )}
                          {state.status === 'completed' && (
                            <CheckCircle size={16} style={{ color: 'var(--brand-success)' }} />
                          )}
                          {state.status === 'failed' && (
                            <X size={16} style={{ color: 'var(--brand-danger)' }} />
                          )}
                        </div>

                        {/* File Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {file.type === 'folder' ? <Folder size={12} style={{ color: 'var(--brand-primary)' }} /> : <File size={12} style={{ color: 'var(--brand-primary)' }} />}
                              <span>{file.name}</span>
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                              {state.status === 'uploading' ? `Uploading ${state.percent}%` : state.status === 'queued' ? 'Queued' : state.status === 'completed' ? 'Completed' : 'Failed'}
                            </span>
                          </div>
                          
                          {/* Individual Progress bar */}
                          {state.status === 'uploading' && (
                            <div style={{ width: '100%', height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
                              <div style={{ width: `${state.percent}%`, height: '100%', background: 'var(--brand-primary)', transition: 'width 0.1s linear' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Horizontal Staged Badges before sending
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {stagedFiles.map((file, idx) => (
                    <span key={idx} style={{ background: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                      {file.type === 'folder' ? <Folder size={12} style={{ color: '#6366f1' }} /> : <File size={12} style={{ color: '#6366f1' }} />}
                      <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{file.name}</span>
                      <X size={10} style={{ color: 'var(--brand-danger)', cursor: 'pointer' }} onClick={() => setStagedFiles(prev => prev.filter((_, fIdx) => fIdx !== idx))} />
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Other users upload progress */}
          {Object.keys(otherUploads).length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(otherUploads).map(([uId, up]: any) => (
                <div key={uId} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--brand-primary)' }}>
                    <span>💬 <strong>{up.senderName}</strong> is sending <strong>{up.fileName}</strong>...</span>
                    <span>{up.percent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${up.percent}%`, height: '100%', background: 'var(--brand-primary)', transition: 'width 0.1s linear' }} />
                  </div>
                </div>
              ))}
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
              /* Standard Input control form */
              <form onSubmit={handleSend} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    title="Personal Ideas / Scratchpad"
                    onClick={() => {
                      setShowScratchpad(!showScratchpad);
                      if (!showScratchpad) {
                        setScratchpadPos({
                          x: Math.max(20, (window.innerWidth - 330) / 2),
                          y: Math.max(20, (window.innerHeight - 380) / 2)
                        });
                      }
                    }}
                  >
                    <StickyNote size={20} style={{ color: showScratchpad ? 'var(--wa-accent)' : 'var(--text-secondary)' }} />
                  </button>
                </div>
                <div className="dropdown">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    title="Attach Files/Folders"
                    onClick={() => setShowAttachmentsDropdown(!showAttachmentsDropdown)}
                  >
                    <Paperclip size={20} style={{ color: 'var(--wa-accent)' }} />
                  </button>
                  {showAttachmentsDropdown && (
                    <div className="dropdown-menu" style={{ bottom: '100%', top: 'auto', left: 0, marginBottom: '8px', display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
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
                        const isNativeApp = navigator.userAgent.includes('GSVOfficeApp');
                        if (isNativeApp) {
                          toast.error("Folder uploads are not supported on the Desktop/Mobile app. Please compress the folder into a .zip or .tar archive before uploading.");
                          return;
                        }
                        setConfirmModal({
                          title: 'Upload SMB Folder Share?',
                          message: 'This will stage all files inside your selected directory for upload to this secure chat thread. Do this only if you trust the files.',
                          iconType: 'folder',
                          confirmText: 'Select Folder',
                          cancelText: 'Cancel',
                          brandColor: 'var(--wa-accent)',
                          onConfirm: () => {
                            folderInputRef.current?.click();
                          }
                        });
                      }}>
                        📁 SMB Folder Share
                      </div>
                      <div className="dropdown-item" onClick={() => {
                        setShowAttachmentsDropdown(false);
                        setShowNoteEditor(true);
                      }}>
                        📝 Create Note
                      </div>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={message}
                  onChange={e => handleInputChange(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Type secure signal resonance (@ to mention)..."
                  className={styles.messageInput}
                  disabled={sendMutation.isPending}
                  autoFocus
                  style={{ background: 'var(--wa-sidebar)', color: 'var(--wa-text-primary)', border: '1.5px solid var(--wa-border)', boxShadow: '0 2px 10px rgba(0, 168, 132, 0.08)', fontWeight: 500, fontSize: '15px' }}
                />

                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  title="Emoji resonance picker"
                  onClick={() => setShowEmoji(!showEmoji)}
                >
                  <Smile size={20} style={{ color: 'var(--wa-accent)' }} />
                </button>

                {showEmoji && (
                  <div style={{
                    position: 'absolute', bottom: '100%', right: '60px', marginBottom: '8px', zIndex: 1000,
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px',
                    padding: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', maxWidth: '240px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }} className="animate-scale-in">
                    {['😀','😂','🔥','👍','🎉','🚀','👏','❤️','🔒','🤖','😮','😢','🙏','🌟','💡','💻','📈','🎨','✈️','🍕','🎈','🧸','👑','🎯'].map(emoji => (
                      <span
                        key={emoji}
                        onClick={() => { setMessage(prev => prev + emoji); setShowEmoji(false); }}
                        style={{ fontSize: '20px', cursor: 'pointer', padding: '4px' }}
                        className="hover-glass"
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}

                {message.trim() || stagedFiles.length > 0 ? (
                  <button
                    type="submit"
                    disabled={sendMutation.isPending}
                    className={`${styles.sendBtn} ${styles.sendBtnActive}`}
                    title="Send secure signal"
                  >
                    <Send size={20} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.sendBtn}
                    title={micPermission === 'granted' ? "Voice Recording Handshake (Connected)" : micPermission === 'denied' ? "Microphone Access Blocked" : "Voice Recording Handshake"}
                    onClick={handleMicClick}
                    style={{
                      color: micPermission === 'granted' ? 'var(--brand-success)' : micPermission === 'denied' ? 'var(--brand-danger)' : 'var(--wa-accent)',
                      position: 'relative'
                    }}
                  >
                    <Mic size={20} />
                    <span style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      border: '1.5px solid var(--wa-sidebar)',
                      background: micPermission === 'granted' ? 'var(--brand-success)' : micPermission === 'denied' ? 'var(--brand-danger)' : 'var(--brand-warning)'
                    }} />
                  </button>
                )}

                <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept={uploadAccept === '*' ? undefined : uploadAccept} onChange={e => handleFileUpload(e, false)} />
                <input
                  key={folderInputKey}
                  type="file"
                  ref={folderInputRef}
                  style={{ display: 'none' }}
                  {...{ webkitdirectory: "", directory: "", multiple: true } as any}
                  onChange={e => handleFileUpload(e, true)}
                />
              </form>
            )}

            {sendMutation.isPending && stagedFiles.length > 0 && (
              <div style={{
                position: 'absolute', bottom: '80px', right: '20px', zIndex: 1100,
                background: 'var(--bg-card)', border: '1.5px solid var(--brand-primary)',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)', borderRadius: '12px',
                padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px',
                color: 'var(--text-primary)', backdropFilter: 'blur(8px)', animation: 'slideUp 0.3s ease',
                minWidth: '240px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '18px', height: '18px', border: '2px solid var(--border-color)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--brand-primary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>
                        {uploadProgress 
                          ? `Uploading ${uploadProgress.current} of ${uploadProgress.total}`
                          : `Uploading ${stagedFiles.length > 1 ? `${stagedFiles.length} Attachments` : 'Attachment'}`}
                      </span>
                      {uploadProgressPercent !== null && (
                        <span>{uploadProgressPercent}%</span>
                      )}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 500, opacity: 0.9, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {uploadProgress
                        ? stagedFiles[uploadProgress.current - 1]?.name
                        : (stagedFiles.length > 1 ? `${stagedFiles.length} files staged` : stagedFiles[0]?.name)}
                    </span>
                  </div>
                </div>
                {uploadProgressPercent !== null && (
                  <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgressPercent}%`, height: '100%', background: 'var(--brand-primary)', transition: 'width 0.1s linear' }} />
                  </div>
                )}
              </div>
            )}
          </div>
          </>
          )}

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
                          background: (partner && onlineUsers.has(partner.id)) ? 'rgba(74, 222, 128, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: (partner && onlineUsers.has(partner.id)) ? 'var(--brand-success)' : 'var(--text-secondary)'
                        }}>
                          {(partner && onlineUsers.has(partner.id)) ? '🟢 Online' : '⚪ Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', width: '100%' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #00a884, #005c4b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '28px', fontWeight: 'bold' }}>
                      {(isEditingGroup ? editGroupName : activeConv.name)?.charAt(0).toUpperCase() || 'G'}
                    </div>
                    {isEditingGroup ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px' }}>
                        <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                          <label className="form-label" style={{ fontSize: '11px', marginBottom: '2px', fontWeight: 600 }}>Group Name</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editGroupName}
                            onChange={(e) => setEditGroupName(e.target.value)}
                            placeholder="Group Name"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0, textAlign: 'left' }}>
                          <label className="form-label" style={{ fontSize: '11px', marginBottom: '2px', fontWeight: 600 }}>Description</label>
                          <textarea
                            className="form-control form-control-sm"
                            value={editGroupDesc}
                            onChange={(e) => setEditGroupDesc(e.target.value)}
                            placeholder="Description of the group..."
                            style={{ minHeight: '50px', resize: 'vertical', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => {
                              setIsEditingGroup(false);
                              setEditGroupName(activeConv.name || '');
                              setEditGroupDesc(activeConv.description || '');
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={handleUpdateGroupDetails}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}>
                          <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }} title={activeConv.name}>
                            {activeConv.name}
                          </div>
                          {isCurrentUserAdmin && activeConv.type === 'group' && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-xs"
                              onClick={() => {
                                setEditGroupName(activeConv.name || '');
                                setEditGroupDesc(activeConv.description || '');
                                setIsEditingGroup(true);
                              }}
                              title="Rename Group"
                              style={{ padding: 0, width: '18px', height: '18px', minHeight: '18px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', wordBreak: 'break-word', padding: '0 8px' }}>
                          {activeConv.description || 'GSVConnect secure group channel'}
                        </div>
                      </>
                    )}
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
                  {isCurrentUserAdmin && activeConv?.type === 'group' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--brand-danger)', border: '1px solid rgba(239, 68, 68, 0.3)', width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}
                      onClick={() => {
                        setConfirmModal({
                          title: 'Delete Group for Everyone?',
                          message: 'Are you sure you want to permanently delete this group? This action cannot be undone and will delete the conversation for all members.',
                          iconType: 'trash',
                          confirmText: 'Delete Group',
                          brandColor: 'var(--brand-danger)',
                          onConfirm: async () => {
                            try {
                              await chatApi.deleteConversation(activeConv.id, true);
                              toast.success('Group deleted for everyone.');
                              qc.invalidateQueries({ queryKey: ['conversations'] });
                              navigate('/chat');
                            } catch (err: any) {
                              toast.error(err.response?.data?.message || err.message || 'Failed to delete group');
                            }
                          }
                        });
                      }}
                    >
                      💥 Delete Group for Everyone
                    </button>
                  )}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          👥 Active Members ({activeConv?.members?.length || 1})
                        </div>
                        {isCurrentUserAdmin && activeConv?.type === 'group' && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-xs"
                            onClick={() => setShowInviteModal(true)}
                            title="Invite Member"
                            style={{ padding: 0, width: '20px', height: '20px', color: 'var(--brand-primary)' }}
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {activeConv?.members?.map((m: any) => {
                          const isSelf = m.id === user?.id;
                          const isAdmin = m.role === 'admin';
                          return (
                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                <div style={{ 
                                  width: '24px', 
                                  height: '24px', 
                                  borderRadius: '50%', 
                                  background: isSelf ? 'var(--gradient-brand)' : 'var(--bg-secondary)', 
                                  color: isSelf ? 'white' : 'var(--text-secondary)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  fontSize: '10px', 
                                  fontWeight: 'bold',
                                  flexShrink: 0
                                }}>
                                  {isSelf ? 'ME' : initials(m.fullName)}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <span style={{ fontSize: '12px', fontWeight: isSelf ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {m.fullName} {isSelf && ' (You)'}
                                  </span>
                                  {isAdmin && (
                                    <span style={{ fontSize: '9px', color: 'var(--brand-primary)', fontWeight: 600 }}>
                                      Admin
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Admin actions */}
                              {isCurrentUserAdmin && activeConv?.type === 'group' && !isSelf && (
                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-xs"
                                    style={{ fontSize: '10px', padding: '2px 4px', height: '20px' }}
                                    onClick={() => handleUpdateMemberRole(m.id, isAdmin ? 'member' : 'admin')}
                                  >
                                    {isAdmin ? 'Demote' : 'Promote'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-xs text-danger"
                                    style={{ fontSize: '10px', padding: '2px 4px', height: '20px', color: 'var(--brand-danger)' }}
                                    onClick={() => {
                                      if (confirm(`Remove ${m.fullName} from this group?`)) {
                                        handleRemoveMember(m.id);
                                      }
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
              Welcome to GSVConnect 🔒
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '340px', margin: '0 auto', lineHeight: 1.6 }}>
              Select a secure department room, custom group, or teammate from the sidebar to start messaging on GSVConnect.
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

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowInviteModal(false)}>
          <div className="modal animate-scale-in" style={{ maxWidth: '440px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h4 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} style={{ color: 'var(--brand-primary)' }} />
                Invite Member to Group
              </h4>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowInviteModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Select a teammate to invite to **{activeConv?.name}**:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {otherUsers.filter((u: any) => !activeConv?.members?.some((m: any) => m.id === u.id)).length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '12px 0' }}>
                    All teammates are already in this group.
                  </div>
                ) : (
                  otherUsers
                    .filter((u: any) => !activeConv?.members?.some((m: any) => m.id === u.id))
                    .map((u: any) => (
                      <div 
                        key={u.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '8px 12px', 
                          background: 'var(--bg-secondary)', 
                          borderRadius: '8px', 
                          border: '1px solid var(--border-color)' 
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--wa-accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                            {initials(u.fullName)}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{u.fullName}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>@{u.loginId}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => handleInviteMember(u.id)}
                        >
                          Invite
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowInviteModal(false)}>Cancel</button>
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

          {(msgContextMenu.msg.file_url || msgContextMenu.msg.fileUrl || msgContextMenu.msg.type === 'folder') && (
            <div className="dropdown-item" onClick={async () => {
              if (msgContextMenu.msg.type === 'folder') {
                const fid = msgContextMenu.msg.folder_id || msgContextMenu.msg.folderId || msgContextMenu.msg.file_id || msgContextMenu.msg.fileId;
                if (fid) {
                  const toastId = toast.loading(`Preparing folder archive for download...`);
                  try {
                    const response = await filesApi.downloadFolder(fid);
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `${msgContextMenu.msg.file_name || msgContextMenu.msg.fileName || 'Archive'}.zip`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    toast.success(`Downloaded successfully!`, { id: toastId });
                  } catch (err: any) {
                    toast.error(`Failed to download folder: ${err.message || 'Server error'}`, { id: toastId });
                  }
                }
              } else {
                handleSaveToPC(msgContextMenu.msg.file_name || msgContextMenu.msg.fileName || 'file', '', msgContextMenu.msg.file_url || msgContextMenu.msg.fileUrl);
              }
              setMsgContextMenu(null);
            }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
              <Download size={15} /> Copy to PC (Download)
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

          {(msgContextMenu.msg.file_id || msgContextMenu.msg.fileId || msgContextMenu.msg.type === 'folder') && (
            <div className="dropdown-item" onClick={() => {
              const fid = msgContextMenu.msg.type === 'folder' 
                ? (msgContextMenu.msg.folder_id || msgContextMenu.msg.folderId || msgContextMenu.msg.file_id || msgContextMenu.msg.fileId)
                : (msgContextMenu.msg.file_id || msgContextMenu.msg.fileId);
              if (fid) {
                handleSaveToCloud(fid);
              }
              setMsgContextMenu(null);
            }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
              <Sparkles size={15} /> Save to Cloud
            </div>
          )}

          {msgContextMenu.msg.type === 'folder' && (
            <>
              <div className="dropdown-item" onClick={async () => {
                const fid = msgContextMenu.msg.folder_id || msgContextMenu.msg.folderId || msgContextMenu.msg.file_id || msgContextMenu.msg.fileId;
                const fname = msgContextMenu.msg.file_name || msgContextMenu.msg.fileName || 'Shared_Folder';
                if (fid) {
                  const toastId = toast.loading(`Preparing folder "${fname}" download...`);
                  try {
                    const response = await filesApi.downloadFolder(fid);
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `${fname}.zip`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    window.URL.revokeObjectURL(url);
                    toast.success(`Downloaded "${fname}" successfully!`, { id: toastId });
                  } catch (err: any) {
                    toast.error(`Failed to download folder: ${err.message || 'Server error'}`, { id: toastId });
                  }
                }
                setMsgContextMenu(null);
              }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
                <Download size={15} /> Download Folder
              </div>
              <div className="dropdown-item" onClick={() => {
                const fid = msgContextMenu.msg.folder_id || msgContextMenu.msg.folderId || msgContextMenu.msg.file_id || msgContextMenu.msg.fileId;
                const fName = msgContextMenu.msg.file_name || msgContextMenu.msg.fileName || "Uploaded_Folder";
                if (fid) {
                  setChatBrowseFolderId(fid);
                  setChatBrowseFolderName(fName);
                  setFolderHistory([]);
                }
                setMsgContextMenu(null);
              }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600 }}>
                <Folder size={15} /> Open Folder in Chat
              </div>
            </>
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

      {/* Floating Draggable Scratchpad (Personal Ideas) */}
      {showScratchpad && (
        <div 
          id="scratchpad-popup"
          style={{
            position: 'fixed',
            left: isScratchpadMaximized ? '5vw' : `${scratchpadPos.x}px`,
            top: isScratchpadMaximized ? '5vh' : `${scratchpadPos.y}px`,
            width: isScratchpadMaximized ? '90vw' : '330px',
            height: isScratchpadMaximized ? '90vh' : '380px',
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '12px',
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)', 
            overflow: 'hidden',
            zIndex: 1000,
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
                          navigator.clipboard.writeText(scratchpadText);
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
                  navigator.clipboard.writeText(scratchpadText);
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
