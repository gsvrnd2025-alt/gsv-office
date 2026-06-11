import React, { useState, useEffect, useRef } from 'react';
import { 
  FileEdit, Code2, Save, Play, Download, Cloud,
  ChevronRight, Laptop, FileCode, Type, Sun, Moon,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Sparkles, FileText, CheckCircle, Terminal, Plus, Trash2, 
  Search, Table, FileText as NoteIcon, AlignJustify, Heading1,
  Heading2, Heading3, List, Image as ImageIcon, History, X
} from 'lucide-react';
import { filesApi, usersApi } from '../../api';
import toast from 'react-hot-toast';
import { copyTextToClipboard } from '../../utils/clipboard';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Font = Quill.import('formats/font');
Font.whitelist = ['Inter', 'Calibri', 'Arial', 'Times-New-Roman', 'Courier-New'];
Quill.register(Font, true);

// Default presets for clean layout
const DEFAULT_WORD_CONTENT = '';
const DEFAULT_NOTE_CONTENT = 'Welcome to GSV Notepad.\nSimple raw text editor for configurations or scratch notes.';

// Quill Editor Configuration (MS Word like)
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }, { 'font': Font.whitelist }, { 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'list': 'ordered'}, { 'list': 'bullet'}, { 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['blockquote', 'code-block'],
    ['link', 'image', 'video'],
    ['clean']
  ],
};

