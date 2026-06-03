import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Search, Download, 
  Tag, Palette, X, StickyNote, Minimize2, Maximize2, Move, Bold
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useThemeStore } from '../../store/theme.store';

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  tag: string;
  updatedAt: string;
}

const NOTE_COLORS = [
  { name: 'Yellow', bg: '#fef08a', text: '#854d0e', border: '#eab308' },
  { name: 'Blue', bg: '#bfdbfe', text: '#1e40af', border: '#3b82f6' },
  { name: 'Green', bg: '#bbf7d0', text: '#166534', border: '#22c55e' },
  { name: 'Pink', bg: '#fbcfe8', text: '#9d174d', border: '#ec4899' },
  { name: 'Purple', bg: '#e9d5ff', text: '#6b21a8', border: '#a855f7' },
  { name: 'Slate', bg: '#334155', text: '#f8fafc', border: '#64748b' }
];

const getTagColor = (tag: string) => {
  switch (tag) {
    case 'All': return { bg: '#3b82f6', text: '#ffffff', border: '#2563eb' };
    case 'General': return { bg: '#eab308', text: '#000000', border: '#ca8a04' };
    case 'Work': return { bg: '#10b981', text: '#ffffff', border: '#059669' };
    case 'Personal': return { bg: '#ec4899', text: '#ffffff', border: '#db2777' };
    case 'Meeting': return { bg: '#8b5cf6', text: '#ffffff', border: '#7c3aed' };
    case 'Reminder': return { bg: '#f97316', text: '#ffffff', border: '#ea580c' };
    case 'Code': return { bg: '#6366f1', text: '#ffffff', border: '#4f46e5' };
    default: return { bg: '#64748b', text: '#ffffff', border: '#475569' };
  }
};

interface DraggableNoteCardProps {
  note: Note;
  onUpdate: (id: string, updates: Partial<Note>) => void;
  onClose: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onDownload: (format: 'txt' | 'jpg' | 'pdf', note: Note) => void;
  categories: string[];
}

