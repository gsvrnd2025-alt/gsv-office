import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Search, Download, 
  Tag, X, StickyNote, Minimize2, Maximize2, Bold, Italic, Underline,
  List, ListOrdered, Code, Star, Pin, PinOff, Bell, Archive, 
  Lock, Unlock, Files, Printer, RotateCcw, RotateCw, Copy, Check, Eye, ChevronLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useThemeStore } from '../../store/theme.store';
import { useAuthStore } from '../../store/auth.store';
import Editor from '@monaco-editor/react';

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  tag: string;
  tags?: string[];
  updatedAt: string;
  createdAt?: string;
  isFavorite?: boolean;
  isPinned?: boolean;
  isLocked?: boolean;
  isArchived?: boolean;
  reminderTime?: string;
  fontSize?: string;
}

const NOTE_COLORS = [
  { name: 'Yellow', bg: '#fef08a', text: '#854d0e', border: '#eab308' },
  { name: 'Blue', bg: '#bfdbfe', text: '#1e40af', border: '#3b82f6' },
  { name: 'Green', bg: '#bbf7d0', text: '#166534', border: '#22c55e' },
  { name: 'Pink', bg: '#fbcfe8', text: '#9d174d', border: '#ec4899' },
  { name: 'Purple', bg: '#e9d5ff', text: '#6b21a8', border: '#a855f7' },
  { name: 'Slate', bg: '#334155', text: '#f8fafc', border: '#64748b' }
];

const PREDEFINED_TAGS = ['General', 'Work', 'Personal', 'Meeting', 'Reminder', 'Code'];

const getTagColor = (tag: string) => {
  switch (tag) {
    case 'All': return { bg: 'rgba(59, 130, 246, 0.1)', text: '#60a5fa', border: '#2563eb' };
    case 'General': return { bg: 'rgba(234, 179, 8, 0.1)', text: '#facc15', border: '#ca8a04' };
    case 'Work': return { bg: 'rgba(16, 185, 129, 0.1)', text: '#34d399', border: '#059669' };
    case 'Personal': return { bg: 'rgba(236, 72, 153, 0.1)', text: '#f472b6', border: '#db2777' };
    case 'Meeting': return { bg: 'rgba(139, 92, 246, 0.1)', text: '#a78bfa', border: '#7c3aed' };
    case 'Reminder': return { bg: 'rgba(249, 115, 22, 0.1)', text: '#fb923c', border: '#ea580c' };
    case 'Code': return { bg: 'rgba(99, 102, 241, 0.1)', text: '#818cf8', border: '#4f46e5' };
    default: return { bg: 'rgba(100, 116, 139, 0.1)', text: '#94a3b8', border: '#475569' };
  }
};

const getCategoryEmoji = (cat: string) => {
  switch (cat) {
    case 'All': return '🏠';
    case 'General': return '🏷️';
    case 'Work': return '💼';
    case 'Personal': return '👤';
    case 'Meeting': return '🤝';
    case 'Reminder': return '⏰';
    case 'Code': return '💻';
    default: return '🏷️';
  }
};

const detectLanguage = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py': return 'python';
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'cpp': case 'c': case 'h': case 'ino': return 'cpp';
    case 'cs': return 'csharp';
    case 'sql': return 'sql';
    case 'json': return 'json';
    case 'xml': return 'xml';
    case 'sh': return 'shell';
    default: return 'javascript';
  }
};

