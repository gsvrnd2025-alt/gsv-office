import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send, Plus, Search, MessageSquare, Hash, Phone, Video,
  MoreVertical, Smile, Paperclip, CheckCheck, Check, File, Image,
  Download, Folder, Volume2, ChevronRight, ChevronLeft, X, Users2,
  Pin, ArrowRight, Mic, Sparkles, Copy, Trash2, Menu, CheckSquare, Info
} from 'lucide-react';
import { chatApi, usersApi, filesApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
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
  const { sidebarCollapsed, setSidebarCollapsed } = useOutletContext<any>() || {};
  const { user } = useAuthStore();
  const qc = useQueryClient();

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
  
  // Calling resonance state
  const [incomingCall, setIncomingCall] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState(false);
  const [callingState, setCallingState] = useState<'idle' | 'calling' | 'connected'>('idle');

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

  // Click outside to dismiss context menu
  useEffect(() => {
    const handleClose = () => setMsgContextMenu(null);
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

  // Mutations
  const sendMutation = useMutation({
    mutationFn: async (payload: { content: string; type?: string; files?: any[]; tempId?: string }) => {
      if (payload.files && payload.files.length > 0) {
        if (payload.type === 'folder') {
          const staged = payload.files[0];
          const fd = new FormData();
          let folderId = undefined;
          let fileName = undefined;
          
          try {
            staged.files.forEach((file: File) => {
              fd.append('files', file);
            });
            const relativePaths = staged.files.map((file: any) => file.webkitRelativePath || file.name);
            fd.append('relativePaths', JSON.stringify(relativePaths));
            const folderName = staged.name.split('/')[0] || 'Uploaded_Folder';
            fd.append('folderName', folderName);
            const uploadRes = await filesApi.uploadFolder(fd, (progressEvent: any) => {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgressPercent(percent);
            });
            const fileData = uploadRes.data?.data || uploadRes.data;
            if (fileData) {
              folderId = fileData.id;
              fileName = fileData.name || folderName;
            }
          } catch (err) {
            console.error('Folder upload failed in chat propagation:', err);
            toast.error('Folder upload failed.');
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
        const totalSize = files.reduce((acc, f) => acc + f.size, 0);
        
        const stagedFolder = {
          name: `${folderName}/ (${files.length} files)`,
          size: (totalSize / 1024 / 1024).toFixed(1) + ' MB',
          blob: files[0],
          files: files,
          type: 'folder'
        };
        setStagedFiles(prev => [...prev, stagedFolder]);
        toast.success(`Folder "${folderName}" (${files.length} files) staged successfully! 📁`);
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

  const handleCallHandshake = (type: 'audio' | 'video') => {
    if (activeConv && activeConv.type === 'private') {
      const partnerName = activeConv.name?.replace('DM with ', '');
      const partnerUser = otherUsers.find(
        (u: any) => u.fullName.toLowerCase() === partnerName?.toLowerCase() || u.loginId.toLowerCase() === partnerName?.toLowerCase()
      );
      const isPartnerOnline = partnerUser ? partnerUser.isOnline : false;
      if (!isPartnerOnline) {
        toast.error(`Teammate "${partnerName || 'User'}" is offline. Call handshakes are blocked.`);
        return;
      }
    }

    setCallingState('calling');
    setActiveCall(true);
    toast(`Initiating secure ${type} handshake resonance... 📞`);
    setTimeout(() => {
      setCallingState('connected');
      toast.success('Link Established! Nodal resonance synced.');
    }, 2500);
  };

  const simulateIncomingCall = () => {
    setIncomingCall(activeConv?.name || 'Jane Doe');
  };

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
    <div className={styles.chatLayout} style={{ animation: 'slideUp 0.3s ease', position: 'relative' }}>
      
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
          <h2 className={styles.convTitle}>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => setChatSidebarCollapsed(true)}
              style={{ marginRight: '6px', width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              title="Collapse Conversation List"
            >
              <ChevronLeft size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <MessageSquare size={18} style={{ color: 'var(--brand-primary)' }} />
            Node Matrix
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
              <button 
                className="btn btn-ghost btn-icon" 
                onClick={() => setSidebarCollapsed && setSidebarCollapsed(!sidebarCollapsed)}
                style={{ marginRight: '8px' }}
                title="Toggle Sidebar"
              >
                <Menu size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button 
                className="btn btn-ghost btn-icon" 
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
                {(() => {
                  let isOffline = false;
                  if (activeConv && activeConv.type === 'private') {
                    const partnerName = activeConv.name?.replace('DM with ', '');
                    const partnerUser = otherUsers.find(
                      (u: any) => u.fullName?.toLowerCase() === partnerName?.toLowerCase() || u.loginId?.toLowerCase() === partnerName?.toLowerCase()
                    );
                    isOffline = partnerUser ? !partnerUser.isOnline : true;
                  }
                  return (
                    <>
                      <button 
                        className="btn btn-ghost btn-icon" 
                        onClick={() => handleCallHandshake('audio')} 
                        disabled={isOffline}
                        title={isOffline ? "Teammate offline" : "Audio Handshake"}
                        style={{ opacity: isOffline ? 0.4 : 1, cursor: isOffline ? 'not-allowed' : 'pointer' }}
                      >
                        <Phone size={18} style={{ color: isOffline ? 'var(--text-tertiary)' : 'var(--brand-primary)' }} />
                      </button>
                      <button 
                        className="btn btn-ghost btn-icon" 
                        onClick={() => handleCallHandshake('video')} 
                        disabled={isOffline}
                        title={isOffline ? "Teammate offline" : "Video Resonance"}
                        style={{ opacity: isOffline ? 0.4 : 1, cursor: isOffline ? 'not-allowed' : 'pointer' }}
                      >
                        <Video size={18} style={{ color: isOffline ? 'var(--text-tertiary)' : 'var(--brand-primary)' }} />
                      </button>
                    </>
                  );
                })()}
                <button className="btn btn-ghost btn-icon" onClick={simulateIncomingCall} title="Simulate Call"><MoreVertical size={18} /></button>
              </div>
            </div>
          </div>

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
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    const fid = msg.folder_id || msg.folderId || msg.file_id || msg.fileId;
                                    if (fid) {
                                      navigate(`/files?folderId=${fid}`);
                                    }
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--wa-border)', paddingBottom: '6px' }}>
                                    <Folder size={18} style={{ color: 'var(--wa-accent)' }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--wa-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.file_name || msg.fileName || "Uploaded_Folder/"}</div>
                                      <div style={{ fontSize: '9px', color: 'var(--wa-text-secondary)' }}>Click to view in Cloud Files</div>
                                    </div>
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
                            <Copy size={18} />
                          </span>
                          <span title="Pin Message" onClick={() => setPinnedMessage(msg)} style={{ display: 'inline-flex', cursor: 'pointer', color: isOwn ? 'var(--wa-own-text)' : 'var(--wa-other-text)' }}>
                            <Pin size={18} />
                          </span>
                          <span title="Forward Message" onClick={() => setForwardingMsg(msg)} style={{ display: 'inline-flex', cursor: 'pointer', color: isOwn ? 'var(--wa-own-text)' : 'var(--wa-other-text)' }}>
                            <ArrowRight size={18} />
                          </span>
                          {isOwn && (
                            <span title="Delete Message" onClick={() => {
                              setConfirmModal({
                                title: 'Delete Message',
                                message: 'Are you sure you want to delete this message permanently?',
                                onConfirm: () => deleteMessageMutation.mutate(msg.id)
                              });
                            }} style={{ display: 'inline-flex', cursor: 'pointer', color: 'var(--brand-danger)' }}>
                              <Trash2 size={18} />
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
              /* Standard Input control form */
              <form onSubmit={handleSend} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      {/* Incoming Call Overlay */}
      {incomingCall && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal animate-scale-in" style={{ maxWidth: '340px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--brand-primary)' }}>
            <div style={{ padding: '24px 20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--brand-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>
                <Phone size={22} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>INCOMING RESONANCE</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '24px' }}>Node <strong>{incomingCall}</strong> is requesting audio handshake link.</p>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-danger btn-sm rounded-pill px-4" onClick={() => setIncomingCall(null)}>REJECT</button>
                <button className="btn btn-success btn-sm rounded-pill px-4" onClick={() => { setIncomingCall(null); setActiveCall(true); setCallingState('connected'); toast.success('Link Established! Resonance synced.'); }}>ESTABLISH</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Resonance HUD */}
      {activeCall && (
        <div style={{
          position: 'absolute', bottom: '24px', right: '24px',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: '16px', padding: '16px 20px', zIndex: 1100, display: 'flex', alignItems: 'center', gap: '20px',
          boxShadow: '0 12px 40px rgba(99, 102, 241, 0.25)', animation: 'slideUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: callingState === 'connected' ? 'var(--brand-success)' : 'var(--brand-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)',
              animation: 'pulse 1.5s infinite'
            }}>
              <Phone size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {callingState === 'connected' ? 'SECURE NODE ESTABLISHED' : 'INITIATING HANDSHAKE...'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                {callingState === 'connected' ? 'Resonance active.' : 'Handshake active.'}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-danger btn-sm btn-icon"
            onClick={() => { setActiveCall(false); setCallingState('idle'); toast.error('Resonance terminated.'); }}
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
          >
            <X size={14} />
          </button>
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

          {(msgContextMenu.msg.file_url || msgContextMenu.msg.fileUrl) && (
            <div className="dropdown-item" onClick={() => {
              handleSaveToPC(msgContextMenu.msg.file_name || msgContextMenu.msg.fileName || 'file', '', msgContextMenu.msg.file_url || msgContextMenu.msg.fileUrl);
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
              <p>The application could not access your microphone. To enable secure voice note recordings, please follow these steps:</p>
              <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Look at the top-left of your browser window (near the URL address bar).</li>
                <li>Click on the <strong>Lock icon (🔒)</strong> or <strong>Site Settings icon</strong>.</li>
                <li>Find <strong>Microphone</strong> in the settings dropdown.</li>
                <li>Toggle the switch to <strong>Allow</strong>.</li>
                <li>Reload the page to apply the settings and start recording!</li>
              </ol>
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
