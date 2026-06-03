import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Search, Download, 
  Tag, Palette, X, StickyNote, Minimize2, Maximize2, Move
} from 'lucide-react';
import toast from 'react-hot-toast';
import { copyTextToClipboard } from '../../utils/clipboard';
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
    x: 150 + Math.random() * 250,
    y: 100 + Math.random() * 250
  });
  const [size, setSize] = useState({ width: 340, height: 380 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0 });
  const sizeStartRef = useRef({ width: 0, height: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

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
          width: Math.max(280, Math.min(800, sizeStartRef.current.width + dx)),
          height: Math.max(280, Math.min(800, sizeStartRef.current.height + dy))
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
        border: `2px solid ${colorObj.border}`,
        borderRadius: '12px',
        boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: colorObj.text,
        transition: isDragging || isResizing ? 'none' : 'width 0.15s, height 0.15s'
      }}
    >
      {/* Editor Header */}
      <div
        className="card-drag-handle d-flex justify-content-between align-items-center px-3"
        style={{
          height: '42px',
          background: 'rgba(0,0,0,0.06)',
          cursor: 'move',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          userSelect: 'none'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}>
          📌 NOTE EDITOR
        </span>
        <div className="d-flex align-items-center gap-2" onClick={e => e.stopPropagation()}>
          {/* Mac-style controls: Red to delete note, Yellow to minimize/dock it back to the drawer */}
          <button
            onClick={onDelete}
            style={{
              width: '12px', height: '12px', borderRadius: '50%', border: 'none',
              background: '#ff5f56', cursor: 'pointer'
            }}
            title="Delete Note"
          />
          <button
            onClick={onClose}
            style={{
              width: '12px', height: '12px', borderRadius: '50%', border: 'none',
              background: '#ffbd2e', cursor: 'pointer'
            }}
            title="Minimize to Drawer"
          />
        </div>
      </div>

      {/* Editor inputs */}
      <div className="p-3 d-flex flex-column gap-2 flex-grow-1" style={{ minHeight: 0 }}>
        <input
          type="text"
          value={note.title}
          onChange={e => onUpdate(note.id, { title: e.target.value })}
          placeholder="Note Title..."
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: '1.5px solid rgba(0,0,0,0.1)',
            outline: 'none',
            fontWeight: 700,
            fontSize: '15px',
            color: 'inherit',
            paddingBottom: '4px'
          }}
        />

        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-1">
            <Tag size={12} />
            <select
              value={note.tag}
              onChange={e => onUpdate(note.id, { tag: e.target.value })}
              style={{
                background: 'rgba(255,255,255,0.4)',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '4px',
                fontSize: '11px',
                padding: '2px 4px',
                color: '#000',
                fontWeight: 600
              }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: '9px', opacity: 0.7 }}>{note.updatedAt}</span>
        </div>

        <textarea
          value={note.content}
          onChange={e => onUpdate(note.id, { content: e.target.value })}
          placeholder="Start writing note..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'inherit'
          }}
        />
      </div>

      {/* Bottom controls */}
      <div 
        className="px-3 py-2 d-flex justify-content-between align-items-center"
        style={{ background: 'rgba(0,0,0,0.03)', borderTop: '1px solid rgba(0,0,0,0.06)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Colors selector */}
        <div className="d-flex gap-1">
          {NOTE_COLORS.map(c => (
            <div
              key={c.name}
              onClick={() => onUpdate(note.id, { color: c.bg })}
              style={{
                width: '14px', height: '14px', borderRadius: '50%', background: c.bg,
                cursor: 'pointer', border: note.color === c.bg ? '2.5px solid #000' : '1px solid rgba(0,0,0,0.25)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
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
                fontSize: '11px',
                background: 'rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.15)',
                color: 'inherit',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px'
              }}
            >
              <Download size={11} /> Save As
            </button>
            {showSaveMenu && (
              <div
                style={{
                  position: 'absolute', bottom: '28px', right: 0,
                  background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px', width: '120px', display: 'flex', flexDirection: 'column',
                  fontSize: '11px', overflow: 'hidden', boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                  zIndex: 1000
                }}
              >
                <div className="px-3 py-2 cursor-pointer text-white hover-note-item" onClick={() => onDownload('txt', note)} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>📄 TXT</div>
                <div className="px-3 py-2 cursor-pointer text-white hover-note-item" onClick={() => onDownload('jpg', note)} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>🖼️ JPG</div>
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
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px',
          cursor: 'se-resize', background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.2) 50%)'
        }}
      />
    </div>
  );
}

export default function FloatingStickyNotes() {
  const { theme } = useThemeStore();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');

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
        content: 'This is a floating sticky note. Click existing notes to open them in floating panels.\n\n- Reposition the FAB button\n- Open multiple notes side-by-side\n- Customize category tags',
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



  // Create note
  const createNewNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'New Note',
      content: '',
      color: '#fef08a',
      tag: 'General',
      updatedAt: new Date().toLocaleString()
    };
    const updated = [newNote, ...notes];
    saveNotes(updated);
    setOpenNoteIds(prev => [...prev, newNote.id]);
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

  // Click note in list
  const toggleNoteEditor = (id: string) => {
    if (openNoteIds.includes(id)) {
      setOpenNoteIds(prev => prev.filter(nid => nid !== id));
    } else {
      setOpenNoteIds(prev => [...prev, id]);
    }
  };

  // Download logic
  const handleDownload = (format: 'txt' | 'jpg' | 'pdf', note: Note) => {
    const { title, content, tag, color, updatedAt } = note;
    if (format === 'txt') {
      const blob = new Blob([`GSV Notes\nTitle: ${title}\nTag: ${tag}\nUpdated: ${updatedAt}\n\n${content}`], { type: 'text/plain;charset=utf-8' });
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
        const lines = content.split('\n');
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
              <pre style="white-space:pre-wrap;font-size:15px;line-height:1.5;">${content}</pre>
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
          width: '380px',
          height: '100vh',
          background: 'var(--bg-card)',
          borderLeft: '2px solid var(--border-color)',
          boxShadow: isManagerOpen ? '-10px 0 35px rgba(0,0,0,0.3)' : 'none',
          color: 'var(--text-primary)',
          overflow: 'hidden',
          zIndex: 9990,
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isManagerOpen ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
          {/* Header Bar */}
          <div
            className="d-flex justify-content-between align-items-center px-3 border-bottom"
            style={{
              height: '56px',
              borderColor: 'var(--border-color)',
              background: 'var(--bg-secondary)',
              userSelect: 'none'
            }}
          >
            <div className="d-flex align-items-center gap-2">
              <FileText size={18} className="text-warning" />
              <strong style={{ fontSize: '14px', letterSpacing: '0.5px' }}>GSV Notes Drawer</strong>
            </div>

            <div className="d-flex align-items-center gap-2" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setIsManagerOpen(false)}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                  background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold'
                }}
                title="Close Drawer"
              >
                ×
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 border-bottom" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
            <div className="position-relative">
              <Search size={14} className="position-absolute text-muted" style={{ left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search notes..."
                className="form-control text-primary"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: '32px',
                  fontSize: '12px',
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Tag scrollbar menu */}
          <div className="px-3 py-2 d-flex gap-2 align-items-center border-bottom overflow-x-auto" style={{ borderColor: 'var(--border-color)', scrollbarWidth: 'none' }}>
            <span
              onClick={() => setSelectedTagFilter('All')}
              className="badge cursor-pointer"
              style={{
                fontSize: '11px',
                padding: '6px 10px',
                borderRadius: '6px',
                background: selectedTagFilter === 'All' ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                color: selectedTagFilter === 'All' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              All
            </span>
            {categories.map(tg => (
              <span
                key={tg}
                onClick={() => setSelectedTagFilter(tg)}
                className="badge cursor-pointer"
                style={{
                  fontSize: '11px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: selectedTagFilter === tg ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                  color: selectedTagFilter === tg ? '#fff' : 'var(--text-secondary)'
                }}
              >
                {tg}
              </span>
            ))}
            <button 
              className="btn btn-ghost p-1 d-flex align-items-center justify-content-center text-primary"
              style={{ background: 'var(--bg-secondary)', border: 'none', borderRadius: '50%', width: '22px', height: '22px' }}
              onClick={handleAddNewCategory}
              title="Add Custom Category Tag"
            >
              +
            </button>
          </div>

          {/* Notes History list */}
          <div className="flex-grow-1 p-3 d-flex flex-column gap-2" style={{ overflowY: 'auto' }}>
            {filteredNotes.length === 0 ? (
              <div className="text-center text-muted" style={{ fontSize: '12px', marginTop: '30px' }}>No notes found</div>
            ) : (
              filteredNotes.map(n => {
                const colorObj = NOTE_COLORS.find(c => c.bg === n.color) || NOTE_COLORS[0];
                const isOpenCard = openNoteIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => toggleNoteEditor(n.id)}
                    className="p-3 border rounded cursor-pointer d-flex justify-content-between align-items-center transition-all hover-manager-card"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: isOpenCard ? 'var(--brand-primary)' : 'var(--border-color)',
                      borderLeft: `5px solid ${colorObj.bg}`
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                          {n.title || 'Untitled'}
                        </strong>
                        <span className="badge" style={{ background: colorObj.bg, color: colorObj.text, fontSize: '9px', fontWeight: 700, padding: '2px 4px' }}>
                          {n.tag}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {n.content || '(Empty content)'}
                      </div>
                      <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>{n.updatedAt}</span>
                    </div>

                    <div className="d-flex align-items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost p-1 text-danger border-0"
                        onClick={(e) => deleteNote(n.id, e)}
                        title="Delete note"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer "New Note" Button */}
          <div className="p-3 border-top" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
            <button
              onClick={createNewNote}
              className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
              style={{ fontSize: '13px', fontWeight: 600, padding: '8px' }}
            >
              <Plus size={16} /> New Sticky Card
            </button>
          </div>
        </div>

      {/* Render Independent Draggable Note Cards */}
      {openNoteIds.map(noteId => {
        const note = notes.find(n => n.id === noteId);
        if (!note) return null;
        return (
          <DraggableNoteCard
            key={note.id}
            note={note}
            categories={categories}
            onUpdate={updateNote}
            onClose={() => toggleNoteEditor(note.id)}
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
          transform: translateY(-1px);
        }
      `}</style>

    </div>
  );
}

const PREDEFINED_TAGS = ['General', 'Work', 'Personal', 'Meeting', 'Reminder', 'Code'];
