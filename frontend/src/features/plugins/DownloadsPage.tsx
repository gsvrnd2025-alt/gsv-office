import { Monitor, Smartphone, Laptop, Github, Terminal, Copy, Check, Download, Info } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function DownloadsPage() {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    toast.success('Command copied to clipboard! 📋');
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const psCommand = `Invoke-WebRequest -Uri "http://192.168.0.177:8080/downloads/GSVOffice-Portable.exe" -OutFile "$env:TEMP\\GSVOffice.exe"; Start-Process "$env:TEMP\\GSVOffice.exe"`;
  const bashCommand = `curl -L -o /tmp/gsv-office http://192.168.0.177:8080/downloads/gsv-office-client && chmod +x /tmp/gsv-office && /tmp/gsv-office &`;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 800, fontSize: '28px', color: 'var(--text-primary)' }}>
            🖥️ Client Downloads & Extensions
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Access GSV Office on all your devices — Windows, Android, macOS, iOS, or via Command-Line
          </p>
        </div>
      </div>

      {/* Main Grid: Platforms */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Windows */}
        <div className="card hover-glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: 0.04, pointerEvents: 'none' }}>🖥️</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Monitor size={24} style={{ color: '#6366f1' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>Windows Desktop Client</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Compatible with Windows 10 & 11</div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Run GSV Office directly from your taskbar. Operates silently in the system tray, starts automatically with Windows, and checks server connectivity in the background.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
            <a href="/downloads/GSVOffice-Setup.exe" download className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', justifyContent: 'center', fontWeight: 700 }} onClick={() => toast.success('Downloading GSV Office Setup... 📥')}>
              <Download size={16} /> GSVOffice-Setup.exe (Installer)
            </a>
            <a href="/downloads/GSVOffice-Portable.exe" download className="btn btn-secondary" style={{ justifyContent: 'center', fontWeight: 600 }} onClick={() => toast.success('Downloading GSV Office Portable... 📥')}>
              <Download size={16} /> GSVOffice-Portable.exe (Standalone)
            </a>
          </div>
        </div>

        {/* Mobile (Android & iOS) */}
        <div className="card hover-glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: 0.04, pointerEvents: 'none' }}>📱</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={24} style={{ color: '#10b981' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>Mobile Applications</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Android APK & iOS PWA</div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Stay connected on the go. Install the Android client app for background notifications and remote assistance, or add the standalone Web App to your iOS Homescreen.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
            <a href="/downloads/GSVOffice-Android.apk" download className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', justifyContent: 'center', fontWeight: 700 }} onClick={() => toast.success('Downloading Android APK... 📥')}>
              <Download size={16} /> GSVOffice-Android.apk (APK)
            </a>
            <div style={{
              background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)',
              fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start'
            }}>
              <Info size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>iOS Installation:</strong> Open Safari, go to this server IP address, tap the <strong>Share</strong> button and choose <strong>"Add to Home Screen"</strong>.
              </div>
            </div>
          </div>
        </div>

        {/* Mac OS */}
        <div className="card hover-glass" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', opacity: 0.04, pointerEvents: 'none' }}>🍎</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Laptop size={24} style={{ color: '#f43f5e' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>macOS Client</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Apple Silicon & Intel Macs</div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            A tailored native build for macOS. Features menubar controls, offline checks, dark-mode styling syncing, and automatic workspace connection.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
            <a href="/downloads/GSVOffice-Mac.dmg" download className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: 'none', justifyContent: 'center', fontWeight: 700 }} onClick={() => toast.success('Downloading macOS DMG... 📥')}>
              <Download size={16} /> GSVOffice-Mac.dmg (Apple Silicon/Intel)
            </a>
          </div>
        </div>

      </div>

      {/* GitHub Publishing Integration */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Github size={24} style={{ color: 'var(--text-primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>GitHub Release Registry</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Centralized application distribution & updates</div>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Publish client updates globally on GitHub. Once binaries are pushed as a GitHub Release, other workstations can fetch latest builds automatically.
        </p>
        <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>🚀 How to Publish a New Client Version:</div>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Run <code>npm run build</code> in the <code>desktop-client/</code> folder to generate binaries.</li>
            <li>Tag a version in git: <code>git tag -a v1.0.0 -m "Release version 1.0.0"</code>.</li>
            <li>Push changes and tags: <code>git push origin main --tags</code>.</li>
            <li>In GitHub, create a new <strong>Release</strong>, select the tag <code>v1.0.0</code>, upload the compiled EXE, DMG or APK, and publish!</li>
          </ol>
        </div>
      </div>

      {/* CLI / Shell Command Installations */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal size={24} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>Command-Line Shell Installation</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>One-click download & execute command prompts</div>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Install the desktop client instantly from the terminal using PowerShell (Windows) or curl (Linux/macOS). Copy and run the command below:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          
          {/* Windows PowerShell */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Windows PowerShell:</div>
            <div style={{
              background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px',
              fontFamily: 'Consolas, monospace', fontSize: '12px', position: 'relative', display: 'flex', alignItems: 'center'
            }}>
              <span style={{ color: '#4ade80', overflowX: 'auto', whiteSpace: 'nowrap', width: '90%', paddingRight: '20px' }}>{psCommand}</span>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => copyToClipboard(psCommand, 'ps')}
                style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                {copiedCmd === 'ps' ? <Check size={14} style={{ color: '#4ade80' }} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Linux/Mac curl */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Linux / macOS Shell:</div>
            <div style={{
              background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px',
              fontFamily: 'Consolas, monospace', fontSize: '12px', position: 'relative', display: 'flex', alignItems: 'center'
            }}>
              <span style={{ color: '#f43f5e', overflowX: 'auto', whiteSpace: 'nowrap', width: '90%', paddingRight: '20px' }}>{bashCommand}</span>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => copyToClipboard(bashCommand, 'bash')}
                style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                {copiedCmd === 'bash' ? <Check size={14} style={{ color: '#4ade80' }} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
