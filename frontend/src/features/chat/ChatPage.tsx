import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Paperclip, Smile, MoreVertical, 
  Search, Check, User, Users, MessageSquare,
  Image as ImageIcon, File as FileIcon, Archive, Trash2, Reply, Forward,
  Phone, Video, Settings, Shield, UserX, Loader, Copy, Download
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { getSocket } from '../../utils/socket';
import api from '../../api';

const ChatPage = () => {
  const user = useAuthStore(state => state.user);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<any>({});
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const socket = getSocket();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchHistory(selectedChat.id);
      socket.emit('message_seen', { senderId: selectedChat.id });
    }
  }, [selectedChat]);

  useEffect(() => {
    socket.on('message_receive', (msg: any) => {
      if (selectedChat && (msg.senderId === selectedChat.id || msg.receiverId === selectedChat.id)) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderId === selectedChat.id) {
           socket.emit('message_seen', { messageId: msg.id, senderId: msg.senderId });
        }
      } else {
        setUnreadCounts((prev: any) => ({
          ...prev,
          [msg.senderId]: (prev[msg.senderId] || 0) + 1
        }));
      }
    });

    socket.on('message_status', ({ messageId, status }: any) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status } : m));
    });

    socket.on('messages_seen_all', ({ seenBy }: any) => {
      if (selectedChat?.id === seenBy) {
        setMessages(prev => prev.map(m => m.receiverId === seenBy ? { ...m, status: 'seen' } : m));
      }
    });

    socket.on('message_delete', ({ id }: any) => {
      setMessages(prev => prev.filter(m => m.id !== id));
    });

    socket.on('user_status', ({ userId, status }: any) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
    });

    return () => {
      socket.off('message_receive');
      socket.off('message_status');
      socket.off('messages_seen_all');
      socket.off('message_delete');
      socket.off('user_status');
    };
  }, [selectedChat, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/chat/users');
      setUsers(res.data);
    } catch (err) { console.error('Failed to load user list'); }
  };

  const fetchHistory = async (targetId: string) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/chat/messages/${targetId}`);
      setMessages(res.data);
    } catch (err) { console.error('Failed to load history'); }
    finally { setLoadingHistory(false); }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  const sendMessage = () => {
    if (!message || !selectedChat || !user) return;
    const payload = {
      id: 'temp_' + Date.now(),
      fromId: user.id,
      toId: selectedChat.id,
      content: message,
      type: 'text',
      createdAt: new Date().toISOString(),
      senderId: user.id,
      status: 'sent'
    };
    setMessages(prev => [...prev, payload]);
    socket.emit('message_send', payload);
    setMessage('');
  };

  const handleFileUpload = async (e: any) => {
    const files = Array.from(e.target.files) as File[];
    if (files.length === 0 || !selectedChat) return;

    const formData = new FormData();
    let folderName = '';
    
    files.forEach((file: any) => {
      formData.append('files', file);
      formData.append('relativePaths[]', file.webkitRelativePath || file.name);
      if (!folderName && file.webkitRelativePath) {
        folderName = file.webkitRelativePath.split('/')[0];
      }
    });

    formData.append('receiverId', selectedChat.id);
    if (folderName) {
      formData.append('folderName', folderName);
      formData.append('isFolder', 'true');
    }

    try {
      setUploadProgress(1);
      await api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      setTimeout(() => setUploadProgress(0), 1000);
    } catch (err) { 
      alert('Failed to upload items'); 
      setUploadProgress(0);
    }
  };

  const handlePaste = (e: any) => {
    const items = e.clipboardData.items;
    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        files.push(items[i].getAsFile());
      }
    }
    if (files.length > 0) {
      const mockEvent = { target: { files } };
      handleFileUpload(mockEvent);
    }
  };

  const handleDownload = (url: string) => {
    const filename = url.split('/').pop();
    const downloadUrl = `${window.location.origin}/api/chat/download/${filename}`;
    window.location.assign(downloadUrl);
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    alert('Content copied to clipboard');
  };

  const handleVoiceCall = (u?: any) => {
    alert("Voice call initiated");
  };

  return (
    <div className="fade-up h-100 d-flex gap-4">
      {/* Left Chat List */}
      <div className="gsv-card p-0 d-flex flex-column overflow-hidden" style={{ width: '350px', height: 'calc(100vh - 120px)' }}>
        <div className="p-3 border-bottom border-secondary d-flex flex-column gap-3">
          <div className="d-flex justify-content-between align-items-center">
             <h5 className="m-0 gold-text">Conversations</h5>
             <button className="btn-icon" onClick={() => setShowSettings(true)}><Settings size={18} /></button>
          </div>
          <div className="position-relative">
            <Search className="position-absolute ms-3 top-50 translate-middle-y text-muted" size={16} />
            <input 
              ref={searchRef}
              type="text" 
              className="gsv-input border-0 bg-dark" 
              placeholder="Search chats..." 
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>
        
        <div className="flex-grow-1 overflow-auto">
          {users.map(u => (
            <div 
              key={u.id} 
              onClick={() => {
                setSelectedChat(u);
                setUnreadCounts((prev: any) => ({ ...prev, [u.id]: 0 }));
              }}
              className={`chat-item ${selectedChat?.id === u.id ? 'active' : ''}`}
            >
              <div className="chat-avatar">
                {u?.username?.[0]?.toUpperCase()}
                {u.status === 'online' && <div className="online-dot"></div>}
              </div>
              <div className="flex-grow-1 overflow-hidden">
                <div className="d-flex justify-content-between mb-1">
                  <span className="fw-bold text-truncate text-white small">{u.username}</span>
                  {unreadCounts[u.id] > 0 && <span className="badge bg-primary rounded-circle smaller">{unreadCounts[u.id]}</span>}
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="smaller text-muted text-truncate opacity-50">Secure Line</span>
                  <button className="btn-icon-xs text-muted" onClick={(e) => { e.stopPropagation(); handleVoiceCall(u); }}><Phone size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center Chat Window */}
      <div className="gsv-card p-0 flex-grow-1 d-flex flex-column overflow-hidden position-relative" style={{ height: 'calc(100vh - 120px)' }}>
        {selectedChat ? (
          <>
            <div className="p-3 border-bottom border-secondary d-flex justify-content-between align-items-center bg-dark bg-opacity-30">
              <div className="d-flex align-items-center gap-3">
                <div className="chat-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>{selectedChat?.username?.[0]?.toUpperCase()}</div>
                <div>
                  <div className="fw-bold text-white small">{selectedChat.username}</div>
                  <div className="smaller text-success">{selectedChat.status === 'online' ? 'Online' : 'Active'}</div>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button className="btn-gsv btn-gsv-sm px-3" onClick={() => handleVoiceCall()}><Phone size={14} className="me-1" /> Call</button>
                <button className="btn-icon" onClick={() => setShowSettings(true)}><MoreVertical size={18} /></button>
              </div>
            </div>

            <div className="flex-grow-1 p-2 overflow-auto d-flex flex-column gap-1" style={{ background: 'rgba(0,0,0,0.2)' }}>
              {loadingHistory ? (
                <div className="h-100 d-flex align-items-center justify-content-center text-muted smaller">Initialising...</div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div key={msg.id} className={`msg-bubble ${msg.senderId === user?.id ? 'sent' : 'recv'}`} style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
                      {msg.type === 'file' ? (
                        <div className="file-card">
                          <div className="d-flex align-items-center gap-2">
                             <div className="file-icon-box bg-primary bg-opacity-20 p-2 rounded">
                                {msg.content.match(/\.(jpg|jpeg|png|gif)$/i) ? <ImageIcon size={18} className="text-info" /> : <FileIcon size={18} className="text-warning" />}
                             </div>
                             <div className="flex-grow-1 overflow-hidden">
                                <div className="text-white smaller fw-bold text-truncate">{msg.content.split('/').pop()}</div>
                                <div className="smaller text-muted opacity-40" style={{ fontSize: '0.7rem' }}>Shared Asset</div>
                             </div>
                          </div>
                          <div className="d-flex gap-2 mt-2 pt-2 border-top border-secondary border-opacity-10">
                             <button className="btn-icon-xs text-info" onClick={() => handleDownload(msg.content)} title="Download"><Download size={11} /></button>
                             <button className="btn-icon-xs text-muted" onClick={() => handleCopyContent(msg.content)} title="Copy Link"><Copy size={11} /></button>
                             {msg.senderId === user?.id && <button className="btn-icon-xs text-danger" onClick={() => api.delete(`/chat/messages/${msg.id}`)}><Trash2 size={11} /></button>}
                          </div>
                        </div>
                      ) : (
                        <div className="position-relative pr-4">
                          {msg.content}
                          <div className="msg-actions">
                             <button className="btn-icon-xs text-muted" onClick={() => handleCopyContent(msg.content)}><Copy size={10} /></button>
                             {msg.senderId === user?.id && <button className="btn-icon-xs text-muted" onClick={() => api.delete(`/chat/messages/${msg.id}`)}><Trash2 size={10} /></button>}
                          </div>
                        </div>
                      )}
                      <div className="d-flex justify-content-end align-items-center gap-1 mt-1" style={{ fontSize: '0.6rem', opacity: 0.6 }}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''} 
                        {msg.senderId === user?.id && (
                           <div className="d-flex ms-1">
                              <Check size={10} className={msg.status === 'seen' ? 'text-seen-tick' : 'text-muted'} />
                              {msg.status === 'seen' && <Check size={10} className="text-seen-tick" style={{ marginLeft: '-4px' }} />}
                           </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {uploadProgress > 0 && (
               <div className="upload-progress-container fade-up">
                  <div className="d-flex justify-content-between mb-2">
                     <span className="smaller text-white">Uploading Transmissions...</span>
                     <span className="smaller gold-text">{uploadProgress}%</span>
                  </div>
                  <div className="progress" style={{ height: '4px', background: 'rgba(255,255,255,0.1)' }}>
                     <div className="progress-bar bg-warning" role="progressbar" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
               </div>
            )}

            <div className="p-3 bg-dark bg-opacity-40 border-top border-secondary">
              {showAttachMenu && (
                <div className="attachment-menu fade-up">
                   <button className="attach-item" onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}>
                      <ImageIcon className="text-info" size={16} /> <span className="smaller">Files</span>
                   </button>
                   <button className="attach-item" onClick={() => { setShowAttachMenu(false); folderInputRef.current?.click(); }}>
                      <Archive className="text-warning" size={16} /> <span className="smaller">Folder</span>
                   </button>
                </div>
              )}
              <div className="d-flex align-items-center gap-2">
                <input type="file" ref={fileInputRef} className="d-none" multiple onChange={handleFileUpload} />
                {/* @ts-ignore */}
                <input type="file" ref={folderInputRef} className="d-none" webkitdirectory="" directory="" onChange={handleFileUpload} />
                <button className="btn-icon" onClick={() => setShowAttachMenu(!showAttachMenu)}><Paperclip size={18} /></button>
                <input 
                  type="text" 
                  className="gsv-input flex-grow-1" 
                  placeholder="Type message or paste file..." 
                  style={{ fontSize: '0.85rem' }}
                  value={message}
                  onPaste={handlePaste}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button className={`btn-gsv p-2 rounded-circle ${!message ? 'opacity-50' : ''}`} onClick={sendMessage} disabled={!message}>
                   <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted gap-3">
             <MessageSquare size={60} className="gold-text opacity-20" />
             <h5 className="gradient-text smaller">GSV Secure Messenger</h5>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="gsv-overlay" onClick={() => setShowSettings(false)}>
          <div className="gsv-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header border-bottom border-secondary pb-3">
              <h5 className="gold-text m-0">Settings</h5>
              <button className="btn-icon" onClick={() => setShowSettings(false)}><Trash2 size={18} /></button>
            </div>
            <div className="d-flex gap-3 mt-4" style={{ minHeight: '300px' }}>
              <div className="d-flex flex-column gap-1" style={{ width: '150px' }}>
                <button className={`nav-link-item py-2 px-3 ${activeSettingsTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('profile')}><User size={14} /> Profile</button>
                <button className={`nav-link-item py-2 px-3 ${activeSettingsTab === 'privacy' ? 'active' : ''}`} onClick={() => setActiveSettingsTab('privacy')}><Shield size={14} /> Privacy</button>
              </div>
              <div className="flex-grow-1 p-3 bg-dark bg-opacity-40 rounded border border-secondary border-opacity-10">
                {activeSettingsTab === 'profile' && user && (
                  <div className="text-center">
                    <div className="user-avatar mx-auto mb-3" style={{ width: '70px', height: '70px', fontSize: '1.8rem' }}>{((user as any).username || user.fullName)?.[0]?.toUpperCase()}</div>
                    <div className="text-white mb-1 fw-bold">{(user as any).username || user.fullName}</div>
                    <div className="smaller text-muted mb-4">GSV System Asset</div>
                    <button className="btn-gsv btn-gsv-sm w-100">Update Profile</button>
                  </div>
                )}
                {activeSettingsTab === 'privacy' && (
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex justify-content-between">
                       <span className="smaller text-white">Read Receipts</span>
                       <div className="form-check form-switch"><input className="form-check-input" type="checkbox" defaultChecked /></div>
                    </div>
                    <div className="d-flex justify-content-between">
                       <span className="smaller text-white">Online Status</span>
                       <div className="form-check form-switch"><input className="form-check-input" type="checkbox" defaultChecked /></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
