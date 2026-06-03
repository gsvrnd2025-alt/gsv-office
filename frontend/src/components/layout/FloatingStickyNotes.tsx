import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Search, Download, 
  Tag, X, StickyNote, Minimize2, Maximize2, Bold, Italic, Underline,
  List, ListOrdered, Code, Star, Pin, PinOff, Bell, Archive, 
  Lock, Unlock, Files, Printer, RotateCcw, RotateCw, Copy, Check, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useThemeStore } from '../../store/theme.store';
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

// Independent Draggable Floating Overlays (MS Sticky Notes Style)
interface DraggableNoteCardProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onClose: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onDownload: (format: 'txt' | 'json' | 'md' | 'html', note: Note) => void;
  categories: string[];
}

function DraggableNoteCard({ note, onUpdate, onClose, onDelete, onDownload, categories }: DraggableNoteCardProps) {
  const [position, setPosition] = useState({
    x: 120 + Math.random() * 200,
    y: 120 + Math.random() * 200
  });
  const [size, setSize] = useState({ width: 380, height: 420 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0 });
  const sizeStartRef = useRef({ width: 0, height: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const colorObj = NOTE_COLORS.find(c => c.bg === note.color) || NOTE_COLORS[0];
  const isCodeNote = note.tag === 'Code' || 
    ['.ino', '.c', '.cpp', '.h', '.py', '.js', '.ts', '.html', '.css', '.php', '.java', '.cs', '.sql', '.sh', '.bat', '.ps1'].some(ext => note.title.toLowerCase().endsWith(ext));

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSaveMenu(false);
      }
    };
    if (showSaveMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showSaveMenu]);

  useEffect(() => {
    if (contentRef.current && !isCodeNote) {
      contentRef.current.innerHTML = note.content || '';
    }
  }, [note.id, isCodeNote]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-drag-handle') === null) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY };
    sizeStartRef.current = { ...size };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - size.width, positionStartRef.current.x + dx)),
          y: Math.max(0, Math.min(window.innerHeight - size.height, positionStartRef.current.y + dy))
        });
      } else if (isResizing) {
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        setSize({
          width: Math.max(300, Math.min(900, sizeStartRef.current.width + dx)),
          height: Math.max(300, Math.min(900, sizeStartRef.current.height + dy))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, size, position]);

  const handleContentInput = () => {
    if (contentRef.current) {
      onUpdate(note.id, { content: contentRef.current.innerHTML });
    }
  };

  const handleBoldToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.execCommand('bold', false);
    handleContentInput();
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        background: colorObj.bg,
        border: `3px solid ${colorObj.border}`,
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        zIndex: 10005,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: colorObj.text,
        transition: isDragging || isResizing ? 'none' : 'width 0.15s, height 0.15s'
      }}
    >
      {/* Header */}
      <div
        className="card-drag-handle d-flex justify-content-between align-items-center px-3"
        style={{
          height: '46px',
          background: 'rgba(0,0,0,0.07)',
          cursor: 'move',
          borderBottom: '1.5px solid rgba(0,0,0,0.07)',
          userSelect: 'none'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}>
          📌 GSV NOTE OVERLAY
        </span>
        <div className="d-flex align-items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={onClose}
            style={{
              width: '22px', height: '22px', borderRadius: '50%', border: 'none',
              background: 'rgba(0,0,0,0.15)', color: colorObj.text, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 'bold'
            }}
            title="Close Note"
          >
            ×
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="p-3 d-flex flex-column gap-3 flex-grow-1" style={{ minHeight: 0 }}>
        <input
          type="text"
          value={note.title}
          onChange={e => onUpdate(note.id, { title: e.target.value })}
          placeholder="Note Title..."
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '2px solid rgba(0,0,0,0.1)',
            outline: 'none',
            fontWeight: 800,
            fontSize: '17px',
            color: 'inherit',
            paddingBottom: '6px'
          }}
          disabled={note.isLocked}
        />

        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <Tag size={14} />
            <select
              value={note.tag}
              onChange={e => onUpdate(note.id, { tag: e.target.value })}
              style={{
                background: 'rgba(255,255,255,0.6)',
                border: '1.5px solid rgba(0,0,0,0.15)',
                borderRadius: '6px',
                fontSize: '12px',
                padding: '3px 6px',
                color: '#000',
                fontWeight: 700
              }}
              disabled={note.isLocked}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>{note.updatedAt}</span>
        </div>

        {/* Toolbar */}
        {!note.isLocked && !isCodeNote && (
          <div className="d-flex align-items-center gap-2 p-1 rounded" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <button
              onClick={handleBoldToggle}
              className="d-flex align-items-center justify-content-center"
              style={{
                width: '28px', height: '28px',
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'inherit'
              }}
              title="Bold"
            >
              <Bold size={14} />
            </button>
          </div>
        )}

        {/* Editor Area */}
        {isCodeNote ? (
          <div style={{ flex: 1, overflow: 'hidden', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.1)' }}>
            <Editor
              height="100%"
              theme="vs-dark"
              language={detectLanguage(note.title)}
              value={note.content.replace(/<\/div>/g, '\n').replace(/<[^>]*>/g, '')}
              onChange={(val) => {
                if (!note.isLocked) {
                  onUpdate(note.id, { content: `<div>${(val || '').replace(/\n/g, '<br>')}</div>` });
                }
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                readOnly: note.isLocked,
                scrollbar: { vertical: 'auto', horizontal: 'auto' }
              }}
            />
          </div>
        ) : (
          <div
            ref={contentRef}
            contentEditable={!note.isLocked}
            onInput={handleContentInput}
            data-placeholder="Start typing..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              overflowY: 'auto',
              fontSize: '15px',
              lineHeight: 1.6,
              color: 'inherit',
              padding: '8px 0',
              resize: 'none'
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div 
        className="px-3 py-2 d-flex justify-content-between align-items-center"
        style={{ background: 'rgba(0,0,0,0.04)', borderTop: '1px solid rgba(0,0,0,0.07)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="d-flex gap-2">
          {!note.isLocked && NOTE_COLORS.map(c => (
            <div
              key={c.name}
              onClick={() => onUpdate(note.id, { color: c.bg })}
              style={{
                width: '18px', height: '18px', borderRadius: '50%', background: c.bg,
                cursor: 'pointer', border: note.color === c.bg ? '3px solid #000' : '1.5px solid rgba(0,0,0,0.25)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
              }}
              title={c.name}
            />
          ))}
        </div>

        <div className="d-flex align-items-center gap-2">
          <div className="position-relative" ref={dropdownRef}>
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              className="btn btn-xs d-flex align-items-center gap-1"
              style={{
                fontSize: '12px',
                background: 'rgba(0,0,0,0.08)',
                border: '1.5px solid rgba(0,0,0,0.2)',
                color: 'inherit',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px'
              }}
            >
              <Download size={12} /> Save As
            </button>
            {showSaveMenu && (
              <div
                style={{
                  position: 'absolute', bottom: '32px', right: 0,
                  background: '#1e293b', border: '1.5px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px', width: '130px', display: 'flex', flexDirection: 'column',
                  fontSize: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  zIndex: 1010
                }}
              >
                <div className="px-3 py-2 cursor-pointer text-white hover-note-item" onClick={() => onDownload('txt', note)} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>📄 TXT</div>
                <div className="px-3 py-2 cursor-pointer text-white hover-note-item" onClick={() => onDownload('json', note)} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>💻 JSON</div>
                <div className="px-3 py-2 cursor-pointer text-white hover-note-item" onClick={() => onDownload('md', note)} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>📝 MD</div>
                <div className="px-3 py-2 cursor-pointer text-white hover-note-item" onClick={() => onDownload('html', note)}>🌐 HTML</div>
              </div>
            )}
          </div>

          <button
            onClick={onDelete}
            className="btn btn-xs text-danger border-0 p-1"
            style={{ background: 'transparent' }}
            title="Delete Note"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px',
          cursor: 'se-resize', background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.25) 50%)'
        }}
      />
    </div>
  );
}