export default function FloatingStickyNotes() {
  const { user } = useAuthStore();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  // Note Lists
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  
  // Nav Filter: 'all' | 'favorites' | 'reminders' | 'trash'
  const [selectedNav, setSelectedNav] = useState<'all' | 'favorites' | 'reminders' | 'trash'>('all');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('gsv_note_categories');
    return saved ? JSON.parse(saved) : PREDEFINED_TAGS;
  });

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<Note[][]>([]);
  const [redoStack, setRedoStack] = useState<Note[][]>([]);

  // States for reminders
  const [showReminderPopover, setShowReminderPopover] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');

  // States for Zoom / Full Screen preview
  const [zoomNote, setZoomNote] = useState<Note | null>(null);

  // States for Custom Tags
  const [tagInput, setTagInput] = useState('');

  // Auto-save Status
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ellipsis dropdown menu state
  const [showMenuNoteId, setShowMenuNoteId] = useState<string | null>(null);

  // FAB Drag Position
  const [fabPosition, setFabPosition] = useState({
    x: window.innerWidth - 80,
    y: window.innerHeight - 80
  });
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const fabDragStartRef = useRef({ x: 0, y: 0 });
  const fabPosStartRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);

  // Popup Window Drag Position (null = centered)
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingPopup, setIsDraggingPopup] = useState(false);
  const popupDragStartRef = useRef({ mouseX: 0, mouseY: 0, popupX: 0, popupY: 0 });

  const editorContentRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notes
  const loadNotes = () => {
    const saved = localStorage.getItem('gsv_sticky_notes');
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {}
    } else {
      const defaultNote: Note = {
        id: 'default-1',
        title: 'Welcome to GSV Notes 📝',
        content: '<div>Welcome to your new Premium Sticky Notes Workspace.</div><div><br></div><div>🚀 <strong>Features:</strong></div><div>- Horizontal tab layout</div><div>- Monaco Editor support for code</div><div>- Custom tags, Pin, and Favorite logs</div><div>- File imports (.txt, .md, scripts)</div><div>- Auto-save integration</div>',
        color: '#fef08a',
        tag: 'General',
        tags: ['#WELCOME', '#GUIDE'],
        updatedAt: new Date().toLocaleString()
      };
      setNotes([defaultNote]);
      localStorage.setItem('gsv_sticky_notes', JSON.stringify([defaultNote]));
    }
  };

  useEffect(() => {
    loadNotes();
    const handleSync = () => loadNotes();
    window.addEventListener('storage', handleSync);
    window.addEventListener('gsv-notes-update', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('gsv-notes-update', handleSync);
    };
  }, []);

  // Close menus on outside clicks
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMenuNoteId(null);
      }
    };
    if (showMenuNoteId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenuNoteId]);

  // Check Reminders Tick
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      let changed = false;
      const updatedNotes = notes.map(n => {
        if (n.reminderTime && !n.isArchived) {
          const rDate = new Date(n.reminderTime);
          if (now >= rDate) {
            toast(`⏰ GSV Note Reminder: ${n.title}`, {
              icon: '⏰',
              duration: 8000,
              style: {
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #6366f1'
              }
            });
            try {
              const audio = new Audio('/assets/sounds/notification.mp3');
              audio.play();
            } catch {}
            changed = true;
            return { ...n, reminderTime: undefined };
          }
        }
        return n;
      });
      if (changed) {
        saveNotes(updatedNotes);
      }
    };
    
    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
  }, [notes]);

  const saveNotes = (updatedNotes: Note[], isUndoAction = false) => {
    if (!isUndoAction) {
      setUndoStack(prev => [...prev, notes]);
      setRedoStack([]);
    }
    setNotes(updatedNotes);
    localStorage.setItem('gsv_sticky_notes', JSON.stringify(updatedNotes));
    window.dispatchEvent(new Event('gsv-notes-update'));
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, notes]);
    saveNotes(previous, true);
    toast.success('Undo action applied');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, notes]);
    saveNotes(next, true);
    toast.success('Redo action applied');
  };

  // FAB Drag Mouse Events
  const handleFabMouseDown = (e: React.MouseEvent) => {
    setIsDraggingFab(true);
    dragDistanceRef.current = 0;
    fabDragStartRef.current = { x: e.clientX, y: e.clientY };
    fabPosStartRef.current = { ...fabPosition };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingFab) {
        const dx = e.clientX - fabDragStartRef.current.x;
        const dy = e.clientY - fabDragStartRef.current.y;
        dragDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
        setFabPosition({
          x: Math.max(10, Math.min(window.innerWidth - 70, fabPosStartRef.current.x + dx)),
          y: Math.max(10, Math.min(window.innerHeight - 70, fabPosStartRef.current.y + dy))
        });
      }
    };
    const handleMouseUp = () => {
      setIsDraggingFab(false);
    };
    if (isDraggingFab) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingFab]);

  // Popup drag mouse events
  const handlePopupHeaderMouseDown = (e: React.MouseEvent) => {
    // Only drag from header, not from buttons
    if ((e.target as HTMLElement).closest('button')) return;
    if (isMaximized) return;
    e.preventDefault();
    const popupW = 900;
    const popupH = 600;
    const startX = popupPosition ? popupPosition.x : (window.innerWidth - popupW) / 2;
    const startY = popupPosition ? popupPosition.y : (window.innerHeight - popupH) / 2;
    popupDragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, popupX: startX, popupY: startY };
    setIsDraggingPopup(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPopup) {
        const popupW = isMaximized ? window.innerWidth : 900;
        const popupH = isMaximized ? window.innerHeight : 600;
        const dx = e.clientX - popupDragStartRef.current.mouseX;
        const dy = e.clientY - popupDragStartRef.current.mouseY;
        setPopupPosition({
          x: Math.max(0, Math.min(window.innerWidth - popupW, popupDragStartRef.current.popupX + dx)),
          y: Math.max(0, Math.min(window.innerHeight - popupH, popupDragStartRef.current.popupY + dy))
        });
      }
    };
    const handleMouseUp = () => {
      setIsDraggingPopup(false);
    };
    if (isDraggingPopup) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPopup, isMaximized]);

  const handleFabClick = () => {
    if (dragDistanceRef.current < 5) {
      setIsPopupOpen(!isPopupOpen);
    }
  };

  const createNewNote = (category = 'General', defaultTitle = '') => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: defaultTitle || `New Note #${notes.length + 1}`,
      content: '<div>Start writing content...</div>',
      color: NOTE_COLORS[0].bg,
      tag: category,
      tags: [],
      updatedAt: new Date().toLocaleString(),
      createdAt: new Date().toLocaleString()
    };
    const updated = [newNote, ...notes];
    saveNotes(updated);
    setActiveNoteId(newNote.id);
    toast.success('Created new note! 📝');
  };

  const deleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notes.filter(n => n.id !== id);
    saveNotes(updated);
    if (activeNoteId === id) setActiveNoteId(null);
    toast.success('Note deleted permanently.');
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    const updated = notes.map(n => {
      if (n.id === id) {
        return {
          ...n,
          ...updates,
          updatedAt: new Date().toLocaleString()
        };
      }
      return n;
    });
    saveNotes(updated);
  };

  const updateNoteWithIndicator = (id: string, updates: Partial<Note>) => {
    setAutoSaveStatus('saving');
    updateNote(id, updates);
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => {
      setAutoSaveStatus('saved');
    }, 1200);
  };

  // Sync active editor content
  const activeNote = notes.find(n => n.id === activeNoteId);
  const isCodeNoteActive = activeNote && (activeNote.tag === 'Code' || 
    ['.ino', '.c', '.cpp', '.h', '.py', '.js', '.ts', '.html', '.css', '.php', '.java', '.cs', '.sql', '.sh', '.bat', '.ps1'].some(ext => activeNote.title.toLowerCase().endsWith(ext)));

  useEffect(() => {
    if (editorContentRef.current && activeNote && !isCodeNoteActive) {
      editorContentRef.current.innerHTML = activeNote.content || '';
    }
  }, [activeNoteId, isCodeNoteActive]);

  const handleEditorInput = () => {
    if (editorContentRef.current && activeNote) {
      updateNoteWithIndicator(activeNote.id, { content: editorContentRef.current.innerHTML });
    }
  };

  const execFormat = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    handleEditorInput();
  };

  // Add Custom tag
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && activeNote) {
      const clean = tagInput.trim().startsWith('#') ? tagInput.trim() : `#${tagInput.trim()}`;
      const currentTags = activeNote.tags || [];
      if (!currentTags.includes(clean)) {
        updateNoteWithIndicator(activeNote.id, { tags: [...currentTags, clean] });
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (activeNote) {
      const updatedTags = (activeNote.tags || []).filter(t => t !== tagToRemove);
      updateNoteWithIndicator(activeNote.id, { tags: updatedTags });
    }
  };

  // Import Files
  const handleImportFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (typeof text !== 'string') return;
        
        let category = 'General';
        const codeExtensions = ['ino', 'c', 'cpp', 'h', 'py', 'js', 'ts', 'html', 'css', 'php', 'java', 'cs', 'sql', 'sh', 'bat', 'ps1'];
        if (codeExtensions.includes(extension)) {
          category = 'Code';
        } else if (extension === 'md') {
          category = 'Work';
        }
        
        const newNote: Note = {
          id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: file.name,
          content: `<div>${text.replace(/\n/g, '<br>')}</div>`,
          color: '#bfdbfe',
          tag: category,
          tags: [`#${extension.toUpperCase()}`],
          updatedAt: new Date().toLocaleString(),
          createdAt: new Date().toLocaleString()
        };
        
        const updated = [newNote, ...notes];
        saveNotes(updated);
        setActiveNoteId(newNote.id);
        toast.success(`Imported ${file.name} successfully`);
      };
      
      reader.readAsText(file);
    });
  };

  // Export & Downloads
  const handleDownload = (format: 'txt' | 'json' | 'md' | 'html', note: Note) => {
    const { title, content, tag, tags = [], updatedAt } = note;
    const textContent = content.replace(/<\/div>/g, '\n').replace(/<[^>]*>/g, '');
    let fileContent = '';
    let mimeType = 'text/plain';
    
    if (format === 'txt') {
      fileContent = `Title: ${title}\nCategory: ${tag}\nTags: ${tags.join(', ')}\nUpdated: ${updatedAt}\n\n${textContent}`;
      mimeType = 'text/plain;charset=utf-8';
    } else if (format === 'json') {
      fileContent = JSON.stringify(note, null, 2);
      mimeType = 'application/json;charset=utf-8';
    } else if (format === 'md') {
      fileContent = `# ${title}\n\n- **Category**: ${tag}\n- **Tags**: ${tags.join(', ')}\n- **Updated**: ${updatedAt}\n\n${textContent}`;
      mimeType = 'text/markdown;charset=utf-8';
    } else if (format === 'html') {
      fileContent = `
        <!DOCTYPE html>
        <html>
        <head><title>${title}</title></head>
        <body style="font-family:sans-serif;padding:30px;color:#1e293b;background:#f8fafc;">
          <h1>${title}</h1>
          <p><strong>Category:</strong> ${tag} | <strong>Tags:</strong> ${tags.join(', ')}</p>
          <hr>
          <div>${content}</div>
        </body>
        </html>
      `;
      mimeType = 'text/html;charset=utf-8';
    }
    
    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${format.toUpperCase()}`);
  };

  const handlePrintNote = (note: Note) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Allow popups to print');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Note: ${note.title}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { border-bottom: 3px solid #6366F1; padding-bottom: 15px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: 800; margin: 0 0 10px 0; color: #0f172a; }
            .meta { font-size: 13px; color: #64748b; font-weight: 600; }
            .content { font-size: 16px; white-space: pre-wrap; color: #334155; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${note.title}</h1>
            <div class="meta">
              📂 Category: ${note.tag} | 📅 Date: ${note.updatedAt}
            </div>
          </div>
          <div class="content">${note.content.replace(/<\/div>/g, '\n').replace(/<[^>]*>/g, '')}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Add category
  const handleAddNewCategory = () => {
    const tag = prompt('Enter new category tag:');
    if (tag && tag.trim().length > 0) {
      const cleanTag = tag.trim();
      if (categories.includes(cleanTag)) {
        toast.error('Category already exists.');
        return;
      }
      const updated = [...categories, cleanTag];
      setCategories(updated);
      localStorage.setItem('gsv_note_categories', JSON.stringify(updated));
      toast.success(`Added Category "${cleanTag}"!`);
    }
  };

  // Set Reminder date/time
  const handleSaveReminder = () => {
    if (!reminderDate || !activeNote) return;
    const timeStr = reminderTime || '09:00';
    const isoDateTime = new Date(`${reminderDate}T${timeStr}`).toISOString();
    updateNoteWithIndicator(activeNote.id, { reminderTime: isoDateTime });
    setShowReminderPopover(false);
    toast.success('Reminder scheduled successfully! ⏰');
  };

  const handleBulkExport = () => {
    const combinedData = JSON.stringify(filteredNotes, null, 2);
    const blob = new Blob([combinedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bulk_Notes_Export_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredNotes.length} notes as JSON`);
  };

  // Filters logic
  const filteredNotes = notes.filter(n => {
    const searchLower = searchQuery.toLowerCase();
    const contentText = n.content.toLowerCase();
    const tagsText = (n.tags || []).join(' ').toLowerCase();
    const matchesSearch = 
      n.title.toLowerCase().includes(searchLower) || 
      contentText.includes(searchLower) ||
      tagsText.includes(searchLower) ||
      n.tag.toLowerCase().includes(searchLower);

    const matchesTag = selectedTagFilter === 'All' || n.tag === selectedTagFilter;

    if (selectedNav === 'trash') {
      return n.isArchived && matchesSearch && matchesTag;
    }
    if (n.isArchived) return false;

    if (selectedNav === 'favorites') {
      return n.isFavorite && matchesSearch && matchesTag;
    }
    if (selectedNav === 'reminders') {
      return n.reminderTime !== undefined && matchesSearch && matchesTag;
    }

    return matchesSearch && matchesTag;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  // Render Subviews inside popup
  const renderNoteEditView = () => {
    if (!activeNote) return null;
    const colorObj = NOTE_COLORS.find(c => c.bg === activeNote.color) || NOTE_COLORS[0];
    const isCode = activeNote.tag === 'Code' || 
      ['.ino', '.c', '.cpp', '.h', '.py', '.js', '.ts', '.html', '.css', '.php', '.java', '.cs', '.sql', '.sh', '.bat', '.ps1'].some(ext => activeNote.title.toLowerCase().endsWith(ext));

    return (
      <div 
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: colorObj.bg,
          color: colorObj.text,
          padding: '24px',
          overflow: 'hidden',
          transition: 'background 0.3s ease, color 0.3s ease'
        }}
      >
        {/* Note Editor Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid rgba(0,0,0,0.08)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <button 
              onClick={() => {
                setActiveNoteId(null);
                setShowMenuNoteId(null);
              }}
              className="btn d-flex align-items-center gap-2"
              style={{
                background: 'rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.1)',
                color: 'inherit',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '8px',
                padding: '6px 12px'
              }}
            >
              ← Back
            </button>
            <input 
              type="text"
              value={activeNote.title}
              onChange={e => updateNoteWithIndicator(activeNote.id, { title: e.target.value })}
              placeholder="Note Title..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontWeight: 800,
                fontSize: '20px',
                color: 'inherit',
                flex: 1
              }}
            />
          </div>

          {/* Three Dot Menu Trigger */}
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
              onClick={() => setShowMenuNoteId(showMenuNoteId === activeNote.id ? null : activeNote.id)}
              className="btn"
              style={{
                width: '34px', height: '34px',
                background: 'rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.1)',
                color: 'inherit',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
              title="Menu Options"
            >
              •••
            </button>

            {showMenuNoteId === activeNote.id && (
              <div 
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '40px',
                  background: '#1E293B',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  width: '200px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  zIndex: 1010,
                  overflow: 'hidden',
                  color: '#fff',
                  fontSize: '12px'
                }}
              >
                {/* Colors section */}
                <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px', color: '#94A3B8' }}>Change Color:</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {NOTE_COLORS.map(c => (
                      <div 
                        key={c.name}
                        onClick={() => {
                          updateNoteWithIndicator(activeNote.id, { color: c.bg });
                          setShowMenuNoteId(null);
                        }}
                        style={{
                          width: '18px', height: '18px', borderRadius: '50%', background: c.bg,
                          cursor: 'pointer', border: activeNote.color === c.bg ? '2.5px solid #fff' : '1px solid rgba(255,255,255,0.3)'
                        }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
                {/* Save As section */}
                <div style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="px-3 py-1 text-muted" style={{ fontWeight: 700, fontSize: '10px' }}>SAVE AS:</div>
                  <button className="dropdown-item w-100 text-start border-0 bg-transparent px-3 py-2 text-white hover-note-item" onClick={() => { handleDownload('txt', activeNote); setShowMenuNoteId(null); }}>📄 Text File (.txt)</button>
                  <button className="dropdown-item w-100 text-start border-0 bg-transparent px-3 py-2 text-white hover-note-item" onClick={() => { handleDownload('json', activeNote); setShowMenuNoteId(null); }}>💻 JSON Document (.json)</button>
                  <button className="dropdown-item w-100 text-start border-0 bg-transparent px-3 py-2 text-white hover-note-item" onClick={() => { handleDownload('md', activeNote); setShowMenuNoteId(null); }}>📝 Markdown (.md)</button>
                  <button className="dropdown-item w-100 text-start border-0 bg-transparent px-3 py-2 text-white hover-note-item" onClick={() => { handleDownload('html', activeNote); setShowMenuNoteId(null); }}>🌐 HTML Webpage (.html)</button>
                </div>
                {/* Print section */}
                <button 
                  className="dropdown-item w-100 text-start border-0 bg-transparent px-3 py-3 text-warning hover-note-item" 
                  style={{ fontWeight: 700 }}
                  onClick={() => { handlePrintNote(activeNote); setShowMenuNoteId(null); }}
                >
                  🖨️ Print Note
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Rich Formatting Toolbar */}
        {!isCode && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              background: 'rgba(0,0,0,0.04)', 
              border: '1px solid rgba(0,0,0,0.08)',
              padding: '6px 12px',
              borderRadius: '10px',
              marginBottom: '16px'
            }}
          >
            {/* Bold */}
            <button 
              onClick={() => execFormat('bold')} 
              className="btn btn-sm"
              style={{ background: 'transparent', border: 'none', color: 'inherit', fontWeight: 'bold' }}
              title="Bold"
            >
              <Bold size={15} />
            </button>
            {/* Italic */}
            <button 
              onClick={() => execFormat('italic')} 
              className="btn btn-sm"
              style={{ background: 'transparent', border: 'none', color: 'inherit' }}
              title="Italic"
            >
              <Italic size={15} />
            </button>
            {/* Underline */}
            <button 
              onClick={() => execFormat('underline')} 
              className="btn btn-sm"
              style={{ background: 'transparent', border: 'none', color: 'inherit' }}
              title="Underline"
            >
              <Underline size={15} />
            </button>

            <div style={{ height: '16px', borderLeft: '1px solid rgba(0,0,0,0.1)' }}></div>

            {/* Font Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>Size:</span>
              <select 
                value={activeNote.fontSize || '16px'} 
                onChange={e => updateNoteWithIndicator(activeNote.id, { fontSize: e.target.value })}
                style={{ 
                  background: 'rgba(255,255,255,0.6)', 
                  border: '1px solid rgba(0,0,0,0.15)',
                  borderRadius: '6px',
                  fontSize: '11px',
                  padding: '2px 6px',
                  color: '#000',
                  fontWeight: 700
                }}
              >
                <option value="12px">12px</option>
                <option value="14px">14px</option>
                <option value="16px">16px</option>
                <option value="18px">18px</option>
                <option value="20px">20px</option>
                <option value="24px">24px</option>
              </select>
            </div>

            <div style={{ height: '16px', borderLeft: '1px solid rgba(0,0,0,0.1)' }}></div>

            {/* Pin and Favorite options */}
            <button
              onClick={() => updateNoteWithIndicator(activeNote.id, { isPinned: !activeNote.isPinned })}
              className="btn border-0 p-0"
              style={{ color: activeNote.isPinned ? '#ca8a04' : 'inherit', background: 'transparent' }}
              title={activeNote.isPinned ? 'Unpin note' : 'Pin note'}
            >
              {activeNote.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
            <button
              onClick={() => updateNoteWithIndicator(activeNote.id, { isFavorite: !activeNote.isFavorite })}
              className="btn border-0 p-0"
              style={{ color: activeNote.isFavorite ? '#fb7185' : 'inherit', background: 'transparent' }}
              title={activeNote.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
            >
              <Star size={14} fill={activeNote.isFavorite ? '#fb7185' : 'none'} />
            </button>

            {/* Reminder Date Selector */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={() => setShowReminderPopover(!showReminderPopover)}
                className="btn btn-xs d-flex align-items-center gap-1 border-0"
                style={{
                  background: activeNote.reminderTime ? 'rgba(234,179,8,0.2)' : 'rgba(0,0,0,0.04)',
                  color: activeNote.reminderTime ? '#ca8a04' : 'inherit',
                  fontSize: '11px',
                  fontWeight: 700
                }}
                disabled={activeNote.isLocked}
              >
                <Bell size={11} /> Reminder
              </button>

              {showReminderPopover && (
                <div 
                  className="position-absolute p-3 rounded shadow animate-scale-in"
                  style={{
                    bottom: '30px',
                    right: 0,
                    background: '#111827',
                    border: '1.5px solid rgba(255,255,255,0.1)',
                    width: '240px',
                    zIndex: 105,
                    color: '#fff'
                  }}
                >
                  <label style={{ fontSize: '10px', display: 'block', marginBottom: '4px' }}>Date</label>
                  <input 
                    type="date" 
                    className="form-control mb-2 text-primary"
                    value={reminderDate}
                    onChange={e => setReminderDate(e.target.value)}
                  />
                  <label style={{ fontSize: '10px', display: 'block', marginBottom: '4px' }}>Time</label>
                  <input 
                    type="time" 
                    className="form-control mb-3 text-primary"
                    value={reminderTime}
                    onChange={e => setReminderTime(e.target.value)}
                  />
                  <div className="d-flex gap-2 justify-content-end">
                    <button onClick={() => setShowReminderPopover(false)} className="btn btn-xs btn-ghost text-muted">Cancel</button>
                    <button onClick={handleSaveReminder} className="btn btn-xs btn-primary text-white" style={{ background: '#6366F1' }}>Schedule</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Editor Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {isCode ? (
            <div style={{ flex: 1, overflow: 'hidden', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)' }}>
              <Editor
                height="100%"
                theme="vs-dark"
                language={detectLanguage(activeNote.title)}
                value={activeNote.content.replace(/<\/div>/g, '\n').replace(/<[^>]*>/g, '')}
                onChange={(val) => {
                  updateNoteWithIndicator(activeNote.id, { content: `<div>${(val || '').replace(/\n/g, '<br>')}</div>` });
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollbar: { vertical: 'auto', horizontal: 'auto' }
                }}
              />
            </div>
          ) : (
            <div 
              ref={editorContentRef}
              contentEditable
              onInput={handleEditorInput}
              data-placeholder="Start typing your note here..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                overflowY: 'auto',
                fontSize: activeNote.fontSize || '16px',
                lineHeight: 1.6,
                color: 'inherit',
                padding: '8px 4px',
                resize: 'none'
              }}
            />
          )}
        </div>

        {/* Bottom Save Indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '12px', fontSize: '11px', opacity: 0.8 }}>
          <span>Last modified: {activeNote.updatedAt}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {autoSaveStatus === 'saving' && <span className="badge bg-warning text-dark">⏳ Saving...</span>}
            {autoSaveStatus === 'saved' && <span className="badge bg-success">✓ Saved</span>}
            <button 
              onClick={() => {
                deleteNote(activeNote.id);
                setActiveNoteId(null);
              }}
              className="btn p-0 text-danger border-0 ml-3"
              style={{ background: 'transparent' }}
            >
              🗑️ Delete Note
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderNotesListView = () => {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '24px' }}>
        
        {/* Second Row: Tabs, Add button and Filter settings */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Horizontal category tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span
              onClick={() => setSelectedTagFilter('All')}
              className="badge cursor-pointer rounded-pill"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '8px 16px',
                border: '1.5px solid ' + (selectedTagFilter === 'All' ? '#6366F1' : 'rgba(255,255,255,0.1)'),
                background: selectedTagFilter === 'All' ? '#6366F1' : 'rgba(255,255,255,0.03)',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              🏠 All
            </span>
            {categories.map(tg => {
              const colors = getTagColor(tg);
              const isActive = selectedTagFilter === tg;
              return (
                <span
                  key={tg}
                  onClick={() => setSelectedTagFilter(tg)}
                  className="badge cursor-pointer rounded-pill"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '8px 16px',
                    border: '1.5px solid ' + (isActive ? colors.border : 'rgba(255,255,255,0.1)'),
                    background: isActive ? colors.bg : 'rgba(255,255,255,0.03)',
                    color: colors.text,
                    cursor: 'pointer'
                  }}
                >
                  {getCategoryEmoji(tg)} {tg}
                </span>
              );
            })}

            {/* Create New Note Plus Button */}
            <button 
              onClick={() => createNewNote(selectedTagFilter === 'All' ? 'General' : selectedTagFilter)}
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', 
                border: 'none', 
                color: '#fff', 
                fontWeight: 800,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(99,102,241,0.3)',
                cursor: 'pointer'
              }}
              title="Add New Note"
            >
              +
            </button>
          </div>

          {/* Right Filters alignment */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[
              { id: 'all', label: 'All Notes' },
              { id: 'favorites', label: 'Favorite List' },
              { id: 'reminders', label: 'Reminder' },
              { id: 'trash', label: 'Trash' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedNav(item.id as any)}
                className="btn btn-sm"
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid ' + (selectedNav === item.id ? '#ca8a04' : 'rgba(255,255,255,0.08)'),
                  background: selectedNav === item.id ? 'rgba(202,138,4,0.1)' : 'rgba(255,255,255,0.02)',
                  color: selectedNav === item.id ? '#facc15' : '#cbd5e1',
                  cursor: 'pointer'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Import & Export Files options */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button 
              onClick={() => importFileRef.current?.click()}
              className="btn btn-xs text-info"
              style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(59,130,246,0.1)', border: '1.5px solid rgba(59,130,246,0.2)', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer' }}
              title="Import files from PC (.txt, .md, scripts)"
            >
              📥 Import
            </button>
            {filteredNotes.length > 0 && (
              <button 
                onClick={handleBulkExport}
                className="btn btn-xs text-success"
                style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(16,185,129,0.1)', border: '1.5px solid rgba(16,185,129,0.2)', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer' }}
                title="Export listed notes as JSON"
              >
                Export
              </button>
            )}
          </div>
        </div>

        {/* Cards Grid */}
        <div 
          className="flex-grow-1 mt-4" 
          style={{ 
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px',
            alignContent: 'start'
          }}
        >
          {sortedNotes.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94A3B8', fontSize: '13px', padding: '40px' }}>
              📪 No notes found. Click the '+' button to add one.
            </div>
          ) : (
            sortedNotes.map(n => {
              const colorObj = NOTE_COLORS.find(c => c.bg === n.color) || NOTE_COLORS[0];
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    setActiveNoteId(n.id);
                  }}
                  className="p-3 note-card-grid transition-all"
                  style={{
                    background: colorObj.bg,
                    color: colorObj.text,
                    border: `2px solid ${colorObj.border}`,
                    borderRadius: '16px',
                    height: '140px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  title="Click to view & edit note"
                >
                  {/* Note Title display */}
                  <strong 
                    style={{ 
                      fontSize: '15px', 
                      lineHeight: 1.4, 
                      fontWeight: 800,
                      wordBreak: 'break-word',
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      marginRight: n.isPinned ? '16px' : 0
                    }}
                  >
                    {n.isLocked && '🔒 '}
                    {n.title || 'Untitled Note'}
                  </strong>

                  {/* Bottom details of card */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', opacity: 0.8, borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '6px' }}>
                    <span>{n.tag}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {n.isPinned && <span>📌</span>}
                      {n.isFavorite && <span>⭐</span>}
                      {n.reminderTime && <span>⏰</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'relative', zIndex: 9999 }}>
      
      {/* Draggable FAB Glowing Trigger Button */}
      <button 
        onMouseDown={handleFabMouseDown}
        onClick={handleFabClick}
        className="d-flex align-items-center justify-content-center border-0 rounded-circle text-white gsv-glow-fab"
        style={{ 
          position: 'fixed',
          left: `${fabPosition.x}px`,
          top: `${fabPosition.y}px`,
          width: '60px', 
          height: '60px', 
          background: 'linear-gradient(135deg, #fb7185 0%, #f59e0b 50%, #eab308 100%)',
          boxShadow: '0 0 25px rgba(245, 158, 11, 0.5), 0 5px 15px rgba(0,0,0,0.3)',
          cursor: isDraggingFab ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none'
        }}
        title="GSV Sticky Notes (Drag to move)"
      >
        <StickyNote size={28} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }} />
      </button>

      {/* Main Centered Popup Page */}
      {isPopupOpen && (
        <div 
          className={isDraggingPopup ? '' : 'animate-scale-in'}
          style={{
            position: 'fixed',
            left: isMaximized ? 0 : (popupPosition ? `${popupPosition.x}px` : '50%'),
            top: isMaximized ? 0 : (popupPosition ? `${popupPosition.y}px` : '50%'),
            width: isMaximized ? '100vw' : '900px',
            height: isMaximized ? '100vh' : '600px',
            transform: isMaximized ? 'none' : (popupPosition ? 'none' : 'translate(-50%, -50%)'),
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderRadius: isMaximized ? 0 : '20px',
            boxShadow: isDraggingPopup ? '0 35px 70px -12px rgba(0, 0, 0, 0.9)' : '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
            color: '#F8FAFC',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: isDraggingPopup ? 'grabbing' : 'default',
            userSelect: isDraggingPopup ? 'none' : 'auto',
            transition: isDraggingPopup ? 'none' : 'box-shadow 0.2s ease'
          }}
        >
          {/* Header Row - Drag handle */}
          <div 
            onMouseDown={handlePopupHeaderMouseDown}
            style={{
              padding: '16px 24px',
              background: 'rgba(30, 41, 59, 0.5)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              cursor: isMaximized ? 'default' : (isDraggingPopup ? 'grabbing' : 'grab')
            }}
          >
            {/* Logo and User Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>📝</span>
              <div>
                <strong style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                  GSV Sticky Notes
                </strong>
                <span style={{ display: 'block', fontSize: '11px', color: '#94A3B8' }}>
                  User: {user?.fullName || 'Active User'}
                </span>
              </div>
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
              <Search size={14} className="position-absolute text-muted" style={{ left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search note titles or content..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-control"
                style={{
                  paddingLeft: '34px',
                  height: '34px',
                  fontSize: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  borderRadius: '10px'
                }}
              />
            </div>

            {/* Window Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Maximize / Restore */}
              <button 
                onClick={() => {
                  setIsMaximized(!isMaximized);
                  if (!isMaximized) setPopupPosition(null); // reset position on maximize
                }} 
                className="btn" 
                style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', borderRadius: '6px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={isMaximized ? "Restore Window" : "Maximize Window"}
              >
                <Maximize2 size={13} />
              </button>
              {/* Minimize */}
              <button 
                onClick={() => setIsPopupOpen(false)} 
                className="btn" 
                style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', borderRadius: '6px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Minimize Window"
              >
                <Minimize2 size={13} />
              </button>
              {/* Close */}
              <button 
                onClick={() => setIsPopupOpen(false)} 
                className="btn text-danger" 
                style={{ width: '28px', height: '28px', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', borderRadius: '6px', fontWeight: 'bold', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Close Window"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Subpage Router Area */}
          {activeNoteId ? renderNoteEditView() : renderNotesListView()}
        </div>
      )}

      {/* Hidden file input */}
      <input 
        type="file" 
        ref={importFileRef} 
        onChange={handleImportFiles} 
        style={{ display: 'none' }} 
        multiple 
        accept=".txt,.md,.json,.csv,.log,.ini,.cfg,.ino,.c,.cpp,.h,.py,.js,.ts,.html,.css,.php,.java,.cs,.sql,.sh,.bat,.ps1"
      />

      {/* Styled css sheets */}
      <style>{`
        .gsv-glow-fab {
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .gsv-glow-fab:hover {
          transform: scale(1.1) rotate(5deg) !important;
          box-shadow: 0 0 35px rgba(245, 158, 11, 0.85), 0 8px 20px rgba(0,0,0,0.4) !important;
        }
        .note-card-grid {
          transition: transform 0.2s cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 0.2s ease;
        }
        .note-card-grid:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 24px rgba(0,0,0,0.3) !important;
        }
        .hover-note-item {
          width: 100%;
          border: none;
          background: transparent;
          transition: background 0.15s;
          padding: 8px 16px;
        }
        .hover-note-item:hover {
          background: rgba(255,255,255,0.08) !important;
          color: #facc15 !important;
        }
      `}</style>

    </div>
  );
}
