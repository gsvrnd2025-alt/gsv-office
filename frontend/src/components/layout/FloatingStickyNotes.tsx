import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Trash2, Search, Download, 
  Tag, Palette, X, StickyNote, Minimize2, Maximize2 
} from 'lucide-react';
import toast from 'react-hot-toast';

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

const PREDEFINED_TAGS = ['General', 'Work', 'Personal', 'Meeting', 'Reminder', 'Code'];

export default function FloatingStickyNotes() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);

  // Drag and Resize State
  const [position, setPosition] = useState({ x: window.innerWidth - 680, y: 120 });
  const [size, setSize] = useState({ width: 620, height: 440 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0 });
  const sizeStartRef = useRef({ width: 0, height: 0 });
  const saveDropdownRef = useRef<HTMLDivElement>(null);

  // Load notes
  const loadNotes = () => {
    const saved = localStorage.getItem('gsv_sticky_notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotes(parsed);
        if (parsed.length > 0 && !activeNoteId) {
          setActiveNoteId(parsed[0].id);
        }
      } catch (e) {}
    } else {
      const defaultNote: Note = {
        id: 'default-1',
        title: 'Welcome to GSV Notes 📝',
        content: 'This is a floating sticky note. You can write your thoughts, reminders, or tasks here.\n\n- Create multiple notes\n- Assign custom tags\n- Change background colors\n- Download notes as TXT, JPG, or PDF!',
        color: '#fef08a',
        tag: 'General',
        updatedAt: new Date().toLocaleString()
      };
      setNotes([defaultNote]);
      setActiveNoteId(defaultNote.id);
      localStorage.setItem('gsv_sticky_notes', JSON.stringify([defaultNote]));
    }
  };

  useEffect(() => {
    loadNotes();
    
    // Sync storage updates from EOfficePage or other tabs
    const handleSync = () => {
      loadNotes();
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('gsv-notes-update', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('gsv-notes-update', handleSync);
    };
  }, []);

  // Click outside listener for Save Dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(e.target as Node)) {
        setShowSaveDropdown(false);
      }
    };
    if (showSaveDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showSaveDropdown]);

  const saveNotes = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('gsv_sticky_notes', JSON.stringify(updatedNotes));
    window.dispatchEvent(new Event('gsv-notes-update'));
  };

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
    setActiveNoteId(newNote.id);
    setIsMinimized(false);
    toast.success('Created new note! 📝');
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notes.filter(n => n.id !== id);
    saveNotes(updated);
    if (activeNoteId === id) {
      setActiveNoteId(updated.length > 0 ? updated[0].id : null);
    }
    toast.success('Note deleted.');
  };

  const updateNote = (field: keyof Note, value: string) => {
    if (!activeNoteId) return;
    const updated = notes.map(n => {
      if (n.id === activeNoteId) {
        return {
          ...n,
          [field]: value,
          updatedAt: new Date().toLocaleString()
        };
      }
      return n;
    });
    saveNotes(updated);
  };

  const activeNote = notes.find(n => n.id === activeNoteId);
  const filteredNotes = notes.filter(n => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTagFilter === 'All' || n.tag === selectedTagFilter;
    return matchesSearch && matchesTag;
  });

  // Drag Handlers
  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle') === null) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionStartRef.current = { ...position };
  };

  // Resize Handlers
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
          width: Math.max(450, Math.min(1000, sizeStartRef.current.width + dx)),
          height: Math.max(380, Math.min(800, sizeStartRef.current.height + dy))
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

  const handleDownload = (format: 'txt' | 'jpg' | 'pdf') => {
    if (!activeNote) return;
    const { title, content, tag, color, updatedAt } = activeNote;
    setShowSaveDropdown(false);

    if (format === 'txt') {
      const blob = new Blob([`GSV Office Sticky Note\nTitle: ${title}\nTag: ${tag}\nUpdated: ${updatedAt}\n\n${content}`], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Downloaded TXT File!');
    } else if (format === 'jpg') {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 450;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const colorObj = NOTE_COLORS.find(c => c.bg === color) || NOTE_COLORS[0];
        ctx.fillStyle = colorObj.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = colorObj.text;
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`GSV Notes - [${tag}]`, 30, 45);
        ctx.font = '12px monospace';
        ctx.fillText(`Updated: ${updatedAt}`, 30, 70);

        ctx.strokeStyle = colorObj.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 85);
        ctx.lineTo(570, 85);
        ctx.stroke();

        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(title, 30, 125);

        ctx.font = '16px sans-serif';
        ctx.fillStyle = color === '#334155' ? '#f8fafc' : '#334155';
        const lines = content.split('\n');
        let y = 165;
        for (const line of lines) {
          ctx.fillText(line, 30, y);
          y += 24;
          if (y > canvas.height - 30) break;
        }

        const imgUrl = canvas.toDataURL('image/jpeg');
        const link = document.createElement('a');
        link.href = imgUrl;
        link.download = `${title.replace(/\s+/g, '_')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Downloaded JPG Image!');
      }
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${title}</title>
              <style>
                body { font-family: sans-serif; padding: 40px; }
                .card { border: 2px solid ${color}; padding: 30px; border-radius: 8px; background: #fff; }
                .header { border-bottom: 2px solid ${color}; padding-bottom: 10px; margin-bottom: 20px; }
                h1 { margin: 0; color: #1e293b; }
                pre { white-space: pre-wrap; font-size: 16px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="header">
                  <span>Tag: <strong>${tag}</strong></span>
                  <h1>${title}</h1>
                  <span style="font-size:11px;color:#64748b">Saved: ${updatedAt}</span>
                </div>
                <pre>${content}</pre>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      
      {/* Floating Action Button (Colorful Neon Glow Icon) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="d-flex align-items-center justify-content-center border-0 rounded-circle text-white cursor-pointer gsv-glow-btn"
          style={{ 
            width: '60px', 
            height: '60px', 
            background: 'linear-gradient(135deg, #ff007f 0%, #ff7b00 50%, #facc15 100%)',
            boxShadow: '0 0 20px rgba(255, 0, 127, 0.6), 0 4px 10px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15) rotate(5deg)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
          title="Floating Sticky Notes"
        >
          <StickyNote size={28} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
        </button>
      )}

      {/* Expandable sticky notes container */}
      {isOpen && (
        <div 
          onMouseDown={handleDragStart}
          className="d-flex flex-column"
          style={{ 
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: isMinimized ? '300px' : `${size.width}px`, 
            height: isMinimized ? '52px' : `${size.height}px`,
            background: 'rgba(15, 23, 42, 0.98)',
            backdropFilter: 'blur(25px)',
            border: '1.5px solid rgba(255,255,255,0.2)',
            borderRadius: '14px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.75)',
            overflow: 'hidden',
            transition: isDragging || isResizing ? 'none' : 'width 0.2s, height 0.2s'
          }}
        >
          {/* Header Bar (Mac style high contrast controls) */}
          <div 
            className="drag-handle d-flex justify-content-between align-items-center px-3 border-bottom"
            style={{ 
              height: '52px', 
              borderColor: 'rgba(255,255,255,0.15)', 
              background: 'rgba(8, 12, 22, 0.6)',
              cursor: 'move',
              userSelect: 'none'
            }}
          >
            <div className="d-flex align-items-center gap-2 text-white drag-handle">
              <FileText size={20} className="text-warning" />
              <strong style={{ fontSize: '14px', letterSpacing: '0.5px', color: '#f8fafc', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>GSV Workspace Notes</strong>
            </div>

            <div className="d-flex align-items-center gap-2" onClick={e => e.stopPropagation()}>
              {/* High Contrast Colorful Buttons */}
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                style={{ 
                  width: '16px', height: '16px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.4)', 
                  background: '#eab308', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', padding: 0, color: '#000', fontSize: '9px', fontWeight: 'bold'
                }}
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                –
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ 
                  width: '16px', height: '16px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.4)', 
                  background: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', padding: 0, color: '#fff', fontSize: '9px', fontWeight: 'bold'
                }}
                title="Close and Dock to Button"
              >
                ×
              </button>
            </div>
          </div>

          {/* Body Content */}
          {!isMinimized && (
            <div className="d-flex flex-grow-1" style={{ overflow: 'hidden', position: 'relative' }}>
              
              {/* Left Column: Sidebar / Notes List */}
              <div 
                className="d-flex flex-column"
                style={{ 
                  width: '210px', 
                  borderRight: '1.5px solid rgba(255,255,255,0.12)',
                  background: 'rgba(8, 12, 22, 0.4)',
                  flexShrink: 0
                }}
              >
                {/* Search */}
                <div className="p-2 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <div className="position-relative">
                    <Search size={14} className="position-absolute text-muted" style={{ left: '8px', top: '9px' }} />
                    <input 
                      type="text"
                      placeholder="Search notes..."
                      className="form-control form-control-sm text-white"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ 
                        paddingLeft: '28px', 
                        fontSize: '12px',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </div>

                {/* Filter tags (Slightly larger, scrollable, nice padding) */}
                <div className="px-2 py-2 d-flex gap-2 overflow-x-auto border-bottom align-items-center" style={{ borderColor: 'rgba(255,255,255,0.1)', fontSize: '13px', scrollbarWidth: 'none' }}>
                  <span 
                    onClick={() => setSelectedTagFilter('All')}
                    style={{ 
                      padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
                      background: selectedTagFilter === 'All' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.08)',
                      color: '#fff', whiteSpace: 'nowrap', fontWeight: 600
                    }}
                  >
                    All
                  </span>
                  {PREDEFINED_TAGS.map(tg => (
                    <span 
                      key={tg}
                      onClick={() => setSelectedTagFilter(tg)}
                      style={{ 
                        padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
                        background: selectedTagFilter === tg ? 'var(--brand-primary)' : 'rgba(255,255,255,0.08)',
                        color: '#fff', whiteSpace: 'nowrap', fontWeight: 600
                      }}
                    >
                      {tg}
                    </span>
                  ))}
                </div>

                {/* Notes List */}
                <div className="flex-grow-1 p-2 d-flex flex-column gap-2" style={{ overflowY: 'auto' }}>
                  {filteredNotes.length === 0 ? (
                    <div className="text-center text-muted" style={{ fontSize: '12px', marginTop: '20px' }}>No notes</div>
                  ) : (
                    filteredNotes.map(n => {
                      const colorObj = NOTE_COLORS.find(c => c.bg === n.color) || NOTE_COLORS[0];
                      return (
                        <div 
                          key={n.id}
                          onClick={() => setActiveNoteId(n.id)}
                          className="p-2 border rounded cursor-pointer position-relative d-flex flex-column gap-1"
                          style={{ 
                            background: activeNoteId === n.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                            borderColor: activeNoteId === n.id ? 'var(--brand-primary)' : 'rgba(255,255,255,0.08)'
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="badge" style={{ background: colorObj.bg, color: colorObj.text, fontSize: '10px', border: `1px solid ${colorObj.border}` }}>
                              {n.tag}
                            </span>
                            <button 
                              className="btn btn-ghost btn-icon btn-sm text-danger p-0 border-0 m-0 d-flex align-items-center justify-content-center"
                              style={{ width: '18px', height: '18px' }}
                              onClick={(e) => deleteNote(n.id, e)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <strong style={{ fontSize: '12px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {n.title || 'Untitled Note'}
                          </strong>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>{n.updatedAt}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* New button */}
                <div className="p-2 border-top" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <button onClick={createNewNote} className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1" style={{ fontSize: '12px', padding: '6px' }}>
                    <Plus size={14} /> New Note
                  </button>
                </div>
              </div>

              {/* Right Column: Editor */}
              <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
                {activeNote ? (
                  <div className="d-flex flex-column flex-grow-1 p-3 gap-2" style={{ overflow: 'hidden' }}>
                    
                    {/* Toolbar header options (All high contrast white icons & selectors) */}
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 pb-2 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                      <input 
                        type="text"
                        className="form-control bg-transparent border-0 text-white p-0"
                        style={{ fontSize: '16px', fontWeight: 700, boxShadow: 'none', width: '180px' }}
                        value={activeNote.title}
                        onChange={e => updateNote('title', e.target.value)}
                        placeholder="Title..."
                      />
                      
                      <div className="d-flex align-items-center gap-2">
                        {/* Tag */}
                        <div className="d-flex align-items-center gap-1">
                           <Tag size={13} className="text-warning" />
                          <select 
                            value={activeNote.tag}
                            onChange={e => updateNote('tag', e.target.value)}
                            className="bg-dark text-white border-0"
                            style={{ fontSize: '12px', padding: '3px 6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }}
                          >
                            {PREDEFINED_TAGS.map(tg => (
                              <option key={tg} value={tg}>{tg}</option>
                            ))}
                          </select>
                        </div>

                        {/* Colors horizontal strip */}
                        <div className="d-flex align-items-center gap-1 px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.4)' }}>
                          {NOTE_COLORS.map(c => (
                            <div 
                              key={c.name}
                              onClick={() => updateNote('color', c.bg)}
                              style={{ 
                                width: '16px', height: '16px', background: c.bg, borderRadius: '50%',
                                cursor: 'pointer', border: activeNote.color === c.bg ? '2px solid #fff' : '1px solid rgba(255,255,255,0.4)',
                                transition: 'transform 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              title={c.name}
                            />
                          ))}
                        </div>

                        {/* Save Actions dropdown */}
                        <div className="position-relative" ref={saveDropdownRef}>
                          <button 
                            className="btn btn-outline-light btn-sm d-flex align-items-center gap-1" 
                            style={{ fontSize: '12px', padding: '4px 10px' }}
                            onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                          >
                            <Download size={13} /> Save As
                          </button>
                          
                          {showSaveDropdown && (
                            <div className="dropdown-menu-list show" style={{
                              position: 'absolute', bottom: '32px', right: 0, background: '#1e293b', border: '1.5px solid rgba(255,255,255,0.2)',
                              borderRadius: '8px', width: '130px', zIndex: 999, fontSize: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                              boxShadow: '0 10px 20px rgba(0,0,0,0.5)'
                            }}>
                              <div className="px-3 py-2 cursor-pointer text-white hover-bg" onClick={() => handleDownload('txt')} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>📄 Text File (.txt)</div>
                              <div className="px-3 py-2 cursor-pointer text-white hover-bg" onClick={() => handleDownload('jpg')} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>🖼️ Image File (.jpg)</div>
                              <div className="px-3 py-2 cursor-pointer text-white hover-bg" onClick={() => handleDownload('pdf')} style={{ fontWeight: 600 }}>🖨️ PDF Document</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Textarea - flex fill inside container, no overflows */}
                    <div 
                      className="flex-grow-1 p-3 rounded"
                      style={{ 
                        background: activeNote.color, 
                        color: activeNote.color === '#334155' ? '#f8fafc' : '#1e293b',
                        border: '1.5px solid rgba(0,0,0,0.12)',
                        display: 'flex',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
                      }}
                    >
                      <textarea 
                        className="w-100 h-100 bg-transparent border-0"
                        style={{ 
                          resize: 'none', outline: 'none', fontSize: '14px', lineHeight: 1.5,
                          color: 'inherit', fontFamily: 'inherit'
                        }}
                        value={activeNote.content}
                        onChange={e => updateNote('content', e.target.value)}
                        placeholder="Write note here..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="m-auto text-center text-muted" style={{ fontSize: '13px' }}>
                    <StickyNote size={40} className="mx-auto mb-2 opacity-30 text-warning" />
                    Select or create a sticky note.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Bottom Right Resize Handle (Lucide/styled icon) */}
          {!isMinimized && (
            <div 
              onMouseDown={handleResizeStart}
              style={{
                position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px',
                cursor: 'se-resize', background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.4) 50%)',
                borderBottomRightRadius: '14px', zIndex: 100
              }}
            />
          )}
        </div>
      )}

      {/* Styled css properties */}
      <style>{`
        .gsv-glow-btn:hover {
          box-shadow: 0 0 30px rgba(255, 0, 127, 0.8), 0 6px 15px rgba(0, 0, 0, 0.4) !important;
        }
        .hover-bg:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          color: #facc15 !important;
        }
        .dropdown-menu-list {
          display: none;
        }
        .dropdown-menu-list.show {
          display: flex;
        }
      `}</style>

    </div>
  );
}