function DraggableNoteCard({ note, onUpdate, onClose, onDelete, onDownload, categories }: DraggableNoteCardProps) {
  const { theme } = useThemeStore();
  const [position, setPosition] = useState({
    x: 100 + Math.random() * 200,
    y: 100 + Math.random() * 200
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
  
  // Close dropdown on outside click
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

  // Sync editor content on note load/ID change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.innerHTML = note.content || '';
    }
  }, [note.id]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-drag-handle') === null) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
  };

  // Resize handlers
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
      {/* Editor Drag Header */}
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
        <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px' }}>
          📝 GSV NOTE OVERLAY
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

      {/* Editor inputs */}
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
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>{note.updatedAt}</span>
        </div>

        {/* Formatting Toolbar */}
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
            title="Bold Selection (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
        </div>

        {/* Contenteditable broad notepad area */}
        <div
          ref={contentRef}
          contentEditable
          onInput={handleContentInput}
          data-placeholder="Start typing broad notes here..."
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
      </div>

      {/* Bottom controls */}
      <div 
        className="px-3 py-2 d-flex justify-content-between align-items-center"
        style={{ background: 'rgba(0,0,0,0.04)', borderTop: '1px solid rgba(0,0,0,0.07)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Colors selector */}
        <div className="d-flex gap-2">
          {NOTE_COLORS.map(c => (
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
          {/* Save As dropdown */}
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
                <div className="px-3 py-2 cursor-pointer text-white hover-note-item" onClick={() => onDownload('jpg', note)} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>🖼️ JPG</div>
                <div className="px-3 py-2 cursor-pointer text-white hover-note-item" onClick={() => onDownload('pdf', note)}>🖨️ PDF</div>
              </div>
            )}
          </div>

          <button
            onClick={onDelete}
            className="btn btn-xs text-danger border-0 p-1"
            style={{ background: 'transparent' }}
            title="Delete permanently"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Resize Handle */}
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
  const [managerWidth, setManagerWidth] = useState<'380px' | '640px'>('380px');
  const [notes, setNotes] = useState<Note[]>([]);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');

  // New note creation dialog state
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newColor, setNewColor] = useState('#fef08a');

  // Categories list State
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('gsv_note_categories');
    return saved ? JSON.parse(saved) : PREDEFINED_TAGS;
  });

  // FAB Drag Position
  const [fabPosition, setFabPosition] = useState({
    x: window.innerWidth - 80,
    y: window.innerHeight - 80
  });
  const [isDraggingFab, setIsDraggingFab] = useState(false);
  const fabDragStartRef = useRef({ x: 0, y: 0 });
  const fabPosStartRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);

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
        content: '<div>This is a floating sticky note. Double-click existing notes to open them in floating panels.</div><div><br></div><div>- Reposition the FAB button</div><div>- Open multiple notes side-by-side</div><div>- Customize category tags</div>',
        color: '#fef08a',
        tag: 'General',
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

  const saveNotes = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('gsv-sticky-notes-raw', JSON.stringify(updatedNotes)); // raw backup
    localStorage.setItem('gsv_sticky_notes', JSON.stringify(updatedNotes));
    window.dispatchEvent(new Event('gsv-notes-update'));
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

  // Create note on submit
  const handleCreateNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a note title');
      return;
    }
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: newTitle.trim(),
      content: '<div>Start writing note content...</div>',
      color: newColor,
      tag: newCategory,
      updatedAt: new Date().toLocaleString()
    };
    const updated = [newNote, ...notes];
    saveNotes(updated);
    setOpenNoteIds(prev => [...prev, newNote.id]);
    setShowNewDialog(false);
    setNewTitle('');
    toast.success('Spawned new sticky card! 📝');
  };

  // Delete note
  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notes.filter(n => n.id !== id);
    saveNotes(updated);
    setOpenNoteIds(prev => prev.filter(nid => nid !== id));
    toast.success('Note deleted permanently.');
  };

  // Update note fields
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

  // Add custom tags
  const handleAddNewCategory = () => {
    const tag = prompt('Enter new category tag:');
    if (tag && tag.trim().length > 0) {
      const cleanTag = tag.trim();
      if (categories.includes(cleanTag)) {
        toast.error('Tag already exists.');
        return;
      }
      const updated = [...categories, cleanTag];
      setCategories(updated);
      localStorage.setItem('gsv_note_categories', JSON.stringify(updated));
      toast.success(`Category "${cleanTag}" added!`);
    }
  };

  // Double click note in list to spawn overlay
  const handleDoubleClickNote = (id: string) => {
    if (!openNoteIds.includes(id)) {
      setOpenNoteIds(prev => [...prev, id]);
      toast.success('Opened overlay note card.');
    }
  };

  // Download logic
  const handleDownload = (format: 'txt' | 'jpg' | 'pdf', note: Note) => {
    const { title, content, tag, color, updatedAt } = note;
    // Strip HTML for TXT representation
    const textContent = content.replace(/<\/div>/g, '\n').replace(/<[^>]*>/g, '');

    if (format === 'txt') {
      const blob = new Blob([`GSV Notes\nTitle: ${title}\nTag: ${tag}\nUpdated: ${updatedAt}\n\n${textContent}`], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '_')}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'jpg') {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const colorObj = NOTE_COLORS.find(c => c.bg === color) || NOTE_COLORS[0];
        ctx.fillStyle = colorObj.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = colorObj.text;
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`GSV Sticky Notes - ${tag}`, 30, 45);
        ctx.font = '11px monospace';
        ctx.fillText(`Updated: ${updatedAt}`, 30, 70);
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(title, 30, 115);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = color === '#334155' ? '#f8fafc' : '#334155';
        const lines = textContent.split('\n');
        let y = 150;
        for (const line of lines) {
          ctx.fillText(line, 30, y);
          y += 24;
          if (y > canvas.height - 30) break;
        }
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/jpeg');
        link.download = `${title.replace(/\s+/g, '_')}.jpg`;
        link.click();
      }
    } else {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>${title}</title></head>
            <body style="font-family:sans-serif;padding:30px;background:${color};">
              <div style="border-bottom:1.5px solid #000;padding-bottom:10px;margin-bottom:20px;">
                <span>Tag: <strong>${tag}</strong></span>
                <h2>${title}</h2>
                <span style="font-size:11px;opacity:0.8;">Saved: ${updatedAt}</span>
              </div>
              <div style="font-size:15px;line-height:1.5;">${content}</div>
              <script>window.onload = function(){ window.print(); setTimeout(window.close, 500); }</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
    toast.success(`Downloaded ${format.toUpperCase()}`);
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTagFilter === 'All' || n.tag === selectedTagFilter;
    return matchesSearch && matchesTag;
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

      {/* Main Notes Manager Panel (Right Side Slide-out Drawer) */}
      <div
        className="d-flex flex-column"
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          width: managerWidth,
          height: '100vh',
          background: 'var(--bg-card)',
          borderLeft: '3px solid var(--border-color)',
          boxShadow: isManagerOpen ? '-10px 0 35px rgba(0,0,0,0.45)' : 'none',
          color: 'var(--text-primary)',
          overflow: 'hidden',
          zIndex: 9990,
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.2s ease',
          transform: isManagerOpen ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
          {/* Realaligned Header Bar: Title, Search, and Min/Max/Close inline */}
          <div
            className="d-flex justify-content-between align-items-center px-3 border-bottom"
            style={{
              height: '60px',
              borderColor: 'var(--border-color)',
              background: 'var(--bg-secondary)',
              userSelect: 'none',
              gap: '12px'
            }}
          >
            {/* Title */}
            <div className="d-flex align-items-center gap-2" style={{ whiteSpace: 'nowrap' }}>
              <FileText size={18} className="text-warning animate-pulse" />
              <strong style={{ fontSize: '13px', letterSpacing: '0.5px' }}>G S V Workspace Notes</strong>
            </div>

            {/* Search Input inline */}
            <div className="position-relative flex-grow-1" style={{ maxWidth: '280px' }}>
              <Search size={12} className="position-absolute text-muted" style={{ left: '8px', top: '8px' }} />
              <input
                type="text"
                placeholder="Search notes..."
                className="form-control text-primary"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: '26px',
                  paddingRight: '6px',
                  height: '28px',
                  fontSize: '11px',
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '6px'
                }}
              />
            </div>

            {/* Header controls (Min, Max, Close) */}
            <div className="d-flex align-items-center gap-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setIsManagerOpen(false)}
                style={{
                  padding: '2px 8px', borderRadius: '4px', border: 'none',
                  background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 'bold'
                }}
                title="Minimize Drawer"
              >
                Min
              </button>
              <button
                onClick={() => setManagerWidth(prev => prev === '380px' ? '640px' : '380px')}
                style={{
                  padding: '2px 8px', borderRadius: '4px', border: 'none',
                  background: 'rgba(255,255,255,0.08)', color: 'var(--text-primary)', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 'bold'
                }}
                title="Toggle Maximize"
              >
                {managerWidth === '380px' ? 'Max' : 'Restore'}
              </button>
              <button
                onClick={() => setIsManagerOpen(false)}
                style={{
                  padding: '2px 8px', borderRadius: '4px', border: 'none',
                  background: '#ef4444', color: '#ffffff', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 'bold'
                }}
                title="Close Drawer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Tag Category scrollbar menu with bold tag-specific colors */}
          <div className="px-3 py-2 d-flex gap-2 align-items-center border-bottom overflow-x-auto" style={{ borderColor: 'var(--border-color)', scrollbarWidth: 'none', background: 'var(--bg-secondary)' }}>
            <span
              onClick={() => setSelectedTagFilter('All')}
              className="badge cursor-pointer"
              style={{
                fontSize: '11px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: 700,
                border: '1.5px solid #2563eb',
                background: selectedTagFilter === 'All' ? '#3b82f6' : 'var(--bg-secondary)',
                color: selectedTagFilter === 'All' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              All
            </span>
            {categories.map(tg => {
              const colors = getTagColor(tg);
              const isActive = selectedTagFilter === tg;
              return (
                <span
                  key={tg}
                  onClick={() => setSelectedTagFilter(tg)}
                  className="badge cursor-pointer"
                  style={{
                    fontSize: '11px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    border: `1.5px solid ${colors.border}`,
                    background: isActive ? colors.bg : 'var(--bg-secondary)',
                    color: isActive ? colors.text : 'var(--text-secondary)'
                  }}
                >
                  {tg}
                </span>
              );
            })}
            <button 
              className="btn btn-ghost p-1 d-flex align-items-center justify-content-center text-primary"
              style={{ background: 'var(--bg-primary)', border: '1.5px solid var(--border-color)', borderRadius: '50%', width: '22px', height: '22px', fontWeight: 800 }}
              onClick={handleAddNewCategory}
              title="Add Custom Category Tag"
            >
              +
            </button>
          </div>

          {/* New note configuration popover inside the drawer */}
          {showNewDialog && (
            <div className="p-3 border-bottom" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
              <form onSubmit={handleCreateNoteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <strong style={{ fontSize: '12px', color: 'var(--text-primary)' }}>🏷️ Note Properties</strong>
                <input 
                  type="text"
                  placeholder="Enter Title..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '12px', padding: '6px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)' }}
                  required
                />
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <select 
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="form-control w-50"
                    style={{ fontSize: '11px', padding: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)' }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  
                  {/* Color dots picker */}
                  <div className="d-flex gap-1">
                    {NOTE_COLORS.map(c => (
                      <div 
                        key={c.name}
                        onClick={() => setNewColor(c.bg)}
                        style={{
                          width: '14px', height: '14px', borderRadius: '50%', background: c.bg,
                          cursor: 'pointer', border: newColor === c.bg ? '2.5px solid #000' : '1px solid rgba(0,0,0,0.2)'
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="d-flex gap-2 justify-content-end mt-1">
                  <button type="button" className="btn btn-xs btn-ghost" onClick={() => setShowNewDialog(false)}>Cancel</button>
                  <button type="submit" className="btn btn-xs btn-primary">Create Note</button>
                </div>
              </form>
            </div>
          )}

          {/* Action Row - "New Note" trigger */}
          <div className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Double-click card to open as floating overlay
            </span>
            <button
              onClick={() => setShowNewDialog(!showNewDialog)}
              className="btn btn-primary btn-xs d-flex align-items-center gap-1"
              style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}
            >
              <Plus size={12} /> New Note
            </button>
          </div>

          {/* Notes Card list representation (Clean rectangular blocks) */}
          <div className="flex-grow-1 p-3 d-flex flex-column gap-3" style={{ overflowY: 'auto', background: 'var(--bg-primary)' }}>
            {filteredNotes.length === 0 ? (
              <div className="text-center text-muted" style={{ fontSize: '12px', marginTop: '30px' }}>No notes found</div>
            ) : (
              filteredNotes.map(n => {
                const colorObj = NOTE_COLORS.find(c => c.bg === n.color) || NOTE_COLORS[0];
                const isOpenCard = openNoteIds.includes(n.id);
                // Strip HTML for list snippet
                const textSnippet = n.content.replace(/<\/div>/g, ' ').replace(/<[^>]*>/g, '');
                
                return (
                  <div
                    key={n.id}
                    onDoubleClick={() => handleDoubleClickNote(n.id)}
                    className="p-3 border transition-all hover-manager-card"
                    style={{
                      background: 'var(--bg-card)',
                      borderColor: isOpenCard ? 'var(--brand-primary)' : 'var(--border-color)',
                      borderWidth: '2px',
                      borderRadius: '12px',
                      borderLeft: `6px solid ${colorObj.bg}`,
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.06)'
                    }}
                    title="Double-click to open overlay card"
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {n.title || 'Untitled'}
                        </strong>
                        <span className="badge" style={{ background: colorObj.bg, color: colorObj.text, fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                          {n.tag}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: '8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {textSnippet || '(No content yet)'}
                      </div>
                      
                      <div className="d-flex justify-content-between align-items-center mt-2 border-top pt-2" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{n.updatedAt}</span>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-ghost p-0 text-primary border-0"
                            onClick={() => handleDoubleClickNote(n.id)}
                            style={{ fontSize: '10px', fontWeight: 700 }}
                          >
                            Open Card
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost p-0 text-danger border-0"
                            onClick={(e) => deleteNote(n.id, e)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      {/* Render Independent Draggable Note Cards (Overlaying everything) */}
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

      <style>{`
        .gsv-glow-fab:hover {
          transform: scale(1.1) !important;
          box-shadow: 0 0 35px rgba(245, 158, 11, 0.85), 0 8px 20px rgba(0,0,0,0.4) !important;
        }
        .hover-note-item:hover {
          background: rgba(255,255,255,0.12) !important;
          color: #facc15 !important;
        }
        .hover-manager-card:hover {
          background: var(--bg-hover) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.15) !important;
        }
      `}</style>

    </div>
  );
}

const PREDEFINED_TAGS = ['General', 'Work', 'Personal', 'Meeting', 'Reminder', 'Code'];