export default function FloatingStickyNotes() {
  const { theme } = useThemeStore();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [managerWidth, setManagerWidth] = useState<'380px' | '980px'>('980px');
  
  // Note Lists
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  
  // Sidebar Nav: 'all' | 'favorites' | 'reminders' | 'trash'
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

  // FAB Drag Position
  const [fabPosition, setFabPosition] = useState({
    x: window.innerWidth - 80,
    y: window.innerHeight - 80
  });
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const fabDragStartRef = useRef({ x: 0, y: 0 });
  const fabPosStartRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);

  const editorContentRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

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
        content: '<div>Welcome to your new Premium Sticky Notes Workspace.</div><div><br></div><div>🚀 <strong>Features:</strong></div><div>- 3-column keeps layout</div><div>- Monaco Editor support for code</div><div>- Custom tags, Pin, and Favorite logs</div><div>- File imports (.txt, .md, scripts)</div><div>- Auto-save integration</div>',
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
      setRedoStack([]); // clear redo stack on new action
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

  const handleFabClick = () => {
    if (dragDistanceRef.current < 5) {
      setIsManagerOpen(!isManagerOpen);
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
    setOpenNoteIds(prev => prev.filter(nid => nid !== id));
    if (activeNoteId === id) setActiveNoteId(null);
    toast.success('Note deleted permanently.');
  };

  const archiveNoteToggle = (id: string) => {
    const updated = notes.map(n => {
      if (n.id === id) {
        return { ...n, isArchived: !n.isArchived, updatedAt: new Date().toLocaleString() };
      }
      return n;
    });
    saveNotes(updated);
    if (activeNoteId === id) setActiveNoteId(null);
    toast.success('Note status updated');
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

  const handleDoubleClickNote = (id: string) => {
    if (!openNoteIds.includes(id)) {
      setOpenNoteIds(prev => [...prev, id]);
    }
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
              📂 Category: ${note.tag} | 🏷️ Tags: ${(note.tags || []).join(', ') || 'None'} | 📅 Date: ${note.updatedAt}
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

  // Bulk actions on active filtered list
  const handleBulkArchive = () => {
    const idsToArchive = filteredNotes.map(n => n.id);
    const updated = notes.map(n => idsToArchive.includes(n.id) ? { ...n, isArchived: true } : n);
    saveNotes(updated);
    setActiveNoteId(null);
    toast.success(`Archived ${idsToArchive.length} notes`);
  };

  const handleBulkDelete = () => {
    if (confirm(`Permanently delete all ${filteredNotes.length} filtered notes?`)) {
      const idsToDelete = filteredNotes.map(n => n.id);
      const updated = notes.filter(n => !idsToDelete.includes(n.id));
      saveNotes(updated);
      setActiveNoteId(null);
      toast.success(`Deleted ${idsToDelete.length} notes permanently`);
    }
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

  // Duplicate Note
  const handleDuplicateNote = (note: Note) => {
    const duplicated: Note = {
      ...note,
      id: `note-${Date.now()}`,
      title: `${note.title} (Copy)`,
      updatedAt: new Date().toLocaleString(),
      createdAt: new Date().toLocaleString()
    };
    saveNotes([duplicated, ...notes]);
    toast.success('Duplicated note card');
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

    // Filter by tag scroll active
    const matchesTag = selectedTagFilter === 'All' || n.tag === selectedTagFilter;

    // Filter by Left Sidebar state
    if (selectedNav === 'trash') {
      return n.isArchived && matchesSearch && matchesTag;
    }
    if (n.isArchived) return false; // Hide archived everywhere else

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

      {/* Main 3-Column Slide-out Drawer */}
      <div
        className="d-flex"
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: isManagerOpen ? managerWidth : '0px',
          height: '100vh',
          background: '#0F172A',
          borderLeft: '3px solid rgba(255, 255, 255, 0.08)',
          boxShadow: isManagerOpen ? '-15px 0 45px rgba(0,0,0,0.6)' : 'none',
          color: '#F8FAFC',
          overflow: 'hidden',
          zIndex: 9990,
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s ease',
          transform: isManagerOpen ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
        {isManagerOpen && (
          <>
            {/* Column 1: Left Sidebar Navigation (240px) */}
            <div 
              style={{
                width: '240px',
                background: 'rgba(17, 24, 39, 0.75)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px'
              }}
            >
              {/* Logo & Header */}
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="d-flex align-items-center gap-2">
                  <StickyNote size={20} className="text-warning" />
                  <strong style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px' }}>GSV WORKSPACE</strong>
                </div>
                <div className="d-flex gap-1">
                  <button 
                    onClick={() => setManagerWidth(prev => prev === '380px' ? '980px' : '380px')} 
                    className="border-0 bg-transparent text-muted p-1"
                    title="Toggle Workspace Width"
                  >
                    <Maximize2 size={13} />
                  </button>
                  <button 
                    onClick={() => setIsManagerOpen(false)} 
                    className="border-0 bg-transparent text-danger p-1"
                    title="Close Panel"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Search Notes */}
              <div className="position-relative mb-4">
                <Search size={14} className="position-absolute text-muted" style={{ left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search notes, tags..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="form-control bg-dark border-0 text-white"
                  style={{
                    paddingLeft: '32px',
                    height: '34px',
                    fontSize: '12px',
                    background: '#0F172A',
                    borderRadius: '8px'
                  }}
                />
              </div>

              {/* Nav Tabs */}
              <div className="d-flex flex-column gap-1 mb-4">
                {[
                  { id: 'all', label: 'All Notes', icon: <FileText size={16} /> },
                  { id: 'favorites', label: 'Favorites', icon: <Star size={16} /> },
                  { id: 'reminders', label: 'Reminders', icon: <Bell size={16} /> },
                  { id: 'trash', label: 'Trash & Archive', icon: <Trash2 size={16} /> }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedNav(item.id as any); setActiveNoteId(null); }}
                    className={`d-flex align-items-center gap-3 px-3 py-2 border-0 rounded-lg text-start transition-all sidebar-btn ${selectedNav === item.id ? 'active' : ''}`}
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      background: selectedNav === item.id ? '#6366F1' : 'transparent',
                      color: selectedNav === item.id ? '#fff' : '#cbd5e1',
                      borderRadius: '8px',
                      height: '38px',
                      cursor: 'pointer'
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Undo / Redo controls */}
              <div className="d-flex justify-content-between p-2 rounded mb-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <button onClick={handleUndo} disabled={undoStack.length === 0} className="border-0 bg-transparent text-white p-1 cursor-pointer" title="Undo"><RotateCcw size={15} /></button>
                <button onClick={handleRedo} disabled={redoStack.length === 0} className="border-0 bg-transparent text-white p-1 cursor-pointer" title="Redo"><RotateCw size={15} /></button>
                <button onClick={() => importFileRef.current?.click()} className="border-0 bg-transparent text-white p-1 cursor-pointer" title="Import Files"><Files size={15} /></button>
              </div>

              {/* Hidden file input */}
              <input 
                type="file" 
                ref={importFileRef} 
                onChange={handleImportFiles} 
                style={{ display: 'none' }} 
                multiple 
                accept=".txt,.md,.json,.csv,.log,.ini,.cfg,.ino,.c,.cpp,.h,.py,.js,.ts,.html,.css,.php,.java,.cs,.sql,.sh,.bat,.ps1"
              />

              {/* Sidebar Action Button */}
              <button 
                onClick={() => createNewNote('General')}
                className="btn btn-primary mt-auto w-100 d-flex align-items-center justify-content-center gap-2"
                style={{ borderRadius: '12px', height: '42px', fontWeight: 800, background: '#6366F1', border: 'none' }}
              >
                <Plus size={16} /> New Note
              </button>
            </div>

            {/* Column 2: Center Grid List (Flex 1) */}
            <div
              style={{
                flex: 1,
                background: '#0F172A',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {/* Horizontal Chips Category scrollbar */}
              <div 
                className="d-flex gap-2 align-items-center px-3 border-bottom overflow-x-auto" 
                style={{ 
                  height: '52px', 
                  borderColor: 'rgba(255,255,255,0.06)', 
                  background: '#111827',
                  scrollbarWidth: 'none'
                }}
              >
                <span
                  onClick={() => setSelectedTagFilter('All')}
                  className={`badge cursor-pointer px-3 py-2 rounded-lg border text-white ${selectedTagFilter === 'All' ? 'active-chip' : ''}`}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    borderColor: 'rgba(255,255,255,0.1)',
                    background: selectedTagFilter === 'All' ? '#6366F1' : 'rgba(255,255,255,0.03)'
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
                      className="badge cursor-pointer px-3 py-2 rounded-lg border"
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        borderColor: isActive ? colors.border : 'rgba(255,255,255,0.1)',
                        background: isActive ? colors.bg : 'rgba(255,255,255,0.03)',
                        color: colors.text
                      }}
                    >
                      {getCategoryEmoji(tg)} {tg}
                    </span>
                  );
                })}
                <button 
                  className="btn btn-ghost d-flex align-items-center justify-content-center text-primary"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '22px', height: '22px', fontWeight: 800, padding: 0 }}
                  onClick={handleAddNewCategory}
                  title="Add Custom Category Tag"
                >
                  +
                </button>
              </div>

              {/* Bulk Actions Header */}
              {filteredNotes.length > 0 && (
                <div className="px-3 py-2 d-flex justify-content-between align-items-center border-bottom bg-dark bg-opacity-30" style={{ borderColor: 'rgba(255,255,255,0.05)', fontSize: '11px' }}>
                  <span className="text-muted">{filteredNotes.length} notes listed</span>
                  <div className="d-flex gap-2">
                    <button onClick={handleBulkArchive} className="btn btn-xs btn-ghost text-primary border-0 p-0" style={{ fontSize: '10px', fontWeight: 700 }}>Archive All</button>
                    <button onClick={handleBulkExport} className="btn btn-xs btn-ghost text-warning border-0 p-0" style={{ fontSize: '10px', fontWeight: 700 }}>Export JSON</button>
                    {selectedNav === 'trash' && (
                      <button onClick={handleBulkDelete} className="btn btn-xs btn-ghost text-danger border-0 p-0" style={{ fontSize: '10px', fontWeight: 700 }}>Delete All</button>
                    )}
                  </div>
                </div>
              )}

              {/* Pinterest/Grid Cards View */}
              <div 
                className="flex-grow-1 p-3 card-masonry-grid" 
                style={{ 
                  overflowY: 'auto'
                }}
              >
                {sortedNotes.length === 0 ? (
                  <div className="text-center text-muted" style={{ fontSize: '12px', marginTop: '40px' }}>
                    📪 No notes matches filter
                  </div>
                ) : (
                  sortedNotes.map(n => {
                    const colorObj = NOTE_COLORS.find(c => c.bg === n.color) || NOTE_COLORS[0];
                    const activeEditorOpen = activeNoteId === n.id;
                    const textSnippet = n.content.replace(/<\/div>/g, ' ').replace(/<[^>]*>/g, '');
                    
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          setActiveNoteId(n.id);
                          if (managerWidth === '380px') setManagerWidth('980px'); // Auto widen to edit!
                        }}
                        onDoubleClick={() => handleDoubleClickNote(n.id)}
                        className="p-3 note-card transition-all"
                        style={{
                          background: '#1E293B',
                          borderRadius: '16px',
                          border: activeEditorOpen ? '2px solid #6366F1' : '1px solid rgba(255,255,255,0.06)',
                          borderLeft: `5px solid ${colorObj.border}`,
                          cursor: 'pointer',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}
                        title="Click to edit, Double-click to float"
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge" style={{ background: colorObj.bg, color: colorObj.text, fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                            {getCategoryEmoji(n.tag)} {n.tag}
                          </span>
                          
                          <div className="d-flex align-items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => updateNote(n.id, { isPinned: !n.isPinned })}
                              className="border-0 bg-transparent p-0"
                              style={{ color: n.isPinned ? '#ca8a04' : '#64748b' }}
                            >
                              <Pin size={12} fill={n.isPinned ? '#ca8a04' : 'none'} />
                            </button>
                            <button 
                              onClick={() => updateNote(n.id, { isFavorite: !n.isFavorite })}
                              className="border-0 bg-transparent p-0"
                              style={{ color: n.isFavorite ? '#fb7185' : '#64748b' }}
                            >
                              <Star size={12} fill={n.isFavorite ? '#fb7185' : 'none'} />
                            </button>
                          </div>
                        </div>

                        <strong style={{ fontSize: '13px', color: '#F8FAFC', display: 'block', marginBottom: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {n.isLocked && '🔒 '}
                          {n.title || 'Untitled note'}
                        </strong>

                        <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 8px 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {textSnippet || 'No content...'}
                        </p>

                        <div className="d-flex justify-content-between align-items-center border-top pt-2" style={{ borderColor: 'rgba(255,255,255,0.04)', fontSize: '10px', color: '#64748b' }}>
                          <span>{n.updatedAt}</span>
                          {n.reminderTime && <span title="Scheduled reminder">⏰ Set</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Floating Add Note Action Button in Center Area */}
              <button
                onClick={() => createNewNote(selectedTagFilter === 'All' ? 'General' : selectedTagFilter)}
                className="d-flex align-items-center justify-content-center border-0 rounded-circle text-white shadow-lg"
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  right: '24px',
                  width: '56px',
                  height: '56px',
                  background: '#6366F1',
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: '0 8px 16px rgba(99,102,241,0.4)'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Add New Note"
              >
                <Plus size={24} />
              </button>
            </div>

            {/* Column 3: Right Editor Panel (360px - Only shown when wide mode is active) */}
            {managerWidth === '980px' && (
              <div
                style={{
                  width: '380px',
                  background: '#1E293B',
                  borderLeft: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {activeNote ? (
                  <div className="d-flex flex-column h-100 flex-grow-1 p-3" style={{ minHeight: 0 }}>
                    
                    {/* Editor Control Headers */}
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="d-flex align-items-center gap-2">
                        {autoSaveStatus === 'saving' && <span className="badge bg-warning text-dark" style={{ fontSize: '10px' }}>⏳ Saving...</span>}
                        {autoSaveStatus === 'saved' && <span className="badge bg-success" style={{ fontSize: '10px' }}>✓ Saved</span>}
                      </div>

                      <div className="d-flex align-items-center gap-1">
                        <button 
                          onClick={() => handleDuplicateNote(activeNote)} 
                          className="border-0 bg-transparent text-muted p-1 hover-editor-action"
                          title="Duplicate"
                        >
                          <Copy size={13} />
                        </button>
                        <button 
                          onClick={() => updateNoteWithIndicator(activeNote.id, { isLocked: !activeNote.isLocked })} 
                          className="border-0 bg-transparent text-muted p-1 hover-editor-action"
                          style={{ color: activeNote.isLocked ? '#eab308' : '' }}
                          title={activeNote.isLocked ? 'Unlock Note' : 'Lock Note'}
                        >
                          {activeNote.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                        </button>
                        <button 
                          onClick={() => archiveNoteToggle(activeNote.id)} 
                          className="border-0 bg-transparent text-muted p-1 hover-editor-action"
                          style={{ color: activeNote.isArchived ? '#34d399' : '' }}
                          title={activeNote.isArchived ? 'Restore' : 'Archive Note'}
                        >
                          <Archive size={13} />
                        </button>
                        <button 
                          onClick={() => handlePrintNote(activeNote)} 
                          className="border-0 bg-transparent text-muted p-1 hover-editor-action"
                          title="Print Note"
                        >
                          <Printer size={13} />
                        </button>
                        <button 
                          onClick={() => setZoomNote(activeNote)} 
                          className="border-0 bg-transparent text-muted p-1 hover-editor-action"
                          title="Zoom / Full Editor"
                        >
                          <Maximize2 size={13} />
                        </button>
                        <button 
                          onClick={() => deleteNote(activeNote.id)} 
                          className="border-0 bg-transparent text-danger p-1 hover-editor-action"
                          title="Delete Note"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Locked Banner Warning */}
                    {activeNote.isLocked && (
                      <div className="alert alert-warning py-1 px-2 mb-3 text-center" style={{ fontSize: '11px', fontWeight: 600 }}>
                        🔒 Locked: Disable editing modes.
                      </div>
                    )}

                    {/* Note Title Input */}
                    <input 
                      type="text"
                      className="bg-transparent border-0 text-white font-weight-bold w-100 mb-3"
                      style={{ fontSize: '18px', outline: 'none', fontWeight: 800 }}
                      placeholder="Note title..."
                      value={activeNote.title}
                      onChange={e => updateNoteWithIndicator(activeNote.id, { title: e.target.value })}
                      disabled={activeNote.isLocked}
                    />

                    {/* Metadata & Tag line */}
                    <div className="d-flex align-items-center justify-content-between mb-3" style={{ fontSize: '11px' }}>
                      <div className="d-flex align-items-center gap-2 text-muted">
                        <span>Category:</span>
                        <select 
                          value={activeNote.tag}
                          onChange={e => updateNoteWithIndicator(activeNote.id, { tag: e.target.value })}
                          className="bg-dark text-white border-0 p-1 rounded"
                          style={{ fontSize: '11px', outline: 'none' }}
                          disabled={activeNote.isLocked}
                        >
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      
                      {/* Reminder icon trigger */}
                      <div className="position-relative">
                        <button 
                          onClick={() => setShowReminderPopover(!showReminderPopover)}
                          className="btn btn-xs d-flex align-items-center gap-1 border-0"
                          style={{
                            background: activeNote.reminderTime ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.04)',
                            color: activeNote.reminderTime ? '#facc15' : '#cbd5e1'
                          }}
                          disabled={activeNote.isLocked}
                        >
                          <Bell size={11} /> Reminder
                        </button>

                        {showReminderPopover && (
                          <div 
                            className="position-absolute p-3 rounded shadow"
                            style={{
                              bottom: '30px',
                              right: 0,
                              background: '#111827',
                              border: '1.5px solid rgba(255,255,255,0.1)',
                              width: '240px',
                              zIndex: 105
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
                              <button onClick={() => setShowReminderPopover(false)} className="btn btn-xs btn-ghost">Cancel</button>
                              <button onClick={handleSaveReminder} className="btn btn-xs btn-primary">Schedule</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rich text formatting controls (WYSIWYG tools) */}
                    {!activeNote.isLocked && !isCodeNoteActive && (
                      <div className="d-flex align-items-center gap-2 p-1 rounded mb-3" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button onClick={() => execFormat('bold')} className="btn btn-xs text-white p-1 hover-editor-action" title="Bold"><Bold size={13} /></button>
                        <button onClick={() => execFormat('italic')} className="btn btn-xs text-white p-1 hover-editor-action" title="Italic"><Italic size={13} /></button>
                        <button onClick={() => execFormat('underline')} className="btn btn-xs text-white p-1 hover-editor-action" title="Underline"><Underline size={13} /></button>
                        <button onClick={() => execFormat('insertUnorderedList')} className="btn btn-xs text-white p-1 hover-editor-action" title="Bullet List"><List size={13} /></button>
                        <button onClick={() => execFormat('insertOrderedList')} className="btn btn-xs text-white p-1 hover-editor-action" title="Number List"><ListOrdered size={13} /></button>
                      </div>
                    )}

                    {/* Active Editor Panel Content Area */}
                    <div className="flex-grow-1 d-flex flex-column mb-3" style={{ minHeight: 0 }}>
                      {isCodeNoteActive ? (
                        <div style={{ flex: 1, overflow: 'hidden', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <Editor
                            height="100%"
                            theme="vs-dark"
                            language={detectLanguage(activeNote.title)}
                            value={activeNote.content.replace(/<\/div>/g, '\n').replace(/<[^>]*>/g, '')}
                            onChange={(val) => {
                              if (!activeNote.isLocked) {
                                updateNoteWithIndicator(activeNote.id, { content: `<div>${(val || '').replace(/\n/g, '<br>')}</div>` });
                              }
                            }}
                            options={{
                              minimap: { enabled: false },
                              fontSize: 13,
                              readOnly: activeNote.isLocked,
                              scrollbar: { vertical: 'auto', horizontal: 'auto' }
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          ref={editorContentRef}
                          contentEditable={!activeNote.isLocked}
                          onInput={handleEditorInput}
                          data-placeholder="Start typing broad notes here..."
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            overflowY: 'auto',
                            fontSize: '15px',
                            lineHeight: 1.6,
                            color: '#F8FAFC',
                            padding: '8px 0',
                            resize: 'none'
                          }}
                        />
                      )}
                    </div>

                    {/* Tag Manager Input */}
                    {!activeNote.isLocked && (
                      <div className="mb-3">
                        <div className="d-flex flex-wrap gap-1 mb-2">
                          {(activeNote.tags || []).map(tag => (
                            <span 
                              key={tag}
                              className="badge bg-secondary d-flex align-items-center gap-1"
                              style={{ fontSize: '9px', padding: '3px 6px', background: 'rgba(255,255,255,0.08)' }}
                            >
                              {tag}
                              <X size={10} className="cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                            </span>
                          ))}
                        </div>
                        <input 
                          type="text" 
                          placeholder="Add Tag (Press Enter)..." 
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          className="form-control bg-dark border-0 text-white"
                          style={{ height: '28px', fontSize: '11px', borderRadius: '6px' }}
                        />
                      </div>
                    )}

                    {/* Colors Palette dots selector */}
                    {!activeNote.isLocked && (
                      <div className="d-flex justify-content-between align-items-center border-top pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>Note Card Color:</span>
                        <div className="d-flex gap-1">
                          {NOTE_COLORS.map(c => (
                            <div 
                              key={c.name}
                              onClick={() => updateNoteWithIndicator(activeNote.id, { color: c.bg })}
                              style={{
                                width: '15px', height: '15px', borderRadius: '50%', background: c.bg,
                                cursor: 'pointer', border: activeNote.color === c.bg ? '2.5px solid #fff' : '1px solid rgba(255,255,255,0.2)'
                              }}
                              title={c.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  // Right Panel Empty State
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 p-4 text-center">
                    <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.25 }}>📝</div>
                    <strong style={{ fontSize: '15px', color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                      Select a note or create a new one
                    </strong>
                    <button 
                      onClick={() => createNewNote('General')}
                      className="btn btn-outline-primary btn-sm mt-3 px-3 py-2"
                      style={{ fontSize: '11px', fontWeight: 700 }}
                    >
                      + New Note
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Render Draggable Sticky note panels */}
      {openNoteIds.map(noteId => {
        const note = notes.find(n => n.id === noteId);
        if (!note) return null;
        return (
          <DraggableNoteCard
            key={note.id}
            note={note}
            categories={categories}
            onUpdate={updateNote}
            onClose={() => setOpenNoteIds(prev => prev.filter(nid => nid !== note.id))}
            onDelete={(e) => deleteNote(note.id, e)}
            onDownload={handleDownload}
          />
        );
      })}

      {/* Full Screen Editor Modal (Zoom view) */}
      {zoomNote && (
        <div className="modal-backdrop" style={{ zIndex: 10009 }} onClick={() => setZoomNote(null)}>
          <div 
            className="modal p-4 animate-scale-in" 
            style={{ 
              maxWidth: '800px', 
              width: '90%', 
              background: '#1E293B', 
              color: '#F8FAFC', 
              borderRadius: '16px',
              border: '2px solid rgba(255,255,255,0.1)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
              <strong style={{ fontSize: '16px' }}>📝 {zoomNote.title || 'Note Details'}</strong>
              <button className="btn btn-ghost text-white btn-sm" onClick={() => setZoomNote(null)}>✕</button>
            </div>
            
            <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px' }}>
              📁 Category: <strong>{zoomNote.tag}</strong> | Last Updated: <strong>{zoomNote.updatedAt}</strong>
            </div>

            <div 
              style={{ 
                maxHeight: '400px', 
                overflowY: 'auto', 
                fontSize: '15px', 
                lineHeight: 1.7,
                background: 'rgba(0,0,0,0.15)',
                padding: '16px',
                borderRadius: '8px',
                whiteSpace: 'pre-wrap'
              }}
            >
              {zoomNote.content.replace(/<\/div>/g, '\n').replace(/<[^>]*>/g, '')}
            </div>

            <div className="d-flex gap-2 justify-content-end mt-4">
              <button className="btn btn-secondary btn-sm" onClick={() => handlePrintNote(zoomNote)}>🖨️ Print Note</button>
              <button className="btn btn-primary btn-sm" onClick={() => setZoomNote(null)}>Close View</button>
            </div>
          </div>
        </div>
      )}

      {/* Styled css sheets */}
      <style>{`
        .gsv-glow-fab {
          transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .gsv-glow-fab:hover {
          transform: scale(1.1) rotate(5deg) !important;
          box-shadow: 0 0 35px rgba(245, 158, 11, 0.85), 0 8px 20px rgba(0,0,0,0.4) !important;
        }
        .sidebar-btn {
          transition: all 0.15s ease;
        }
        .sidebar-btn:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #fff !important;
        }
        .sidebar-btn.active {
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
        }
        .note-card {
          break-inside: avoid;
          margin-bottom: 12px;
          display: block;
          transition: transform 0.2s cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 0.2s ease;
        }
        .note-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.2) !important;
        }
        .active-chip {
          background: #6366F1 !important;
          border-color: #6366F1 !important;
          box-shadow: 0 2px 8px rgba(99,102,241,0.4);
        }
        .hover-editor-action {
          transition: background 0.15s;
          border-radius: 4px;
        }
        .hover-editor-action:hover {
          background: rgba(255,255,255,0.08) !important;
          color: #fff !important;
        }
        .hover-note-item:hover {
          background: rgba(255,255,255,0.12) !important;
          color: #facc15 !important;
        }
        .card-masonry-grid {
          column-count: 2;
          column-gap: 12px;
        }
        @media (max-width: 768px) {
          .card-masonry-grid {
            column-count: 1;
          }
        }
        .card-masonry-grid::-webkit-scrollbar {
          width: 6px;
        }
        .card-masonry-grid::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
      `}</style>

    </div>
  );
}
