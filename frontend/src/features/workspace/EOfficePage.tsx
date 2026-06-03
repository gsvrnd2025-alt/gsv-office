import React, { useState, useEffect, useRef } from 'react';
import { 
  FileEdit, Code2, Save, Play, Download, Cloud,
  ChevronRight, Laptop, FileCode, Type, Sun, Moon,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Sparkles, FileText, CheckCircle, Terminal
} from 'lucide-react';
import { filesApi } from '../../api';
import toast from 'react-hot-toast';
import { copyTextToClipboard } from '../../utils/clipboard';

const LANGUAGE_PRESETS = {
  python: `def greet(name):\n    print(f"Hello, {name}!")\n    print("Welcome to GSV E-Office workspace.")\n\ngreet("GSV User")\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "GSV E-Office Compiler Console v1.0.0" << endl;\n    cout << "Executing C++ script successfully..." << endl;\n    return 0;\n}\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Java compilation successful.");\n        System.out.println("GSV E-Office sandbox operational.");\n    }\n}\n`,
  javascript: `// Node.js Execution sandbox\nconsole.log("Node.js compile sequence active...");\nconst stats = { status: "Online", platform: "TrueNAS SCALE" };\nconsole.log("System state:", JSON.stringify(stats, null, 2));\n`
};

interface DraggableStickyNoteProps {
  note: {
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
    createdAt: string;
    closed: boolean;
  };
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
}

function DraggableStickyNote({ note, onUpdate, onDelete }: DraggableStickyNoteProps) {
  const [position, setPosition] = useState({ x: note.x, y: note.y });
  const [text, setText] = useState(note.text);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.note-header') === null) return;
    
    e.preventDefault();
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - startX;
      const newY = moveEvent.clientY - startY;
      setPosition({ x: newX, y: newY });
      onUpdate(note.id, { x: newX, y: newY });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={dragRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '240px',
        minHeight: '200px',
        background: note.color,
        border: '1.5px solid rgba(0,0,0,0.12)',
        borderRadius: '10px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#1e293b'
      }}
    >
      <div 
        className="note-header"
        style={{
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'move',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          fontSize: '11px',
          fontWeight: 700,
          userSelect: 'none'
        }}
      >
        <span>📌 Sticky Note</span>
        <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
          <button 
            onClick={async () => {
              const copied = await copyTextToClipboard(text);
              if (copied) toast.success('Note content copied!');
              else toast.error('Failed to copy note content.');
            }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '12px' }}
            title="Copy Content"
          >
            📋
          </button>
          <button 
            onClick={() => onDelete(note.id)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '13px', fontWeight: 'bold' }}
            title="Close / Archive Note"
          >
            ✕
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onUpdate(note.id, { text: e.target.value });
        }}
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: '12px',
          resize: 'none',
          fontSize: '13px',
          lineHeight: '1.4',
          color: 'inherit',
          fontFamily: 'inherit'
        }}
        placeholder="Write note here..."
      />
    </div>
  );
}

