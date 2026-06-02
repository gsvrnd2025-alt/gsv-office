import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send, Plus, Search, MessageSquare, Hash, Phone, Video,
  MoreVertical, Smile, Paperclip, CheckCheck, Check, File, Image,
  Download, Folder, Volume2, ChevronRight, X, Users2,
  Pin, ArrowRight, Mic, Sparkles, Copy, Trash2, Menu
} from 'lucide-react';
import { chatApi, usersApi, filesApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { SoundManager } from '../../utils/sound';
import toast from 'react-hot-toast';
import styles from './ChatPage.module.css';

interface StagedFile {
  name: string;
  size: string;
  blob: File;
  type: string;
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { sidebarCollapsed, setSidebarCollapsed } = useOutletContext<any>() || {};
  const { user } = useAuthStore();
  const qc = useQueryClient();

  // Standard states
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'channels' | 'dms' | 'groups' | 'online' | 'teammates' | 'bookmarks'>('all');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  
  // Custom states
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', members: [] as string[] });
  
  // Calling resonance state
  const [incomingCall, setIncomingCall] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState(false);
  const [callingState, setCallingState] = useState<'idle' | 'calling' | 'connected'>('idle');

  // WhatsApp-style Custom Features
  const [showAttachmentsDropdown, setShowAttachmentsDropdown] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [sendingMessages, setSendingMessages] = useState<any[]>([]);
  const [uploadAccept, setUploadAccept] = useState('*');
  
  // 1. Mentions (@) popup
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  
  // 2. Message Pinning
  const [pinnedMessage, setPinnedMessage] = useState<any>(null);

  // 3. Message Forwarding
  const [forwardingMsg, setForwardingMsg] = useState<any>(null);
  const [forwardTargets, setForwardTargets] = useState<string[]>([]);

  // 4. Voice Recorder HUD Simulation
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);

  // Lightbox / File Preview Modal
  const [previewFile, setPreviewFile] = useState<{ url: string, name: string, type: string } | null>(null);

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
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName || 'download';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Download initiated! 💾');
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

  const handleShareFile = async (msg: any) => {
    const url = msg.file_url || msg.fileUrl;
    const name = msg.file_name || msg.fileName || 'Shared file';
    if (!url) {
      toast.error('No link available to share.');
      return;
    }
    const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: `Shared via GSV Office: ${name}`,
          url: absoluteUrl,
        });
        toast.success('Shared successfully!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error('Failed to share.');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(absoluteUrl);
        toast.success('Link copied to clipboard! 🔗');
      } catch {
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
    queryFn: () => chatApi.getMessages(conversationId!).then(r => r.data?.data || r.data || []),
    enabled: !!conversationId,
    refetchInterval: 2000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', '', '', 1],
    queryFn: () => usersApi.getAll().then(r => r.data?.data || r.data || []),
  });

  const users = usersData?.data ? usersData.data : (Array.isArray(usersData) ? usersData : []);
  const otherUsers = users.filter((u: any) => u.id !== user?.id);

  // Mutations
  const sendMutation = useMutation({
    mutationFn: async (payload: { content: string; type?: string; files?: any[]; tempId?: string }) => {
      let fileId = undefined;
      let fileName = undefined;
      let fileUrl = undefined;
      let fileSize = undefined;
      let mimeType = undefined;

      if (payload.files && payload.files.length > 0) {
        const staged = payload.files[0];
        const fd = new FormData();
        fd.append('file', staged.blob);
        
        try {
          const uploadRes = await filesApi.upload(fd);
          const fileData = uploadRes.data?.data || uploadRes.data;
          if (fileData) {
            fileId = fileData.id;
            fileName = fileData.originalName || fileData.name;
            fileUrl = fileData.storageUrl || fileData.url;
            fileSize = fileData.size || fileData.sizeBytes;
            mimeType = fileData.mimeType;
          }
        } catch (err) {
          console.error('File upload failed in chat propagation:', err);
          toast.error('File upload failed, sending text only.');
        }
      }

      return chatApi.sendMessage(conversationId!, {
        content: payload.content,
        type: payload.type || 'text',
        fileId,
        fileName,
        fileUrl,
        fileSize,
        mimeType
      }).then(r => r.data?.data || r.data);
    },
    onSuccess: (data, variables) => {
      setMessage('');
      setStagedFiles([]);
      if (variables.tempId) {
        setSendingMessages(prev => prev.filter(m => m.id !== variables.tempId));
      }
      qc.invalidateQueries({ queryKey: ['messages', conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err, variables) => {
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
      qc.invalidateQueries({ queryKey: ['conversations'] });
      if (newRoom.id) navigate(`/chat/${newRoom.id}`);
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

  // 1. Play Ding-Dong chime and scroll for new messages in the currently active chat room
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    if (messages.length > prevMessagesLengthRef.current) {
      const lastMsg = messages[messages.length - 1];
      // Only play the sound if the message exists and was not sent by the logged-in user
      if (lastMsg && lastMsg.sender_id !== user?.id && lastMsg.sender?.id !== user?.id) {
        SoundManager.playNotification();
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, user?.id]);

  // 2. Play Ding-Dong chime for new background messages (across all conversations unread sum)
  const prevUnreadCountSumRef = useRef(0);
  useEffect(() => {
    const currentUnreadSum = conversations.reduce((acc: number, c: any) => acc + (Number(c.unread_count) || 0), 0);
    if (currentUnreadSum > prevUnreadCountSumRef.current) {
      SoundManager.playNotification();
    }
    prevUnreadCountSumRef.current = currentUnreadSum;
  }, [conversations]);

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
  const startRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(s => s + 1);
    }, 1000);
    toast('🎤 Voice recorder HUD active. Fluctuating wave resonance initialized.');
  };

  const stopRecording = (discard = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    
    if (!discard) {
      // Simulate sending voice audio file
      sendMutation.mutate({
        content: `🎤 Simulated Voice Note (${formatRecordTime(recordingSeconds)})`,
        type: 'music'
      });
      toast.success('Voice message staged & sent successfully! 📻');
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
      content: message.trim() || (stagedFiles.length > 0 ? `Sent staged ${stagedFiles.length} payload(s)` : ''),
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
        content: message.trim() || `Sent staged ${stagedFiles.length} payload(s)`,
        type: attachmentType,
        files: stagedFiles,
        tempId
      });
      toast.success('Attachment payload propagated securely. 📦');
    } else {
      sendMutation.mutate({ content: message.trim(), tempId });
    }
  };

  const handleForwardMessage = async () => {
    if (!forwardingMsg || forwardTargets.length === 0) return;
    try {
      await Promise.all(forwardTargets.map(targetId => 
        chatApi.sendMessage(targetId, {
          content: `➡️ Forwarded Signal: ${forwardingMsg.content || ''}`,
          type: forwardingMsg.type || 'text',
          fileId: forwardingMsg.file_id || forwardingMsg.fileId,
          fileName: forwardingMsg.file_name || forwardingMsg.fileName,
          fileUrl: forwardingMsg.file_url || forwardingMsg.fileUrl,
          fileSize: forwardingMsg.file_size || forwardingMsg.fileSize,
          mimeType: forwardingMsg.mime_type || forwardingMsg.mimeType
        })
      ));
      toast.success(`Message forwarded securely to ${forwardTargets.length} node(s) 🚀`);
    } catch (e) {
      toast.error(`Partial forwarding failure. Some nodes unreachable.`);
    }
    setForwardingMsg(null);
    setForwardTargets([]);
  };

  const startDM = async (targetUser: any) => {
    const existing = conversations.find(
      (c: any) => c.type === 'private' && 
        (c.name?.toLowerCase().includes(targetUser.fullName.toLowerCase()) || 
         c.name?.toLowerCase().includes(targetUser.loginId.toLowerCase()))
    );
    if (existing) {
      navigate(`/chat/${existing.id}`);
      return;
    }

    createGroupMutation.mutate({
      name: `DM with ${targetUser.fullName}`,
      description: `Direct secure handshake with ${targetUser.fullName}`,
      type: 'private',
      members: [targetUser.id]
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isFolder = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (isFolder) {
        const relativePath = (files[0] as any).webkitRelativePath || '';
        const folderName = relativePath.split('/')[0] || 'Staged Folder';
        const totalSize = files.reduce((acc, f) => acc + f.size, 0);
        
        const stagedFolder = {
          name: `${folderName}/ (${files.length} files)`,
          size: (totalSize / 1024 / 1024).toFixed(1) + ' MB',
          blob: files[0],
          type: 'folder'
        };
        setStagedFiles(prev => [...prev, stagedFolder]);
        toast.success(`Folder "${folderName}" (${files.length} files) staged successfully! 📁`);
      } else {
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
      const staged = files.map(file => {
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
      toast.success(`${files.length} pasted file(s) staged successfully! 📋`);
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

  const activeConv = conversations.find((c: any) => c.id === conversationId);
  
  // Sort messages chronologically: oldest first, newest last (WhatsApp style)
  let sortedMessages = [...messages].sort((a: any, b: any) => {
    const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
    const timeB = new Date(b.created_at || b.createdAt || 0).getTime();
    return timeA - timeB;
  });
  sortedMessages = [...sortedMessages, ...sendingMessages];
  if (fileSearch.trim()) {
    const query = fileSearch.toLowerCase();
    sortedMessages = sortedMessages.filter(
      (m: any) => m.type !== 'text' && (
        m.content?.toLowerCase().includes(query) || 
        m.type?.toLowerCase().includes(query) ||
        m.file_name?.toLowerCase().includes(query) ||
        m.fileName?.toLowerCase().includes(query)
      )
    );
  }

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
    // Regex for URLs, emails, phone numbers
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{4})/g;

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
          <a key={idx} href={`mailto:${part}`} style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
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
    <div className={styles.chatLayout} style={{ animation: 'slideUp 0.3s ease' }}>
      
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
            {previewFile.type === 'photo' && (
              <img src={previewFile.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} alt={previewFile.name} onClick={(e) => e.stopPropagation()} />
            )}
            {previewFile.type === 'video' && (
              <video src={previewFile.url} controls style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()} autoPlay />
            )}
            {previewFile.type === 'pdf' && (
              <div style={{ width: '90%', height: '85%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
                <iframe src={previewFile.url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', background: '#fff' }} title={previewFile.name}></iframe>
              </div>
            )}
            {previewFile.type !== 'photo' && previewFile.type !== 'video' && previewFile.type !== 'pdf' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', color: '#fff' }} onClick={(e) => e.stopPropagation()}>
                <File size={80} style={{ color: 'var(--wa-accent)', opacity: 0.8 }} />
                <div style={{ fontSize: '16px' }}>No preview available for this file type.</div>
                <button className="btn btn-primary" onClick={() => handleSaveToPC(previewFile.name, '', previewFile.url)}>
                  <Download size={16} /> Download File
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={styles.convSidebar}>
        <div className={styles.convHeader}>
          <h2 className={styles.convTitle}>
            <MessageSquare size={18} style={{ color: 'var(--brand-primary)' }} />
            Node Matrix
          </h2>
          <button className="btn btn-primary btn-sm btn-icon" onClick={() => setShowCreateGroup(true)} title="Create group channel">
            <Plus size={16} />
          </button>
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
              className="form-control"
              style={{ paddingLeft: '36px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className={styles.filterScrollContainer}>
          {[
            { key: 'all', label: 'All' },
            { key: 'dms', label: 'DMs' },
            { key: 'groups', label: 'Groups' },
            { key: 'channels', label: 'Channels' },
            { key: 'online', label: 'Online' },
            { key: 'teammates', label: 'Contacts' },
            { key: 'bookmarks', label: 'Bookmarks' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveFilter(t.key as any)}
              className={`${styles.filterPill} ${activeFilter === t.key ? styles.filterPillActive : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Active Conversations Section */}
        {activeFilter !== 'teammates' && activeFilter !== 'bookmarks' && (
        <div className={`${styles.sidebarSection} ${styles.activeConversationsSection}`}>
          <div className={styles.convList}>
            {filteredConvs.map((conv: any) => (
              <div
                key={conv.id}
                className={`${styles.convItem} ${conv.id === conversationId ? styles.active : ''}`}
                onClick={() => navigate(`/chat/${conv.id}`)}
                style={{
                  borderRadius: '8px', margin: '4px 8px', padding: '8px 12px',
                  borderLeft: conv.id === conversationId ? '4px solid #6366f1' : '4px solid transparent'
                }}
              >
                <div className={`${styles.convAvatar} ${conv.type === 'group' || conv.type === 'department' ? styles.groupAvatar : ''}`} style={{ background: 'var(--gradient-brand)' }}>
                  {conv.type === 'group' || conv.type === 'department' ? <Hash size={16} /> : (conv.name?.charAt(0).toUpperCase() || 'U')}
                </div>
                <div className={styles.convMeta}>
                  <div className={styles.convName}>
                    <span style={{ fontWeight: 600 }}>{conv.name || 'Secure DM'}</span>
                  </div>
                  <div className={styles.convPreview}>
                    <span>{conv.last_message_preview || 'Ready to resonance.'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Teammates Directory Section */}
        {activeFilter === 'teammates' && (
        <div className={`${styles.sidebarSection} ${styles.teammatesSection}`}>
          <div className={styles.sectionHeader}>
            👥 Teammate Directories DMs
          </div>
          <div className={styles.sectionList}>
            {displayedTeammates.map((u: any) => (
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
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{u.isOnline ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Bookmarks Section */}
        {activeFilter === 'bookmarks' && (
        <div className={`${styles.sidebarSection} ${styles.bookmarksSection}`}>
          <div className={styles.sectionHeader}>
            <span>🔖 Bookmarked Files</span>
            <span className="badge badge-primary" style={{ fontSize: '9px', padding: '1px 4px' }}>{bookmarks.length}</span>
          </div>
          <div className={styles.sectionList}>
            {displayedBookmarks.length === 0 ? (
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', padding: '4px 12px' }}>No bookmarked files matching search</div>
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
              <div className={styles.convAvatar} style={{ background: 'var(--gradient-brand)' }}>
                {activeConv.type === 'group' || activeConv.type === 'department' ? <Hash size={16} /> : (activeConv.name?.charAt(0).toUpperCase() || 'U')}
              </div>
              <div>
                <div className={styles.chatName}>{activeConv.name || 'Secure DM'}</div>
                <div className={styles.chatStatus}>
                  {activeConv.type === 'private' ? (
                    (() => {
                      const partnerName = activeConv.name?.replace('DM with ', '');
                      const partner = otherUsers.find((u: any) => u.fullName?.toLowerCase() === partnerName?.toLowerCase() || u.loginId?.toLowerCase() === partnerName?.toLowerCase());
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                <button className="btn btn-ghost btn-icon" onClick={() => handleCallHandshake('audio')} title="Audio Handshake"><Phone size={18} style={{ color: 'var(--brand-primary)' }} /></button>
                <button className="btn btn-ghost btn-icon" onClick={() => handleCallHandshake('video')} title="Video Resonance"><Video size={18} style={{ color: 'var(--brand-primary)' }} /></button>
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
                  {(selectedMessages.length > 0 || true) && msg.id && (
                    <div style={{ opacity: selectedMessages.length > 0 ? 1 : 0, transition: 'opacity 0.2s', width: '20px', flexShrink: 0 }} className="message-checkbox-container">
                      <input
                        type="checkbox"
                        checked={selectedMessages.includes(msg.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMessages(prev => [...prev, msg.id]);
                          else setSelectedMessages(prev => prev.filter(id => id !== msg.id));
                        }}
                        style={{ cursor: 'pointer' }}
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
                    <div className={`${styles.messageBubble} ${isOwn ? styles.ownBubble : styles.otherBubble}`} style={{ border: '1px solid var(--border-color)', position: 'relative' }}>
                      {!isOwn && showAvatar && (
                        <div className={styles.senderName} style={{ color: 'var(--brand-primary)' }}>{senderName}</div>
                      )}
                      
                      {/* Render text with live link highlight detection */}
                      <div className={styles.messageText} style={{ lineHeight: 1.5 }}>
                        {renderMessageContent(msg.content)}
                      </div>

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
                          {msg.type === 'photo' && (
                            <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', maxWidth: '280px', cursor: 'zoom-in' }} onClick={() => setPreviewFile({ url: msg.file_url || msg.fileUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80", name: msg.file_name || msg.fileName || "photo.jpg", type: 'photo' })}>
                              <img src={msg.file_url || msg.fileUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80"} alt={msg.file_name || msg.fileName || "photo"} style={{ width: '100%', height: 'auto', display: 'block' }} />
                            </div>
                          )}

                          {msg.type === 'video' && (
                            <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', maxWidth: '280px', cursor: 'pointer' }} onClick={() => setPreviewFile({ url: msg.file_url || msg.fileUrl || "https://www.w3schools.com/html/mov_bbb.mp4", name: msg.file_name || msg.fileName || "video.mp4", type: 'video' })}>
                              <video style={{ width: '100%', display: 'block', maxHeight: '160px' }}>
                                <source src={msg.file_url || msg.fileUrl || "https://www.w3schools.com/html/mov_bbb.mp4"} type={msg.mime_type || msg.mimeType || "video/mp4"} />
                              </video>
                              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '12px', pointerEvents: 'none' }}>
                                <div style={{ width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '12px solid white', marginLeft: '4px' }} />
                              </div>
                            </div>
                          )}

                          {msg.type === 'music' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-card)', borderRadius: '8px', padding: '8px', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Volume2 size={16} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.file_name || msg.fileName || "Acoustic_Handshake.mp3"}</div>
                                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>{formatBytes(msg.file_size || msg.fileSize || 3565158)} — Voice Note</div>
                                </div>
                                <span onClick={() => handleSaveToPC(msg.file_name || msg.fileName || 'Acoustic_Handshake.mp3', '', msg.file_url || msg.fileUrl)} style={{ display: 'inline-flex', cursor: 'pointer' }}>
                                  <Download size={14} style={{ color: 'var(--brand-primary)' }} />
                                </span>
                              </div>
                              <audio controls src={msg.file_url || msg.fileUrl || "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"} style={{ width: '100%', marginTop: '4px', height: '40px' }} />
                            </div>
                          )}

                          {msg.type === 'file' && (
                            <div style={{
                              background: 'var(--wa-bg)', borderRadius: '8px', padding: '8px 12px',
                              display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '280px',
                              border: '1px solid var(--wa-border)', cursor: 'pointer'
                            }} className="hover-glass" onClick={() => {
                              const fName = msg.file_name || msg.fileName || "System_Audit_Report.pdf";
                              const pType = fName.toLowerCase().endsWith('.pdf') ? 'pdf' : 'file';
                              setPreviewFile({ url: msg.file_url || msg.fileUrl || "#", name: fName, type: pType });
                            }}>
                              {getFileIcon(msg.file_name || msg.fileName || "System_Audit_Report.pdf")}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--wa-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.file_name || msg.fileName || "System_Audit_Report.pdf"}</div>
                                <span style={{ fontSize: '9px', color: 'var(--wa-text-secondary)' }}>{formatBytes(msg.file_size || msg.fileSize || 145408)} — Document</span>
                              </div>
                              <a href={msg.file_url || msg.fileUrl || "#"} download={msg.file_name || msg.fileName || "document"} onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}><Download size={14} style={{ color: 'var(--wa-accent)' }} /></a>
                            </div>
                          )}

                          {msg.type === 'folder' && (
                            <div style={{
                              background: 'var(--wa-bg)', borderRadius: '12px', padding: '12px',
                              display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '290px',
                              border: '1.5px solid rgba(0, 168, 132, 0.25)', boxShadow: '0 4px 12px rgba(0, 168, 132, 0.05)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--wa-border)', paddingBottom: '6px' }}>
                                <Folder size={18} style={{ color: 'var(--wa-accent)' }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--wa-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.file_name || msg.fileName || "GSV_Office_Init/"}</div>
                                  <div style={{ fontSize: '9px', color: 'var(--wa-text-secondary)' }}>{msg.file_size || msg.fileSize || "4 Files"} — SMB Share Pool</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {['schema.sql', 'seed.sql', 'nginx.conf', 'logo.png'].map((fName, fIdx) => (
                                  <div key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--wa-text-secondary)', paddingLeft: '4px' }}>
                                    <ChevronRight size={10} style={{ color: 'var(--wa-accent)' }} />
                                    <span>{fName}</span>
                                  </div>
                                ))}
                              </div>
                              <button type="button" className="btn btn-primary btn-sm" style={{ padding: '4px', fontSize: '11px', height: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }} onClick={() => handleSaveToPC(msg.file_name || msg.fileName || 'GSV_Office_Init.zip')}>
                                <Download size={12} /> Download staged ZIP
                              </button>
                            </div>
                          )}

                          {/* File Actions Quick Bar */}
                          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', borderTop: '1px solid var(--wa-border)', paddingTop: '6px', flexWrap: 'wrap' }}>
                            <span
                              onClick={() => handleSaveToPC(msg.file_name || msg.fileName || (msg.type === 'folder' ? 'GSV_Office_Init.zip' : msg.type === 'music' ? 'Acoustic_Handshake.mp3' : 'System_Audit_Report.pdf'), '', msg.file_url || msg.fileUrl)}
                              style={{ fontSize: '10px', color: 'var(--wa-accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
                              title="Download to PC"
                            >
                              💾 Download
                            </span>
                            <span
                              onClick={() => handleShareFile(msg)}
                              style={{ fontSize: '10px', color: 'var(--wa-accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
                              title="Copy sharing link"
                            >
                              🔗 Share
                            </span>
                            <span
                              onClick={() => setForwardingMsg(msg)}
                              style={{ fontSize: '10px', color: 'var(--wa-accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
                              title="Forward file message"
                            >
                              ➡️ Forward
                            </span>
                            <span
                              onClick={() => handleAddBookmark(msg)}
                              style={{ fontSize: '10px', color: 'var(--wa-accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
                              title="Save bookmark"
                            >
                              🔖 Bookmark
                            </span>
                            {msg.file_id && (
                              <span
                                onClick={() => handleSaveToCloud(msg.file_id)}
                                style={{ fontSize: '10px', color: 'var(--wa-accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
                                title="Backup to Cloud storage"
                              >
                                ☁️ Cloud
                              </span>
                            )}
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
                              style={{ cursor: 'pointer', fontSize: '11px', padding: '2px', filter: reactions.includes(e) ? 'none' : 'grayscale(1)' }}
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span title="Copy Message Text" onClick={() => { navigator.clipboard.writeText(msg.content); toast.success('Message content copied to clipboard.'); }} style={{ display: 'inline-flex', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                            <Copy size={10} />
                          </span>
                          <span title="Pin Message" onClick={() => setPinnedMessage(msg)} style={{ display: 'inline-flex', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                            <Pin size={10} />
                          </span>
                          <span title="Forward Message" onClick={() => setForwardingMsg(msg)} style={{ display: 'inline-flex', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                            <ArrowRight size={10} />
                          </span>
                          {isOwn && (
                            <span title="Delete Message" onClick={() => { if (window.confirm('Delete this message permanently?')) deleteMessageMutation.mutate(msg.id); }} style={{ display: 'inline-flex', cursor: 'pointer', color: 'var(--brand-danger)' }}>
                              <Trash2 size={10} />
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
                                  return <Check size={10} style={{ color: 'var(--text-tertiary)', marginLeft: '4px' }} />;
                                } else {
                                  return <CheckCheck size={10} style={{ color: '#34b7f1', marginLeft: '4px' }} />;
                                }
                              }
                              return <CheckCheck size={10} style={{ color: 'var(--text-tertiary)', marginLeft: '4px' }} />;
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
          {selectedMessages.length > 0 && (
            <div style={{
              position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100,
              background: 'var(--bg-card)', border: '1.5px solid var(--brand-primary)',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)', borderRadius: '32px',
              padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '16px',
              color: 'var(--text-primary)', backdropFilter: 'blur(8px)', animation: 'slideUp 0.3s ease'
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700 }}>{selectedMessages.length} selected</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  const toForward = messages.find((m: any) => m.id === selectedMessages[0]);
                  if (toForward) { setForwardingMsg(toForward); setSelectedMessages([]); }
                  else toast.error('Multiple forward not supported yet.');
                }}>Forward</button>
                <button className="btn btn-danger btn-sm" onClick={() => {
                  if (window.confirm(`Delete ${selectedMessages.length} messages?`)) {
                    selectedMessages.forEach(id => deleteMessageMutation.mutate(id));
                    setSelectedMessages([]);
                  }
                }}>Delete</button>
                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setSelectedMessages([])}><X size={14} /></button>
              </div>
            </div>
          )}

          {/* Staged attachments file list */}
          {stagedFiles.length > 0 && (
            <div style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                  Staged SMB Upload Bundle ({stagedFiles.length})
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
          <div className={styles.chatInput} style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', position: 'relative' }}>
            {isRecording ? (
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
                    <Paperclip size={18} style={{ color: 'var(--brand-primary)' }} />
                  </button>
                  {showAttachmentsDropdown && (
                    <div className="dropdown-menu" style={{ bottom: '100%', top: 'auto', left: 0, marginBottom: '8px', display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <div className="dropdown-item" onClick={() => { setUploadAccept('image/*'); setShowAttachmentsDropdown(false); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                        📸 Photos
                      </div>
                      <div className="dropdown-item" onClick={() => { setUploadAccept('video/*'); setShowAttachmentsDropdown(false); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                        🎥 Videos
                      </div>
                      <div className="dropdown-item" onClick={() => { setUploadAccept('.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'); setShowAttachmentsDropdown(false); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                        📄 Documents
                      </div>
                      <div className="dropdown-item" onClick={() => { setUploadAccept('.zip,.rar,.tar,.gz,.7z'); setShowAttachmentsDropdown(false); setTimeout(() => fileInputRef.current?.click(), 100); }}>
                        🤐 Zip File Upload
                      </div>
                      <div className="dropdown-item" onClick={() => { folderInputRef.current?.click(); setShowAttachmentsDropdown(false); }}>
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
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1.5px solid var(--brand-primary)', boxShadow: '0 2px 10px rgba(99, 102, 241, 0.1)', fontWeight: 500 }}
                />

                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  title="Voice Recording Handshake"
                  onClick={startRecording}
                >
                  <Mic size={18} style={{ color: 'var(--brand-primary)' }} />
                </button>
                
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  title="Emoji resonance picker"
                  onClick={() => setShowEmoji(!showEmoji)}
                >
                  <Smile size={18} style={{ color: 'var(--brand-primary)' }} />
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
                        style={{ fontSize: '18px', cursor: 'pointer', padding: '4px' }}
                        className="hover-glass"
                      >
                        {emoji}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={(!message.trim() && stagedFiles.length === 0) || sendMutation.isPending}
                  className={`${styles.sendBtn} ${message.trim() || stagedFiles.length > 0 ? styles.sendBtnActive : ''}`}
                  title="Send secure signal"
                >
                  <Send size={18} />
                </button>

                <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple accept={uploadAccept} onChange={e => handleFileUpload(e, false)} />
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
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--brand-primary)' }}>Uploading Attachment</span>
                  <span style={{ fontSize: '12px', fontWeight: 500, opacity: 0.9, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {stagedFiles[0]?.name}
                  </span>
                </div>
              </div>
            )}
          </div>
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