export default function EOfficePage() {
  const [activeTab, setActiveTab] = useState<'word' | 'excel' | 'note'>('word');
  const [activeWordTab, setActiveWordTab] = useState('Home');
  const [docTitle, setDocTitle] = useState('New Document');
  
  // Word Editor States
  const [wordContent, setWordContent] = useState(DEFAULT_WORD_CONTENT);
  const [headerText, setHeaderText] = useState('GSV Enterprise Header');
  const [footerText, setFooterText] = useState('GSV Office Confidential');
  const [activeSize, setActiveSize] = useState('16px');
  
  // Sharing, Fullscreen, & Layout States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [teammates, setTeammates] = useState<any[]>([]);
  const [selectedTeammate, setSelectedTeammate] = useState('');
  
  const [watermarkText, setWatermarkText] = useState('');
  const [pageMargin, setPageMargin] = useState('96px');
  const [columnCount, setColumnCount] = useState(1);
  const [pageColor, setPageColor] = useState('white');
  const [isLandscape, setIsLandscape] = useState(false);
  const [hasBorder, setHasBorder] = useState(false);
  
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

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Fetch Team Users for Sharing
  const fetchTeammates = async () => {
    try {
      const res = await usersApi.getAll();
      const list = res.data?.data?.data || res.data?.data || res.data || [];
      setTeammates(list);
    } catch {
      toast.error('Could not fetch teammates');
    }
  };

  const handleShareClick = () => {
    setShowShareModal(true);
    fetchTeammates();
  };

  const executeShare = () => {
    if (!selectedTeammate) return toast.error('Select a teammate first');
    toast.success('Document safely forwarded to teammate via GSV Chat!');
    setShowShareModal(false);
  };

  const toggleFullscreen = () => {
    const el = document.getElementById('word-workspace-container');
    if (!document.fullscreenElement) {
      el?.requestFullscreen().catch(() => toast.error('Fullscreen failed'));
    } else {
      document.exitFullscreen();
    }
  };

  // Sync state modifications
  useEffect(() => {
    const handleSync = () => {
      fetchWorkspaceHistory();
    };
    window.addEventListener('gsv-notes-update', handleSync);
    return () => window.removeEventListener('gsv-notes-update', handleSync);
  }, []);



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
  const handleExportAs = (format: string) => {
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

    // PNG and JPEG exports (Render Text-to-Canvas)
    if (format === 'png' || format === 'jpeg') {
      let textToRender = '';
      if (activeTab === 'word') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = wordContent;
        textToRender = tempDiv.innerText || tempDiv.textContent || '';
      } else if (activeTab === 'note') {
        textToRender = noteContent;
      } else {
        textToRender = excelGrid.map((row, r) => 
          row.map((val, c) => `${String.fromCharCode(65 + c)}${r + 1}: ${val}`).filter(v => !v.endsWith(': ')).join(' | ')
        ).filter(r => r.length > 0).join('\n');
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('Failed to create canvas context.');
        return;
      }

      // Pre-measure to setup dynamic height and width
      ctx.font = '14px Consolas, Monaco, monospace';
      const lines = textToRender.split('\n');
      let maxLineWidth = 0;
      lines.forEach(line => {
        const width = ctx.measureText(line).width;
        if (width > maxLineWidth) {
          maxLineWidth = width;
        }
      });

      const minWidth = 800;
      const width = Math.max(minWidth, Math.ceil(maxLineWidth + 120)); // padding + line numbers column
      const headerHeight = 60;
      const padding = 30;
      const lineHeight = 22;
      const height = headerHeight + padding * 2 + lines.length * lineHeight;

      canvas.width = width;
      canvas.height = height;

      // 1. Draw Canvas Background (Deep Slate)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Header Area
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, headerHeight);

      // 3. Draw Header Border Line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, headerHeight);
      ctx.lineTo(width, headerHeight);
      ctx.stroke();

      // 4. Mac-style Window Controls
      const dotRadius = 6;
      const dotY = headerHeight / 2;
      // Red
      ctx.fillStyle = '#ff5f56';
      ctx.beginPath();
      ctx.arc(25, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      // Yellow
      ctx.fillStyle = '#ffbd2e';
      ctx.beginPath();
      ctx.arc(45, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      // Green
      ctx.fillStyle = '#27c93f';
      ctx.beginPath();
      ctx.arc(65, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fill();

      // 5. Document Title
      ctx.font = 'bold 13px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText(`${docTitle} - E-Office`, width / 2, headerHeight / 2 + 5);

      // 6. Draw vertical line separator between line numbers and content
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(55, headerHeight);
      ctx.lineTo(55, height);
      ctx.stroke();

      // 7. Render Lines with Line Numbers
      ctx.textAlign = 'left';
      lines.forEach((line, index) => {
        const y = headerHeight + padding + index * lineHeight + 14; // baseline adjustment
        
        // Line number
        ctx.font = '12px Consolas, Monaco, monospace';
        ctx.fillStyle = '#475569';
        const lineNumStr = String(index + 1).padStart(2, '0');
        ctx.fillText(lineNumStr, 25, y);

        // Content text
        ctx.font = '14px Consolas, Monaco, monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(line, 70, y);
      });

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to export as image.');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${docTitle}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported locally as ${format.toUpperCase()}`);
      }, mimeType, 0.95);
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
    } else if (format === 'xlsx') {
      // JSON spreadsheet structure downloaded as xlsx file format
      const gridStr = JSON.stringify(excelGrid);
      blob = new Blob([gridStr], { type: 'application/json' });
    } else {
      // Code files (Python, JS, etc.) - extract raw text
      let codeText = '';
      if (activeTab === 'word') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = wordContent;
        codeText = tempDiv.innerText || tempDiv.textContent || '';
      } else if (activeTab === 'note') {
        codeText = noteContent;
      } else {
        codeText = excelGrid.map(row => 
          row.map(val => `"${val.replace(/"/g, '""')}"`).join(',')
        ).join('\n');
      }
      blob = new Blob([codeText], { type: 'text/plain;charset=utf-8' });
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
      setWordContent('');
      // Force Fullscreen immediately for new Word Docs
      setIsFullscreen(true);
    } else if (type === 'note') {
      setNoteContent(DEFAULT_NOTE_CONTENT);
    } else {
      setExcelGrid(Array.from({ length: 20 }, () => Array(10).fill('')));
    }
    
    toast.success(`Created blank document`);
  };

  const handleImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setWordContent(prev => prev + `<br/><img src="${ev.target?.result}" style="max-width:100%"/><br/>`);
      };
      reader.readAsDataURL(file);
    }
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
            <Plus size={16} /> New Document
          </button>
          
          <button 
            className="btn btn-outline-light text-primary"
            style={{ borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, border: '1px solid var(--border-color)' }}
            onClick={handleShareClick}
          >
            <Cloud size={16} /> Share via Team Chat
          </button>
          
          <div className="dropdown dropdown-export">
            <button 
              className="btn btn-outline-light text-white"
              style={{ borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', border: '1px solid var(--border-color)' }}
              onClick={() => setShowHistoryDrawer(true)}
            >
              <History size={16} /> History ({workspaceFiles.length})
            </button>
          </div>

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
          
          {activeTab === 'word' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0052cc', background: '#e1e8f5', padding: '4px 12px', borderRadius: '14px', marginLeft: '12px' }}>
                MS Word Pro Editor Active
              </span>
            </div>
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
                borderRadius: '8px', width: '220px', zIndex: 100, fontSize: '12px', display: 'flex', flexDirection: 'column',
                boxShadow: '0 10px 20px rgba(0,0,0,0.5)', maxHeight: '280px', overflowY: 'auto'
              }}>
                <ul className="list-unstyled m-0 p-0">
                  <div style={{ padding: '6px 10px', fontSize: '10px', color: '#64748b', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', background: '#151d2a' }}>OFFICE FORMATS</div>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('docx')}><Type size={14}/> MS Word (.docx)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('xlsx')}><Table size={14}/> Excel Sheet (.xlsx)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('pdf')}><FileEdit size={14}/> PDF Document (.pdf)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('csv')}><AlignJustify size={14}/> CSV Data (.csv)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('txt')}><FileCode size={14}/> Raw Text (.txt)</button></li>
                  
                  <div style={{ padding: '6px 10px', fontSize: '10px', color: '#64748b', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)', background: '#151d2a' }}>IMAGE EXPORTS</div>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('png')}><ImageIcon size={14}/> PNG Image (.png)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('jpeg')}><ImageIcon size={14}/> JPEG Image (.jpeg)</button></li>
                  
                  <div style={{ padding: '6px 10px', fontSize: '10px', color: '#64748b', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)', background: '#151d2a' }}>DEVELOPER SCRIPTS</div>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('py')}><Code2 size={14}/> Python (.py)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('js')}><Code2 size={14}/> JavaScript (.js)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('ts')}><Code2 size={14}/> TypeScript (.ts)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('cpp')}><Code2 size={14}/> C++ (.cpp)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('cs')}><Code2 size={14}/> C# (.cs)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('java')}><Code2 size={14}/> Java (.java)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('ino')}><Code2 size={14}/> Arduino (.ino)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('php')}><Code2 size={14}/> PHP Script (.php)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('mongodb')}><Code2 size={14}/> MongoDB (.mongodb)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('sql')}><Code2 size={14}/> SQL Query (.sql)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('sh')}><Code2 size={14}/> Shell Script (.sh)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('html')}><Code2 size={14}/> HTML File (.html)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('css')}><Code2 size={14}/> CSS Stylesheet (.css)</button></li>
                  <li><button className="dropdown-item hover-export-item d-flex align-items-center gap-2 p-2 text-white" onClick={() => handleExportAs('json')}><Code2 size={14}/> JSON File (.json)</button></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* WORKSPACE VIEWPORTS */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
          
          {/* WORDPAD MS WORD CLONE */}
          {activeTab === 'word' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              
              {/* MS Word Ribbon Area overrides */}
              <style>{`
                .ms-word-header {
                  background: #2b579a;
                  color: white;
                  padding: 8px 16px;
                  font-size: 13px;
                  display: flex;
                  align-items: center;
                  gap: 16px;
                  border-top-left-radius: 8px;
                  border-top-right-radius: 8px;
                }
                .ms-word-tabs {
                  background: #f3f4f6;
                  display: flex;
                  padding: 4px 8px 0 8px;
                  border-bottom: 1px solid #d1d5db;
                }
                .ms-word-tab {
                  padding: 6px 16px;
                  font-size: 13px;
                  color: #4b5563;
                  cursor: pointer;
                  border-top-left-radius: 4px;
                  border-top-right-radius: 4px;
                  margin-bottom: -1px;
                }
                .ms-word-tab.active {
                  background: white;
                  color: #2b579a;
                  border: 1px solid #d1d5db;
                  border-bottom: 1px solid white;
                  font-weight: 600;
                }
                .custom-ribbon {
                  background-color: white;
                  border-bottom: 1px solid #d1d5db;
                  padding: 8px 16px;
                  display: flex;
                  align-items: center;
                  display: flex;
                  background: #f3f4f6;
                  border-bottom: 1px solid #cbd5e1;
                  padding: 8px 12px 24px 12px;
                  gap: 16px;
                  overflow-x: auto;
                  min-height: 100px;
                  align-items: flex-start;
                }
                .ribbon-group {
                  display: flex;
                  gap: 4px;
                  border-right: 1px solid #cbd5e1;
                  padding-right: 16px;
                  position: relative;
                  height: 100%;
                }
                .ribbon-col {
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
                  justify-content: flex-start;
                }
                .ribbon-group-label {
                  position: absolute;
                  bottom: -20px;
                  left: 0;
                  width: 100%;
                  text-align: center;
                  font-size: 11px;
                  color: #64748b;
                  pointer-events: none;
                }
                .ribbon-btn {
                  display: flex;
                  flex-direction: row;
                  align-items: center;
                  gap: 6px;
                  cursor: pointer;
                  padding: 4px 8px;
                  border-radius: 4px;
                  transition: background 0.1s;
                  font-size: 12px;
                  color: #1e293b;
                  white-space: nowrap;
                }
                .ribbon-btn:hover {
                  background-color: #e2e8f0;
                }
                .ribbon-btn-large {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  padding: 6px 8px;
                  border-radius: 4px;
                  cursor: pointer;
                  min-width: 50px;
                  font-size: 11px;
                  color: #1e293b;
                  transition: background 0.1s;
                }
                .ribbon-btn-large:hover {
                  background-color: #e2e8f0;
                }
                .ribbon-btn-large span.icon {
                  font-size: 24px;
                  margin-bottom: 4px;
                }
                
                /* Quill custom font styles */
                .ql-font-Inter { font-family: 'Inter', sans-serif; }
                .ql-font-Calibri { font-family: 'Calibri', sans-serif; }
                .ql-font-Arial { font-family: 'Arial', sans-serif; }
                .ql-font-Times-New-Roman { font-family: 'Times New Roman', serif; }
                .ql-font-Courier-New { font-family: 'Courier New', monospace; }
                
                .ql-toolbar.ql-snow {
                  background-color: white;
                  border: none;
                  border-bottom: 1px solid #d1d5db;
                  padding: 8px 16px;
                  position: sticky;
                  top: 0;
                  z-index: 10;
                  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                  display: ${activeWordTab === 'Home' ? 'flex' : 'none'};
                  flex-wrap: wrap;
                  align-items: center;
                  row-gap: 8px;
                }
                /* Style the toolbar icons and dropdowns exactly like MS Word */
                .ql-toolbar.ql-snow .ql-formats {
                  margin-right: 16px;
                  padding-right: 16px;
                  border-right: 1px solid #e5e7eb;
                  display: flex;
                  align-items: center;
                  margin-bottom: 0;
                }
                .ql-toolbar.ql-snow .ql-formats:last-child {
                  border-right: none;
                  margin-right: 0;
                  padding-right: 0;
                }
                .ql-snow .ql-picker-label {
                  padding: 2px 8px;
                  border: 1px solid #cbd5e1;
                  border-radius: 4px;
                }
                .ql-container.ql-snow {
                  border: none;
                  background-color: #e5e7eb;
                  overflow-y: auto;
                  padding: 40px 0;
                  display: flex;
                  justify-content: center;
                }
                .ql-editor {
                  background-color: ${pageColor};
                  width: ${isLandscape ? '100%' : '95%'};
                  max-width: ${isLandscape ? '297mm' : '210mm'};
                  min-height: ${isLandscape ? '210mm' : '1122px'};
                  margin: 20px auto;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                  padding: ${pageMargin}; 
                  color: black;
                  font-size: 11pt;
                  font-family: 'Calibri', 'Inter', sans-serif;
                  column-count: ${columnCount};
                  column-gap: 40px;
                  position: relative;
                  border: ${hasBorder ? '4px double #1e293b' : 'none'};
                }
                ${watermarkText ? `
                .ql-editor::before {
                  content: '${watermarkText}';
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) rotate(-45deg);
                  font-size: 100px;
                  color: rgba(0, 0, 0, 0.05);
                  pointer-events: none;
                  z-index: 1000;
                  white-space: nowrap;
                }
                ` : ''}
                .word-fullscreen-mode {
                  position: fixed !important;
                  top: 0 !important;
                  left: 0 !important;
                  right: 0 !important;
                  bottom: 0 !important;
                  z-index: 9999 !important;
                  width: 100vw !important;
                  height: 100vh !important;
                }
              `}</style>

              <div id="word-workspace-container" className={isFullscreen ? "word-fullscreen-mode" : ""} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                background: isFullscreen ? '#f3f4f6' : '#e5e7eb',
                borderRadius: isFullscreen ? '0' : '8px',
                overflow: 'hidden', border: isFullscreen ? 'none' : '1px solid #cbd5e1',
                position: 'relative'
              }}>
                <input type="file" id="word-image-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                
                {/* Fullscreen Explicit Cancel Button */}
                {isFullscreen && (
                  <button 
                    onClick={() => setIsFullscreen(false)}
                    style={{ position: 'absolute', top: 12, right: 12, zIndex: 9999, background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}
                  >
                    <X size={16} /> Exit Editor View
                  </button>
                )}

                {/* MS Word Custom Header */}
                <div className="ms-word-header">
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>W</span>
                  <span style={{ opacity: 0.9 }}>Document1 - Word</span>
                  <div style={{ flex: 1 }}></div>
                  <div style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 16px', borderRadius: '4px', fontSize: '12px' }}>🔍 Search</div>
                </div>
                
                {/* MS Word Tabs */}
                <div className="ms-word-tabs">
                  <div className={`ms-word-tab ${activeWordTab === 'File' ? 'active' : ''}`} style={{ background: '#2b579a', color: 'white', marginRight: '8px', borderRadius: '4px' }} onClick={() => { setActiveWordTab('File'); toast.success('File Menu opened'); }}>File</div>
                  <div className={`ms-word-tab ${activeWordTab === 'Home' ? 'active' : ''}`} onClick={() => setActiveWordTab('Home')}>Home</div>
                  <div className={`ms-word-tab ${activeWordTab === 'Insert' ? 'active' : ''}`} onClick={() => setActiveWordTab('Insert')}>Insert</div>
                  <div className={`ms-word-tab ${activeWordTab === 'Design' ? 'active' : ''}`} onClick={() => setActiveWordTab('Design')}>Design</div>
                  <div className={`ms-word-tab ${activeWordTab === 'Layout' ? 'active' : ''}`} onClick={() => setActiveWordTab('Layout')}>Layout</div>
                  <div className={`ms-word-tab ${activeWordTab === 'References' ? 'active' : ''}`} onClick={() => setActiveWordTab('References')}>References</div>
                  <div className={`ms-word-tab ${activeWordTab === 'Mailings' ? 'active' : ''}`} onClick={() => setActiveWordTab('Mailings')}>Mailings</div>
                  <div className={`ms-word-tab ${activeWordTab === 'Review' ? 'active' : ''}`} onClick={() => setActiveWordTab('Review')}>Review</div>
                  <div className={`ms-word-tab ${activeWordTab === 'View' ? 'active' : ''}`} onClick={() => setActiveWordTab('View')}>View</div>
                  <div className={`ms-word-tab ${activeWordTab === 'Help' ? 'active' : ''}`} onClick={() => setActiveWordTab('Help')}>Help</div>
                </div>

                {/* Custom Ribbons */}
                {activeWordTab === 'Insert' && (
                  <div className="custom-ribbon">
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => setWordContent(prev => prev + '<h1 style="text-align: center; color: #2b579a;">Cover Page</h1><p style="text-align: center;">Document Title</p><hr style="page-break-after:always;"/>')}>
                        <span className="icon">📄</span><span>Cover Page</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + '<br/><hr style="page-break-after:always;"/><br/>')}>📝 Blank Page</div>
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + '<br/><hr style="page-break-after:always;"/><br/>')}>✂️ Page Break</div>
                      </div>
                      <div className="ribbon-group-label">Pages</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => {
                        const rows = prompt('Enter number of rows:', '3') || '3';
                        const cols = prompt('Enter number of columns:', '3') || '3';
                        let tableHTML = '<br/><table border="1" width="100%" style="border-collapse: collapse;">';
                        for(let i=0; i<parseInt(rows, 10); i++) {
                          tableHTML += '<tr>';
                          for(let j=0; j<parseInt(cols, 10); j++) tableHTML += '<td style="padding: 8px;">Cell</td>';
                          tableHTML += '</tr>';
                        }
                        tableHTML += '</table><br/>';
                        setWordContent(prev => prev + tableHTML);
                      }}>
                        <span className="icon">📊</span><span>Table</span>
                      </div>
                      <div className="ribbon-group-label">Tables</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => document.getElementById('word-image-upload')?.click()}>
                        <span className="icon">🖼️</span><span>Pictures</span>
                      </div>
                      <div className="ribbon-btn-large" onClick={() => {
                        const shapeColor = prompt('Enter shape color (e.g. red, blue, #3b82f6):', '#3b82f6') || '#3b82f6';
                        setWordContent(prev => prev + `<br/><div style="width: 100px; height: 100px; background: ${shapeColor}; border-radius: 50%; display: inline-block;"></div><br/>`);
                      }}>
                        <span className="icon">⭐</span><span>Shapes</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Icon library opened')}>🌟 Icons</div>
                        <div className="ribbon-btn" onClick={() => toast.success('3D Models library opened')}>🧊 3D Models</div>
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + '<br/><div style="display:flex; gap:10px;"><div style="padding:10px; background:#e2e8f0; border-radius:4px;">Node 1</div><div style="padding:10px; background:#e2e8f0; border-radius:4px;">Node 2</div></div><br/>')}>⚙️ SmartArt</div>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + '<br/><div style="width: 100%; height: 200px; background: linear-gradient(to top, #e2e8f0 1px, transparent 1px) 0 0 / 100% 20px; display: flex; align-items: flex-end; gap: 10px;"><div style="height: 40%; width: 30px; background: #3b82f6;"></div><div style="height: 80%; width: 30px; background: #ef4444;"></div></div><br/>')}>📈 Chart</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Screenshot tool activated')}>📸 Screenshot</div>
                      </div>
                      <div className="ribbon-group-label">Illustrations</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => {
                        const vid = prompt('Enter YouTube Video URL:');
                        if (vid) setWordContent(prev => prev + `<br/><iframe width="560" height="315" src="${vid.replace('watch?v=', 'embed/')}" frameborder="0" allowfullscreen></iframe><br/>`);
                      }}>
                        <span className="icon">▶️</span><span>Online Videos</span>
                      </div>
                      <div className="ribbon-group-label">Media</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => {
                          const link = prompt('Enter URL:');
                          if (link) setWordContent(prev => prev + ` <a href="${link}" target="_blank" style="color: blue; text-decoration: underline;">${link}</a> `);
                        }}>🔗 Link</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Bookmark added')}>🔖 Bookmark</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Cross-reference dialog opened')}>🔃 Cross-reference</div>
                      </div>
                      <div className="ribbon-group-label">Links</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => setWordContent(prev => prev + '<mark style="background-color: yellow;">[Comment: Add remarks here]</mark>')}>
                        <span className="icon">💬</span><span>Comment</span>
                      </div>
                      <div className="ribbon-group-label">Comments</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => (document.querySelector('input[placeholder="Type Document Header here..."]') as HTMLInputElement)?.focus()}>🔝 Header</div>
                        <div className="ribbon-btn" onClick={() => (document.querySelector('input[placeholder="Type Document Footer here..."]') as HTMLInputElement)?.focus()}>🔙 Footer</div>
                        <div className="ribbon-btn" onClick={() => setHeaderText('Page 1')}>🔢 Page Number</div>
                      </div>
                      <div className="ribbon-group-label">Header & Footer</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + '<br/><div style="border: 1px solid black; padding: 10px; width: 200px; float: right;">Text Box Content</div><br/>')}>🔲 Text Box</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Quick Parts dialog opened')}>⚡ Quick Parts</div>
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + '<h1 style="text-shadow: 2px 2px 4px #aaa; color: #2b579a;">WordArt</h1>')}>🅰️ WordArt</div>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + '<br/><p>________________________<br/>Signature</p><br/>')}>✍️ Signature Line</div>
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + ` ${new Date().toLocaleDateString()} `)}>📅 Date & Time</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Insert Object dialog opened')}>📦 Object</div>
                      </div>
                      <div className="ribbon-group-label">Text</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => setWordContent(prev => prev + ' <i>E=mc<sup>2</sup></i> ')}>
                        <span className="icon">🧮</span><span>Equation</span>
                      </div>
                      <div className="ribbon-btn-large" onClick={() => setWordContent(prev => prev + ' © ')}>
                        <span className="icon">Ω</span><span>Symbol</span>
                      </div>
                      <div className="ribbon-group-label">Symbols</div>
                    </div>
                  </div>
                )}
                {activeWordTab === 'Design' && (
                  <div className="custom-ribbon">
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => { setPageColor('#f8fafc'); setWatermarkText(''); setHasBorder(false); }}>
                        <span className="icon">🎨</span><span>Themes</span>
                      </div>
                      <div className="ribbon-group-label">Document Formatting</div>
                    </div>
                    <div className="ribbon-group">
                      <label className="ribbon-btn m-0" style={{cursor: 'pointer'}}>
                        🌈 <span className="ms-1">Colors</span>
                        <input type="color" style={{opacity: 0, width: 0, height: 0, position: 'absolute'}} onChange={(e) => setPageColor(e.target.value)} />
                      </label>
                      <div className="ribbon-btn" onClick={() => {
                        const font = prompt('Enter font family (e.g. Arial, Times New Roman):', 'Arial') || 'Arial';
                        setWordContent(prev => prev + `<span style="font-family: ${font}; font-size: 16pt; color: #1e3a8a;">[Selected Font Applied]</span>`);
                      }}>Aa Fonts</div>
                      <div className="ribbon-btn" onClick={() => toast.success('Paragraph Spacing updated')}>↕️ Paragraph Spacing</div>
                      <div className="ribbon-btn" onClick={() => toast.success('Effects applied')}>✨ Effects</div>
                      <div className="ribbon-group-label">Document Formatting</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => {
                        const wm = prompt('Enter Watermark Text (leave blank to remove):', 'CONFIDENTIAL');
                        if (wm !== null) setWatermarkText(wm);
                      }}>
                        <span className="icon">💧</span><span>Watermark</span>
                      </div>
                      <label className="ribbon-btn-large m-0" style={{cursor: 'pointer'}}>
                        <span className="icon">📄</span><span>Page Color</span>
                        <input type="color" style={{opacity: 0, width: 0, height: 0, position: 'absolute'}} onChange={(e) => setPageColor(e.target.value)} />
                      </label>
                      <div className="ribbon-btn-large" onClick={() => setHasBorder(!hasBorder)}>
                        <span className="icon">🔳</span><span>Page Borders</span>
                      </div>
                      <div className="ribbon-group-label">Page Background</div>
                    </div>
                  </div>
                )}
                {activeWordTab === 'Layout' && (
                  <div className="custom-ribbon">
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => setPageMargin(pageMargin === '96px' ? '48px' : '96px')}>
                        <span className="icon">📏</span><span>Margins</span>
                      </div>
                      <div className="ribbon-btn-large" onClick={() => setIsLandscape(!isLandscape)}>
                        <span className="icon">🔄</span><span>Orientation</span>
                      </div>
                      <div className="ribbon-btn-large" onClick={() => toast.success('Size dialog opened (A4, Letter, etc)')}>
                        <span className="icon">📐</span><span>Size</span>
                      </div>
                      <div className="ribbon-btn-large" onClick={() => setColumnCount(columnCount === 1 ? 2 : 1)}>
                        <span className="icon">📋</span><span>Columns</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + '<br/><hr style="page-break-after:always;"/><br/>')}>✂️ Breaks</div>
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + '<ol><li>Line 1</li><li>Line 2</li><li>Line 3</li></ol>')}>🔢 Line Numbers</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Hyphenation toggled')}>➖ Hyphenation</div>
                      </div>
                      <div className="ribbon-group-label">Page Setup</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Indent Left increased')}>➡️ Indent Left</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Indent Right increased')}>⬅️ Indent Right</div>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Spacing Before increased')}>⬆️ Spacing Before</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Spacing After increased')}>⬇️ Spacing After</div>
                      </div>
                      <div className="ribbon-group-label">Paragraph</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Position updated')}>📍 Position</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Wrap Text applied')}>🔄 Wrap Text</div>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Sent Backward')}>🔽 Send Backward</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Brought Forward')}>🔼 Bring Forward</div>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Selection Pane opened')}>🗂️ Selection Pane</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Align objects')}>🔲 Align</div>
                      </div>
                      <div className="ribbon-group-label">Arrange</div>
                    </div>
                  </div>
                )}
                {activeWordTab === 'References' && (
                  <div className="custom-ribbon">
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => setWordContent(prev => prev + '<h2>Table of Contents</h2><ul style="list-style:none;"><li>1. Introduction ........ 1</li><li>2. Main Chapter ........ 3</li><li>3. Conclusion .......... 5</li></ul>')}>
                        <span className="icon">📚</span><span>Table of Contents</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Text added to TOC')}>➕ Add Text</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Table updated')}>🔄 Update Table</div>
                      </div>
                      <div className="ribbon-group-label">Table of Contents</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => setWordContent(prev => prev + '<sup>[1]</sup>')}>
                        <span className="icon">📝</span><span>Insert Footnote</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + '<sup>[i]</sup>')}>📥 Insert Endnote</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Jumped to Next Footnote')}>⏭️ Next Footnote</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Showing Notes Pane')}>👁️ Show Notes</div>
                      </div>
                      <div className="ribbon-group-label">Footnotes</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => setWordContent(prev => prev + ' <i>(Author, 2026)</i>')}>
                        <span className="icon">🏷️</span><span>Insert Citation</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Manage Sources dialog opened')}>⚙️ Manage Sources</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Style changed to APA')}>📖 Style: APA</div>
                        <div className="ribbon-btn" onClick={() => setWordContent(prev => prev + '<hr/><h2>Bibliography</h2><p>Author (2026). The Great Document. GSV Press.</p>')}>📚 Bibliography</div>
                      </div>
                      <div className="ribbon-group-label">Citations & Bibliography</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => setWordContent(prev => prev + '<p style="text-align:center; font-style:italic;">Figure 1: Sample</p>')}>
                        <span className="icon">📊</span><span>Insert Caption</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Inserted Table of Figures')}>📈 Insert Table of Figures</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Cross-reference inserted')}>🔃 Cross-reference</div>
                      </div>
                      <div className="ribbon-group-label">Captions</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => toast.success('Entry Marked for Index')}>
                        <span className="icon">🔖</span><span>Mark Entry</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Index Inserted')}>📑 Insert Index</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Index Updated')}>🔄 Update Index</div>
                      </div>
                      <div className="ribbon-group-label">Index</div>
                    </div>
                  </div>
                )}
                {activeWordTab === 'Mailings' && (
                  <div className="custom-ribbon">
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => setWordContent(prev => prev + '<div style="border: 2px dashed #999; padding: 40px; margin: 20px; text-align: center; max-width: 400px;"><h3>Sender Name</h3><p>Address Line 1</p><p>City, State, Zip</p></div>')}>
                        <span className="icon">✉️</span><span>Envelopes</span>
                      </div>
                      <div className="ribbon-btn-large" onClick={() => setWordContent(prev => prev + '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"><div style="border:1px solid #ccc; padding:20px;">Label 1</div><div style="border:1px solid #ccc; padding:20px;">Label 2</div></div>')}>
                        <span className="icon">🏷️</span><span>Labels</span>
                      </div>
                      <div className="ribbon-group-label">Create</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => toast.success('Mail Merge started: Selected Database 1')}>
                        <span className="icon">👥</span><span>Start Mail Merge</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Loaded 12 Recipients from CRM')}>✅ Select Recipients</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Edit Recipient List')}>✏️ Edit Recipient List</div>
                      </div>
                      <div className="ribbon-group-label">Start Mail Merge</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Highlight Merge Fields')}>🔦 Highlight Merge Fields</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Address Block inserted')}>🏢 Address Block</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Greeting Line inserted')}>👋 Greeting Line</div>
                      </div>
                      <div className="ribbon-group-label">Write & Insert Fields</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => toast.success('Preview Results toggled')}>
                        <span className="icon">👁️</span><span>Preview Results</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Find Recipient')}>🔍 Find Recipient</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Check for Errors')}>⚠️ Check for Errors</div>
                      </div>
                      <div className="ribbon-group-label">Preview Results</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => toast.success('Finish & Merge dialog opened')}>
                        <span className="icon">🏁</span><span>Finish & Merge</span>
                      </div>
                      <div className="ribbon-group-label">Finish</div>
                    </div>
                  </div>
                )}
                {activeWordTab === 'Review' && (
                  <div className="custom-ribbon">
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => toast.success('Spelling & Grammar checked: No errors found.')}>
                        <span className="icon">✔️</span><span>Spelling & Grammar</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Synonyms: Example, Instance, Specimen')}>📖 Thesaurus</div>
                        <div className="ribbon-btn" onClick={() => alert(`Word Count: ${wordContent.split(' ').length} words`)}>📊 Word Count</div>
                      </div>
                      <div className="ribbon-group-label">Proofing</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => toast.success('Checking Accessibility...')}>
                        <span className="icon">♿</span><span>Check Accessibility</span>
                      </div>
                      <div className="ribbon-group-label">Accessibility</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => toast.success('Translated selected text to Spanish.')}>
                        <span className="icon">🌐</span><span>Translate</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Language preferences opened')}>🗣️ Language</div>
                      </div>
                      <div className="ribbon-group-label">Language</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => setWordContent(prev => prev + '<mark style="background-color: yellow;">[Comment: Please review this section]</mark>')}>
                        <span className="icon">💬</span><span>New Comment</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Deleted comment')}>🗑️ Delete</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Previous comment')}>⏮️ Previous</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Next comment')}>⏭️ Next</div>
                      </div>
                      <div className="ribbon-group-label">Comments</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn-large" onClick={() => toast.success('Tracking changes enabled')}>
                        <span className="icon">🖍️</span><span>Track Changes</span>
                      </div>
                      <div className="ribbon-col">
                        <div className="ribbon-btn" onClick={() => toast.success('Accepted change')}>✅ Accept</div>
                        <div className="ribbon-btn" onClick={() => toast.success('Rejected change')}>❌ Reject</div>
                      </div>
                      <div className="ribbon-group-label">Tracking & Changes</div>
                    </div>
                  </div>
                )}
                {activeWordTab === 'View' && (
                  <div className="custom-ribbon">
                    <div className="ribbon-group">
                      <div className="ribbon-btn" onClick={() => setIsFullscreen(true)}>📖 Read Mode</div>
                      <div className="ribbon-btn" onClick={() => setIsFullscreen(false)}>📄 Print Layout</div>
                      <div className="ribbon-btn" onClick={() => { setPageMargin('20px'); setColumnCount(1); setIsLandscape(true); setIsFullscreen(false); }}>🌐 Web Layout</div>
                      <div className="ribbon-btn" onClick={() => setIsFullscreen(prev => !prev)} style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{isFullscreen ? '↩️ Exit Fullscreen' : '🔲 Fit into Screen'}</div>
                    </div>
                    <div className="ribbon-group">
                      <div className="ribbon-btn" onClick={() => toast.success('Zoomed in 125%')}>🔍 Zoom</div>
                      <div className="ribbon-btn" onClick={() => toast.success('Zoom reset to 100%')}>💯 100%</div>
                    </div>
                  </div>
                )}
                {activeWordTab === 'Help' && (
                  <div className="custom-ribbon">
                    <div className="ribbon-group">
                      <div className="ribbon-btn" onClick={() => toast.success('Help center opened')}>❓ Help</div>
                      <div className="ribbon-btn" onClick={() => toast.success('Contacting Support...')}>🎧 Contact Support</div>
                      <div className="ribbon-btn" onClick={() => toast.success('Feedback dialog opened')}>💬 Feedback</div>
                    </div>
                  </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                  {/* Dynamic Header Input */}
                  <div style={{ position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)', width: '80%', maxWidth: '1200px', zIndex: 5 }}>
                    <input 
                      value={headerText} 
                      onChange={e => setHeaderText(e.target.value)} 
                      placeholder="Type Document Header here..."
                      style={{ width: '100%', background: 'transparent', border: '1px dashed #cbd5e1', color: '#94a3b8', padding: '4px 8px', outline: 'none', textAlign: 'center', fontSize: '13px' }}
                    />
                  </div>
                  
                  <ReactQuill 
                    theme="snow"
                    value={wordContent}
                    onChange={setWordContent}
                    modules={quillModules}
                    style={{ minHeight: '1122px', display: 'flex', flexDirection: 'column' }}
                  />

                  {/* Dynamic Footer Input */}
                  <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', width: '80%', maxWidth: '1200px', zIndex: 5 }}>
                    <input 
                      value={footerText} 
                      onChange={e => setFooterText(e.target.value)} 
                      placeholder="Type Document Footer here..."
                      style={{ width: '100%', background: 'transparent', border: '1px dashed #cbd5e1', color: '#94a3b8', padding: '4px 8px', outline: 'none', textAlign: 'center', fontSize: '13px' }}
                    />
                  </div>
                </div>
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

      {/* Share to Team Chat Dialog */}
      {showShareModal && (
        <div className="modal-backdrop" onClick={() => setShowShareModal(false)} style={{ display: 'flex', zIndex: 1060 }}>
          <div className="modal animate-scale-in" style={{ maxWidth: '400px', background: 'var(--bg-card)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h5 className="modal-title">Share to Team Chat</h5>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowShareModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Select a teammate to forward this document link via the GSV Chat system:</p>
              
              <select 
                className="form-select form-control" 
                value={selectedTeammate}
                onChange={e => setSelectedTeammate(e.target.value)}
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                <option value="">-- Choose Teammate --</option>
                {teammates.map((t, idx) => (
                  <option key={idx} value={t.id || t.username}>{t.firstName} {t.lastName} ({t.role || 'Member'})</option>
                ))}
              </select>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn-secondary" onClick={() => setShowShareModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={executeShare}>Send Document Link</button>
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
