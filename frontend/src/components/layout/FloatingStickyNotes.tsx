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
  { name: 'Yellow', bg: '#fef08a', text: '#854d0e', border: '#facc15' },
  { name: 'Blue', bg: '#bfdbfe', text: '#1e40af', border: '#60a5fa' },
  { name: 'Green', bg: '#bbf7d0', text: '#166534', border: '#4ade80' },
  { name: 'Pink', bg: '#fbcfe8', text: '#9d174d', border: '#f472b6' },
  { name: 'Purple', bg: '#e9d5ff', text: '#6b21a8', border: '#c084fc' },
  { name: 'Dark Mode', bg: '#1e293b', text: '#f1f5f9', border: '#475569' }
];

const PREDEFINED_TAGS = ['General', 'Work', 'Personal', 'Meeting', 'Reminder', 'Code'];

export default function FloatingStickyNotes() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [isMinimized, setIsMinimized] = useState(false);

  // Load notes on mount
  useEffect(() => {
    const saved = localStorage.getItem('gsv_sticky_notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotes(parsed);
        if (parsed.length > 0) {
          setActiveNoteId(parsed[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      // Default note
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
    }
  }, []);

  // Save notes to localStorage
  const saveNotes = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('gsv_sticky_notes', JSON.stringify(updatedNotes));
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

  // Filter notes
  const filteredNotes = notes.filter(n => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTagFilter === 'All' || n.tag === selectedTagFilter;
    return matchesSearch && matchesTag;
  });

  // Handle Export/Download logic
  const handleDownload = (format: 'txt' | 'jpg' | 'pdf') => {
    if (!activeNote) {
      toast.error('No active note to download!');
      return;
    }

    const { title, content, tag, color, updatedAt } = activeNote;

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
      toast.success('Downloaded as TXT! 📄');
    } else if (format === 'jpg') {
      // Draw sticky note onto canvas to save as JPG
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 450;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const colorObj = NOTE_COLORS.find(c => c.bg === color) || NOTE_COLORS[0];
        
        // Background
        ctx.fillStyle = colorObj.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw shadow gradient
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.05)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header line / Tag
        ctx.fillStyle = colorObj.text;
        ctx.font = 'bold 18px Outfit, sans-serif';
        ctx.fillText(`GSV Notes - [${tag}]`, 30, 45);
        ctx.font = '12px Courier, monospace';
        ctx.fillText(`Updated: ${updatedAt}`, 30, 70);

        // Border separator
        ctx.strokeStyle = colorObj.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 85);
        ctx.lineTo(570, 85);
        ctx.stroke();

        // Title
        ctx.fillStyle = colorObj.text;
        ctx.font = 'bold 22px Outfit, sans-serif';
        ctx.fillText(title, 30, 125);

        // Body Text wrapping
        ctx.font = '16px Inter, sans-serif';
        ctx.fillStyle = colorObj.bg === '#1e293b' ? '#e2e8f0' : '#334155';
        const lines = content.split('\n');
        let y = 165;
        const lineSpacing = 24;
        
        for (const line of lines) {
          // Wrap text logic if line is too long
          const words = line.split(' ');
          let currentLine = '';
          for (const word of words) {
            const testLine = currentLine + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > 540) {
              ctx.fillText(currentLine, 30, y);
              currentLine = word + ' ';
              y += lineSpacing;
            } else {
              currentLine = testLine;
            }
          }
          ctx.fillText(currentLine, 30, y);
          y += lineSpacing;
          if (y > canvas.height - 30) break;
        }

        // Output image
        const imgUrl = canvas.toDataURL('image/jpeg');
        const link = document.createElement('a');
        link.href = imgUrl;
        link.download = `${title.replace(/\s+/g, '_')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Downloaded as JPG! 🖼️');
      }
    } else if (format === 'pdf') {
      // Create a mock PDF or print-ready window layout
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${title}</title>
              <style>
                body { font-family: 'Inter', sans-serif; padding: 40px; color: #334155; line-height: 1.6; }
                .card { border: 2px solid ${color}; padding: 30px; border-radius: 12px; background: #fafafa; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
                .header { border-bottom: 2px solid ${color}; padding-bottom: 12px; margin-bottom: 20px; }
                .tag { background: ${color}; color: #334155; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 14px; }
                h1 { margin-top: 15px; color: #0f172a; font-size: 28px; }
                pre { white-space: pre-wrap; font-family: 'Inter', sans-serif; font-size: 16px; margin-top: 20px; }
                .footer { font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="header">
                  <span class="tag">${tag}</span>
                  <h1>${title}</h1>
                </div>
                <pre>${content}</pre>
                <div class="footer">
                  GSV Office enterprise workspace. PDF generated on ${updatedAt}.
                </div>
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
        toast.success('Opened PDF print dialog! 🖨️');
      }
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="d-flex align-items-center justify-content-center bg-primary border-0 rounded-circle text-white cursor-pointer"
          style={{ 
            width: '56px', 
            height: '56px', 
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.45)',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Floating Sticky Notes"
        >
          <StickyNote size={26} />
        </button>
      )}

      {/* Expandable sticky notes notebook container */}
      {isOpen && (
        <div 
          className="d-flex flex-column"
          style={{ 
            width: isMinimized ? '280px' : '650px', 
            height: isMinimized ? '48px' : '480px',
            background: 'rgba(30, 41, 59, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)'
          }}
        >
          {/* Notebook Header */}
          <div 
            className="d-flex justify-content-between align-items-center px-3 border-bottom"
            style={{ 
              height: '48px', 
              borderColor: 'rgba(255,255,255,0.08)', 
              background: 'rgba(0,0,0,0.2)',
              cursor: 'pointer'
            }}
            onClick={() => isMinimized && setIsMinimized(false)}
          >
            <div className="d-flex align-items-center gap-2 text-white">
              <FileText size={18} className="text-primary" />
              <strong style={{ fontSize: '14px', letterSpacing: '0.5px' }}>GSV Workspace Notes</strong>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button 
                className="btn btn-ghost btn-icon btn-sm p-0 text-secondary" 
                style={{ width: '24px', height: '24px' }}
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              >
                {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button 
                className="btn btn-ghost btn-icon btn-sm p-0 text-danger" 
                style={{ width: '24px', height: '24px' }}
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notebook Body (Main Editor & List) */}
          {!isMinimized && (
            <div className="d-flex flex-grow-1" style={{ overflow: 'hidden' }}>
              
              {/* Left Column: Sidebar / Notes List */}
              <div 
                className="d-flex flex-column"
                style={{ 
                  width: '230px', 
                  borderRight: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(0,0,0,0.1)'
                }}
              >
                {/* Search Bar */}
                <div className="p-2 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="position-relative">
                    <Search size={12} className="position-absolute text-muted" style={{ left: '8px', top: '10px' }} />
                    <input 
                      type="text"
                      placeholder="Search notes..."
                      className="form-control form-control-sm text-white"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ 
                        paddingLeft: '26px', 
                        fontSize: '11px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.06)'
                      }}
                    />
                  </div>
                </div>

                {/* Filter tags option */}
                <div className="px-2 py-1 d-flex gap-1 overflow-x-auto border-bottom" style={{ borderColor: 'rgba(255,255,255,0.08)', fontSize: '10px' }}>
                  <span 
                    onClick={() => setSelectedTagFilter('All')}
                    style={{ 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      background: selectedTagFilter === 'All' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)',
                      color: '#fff'
                    }}
                  >
                    All
                  </span>
                  {PREDEFINED_TAGS.map(tg => (
                    <span 
                      key={tg}
                      onClick={() => setSelectedTagFilter(tg)}
                      style={{ 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        background: selectedTagFilter === tg ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {tg}
                    </span>
                  ))}
                </div>

                {/* Note list entries */}
                <div className="flex-grow-1 p-2 d-flex flex-column gap-2" style={{ overflowY: 'auto' }}>
                  {filteredNotes.length === 0 ? (
                    <div className="text-center text-muted" style={{ fontSize: '11px', marginTop: '20px' }}>
                      No notes found.
                    </div>
                  ) : (
                    filteredNotes.map(n => {
                      const colorObj = NOTE_COLORS.find(c => c.bg === n.color) || NOTE_COLORS[0];
                      return (
                        <div 
                          key={n.id}
                          onClick={() => setActiveNoteId(n.id)}
                          className="p-2 border rounded cursor-pointer position-relative d-flex flex-column gap-1"
                          style={{ 
                            background: activeNoteId === n.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                            borderColor: activeNoteId === n.id ? 'var(--brand-primary)' : 'rgba(255,255,255,0.06)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <span 
                              className="badge" 
                              style={{ 
                                background: colorObj.bg, 
                                color: colorObj.text,
                                fontSize: '9px',
                                padding: '2px 5px',
                                border: `1px solid ${colorObj.border}`
                              }}
                            >
                              {n.tag}
                            </span>
                            <button 
                              className="btn btn-ghost btn-icon btn-sm text-danger p-0 border-0 m-0"
                              style={{ width: '16px', height: '16px' }}
                              onClick={(e) => deleteNote(n.id, e)}
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                          <strong style={{ fontSize: '12px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {n.title || 'Untitled Note'}
                          </strong>
                          <span style={{ fontSize: '9px', color: '#94a3b8' }}>
                            {n.updatedAt}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Create note block */}
                <div className="p-2 border-top" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <button 
                    onClick={createNewNote}
                    className="btn btn-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-1"
                    style={{ fontSize: '11px' }}
                  >
                    <Plus size={12} /> New Note
                  </button>
                </div>

              </div>

              {/* Right Column: Editor Workspace */}
              <div className="flex-grow-1 d-flex flex-column" style={{ background: 'rgba(0,0,0,0.1)' }}>
                {activeNote ? (
                  <div className="d-flex flex-column flex-grow-1 p-3 gap-3 overflow-y-auto">
                    
                    {/* Title input & Properties Row */}
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <input 
                        type="text"
                        className="form-control bg-transparent border-0 text-white p-0"
                        style={{ fontSize: '18px', fontWeight: 700, boxShadow: 'none' }}
                        value={activeNote.title}
                        onChange={e => updateNote('title', e.target.value)}
                        placeholder="Note title..."
                      />
                      
                      {/* Control buttons: Color & Tag & Save */}
                      <div className="d-flex align-items-center gap-2">
                        {/* Tag select dropdown */}
                        <div className="d-flex align-items-center gap-1">
                          <Tag size={12} className="text-primary" />
                          <select 
                            value={activeNote.tag}
                            onChange={e => updateNote('tag', e.target.value)}
                            className="bg-dark text-white border-0"
                            style={{ fontSize: '11px', padding: '3px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            {PREDEFINED_TAGS.map(tg => (
                              <option key={tg} value={tg}>{tg}</option>
                            ))}
                          </select>
                        </div>

                        {/* Color Selector */}
                        <div className="dropdown position-relative">
                          <button 
                            className="btn btn-ghost btn-sm p-1 text-white border-0" 
                            title="Note Color"
                            style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            <Palette size={13} />
                          </button>
                          
                          {/* Color strip overlay */}
                          <div 
                            className="position-absolute d-flex gap-1 p-1 bg-dark rounded border"
                            style={{ 
                              bottom: '30px', 
                              right: '0', 
                              borderColor: 'rgba(255,255,255,0.1)', 
                              zIndex: 10
                            }}
                          >
                            {NOTE_COLORS.map(c => (
                              <div 
                                key={c.name}
                                onClick={() => updateNote('color', c.bg)}
                                style={{ 
                                  width: '16px', 
                                  height: '16px', 
                                  background: c.bg, 
                                  borderRadius: '50%',
                                  cursor: 'pointer',
                                  border: activeNote.color === c.bg ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)'
                                }}
                                title={c.name}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Save formats dropdown */}
                        <div className="dropdown position-relative d-inline-block">
                          <button 
                            className="btn btn-outline-primary btn-sm px-2 py-1"
                            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Download size={11} /> Save As
                          </button>
                          <div 
                            className="position-absolute bg-dark border rounded text-start"
                            style={{ 
                              bottom: '30px', 
                              right: '0', 
                              width: '120px', 
                              borderColor: 'rgba(255,255,255,0.1)',
                              zIndex: 10,
                              fontSize: '11px',
                              overflow: 'hidden'
                            }}
                          >
                            <div 
                              className="px-3 py-2 cursor-pointer text-white hover-bg" 
                              onClick={() => handleDownload('txt')}
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                            >
                              📄 Text File (.txt)
                            </div>
                            <div 
                              className="px-3 py-2 cursor-pointer text-white hover-bg" 
                              onClick={() => handleDownload('jpg')}
                              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                            >
                              🖼️ Image File (.jpg)
                            </div>
                            <div 
                              className="px-3 py-2 cursor-pointer text-white hover-bg" 
                              onClick={() => handleDownload('pdf')}
                            >
                              🖨️ PDF Document
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Note editor textarea */}
                    <div 
                      className="flex-grow-1 p-2 rounded border"
                      style={{ 
                        background: activeNote.color, 
                        color: activeNote.color === '#1e293b' ? '#f1f5f9' : '#1e293b',
                        borderColor: 'transparent',
                        transition: 'all 0.3s'
                      }}
                    >
                      <textarea 
                        className="w-100 h-100 bg-transparent border-0"
                        style={{ 
                          resize: 'none', 
                          outline: 'none', 
                          fontSize: '14px', 
                          lineHeight: 1.6,
                          color: 'inherit',
                          fontFamily: 'Inter, sans-serif'
                        }}
                        value={activeNote.content}
                        onChange={e => updateNote('content', e.target.value)}
                        placeholder="Write your note contents here..."
                      />
                    </div>

                  </div>
                ) : (
                  <div className="m-auto text-center text-muted" style={{ fontSize: '13px' }}>
                    <StickyNote size={48} className="mx-auto mb-3 opacity-20" />
                    Select a note or create a new one to begin.
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* Styled hover state for save drop options */}
      <style>{`
        .hover-bg:hover {
          background: rgba(99, 102, 241, 0.2) !important;
        }
      `}</style>

    </div>
  );
}
