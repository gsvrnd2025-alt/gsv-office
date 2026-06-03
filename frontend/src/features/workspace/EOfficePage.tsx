import React, { useState, useEffect, useRef } from 'react';
import { 
  FileEdit, Code2, Save, Play, Download, Cloud,
  ChevronRight, Laptop, FileCode, Type, Sun, Moon,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Sparkles, FileText, CheckCircle, Terminal, Plus, Trash2, 
  Search, Table, FileText as NoteIcon, AlignJustify, Heading1,
  Heading2, Heading3, List, Image as ImageIcon, History, X
} from 'lucide-react';
import { filesApi } from '../../api';
import toast from 'react-hot-toast';
import { copyTextToClipboard } from '../../utils/clipboard';

// Default presets for clean layout
const DEFAULT_WORD_CONTENT = '<h1>Welcome to GSV E-Office WordPad</h1><p>Start drafting your professional document here. Customize typography, format lists, and insert images.</p>';
const DEFAULT_NOTE_CONTENT = 'Welcome to GSV Notepad.\nSimple raw text editor for configurations or scratch notes.';

export default function EOfficePage() {
  const [activeTab, setActiveTab] = useState<'word' | 'excel' | 'note'>('word');
  const [docTitle, setDocTitle] = useState('New Document');
  
  // Word Editor States
  const [wordContent, setWordContent] = useState(DEFAULT_WORD_CONTENT);
  const [headerText, setHeaderText] = useState('GSV Enterprise Header');
  const [footerText, setFooterText] = useState('GSV Office Confidential');
  const [textColor, setTextColor] = useState('#1e293b');
  const [highlightColor, setHighlightColor] = useState('#ffffff');
  const [activeFont, setActiveFont] = useState('Inter');
  const [activeSize, setActiveSize] = useState('16px');
  
  // Excel Spreadsheet States
  const [excelGrid, setExcelGrid] = useState<string[][]>(() => 
    Array.from({ length: 20 }, () => Array(10).fill(''))
  );
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [formulaInput, setFormulaInput] = useState('');
  const [excelSearchQuery, setExcelSearchQuery] = useState('');
  const [columnAlignments, setColumnAlignments] = useState<string[]>(() => Array(10).fill('left'));
  
  // Note Text Editor State
  const [noteContent, setNoteContent] = useState(DEFAULT_NOTE_CONTENT);
  
  // DB File Tracking States
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState('Saved locally');
  const [workspaceFiles, setWorkspaceFiles] = useState<any[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [activeContextMenu, setActiveContextMenu] = useState<{ fileId: string; x: number; y: number } | null>(null);
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);

  const wordRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Fetch past files from Database
  const fetchWorkspaceHistory = async () => {
    try {
      const res = await filesApi.getFiles();
      const list = res.data?.data || res.data || [];
      // Filter list for document types
      const filtered = list.filter((f: any) => 
        ['docx', 'xlsx', 'txt', 'csv', 'pdf', 'html', 'doc'].includes(f.extension?.toLowerCase() || '')
      );
      setWorkspaceFiles(filtered);
    } catch (err) {
      console.error('Failed to load document history', err);
    }
  };

  useEffect(() => {
    fetchWorkspaceHistory();
    // Refresh history every 10 seconds
    const interval = setInterval(fetchWorkspaceHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen to context menu clicks outside
  useEffect(() => {
    const clickOutsideContext = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setActiveContextMenu(null);
      }
    };
    document.addEventListener('mousedown', clickOutsideContext);
    return () => document.removeEventListener('mousedown', clickOutsideContext);
  }, [activeContextMenu]);

  // Sync state modifications
  useEffect(() => {
    const handleSync = () => {
      fetchWorkspaceHistory();
    };
    window.addEventListener('gsv-notes-update', handleSync);
    return () => window.removeEventListener('gsv-notes-update', handleSync);
  }, []);

  // Word Editor Formatting
  const handleWordFormat = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (wordRef.current) {
      setWordContent(wordRef.current.innerHTML);
    }
  };

  // Insert Image in WordPad
  const handleInsertImage = () => {
    const url = prompt('Enter absolute image URL:');
    if (url) {
      handleWordFormat('insertImage', url);
    }
  };

  // Parse Cell Column/Row references (e.g. A1, B3)
  const parseCellName = (name: string) => {
    const match = name.trim().toUpperCase().match(/^([A-J])([1-9][0-9]*)$/);
    if (!match) return null;
    const colIndex = match[1].charCodeAt(0) - 65; // A=0, B=1...
    const rowIndex = parseInt(match[2]) - 1;
    return { col: colIndex, row: rowIndex };
  };

  // Evaluate cells for formulas (SUM, AVERAGE)
  const evaluateCell = (content: string): string => {
    if (!content || !content.startsWith('=')) return content;
    try {
      const formula = content.substring(1).toUpperCase().trim();
      
      // SUM(A1:A5)
      if (formula.startsWith('SUM(') && formula.endsWith(')')) {
        const range = formula.substring(4, formula.length - 1);
        const values = getCellRangeValues(range);
        return values.reduce((sum, val) => sum + val, 0).toString();
      }
      
      // AVERAGE(A1:A5)
      if (formula.startsWith('AVERAGE(') && formula.endsWith(')')) {
        const range = formula.substring(8, formula.length - 1);
        const values = getCellRangeValues(range);
        if (values.length === 0) return '0';
        return (values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(2);
      }
      
      return 'ERR: Formula';
    } catch {
      return 'ERR';
    }
  };

  const getCellRangeValues = (rangeStr: string): number[] => {
    const parts = rangeStr.split(':');
    if (parts.length !== 2) return [];
    const start = parseCellName(parts[0]);
    const end = parseCellName(parts[1]);
    if (!start || !end) return [];
    
    const values: number[] = [];
    const startCol = Math.min(start.col, end.col);
    const endCol = Math.max(start.col, end.col);
    const startRow = Math.min(start.row, end.row);
    const endRow = Math.max(start.row, end.row);
    
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const raw = excelGrid[r]?.[c] || '';
        const evaluated = raw.startsWith('=') ? evaluateCell(raw) : raw;
        const num = parseFloat(evaluated);
        if (!isNaN(num)) {
          values.push(num);
        }
      }
    }
    return values;
  };

  // Excel Row Manipulations
  const handleAddExcelRow = () => {
    setExcelGrid(prev => [...prev, Array(10).fill('')]);
    toast.success('Appended new row');
  };

  const handleDeleteExcelRow = () => {
    if (excelGrid.length <= 1) return;
    setExcelGrid(prev => prev.slice(0, -1));
    toast.success('Removed last row');
  };

  // Open Document from History Sidebar
  const openHistoryDocument = async (file: any) => {
    setShowHistoryDrawer(false);
    setSaveStatus('Syncing from Cloud...');
    try {
      const response = await fetch(file.storageUrl);
      const content = await response.text();
      
      const fileExt = file.extension?.toLowerCase() || '';
      if (fileExt === 'xlsx' || fileExt === 'csv') {
        setActiveTab('excel');
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            setExcelGrid(parsed);
          } else {
            // parse csv fallback
            loadCsvContent(content);
          }
        } catch {
          loadCsvContent(content);
        }
      } else if (fileExt === 'txt') {
        setActiveTab('note');
        setNoteContent(content);
      } else {
        // html/docx/doc
        setActiveTab('word');
        // Extract body elements or load full markup
        setWordContent(content);
      }
      
      setDocTitle(file.originalName.replace(/\.[^/.]+$/, ""));
      setActiveFileId(file.id);
      setSaveStatus('Document active');
      toast.success(`Loaded "${file.originalName}"!`);
    } catch {
      setSaveStatus('Failed loading');
      toast.error('Could not download file content from ZFS Cloud.');
    }
  };

  const loadCsvContent = (csv: string) => {
    const lines = csv.split('\n');
    const newGrid = Array.from({ length: 20 }, () => Array(10).fill(''));
    lines.forEach((line, rIndex) => {
      if (rIndex >= 20) return;
      const cols = line.split(',');
      cols.forEach((val, cIndex) => {
        if (cIndex >= 10) return;
        newGrid[rIndex][cIndex] = val.replace(/^["']|["']$/g, '').trim();
      });
    });
    setExcelGrid(newGrid);
  };

  // Delete Document
  const deleteHistoryDocument = async (fileId: string) => {
    try {
      await filesApi.delete(fileId);
      toast.success('Document deleted successfully.');
      if (activeFileId === fileId) {
        setActiveFileId(null);
        setDocTitle('New Document');
        setWordContent(DEFAULT_WORD_CONTENT);
        setNoteContent(DEFAULT_NOTE_CONTENT);
        setExcelGrid(Array.from({ length: 20 }, () => Array(10).fill('')));
      }
      fetchWorkspaceHistory();
    } catch {
      toast.error('Failed to delete document from database.');
    }
  };

  // Save Document to Database & Cloud
  const handleSaveToCloud = async () => {
    setSaveStatus('Saving to ZFS Cloud...');
    try {
      let blob: Blob;
      let filename = docTitle;
      
      if (activeTab === 'word') {
        // Embed Header/Footer values inside Document structure
        const docMarkup = `
          <div class="gsv-document-header" style="font-size:12px;color:#64748b;border-bottom:1px dashed #cbd5e1;padding-bottom:5px;margin-bottom:20px;">${headerText}</div>
          <div class="gsv-document-body">${wordContent}</div>
          <div class="gsv-document-footer" style="font-size:12px;color:#64748b;border-top:1px dashed #cbd5e1;padding-top:5px;margin-top:20px;display:flex;justify-content:space-between;">
            <span>${footerText}</span>
            <span>Page 1</span>
          </div>
        `;
        blob = new Blob([docMarkup], { type: 'text/html' });
        filename += '.docx';
      } else if (activeTab === 'excel') {
        // Stringify grid
        const gridJson = JSON.stringify(excelGrid);
        blob = new Blob([gridJson], { type: 'application/json' });
        filename += '.xlsx';
      } else {
        blob = new Blob([noteContent], { type: 'text/plain' });
        filename += '.txt';
      }

      const file = new File([blob], filename, { type: blob.type });
      const formData = new FormData();
      formData.append('file', file);

      // Overwrite existing by deleting first
      if (activeFileId) {
        try {
          await filesApi.delete(activeFileId);
        } catch {}
      }

      const uploadRes = await filesApi.upload(formData);
      const newFile = uploadRes.data?.data || uploadRes.data;
      if (newFile && newFile.id) {
        setActiveFileId(newFile.id);
      }

      setSaveStatus('ZFS Storage Synced');
      toast.success(`"${filename}" successfully saved to cloud.`);
      fetchWorkspaceHistory();
    } catch {
      setSaveStatus('Save Failed');
      toast.error('Failed to upload workspace files.');
    }
  };

  // Export and Download As locally
  const handleExportAs = (format: 'docx' | 'xlsx' | 'txt' | 'csv' | 'pdf') => {
    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Popup blocker enabled.');
        return;
      }
      
      let htmlContent = '';
      if (activeTab === 'word') {
        htmlContent = `
          <div style="border-bottom:1px solid #cbd5e1;padding-bottom:5px;margin-bottom:20px;color:#64748b;font-size:12px;">${headerText}</div>
          <div>${wordContent}</div>
          <div style="border-top:1px solid #cbd5e1;padding-top:5px;margin-top:20px;display:flex;justify-content:space-between;color:#64748b;font-size:12px;">
            <span>${footerText}</span><span>Page 1</span>
          </div>
        `;
      } else if (activeTab === 'note') {
        htmlContent = `<pre style="white-space:pre-wrap;">${noteContent}</pre>`;
      } else {
        // Excel to PDF Table layout
        htmlContent = `
          <table border="1" style="border-collapse:collapse;width:100%;font-size:12px;text-align:left;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:6px;">Row</th>
                ${Array.from({ length: 10 }).map((_, i) => `<th style="padding:6px;">Col ${String.fromCharCode(65 + i)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${excelGrid.map((row, r) => `
                <tr>
                  <td style="padding:6px;font-weight:bold;background:#f8fafc;">${r + 1}</td>
                  ${row.map(cell => `<td style="padding:6px;">${cell.startsWith('=') ? evaluateCell(cell) : cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      printWindow.document.write(`
        <html>
          <head><title>${docTitle}</title></head>
          <body style="font-family:sans-serif;padding:30px;color:#1e293b;">
            <h2>${docTitle}</h2>
            ${htmlContent}
            <script>window.onload = function(){ window.print(); setTimeout(window.close, 500); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
      toast.success('Document PDF initialized');
      return;
    }

    let blob: Blob;
    let extension = format;
    
    if (format === 'docx' || format === 'txt') {
      const content = activeTab === 'word' ? wordContent : noteContent;
      blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    } else if (format === 'csv') {
      const csvStr = excelGrid.map(row => 
        row.map(val => `"${val.replace(/"/g, '""')}"`).join(',')
      ).join('\n');
      blob = new Blob(['\ufeff' + csvStr], { type: 'text/csv;charset=utf-8;' });
    } else {
      // JSON spreadsheet structure downloaded as xlsx file format
      const gridStr = JSON.stringify(excelGrid);
      blob = new Blob([gridStr], { type: 'application/json' });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported locally as ${extension.toUpperCase()}`);
  };

  // Context Menu triggers
  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    setActiveContextMenu({
      fileId,
      x: e.clientX,
      y: e.clientY
    });
  };

  // Create document triggers
  const triggerNewDocCreation = (type: 'word' | 'excel' | 'note') => {
    setShowNewDocDialog(false);
    setActiveTab(type);
    setActiveFileId(null);
    setDocTitle(`New_${type.toUpperCase()}_Doc`);
    
    if (type === 'word') {
      setWordContent(DEFAULT_WORD_CONTENT);
    } else if (type === 'note') {
      setNoteContent(DEFAULT_NOTE_CONTENT);
    } else {
      setExcelGrid(Array.from({ length: 20 }, () => Array(10).fill('')));
    }
    
    toast.success(`Created blank ${type.toUpperCase()} workspace`);
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
            Unified Document suite (Word, Excel, Notepad) integrated with ZFS Cloud storage database
          </p>
        </div>
        
        {/* Upper Switch panel */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="btn btn-primary"
            style={{ borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
            onClick={() => setShowNewDocDialog(true)}
          >
            <Plus size={15} /> New Document
          </button>
          
          <button 
            className="btn btn-secondary"
            style={{ borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            onClick={() => setShowHistoryDrawer(true)}
          >
            <History size={15} /> History Drawer ({workspaceFiles.length})
          </button>

          <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '4px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <button 
              className={`btn ${activeTab === 'word' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setActiveTab('word')}
            >
              <Type size={14} /> Word
            </button>
            <button 
              className={`btn ${activeTab === 'excel' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setActiveTab('excel')}
            >
              <Table size={14} /> Excel
            </button>
            <button 
              className={`btn ${activeTab === 'note' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '8px', padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setActiveTab('note')}
            >
              <NoteIcon size={14} /> Note
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Panel */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '520px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        
        {/* Editor Toolbar */}
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
          
          {/* TAB SPECIFIC TOOLBARS */}
          {activeTab === 'word' && (
            <>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleWordFormat('bold')} title="Bold" style={{ color: 'var(--text-primary)' }}><Bold size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleWordFormat('italic')} title="Italic" style={{ color: 'var(--text-primary)' }}><Italic size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleWordFormat('underline')} title="Underline" style={{ color: 'var(--text-primary)' }}><Underline size={14} /></button>
              
              <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>

              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleWordFormat('justifyLeft')} title="Align Left" style={{ color: 'var(--text-primary)' }}><AlignLeft size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleWordFormat('justifyCenter')} title="Align Center" style={{ color: 'var(--text-primary)' }}><AlignCenter size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleWordFormat('justifyRight')} title="Align Right" style={{ color: 'var(--text-primary)' }}><AlignRight size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleWordFormat('justifyFull')} title="Justify" style={{ color: 'var(--text-primary)' }}><AlignJustify size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleWordFormat('insertUnorderedList')} title="Bullet List" style={{ color: 'var(--text-primary)' }}><List size={14} /></button>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>

              {/* Text / Highlight Color pickers */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Color:</span>
                <input 
                  type="color" 
                  value={textColor} 
                  onChange={e => { setTextColor(e.target.value); handleWordFormat('foreColor', e.target.value); }} 
                  style={{ width: '22px', height: '22px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
                  title="Text Color"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Highlight:</span>
                <input 
                  type="color" 
                  value={highlightColor} 
                  onChange={e => { setHighlightColor(e.target.value); handleWordFormat('backColor', e.target.value); }} 
                  style={{ width: '22px', height: '22px', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent' }}
                  title="Highlight Color"
                />
              </div>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>

              <button className="btn btn-ghost btn-icon btn-sm" onClick={handleInsertImage} title="Insert Image" style={{ color: 'var(--text-primary)' }}><ImageIcon size={14} /></button>
            </>
          )}

          {activeTab === 'excel' && (
            <>
              {/* Formula Input */}
              <div className="d-flex align-items-center gap-2" style={{ flex: 1, minWidth: '220px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-primary)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                  {selectedCell ? `${String.fromCharCode(65 + selectedCell.col)}${selectedCell.row + 1}` : 'A1'}
                </span>
                <input 
                  type="text"
                  placeholder="Enter cell value or formula (e.g. =SUM(A1:A3))"
                  className="form-control form-control-sm text-white"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', height: '30px' }}
                  value={formulaInput}
                  onChange={e => {
                    setFormulaInput(e.target.value);
                    if (selectedCell) {
                      const newGrid = [...excelGrid];
                      newGrid[selectedCell.row][selectedCell.col] = e.target.value;
                      setExcelGrid(newGrid);
                    }
                  }}
                />
              </div>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>

              {/* Excel rows modifiers */}
              <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', height: '30px', fontSize: '11px' }} onClick={handleAddExcelRow}>+ Add Row</button>
              <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', height: '30px', fontSize: '11px' }} onClick={handleDeleteExcelRow}>- Delete Row</button>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>

              {/* Alignments */}
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => {
                if (selectedCell) {
                  const newAligns = [...columnAlignments];
                  newAligns[selectedCell.col] = 'left';
                  setColumnAlignments(newAligns);
                }
              }} title="Align Column Left"><AlignLeft size={13} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => {
                if (selectedCell) {
                  const newAligns = [...columnAlignments];
                  newAligns[selectedCell.col] = 'center';
                  setColumnAlignments(newAligns);
                }
              }} title="Align Column Center"><AlignCenter size={13} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => {
                if (selectedCell) {
                  const newAligns = [...columnAlignments];
                  newAligns[selectedCell.col] = 'right';
                  setColumnAlignments(newAligns);
                }
              }} title="Align Column Right"><AlignRight size={13} /></button>

              <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>

              {/* Search cell values */}
              <div className="position-relative">
                <Search size={12} className="position-absolute text-muted" style={{ left: '6px', top: '9px' }} />
                <input 
                  type="text" 
                  placeholder="Search spreadsheet..." 
                  className="form-control form-control-sm text-white" 
                  style={{ width: '140px', paddingLeft: '22px', height: '30px', fontSize: '11px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                  value={excelSearchQuery}
                  onChange={e => setExcelSearchQuery(e.target.value)}
                />
              </div>
            </>
          )}

          {activeTab === 'note' && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Plain text notepad mode active</span>
          )}

          <div className="ms-auto" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
              <CheckCircle size={12} style={{ color: 'var(--brand-success)' }} /> {saveStatus}
            </span>
            
            <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }} onClick={handleSaveToCloud}>
              <Cloud size={12} /> Save to ZFS
            </button>
            
            {/* Format Exports dropdown */}
            <div className="dropdown-export" style={{ position: 'relative' }}>
              <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" style={{ height: '32px' }}>
                <Download size={12} /> Save As
              </button>
              <div className="dropdown-export-menu" style={{
                position: 'absolute', top: '34px', right: 0, background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px', width: '140px', zIndex: 100, fontSize: '12px', display: 'flex', flexDirection: 'column',
                boxShadow: '0 10px 20px rgba(0,0,0,0.5)', overflow: 'hidden'
              }}>
                {activeTab === 'word' && (
                  <>
                    <div className="px-3 py-2 cursor-pointer text-white hover-export-item" onClick={() => handleExportAs('docx')}>Word Doc (.docx)</div>
                    <div className="px-3 py-2 cursor-pointer text-white hover-export-item" onClick={() => handleExportAs('pdf')}>PDF Document</div>
                  </>
                )}
                {activeTab === 'excel' && (
                  <>
                    <div className="px-3 py-2 cursor-pointer text-white hover-export-item" onClick={() => handleExportAs('xlsx')}>Excel Sheet (.xlsx)</div>
                    <div className="px-3 py-2 cursor-pointer text-white hover-export-item" onClick={() => handleExportAs('csv')}>CSV File (.csv)</div>
                    <div className="px-3 py-2 cursor-pointer text-white hover-export-item" onClick={() => handleExportAs('pdf')}>PDF Printout</div>
                  </>
                )}
                {activeTab === 'note' && (
                  <>
                    <div className="px-3 py-2 cursor-pointer text-white hover-export-item" onClick={() => handleExportAs('txt')}>Plain Text (.txt)</div>
                    <div className="px-3 py-2 cursor-pointer text-white hover-export-item" onClick={() => handleExportAs('pdf')}>PDF Printout</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* WORKSPACE VIEWPORTS */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
          
          {/* WORDPAD */}
          {activeTab === 'word' && (
            <div style={{
              width: '100%', maxWidth: '850px', minHeight: '1000px', background: '#fff', 
              color: '#1e293b', margin: '0 auto', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
              borderRadius: '8px', padding: '60px 80px', display: 'flex', flexDirection: 'column', position: 'relative'
            }}>
              
              {/* Dashed Header zone */}
              <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '6px', marginBottom: '30px', fontSize: '12px', color: '#94a3b8' }}>
                <input 
                  type="text" 
                  value={headerText} 
                  onChange={e => setHeaderText(e.target.value)} 
                  placeholder="Header (Double click to edit)..." 
                  style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '12px', color: '#64748b', outline: 'none', fontWeight: 600 }}
                />
              </div>

              {/* Main Content editable Area */}
              <div 
                ref={wordRef}
                contentEditable 
                suppressContentEditableWarning
                style={{
                  flex: 1,
                  outline: 'none',
                  fontSize: activeSize,
                  fontFamily: activeFont,
                  lineHeight: 1.6,
                  color: '#1e293b',
                  minHeight: '800px'
                }}
                onInput={e => setWordContent(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: wordContent }}
              />

              {/* Dashed Footer zone */}
              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '30px', fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={footerText} 
                  onChange={e => setFooterText(e.target.value)} 
                  placeholder="Footer (Double click to edit)..." 
                  style={{ border: 'none', background: 'transparent', width: '70%', fontSize: '12px', color: '#64748b', outline: 'none', fontWeight: 600 }}
                />
                <span style={{ fontWeight: 600 }}>Page 1</span>
              </div>
            </div>
          )}

          {/* EXCEL SHEET */}
          {activeTab === 'excel' && (
            <div className="table-responsive" style={{ flex: 1, background: 'rgba(15,23,42,0.4)', border: '1.5px solid var(--border-color)', borderRadius: '12px', padding: '16px', overflow: 'auto', backdropFilter: 'blur(10px)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                <thead>
                  <tr>
                    <th style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', padding: '8px', width: '50px', textAlign: 'center', fontWeight: 700 }}>Row</th>
                    {Array.from({ length: 10 }).map((_, cIndex) => {
                      const letter = String.fromCharCode(65 + cIndex);
                      return (
                        <th key={letter} style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', padding: '8px', textAlign: columnAlignments[cIndex] as any, fontWeight: 700 }}>
                          Column {letter}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {excelGrid.map((row, rIndex) => (
                    <tr key={rIndex}>
                      <td style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', padding: '6px', textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                        {rIndex + 1}
                      </td>
                      {row.map((cellValue, cIndex) => {
                        const evaluated = cellValue.startsWith('=') ? evaluateCell(cellValue) : cellValue;
                        const isMatch = excelSearchQuery && evaluated.toLowerCase().includes(excelSearchQuery.toLowerCase());
                        const isSelected = selectedCell?.row === rIndex && selectedCell?.col === cIndex;
                        return (
                          <td 
                            key={cIndex}
                            style={{ 
                              border: '1.5px solid var(--border-color)', 
                              padding: '0',
                              background: isSelected ? 'rgba(99, 102, 241, 0.25)' : (isMatch ? 'rgba(234, 179, 8, 0.35)' : 'transparent'),
                            }}
                          >
                            <input 
                              type="text"
                              value={isSelected ? cellValue : evaluated}
                              onChange={e => {
                                const newGrid = [...excelGrid];
                                newGrid[rIndex][cIndex] = e.target.value;
                                setExcelGrid(newGrid);
                                setFormulaInput(e.target.value);
                              }}
                              onFocus={() => {
                                setSelectedCell({ row: rIndex, col: cIndex });
                                setFormulaInput(cellValue);
                              }}
                              style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                padding: '8px 12px',
                                color: 'var(--text-primary)',
                                textAlign: columnAlignments[cIndex] as any,
                                fontSize: '13px'
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* NOTEPAD */}
          {activeTab === 'note' && (
            <div style={{ flex: 1, display: 'flex' }}>
              <textarea 
                className="form-control"
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '20px',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  outline: 'none',
                  resize: 'none',
                  minHeight: '600px'
                }}
                placeholder="Start writing notepad notes..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer system metrics */}
      <div className="d-flex align-items-center gap-4 flex-wrap" style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Laptop size={13} style={{ color: 'var(--brand-primary)' }} />
          <span>Local execution sandbox: <strong>Active</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={13} style={{ color: '#fbbf24' }} />
          <span>Cloud Storage Target: <strong>ZFS Dataset (tank)</strong></span>
        </div>
      </div>

      {/* History Slide-over Drawer */}
      {showHistoryDrawer && (
        <>
          {/* Backdrop overlay listener */}
          <div 
            onClick={() => setShowHistoryDrawer(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              zIndex: 1050,
              backdropFilter: 'blur(3px)'
            }}
          />

          <div 
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: '340px',
              background: 'var(--bg-card)',
              borderLeft: '1.5px solid var(--border-color)',
              boxShadow: '-6px 0 25px rgba(0,0,0,0.5)',
              zIndex: 1100,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              color: 'var(--text-primary)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)', fontSize: '16px', fontWeight: 700 }}>📜 Workspace History</h4>
              <button 
                className="btn btn-ghost btn-sm text-white border-0 d-flex align-items-center justify-content-center" 
                onClick={() => setShowHistoryDrawer(false)} 
                style={{ fontSize: '16px', padding: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {workspaceFiles.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', fontSize: '13px', padding: '20px 0' }}>No documents synced yet.</p>
              ) : (
                workspaceFiles.map((file) => (
                  <div 
                    key={file.id} 
                    onContextMenu={(e) => handleContextMenu(e, file.id)}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>{file.extension?.toUpperCase()} File</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <strong 
                      className="cursor-pointer hover-text-link"
                      style={{ fontSize: '13px', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
                      onClick={() => openHistoryDocument(file)}
                    >
                      {file.originalName}
                    </strong>
                    
                    <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ fontSize: '11px', padding: '2px 6px', height: 'auto', fontWeight: 600 }}
                        onClick={() => openHistoryDocument(file)}
                      >
                        Open
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ fontSize: '11px', padding: '2px 6px', height: 'auto', fontWeight: 600 }}
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = file.storageUrl;
                          link.download = file.originalName;
                          link.click();
                        }}
                      >
                        Download
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm text-danger" 
                        style={{ fontSize: '11px', padding: '2px 6px', height: 'auto', fontWeight: 600 }}
                        onClick={() => deleteHistoryDocument(file.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* New Doc Options Dialog */}
      {showNewDocDialog && (
        <div className="modal-backdrop" onClick={() => setShowNewDocDialog(false)} style={{ display: 'flex', zIndex: 1060 }}>
          <div className="modal animate-scale-in" style={{ maxWidth: '400px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h5 className="modal-title">Create Workspace Document</h5>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowNewDocDialog(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select the type of professional canvas workspace you want to load:</p>
              
              <button className="btn btn-outline-light text-start p-3 d-flex align-items-center gap-3" onClick={() => triggerNewDocCreation('word')}>
                <Type className="text-primary" size={24} />
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#fff' }}>Word Document (WordPad)</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Rich-text layouts with formatting, header & footers</span>
                </div>
              </button>
              
              <button className="btn btn-outline-light text-start p-3 d-flex align-items-center gap-3" onClick={() => triggerNewDocCreation('excel')}>
                <Table className="text-success" size={24} />
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#fff' }}>Excel Spreadsheet (Grid)</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Calculations, column alignment and formula rows</span>
                </div>
              </button>
              
              <button className="btn btn-outline-light text-start p-3 d-flex align-items-center gap-3" onClick={() => triggerNewDocCreation('note')}>
                <NoteIcon className="text-warning" size={24} />
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', color: '#fff' }}>Plain Note (Notepad)</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Plain text editor optimized for logs and scratch code</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled configurations */}
      <style>{`
        .dropdown-export-menu {
          display: none !important;
        }
        .dropdown-export:hover .dropdown-export-menu {
          display: flex !important;
        }
        .hover-export-item:hover {
          background: rgba(255,255,255,0.12) !important;
          color: #facc15 !important;
        }
        .hover-text-link:hover {
          color: var(--brand-primary) !important;
          text-decoration: underline;
        }
      `}</style>

    </div>
  );
}