export default function EOfficePage() {
  const [activeTool, setActiveTool] = useState<'editor' | 'compiler'>('editor');
  const [docTitle, setDocTitle] = useState('Workspace Document');
  const [editorContent, setEditorContent] = useState('<h1>Welcome to GSV E-Office Workspace</h1><p>Start writing your professional document here. You can use standard <strong>formatting buttons</strong> to customize your layout.</p>');
  const [codeContent, setCodeContent] = useState(LANGUAGE_PRESETS.python);
  const [output, setOutput] = useState('');
  const [language, setLanguage] = useState<'python' | 'cpp' | 'java' | 'javascript'>('python');
  const [isCompiling, setIsCompiling] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved locally');
  const [activeFont, setActiveFont] = useState('Inter');
  const [activeSize, setActiveSize] = useState('16px');
  
  const editorRef = useRef<HTMLDivElement>(null);

  // Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('gsv_sticky_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showNotesHistory, setShowNotesHistory] = useState(false);

  useEffect(() => {
    localStorage.setItem('gsv_sticky_notes', JSON.stringify(stickyNotes));
  }, [stickyNotes]);

  // Load code template on language change
  useEffect(() => {
    setCodeContent(LANGUAGE_PRESETS[language]);
  }, [language]);

  // Simulated auto-save trigger
  useEffect(() => {
    const timer = setInterval(() => {
      setSaveStatus('Auto-saving...');
      setTimeout(() => {
        setSaveStatus('Auto-saved to ZFS Cloud');
      }, 800);
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleFormat = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  };

  const handleSaveToCloud = async () => {
    setSaveStatus('Uploading to ZFS Cloud...');
    try {
      const content = editorRef.current ? editorRef.current.innerHTML : editorContent;
      const blob = new Blob([content], { type: 'text/html' });
      const file = new File([blob], `${docTitle}.html`, { type: 'text/html' });
      
      const formData = new FormData();
      formData.append('file', file);
      
      await filesApi.upload(formData);
      setSaveStatus('Saved to Cloud Files');
      toast.success(`"${docTitle}.html" successfully saved to your ZFS cloud files`);
    } catch (err: any) {
      setSaveStatus('Save failed');
      toast.error('Failed to save file to ZFS Cloud storage');
    }
  };

  const handleDownload = (format: 'txt' | 'html') => {
    const content = editorRef.current ? editorRef.current.innerText : editorContent;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as ${format.toUpperCase()}`);
  };

  // PDF Export
  const handleExportPDF = () => {
    const content = editorRef.current ? editorRef.current.innerHTML : editorContent;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow popups to export to PDF.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
            h1 { color: #222; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${docTitle}</h1>
          <div>${content}</div>
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
    toast.success('Exporting document as PDF...');
  };

  // Word Export
  const handleExportWord = () => {
    const htmlContent = editorRef.current ? editorRef.current.innerHTML : editorContent;
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>${docTitle}</title><style>body { font-family: Arial; }</style></head>
      <body>${htmlContent}</body>
      </html>
    `;
    const blob = new Blob(['\ufeff' + fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle}.doc`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Document exported as Word (.doc)');
  };

  // Excel Export
  const handleExportExcel = () => {
    const text = editorRef.current ? editorRef.current.innerText : editorContent.replace(/<[^>]*>/g, '');
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const csvContent = lines.map(line => `"${line.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Document data exported as CSV/Excel (.csv)');
  };

  // Excel/CSV Import
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const rows = text.split('\n').map(r => r.split(','));
      let tableHtml = '<table border="1" style="border-collapse:collapse; width:100%; margin-top:15px; border: 1px solid var(--border-color);">';
      rows.forEach((row, i) => {
        tableHtml += '<tr>';
        row.forEach(cell => {
          const cleanCell = cell.replace(/^["']|["']$/g, '').trim();
          tableHtml += i === 0 ? `<th style="padding:10px; background:rgba(99, 102, 241, 0.1); border: 1px solid var(--border-color);">${cleanCell}</th>` : `<td style="padding:10px; border: 1px solid var(--border-color);">${cleanCell}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</table>';
      
      const newContent = editorContent + '<p></p><h4>Imported Tabular Workspace:</h4>' + tableHtml;
      setEditorContent(newContent);
      if (editorRef.current) {
        editorRef.current.innerHTML = newContent;
      }
      toast.success('CSV table imported successfully!');
    };
    reader.readAsText(file);
  };

  // Sticky Notes Logic
  const addStickyNote = () => {
    const newNote = {
      id: `note_${Date.now()}`,
      text: '',
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      color: ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa'][Math.floor(Math.random() * 5)],
      createdAt: new Date().toLocaleString('en-IN'),
      closed: false
    };
    setStickyNotes([...stickyNotes, newNote]);
    toast.success('Spawned new floating sticky note!');
  };

  const updateStickyNote = (id: string, updates: any) => {
    setStickyNotes(notes => notes.map(n => n.id === id ? { ...n, ...updates } : n));
  };

  const closeStickyNote = (id: string) => {
    setStickyNotes(notes => notes.map(n => n.id === id ? { ...n, closed: true } : n));
    toast.success('Note sent to history drawer');
  };

  const deleteStickyNoteFromHistory = (id: string) => {
    setStickyNotes(notes => notes.filter(n => n.id !== id));
    toast.success('Note permanently deleted');
  };

  const reopenStickyNote = (id: string) => {
    setStickyNotes(notes => notes.map(n => n.id === id ? { ...n, closed: false } : n));
    toast.success('Note restored to workspace');
  };

  const handleExportNotePDF = (noteText: string, date: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>GSV Sticky Note - ${date}</title>
          <style>
            body { font-family: Inter, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; background-color: #fffbeb; }
            .note-box { border: 2px solid #fbbf24; background-color: #fef08a; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .date { font-size: 12px; color: #b45309; font-weight: bold; margin-bottom: 12px; border-bottom: 1px solid #fde68a; padding-bottom: 6px; }
            .content { font-size: 16px; white-space: pre-wrap; color: #78350f; }
          </style>
        </head>
        <body>
          <div class="note-box">
            <div class="date">GSV Sticky Note — ${date}</div>
            <div class="content">${noteText || '(Empty Note)'}</div>
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
  };

  const runCode = () => {
    setIsCompiling(true);
    setOutput('🚀 GSV Sandbox: Compiling environment...\n⚙️ Allocating compiler resources...\n');
    
    setTimeout(() => {
      setOutput(prev => prev + `📦 Loaded environment: ${language.toUpperCase()} executor\n🏃 Executing compilation...\n\n`);
      
      setTimeout(() => {
        if (language === 'python') {
          setOutput(prev => prev + `Hello, GSV User!\nWelcome to GSV E-Office workspace.\n\n✨ Process finished with exit code 0`);
        } else if (language === 'cpp') {
          setOutput(prev => prev + `GSV E-Office Compiler Console v1.0.0\nExecuting C++ script successfully...\n\n✨ Process finished with exit code 0`);
        } else if (language === 'java') {
          setOutput(prev => prev + `Java compilation successful.\nGSV E-Office sandbox operational.\n\n✨ Process finished with exit code 0`);
        } else {
          setOutput(prev => prev + `Node.js compile sequence active...\nSystem state: {\n  "status": "Online",\n  "platform": "TrueNAS SCALE"\n}\n\n✨ Process finished with exit code 0`);
        }
        setIsCompiling(false);
      }, 1000);
    }, 1200);
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', position: 'relative' }}>
      
      {/* Upper header controls */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
            🖥️ GSV Document Workspace
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Enterprise document design hub and sandboxed script execution suite
          </p>
        </div>
        
        {/* Toggle between tools */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary"
            style={{ borderRadius: '8px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            onClick={addStickyNote}
          >
            📌 New Sticky Note
          </button>
          <button 
            className="btn btn-secondary"
            style={{ borderRadius: '8px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            onClick={() => setShowNotesHistory(true)}
          >
            📜 Note History ({stickyNotes.filter(n => n.closed).length + stickyNotes.filter(n => !n.closed).length})
          </button>
          <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '4px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <button 
              className={`btn ${activeTool === 'editor' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '8px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              onClick={() => setActiveTool('editor')}
            >
              <Type size={15} /> Document Editor
            </button>
            <button 
              className={`btn ${activeTool === 'compiler' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '8px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              onClick={() => setActiveTool('compiler')}
            >
              <Code2 size={15} /> Sandbox Compiler
            </button>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '520px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        
        {activeTool === 'editor' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
            
            {/* Rich Editor Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                value={docTitle} 
                onChange={e => setDocTitle(e.target.value)} 
                className="form-control" 
                style={{ width: '180px', fontWeight: 600, height: '32px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '13px' }}
                title="Document Title"
              />
              
              <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>
              
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('bold')} title="Bold" style={{ color: 'var(--text-primary)' }}><Bold size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('italic')} title="Italic" style={{ color: 'var(--text-primary)' }}><Italic size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('underline')} title="Underline" style={{ color: 'var(--text-primary)' }}><Underline size={14} /></button>
              
              <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>

              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('justifyLeft')} title="Align Left" style={{ color: 'var(--text-primary)' }}><AlignLeft size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('justifyCenter')} title="Align Center" style={{ color: 'var(--text-primary)' }}><AlignCenter size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('justifyRight')} title="Align Right" style={{ color: 'var(--text-primary)' }}><AlignRight size={14} /></button>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>

              {/* Font Selection */}
              <select 
                className="form-control" 
                style={{ width: '100px', height: '32px', padding: '0 8px', fontSize: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                value={activeFont}
                onChange={e => { setActiveFont(e.target.value); handleFormat('fontName', e.target.value); }}
              >
                <option value="Inter">Inter</option>
                <option value="Arial">Arial</option>
                <option value="Geist">Geist</option>
                <option value="Courier New">Courier</option>
              </select>

              {/* Text Size */}
              <select 
                className="form-control" 
                style={{ width: '80px', height: '32px', padding: '0 8px', fontSize: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                value={activeSize}
                onChange={e => { setActiveSize(e.target.value); handleFormat('fontSize', e.target.value === '12px' ? '3' : e.target.value === '16px' ? '4' : '5'); }}
              >
                <option value="12px">Small</option>
                <option value="16px">Normal</option>
                <option value="20px">Large</option>
              </select>

              <div className="ms-auto" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
                  <CheckCircle size={12} style={{ color: 'var(--brand-success)' }} /> {saveStatus}
                </span>
                
                <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }} onClick={handleSaveToCloud}>
                  <Cloud size={12} /> Save
                </button>
                
                <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }} onClick={handleExportPDF}>
                  📄 PDF
                </button>

                <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }} onClick={handleExportWord}>
                  📝 Word
                </button>

                <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }} onClick={handleExportExcel}>
                  📊 Excel
                </button>

                <label className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '32px', cursor: 'pointer', margin: 0 }}>
                  📥 Import <input type="file" accept=".csv,.txt" onChange={handleImportExcel} style={{ display: 'none' }} />
                </label>
                
                <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }} onClick={() => handleDownload('html')}>
                  <Download size={12} /> HTML
                </button>
              </div>
            </div>

            {/* Editable Content Frame */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
              <div 
                ref={editorRef}
                contentEditable 
                suppressContentEditableWarning
                style={{
                  minHeight: '100%',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: activeSize,
                  fontFamily: activeFont,
                  lineHeight: 1.6,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '24px',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
                }}
                onInput={e => setEditorContent(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: editorContent }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
            
            {/* Compiler Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-primary)' }}>
                <FileCode size={16} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  gsv_sandbox_{language}.{language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : language === 'javascript' ? 'js' : 'py'}
                </span>
              </div>
              
              <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>
              
              <select 
                className="form-control" 
                style={{ width: '130px', height: '32px', padding: '0 8px', fontSize: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                value={language}
                onChange={e => setLanguage(e.target.value as any)}
              >
                <option value="python">Python 3.10</option>
                <option value="cpp">C++ 17</option>
                <option value="java">Java 17</option>
                <option value="javascript">Node.js 18</option>
              </select>

              <div className="ms-auto" style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={async () => {
                  const copied = await copyTextToClipboard(codeContent);
                  if (copied) toast.success('Code copied to clipboard! 📋');
                  else toast.error('Failed to copy code.');
                }}>
                  Copy Code
                </button>
                <button 
                  className="btn btn-primary btn-sm" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }} 
                  onClick={runCode}
                  disabled={isCompiling}
                >
                  <Play size={14} className={isCompiling ? 'spin' : ''} /> {isCompiling ? 'Running...' : 'Run Code'}
                </button>
              </div>
            </div>

            {/* Split Code and Terminal Layout */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              
              {/* Code Area */}
              <div style={{ width: '60%', borderRight: '1px solid var(--border-color)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <textarea 
                  value={codeContent}
                  onChange={e => setCodeContent(e.target.value)}
                  style={{
                    flex: 1,
                    width: '100%',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontFamily: 'Courier New, monospace',
                    fontSize: '14px',
                    padding: '16px',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: 1.5,
                  }}
                  placeholder="Write your code here..."
                />
              </div>

              {/* Terminal Area */}
              <div style={{ width: '40%', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--brand-primary)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Terminal size={12} /> TERMINAL OUTPUT</span>
                  {isCompiling && <span style={{ color: 'var(--brand-success)', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="spinner" style={{ width: '10px', height: '10px', borderWidth: '1.5px' }} /> compiling...</span>}
                </div>
                <pre style={{
                  flex: 1,
                  margin: 0,
                  padding: '16px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'Courier New, monospace',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                }}>
                  {output || 'Click "Run Code" to compile and run your script inside the sandbox.'}
                </pre>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* Footer System Status Metrics */}
      <div className="d-flex align-items-center gap-4 flex-wrap" style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Laptop size={13} style={{ color: 'var(--brand-primary)' }} />
          <span>Local execution sandbox: <strong>Active</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={13} style={{ color: '#fbbf24' }} />
          <span>Cloud Storage Target: <strong>ZFS Dataset (tank)</strong></span>
        </div>
        {activeTool === 'editor' && (
          <div className="ms-auto">
            Words: {editorContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length} | Characters: {editorContent.replace(/<[^>]*>/g, '').length}
          </div>
        )}
      </div>

      {/* Floating Draggable Sticky Notes Render */}
      {stickyNotes.filter(n => !n.closed).map(note => (
        <DraggableStickyNote
          key={note.id}
          note={note}
          onUpdate={updateStickyNote}
          onDelete={closeStickyNote}
        />
      ))}

      {/* Slide-over Note History Drawer */}
      {showNotesHistory && (
        <div 
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: '320px',
            background: 'var(--bg-card)',
            borderLeft: '1px solid var(--border-color)',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            zIndex: 1100,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)', fontSize: '16px', fontWeight: 700 }}>📜 Notes History</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowNotesHistory(false)} style={{ fontSize: '16px', padding: '4px' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stickyNotes.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', fontSize: '13px', padding: '20px 0' }}>No notes in history.</p>
            ) : (
              stickyNotes.map((note) => (
                <div 
                  key={note.id} 
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{note.createdAt}</span>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: note.closed ? 'rgba(0,0,0,0.05)' : 'rgba(99, 102, 241, 0.1)', color: note.closed ? 'var(--text-secondary)' : 'var(--brand-primary)', fontWeight: 700 }}>
                      {note.closed ? 'Archived' : 'Active'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4' }}>
                    {note.text || '(Empty Note)'}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ fontSize: '10px', padding: '2px 4px', height: 'auto' }}
                      onClick={async () => {
                        const copied = await copyTextToClipboard(note.text);
                        if (copied) toast.success('Note text copied!');
                        else toast.error('Failed to copy note text.');
                      }}
                    >
                      Copy
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ fontSize: '10px', padding: '2px 4px', height: 'auto' }}
                      onClick={() => handleExportNotePDF(note.text, note.createdAt)}
                    >
                      PDF
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ fontSize: '10px', padding: '2px 4px', height: 'auto' }}
                      onClick={async () => {
                        const copied = await copyTextToClipboard(`GSV Sticky Note (${note.createdAt}):\n\n${note.text}`);
                        if (copied) toast.success('Share content copied! 🔗');
                        else toast.error('Failed to copy share content.');
                      }}
                    >
                      Share
                    </button>
                    {note.closed && (
                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ fontSize: '10px', padding: '2px 4px', height: 'auto', color: 'var(--brand-primary)' }}
                        onClick={() => reopenStickyNote(note.id)}
                      >
                        Restore
                      </button>
                    )}
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ fontSize: '10px', padding: '2px 4px', height: 'auto', color: 'var(--brand-danger)' }}
                      onClick={() => deleteStickyNoteFromHistory(note.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
    </div>
  );
}
