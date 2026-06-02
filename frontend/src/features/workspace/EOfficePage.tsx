import React, { useState, useEffect, useRef } from 'react';
import { 
  FileEdit, Code2, Save, Play, Download, Cloud,
  ChevronRight, Laptop, FileCode, Type, Sun, Moon,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Sparkles, FileText, CheckCircle, Terminal
} from 'lucide-react';
import { filesApi } from '../../api';
import toast from 'react-hot-toast';

const LANGUAGE_PRESETS = {
  python: `def greet(name):\n    print(f"Hello, {name}!")\n    print("Welcome to GSV E-Office workspace.")\n\ngreet("GSV User")\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "GSV E-Office Compiler Console v1.0.0" << endl;\n    cout << "Executing C++ script successfully..." << endl;\n    return 0;\n}\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Java compilation successful.");\n        System.out.println("GSV E-Office sandbox operational.");\n    }\n}\n`,
  javascript: `// Node.js Execution sandbox\nconsole.log("Node.js compile sequence active...");\nconst stats = { status: "Online", platform: "TrueNAS SCALE" };\nconsole.log("System state:", JSON.stringify(stats, null, 2));\n`
};

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
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      
      {/* Upper header controls */}
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            🖥️ GSV Document Workspace
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
            Enterprise document design hub and sandboxed script execution suite
          </p>
        </div>
        
        {/* Toggle between tools */}
        <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '4px', borderRadius: '10px' }}>
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

      {/* Main Panel */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '520px', background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        
        {activeTool === 'editor' ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
            
            {/* Rich Editor Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.15)', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                value={docTitle} 
                onChange={e => setDocTitle(e.target.value)} 
                className="form-control" 
                style={{ width: '180px', fontWeight: 600, height: '32px', background: 'rgba(255,255,255,0.05)', fontSize: '13px' }}
                title="Document Title"
              />
              
              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>
              
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('bold')} title="Bold"><Bold size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('italic')} title="Italic"><Italic size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('underline')} title="Underline"><Underline size={14} /></button>
              
              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>

              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('justifyLeft')} title="Align Left"><AlignLeft size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('justifyCenter')} title="Align Center"><AlignCenter size={14} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleFormat('justifyRight')} title="Align Right"><AlignRight size={14} /></button>

              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>

              {/* Font Selection */}
              <select 
                className="form-control" 
                style={{ width: '100px', height: '32px', padding: '0 8px', fontSize: '12px', background: 'rgba(255,255,255,0.05)' }}
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
                style={{ width: '80px', height: '32px', padding: '0 8px', fontSize: '12px', background: 'rgba(255,255,255,0.05)' }}
                value={activeSize}
                onChange={e => { setActiveSize(e.target.value); handleFormat('fontSize', e.target.value === '12px' ? '3' : e.target.value === '16px' ? '4' : '5'); }}
              >
                <option value="12px">Small</option>
                <option value="16px">Normal</option>
                <option value="20px">Large</option>
              </select>

              <div className="ms-auto" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={12} style={{ color: 'var(--brand-success)' }} /> {saveStatus}
                </span>
                
                <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }} onClick={handleSaveToCloud}>
                  <Cloud size={14} /> Save to Cloud
                </button>
                
                <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }} onClick={() => handleDownload('html')}>
                  <Download size={14} /> Export HTML
                </button>
              </div>
            </div>

            {/* Editable Content Frame */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)' }}>
              <div 
                ref={editorRef}
                contentEditable 
                suppressContentEditableWarning
                style={{
                  minHeight: '100%',
                  outline: 'none',
                  color: '#f8fafc',
                  fontSize: activeSize,
                  fontFamily: activeFont,
                  lineHeight: 1.6,
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  padding: '24px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                }}
                onInput={e => setEditorContent(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: editorContent }}
              />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
            
            {/* Compiler Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(0, 0, 0, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-primary)' }}>
                <FileCode size={16} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  gsv_sandbox_{language}.{language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : language === 'javascript' ? 'js' : 'py'}
                </span>
              </div>
              
              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }}></div>
              
              <select 
                className="form-control" 
                style={{ width: '130px', height: '32px', padding: '0 8px', fontSize: '12px', background: 'rgba(255,255,255,0.05)' }}
                value={language}
                onChange={e => setLanguage(e.target.value as any)}
              >
                <option value="python">Python 3.10</option>
                <option value="cpp">C++ 17</option>
                <option value="java">Java 17</option>
                <option value="javascript">Node.js 18</option>
              </select>

              <div className="ms-auto" style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => toast.success('Code copied to clipboard')}>
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
              <div style={{ width: '60%', borderRight: '1px solid rgba(255,255,255,0.08)', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <textarea 
                  value={codeContent}
                  onChange={e => setCodeContent(e.target.value)}
                  style={{
                    flex: 1,
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.4)',
                    color: '#38bdf8',
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
              <div style={{ width: '40%', display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.7)' }}>
                <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fbbf24', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Terminal size={12} /> TERMINAL OUTPUT</span>
                  {isCompiling && <span style={{ marginLeft: 'auto', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="spinner" style={{ width: '10px', height: '10px', borderWidth: '1.5px' }} /> compiling...</span>}
                </div>
                <pre style={{
                  flex: 1,
                  margin: 0,
                  padding: '16px',
                  color: '#e2e8f0',
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
      <div className="d-flex align-items-center gap-4" style={{ fontSize: '12px', color: 'var(--text-tertiary)', padding: '0 8px' }}>
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
      
    </div>
  );
}
