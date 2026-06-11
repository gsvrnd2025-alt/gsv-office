import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import {
  FolderOpen, Upload, Search, Grid, List, Plus, Download, Trash2, Share2,
  ChevronRight, Home, File, FileImage, FileText, FileVideo, FileArchive,
  Folder, Lock, Unlock, Check, X, ShieldAlert, Key, Users, Copy, RefreshCw,
  Scissors, Clipboard, CheckSquare, Info
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { filesApi, usersApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';
import { copyTextToClipboard } from '../../utils/clipboard';

const normalizeFolder = (f: any) => {
  if (!f) return f;
  return {
    ...f,
    parentId: f.parent_id !== undefined ? f.parent_id : f.parentId,
    ownerId: f.owner_id !== undefined ? f.owner_id : f.ownerId,
    deletedAt: f.deleted_at !== undefined ? f.deleted_at : f.deletedAt,
    createdAt: f.created_at !== undefined ? f.created_at : f.createdAt,
    updatedAt: f.updated_at !== undefined ? f.updated_at : f.updatedAt,
    ownerName: f.owner_name !== undefined ? f.owner_name : f.ownerName,
  };
};

const normalizeFile = (f: any) => {
  if (!f) return f;
  return {
    ...f,
    originalName: f.original_name !== undefined ? f.original_name : f.originalName,
    mimeType: f.mime_type !== undefined ? f.mime_type : f.mimeType,
    sizeBytes: f.size !== undefined ? Number(f.size) : f.sizeBytes,
    size: f.size !== undefined ? Number(f.size) : f.size,
    storagePath: f.storage_path !== undefined ? f.storage_path : f.storagePath,
    storageUrl: f.storage_url !== undefined ? f.storage_url : f.storageUrl,
    ownerId: f.owner_id !== undefined ? f.owner_id : f.ownerId,
    folderId: f.folder_id !== undefined ? f.folder_id : f.folderId,
    conversationId: f.conversation_id !== undefined ? f.conversation_id : f.conversationId,
    deletedAt: f.deleted_at !== undefined ? f.deleted_at : f.deletedAt,
    createdAt: f.created_at !== undefined ? f.created_at : f.createdAt,
    updatedAt: f.updated_at !== undefined ? f.updated_at : f.updatedAt,
    ownerName: f.owner_name !== undefined ? f.owner_name : f.ownerName,
  };
};

function getFileIcon(mime: string) {
  if (!mime) return <File size={20} />;
  if (mime.startsWith('image/')) return <FileImage size={20} style={{ color: '#8b5cf6' }} />;
  if (mime.startsWith('video/')) return <FileVideo size={20} style={{ color: '#3b82f6' }} />;
  if (mime.includes('pdf')) return <FileText size={20} style={{ color: '#ef4444' }} />;
  if (mime.includes('word') || mime.includes('text') || mime.includes('javascript') || mime.includes('json') || mime.includes('html')) return <FileText size={20} style={{ color: '#f59e0b' }} />;
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return <FileArchive size={20} style={{ color: '#10b981' }} />;
  return <File size={20} style={{ color: '#6366f1' }} />;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function FilesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { folderId: routeFolderId } = useParams();
  const [searchParams] = useSearchParams();
  const queryFolderId = searchParams.get('folderId');
  const initialFolderId = routeFolderId || queryFolderId || undefined;

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [folderId, setFolderId] = useState<string | undefined>(initialFolderId);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id?: string; name: string }[]>([{ name: 'Home' }]);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [activeTab, setActiveTab] = useState<'files' | 'requests'>('files');

  // Sync folderId with route or query search parameter updates (e.g. when clicking chat bubbles)
  useEffect(() => {
    if (initialFolderId) {
      setFolderId(initialFolderId);
      setBreadcrumbs(prev => {
        if (prev.some(b => b.id === initialFolderId)) return prev;
        return [{ name: 'Home' }, { id: initialFolderId, name: 'Active Folder' }];
      });
    } else {
      setFolderId(undefined);
      setBreadcrumbs([{ name: 'Home' }]);
    }
  }, [routeFolderId, queryFolderId]);

  // Category filter and preview states
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'photos' | 'videos' | 'docs' | 'pdfs' | 'programs'>('all');
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [previewTextContent, setPreviewTextContent] = useState<string>('');
  const [loadingTextContent, setLoadingTextContent] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: any; itemType: 'file' | 'folder' } | null>(null);
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number | null>(null);

  // Bulk selection, clipboard and custom confirm states
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{ id: string; type: 'file' | 'folder' }[]>([]);
  const [bulkClipboardItems, setBulkClipboardItems] = useState<{ id: string; type: 'file' | 'folder' }[]>([]);
  const [bulkClipboardAction, setBulkClipboardAction] = useState<'cut' | 'copy' | null>(null);
  const [bulkSharingItems, setBulkSharingItems] = useState<{ id: string; type: 'file' | 'folder' }[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    iconType?: 'trash' | 'folder' | 'download' | 'info';
    confirmText?: string;
    cancelText?: string;
    brandColor?: string;
  } | null>(null);
  const folderUploadInputRef = useRef<HTMLInputElement>(null);

  // CRUD & Clipboard states
  const [clipboardItem, setClipboardItem] = useState<{ id: string; type: 'file' | 'folder'; action: 'cut' | 'copy' } | null>(null);
  const [renamingItem, setRenamingItem] = useState<{ id: string; type: 'file' | 'folder'; name: string } | null>(null);
  const [sharingItem, setSharingItem] = useState<any | null>(null);

  // Folder Access Request Modal State
  const [lockFolder, setLockFolder] = useState<any>(null);
  const [requestPermission, setRequestPermission] = useState<string>('read');

  // Shared requests query
  const { data: accessRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => filesApi.getAccessRequests().then(r => r.data?.data || r.data || []),
    enabled: !!user
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-list-sharing'],
    queryFn: () => usersApi.getAll().then(r => r.data?.data?.data || r.data?.data || [])
  });

  // Queries for folders and files
  const { data: folders = [] } = useQuery({
    queryKey: ['folders', folderId],
    queryFn: () => filesApi.getFolders({ parentId: folderId }).then(r => {
      const data = r.data?.data || r.data || [];
      return data.map(normalizeFolder);
    })
  });

  const { data: files = [] } = useQuery({
    queryKey: ['files', folderId, categoryFilter],
    queryFn: () => filesApi.getFiles({ 
      folderId, 
      recursive: categoryFilter !== 'all' ? 'true' : undefined
    }).then(r => {
      const data = r.data?.data || r.data || [];
      return data.map(normalizeFile);
    })
  });

  // Access Mutators
  const requestAccessMutation = useMutation({
    mutationFn: (variables: any) => filesApi.requestAccess(variables),
    onSuccess: () => {
      toast.success('Access request submitted successfully');
      setLockFolder(null);
      refetchRequests();
    },
    onError: () => toast.error('Failed to submit request')
  });

  const reviewAccessMutation = useMutation({
    mutationFn: (variables: any) => filesApi.reviewAccessRequest(variables),
    onSuccess: () => {
      toast.success('Request reviewed successfully');
      refetchRequests();
      qc.invalidateQueries({ queryKey: ['folders'] });
    },
    onError: () => toast.error('Failed to submit review')
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => filesApi.deleteFolder(id),
    onSuccess: () => { toast.success('Folder deleted'); qc.invalidateQueries({ queryKey: ['folders'] }); },
    onError: () => toast.error('Failed to delete folder'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filesApi.delete(id),
    onSuccess: () => { toast.success('File deleted'); qc.invalidateQueries({ queryKey: ['files'] }); },
    onError: () => toast.error('Delete failed'),
  });

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => filesApi.createFolder({ name, parentId: folderId }),
    onSuccess: () => { toast.success('Folder created'); setShowNewFolder(false); setNewFolderName(''); qc.invalidateQueries({ queryKey: ['folders'] }); },
    onError: () => toast.error('Failed to create folder'),
  });

  const renameFileMutation = useMutation({
    mutationFn: (variables: { id: string; name: string }) => filesApi.renameFile(variables.id, variables.name),
    onSuccess: () => {
      toast.success('File renamed');
      setRenamingItem(null);
      qc.invalidateQueries({ queryKey: ['files'] });
    },
    onError: () => toast.error('Rename failed'),
  });

  const renameFolderMutation = useMutation({
    mutationFn: (variables: { id: string; name: string }) => filesApi.renameFolder(variables.id, variables.name),
    onSuccess: () => {
      toast.success('Folder renamed');
      setRenamingItem(null);
      qc.invalidateQueries({ queryKey: ['folders'] });
    },
    onError: () => toast.error('Rename failed'),
  });

  const moveOrCopyMutation = useMutation({
    mutationFn: (variables: any) => filesApi.moveOrCopy(variables),
    onSuccess: (_, variables) => {
      toast.success(`${variables.action === 'move' ? 'Moved' : 'Copied'} successfully`);
      setClipboardItem(null);
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['files'] });
    },
    onError: () => toast.error('Action failed'),
  });

  const shareToUserMutation = useMutation({
    mutationFn: (variables: any) => filesApi.shareToUser(variables),
    onSuccess: () => {
      toast.success('Shared successfully');
      setSharingItem(null);
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['files'] });
    },
    onError: () => toast.error('Failed to share'),
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;

    const MAX_FILE_SIZE_MB = 5000; // 5 GB limit
    const oversized = acceptedFiles.filter(f => f.size / 1024 / 1024 > MAX_FILE_SIZE_MB);
    if (oversized.length > 0) {
      toast.error(`File "${oversized[0].name}" exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setUploading(true);
    setUploadProgressPercent(0);
    let success = 0;
    for (const file of acceptedFiles) {
      const fd = new FormData();
      fd.append('file', file);
      if (folderId) fd.append('folderId', folderId);
      try {
        await filesApi.upload(fd, (progressEvent: any) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgressPercent(percent);
        });
        success++;
      } catch {
        toast.error(`Failed: ${file.name}`);
      }
    }
    if (success > 0) toast.success(`${success} file(s) uploaded`);
    setUploading(false);
    setUploadProgressPercent(null);
    qc.invalidateQueries({ queryKey: ['files'] });
  }, [folderId]);

  const onDropFolder = async (files: File[]) => {
    if (!files.length) return;

    const MAX_FOLDER_FILES = 10000;
    if (files.length > MAX_FOLDER_FILES) {
      toast.error(`Folder contains too many files (${files.length.toLocaleString()}). For directories with more than ${MAX_FOLDER_FILES} files (like code projects), please compress them into a .zip or .tar archive before uploading.`);
      return;
    }

    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const totalSizeMB = totalSize / 1024 / 1024;
    const MAX_FOLDER_SIZE_MB = 5000; // 5 GB limit
    if (totalSizeMB > MAX_FOLDER_SIZE_MB) {
      toast.error(`Folder size (${totalSizeMB.toFixed(1)} MB) exceeds the folder upload limit of ${MAX_FOLDER_SIZE_MB} MB. Please compress the folder into a .zip file before uploading.`);
      return;
    }

    setUploading(true);
    setUploadProgressPercent(0);
    
    console.log('[Upload Flow] Upload queue created');
    const fdStart = performance.now();
    const fd = new FormData();
    files.forEach((file: File) => {
      fd.append('files', file);
    });
    const relativePaths = files.map((file: any) => file.webkitRelativePath || file.name);
    fd.append('relativePaths', JSON.stringify(relativePaths));
    const folderName = relativePaths[0]?.split('/')[0] || 'Uploaded_Folder';
    fd.append('folderName', folderName);
    if (folderId) fd.append('folderId', folderId);
    console.log(`[Upload Flow] FormData construction finished. Time taken: ${(performance.now() - fdStart).toFixed(2)} ms`);

    console.log('[Upload Flow] Upload started');
    const uploadStart = performance.now();
    let toastId: string | undefined;
    try {
      toastId = toast.loading(`Uploading "${folderName}": 0%`);
      let lastProgressTime = 0;
      await filesApi.uploadFolder(fd, (progressEvent: any) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        const now = performance.now();
        if (percent === 0 || percent === 100 || now - lastProgressTime >= 200) {
          lastProgressTime = now;
          setUploadProgressPercent(percent);
          if (toastId) toast.loading(`Uploading "${folderName}": ${percent}%`, { id: toastId });
        }
      });
      if (toastId) toast.success(`Folder "${folderName}" uploaded successfully!`, { id: toastId });
      console.log(`[Upload Flow] Upload completed successfully. Total upload time: ${((performance.now() - uploadStart) / 1000).toFixed(2)} s`);
    } catch (err) {
      console.error('[Upload Flow] Folder upload failed:', err);
      if (toastId) toast.error('Folder upload failed.', { id: toastId });
      else toast.error('Folder upload failed.');
    }
    setUploading(false);
    setUploadProgressPercent(null);
    qc.invalidateQueries({ queryKey: ['folders'] });
    qc.invalidateQueries({ queryKey: ['files'] });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, noClick: true, multiple: true,
  });

  const hasAccess = (folder: any) => {
    if (!user) return false;
    if (user.role?.name === 'Super Admin') return true;
    if (folder.ownerId === user.id || folder.ownerId === 'system') return true;
    if (folder.path?.startsWith('/public')) return true;

    // Check in approved access requests list
    const grant = accessRequests.find((r: any) => r.folderId === folder.id && r.requesterId === user.id && r.status === 'approved');
    return !!grant;
  };

  const isReadOnly = (item: any, isFolder: boolean) => {
    if (!user) return true;
    if (user.role?.name === 'Super Admin') return false;
    if (item.ownerId === user.id) return false;
    
    if (isFolder) {
      const grant = accessRequests.find((r: any) => r.folderId === item.id && r.requesterId === user.id && r.status === 'approved');
      if (grant && grant.permission === 'read') return true;
    } else {
      return true;
    }
    return true; 
  };

  const handleDoubleClickFolder = (folder: any) => {
    if (hasAccess(folder)) {
      setFolderId(folder.id);
      setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    } else {
      setLockFolder(folder);
    }
  };

  const handleRequestAccess = () => {
    if (!lockFolder || !user) return;
    requestAccessMutation.mutate({
      folderId: lockFolder.id,
      ownerId: lockFolder.ownerId,
      requesterId: user.id,
      requesterName: user.fullName
    });
  };

  const navigateBreadcrumb = (idx: number, item: { id?: string; name: string }) => {
    setBreadcrumbs(prev => prev.slice(0, idx + 1));
    setFolderId(item.id);
    setCategoryFilter('all'); // Reset filter on navigation
  };

  const openContextMenu = (e: React.MouseEvent, item: any, itemType: 'file' | 'folder') => {
    e.preventDefault();
    const menuWidth = 180;
    const menuHeight = 250;
    let x = e.clientX;
    let y = e.clientY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 12;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 12;
    if (x < 12) x = 12;
    if (y < 12) y = 12;
    setContextMenu({ x, y, item, itemType });
  };

  const handleCopyStructure = (name: string) => {
    toast.success(`📋 SMB Path copied: \\\\gsv-office-smb\\folders\\${name}`);
  };

  const handleDuplicate = (name: string) => {
    toast.success(`👯 Duplicated folder hierarchy for: ${name}`);
  };

  const handleDownloadFolder = async (id: string, name: string) => {
    const toastId = toast.loading(`Preparing folder "${name}" download...`);
    try {
      const response = await filesApi.downloadFolder(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${name}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded "${name}" successfully!`, { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to download folder: ${err.message || 'Server error'}`, { id: toastId });
    }
  };

  const handleTransfer = (folderName: string, targetUser: string) => {
    toast.success(`👑 Transferred ownership of folder ${folderName} to ${targetUser}`);
  };

  const copyImageToClipboard = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);
        toast.success('Image copied to clipboard! 📋');
        return;
      }
    } catch (e) {
      console.warn("Unable to copy image blob directly, trying URL", e);
    }
    
    const copied = await copyTextToClipboard(window.location.origin + url);
    if (copied) {
      toast.success('Image URL copied to clipboard! 🔗');
    } else {
      toast.error('Failed to copy image link');
    }
  };

  const handleOpenPreview = useCallback((file: any) => {
    setPreviewFile(file);
    setZoomLevel(1);
    setPreviewTextContent('');
    
    const ext = (file.extension || file.originalName?.split('.').pop() || file.name?.split('.').pop() || '').toLowerCase();
    const mime = (file.mimeType || '').toLowerCase();
    const isText = ['json', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'html', 'css', 'txt', 'md', 'xml', 'yaml', 'yml', 'sh', 'bat', 'ini', 'log'].includes(ext) || mime.startsWith('text/') || mime === 'application/json';
    
    if (isText && file.storageUrl) {
      setLoadingTextContent(true);
      fetch(file.storageUrl)
        .then(res => res.text())
        .then(txt => {
          if (ext === 'json' || mime === 'application/json') {
            try {
              const parsed = JSON.parse(txt);
              setPreviewTextContent(JSON.stringify(parsed, null, 2));
            } catch {
              setPreviewTextContent(txt);
            }
          } else {
            setPreviewTextContent(txt);
          }
          setLoadingTextContent(false);
        })
        .catch(err => {
          setPreviewTextContent('Error loading content.');
          setLoadingTextContent(false);
        });
    }
  }, []);

  const pendingRequests = accessRequests.filter((r: any) => r.ownerId === user?.id && r.status === 'pending');
  const mySentRequests = accessRequests.filter((r: any) => r.requesterId === user?.id);

  // Filter folders by search
  const filteredFolders = folders.filter((folder: any) => {
    if (!search) return true;
    return (folder.name || '').toLowerCase().includes(search.toLowerCase());
  });

  // Perform category-based file filtering
  const filteredFiles = files.filter((file: any) => {
    const mime = (file.mimeType || '').toLowerCase();
    const ext = (file.extension || '').toLowerCase();
    const name = (file.originalName || file.name || '').toLowerCase();
    
    // Search filter: by name OR by extension (e.g., ".pdf" or "pdf")
    if (search) {
      const q = search.toLowerCase().replace(/^\./, '');
      const matchesName = name.includes(search.toLowerCase());
      const matchesExt = ext === q || mime.includes(q);
      if (!matchesName && !matchesExt) return false;
    }

    if (categoryFilter === 'all') return true;
    if (categoryFilter === 'photos') {
      return mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext);
    }
    if (categoryFilter === 'videos') {
      return mime.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext);
    }
    if (categoryFilter === 'docs') {
      return mime.includes('word') || mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('text') || mime.includes('csv') || ['doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'ppt', 'pptx'].includes(ext);
    }
    if (categoryFilter === 'pdfs') {
      return mime.includes('pdf') || ext === 'pdf';
    }
    if (categoryFilter === 'programs') {
      return ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb', 'sh', 'bat', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sql', 'md'].includes(ext);
    }
    return true;
  });

  const shouldShowFolders = categoryFilter === 'all';

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }} {...getRootProps()}>
      <input {...getInputProps()} />

      {isDragActive && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(99,102,241,0.15)', backdropFilter: 'blur(4px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px dashed #6366f1' }}>
          <div style={{ textAlign: 'center', color: '#6366f1' }}>
            <Upload size={64} style={{ marginBottom: '16px', animation: 'bounce 1s infinite' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Drop files here</h2>
            <p>Files will be uploaded to current folder</p>
          </div>
        </div>
      )}

      {/* Access Request Overlay Modal */}
      {lockFolder && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card card-body" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-danger)' }}>
                <Lock size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Folder is Protected</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Permission required to unlock folder contents</p>
              </div>
            </div>

            <div style={{ fontSize: '13px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lockFolder.name}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px', fontFamily: 'monospace' }}>
                SMB Path: \\gsv-office-smb{lockFolder.path}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Access Level</label>
              <select className="form-control" value={requestPermission} onChange={e => setRequestPermission(e.target.value)} style={{ fontSize: '12px', height: '34px' }}>
                <option value="read">👁️ Read Only (View files list)</option>
                <option value="download">📥 Download Access (Extract copies)</option>
                <option value="upload">📤 Upload Access (Contribute files)</option>
                <option value="full">⚡ Full Access (All actions enabled)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleRequestAccess} disabled={requestAccessMutation.isPending}>
                <Key size={14} /> Request Access
              </button>
              <button className="btn btn-secondary" onClick={() => setLockFolder(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Overlay Modal */}
      {renamingItem && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card card-body" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Rename {renamingItem.type === 'folder' ? 'Folder' : 'File'}</h3>
            <input
              type="text"
              className="form-control"
              value={renamingItem.name}
              onChange={e => setRenamingItem({ ...renamingItem, name: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (renamingItem.type === 'file') {
                    renameFileMutation.mutate({ id: renamingItem.id, name: renamingItem.name });
                  } else {
                    renameFolderMutation.mutate({ id: renamingItem.id, name: renamingItem.name });
                  }
                }
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setRenamingItem(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (renamingItem.type === 'file') {
                    renameFileMutation.mutate({ id: renamingItem.id, name: renamingItem.name });
                  } else {
                    renameFolderMutation.mutate({ id: renamingItem.id, name: renamingItem.name });
                  }
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Overlay Modal */}
      {sharingItem && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card card-body" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Share "{sharingItem.name}"</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Select a teammate to copy/move this item to their chat-attachments folder.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600 }}>Teammate</label>
              <select id="share-target-user" className="form-control">
                {allUsers.filter((u: any) => u.id !== user?.id).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.role?.name || 'User'})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600 }}>Action</label>
              <select id="share-action" className="form-control" defaultValue="copy">
                <option value="copy">👯 Duplicate Copy (Keep original)</option>
                <option value="move">🚚 Move Ownership (Transfer item)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setSharingItem(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const targetUserId = (document.getElementById('share-target-user') as HTMLSelectElement).value;
                  const action = (document.getElementById('share-action') as HTMLSelectElement).value as 'move' | 'copy';
                  if (!targetUserId) {
                    toast.error('Please select a teammate');
                    return;
                  }
                  setSharingItem(null);
                  navigate(`/chat?shareItemId=${sharingItem.id}&shareItemType=${sharingItem.type}&targetUserId=${targetUserId}&name=${encodeURIComponent(sharingItem.name)}&action=${action}`);
                }}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive-style Preview Modal */}
      {previewFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setPreviewFile(null); setZoomLevel(1); }}>
          <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', gap: '8px', alignItems: 'center', color: 'white', zIndex: 1300 }}>
            {getFileIcon(previewFile.mimeType)}
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{previewFile.originalName}</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>({formatBytes(previewFile.sizeBytes || previewFile.size)})</span>
          </div>

          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '10px', zIndex: 1300 }} onClick={e => e.stopPropagation()}>
            {previewFile.mimeType?.startsWith('image/') && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => setZoomLevel(z => Math.min(3, z + 0.2))}>Zoom In (+)</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.2))}>Zoom Out (-)</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setZoomLevel(1)}>Reset</button>
                <button className="btn btn-secondary btn-sm" onClick={() => copyImageToClipboard(previewFile.storageUrl)}>Copy Image</button>
              </>
            )}
            <a href={previewFile.storageUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>Open in New Tab</a>
            <a href={previewFile.storageUrl} download={previewFile.originalName} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Download size={14} /> Download</a>
            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'white' }} onClick={() => { setPreviewFile(null); setZoomLevel(1); }}><X size={20} /></button>
          </div>
          
          <div style={{ width: '90%', height: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
            {previewFile.mimeType?.startsWith('image/') ? (
              <div style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                <img src={previewFile.storageUrl} alt={previewFile.originalName} style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
            ) : previewFile.mimeType?.includes('pdf') || (previewFile.originalName || '').toLowerCase().endsWith('.pdf') ? (
              <iframe src={previewFile.storageUrl} style={{ width: '100%', height: '100%', borderRadius: '8px', border: 'none', background: 'white' }} title={previewFile.originalName} />
            ) : previewFile.mimeType?.startsWith('video/') ? (
              <video controls src={previewFile.storageUrl} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px' }} />
            ) : previewFile.mimeType?.startsWith('audio/') ? (
              <audio controls src={previewFile.storageUrl} style={{ width: '80%' }} />
            ) : ['json', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'html', 'css', 'txt', 'md', 'xml', 'yaml', 'yml', 'sh', 'bat', 'ini', 'log'].includes((previewFile.extension || previewFile.originalName?.split('.').pop() || '').toLowerCase()) || previewFile.mimeType?.startsWith('text/') || previewFile.mimeType === 'application/json' ? (
              <div style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                {loadingTextContent ? (
                  <div style={{ color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#1e1e1e' }}>
                    <div className="spinner" style={{ marginRight: '8px' }} /> Loading file content...
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    width="100%"
                    language={(previewFile.extension || previewFile.originalName?.split('.').pop() || 'text').toLowerCase()}
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
            ) : (
              <div style={{ textAlign: 'center', color: 'white', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                <File size={64} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>No preview available for this file type</h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                    Mime Type: {previewFile.mimeType || 'Unknown'} | Extension: {previewFile.extension || 'none'}
                  </p>
                </div>
                <a href={previewFile.storageUrl} download={previewFile.originalName} className="btn btn-primary"><Download size={14} /> Download to View</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Context Menu */}
      {contextMenu && (
        <div style={{
          position: 'fixed', top: contextMenu.y, left: contextMenu.x,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', zIndex: 1100,
          display: 'flex', flexDirection: 'column', padding: '4px', minWidth: '150px'
        }} onMouseLeave={() => setContextMenu(null)}>
          {!isReadOnly(contextMenu.item, contextMenu.itemType === 'folder') && (
            <>
              <div className="dropdown-item" onClick={() => {
                setRenamingItem({ id: contextMenu.item.id, type: contextMenu.itemType, name: contextMenu.item.name || contextMenu.item.originalName });
                setContextMenu(null);
              }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer' }}><Plus size={13} /> Rename</div>
              
              <div className="dropdown-item" onClick={() => {
                setClipboardItem({ id: contextMenu.item.id, type: contextMenu.itemType, action: 'cut' });
                setContextMenu(null);
                toast.success('Cut to clipboard');
              }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer' }}><Scissors size={13} /> Cut</div>
            </>
          )}

          <div className="dropdown-item" onClick={() => {
            setClipboardItem({ id: contextMenu.item.id, type: contextMenu.itemType, action: 'copy' });
            setContextMenu(null);
            toast.success('Copied to clipboard');
          }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer' }}><Copy size={13} /> Copy</div>

          <div className="dropdown-item" onClick={() => {
            setIsBulkMode(true);
            setSelectedItems([{ id: contextMenu.item.id, type: contextMenu.itemType }]);
            setContextMenu(null);
          }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer' }}><CheckSquare size={13} /> Bulk Select</div>

          {clipboardItem && contextMenu.itemType === 'folder' && (
            <div className="dropdown-item" onClick={() => {
              moveOrCopyMutation.mutate({
                itemType: clipboardItem.type,
                itemId: clipboardItem.id,
                targetFolderId: contextMenu.item.id,
                action: clipboardItem.action
              });
              setContextMenu(null);
            }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer' }}><Clipboard size={13} /> Paste Here</div>
          )}

          {bulkClipboardItems.length > 0 && contextMenu.itemType === 'folder' && (
            <div className="dropdown-item" onClick={async () => {
              const toastId = toast.loading('Pasting bulk items...');
              try {
                await Promise.all(bulkClipboardItems.map(item =>
                  moveOrCopyMutation.mutateAsync({
                    itemType: item.type,
                    itemId: item.id,
                    targetFolderId: contextMenu.item.id,
                    action: bulkClipboardAction
                  })
                ));
                toast.success('Pasted successfully', { id: toastId });
                setBulkClipboardItems([]);
                setBulkClipboardAction(null);
                setContextMenu(null);
                qc.invalidateQueries({ queryKey: ['folders'] });
                qc.invalidateQueries({ queryKey: ['files'] });
              } catch {
                toast.error('Failed to paste some items', { id: toastId });
              }
            }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer' }}><Clipboard size={13} /> Paste Bulk Here</div>
          )}

          <div className="dropdown-item" onClick={() => {
            setSharingItem({
              id: contextMenu.item.id,
              type: contextMenu.itemType,
              name: contextMenu.item.name || contextMenu.item.originalName,
              storageUrl: contextMenu.item.storageUrl || '',
              size: contextMenu.item.sizeBytes || contextMenu.item.size || '',
              mimeType: contextMenu.item.mimeType || ''
            });
            setContextMenu(null);
          }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer' }}><Share2 size={13} /> Share with Teammate</div>

          {contextMenu.itemType === 'file' && (
            <>
              <div className="dropdown-item" onClick={() => { handleOpenPreview(contextMenu.item); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer' }}><ChevronRight size={13} /> Preview</div>
              <div className="dropdown-item" onClick={() => { window.open(contextMenu.item.storageUrl, '_blank'); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer' }}>🔗 Open in New Tab</div>
              <a href={contextMenu.item.storageUrl} download={contextMenu.item.originalName} className="dropdown-item" onClick={() => setContextMenu(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer', color: 'inherit', textDecoration: 'none' }}><Download size={13} /> Copy to PC (Download)</a>
            </>
          )}

          {contextMenu.itemType === 'folder' && (
            <>
              <div className="dropdown-item" onClick={() => { handleDownloadFolder(contextMenu.item.id, contextMenu.item.name); setContextMenu(null); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer' }}><Download size={13} /> Copy to PC (Zip Download)</div>
              {(window as any).gsvDesktop && (
                <div className="dropdown-item" onClick={async () => { 
                  const toastId = toast.loading('Copying folder to PC... 📁');
                  try {
                    const token = useAuthStore.getState().accessToken;
                    const res = await (window as any).gsvDesktop.copyFolderToClipboard({
                      folderId: contextMenu.item.id,
                      folderName: contextMenu.item.name || contextMenu.item.originalName || 'Folder',
                      serverUrl: window.location.origin,
                      token: token
                    });
                    if (res?.success) {
                      toast.success(`Folder copied to PC successfully! Saved at: ${res.path}`, { id: toastId });
                    } else {
                      toast.error(`Copy failed: ${res?.error || 'Unknown error'}`, { id: toastId });
                    }
                  } catch (err: any) {
                    toast.error(`Copy error: ${err.message}`, { id: toastId });
                  }
                  setContextMenu(null); 
                }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer' }}>
                  <Folder size={13} /> Copy Folder to PC (Direct)
                </div>
              )}
            </>
          )}

          {!isReadOnly(contextMenu.item, contextMenu.itemType === 'folder') && (
            <div className="dropdown-item" onClick={() => {
              const isFolder = contextMenu.itemType === 'folder';
              const name = contextMenu.item.name || contextMenu.item.originalName;
              setConfirmModal({
                title: `Delete ${isFolder ? 'Folder' : 'File'}`,
                message: `Are you sure you want to delete "${name}" permanently?`,
                onConfirm: () => {
                  if (isFolder) {
                    deleteFolderMutation.mutate(contextMenu.item.id);
                  } else {
                    deleteMutation.mutate(contextMenu.item.id);
                  }
                }
              });
              setContextMenu(null);
            }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 12px', cursor: 'pointer', color: 'var(--brand-danger)' }}><Trash2 size={13} /> Delete</div>
          )}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>📁 Enterprise File Manager</h1>
          <p>Securely store, organize and share directories in your SMB storage cluster</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'files' && (
            <>
              {clipboardItem && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    moveOrCopyMutation.mutate({
                      itemType: clipboardItem.type,
                      itemId: clipboardItem.id,
                      targetFolderId: folderId || null,
                      action: clipboardItem.action
                    });
                  }}
                >
                  <Clipboard size={14} /> Paste here ({clipboardItem.action === 'cut' ? 'Cut' : 'Copy'})
                </button>
              )}
              {bulkClipboardItems.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    const toastId = toast.loading('Pasting bulk items...');
                    try {
                      await Promise.all(bulkClipboardItems.map(item =>
                        moveOrCopyMutation.mutateAsync({
                          itemType: item.type,
                          itemId: item.id,
                          targetFolderId: folderId || null,
                          action: bulkClipboardAction
                        })
                      ));
                      toast.success('Pasted successfully', { id: toastId });
                      setBulkClipboardItems([]);
                      setBulkClipboardAction(null);
                      qc.invalidateQueries({ queryKey: ['folders'] });
                      qc.invalidateQueries({ queryKey: ['files'] });
                    } catch {
                      toast.error('Failed to paste some items', { id: toastId });
                    }
                  }}
                >
                  <Clipboard size={14} /> Paste Bulk ({bulkClipboardAction === 'cut' ? 'Move' : 'Copy'})
                </button>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setIsBulkMode(!isBulkMode);
                  setSelectedItems([]);
                }}
                style={{ color: isBulkMode ? 'var(--brand-primary)' : 'inherit' }}
              >
                <CheckSquare size={15} /> {isBulkMode ? 'Exit Bulk' : 'Bulk Select'}
              </button>
              {shouldShowFolders && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowNewFolder(true)}><FolderOpen size={15} /> New Folder</button>
              )}
              <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                <Upload size={15} /> Upload Files {uploading && uploadProgressPercent === null && <div className="spinner" />}
                <input type="file" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) onDrop(Array.from(e.target.files)); }} />
              </label>
              <button 
                className="btn btn-primary btn-sm" 
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={() => {
                  setConfirmModal({
                    title: 'Upload Directory / Folder?',
                    message: 'This will stage all files inside the selected directory for upload to your current active folder directory. Do this only if you trust the files.',
                    iconType: 'folder',
                    confirmText: 'Select Folder',
                    cancelText: 'Cancel',
                    brandColor: 'var(--brand-primary)',
                    onConfirm: () => {
                      folderUploadInputRef.current?.click();
                    }
                  });
                }}
              >
                <FolderOpen size={15} /> Upload Folder {uploading && uploadProgressPercent === null && <div className="spinner" />}
              </button>
              <input 
                type="file" 
                ref={folderUploadInputRef} 
                {...{ webkitdirectory: "", directory: "", multiple: true } as any} 
                style={{ display: 'none' }} 
                onChange={e => { 
                  if (e.target.files) {
                    const startTime = performance.now();
                    console.log('[Upload Flow] Folder selected');
                    console.log('[Upload Flow] Folder scan start');
                    const rawFiles = e.target.files;
                    const MAX_FOLDER_FILES = 10000;
                    if (rawFiles.length > MAX_FOLDER_FILES) {
                      toast.error(`Folder contains too many files (${rawFiles.length.toLocaleString()}). For directories with more than ${MAX_FOLDER_FILES} files (like code projects), please compress them into a .zip or .tar archive before uploading.`);
                      e.target.value = '';
                      return;
                    }
                    setTimeout(() => {
                      const files = Array.from(rawFiles);
                      const scanEndTime = performance.now();
                      console.log(`[Upload Flow] Folder scan end. Time taken: ${(scanEndTime - startTime).toFixed(2)} ms. Files count: ${files.length}`);
                      onDropFolder(files);
                    }, 0);
                  }
                }} 
              />
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', gap: '16px', marginBottom: '-8px' }}>
        <button
          onClick={() => setActiveTab('files')}
          style={{ background: 'none', border: 'none', padding: '8px 12px', color: activeTab === 'files' ? 'var(--brand-primary)' : 'var(--text-tertiary)', borderBottom: activeTab === 'files' ? '2px solid var(--brand-primary)' : 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
        >
          📂 All Storage Directories
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          style={{ background: 'none', border: 'none', padding: '8px 12px', color: activeTab === 'requests' ? 'var(--brand-primary)' : 'var(--text-tertiary)', borderBottom: activeTab === 'requests' ? '2px solid var(--brand-primary)' : 'none', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          📥 Access Sharing Requests {pendingRequests.length > 0 && <span className="badge badge-primary" style={{ fontSize: '9px', padding: '2px 6px' }}>{pendingRequests.length}</span>}
        </button>
      </div>

      {activeTab === 'files' ? (
        <>
          {/* Toolbar */}
          <div className="card">
            <div className="card-body" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Breadcrumbs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, flexWrap: 'wrap' }}>
                {breadcrumbs.map((bc, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {i > 0 && <ChevronRight size={14} style={{ color: 'var(--text-tertiary)' }} />}
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: i === breadcrumbs.length - 1 ? 'var(--text-primary)' : 'var(--brand-primary)', fontWeight: i === breadcrumbs.length - 1 ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px', borderRadius: '4px' }}
                      onClick={() => navigateBreadcrumb(i, bc)}
                    >
                      {i === 0 && <Home size={13} />}{bc.name}
                    </button>
                  </span>
                ))}
              </div>

              {/* Horizontal Category Tabs */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: 'All Files' },
                  { key: 'photos', label: '🖼️ Photos' },
                  { key: 'videos', label: '🎥 Videos' },
                  { key: 'docs', label: '📄 Docs' },
                  { key: 'pdfs', label: '📕 PDFs' },
                  { key: 'programs', label: '💻 Programs' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setCategoryFilter(tab.key as any)}
                    className={`btn btn-xs ${categoryFilter === tab.key ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="search-bar" style={{ width: '200px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-tertiary)' }} />
                <input type="text" placeholder="Name or .ext (e.g., .pdf)" value={search} onChange={e => setSearch(e.target.value)} className="form-control" style={{ paddingLeft: '36px', height: '34px', fontSize: '12px' }} />
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('grid')}><Grid size={14} /></button>
                <button className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setViewMode('list')}><List size={14} /></button>
              </div>
            </div>
          </div>

          {/* New Folder Input */}
          {showNewFolder && (
            <div className="card card-body" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Folder size={18} style={{ color: 'var(--brand-warning)' }} />
              <input type="text" className="form-control" style={{ flex: 1 }} placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter' && newFolderName) createFolderMutation.mutate(newFolderName); if (e.key === 'Escape') setShowNewFolder(false); }} />
              <button className="btn btn-primary btn-sm" onClick={() => newFolderName && createFolderMutation.mutate(newFolderName)}>Create</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowNewFolder(false)}>Cancel</button>
            </div>
          )}

          {/* Grid / List View */}
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {/* Folders */}
              {shouldShowFolders && filteredFolders.map((folder: any) => {
                const locked = !hasAccess(folder);
                const isPublic = folder.path?.startsWith('/public');
                return (
                  <div 
                    key={folder.id} 
                    className="card card-hoverable" 
                    style={{ padding: '16px', textAlign: 'center', cursor: 'pointer', position: 'relative' }} 
                    onDoubleClick={() => handleDoubleClickFolder(folder)}
                    onContextMenu={(e) => openContextMenu(e, folder, 'folder')}
                  >
                    {isBulkMode && (
                      <input
                        type="checkbox"
                        checked={selectedItems.some(item => item.id === folder.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedItems(prev => [...prev, { id: folder.id, type: 'folder' }]);
                          } else {
                            setSelectedItems(prev => prev.filter(item => item.id !== folder.id));
                          }
                        }}
                        style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    )}
                    <Folder size={40} style={{ color: isPublic ? 'var(--brand-primary)' : locked ? 'var(--text-tertiary)' : '#f59e0b', margin: '0 auto 10px' }} />
                    {locked && <Lock size={12} style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--text-tertiary)' }} />}
                    
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Copy SMB Path" onClick={(e) => { e.stopPropagation(); handleCopyStructure(folder.name); }}><Copy size={11} /></button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Duplicate Folder" onClick={(e) => { e.stopPropagation(); handleDuplicate(folder.name); }}><Plus size={11} /></button>
                      <select
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: '10px', width: '36px', cursor: 'pointer' }}
                        onChange={(e) => handleTransfer(folder.name, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        defaultValue=""
                      >
                        <option value="" disabled>👑</option>
                        {allUsers.map((u: any) => (
                          <option key={u.id} value={u.fullName}>{u.fullName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}

              {/* Files */}
              {filteredFiles.map((file: any) => {
                const isImage = file.mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(file.extension?.toLowerCase() || '');
                return (
                  <div 
                    key={file.id} 
                    className="card card-hoverable group" 
                    style={{ padding: '16px', textAlign: 'center', position: 'relative', cursor: 'pointer' }}
                    onClick={() => handleOpenPreview(file)}
                    onDoubleClick={() => { if (file.storageUrl) window.open(file.storageUrl, '_blank'); }}
                    onContextMenu={(e) => openContextMenu(e, file, 'file')}
                  >
                    {isBulkMode && (
                      <input
                        type="checkbox"
                        checked={selectedItems.some(item => item.id === file.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedItems(prev => [...prev, { id: file.id, type: 'file' }]);
                          } else {
                            setSelectedItems(prev => prev.filter(item => item.id !== file.id));
                          }
                        }}
                        style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    )}
                    {isImage && file.storageUrl ? (
                      <div 
                        style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                      >
                        <img
                          src={file.storageUrl}
                          alt={file.originalName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div style={{ display: 'none', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '6px', color: 'var(--text-tertiary)' }}>
                          <FileImage size={32} style={{ color: '#8b5cf6' }} />
                          <span style={{ fontSize: '9px' }}>Image unavailable</span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '40px', margin: '0 auto 10px', display: 'flex', justifyContent: 'center' }}>
                        {getFileIcon(file.mimeType)}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.originalName}>{file.originalName}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{formatBytes(file.sizeBytes || file.size)}</div>
                  </div>
                );
              })}

              {(!shouldShowFolders || folders.length === 0) && filteredFiles.length === 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="empty-state" style={{ padding: '48px' }}><FolderOpen size={48} /><h3>No files available</h3><p>Upload files or choose a different category tab</p></div>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Permissions</th><th>Actions</th></tr></thead>
                  <tbody>
                    {[
                      ...(shouldShowFolders ? filteredFolders.map((f: any) => ({ ...f, isFolder: true })) : []),
                      ...filteredFiles
                    ].map((item: any) => {
                      const locked = item.isFolder && !hasAccess(item);
                      const isImage = !item.isFolder && (item.mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(item.extension?.toLowerCase() || ''));
                      return (
                        <tr 
                          key={item.id}
                          onContextMenu={(e) => openContextMenu(e, item, item.isFolder ? 'folder' : 'file')}
                        >
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {isBulkMode && (
                                <input
                                  type="checkbox"
                                  checked={selectedItems.some(s => s.id === item.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                      setSelectedItems(prev => [...prev, { id: item.id, type: item.isFolder ? 'folder' : 'file' }]);
                                    } else {
                                      setSelectedItems(prev => prev.filter(s => s.id !== item.id));
                                    }
                                  }}
                                  style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                                />
                              )}
                              {item.isFolder ? (
                                <Folder size={18} style={{ color: locked ? 'var(--text-tertiary)' : '#f59e0b', flexShrink: 0 }} />
                              ) : (
                                getFileIcon(item.mimeType)
                              )}
                              <span 
                                style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer' }} 
                                onClick={() => item.isFolder ? handleDoubleClickFolder(item) : handleOpenPreview(item)}
                              >
                                {item.name || item.originalName}
                              </span>
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{item.isFolder ? 'Folder' : (item.mimeType || 'File')}</td>
                          <td style={{ fontSize: '12px' }}>{item.isFolder ? '—' : formatBytes(item.sizeBytes || item.size)}</td>
                          <td>
                            {item.isFolder ? (
                              locked ? <span style={{ color: 'var(--brand-danger)', fontSize: '11px' }}>🔒 Protected</span> : <span style={{ color: 'var(--brand-success)', fontSize: '11px' }}>🔓 Accessible</span>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>Standard File</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {item.isFolder && locked && (
                                <button className="btn btn-secondary btn-xs" onClick={() => setLockFolder(item)}>Unlock</button>
                              )}
                              {!item.isFolder && <a href={item.storageUrl} download={item.originalName} className="btn btn-ghost btn-icon btn-sm" title="Download"><Download size={14} /></a>}
                              {!item.isFolder && <button className="btn btn-ghost btn-icon btn-sm" title="Delete" onClick={() => {
                                setConfirmModal({
                                  title: 'Delete File',
                                  message: `Are you sure you want to delete "${item.name || item.originalName}" permanently?`,
                                  onConfirm: () => deleteMutation.mutate(item.id)
                                });
                              }}><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Requests layout */
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Access Requests</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Manage incoming requests and view your sent requests</p>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => refetchRequests()} title="Reload"><RefreshCw size={14} /></button>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <div style={{ padding: '16px', fontWeight: 600, fontSize: '13px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              📥 Incoming Requests (For Your Folders)
            </div>
            <table>
              <thead>
                <tr>
                  <th>Requested Folder</th>
                  <th>Requester</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state" style={{ padding: '24px' }}>
                        <ShieldAlert size={24} style={{ opacity: 0.3 }} />
                        <h3>No pending share requests</h3>
                        <p>Access requests from your coworkers will populate here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingRequests.map((req: any) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>📁 {req.folderName}</td>
                      <td>{req.requesterName}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{new Date(req.requestedAt).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge badge-${req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'danger'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {req.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <select
                               id={`perm-select-${req.id}`}
                              className="form-control"
                              style={{ width: '130px', height: '28px', fontSize: '11px', padding: '0 8px' }}
                              defaultValue="read"
                            >
                              <option value="read">👁️ Read Only</option>
                              <option value="download">📥 Download</option>
                              <option value="upload">📤 Upload</option>
                              <option value="full">⚡ Full Access</option>
                            </select>
                            <button
                              className="btn btn-primary btn-xs"
                              onClick={() => {
                                const selectEl = document.getElementById(`perm-select-${req.id}`) as HTMLSelectElement;
                                reviewAccessMutation.mutate({ requestId: req.id, status: 'approved', permission: selectEl?.value || 'read' });
                              }}
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              className="btn btn-secondary btn-xs danger"
                              onClick={() => reviewAccessMutation.mutate({ requestId: req.id, status: 'rejected' })}
                            >
                              <X size={12} /> Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div style={{ padding: '16px', fontWeight: 600, fontSize: '13px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
              📤 My Sent Requests
            </div>
            <table>
              <thead>
                <tr>
                  <th>Requested Folder</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th>Permission Granted</th>
                </tr>
              </thead>
              <tbody>
                {mySentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state" style={{ padding: '24px' }}>
                        <p>You haven't sent any access requests yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  mySentRequests.map((req: any) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>📁 {req.folderName}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{new Date(req.requestedAt).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`badge badge-${req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'danger'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>{req.status === 'approved' ? req.permission : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
              <button className="btn btn-secondary btn-sm" style={{ padding: '8px 16px', borderRadius: '8px' }} onClick={() => setConfirmModal(null)}>
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

      {/* Bulk Share Overlay Modal */}
      {bulkSharingItems.length > 0 && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card card-body" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Share {bulkSharingItems.length} Items</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Select a teammate to copy/move these items to their chat-attachments folder.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600 }}>Teammate</label>
              <select id="bulk-share-target-user" className="form-control">
                {allUsers.filter((u: any) => u.id !== user?.id).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.role?.name || 'User'})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 600 }}>Action</label>
              <select id="bulk-share-action" className="form-control" defaultValue="copy">
                <option value="copy">👯 Duplicate Copy (Keep original)</option>
                <option value="move">🚚 Move Ownership (Transfer items)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setBulkSharingItems([])}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const targetUserId = (document.getElementById('bulk-share-target-user') as HTMLSelectElement).value;
                  const action = (document.getElementById('bulk-share-action') as HTMLSelectElement).value as 'move' | 'copy';
                  if (!targetUserId) {
                    toast.error('Please select a teammate');
                    return;
                  }
                  const fullItems = bulkSharingItems.map(item => {
                    if (item.type === 'folder') {
                      const f = folders.find((fol: any) => fol.id === item.id);
                      return {
                        id: item.id,
                        type: 'folder',
                        name: f?.name || 'Folder',
                        storageUrl: '',
                        size: '',
                        mimeType: ''
                      };
                    } else {
                      const f = files.find((fil: any) => fil.id === item.id);
                      return {
                        id: item.id,
                        type: 'file',
                        name: f?.originalName || f?.name || 'File',
                        storageUrl: f?.storageUrl || '',
                        size: f?.sizeBytes || f?.size || '',
                        mimeType: f?.mimeType || ''
                      };
                    }
                  });

                  const ids = fullItems.map(item => item.id).join(',');
                  const types = fullItems.map(item => item.type).join(',');
                  const names = fullItems.map(item => item.name).join(',');
                  const urls = fullItems.map(item => item.storageUrl).join(',');
                  const sizes = fullItems.map(item => item.size).join(',');
                  const mimes = fullItems.map(item => item.mimeType).join(',');

                  setBulkSharingItems([]);
                  setSelectedItems([]);
                  setIsBulkMode(false);
                  navigate(`/chat?shareItemId=${ids}&shareItemType=${types}&targetUserId=${targetUserId}&name=${encodeURIComponent(names)}&action=${action}&urls=${encodeURIComponent(urls)}&sizes=${encodeURIComponent(sizes)}&mimes=${encodeURIComponent(mimes)}`);
                }}
              >
                Share Bulk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {(isBulkMode || selectedItems.length > 0) && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 1100,
          background: 'var(--bg-card)', border: '1.5px solid var(--brand-primary)',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)', borderRadius: '32px',
          padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '16px',
          color: 'var(--text-primary)', backdropFilter: 'blur(8px)', animation: 'slideUp 0.3s ease'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700 }}>{selectedItems.length} selected</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
              const allItems = [
                ...filteredFolders.map((f: any) => ({ id: f.id, type: 'folder' as const })),
                ...filteredFiles.map((f: any) => ({ id: f.id, type: 'file' as const }))
              ];
              const isAllChecked = allItems.every(item => selectedItems.some(s => s.id === item.id));
              if (isAllChecked) {
                setSelectedItems([]);
              } else {
                setSelectedItems(allItems);
              }
            }}>
              {(() => {
                const allItems = [
                  ...filteredFolders.map((f: any) => ({ id: f.id, type: 'folder' as const })),
                  ...filteredFiles.map((f: any) => ({ id: f.id, type: 'file' as const }))
                ];
                const isAllChecked = allItems.length > 0 && allItems.every(item => selectedItems.some(s => s.id === item.id));
                return isAllChecked ? 'Deselect All' : 'Select All';
              })()}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={selectedItems.length === 0} onClick={() => {
              setBulkClipboardItems(selectedItems);
              setBulkClipboardAction('copy');
              toast.success(`${selectedItems.length} items copied to clipboard`);
            }}>
              Copy Bulk
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={selectedItems.length === 0} onClick={() => {
              setBulkClipboardItems(selectedItems);
              setBulkClipboardAction('cut');
              toast.success(`${selectedItems.length} items cut to clipboard`);
            }}>
              Cut Bulk
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={selectedItems.length === 0} onClick={() => {
              setBulkSharingItems(selectedItems);
            }}>
              Share Bulk
            </button>
            <button type="button" className="btn btn-danger btn-sm" disabled={selectedItems.length === 0} onClick={() => {
              setConfirmModal({
                title: 'Delete Selected Items',
                message: `Are you sure you want to delete these ${selectedItems.length} items permanently?`,
                onConfirm: async () => {
                  try {
                    await Promise.all(selectedItems.map(item => {
                      if (item.type === 'folder') {
                        return deleteFolderMutation.mutateAsync(item.id);
                      } else {
                        return deleteMutation.mutateAsync(item.id);
                      }
                    }));
                    toast.success('Selected items deleted');
                    setSelectedItems([]);
                    setIsBulkMode(false);
                  } catch {
                    toast.error('Failed to delete some items');
                  }
                }
              });
            }}>
              Delete Bulk
            </button>
            <button type="button" className="btn btn-secondary btn-sm btn-icon" onClick={() => { setSelectedItems([]); setIsBulkMode(false); }}><X size={14} /></button>
          </div>
        </div>
      )}

      {uploadProgressPercent !== null && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 1100,
          background: 'var(--bg-card)', border: '1.5px solid var(--brand-primary)',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px',
          color: 'var(--text-primary)', width: '280px', animation: 'slideUp 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--brand-primary)' }}>Uploading Files...</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>{uploadProgressPercent}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${uploadProgressPercent}%`, height: '100%', background: 'var(--brand-primary)', transition: 'width 0.1s ease-in-out' }} />
          </div>
        </div>
      )}
    </div>
  );
}
