import { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { 
  Monitor, Play, Square, Settings, Share2, 
  MousePointer2, Keyboard, ShieldAlert, Cpu, Network,
  Volume2, Sliders, RefreshCw, X, Radio, Eye, FileCode2,
  Download, Copy, ClipboardCopy, ShieldCheck, AlertCircle, 
  AlertTriangle, Folder, HardDrive, Terminal, Users, Phone,
  Mic, MicOff, Shield, CheckSquare, Clock, ChevronDown, ChevronUp, Link, Trash2, Maximize,
  MessageSquare, GripVertical, Send, Minimize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { usersApi, webrtcApi } from '../../api';
import { useThemeStore } from '../../store/theme.store';
import { io, Socket } from 'socket.io-client';
import { SoundManager } from '../../utils/sound';

class MockDesktopState {
  files: MockFile[];
  windows: any[];
  activeWindowId: string | null;
  startMenuOpen: boolean;
  cursorX: number;
  cursorY: number;
  clickRipple: { x: number; y: number; radius: number } | null;
  cmdBuffer: string;
  cmdHistory: string[];
  lastClickTime: number;

  constructor() {
    this.files = [
      { 
        name: 'audit_logs.xlsx', 
        type: 'excel', 
        size: '1.2 MB', 
        content: 'GSV Office Audit Log Export\nDate Range: 2026-05-01 to 2026-06-03\nEvents Logged: 1,429\nSystem Health Index: 98.4%\nData sync: COMPLETE' 
      },
      { 
        name: 'truenas_dataset_config.json', 
        type: 'json', 
        size: '4.8 KB', 
        content: JSON.stringify({
          pool: 'tank',
          dataset: 'gsv-office-storage',
          compression: 'lz4',
          deduplication: 'off',
          encryption: 'aes-256-gcm',
          mountpoint: '/mnt/tank/gsv-office',
          owner: 'gsv-admin'
        }, null, 2)
      },
      { 
        name: 'readme_deployment.txt', 
        type: 'text', 
        size: '1.5 KB', 
        content: '=== GSV OFFICE ENTERPRISE DEPLOYMENT ===\n1. Run deploy-all.js to push configurations to TrueNAS\n2. Verify the SMB share is isolated per user\n3. Sync sheets with deployment ID on Admin page\n4. For support, contact super_admin@gsv.rnd' 
      }
    ];
    this.windows = [
      {
        id: 'explorer',
        title: 'File Explorer',
        type: 'explorer',
        x: 100,
        y: 80,
        w: 620,
        h: 420,
        isMinimized: false,
        isMaximized: false,
        focused: true,
        data: { selectedIndex: 0 }
      },
      {
        id: 'cmd',
        title: 'Command Prompt',
        type: 'cmd',
        x: 220,
        y: 150,
        w: 580,
        h: 360,
        isMinimized: true,
        isMaximized: false,
        focused: false
      }
    ];
    this.activeWindowId = 'explorer';
    this.startMenuOpen = false;
    this.cursorX = 640;
    this.cursorY = 360;
    this.clickRipple = null;
    this.cmdBuffer = '';
    this.cmdHistory = [
      'Microsoft Windows [Version 10.0.22000]',
      '(c) Microsoft Corporation. All rights reserved.',
      '',
      'C:\\Users\\Administrator>'
    ];
    this.lastClickTime = 0;
  }

  openWindow(type: string) {
    const w = this.windows.find(win => win.type === type);
    if (w) {
      w.isMinimized = false;
      this.focusWindow(w.id);
    } else {
      let title = 'Window';
      let width = 500, height = 350;
      if (type === 'notepad') {
        title = 'Notepad';
        width = 480;
        height = 340;
      } else if (type === 'chrome') {
        title = 'Google Chrome';
        width = 700;
        height = 450;
      }
      const newWin = {
        id: type,
        title,
        type,
        x: 150 + this.windows.length * 25,
        y: 100 + this.windows.length * 25,
        w: width,
        h: height,
        isMinimized: false,
        isMaximized: false,
        focused: true,
        data: type === 'notepad' ? { openFileIndex: 0 } : {}
      };
      this.windows.push(newWin);
      this.focusWindow(newWin.id);
    }
  }

  toggleWindow(type: string) {
    const w = this.windows.find(win => win.type === type);
    if (w) {
      if (w.isMinimized) {
        w.isMinimized = false;
        this.focusWindow(w.id);
      } else if (w.focused) {
        w.isMinimized = true;
      } else {
        this.focusWindow(w.id);
      }
    } else {
      this.openWindow(type);
    }
  }

  focusWindow(id: string) {
    this.activeWindowId = id;
    this.windows.forEach(w => {
      w.focused = (w.id === id);
    });
  }

  openNotepadWithFile(fileIndex: number) {
    this.openWindow('notepad');
    const notepad = this.windows.find(w => w.type === 'notepad');
    if (notepad) {
      notepad.data = { ...notepad.data, openFileIndex: fileIndex };
      notepad.title = `${this.files[fileIndex].name} - Notepad`;
    }
  }

  addFile(name: string, size: string, content: string) {
    const existingIndex = this.files.findIndex(f => f.name.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
      this.files[existingIndex].content = content;
      this.files[existingIndex].size = size;
    } else {
      this.files.push({ name, type: 'text', size, content });
    }
    // Set selected index of file explorer to the new file
    const explorer = this.windows.find(w => w.type === 'explorer');
    if (explorer) {
      explorer.data = { ...explorer.data, selectedIndex: this.files.length - 1 };
    }
  }

  handleClick(clientX: number, clientY: number) {
    const x = Math.round((clientX / 1920) * 1280);
    const y = Math.round((clientY / 1080) * 720);

    this.cursorX = x;
    this.cursorY = y;
    this.clickRipple = { x, y, radius: 1 };

    // 1. Taskbar Start Menu button click (centered bottom, around x: 625-655, y >= 680)
    if (x >= 625 && x <= 655 && y >= 680) {
      this.startMenuOpen = !this.startMenuOpen;
      return;
    }

    // 2. Check if clicking inside open Start Menu (x: 440-840, y: 220-680)
    if (this.startMenuOpen) {
      if (x >= 440 && x <= 840 && y >= 220 && y <= 680) {
        // App 1: Explorer
        if (x >= 470 && x <= 520 && y >= 330 && y <= 380) {
          this.openWindow('explorer');
          this.startMenuOpen = false;
        }
        // App 2: Chrome
        else if (x >= 550 && x <= 600 && y >= 330 && y <= 380) {
          this.openWindow('chrome');
          this.startMenuOpen = false;
        }
        // App 3: CMD
        else if (x >= 630 && x <= 680 && y >= 330 && y <= 380) {
          this.openWindow('cmd');
          this.startMenuOpen = false;
        }
        // App 4: Notepad
        else if (x >= 710 && x <= 760 && y >= 330 && y <= 380) {
          this.openWindow('notepad');
          this.startMenuOpen = false;
        }
        return;
      } else {
        this.startMenuOpen = false;
      }
    }

    // 3. Taskbar Apps click (y >= 680)
    if (y >= 680) {
      // Explorer: 675-700
      if (x >= 675 && x <= 700) {
        this.toggleWindow('explorer');
      }
      // Chrome: 710-735
      else if (x >= 710 && x <= 735) {
        this.toggleWindow('chrome');
      }
      // CMD: 745-770
      else if (x >= 745 && x <= 770) {
        this.toggleWindow('cmd');
      }
      // Notepad: 780-805
      else if (x >= 780 && x <= 805) {
        this.toggleWindow('notepad');
      }
      return;
    }

    // 4. Click inside open windows (top to bottom focus layer)
    const activeWindows = [...this.windows].filter(w => !w.isMinimized);
    activeWindows.sort((a, b) => (b.focused ? 1 : 0) - (a.focused ? 1 : 0));

    for (const w of activeWindows) {
      const wx = w.isMaximized ? 0 : w.x;
      const wy = w.isMaximized ? 0 : w.y;
      const ww = w.isMaximized ? 1280 : w.w;
      const wh = w.isMaximized ? 680 : w.h;

      if (x >= wx && x <= wx + ww && y >= wy && y <= wy + wh) {
        this.focusWindow(w.id);

        // Click on title bar (height 30px)
        if (y <= wy + 30) {
          // Close button (rightmost: ww-30 to ww)
          if (x >= wx + ww - 30 && x <= wx + ww) {
            w.isMinimized = true;
            if (this.activeWindowId === w.id) this.activeWindowId = null;
          }
          // Maximize button (ww-60 to ww-30)
          else if (x >= wx + ww - 60 && x <= wx + ww - 30) {
            w.isMaximized = !w.isMaximized;
          }
          // Minimize button (ww-90 to ww-60)
          else if (x >= wx + ww - 90 && x <= wx + ww - 60) {
            w.isMinimized = true;
          }
          // Simple drag simulation: click titlebar shifts center slightly
          else {
            w.x = Math.max(0, Math.min(1280 - w.w, x - Math.round(w.w / 2)));
            w.y = Math.max(0, Math.min(680 - w.h, y - 15));
          }
          return;
        }

        // Inside window body
        const bx = x - wx;
        const by = y - wy - 30;

        if (w.type === 'explorer') {
          // Sidebar directory selector
          if (bx < 140) {
            // Can switch folders
          } else {
            // File rows starting at y: 60 (relative to wy) which is by: 30
            const fileIndex = Math.floor((by - 30) / 30);
            if (fileIndex >= 0 && fileIndex < this.files.length) {
              w.data = { ...w.data, selectedIndex: fileIndex };
              
              const now = Date.now();
              if (now - this.lastClickTime < 400) {
                this.openNotepadWithFile(fileIndex);
              }
              this.lastClickTime = now;
            }
          }
        }
        return;
      }
    }

    // 5. Desktop Wallpaper icon click
    // Explorer icon: x: 20-100, y: 20-80
    if (x >= 20 && x <= 100 && y >= 20 && y <= 80) {
      this.openWindow('explorer');
    }
    // Chrome icon: x: 20-100, y: 100-160
    else if (x >= 20 && x <= 100 && y >= 100 && y <= 160) {
      this.openWindow('chrome');
    }
    // CMD icon: x: 20-100, y: 180-240
    else if (x >= 20 && x <= 100 && y >= 180 && y <= 240) {
      this.openWindow('cmd');
    }
    // Notepad icon: x: 20-100, y: 260-320
    else if (x >= 20 && x <= 100 && y >= 260 && y <= 320) {
      this.openWindow('notepad');
    }
  }

  handleKey(key: string) {
    if (!this.activeWindowId) return;
    const w = this.windows.find(win => win.id === this.activeWindowId);
    if (!w || w.isMinimized) return;

    if (w.type === 'cmd') {
      if (key === 'Enter') {
        const cmd = this.cmdBuffer.trim();
        this.cmdHistory.push(`C:\\Users\\Administrator>${this.cmdBuffer}`);
        this.executeCommand(cmd);
        this.cmdBuffer = '';
      } else if (key === 'Backspace') {
        this.cmdBuffer = this.cmdBuffer.slice(0, -1);
      } else if (key.length === 1) {
        this.cmdBuffer += key;
      } else if (key === ' ') {
        this.cmdBuffer += ' ';
      }
    } else if (w.type === 'notepad') {
      const fileIndex = w.data?.openFileIndex;
      if (fileIndex !== undefined && fileIndex >= 0 && fileIndex < this.files.length) {
        const file = this.files[fileIndex];
        if (key === 'Enter') {
          file.content += '\n';
        } else if (key === 'Backspace') {
          file.content = file.content.slice(0, -1);
        } else if (key.length === 1) {
          file.content += key;
        } else if (key === ' ') {
          file.content += ' ';
        }
      }
    }
  }

  executeCommand(cmdStr: string) {
    const parts = cmdStr.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    switch (cmd) {
      case 'help':
        this.cmdHistory.push('Available commands:');
        this.cmdHistory.push('  help       - Show this command list');
        this.cmdHistory.push('  cls, clear - Clear the terminal screen');
        this.cmdHistory.push('  ipconfig   - View IP settings');
        this.cmdHistory.push('  systeminfo - View OS and VM information');
        this.cmdHistory.push('  dir        - List directory files');
        this.cmdHistory.push('  cat <file> - Display content of a file');
        this.cmdHistory.push('  ping <host>- Ping a host address');
        break;
      case 'cls':
      case 'clear':
        this.cmdHistory = [];
        break;
      case 'ipconfig':
        this.cmdHistory.push('Windows IP Configuration');
        this.cmdHistory.push('');
        this.cmdHistory.push('Ethernet adapter Ethernet0:');
        this.cmdHistory.push('   Connection-specific DNS Suffix  . : local.gsv.rnd');
        this.cmdHistory.push('   IPv4 Address. . . . . . . . . . . : 192.168.0.177');
        this.cmdHistory.push('   Subnet Mask . . . . . . . . . . . : 255.255.255.0');
        this.cmdHistory.push('   Default Gateway . . . . . . . . . : 192.168.0.1');
        break;
      case 'systeminfo':
        this.cmdHistory.push('Host Name:                 GSV-WIN11-VM');
        this.cmdHistory.push('OS Name:                   Microsoft Windows 11 Enterprise');
        this.cmdHistory.push('OS Version:                10.0.22000 N/A Build 22000');
        this.cmdHistory.push('System Manufacturer:       GSV R&D Labs');
        this.cmdHistory.push('System Model:              Proxmox VM Instance');
        this.cmdHistory.push('Processor(s):              AMD EPYC 8-Core Processor');
        this.cmdHistory.push('Total Physical Memory:     16,384 MB');
        break;
      case 'dir':
        this.cmdHistory.push(' Directory of C:\\Users\\Administrator\\Desktop');
        this.cmdHistory.push('');
        this.files.forEach(f => {
          this.cmdHistory.push(`06/04/2026  12:00 AM             ${f.size.padEnd(8)} ${f.name}`);
        });
        break;
      case 'cat':
      case 'type':
        if (!arg) {
          this.cmdHistory.push('Syntax: cat <filename>');
        } else {
          const file = this.files.find(f => f.name.toLowerCase() === arg.toLowerCase());
          if (file) {
            file.content.split('\n').forEach(line => this.cmdHistory.push(line));
          } else {
            this.cmdHistory.push(`File not found: ${arg}`);
          }
        }
        break;
      case 'ping':
        if (!arg) {
          this.cmdHistory.push('Syntax: ping <host>');
        } else {
          this.cmdHistory.push(`Pinging ${arg} with 32 bytes of data:`);
          this.cmdHistory.push(`Reply from ${arg}: bytes=32 time=2ms TTL=64`);
          this.cmdHistory.push(`Reply from ${arg}: bytes=32 time=1ms TTL=64`);
          this.cmdHistory.push(`Reply from ${arg}: bytes=32 time=3ms TTL=64`);
          this.cmdHistory.push(`Ping statistics for ${arg}:`);
          this.cmdHistory.push('    Packets: Sent = 3, Received = 3, Lost = 0 (0% loss)');
        }
        break;
      default:
        if (cmdStr) {
          this.cmdHistory.push(`'${cmdStr}' is not recognized as an internal or external command,`);
          this.cmdHistory.push('operable program or batch file. Type "help" for list of commands.');
        }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // 1. Draw Wallpaper
    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    // Decorative abstract shapes
    ctx.fillStyle = 'rgba(59, 130, 246, 0.04)';
    ctx.beginPath();
    ctx.ellipse(350, 360, 450, 220, Math.PI / 6, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = 'rgba(168, 85, 247, 0.03)';
    ctx.beginPath();
    ctx.ellipse(920, 380, 500, 250, -Math.PI / 4, 0, 2 * Math.PI);
    ctx.fill();

    // 2. Draw Desktop Icons
    this.drawDesktopIcon(ctx, 'explorer', 'File Explorer', 30, 30, '📁');
    this.drawDesktopIcon(ctx, 'chrome', 'Google Chrome', 30, 120, '🌐');
    this.drawDesktopIcon(ctx, 'cmd', 'Command Prompt', 30, 210, '💻');
    this.drawDesktopIcon(ctx, 'notepad', 'Notepad', 30, 300, '📝');

    // 3. Draw Windows (back-to-front order)
    const sortedWindows = [...this.windows].sort((a, b) => (a.focused ? 1 : 0) - (b.focused ? 1 : 0));
    for (const w of sortedWindows) {
      if (!w.isMinimized) {
        this.drawWindow(ctx, w);
      }
    }

    // 4. Draw Start Menu (if open)
    if (this.startMenuOpen) {
      this.drawStartMenu(ctx);
    }

    // 5. Draw Taskbar
    this.drawTaskbar(ctx);

    // 6. Draw Cursor & Click Ripple
    this.drawCursor(ctx);
  }

  drawDesktopIcon(ctx: CanvasRenderingContext2D, type: string, label: string, x: number, y: number, emoji: string) {
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, x + 40, y + 35);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText(label, x + 40, y + 55);
  }

  drawWindow(ctx: CanvasRenderingContext2D, w: any) {
    const wx = w.isMaximized ? 0 : w.x;
    const wy = w.isMaximized ? 0 : w.y;
    const ww = w.isMaximized ? 1280 : w.w;
    const wh = w.isMaximized ? 680 : w.h;

    // Window shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;

    // Window borders
    ctx.fillStyle = w.focused ? '#1e293b' : '#334155';
    ctx.strokeStyle = w.focused ? '#3b82f6' : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Title Bar
    ctx.fillStyle = w.focused ? '#0f172a' : '#1e293b';
    ctx.fillRect(wx + 1, wy + 1, ww - 2, 29);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(w.title, wx + 12, wy + 19);

    // Window Controls (minimize, maximize, close)
    // Red close
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(wx + ww - 15, wy + 15, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Yellow maximize
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.arc(wx + ww - 35, wy + 15, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Green minimize
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(wx + ww - 55, wy + 15, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Content container
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(wx + 1, wy + 30, ww - 2, wh - 31);

    if (w.type === 'explorer') {
      this.drawExplorerContent(ctx, wx, wy, ww, wh, w);
    } else if (w.type === 'cmd') {
      this.drawCmdContent(ctx, wx, wy, ww, wh, w);
    } else if (w.type === 'chrome') {
      this.drawChromeContent(ctx, wx, wy, ww, wh, w);
    } else if (w.type === 'notepad') {
      this.drawNotepadContent(ctx, wx, wy, ww, wh, w);
    }
  }

  drawExplorerContent(ctx: CanvasRenderingContext2D, wx: number, wy: number, ww: number, wh: number, w: any) {
    // Sidebar directory list
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(wx + 1, wy + 30, 140, wh - 31);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Quick Access', wx + 15, wy + 55);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('💻 Desktop', wx + 20, wy + 82);
    ctx.fillText('📥 Downloads', wx + 20, wy + 107);
    ctx.fillText('💾 Local C:', wx + 20, wy + 132);
    ctx.fillText('☁️ TrueNAS Share', wx + 20, wy + 157);

    // Sidebar line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(wx + 140, wy + 30);
    ctx.lineTo(wx + 140, wy + wh);
    ctx.stroke();

    // Main directory panel
    ctx.fillStyle = '#090d16';
    ctx.fillRect(wx + 141, wy + 30, ww - 142, wh - 31);

    // Header column labels
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(wx + 141, wy + 30, ww - 142, 30);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('Name', wx + 160, wy + 48);
    ctx.fillText('Size', wx + ww - 100, wy + 48);

    // Render list
    const selectedIndex = w.data?.selectedIndex ?? 0;
    this.files.forEach((file, index) => {
      const rowY = wy + 60 + index * 30;
      if (selectedIndex === index) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.fillRect(wx + 141, rowY, ww - 142, 30);
      }

      let icon = '📝';
      if (file.name.endsWith('.xlsx')) icon = '📊';
      else if (file.name.endsWith('.json')) icon = '⚙️';
      else if (file.name.endsWith('.png') || file.name.endsWith('.jpg')) icon = '🖼️';

      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`${icon}  ${file.name}`, wx + 160, rowY + 20);
      
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(file.size, wx + ww - 100, rowY + 20);
    });
  }

  drawCmdContent(ctx: CanvasRenderingContext2D, wx: number, wy: number, ww: number, wh: number, w: any) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(wx + 1, wy + 30, ww - 2, wh - 31);

    ctx.fillStyle = '#10b981';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';

    const maxLines = Math.floor((wh - 55) / 18);
    const startLine = Math.max(0, this.cmdHistory.length - maxLines);
    
    let lineY = wy + 55;
    for (let i = startLine; i < this.cmdHistory.length; i++) {
      ctx.fillText(this.cmdHistory[i], wx + 15, lineY);
      lineY += 18;
    }

    const cursorBlink = Math.floor(Date.now() / 500) % 2 === 0;
    const prompt = `C:\\Users\\Administrator>${this.cmdBuffer}`;
    ctx.fillText(prompt + (cursorBlink ? '_' : ''), wx + 15, lineY);
  }

  drawChromeContent(ctx: CanvasRenderingContext2D, wx: number, wy: number, ww: number, wh: number, w: any) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(wx + 1, wy + 30, ww - 2, 40);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(wx + 12, wy + 35, 140, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('GSV Office Dashboard', wx + 22, wy + 50);

    ctx.fillStyle = '#020617';
    ctx.fillRect(wx + 170, wy + 38, ww - 200, 22);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('🔒 https://gsv-office.rnd/workspace', wx + 180, wy + 53);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(wx + 1, wy + 70, ww - 2, wh - 71);

    // Widget 1
    ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
    ctx.fillRect(wx + 30, wy + 100, 140, 70);
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('98.4%', wx + 45, wy + 130);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('Storage Capacity', wx + 45, wy + 152);

    // Widget 2
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.fillRect(wx + 190, wy + 100, 140, 70);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('Connected', wx + 205, wy + 130);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('WebRTC Tunnel Status', wx + 205, wy + 152);

    // Graph Line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(wx + 30, wy + 260);
    ctx.lineTo(wx + 90, wy + 230);
    ctx.lineTo(wx + 150, wy + 270);
    ctx.lineTo(wx + 210, wy + 210);
    ctx.lineTo(wx + 270, wy + 225);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('Live Server Diagnostic Logs', wx + 30, wy + 195);
  }

  drawNotepadContent(ctx: CanvasRenderingContext2D, wx: number, wy: number, ww: number, wh: number, w: any) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx + 1, wy + 30, ww - 2, wh - 31);

    ctx.fillStyle = '#0f172a';
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';

    const fileIndex = w.data?.openFileIndex ?? 0;
    const file = this.files[fileIndex];
    const text = file ? file.content : 'No file open';
    
    const lines = text.split('\n');
    let lineY = wy + 55;
    lines.forEach(line => {
      ctx.fillText(line, wx + 15, lineY);
      lineY += 18;
    });

    if (w.focused && Math.floor(Date.now() / 500) % 2 === 0) {
      const lastLineLength = ctx.measureText(lines[lines.length - 1] || '').width;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(wx + 15 + lastLineLength, lineY - 18 - 12, 2, 14);
    }
  }

  drawStartMenu(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.98)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.rect(440, 220, 400, 460);
    ctx.fill();
    ctx.stroke();

    // Start Search
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(460, 240, 360, 32);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔍 Search for apps or settings', 480, 261);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('Pinned Shortcuts', 460, 310);

    // Icons Grid
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    
    ctx.fillText('📁', 495, 360);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Explorer', 495, 382);

    ctx.font = '32px sans-serif';
    ctx.fillText('🌐', 575, 360);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('Chrome', 575, 382);

    ctx.font = '32px sans-serif';
    ctx.fillText('💻', 655, 360);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('Cmd', 655, 382);

    ctx.font = '32px sans-serif';
    ctx.fillText('📝', 735, 360);
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText('Notepad', 735, 382);

    // Profile Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(440, 620, 400, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('👤 Administrator', 465, 655);
    ctx.font = '16px sans-serif';
    ctx.fillText('⏻', 805, 656);
  }

  drawTaskbar(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    ctx.fillRect(0, 680, 1280, 40);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 680);
    ctx.lineTo(1280, 680);
    ctx.stroke();

    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🪟', 640, 709);

    ctx.fillText('📁', 685, 709);
    ctx.fillText('🌐', 720, 709);
    ctx.fillText('💻', 755, 709);
    ctx.fillText('📝', 790, 709);

    this.windows.forEach(w => {
      if (!w.isMinimized) {
        ctx.fillStyle = '#3b82f6';
        let iconX = 0;
        if (w.type === 'explorer') iconX = 685;
        else if (w.type === 'chrome') iconX = 720;
        else if (w.type === 'cmd') iconX = 755;
        else if (w.type === 'notepad') iconX = 790;

        if (iconX > 0) {
          ctx.fillRect(iconX - 10, 715, 20, 3);
        }
      }
    });

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString([], { day: 'numeric', month: 'short' });
    ctx.fillText(timeStr, 1260, 699);
    ctx.fillText(dateStr, 1260, 713);

    ctx.font = '13px sans-serif';
    ctx.fillText('📶 🔊 🔋', 1215, 708);
  }

  drawCursor(ctx: CanvasRenderingContext2D) {
    if (this.clickRipple) {
      ctx.strokeStyle = 'rgba(59, 130, 246, ' + (1 - this.clickRipple.radius / 15) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.clickRipple.x, this.clickRipple.y, this.clickRipple.radius, 0, 2 * Math.PI);
      ctx.stroke();
      
      this.clickRipple.radius += 1.5;
      if (this.clickRipple.radius > 15) {
        this.clickRipple = null;
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    
    ctx.beginPath();
    ctx.moveTo(this.cursorX, this.cursorY);
    ctx.lineTo(this.cursorX + 8, this.cursorY + 18);
    ctx.lineTo(this.cursorX + 3, this.cursorY + 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function createMockStream(state: MockDesktopState): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  
  let animationFrameId: number;
  const draw = () => {
    if (!ctx) return;
    state.draw(ctx);
    animationFrameId = requestAnimationFrame(draw);
  };
  
  draw();
  
  try {
    let stream: MediaStream;
    if ((canvas as any).captureStream) {
      stream = (canvas as any).captureStream(30);
    } else if ((canvas as any).mozCaptureStream) {
      stream = (canvas as any).mozCaptureStream(30);
    } else {
      stream = new MediaStream();
    }
    
    stream.getTracks().forEach((t: any) => {
      t.addEventListener('ended', () => {
        cancelAnimationFrame(animationFrameId);
      });
    });
    return stream;
  } catch (e) {
    console.error('Error in createMockStream:', e);
    return new MediaStream();
  }
}

interface MockFile {
  name: string;
  type: string;
  size: string;
  content: string;
}

const REMOTE_FILES: MockFile[] = [
  { 
    name: 'audit_logs.xlsx', 
    type: 'excel', 
    size: '1.2 MB', 
    content: 'GSV Office Audit Log Export\nDate Range: 2026-05-01 to 2026-06-03\nEvents Logged: 1,429\nSystem Health Index: 98.4%\nData sync: COMPLETE' 
  },
  { 
    name: 'truenas_dataset_config.json', 
    type: 'json', 
    size: '4.8 KB', 
    content: JSON.stringify({
      pool: 'tank',
      dataset: 'gsv-office-storage',
      compression: 'lz4',
      deduplication: 'off',
      encryption: 'aes-256-gcm',
      mountpoint: '/mnt/tank/gsv-office',
      owner: 'gsv-admin'
    }, null, 2)
  },
  { 
    name: 'readme_deployment.txt', 
    type: 'text', 
    size: '15 KB', 
    content: '=== GSV OFFICE ENTERPRISE DEPLOYMENT ===\n1. Run deploy-all.js to push configurations to TrueNAS\n2. Verify the SMB share is isolated per user\n3. Sync sheets with deployment ID on Admin page\n4. For support, contact super_admin@gsv.rnd' 
  }
];

interface ConnectionLog {
  id: string;
  peerName: string;
  peerPhone: string;
  type: 'Incoming' | 'Outgoing';
  status: 'Accepted' | 'Rejected' | 'Terminated' | 'Timeout';
  timestamp: string;
}

// Persistent global session cache for WebRTC route transition persistence
interface GlobalSession {
  socket: Socket | null;
  peerConnection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  activePartnerId: string | null;
  activePartnerName: string;
  isHosting: boolean;
  isHostControlled: boolean;
  isVoiceChatEnabled: boolean;
  localAudioStream: MediaStream | null;
  terminalLogs: string[];
  desktopState: MockDesktopState | null;
  showIncomingRequest: boolean;
  incomingRequestData: any | null;
  remoteClipboard: MockFile | null;
  explorerOpen: boolean;
  explorerPos: { x: number; y: number };
}
let globalSession: GlobalSession | null = null;
let activeCallbacks: any = null;

// Global log helper that updates the persistent buffer
const addGlobalLog = (msg: string, setTerminalLogs?: any) => {
  const formattedMsg = `[${new Date().toLocaleTimeString()}] ${msg}`;
  const session: any = globalSession;
  if (session) {
    session.terminalLogs = [...session.terminalLogs.slice(-15), formattedMsg];
  }
  if (setTerminalLogs) {
    setTerminalLogs((prev: string[]) => [...prev.slice(-15), formattedMsg]);
  } else if (activeCallbacks && activeCallbacks.setTerminalLogs) {
    activeCallbacks.setTerminalLogs((prev: string[]) => [...prev.slice(-15), formattedMsg]);
  }
};

export default function RemoteDesktopPage() {
  const { user, accessToken } = useAuthStore();
  const { theme } = useThemeStore();
  const { 
    sidebarCollapsed, 
    setSidebarCollapsed,
    isRemoteDesktopExpanded,
    setIsRemoteDesktopExpanded
  } = useOutletContext<{
    sidebarCollapsed: boolean;
    setSidebarCollapsed: (v: boolean) => void;
    isRemoteDesktopExpanded?: boolean;
    setIsRemoteDesktopExpanded?: (v: boolean) => void;
  }>() || { 
    sidebarCollapsed: false, 
    setSidebarCollapsed: () => {} 
  };

  const [socket, setSocket] = useState<Socket | null>(globalSession ? globalSession.socket : null);

  // User directory states
  const [teammates, setTeammates] = useState<any[]>([]);
  
  // Connection states
  const [targetPhone, setTargetPhone] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [dialingStatus, setDialingStatus] = useState<'idle' | 'calling' | 'accepted' | 'rejected' | 'timeout'>('idle');
  const [isConnected, setIsConnected] = useState(globalSession ? true : false);
  const [isHosting, setIsHosting] = useState(globalSession ? globalSession.isHosting : false);
  const [isHostControlled, setIsHostControlled] = useState(globalSession ? globalSession.isHostControlled : false);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(globalSession ? globalSession.activePartnerId : null);
  const [activePartnerName, setActivePartnerName] = useState<string>(globalSession ? globalSession.activePartnerName : '');

  // WebRTC state objects to prevent video mounting race condition
  const [localStream, setLocalStream] = useState<MediaStream | null>(globalSession ? globalSession.localStream : null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(globalSession ? globalSession.remoteStream : null);

  // Connection History Logs state
  const [connectionHistory, setConnectionHistory] = useState<ConnectionLog[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gsv-remote-history') || '[]');
    } catch {
      return [];
    }
  });

  // Voice Chat
  const [isVoiceChatEnabled, setIsVoiceChatEnabled] = useState(globalSession ? globalSession.isVoiceChatEnabled : false);
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(globalSession ? globalSession.localAudioStream : null);

  // Layout View constraints
  const [videoFit, setVideoFit] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [isExpandedView, setIsExpandedView] = useState(false);
  const isMouseDownRef = useRef(false);
  const lastMouseDownButton = useRef(0);

  useEffect(() => {
    if (setIsRemoteDesktopExpanded) {
      setIsRemoteDesktopExpanded(isExpandedView);
    }
    return () => {
      if (setIsRemoteDesktopExpanded) {
        setIsRemoteDesktopExpanded(false);
      }
    };
  }, [isExpandedView, setIsRemoteDesktopExpanded]);

  // Auto-expand to full viewport when connection is established
  useEffect(() => {
    if (isConnected && !isHosting) {
      setIsExpandedView(true);
    }
  }, [isConnected, isHosting]);
  const [iceServers, setIceServers] = useState<any[]>([
    { urls: 'stun:stun.l.google.com:19302' }
  ]);

  // Settings
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState({
    resolution: '1080p',
    fps: '60',
    audio: true,
    stunServer: 'stun:stun.l.google.com:19302',
    bandwidthLimit: 'unlimited',
  });
  const [googleSheetId, setGoogleSheetId] = useState(() => localStorage.getItem('gsv-google-sheet-id') || '');

  // Interlock Method state
  const [isControlLocked, setIsControlLocked] = useState(false);
  const isControlLockedRef = useRef(false);
  useEffect(() => { isControlLockedRef.current = isControlLocked; }, [isControlLocked]);

  // Client connection states
  const [partnerIsDesktop, setPartnerIsDesktop] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstallable, setIsPwaInstallable] = useState(false);

  // Installer simulation states
  const [showInstallerModal, setShowInstallerModal] = useState(false);
  const [installerStep, setInstallerStep] = useState<'idle' | 'detecting' | 'error_sandbox' | 'terms_conditions' | 'permissions_select' | 'installing' | 'success'>('idle');
  const [installerProgress, setInstallerProgress] = useState(0);
  const [installerLog, setInstallerLog] = useState<string>('');
  const [selectedInstallerOS, setSelectedInstallerOS] = useState<'Windows' | 'Android' | 'macOS' | 'iOS'>('Windows');
  const [localAgentActive, setLocalAgentActive] = useState(() => {
    return localStorage.getItem('gsv-local-agent-active') === 'true';
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [requestedPerms, setRequestedPerms] = useState({
    screen: true,
    keyboard: true,
    mouse: true,
    file: true,
    clipboard: true,
    printer: true
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPwaInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Installer simulation effect
  useEffect(() => {
    let timer: any;
    if (installerStep === 'detecting' && showInstallerModal) {
      timer = setTimeout(() => {
        setInstallerStep('error_sandbox');
      }, 1500);
    } else if (installerStep === 'installing' && showInstallerModal) {
      const start = Date.now();
      const duration = 4000; // 4 seconds
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const pct = Math.min(Math.floor((elapsed / duration) * 100), 100);
        setInstallerProgress(pct);
        
        if (pct < 25) {
          setInstallerLog(`📥 Downloading GSV Office ${selectedInstallerOS} Agent binary...`);
        } else if (pct < 50) {
          setInstallerLog(`📦 Verifying file signatures and checking integrity...`);
        } else if (pct < 75) {
          setInstallerLog(`⚙️ Configuring system path and registering services...`);
        } else if (pct < 100) {
          setInstallerLog(`🔌 Connecting loopback server port 23489...`);
        } else {
          setInstallerLog(`✅ Installation finalized!`);
          clearInterval(interval);
          setInstallerStep('success');
        }
      }, 100);
      return () => clearInterval(interval);
    }
    return () => clearTimeout(timer);
  }, [installerStep, showInstallerModal, selectedInstallerOS]);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsPwaInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Permissions settings modal
  const [showIncomingRequest, setShowIncomingRequest] = useState(globalSession ? globalSession.showIncomingRequest : false);
  const [incomingRequestData, setIncomingRequestData] = useState<any | null>(globalSession ? globalSession.incomingRequestData : null);
  const [grantedPermissions, setGrantedPermissions] = useState({
    fullControl: true,
    keyboard: true,
    mouse: true,
    fileTransfer: true,
  });
  const [sessionDuration, setSessionDuration] = useState('1h');
  const [desktopSources, setDesktopSources] = useState<any[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [shareType, setShareType] = useState<'screen' | 'window'>('screen');

  useEffect(() => {
    if (showIncomingRequest && (window as any).gsvDesktop) {
      addLog('Fetching desktop sources for screen share picker...');
      (window as any).gsvDesktop.getSources().then((sources: any[]) => {
        setDesktopSources(sources);
        // Default to the first screen source if available
        const screenSource = sources.find(s => s.id.startsWith('screen:'));
        if (screenSource) {
          setSelectedSourceId(screenSource.id);
        } else if (sources.length > 0) {
          setSelectedSourceId(sources[0].id);
        }
      }).catch((err: any) => {
        console.error('Failed to get desktop sources:', err);
      });
    }
  }, [showIncomingRequest]);

  // Viewport / WebRTC simulation objects
  const viewportRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(globalSession ? globalSession.localStream : null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(globalSession ? globalSession.peerConnection : null);
  const dataChannelRef = useRef<RTCDataChannel | null>(globalSession ? globalSession.dataChannel : null);
  const socketRef = useRef<Socket | null>(globalSession ? globalSession.socket : null);
  const dialingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iceCandidatesQueueRef = useRef<any[]>([]);

  const desktopStateRef = useRef<MockDesktopState | null>(null);
  if (!desktopStateRef.current) {
    desktopStateRef.current = globalSession && globalSession.desktopState ? globalSession.desktopState : new MockDesktopState();
  }
  
  const [explorerOpen, setExplorerOpen] = useState(globalSession ? globalSession.explorerOpen : false);
  const [explorerPos, setExplorerPos] = useState(globalSession ? globalSession.explorerPos : { x: 20, y: 80 });
  const [isDraggingExplorer, setIsDraggingExplorer] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [remoteClipboard, setRemoteClipboard] = useState<MockFile | null>(globalSession ? globalSession.remoteClipboard : null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>(globalSession ? globalSession.terminalLogs : []);

  const lastEscPressTime = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastMouseMoveTime = useRef<number>(0);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPinned, setToolbarPinned] = useState(false);

  // Floating Chat Panel state
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [floatingChatPos, setFloatingChatPos] = useState({ x: 60, y: 60 });
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const chatDragStartRef = useRef({ x: 0, y: 0 });
  const [floatingChatInput, setFloatingChatInput] = useState('');
  const [floatingChatMessages, setFloatingChatMessages] = useState<{sender: string; text: string; time: string}[]>([
    { sender: 'system', text: 'Floating chat ready. Messages will be sent to your active partner.', time: new Date().toLocaleTimeString() }
  ]);

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Draggable File explorer mounts overlay handlers
  const handleDragStart = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('svg')) return;
    setIsDraggingExplorer(true);
    dragStartRef.current = {
      x: e.clientX - explorerPos.x,
      y: e.clientY - explorerPos.y
    };
    e.preventDefault();
  };

  const handleDrag = (e: MouseEvent) => {
    if (!isDraggingExplorer) return;
    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;
    setExplorerPos({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDraggingExplorer(false);
  };

  useEffect(() => {
    if (isDraggingExplorer) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDraggingExplorer, explorerPos]);

  // ─── Bind active callbacks for persistent global session ────────────────────
  activeCallbacks = {
    handleRemoteRequest: (data: any) => {
      addGlobalLog(`Incoming remote connection request from ${data.callerName} (${data.callerPhone})`, setTerminalLogs);
      setIncomingRequestData(data);
      setShowIncomingRequest(true);
      SoundManager.playNotification();
    },
    handleRemoteResponse: async (data: any) => {
      if (dialingTimeoutRef.current) clearTimeout(dialingTimeoutRef.current);
      if (data.status === 'rejected') {
        setIsConnecting(false);
        setDialingStatus('rejected');
        
        if (data.reason === 'insecure') {
          toast.error('Connection failed: Host is blocked by browser insecure context. The host must use HTTPS or the Desktop App.', { duration: 8000 });
          addGlobalLog('Host connection failed due to host insecure HTTP context.', setTerminalLogs);
        } else if (data.reason === 'permission_denied') {
          toast.error('Connection failed: Host denied screen share permission.');
          addGlobalLog('Host denied display capture permission.', setTerminalLogs);
        } else if (data.reason === 'not_supported') {
          toast.error('Connection failed: Host browser does not support screen sharing.');
          addGlobalLog('Host browser does not support display capture.', setTerminalLogs);
        } else {
          toast.error('Remote access request was rejected by host.');
          addGlobalLog('Host rejected remote access request.', setTerminalLogs);
        }
        
        const targetId = targetPhoneRef.current.replace(/\s+/g, '');
        const target = teammatesRef.current.find(t => t.id === targetPhoneRef.current || t.phone?.replace(/\s+/g, '') === targetId || t.loginId === targetId);
        addConnectionHistory({
          peerName: target?.fullName || targetPhoneRef.current,
          peerPhone: target?.phone || targetPhoneRef.current,
          type: 'Outgoing',
          status: 'Rejected'
        });
      } else {
        setDialingStatus('accepted');
        addGlobalLog('Host accepted request. Setting up WebRTC session...', setTerminalLogs);
        setActivePartnerId(data.hostId);
        setPartnerIsDesktop(!!data.isDesktopAgent);
        
        if (data.isDesktopAgent) {
          addGlobalLog('Host Desktop Agent is online 🟢. Direct OS-level control is active.', setTerminalLogs);
          toast.success('Direct Desktop Agent control active!');
        } else {
          addGlobalLog('WARNING: Host is running inside standard browser. Native OS-level control is unavailable.', setTerminalLogs);
          toast.error('Host running on browser. Native input control unavailable.');
        }

        const hostUser = teammatesRef.current.find(t => t.id === data.hostId);
        setActivePartnerName(hostUser?.fullName || 'Host');
        
        addConnectionHistory({
          peerName: hostUser?.fullName || 'Peer Host',
          peerPhone: hostUser?.phone || 'Unknown',
          type: 'Outgoing',
          status: 'Accepted'
        });

        if (!peerConnectionRef.current) {
          await setupWebRTC(false, data.hostId);
        }
      }
    },
    handleRemoteSignal: async (data: any) => {
      if (!peerConnectionRef.current) {
        if (data.signal.type === 'offer') {
          addGlobalLog('Received WebRTC offer before connection was initialized. Setting up now...', setTerminalLogs);
          await setupWebRTC(false, data.fromId);
        } else {
          return;
        }
      }
      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        const signal = data.signal;
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          // Drain queued ICE candidates
          if (iceCandidatesQueueRef.current.length > 0) {
            addGlobalLog(`Draining ${iceCandidatesQueueRef.current.length} queued ICE candidates...`, setTerminalLogs);
            for (const candidate of iceCandidatesQueueRef.current) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error('Error adding queued ICE candidate', e);
              }
            }
            iceCandidatesQueueRef.current = [];
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current?.emit('remote:signal', { targetUserId: data.fromId, signal: answer });
          addGlobalLog('Signaling offer dispatched.', setTerminalLogs);
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          // Drain queued ICE candidates
          if (iceCandidatesQueueRef.current.length > 0) {
            addGlobalLog(`Draining ${iceCandidatesQueueRef.current.length} queued ICE candidates...`, setTerminalLogs);
            for (const candidate of iceCandidatesQueueRef.current) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error('Error adding queued ICE candidate', e);
              }
            }
            iceCandidatesQueueRef.current = [];
          }
        }
      } catch (e) {
        console.error('Signal error', e);
      }
    },
    handleRemoteIceCandidate: async (data: any) => {
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          iceCandidatesQueueRef.current.push(data.candidate);
        }
      } catch (e) {
        console.error('Error adding ICE candidate', e);
      }
    },
    handleRemoteControlLock: (data: any) => {
      setIsControlLocked(data.isLocked);
      if (data.isLocked) {
        toast.error('Control Lock: Host is typing or moving mouse. Inputs paused.', { id: 'lock-alert' });
        addGlobalLog('Control Lock: Remote host physical input active.', setTerminalLogs);
      } else {
        toast.success('Control released. Inputs enabled.', { id: 'lock-alert' });
        addGlobalLog('Control released: Host yielded controls.', setTerminalLogs);
      }
    },
    handleRemoteTerminate: () => {
      terminateSession(true);
    },
    handleDataChannelMessage: (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'mouse') {
          if (payload.action !== 'move') {
            addGlobalLog(`Remote mouse action: ${payload.action || 'click'} (${payload.x}, ${payload.y})`, setTerminalLogs);
          }
          if (desktopStateRef.current) {
            if (payload.action === 'move') {
              desktopStateRef.current.cursorX = Math.round((payload.x / 1920) * 1280);
              desktopStateRef.current.cursorY = Math.round((payload.y / 1080) * 720);
            } else if (payload.action === 'leftdown') {
              desktopStateRef.current.handleClick(payload.x, payload.y);
            }
          }
          if (!isControlLockedRef.current) {
            if ((window as any).gsvDesktop && typeof (window as any).gsvDesktop.remoteInput === 'function') {
              (window as any).gsvDesktop.remoteInput({ type: 'mouse', action: payload.action, x: payload.x, y: payload.y });
            } else if (localAgentActive) {
              if (payload.action !== 'move') {
                addGlobalLog(`[Agent Loopback] Executed native OS mouse event: ${payload.action} at (${payload.x}, ${payload.y})`, setTerminalLogs);
              }
            }
          }
        } else if (payload.type === 'key') {
          addGlobalLog(`Remote keyboard input: ${payload.key}`, setTerminalLogs);
          if (desktopStateRef.current) {
            desktopStateRef.current.handleKey(payload.key);
          }
          if (!isControlLockedRef.current) {
            if ((window as any).gsvDesktop && typeof (window as any).gsvDesktop.remoteInput === 'function') {
              (window as any).gsvDesktop.remoteInput({ type: 'key', key: payload.key });
            } else if (localAgentActive) {
              addGlobalLog(`[Agent Loopback] Executed native OS key press: "${payload.key}"`, setTerminalLogs);
            }
          }
        } else if (payload.type === 'file-transfer') {
          addGlobalLog(`File transfer received: ${payload.fileName} (${payload.fileSize})`, setTerminalLogs);
          toast.success(`Received shared file: ${payload.fileName}`);
          if (desktopStateRef.current) {
            desktopStateRef.current.addFile(payload.fileName, payload.fileSize, payload.content || '');
          }
          setRemoteClipboard({
            name: payload.fileName,
            type: 'text',
            size: payload.fileSize,
            content: payload.content || 'File payload synchronised'
          });
        }
      } catch (e) {}
    },
    setTerminalLogs
  };

  // Connection History helper
  const addConnectionHistory = (log: Omit<ConnectionLog, 'id' | 'timestamp'>) => {
    try {
      const newLog: ConnectionLog = {
        ...log,
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toLocaleString('en-IN')
      };
      let history: ConnectionLog[] = [];
      try {
        const stored = localStorage.getItem('gsv-remote-history');
        if (stored) {
          history = JSON.parse(stored);
        }
      } catch (jsonErr) {
        console.error('Error parsing remote history:', jsonErr);
      }
      if (!Array.isArray(history)) {
        history = [];
      }
      const updated = [newLog, ...history];
      localStorage.setItem('gsv-remote-history', JSON.stringify(updated));
      setConnectionHistory(updated);
    } catch (err) {
      console.error('Failed to add connection history:', err);
    }
  };

  const deleteHistoryEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = connectionHistory.filter(h => h.id !== id);
      localStorage.setItem('gsv-remote-history', JSON.stringify(updated));
      setConnectionHistory(updated);
      toast.success('Log entry deleted.');
    } catch (err) {
      console.error('Failed to delete history entry:', err);
    }
  };

  // Double effect to safely map local/remote streams to video elements once mounted
  useEffect(() => {
    if (videoRef.current) {
      if (isConnected && remoteStream) {
        videoRef.current.srcObject = remoteStream;
      } else if (isHosting && localStream) {
        // Do NOT attach local stream to local video element to prevent infinite feedback mirroring!
        videoRef.current.srcObject = null;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [videoRef.current, isConnected, remoteStream, isHosting, localStream]);

  // Bind audio element to remote stream for clean playing of sound
  useEffect(() => {
    if (audioRef.current) {
      if (remoteStream) {
        audioRef.current.srcObject = remoteStream;
      } else {
        audioRef.current.srcObject = null;
      }
    }
  }, [audioRef.current, remoteStream]);

  // Stable refs for socket event handlers (avoids socket reconnect on every state change)
  const teammatesRef = useRef<any[]>([]);
  const targetPhoneRef = useRef<string>('');

  // Keep refs in sync with state
  useEffect(() => { teammatesRef.current = teammates; }, [teammates]);
  useEffect(() => { targetPhoneRef.current = targetPhone; }, [targetPhone]);

  // Socket Connection setup — ONLY depends on accessToken, never on teammates/targetPhone
  useEffect(() => {
    if (!accessToken) return;
    
    let s: Socket;
    if (globalSession && globalSession.socket) {
      s = globalSession.socket;
      addLog('Reconnected to persistent signaling socket tunnel.');
    } else {
      s = io('/webrtc', {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      s.on('connect', () => {
        addGlobalLog('Secure signaling socket tunnel online.', setTerminalLogs);
      });

      let lastRefreshAttempt = 0;
      s.on('connect_error', async (err) => {
        addGlobalLog(`Socket connection error: ${err.message}.`, setTerminalLogs);
        
        const now = Date.now();
        if (now - lastRefreshAttempt < 30000) {
          addGlobalLog('Token refresh throttled for WebRTC socket.', setTerminalLogs);
          return;
        }
        lastRefreshAttempt = now;

        try {
          await usersApi.getDirectory();
          const freshToken = useAuthStore.getState().accessToken;
          if (freshToken && freshToken !== (s.auth as any).token) {
            (s.auth as any).token = freshToken;
            s.connect();
            addGlobalLog('Token refreshed. Socket reconnected successfully.', setTerminalLogs);
          }
        } catch (refreshErr) {
          addGlobalLog('Token refresh failed. Reconnect will retry.', setTerminalLogs);
          console.error('Failed to auto-refresh token for webrtc socket:', refreshErr);
        }
      });

      s.on('disconnect', (reason: string) => {
        addGlobalLog(`Socket disconnected: ${reason}. Reconnecting...`, setTerminalLogs);
      });

      s.on('remote:request', (data: any) => {
        if (activeCallbacks) activeCallbacks.handleRemoteRequest(data);
      });

      s.on('remote:response', async (data: any) => {
        if (activeCallbacks) activeCallbacks.handleRemoteResponse(data);
      });

      s.on('remote:signal', async (data: any) => {
        if (activeCallbacks) activeCallbacks.handleRemoteSignal(data);
      });

      s.on('remote:ice-candidate', async (data: any) => {
        if (activeCallbacks) activeCallbacks.handleRemoteIceCandidate(data);
      });

      s.on('remote:control-lock', (data: any) => {
        if (activeCallbacks) activeCallbacks.handleRemoteControlLock(data);
      });

      s.on('remote:terminate', () => {
        if (activeCallbacks) activeCallbacks.handleRemoteTerminate();
      });
    }

    setSocket(s);
    socketRef.current = s;

    return () => {
      if (!globalSession) {
        s.disconnect();
      }
    };
  }, [accessToken]);

  // Fetch users for directories — use /users/directory (no admin perm needed, any user can call)
  // Poll every 30s to detect online/offline changes
  const fetchTeammates = async () => {
    try {
      const res = await usersApi.getDirectory();
      // /users/directory returns {success: true, data: [...]}
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setTeammates(list); // Already excludes current user on backend
    } catch (e) {
      console.error('fetchTeammates error:', e);
    }
  };

  useEffect(() => {
    fetchTeammates();
    // 15s interval — balances snappy online/offline updates with rate limits
    const interval = setInterval(fetchTeammates, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Load COTURN configuration from backend
  useEffect(() => {
    webrtcApi.getConfig().then((res: any) => {
      if (res.data?.iceServers) {
        setIceServers(res.data.iceServers);
        addLog('COTURN local TURN server parameters loaded successfully.');
      }
    }).catch((err: any) => {
      console.warn('Failed to load local COTURN configuration, using public STUN fallback:', err);
    });
  }, []);

  // Emergency double Escape press listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const now = Date.now();
        if (now - lastEscPressTime.current < 500) {
          addGlobalLog('🚨 Emergency escape keys detected. Disconnecting...', setTerminalLogs);
          terminateSession(false);
          toast.error('Emergency Exit: Remote connection terminated.', { icon: '🚨' });
        } else {
          // Single ESC press: Exit full screen and exit expanded Fit to Window mode
          let exitedSomething = false;
          if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
            if (document.exitFullscreen) {
              document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
              (document as any).webkitExitFullscreen();
            }
            exitedSomething = true;
          }
          if (isExpandedView) {
            setIsExpandedView(false);
            exitedSomething = true;
          }
          if (exitedSomething) {
            toast.success('Exited expanded view / full screen.');
          }
        }
        lastEscPressTime.current = now;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnected, isHosting, activePartnerId, activePartnerName, isExpandedView]);

  // Floating chat panel event listener (from Sidebar interception)
  useEffect(() => {
    const handleToggleFloatingChat = () => {
      setShowFloatingChat(prev => !prev);
    };
    window.addEventListener('gsv-toggle-floating-chat', handleToggleFloatingChat);
    return () => window.removeEventListener('gsv-toggle-floating-chat', handleToggleFloatingChat);
  }, []);

  // Floating chat drag handlers
  useEffect(() => {
    if (!isDraggingChat) return;
    const handleDrag = (e: MouseEvent) => {
      setFloatingChatPos({
        x: e.clientX - chatDragStartRef.current.x,
        y: e.clientY - chatDragStartRef.current.y
      });
    };
    const handleDragEnd = () => setIsDraggingChat(false);
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDraggingChat]);

  // Expanded/Fit to screen mouse hover handlers
  useEffect(() => {
    if (!isExpandedView) {
      if (!toolbarPinned) setShowFloatingToolbar(false);
      return;
    }

    const handleWindowMouseMove = (e: MouseEvent) => {
      // 1. Top Edge Hover for Floating Toolbar (< 15px) — only if not pinned
      if (!toolbarPinned) {
        if (e.clientY < 15) {
          setShowFloatingToolbar(true);
        } else if (e.clientY > 80) {
          setShowFloatingToolbar(false);
        }
      }

      // 2. Left Edge Hover for Sidebar slide-in (< 20px)
      if (e.clientX < 20) {
        setSidebarCollapsed(false);
      } else if (e.clientX > 240) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    return () => window.removeEventListener('mousemove', handleWindowMouseMove);
  }, [isExpandedView, setSidebarCollapsed]);

  useEffect(() => {
    if (isExpandedView) {
      setSidebarCollapsed(true);
    }
  }, [isExpandedView, setSidebarCollapsed]);

  // Host local input tracking for Interlock mechanism (Keyboard only to prevent simulated mouse movement self-lockouts)
  useEffect(() => {
    const handleLocalInput = () => {
      if (isHosting && isHostControlled && socket && activePartnerId && !isControlLocked) {
        socket.emit('remote:control-lock', { targetUserId: activePartnerId, isLocked: true });
        setIsControlLocked(true);
      }
    };

    if (isHosting && isHostControlled) {
      window.addEventListener('keydown', handleLocalInput);
    }

    return () => {
      window.removeEventListener('keydown', handleLocalInput);
    };
  }, [isHosting, isHostControlled, socket, activePartnerId, isControlLocked]);

  // WebRTC Setup Helper
  const setupWebRTC = async (isHost: boolean, partnerId: string) => {
    try {
      const configuration = {
        iceServers: iceServers
      };

      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('remote:ice-candidate', { targetUserId: partnerId, candidate: event.candidate });
        }
      };

      pc.ontrack = (event) => {
        console.log('WebRTC ontrack event:', event.track.kind);
        if (event.streams[0]) {
          const newStream = new MediaStream(pc.getReceivers().map(r => r.track).filter(Boolean));
          setRemoteStream(newStream);
          if (!isHost) {
            setIsConnected(true);
            setIsConnecting(false);
            setDialingStatus('accepted');
            addLog('WebRTC Screen mirror feed attached.');
          } else {
            addLog('WebRTC remote voice chat track attached.');
          }
        }
      };

      if (isHost) {
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
        }

        const dc = pc.createDataChannel('control');
        dataChannelRef.current = dc;
        setupDataChannel(dc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit('remote:signal', { targetUserId: partnerId, signal: offer });
        addLog('Signaling offer dispatched.');
      } else {
        pc.ondatachannel = (event) => {
          dataChannelRef.current = event.channel;
          setupDataChannel(event.channel);
        };
      }
    } catch (e) {
      console.error(e);
      addLog('Failed to negotiate WebRTC tunnel.');
      setIsConnecting(false);
      setDialingStatus('idle');
    }
  };

  const setupDataChannel = (dc: RTCDataChannel) => {
    dc.onopen = () => {
      addLog('Control data channel linked.');
      setIsConnected(true);
      setIsConnecting(false);
      setDialingStatus('accepted');
    };
    dc.onclose = () => {
      addLog('Control data channel closed.');
      setIsConnected(false);
    };
    dc.onerror = (err) => {
      addLog(`Control data channel error: ${err}`);
      setIsConnected(false);
    };
    dc.onmessage = (event) => {
      if (activeCallbacks && activeCallbacks.handleDataChannelMessage) {
        activeCallbacks.handleDataChannelMessage(event);
      }
    };
  };

  // Connect via phone number or code
  const initiateConnection = () => {
    const isDesktopApp = !!(window as any).gsvDesktop;
    if (!isDesktopApp) {
      window.location.href = `gsvoffice://remote?action=connect&target=${encodeURIComponent(targetPhone)}`;
      toast('Opening GSV Desktop App...', { icon: 'ℹ️' });
      return;
    }

    const targetId = targetPhone.replace(/\s+/g, '');
    const target = teammates.find(t => t.id === targetPhone || t.phone?.replace(/\s+/g, '') === targetId || t.loginId === targetId);
    if (!target) {
      toast.error('User not found in online directory.');
      return;
    }
    if (!target.isOnline) {
      toast.error('User is currently offline.');
      return;
    }

    setIsConnecting(true);
    setDialingStatus('calling');
    addLog(`Requesting connection handshake with ${target.fullName}...`);
    
    socket?.emit('remote:request', {
      targetUserId: target.id,
      callerName: user?.fullName,
      callerPhone: user?.phone || user?.loginId,
      callerDept: user?.department?.name || 'Workspace'
    });

    if (dialingTimeoutRef.current) clearTimeout(dialingTimeoutRef.current);
    dialingTimeoutRef.current = setTimeout(() => {
      setDialingStatus('timeout');
      setIsConnecting(false);
      addLog('Dialing handshake request timed out.');
      toast.error('Dial handshake request timed out.', { icon: '⏰' });
      
      addConnectionHistory({
        peerName: target.fullName,
        peerPhone: target.phone || target.loginId,
        type: 'Outgoing',
        status: 'Timeout'
      });
    }, 30000);
  };

  // Cancel Dialing Handshake
  const cancelConnectionRequest = () => {
    if (dialingTimeoutRef.current) clearTimeout(dialingTimeoutRef.current);
    const targetId = targetPhone.replace(/\s+/g, '');
    const target = teammates.find(t => t.id === targetPhone || t.phone?.replace(/\s+/g, '') === targetId || t.loginId === targetId);
    if (socket && target) {
      socket.emit('remote:terminate', { targetUserId: target.id });
    }
    setIsConnecting(false);
    setDialingStatus('idle');
    addLog('Handshake calling request cancelled.');
    toast.success('Dial handshake request cancelled.');
  };

  // Host Action: Accept Request
  const acceptRequest = async () => {
    if (!incomingRequestData) return;
    setShowIncomingRequest(false);

    const isInsecureContext = typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const isDesktopApp = !!(window as any).gsvDesktop || localAgentActive;

    if (!isDesktopApp) {
      window.location.href = `gsvoffice://remote?action=accept&callerId=${incomingRequestData.callerId}`;
      toast('Opening GSV Desktop App to share screen...', { icon: 'ℹ️' });
      rejectRequest('redirected_to_app');
      return;
    }

    if (isInsecureContext && !isDesktopApp) {
      toast.error('Insecure Context: Screen sharing is blocked over HTTP. Please access via HTTPS or use the Desktop App.', { duration: 8000 });
      rejectRequest('insecure');
      return;
    }
    
    try {
      addLog('Acquiring display share capture...');
      let stream: MediaStream;
      if ((window as any).gsvDesktop && selectedSourceId) {
        addLog(`Acquiring native desktop capture for source: ${selectedSourceId}`);
        // Notify Electron main process about the selected source ID
        await (window as any).gsvDesktop.selectSource(selectedSourceId);
        
        // Trigger getDisplayMedia which runs web session DisplayMediaRequest handler in Electron
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
      } else if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: config.resolution === '4k' ? 3840 : config.resolution === '1080p' ? 1920 : 1280,
              height: config.resolution === '4k' ? 2160 : config.resolution === '1080p' ? 1080 : 720,
              frameRate: Number(config.fps)
            },
            audio: config.audio
          });
        } catch (err) {
          console.warn('Real screen share blocked:', err);
          toast.error('Screen share permission denied or cancelled.');
          rejectRequest('permission_denied');
          return;
        }
      } else {
        console.warn('Display Media not supported.');
        if (isInsecureContext && !isDesktopApp) {
          toast.error('Insecure Context: Screen sharing is blocked over HTTP. Please access via HTTPS or use the Desktop App.', { duration: 8000 });
          rejectRequest('insecure');
        } else {
          toast.error('Your browser does not support screen sharing.');
          rejectRequest('not_supported');
        }
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsHosting(true);
      setIsHostControlled(true);
      setActivePartnerId(incomingRequestData.callerId);
      setActivePartnerName(incomingRequestData.callerName);

      try {
        addConnectionHistory({
          peerName: incomingRequestData.callerName,
          peerPhone: incomingRequestData.callerPhone,
          type: 'Incoming',
          status: 'Accepted'
        });
      } catch (histErr) {
        console.error('History logger error:', histErr);
      }

      socket?.emit('remote:response', {
        targetUserId: incomingRequestData.callerId,
        status: 'accepted',
        permissions: grantedPermissions,
        duration: sessionDuration,
        isDesktopAgent: !!(window as any).gsvDesktop || localAgentActive
      });

      await setupWebRTC(true, incomingRequestData.callerId);
      toast.success(`Sharing screen and control permissions!`);

      if ((window as any).gsvDesktop && typeof (window as any).gsvDesktop.minimizeWindow === 'function') {
        (window as any).gsvDesktop.minimizeWindow();
      }
      
      const durationMs = sessionDuration === '1h' ? 3600000 : sessionDuration === '3h' ? 10800000 : 0;
      if (durationMs > 0) {
        setTimeout(() => {
          terminateSession(false);
          toast.error('Session expired.');
        }, durationMs);
      }
    } catch (e) {
      console.error(e);
      rejectRequest();
    }
  };

  // Host Action: Reject Request
  const rejectRequest = (reason?: any) => {
    setShowIncomingRequest(false);
    const reasonStr = typeof reason === 'string' ? reason : undefined;
    if (incomingRequestData) {
      addConnectionHistory({
        peerName: incomingRequestData.callerName,
        peerPhone: incomingRequestData.callerPhone,
        type: 'Incoming',
        status: 'Rejected'
      });

      socket?.emit('remote:response', {
        targetUserId: incomingRequestData.callerId,
        status: 'rejected',
        reason: reasonStr
      });
    }
    setIncomingRequestData(null);
  };

  // Start Hosting screen manually
  const startHostingManually = async () => {
    const isInsecureContext = typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const isDesktopApp = !!(window as any).gsvDesktop || localAgentActive;

    if (!isDesktopApp) {
      window.location.href = 'gsvoffice://remote?action=host';
      toast('Opening GSV Desktop App to share screen...', { icon: 'ℹ️' });
      return;
    }

    if (isInsecureContext && !isDesktopApp) {
      toast.error('Insecure Context: Screen sharing is blocked over HTTP. Please access via HTTPS or use the Desktop App.', { duration: 8000 });
      return;
    }

    try {
      addLog('Acquiring manual screen capture...');
      let stream: MediaStream;
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: 1920, height: 1080, frameRate: 30 },
            audio: true
          });
        } catch (err) {
          console.warn('Manual capture failed:', err);
          toast.error('Screen capture permission denied.');
          return;
        }
      } else {
        console.warn('Display Media not supported');
        if (isInsecureContext && !isDesktopApp) {
          toast.error('Insecure Context: Screen sharing is blocked over HTTP. Please access via HTTPS or use the Desktop App.', { duration: 8000 });
        } else {
          toast.error('Your browser does not support screen sharing.');
        }
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsHosting(true);
      toast.success('Started sharing screen! Waiting for remote connections.');

      if ((window as any).gsvDesktop && typeof (window as any).gsvDesktop.minimizeWindow === 'function') {
        (window as any).gsvDesktop.minimizeWindow();
      }
    } catch (e) {
      toast.error('Screen capture permission denied.');
    }
  };

  // Release Control lock
  const requestControlRelease = () => {
    if (socket && activePartnerId) {
      socket.emit('remote:control-lock', { targetUserId: activePartnerId, isLocked: false });
      setIsControlLocked(false);
    }
  };

  const toggleVoiceCall = async () => {
    try {
      if (isVoiceChatEnabled) {
        // Remove track from peer connection
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const sender = senders.find(s => s.track && s.track.kind === 'audio');
          if (sender) {
            peerConnectionRef.current.removeTrack(sender);
            addLog('WebRTC microphone track detached.');
          }
        }

        localAudioStream?.getTracks().forEach(t => t.stop());
        setLocalAudioStream(null);
        setIsVoiceChatEnabled(false);
        addLog('Voice meeting audio stopped.');

        // Trigger WebRTC offer-answer renegotiation
        if (socket && activePartnerId && peerConnectionRef.current) {
          const offer = await peerConnectionRef.current.createOffer();
          await peerConnectionRef.current.setLocalDescription(offer);
          socket.emit('remote:signal', { targetUserId: activePartnerId, signal: offer });
          addLog('WebRTC renegotiation offer sent (removed audio).');
        }
      } else {
        addLog('Acquiring mic access for voice chat...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalAudioStream(stream);
        setIsVoiceChatEnabled(true);
        addLog('Voice chat online.');
        toast.success('Mic connected! Voice meeting active.');

        // Add track to peer connection
        if (peerConnectionRef.current) {
          stream.getTracks().forEach(track => {
            peerConnectionRef.current!.addTrack(track, stream);
          });
          addLog('WebRTC microphone track attached.');
          
          // Trigger WebRTC offer-answer renegotiation
          if (socket && activePartnerId) {
            const offer = await peerConnectionRef.current.createOffer();
            await peerConnectionRef.current.setLocalDescription(offer);
            socket.emit('remote:signal', { targetUserId: activePartnerId, signal: offer });
            addLog('WebRTC renegotiation offer sent (added audio).');
          }
        }
      }
    } catch (e) {
      console.error('Failed to toggle voice call:', e);
      toast.error('Failed to get microphone permissions.');
    }
  };

  // Clean disconnect
  const terminateSession = (remoteEvent = false) => {
    if (activePartnerId) {
      const partner = teammates.find(t => t.id === activePartnerId) || { fullName: activePartnerName || 'Peer', phone: '' };
      addConnectionHistory({
        peerName: partner.fullName,
        peerPhone: partner.phone || '',
        type: isHosting ? 'Incoming' : 'Outgoing',
        status: 'Terminated'
      });
    }

    if (socket && activePartnerId && !remoteEvent) {
      socket.emit('remote:terminate', { targetUserId: activePartnerId });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localAudioStream) {
      localAudioStream.getTracks().forEach(t => t.stop());
      setLocalAudioStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsConnecting(false);
    setDialingStatus('idle');
    setIsConnected(false);
    setIsHosting(false);
    setIsHostControlled(false);
    setIsVoiceChatEnabled(false);
    setActivePartnerId(null);
    setIsControlLocked(false);
    setLocalStream(null);
    setRemoteStream(null);
    setIsExpandedView(false);
    iceCandidatesQueueRef.current = [];

    addLog('Remote Desk connection closed.');
    toast.success('Session disconnected.');
  };

  const handleFullScreen = () => {
    if (viewportRef.current) {
      if (viewportRef.current.requestFullscreen) {
        viewportRef.current.requestFullscreen();
      } else if ((viewportRef.current as any).webkitRequestFullscreen) {
        (viewportRef.current as any).webkitRequestFullscreen();
      }
    }
  };

  const formatPhoneId = (phoneNum?: string) => {
    if (!phoneNum) return 'No Phone ID';
    const clean = phoneNum.replace(/\s+/g, '');
    if (clean.length === 10) {
      return `${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
    }
    return clean;
  };

  const getRelativeCoordinates = (e: React.MouseEvent<any> | MouseEvent) => {
    const video = videoRef.current;
    if (!video) return null;

    const rect = video.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Use dynamic video width or fallback to 1920x1080
    const videoWidth = video.videoWidth || 1920;
    const videoHeight = video.videoHeight || 1080;

    const elementWidth = rect.width;
    const elementHeight = rect.height;

    const videoRatio = videoWidth / videoHeight;
    const elementRatio = elementWidth / elementHeight;

    let actualVideoWidth = elementWidth;
    let actualVideoHeight = elementHeight;
    let offsetX = 0;
    let offsetY = 0;

    // Accounts for aspect ratio constraints matching object-fit: contain
    if (videoFit === 'contain') {
      if (elementRatio > videoRatio) {
        // Pillarbox
        actualVideoWidth = elementHeight * videoRatio;
        offsetX = (elementWidth - actualVideoWidth) / 2;
      } else {
        // Letterbox
        actualVideoHeight = elementWidth / videoRatio;
        offsetY = (elementHeight - actualVideoHeight) / 2;
      }
    }

    const relativeX = clickX - offsetX;
    const relativeY = clickY - offsetY;

    const fractionX = relativeX / actualVideoWidth;
    const fractionY = relativeY / actualVideoHeight;

    const clampedFractionX = Math.max(0, Math.min(1.0, fractionX));
    const clampedFractionY = Math.max(0, Math.min(1.0, fractionY));

    const x = Math.round(clampedFractionX * 1920);
    const y = Math.round(clampedFractionY * 1080);

    return { x, y, fractionX: clampedFractionX, fractionY: clampedFractionY };
  };

  const handleViewportMouseMove = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isConnected || isControlLocked || !dataChannelRef.current) return;

    // Throttle mousemove coordinate transmissions to 16ms (~60fps) for smooth cursor tracking
    const now = Date.now();
    if (now - lastMouseMoveTime.current < 16) return;
    lastMouseMoveTime.current = now;

    const coords = getRelativeCoordinates(e);
    if (!coords) return;

    dataChannelRef.current.send(JSON.stringify({
      type: 'mouse',
      action: 'move',
      x: coords.x,
      y: coords.y,
      fractionX: coords.fractionX,
      fractionY: coords.fractionY
    }));
  };

  const handleViewportMouseDown = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isConnected || isControlLocked || !dataChannelRef.current) return;
    
    // Direct focus to the parent card so keyboard keys are immediately captured
    if (viewportRef.current) {
      viewportRef.current.focus();
    }

    const coords = getRelativeCoordinates(e);
    if (!coords) return;

    let action = 'leftdown';
    if (e.button === 2) {
      action = 'rightdown';
    }

    isMouseDownRef.current = true;
    lastMouseDownButton.current = e.button;

    dataChannelRef.current.send(JSON.stringify({
      type: 'mouse',
      action: action,
      x: coords.x,
      y: coords.y,
      fractionX: coords.fractionX,
      fractionY: coords.fractionY
    }));
    
    addLog(`Mouse down (${action}) dispatched: (${coords.x}, ${coords.y})`);
  };

  useEffect(() => {
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (!isMouseDownRef.current || !dataChannelRef.current || !isConnected) {
        isMouseDownRef.current = false;
        return;
      }

      const coords = getRelativeCoordinates(e);
      const x = coords ? coords.x : 960;
      const y = coords ? coords.y : 540;
      const fractionX = coords ? coords.fractionX : 0.5;
      const fractionY = coords ? coords.fractionY : 0.5;

      let action = 'leftup';
      if (lastMouseDownButton.current === 2) {
        action = 'rightup';
      }

      try {
        dataChannelRef.current.send(JSON.stringify({
          type: 'mouse',
          action: action,
          x: x,
          y: y,
          fractionX: fractionX,
          fractionY: fractionY
        }));
        addLog(`Global mouse up (${action}) dispatched: (${x}, ${y})`);
      } catch (err) {
        console.error('Failed to send global mouseup over data channel:', err);
      }

      isMouseDownRef.current = false;
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      
      // Proactive cleanup: release mouse buttons if stuck on unmount
      if (isMouseDownRef.current && dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
        let action = 'leftup';
        if (lastMouseDownButton.current === 2) {
          action = 'rightup';
        }
        try {
          dataChannelRef.current.send(JSON.stringify({
            type: 'mouse',
            action: action,
            x: 960,
            y: 540
          }));
        } catch {}
        isMouseDownRef.current = false;
      }
    };
  }, [isConnected]);

  const handleViewportContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Stop standard browser context menu on right clicks
  };

  const handleViewportKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isConnected || isControlLocked || !dataChannelRef.current) return;
    dataChannelRef.current.send(JSON.stringify({ type: 'key', key: e.key }));
  };

  const simulateFileTransfer = (file: MockFile) => {
    if (!isConnected || !dataChannelRef.current) {
      toast.error('No connection tunnel active.');
      return;
    }
    dataChannelRef.current.send(JSON.stringify({
      type: 'file-transfer',
      fileName: file.name,
      fileSize: file.size,
      content: file.content
    }));
    toast.success(`Dispatched ${file.name} over WebRTC data channel!`);
    addLog(`File transfer upload initiated: ${file.name}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isConnected || !dataChannelRef.current) {
      toast.error('Connect to a remote PC to transfer files.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const sizeStr = file.size > 1024 * 1024 
        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        : (file.size / 1024).toFixed(1) + ' KB';
      
      dataChannelRef.current!.send(JSON.stringify({
        type: 'file-transfer',
        fileName: file.name,
        fileSize: sizeStr,
        content: content
      }));
      toast.success(`Dispatched ${file.name} to remote host PC!`);
      addLog(`File transfer upload initiated: ${file.name}`);
    };

    if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.py') || file.name.endsWith('.md')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const onlinePeers = teammates.filter(t => t.isOnline);

  const isInsecureContext = typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const isDesktopApp = !!(window as any).gsvDesktop || localAgentActive;
  const showInsecureAlert = isInsecureContext && !isDesktopApp;

  return (
    <div className="page-enter" style={isExpandedView ? {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      gap: 0,
      color: 'var(--text-primary)',
      padding: 0,
      margin: 0,
      overflow: 'hidden'
    } : {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      gap: '20px',
      color: 'var(--text-primary)',
      padding: '4px'
    }}>
      
      {/* Insecure Context Warning Banner */}
      {showInsecureAlert && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.25) 100%)',
          backdropFilter: 'blur(12px)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15)',
          animation: 'fadeInDown 0.5s ease-out',
          color: '#fca5a5'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: '#ef4444',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '18px',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.6)'
            }} className="animate-pulse">
              ⚠️
            </div>
            <div>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '16px', color: '#fff', letterSpacing: '-0.3px' }}>
                Insecure HTTP Browser Context Detected / பாதுகாப்பு எச்சரிக்கை
              </h4>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#fecaca', fontWeight: 500 }}>
                Screen sharing is strictly blocked by modern browsers over insecure HTTP. / Browser-கள் பாதுகாப்பு காரணங்களுக்காக HTTP-யில் screen sharing-ஐ அனுமதிக்காது.
              </p>
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.25)', 
            borderRadius: '8px', 
            padding: '12px 16px', 
            fontSize: '13px', 
            lineHeight: '1.6', 
            color: '#e2e8f0',
            borderLeft: '4px solid #ef4444'
          }}>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '6px' }}>How to resolve this issue: / இந்த சிக்கலை எவ்வாறு சரி செய்வது:</div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>
                <strong>Option 1 (Recommended):</strong> Access the secure HTTPS URL instead at{' '}
                <a 
                  href={`https://${window.location.hostname}:8443/remote-desktop`} 
                  style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: 700 }}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  https://{window.location.hostname}:8443/remote-desktop
                </a>{' '}
                to enable browser screen share.
                <br />
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  (HTTPS-ஐ பயன்படுத்தி இணைக்கவும் - 8443 போர்ட் வழியாக)
                </span>
              </li>
              <li style={{ marginTop: '8px' }}>
                <strong>Option 2:</strong> Open the compiled <strong>GSV Office Desktop App</strong> which bypasses browser sandbox limitations.
                <br />
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  (GSV Office Desktop Client அல்லது Portable App-ஐ பயன்படுத்தவும்)
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Upper header — hidden when connected in expanded view */}
      {!isExpandedView && (
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              🖥️ GSV UltraViewer Remote Desktop
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, fontWeight: 500 }}>
              P2P WebRTC secure screen mirroring, control coordination and emergency overrides
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }} onClick={() => setShowConfigModal(true)}>
            <Settings size={14} /> CONFIGURE STUN
          </button>
        </div>
      )}

      {/* PWA / Desktop Agent Status Banner — hidden when connected in expanded view */}
      {!isExpandedView && (() => {
        const isDesktopApp = !!(window as any).gsvDesktop || localAgentActive;
        if (isDesktopApp) {
          return (
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '12px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#10b981',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="animate-pulse" style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }} />
                <span>GSV {localAgentActive ? 'Simulated' : 'Windows'} Desktop Agent Active: Native OS-level keyboard and mouse simulation enabled.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {localAgentActive && (
                  <button 
                    onClick={() => {
                      setLocalAgentActive(false);
                      localStorage.setItem('gsv-local-agent-active', 'false');
                      toast.success('Agent disconnected.');
                    }}
                    className="btn btn-danger btn-sm"
                    style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '4px', border: 0, color: '#fff', cursor: 'pointer' }}
                  >
                    Disconnect Agent
                  </button>
                )}
                <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>tray running</span>
              </div>
            </div>
          );
        }

        return (
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '12px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#f59e0b',
            fontWeight: 600,
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="animate-pulse" style={{ display: 'inline-block', width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%' }} />
              <span>Desktop Agent is inactive. Running inside web browser. Direct OS-level control requires the Desktop Agent app.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => {
                  setShowInstallerModal(true);
                  setInstallerStep('detecting');
                  setInstallerProgress(0);
                }}
                className="btn btn-warning btn-sm"
                style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '4px', background: '#f59e0b', border: 0, color: '#fff', cursor: 'pointer' }}
              >
                🚀 Launch Agent Installer
              </button>
              {isPwaInstallable && (
                <button 
                  onClick={handleInstallPwa}
                  className="btn btn-warning btn-sm"
                  style={{ padding: '4px 12px', fontSize: '12px', fontWeight: 700, borderRadius: '4px', background: '#f59e0b', border: 0, color: '#fff', cursor: 'pointer' }}
                >
                  Install PWA App
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* AnyDesk Style 2-Column Grid */}
      <div className="row flex-grow-1" style={{ minHeight: '560px' }}>
        
        {/* Left Column: Viewport (Screen Mirror) */}
        <div className="col-lg-8 col-xl-9 d-flex flex-column">
          <div 
            ref={viewportRef}
            onKeyDown={handleViewportKeyPress}
            tabIndex={0}
            className="card p-0 overflow-hidden bg-black position-relative d-flex align-items-center justify-content-center flex-grow-1" 
            style={isExpandedView ? {
              width: '100%',
              height: '100%',
              background: '#090d16',
              cursor: isConnected ? (isControlLocked ? 'not-allowed' : 'crosshair') : 'default',
              outline: 'none',
              borderRadius: 0,
              border: 'none',
              boxShadow: 'none'
            } : { 
              minHeight: '480px', 
              border: '3px solid ' + (isHostControlled ? '#ef4444' : isConnected ? 'var(--brand-primary)' : 'var(--border-color)'),
              background: '#090d16',
              boxShadow: 'inset 0 4px 30px rgba(0,0,0,0.95)',
              cursor: isConnected ? (isControlLocked ? 'not-allowed' : 'crosshair') : 'default',
              outline: 'none',
              borderRadius: '16px'
            }}
          >
            {/* Hosting Screen Capture Feed */}
            {isHosting && (
              <div className="w-100 h-100 position-relative" style={{ background: '#090d16' }}>
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center" style={{ background: '#090d16', zIndex: 5, padding: '24px' }}>
                  <div className="card p-4 text-center animate-scale-in" style={{ maxWidth: '460px', border: '3px solid #ef4444', background: '#111827', color: '#f9fafb', borderRadius: '16px' }}>
                    <AlertCircle size={48} className="text-danger mx-auto mb-3 animate-pulse" />
                    <h3 style={{ fontWeight: 800, color: '#ef4444', fontSize: '18px', margin: '0 0 10px 0' }}>Remote Sync Active</h3>
                    <p style={{ fontSize: '14px', color: '#d1d5db', lineHeight: 1.5, marginBottom: '16px' }}>
                      Client <strong className="text-primary">{activePartnerName}</strong> is currently accessing and controlling your desktop.
                    </p>
                    
                    {isControlLocked ? (
                      <div className="alert alert-danger py-2 px-3 text-start mb-3" style={{ fontSize: '12px', fontWeight: 600 }}>
                        🔒 <strong>Inputs Interlocked:</strong> Physical overrides active. Remote user mouse/keyboard are locked out.
                      </div>
                    ) : (
                      <div className="alert alert-warning py-2 px-3 text-start mb-3" style={{ fontSize: '12px', fontWeight: 600 }}>
                        🔑 Remote control active. Press any key on your keyboard to interlock controls and lock out the client.
                      </div>
                    )}

                    <div className="d-flex gap-2">
                      <button className="btn btn-danger w-100 btn-md" style={{ fontWeight: 800, letterSpacing: '0.5px' }} onClick={() => terminateSession(false)}>
                        🚨 EMERGENCY TERMINATE (DOUBLE ESC)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Controlling Client Mirror Feed */}
            {isConnected && !isHosting && (
              <div style={isExpandedView ? {
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                background: '#090d16',
                padding: 0
              } : {
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                padding: '16px'
              }}>
                
                {/* Overlay Lock for Interlock system */}
                {isControlLocked && (
                  <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 20 }}>
                    <div className="card p-4 text-center" style={{ background: '#1e293b', border: '2px solid #ef4444', color: '#fff', borderRadius: '12px' }}>
                      <AlertTriangle size={40} className="text-danger mx-auto mb-2" />
                      <h5 style={{ fontWeight: 800 }}>Host Input Interlock Active</h5>
                      <p style={{ fontSize: '13px', color: '#cbd5e1' }}>Host is actively typing or moving the physical cursor. Controls paused.</p>
                      <button className="btn btn-sm btn-primary mt-3" style={{ fontWeight: 700 }} onClick={requestControlRelease}>
                        Request Control Release
                      </button>
                    </div>
                  </div>
                )}

                {/* Floating Top Toolbar (Only in expanded view) */}
                {isExpandedView && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 20
                  }}>
                    {/* Top-Center Toggle Tab */}
                    <div 
                      onClick={() => {
                        if (toolbarPinned) {
                          setToolbarPinned(false);
                          setShowFloatingToolbar(false);
                        } else {
                          setToolbarPinned(true);
                          setShowFloatingToolbar(true);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: showFloatingToolbar ? '44px' : '0',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        width: '48px',
                        height: '18px',
                        background: toolbarPinned ? 'rgba(99, 102, 241, 0.95)' : 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '0 0 8px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderTop: 'none',
                        transition: 'top 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s',
                        zIndex: 25,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
                      }}
                      title={showFloatingToolbar ? 'Hide Controls' : 'Show Controls'}
                    >
                      {showFloatingToolbar ? (
                        <ChevronUp size={14} style={{ color: '#fff', strokeWidth: 3 }} />
                      ) : (
                        <ChevronDown size={14} style={{ color: '#94a3b8', strokeWidth: 3 }} />
                      )}
                    </div>

                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: `translateX(-50%) translateY(${showFloatingToolbar ? '0' : '-100%'})`,
                      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      pointerEvents: 'auto',
                      background: 'rgba(15, 23, 42, 0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.1)',
                      borderTop: 'none',
                      borderRadius: '0 0 12px 12px',
                      padding: '8px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                    }}>
                      <div style={{ color: '#60a5fa', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Monitor size={14} /> <span>{activePartnerName}</span>
                      </div>
                      <div style={{ borderRight: '1.5px solid rgba(255, 255, 255, 0.1)', height: '16px' }} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>Scale:</span>
                        <button 
                          className={`btn btn-xs ${videoFit === 'contain' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setVideoFit('contain')}
                          style={{ fontSize: '11px', fontWeight: 700 }}
                        >
                          Contain
                        </button>
                        <button 
                          className={`btn btn-xs ${videoFit === 'fill' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setVideoFit('fill')}
                          style={{ fontSize: '11px', fontWeight: 700 }}
                        >
                          Stretch
                        </button>
                      </div>
                      
                      <div style={{ borderRight: '1.5px solid rgba(255, 255, 255, 0.1)', height: '16px' }} />
                      
                      <button 
                        className={`btn btn-xs ${explorerOpen ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setExplorerOpen(prev => !prev)}
                        style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: '#fff' }}
                      >
                        <Folder size={12} /> Files
                      </button>

                      <button 
                        className={`btn btn-xs ${showFloatingChat ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setShowFloatingChat(prev => !prev)}
                        style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', color: '#fff' }}
                      >
                        <MessageSquare size={12} /> Chat
                      </button>

                      <div style={{ borderRight: '1.5px solid rgba(255, 255, 255, 0.1)', height: '16px' }} />

                      <button 
                        className="btn btn-xs btn-ghost"
                        onClick={() => setIsExpandedView(false)}
                        style={{ fontSize: '11px', fontWeight: 700, color: '#fca5a5' }}
                      >
                        Exit Fit
                      </button>

                      <button 
                        className="btn btn-xs btn-danger"
                        onClick={() => terminateSession(false)}
                        style={{ fontSize: '11px', fontWeight: 800 }}
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}

                {/* Remote Connection Header bar */}
                {!isExpandedView && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', padding: '10px 16px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa' }}>
                      <Eye size={16} />
                      <strong style={{ fontSize: '13px', fontWeight: 800 }}>P2P UltraViewer Session</strong>
                    </div>
                    
                    {/* Screen scaling controls */}
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Screen Scale:</span>
                        <button 
                          className={`btn btn-xs ${videoFit === 'contain' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setVideoFit('contain')}
                          style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}
                        >
                          Contain
                        </button>
                        <button 
                          className={`btn btn-xs ${videoFit === 'fill' ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setVideoFit('fill')}
                          style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}
                        >
                          Stretch
                        </button>
                        <button 
                          className="btn btn-xs btn-ghost"
                          onClick={handleFullScreen}
                          style={{ fontSize: '11px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Maximize size={12} /> Full Screen
                        </button>
                        <button 
                          className={`btn btn-xs ${explorerOpen ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setExplorerOpen(prev => !prev)}
                          style={{ fontSize: '11px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Folder size={12} /> Files
                        </button>
                        <button 
                          className={`btn btn-xs ${isExpandedView ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => setIsExpandedView(!isExpandedView)}
                          style={{ fontSize: '11px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Maximize size={12} /> {isExpandedView ? 'Exit Window Fit' : 'Fit to Window'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                        <span>Latency: 12ms</span>
                        <span>FPS: {config.fps}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Video container with applied fit controls */}
                <div style={isExpandedView ? {
                  flex: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  width: '100%',
                  height: '100%'
                } : {
                  flex: 1,
                  marginTop: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '8px'
                }}>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-100 h-100" 
                    style={{ 
                      objectFit: videoFit, 
                      background: '#000', 
                      cursor: isControlLocked ? 'not-allowed' : "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%233b82f6\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z\"/><path d=\"M13 13l6 6\"/></svg>') 0 0, auto"
                    }} 
                    onMouseMove={handleViewportMouseMove}
                    onMouseDown={handleViewportMouseDown}
                    onContextMenu={handleViewportContextMenu}
                  />
                  
                  {explorerOpen && (
                    <div 
                      className="animate-scale-in"
                      style={{ 
                        position: 'absolute', 
                        top: `${explorerPos.y}px`, 
                        left: `${explorerPos.x}px`, 
                        width: '380px', 
                        height: '240px', 
                        background: 'rgba(15, 23, 42, 0.95)', 
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '10px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        overflow: 'hidden', 
                        zIndex: 10
                      }}
                    >
                      <div 
                        onMouseDown={handleDragStart}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          background: 'rgba(255,255,255,0.04)', 
                          padding: '6px 10px',
                          cursor: 'move',
                          userSelect: 'none'
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>Host Datasets Mount</span>
                        <X size={12} className="cursor-pointer" onClick={() => setExplorerOpen(false)} />
                      </div>
                      <div className="p-2 flex-grow-1" style={{ overflowY: 'auto', fontSize: '11px' }}>
                        {REMOTE_FILES.map((file, i) => (
                          <div 
                            key={i} 
                            onClick={() => setSelectedFileIndex(i)}
                            style={{ 
                              padding: '6px', cursor: 'pointer', borderRadius: '4px',
                              background: selectedFileIndex === i ? 'rgba(59,130,246,0.2)' : 'transparent',
                              color: selectedFileIndex === i ? '#fff' : '#cbd5e1'
                            }}
                          >
                            📁 {file.name} ({file.size})
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-xs btn-primary" onClick={() => simulateFileTransfer(REMOTE_FILES[selectedFileIndex])}>
                          Sync to Clipboard
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!isExpandedView && (
                  <div style={{ height: '80px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px', fontFamily: 'monospace', fontSize: '10px', color: '#10b981', overflowY: 'auto' }}>
                    {terminalLogs.map((lg, i) => <div key={i}>{lg}</div>)}
                  </div>
                )}
              </div>
            )}

            {/* Disconnected default View */}
            {!isHosting && !isConnected && dialingStatus === 'idle' && (
              <div className="text-center p-5" style={{ color: 'var(--text-secondary)' }}>
                <Monitor size={72} style={{ opacity: 0.15, marginBottom: '16px' }} />
                <h5 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>No Active Connection</h5>
                <p style={{ fontSize: '14px', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
                  Enter a partner's Remote ID on the right sidebar and click Connect, or click Start Hosting to share your screen.
                </p>
              </div>
            )}

            {/* Dialing Connection status modals */}
            {isConnecting && dialingStatus === 'calling' && (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 100 }}>
                <div className="card p-4 text-center animate-scale-in" style={{ width: '350px', border: '2.5px solid var(--brand-primary)', background: 'var(--bg-card)', color: 'var(--text-primary)', borderRadius: '16px' }}>
                  <RefreshCw size={44} className="text-warning mx-auto mb-3 spin" />
                  <h5 style={{ fontWeight: 800 }}>Connecting Handshake</h5>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.4 }}>
                    Pinging remote peer. Awaiting authorization confirmation...
                  </p>
                  <button className="btn btn-danger btn-sm w-100" style={{ fontWeight: 700 }} onClick={cancelConnectionRequest}>
                    Cancel Request
                  </button>
                </div>
              </div>
            )}

            {dialingStatus === 'timeout' && (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 100 }}>
                <div className="card p-4 text-center animate-scale-in" style={{ width: '350px', border: '2.5px solid #ef4444', background: 'var(--bg-card)', color: 'var(--text-primary)', borderRadius: '16px' }}>
                  <AlertCircle size={44} className="text-danger mx-auto mb-3" />
                  <h5 style={{ fontWeight: 800, color: '#ef4444' }}>Handshake Timeout</h5>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    No response was received from the host within 30 seconds.
                  </p>
                  <button className="btn btn-sm btn-secondary w-100" style={{ fontWeight: 700 }} onClick={() => setDialingStatus('idle')}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {dialingStatus === 'rejected' && (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.85)', zIndex: 100 }}>
                <div className="card p-4 text-center animate-scale-in" style={{ width: '350px', border: '2.5px solid #ef4444', background: 'var(--bg-card)', color: 'var(--text-primary)', borderRadius: '16px' }}>
                  <X size={44} className="text-danger mx-auto mb-3" />
                  <h5 style={{ fontWeight: 800, color: '#ef4444' }}>Request Rejected</h5>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    The host has rejected your remote access invitation.
                  </p>
                  <button className="btn btn-sm btn-secondary w-100" style={{ fontWeight: 700 }} onClick={() => setDialingStatus('idle')}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Handshake authorization request pop-up on host side */}
            {showIncomingRequest && incomingRequestData && (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0, 0, 0, 0.75)', zIndex: 100 }}>
                <div className="card p-4 animate-scale-in" style={{ width: (window as any).gsvDesktop ? '600px' : '380px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-card)', border: '2px solid var(--brand-primary)', color: 'var(--text-primary)', borderRadius: '16px' }}>
                  <div className="d-flex align-items-center gap-2 mb-3 text-warning">
                    <ShieldAlert size={28} />
                    <strong style={{ fontSize: '15px', fontWeight: 800 }}>Incoming Connection Request</strong>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.4 }}>
                    User <strong>{incomingRequestData.callerName}</strong> ({formatPhoneId(incomingRequestData.callerPhone)}) requests control access to this desktop.
                  </p>

                  {/* Share Content Selection (Only if running in Electron) */}
                  {(window as any).gsvDesktop && (
                    <div className="mb-3 p-3 rounded" style={{ background: 'var(--bg-secondary)', fontSize: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>Select Sharing Mode:</div>
                      
                      <div className="d-flex gap-4 mb-3">
                        <label className="d-flex align-items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="shareType"
                            checked={shareType === 'screen'}
                            onChange={() => {
                              setShareType('screen');
                              const screenSrc = desktopSources.find(s => s.id.startsWith('screen:'));
                              if (screenSrc) setSelectedSourceId(screenSrc.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: 600 }}>Share Entire Screen</span>
                        </label>
                        <label className="d-flex align-items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="shareType"
                            checked={shareType === 'window'}
                            onChange={() => {
                              setShareType('window');
                              const winSrc = desktopSources.find(s => s.id.startsWith('window:'));
                              if (winSrc) setSelectedSourceId(winSrc.id);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: 600 }}>Share Specific App Window</span>
                        </label>
                      </div>

                      {/* Sources Grid */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', 
                        gap: '10px', 
                        maxHeight: '180px', 
                        overflowY: 'auto',
                        padding: '4px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '6px'
                      }}>
                        {desktopSources
                          .filter(src => shareType === 'screen' ? src.id.startsWith('screen:') : src.id.startsWith('window:'))
                          .map(src => (
                            <div 
                              key={src.id}
                              onClick={() => setSelectedSourceId(src.id)}
                              style={{
                                border: `2px solid ${selectedSourceId === src.id ? 'var(--brand-primary)' : 'transparent'}`,
                                background: selectedSourceId === src.id ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-card)',
                                borderRadius: '6px',
                                padding: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'all 0.15s'
                              }}
                            >
                              <div style={{ width: '100%', height: '70px', background: '#000', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                {src.thumbnail ? (
                                  <img src={src.thumbnail} alt={src.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                ) : (
                                  <span style={{ fontSize: '20px' }}>🖥️</span>
                                )}
                              </div>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={src.name}>
                                {src.name}
                              </div>
                              {src.appIcon && (
                                <img src={src.appIcon} alt="" style={{ position: 'absolute', top: '4px', right: '4px', width: '14px', height: '14px', background: 'rgba(0,0,0,0.6)', borderRadius: '2px', padding: '1px' }} />
                              )}
                            </div>
                          ))}
                        {desktopSources.filter(src => shareType === 'screen' ? src.id.startsWith('screen:') : src.id.startsWith('window:')).length === 0 && (
                          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)' }}>
                            No sources available.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Permissions checkboxes */}
                  <div className="mb-3 p-3 rounded" style={{ background: 'var(--bg-secondary)', fontSize: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>Permissions Scope:</div>
                    <label className="d-flex align-items-center gap-2 mb-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={grantedPermissions.fullControl} 
                        onChange={e => setGrantedPermissions(p => ({ 
                          ...p, 
                          fullControl: e.target.checked,
                          keyboard: e.target.checked,
                          mouse: e.target.checked
                        }))} 
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 700 }}>Enable Keyboard & Mouse Control (Full Access)</span>
                    </label>

                    {/* Custom Nested Checkboxes */}
                    <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', borderLeft: '2px solid var(--border-color)' }}>
                      <label className="d-flex align-items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={grantedPermissions.keyboard} 
                          disabled={grantedPermissions.fullControl}
                          onChange={e => setGrantedPermissions(p => ({ ...p, keyboard: e.target.checked }))} 
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 600 }}>Allow Remote Keyboard Presses</span>
                      </label>
                      <label className="d-flex align-items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={grantedPermissions.mouse} 
                          disabled={grantedPermissions.fullControl}
                          onChange={e => setGrantedPermissions(p => ({ ...p, mouse: e.target.checked }))} 
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 600 }}>Allow Remote Mouse Pointer Overrides</span>
                      </label>
                    </div>

                    <label className="d-flex align-items-center gap-2 mt-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={grantedPermissions.fileTransfer} 
                        onChange={e => setGrantedPermissions(p => ({ ...p, fileTransfer: e.target.checked }))} 
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600 }}>Allow Clipboard Share & Sync</span>
                    </label>
                  </div>

                  {/* Session limit dropdown */}
                  <div className="mb-4" style={{ fontSize: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontWeight: 600 }}>Session Duration:</label>
                    <select 
                      value={sessionDuration} 
                      onChange={e => setSessionDuration(e.target.value)}
                      className="bg-dark text-white border-0 w-100 p-2 rounded"
                      style={{ border: '1px solid var(--border-color)', outline: 'none' }}
                    >
                      <option value="1h">1 Hour limit</option>
                      <option value="3h">3 Hours limit</option>
                      <option value="unlimited">Until closed</option>
                    </select>
                  </div>

                  <div className="d-flex gap-2">
                    <button className="btn btn-primary w-100 btn-md" style={{ fontWeight: 800 }} onClick={acceptRequest}>Accept</button>
                    <button className="btn btn-outline-danger w-100 btn-md" style={{ fontWeight: 800 }} onClick={rejectRequest}>Reject</button>
                  </div>
                </div>
              </div>
            )}

            {/* Floating Chat Panel Overlay */}
            {showFloatingChat && isExpandedView && (
              <div 
                className="animate-scale-in"
                style={{
                  position: 'absolute',
                  top: `${floatingChatPos.y}px`,
                  left: `${floatingChatPos.x}px`,
                  width: '340px',
                  height: '380px',
                  background: 'rgba(15, 23, 42, 0.97)',
                  backdropFilter: 'blur(16px)',
                  border: '1.5px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  zIndex: 35,
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)'
                }}
              >
                {/* Chat Header (draggable) */}
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingChat(true);
                    chatDragStartRef.current = {
                      x: e.clientX - floatingChatPos.x,
                      y: e.clientY - floatingChatPos.y
                    };
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'move',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <GripVertical size={14} style={{ color: '#475569' }} />
                    <MessageSquare size={14} style={{ color: '#60a5fa' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#e2e8f0' }}>
                      Team Chat — {activePartnerName || 'Session'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setShowFloatingChat(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Close Chat"
                    >
                      <X size={14} style={{ color: '#94a3b8' }} />
                    </button>
                  </div>
                </div>

                {/* Chat Messages */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {floatingChatMessages.map((msg, i) => (
                    <div key={i} style={{
                      alignSelf: msg.sender === 'me' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%'
                    }}>
                      <div style={{
                        background: msg.sender === 'me' 
                          ? 'linear-gradient(135deg, #6366f1, #4f46e5)' 
                          : msg.sender === 'system' 
                            ? 'rgba(255, 255, 255, 0.04)' 
                            : 'rgba(255, 255, 255, 0.08)',
                        color: msg.sender === 'system' ? '#94a3b8' : '#fff',
                        padding: '8px 12px',
                        borderRadius: msg.sender === 'me' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                        fontSize: '12px',
                        lineHeight: 1.4,
                        fontStyle: msg.sender === 'system' ? 'italic' : 'normal'
                      }}>
                        {msg.text}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: '#475569',
                        marginTop: '2px',
                        textAlign: msg.sender === 'me' ? 'right' : 'left'
                      }}>
                        {msg.time}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.02)'
                }}>
                  <input
                    type="text"
                    value={floatingChatInput}
                    onChange={(e) => setFloatingChatInput(e.target.value)}
                    onKeyUp={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter' && floatingChatInput.trim()) {
                        setFloatingChatMessages(prev => [...prev, {
                          sender: 'me',
                          text: floatingChatInput.trim(),
                          time: new Date().toLocaleTimeString()
                        }]);
                        // Send via data channel if available
                        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                          dataChannelRef.current.send(JSON.stringify({
                            type: 'chat',
                            text: floatingChatInput.trim(),
                            sender: user?.fullName || 'Remote User'
                          }));
                        }
                        setFloatingChatInput('');
                        // Simulate partner reply after brief delay
                        setTimeout(() => {
                          setFloatingChatMessages(prev => [...prev, {
                            sender: 'partner',
                            text: '✅ Message received.',
                            time: new Date().toLocaleTimeString()
                          }]);
                        }, 800);
                      }
                    }}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      color: '#e2e8f0',
                      outline: 'none',
                      fontWeight: 500
                    }}
                  />
                  <button
                    onClick={() => {
                      if (floatingChatInput.trim()) {
                        setFloatingChatMessages(prev => [...prev, {
                          sender: 'me',
                          text: floatingChatInput.trim(),
                          time: new Date().toLocaleTimeString()
                        }]);
                        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
                          dataChannelRef.current.send(JSON.stringify({
                            type: 'chat',
                            text: floatingChatInput.trim(),
                            sender: user?.fullName || 'Remote User'
                          }));
                        }
                        setFloatingChatInput('');
                        setTimeout(() => {
                          setFloatingChatMessages(prev => [...prev, {
                            sender: 'partner',
                            text: '✅ Message received.',
                            time: new Date().toLocaleTimeString()
                          }]);
                        }, 800);
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Send Message"
                  >
                    <Send size={14} style={{ color: '#fff' }} />
                  </button>
                </div>
              </div>
            )}

            {/* Bottom floating meeting controller */}
            {(isConnected || isHosting) && (
              <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 card p-2 d-flex flex-row gap-2 bg-dark bg-opacity-95 align-items-center animate-scale-in animate-pulse-border" style={{ border: '2.5px solid var(--brand-primary)', borderRadius: '12px', zIndex: 30 }}>
                <button 
                  onClick={toggleVoiceCall}
                  className={`btn btn-md btn-icon ${isVoiceChatEnabled ? 'btn-success' : 'btn-ghost'}`}
                  style={{ color: '#fff', width: '38px', height: '38px' }}
                  title="Voice Call Meeting"
                >
                  {isVoiceChatEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
                <button className="btn btn-ghost btn-md btn-icon" style={{ color: '#fff', width: '38px', height: '38px' }}><MousePointer2 size={18} /></button>
                
                <div style={{ borderRight: '2.5px solid rgba(255,255,255,0.2)', height: '24px', margin: '0 8px' }}></div>
                
                <button className="btn btn-danger btn-md px-3 py-2" style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px' }} onClick={() => terminateSession(false)}>
                  🚨 DISCONNECT (DOUBLE ESC)
                </button>
              </div>
            )}
            {/* Hidden Audio Player for WebRTC dynamic Voice Calls */}
            {remoteStream && (
              <audio
                ref={audioRef}
                autoPlay
                style={{ display: 'none' }}
              />
            )}
          </div>
        </div>

        {/* Right Column: AnyDesk controls (Bolder design, thicker borders, history list) */}
        <div className="col-lg-4 col-xl-3 d-flex flex-column gap-3">
          
          {/* Card 1: MY REMOTE ID */}
          <div className="card p-3 d-flex flex-column gap-2" style={{ background: 'var(--bg-card)', border: '2.5px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Network size={15} className="text-primary" /> MY REMOTE ID
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '1px', padding: '4px 0', borderBottom: '1px dashed var(--border-color)' }}>
              {formatPhoneId(user?.phone || user?.loginId)}
            </div>
            <button 
              className="btn btn-outline-primary btn-sm w-100 d-flex align-items-center justify-content-center gap-2 mt-1"
              style={{ fontWeight: 800, borderWidth: '1.5px' }}
              onClick={() => {
                navigator.clipboard.writeText(user?.phone || user?.loginId || '');
                toast.success('Remote ID copied to clipboard');
              }}
            >
              <Copy size={14} /> Copy ID
            </button>
          </div>

          {/* Card 2: Connect to Peer */}
          <div className="card p-3 d-flex flex-column gap-2" style={{ background: 'var(--bg-card)', border: '2.5px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 800 }}>Connect to Partner</strong>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Enter the Remote ID of the target PC</div>
            <select 
              className="form-select form-select-sm text-primary" 
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              disabled={isConnecting || isConnected || isHosting}
              style={{ 
                background: 'var(--bg-input)', 
                border: '2.5px solid var(--border-input)', 
                color: 'var(--text-primary)', 
                fontWeight: 800, 
                fontSize: '15px',
                height: '40px',
                borderRadius: '8px'
              }}
            >
              <option value="" disabled>Select a User to Connect...</option>
              {teammates.map((t) => (
                <option key={t.id} value={t.id}>{t.fullName} ({t.phone || t.loginId})</option>
              ))}
            </select>
            <button 
              className="btn w-100 d-flex align-items-center justify-content-center gap-2"
              disabled={!targetPhone || isConnecting || isHosting}
              onClick={initiateConnection}
              style={{
                background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                color: '#000',
                fontWeight: 900,
                fontSize: '13px',
                border: 'none',
                height: '40px',
                boxShadow: '0 4px 12px rgba(217,119,6,0.3)',
                borderRadius: '8px',
                letterSpacing: '0.5px'
              }}
            >
              <Play size={14} fill="#000" /> Connect Remote
            </button>
          </div>

          {/* Card 3: Host My Screen */}
          <div className="card p-3 d-flex flex-column gap-2" style={{ background: 'var(--bg-card)', border: '2.5px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 800 }}>Share Screen / Host</strong>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', fontWeight: 600 }}>
              Allow other team members to view and control your desktop workspace.
            </div>
            <button 
              className="btn btn-outline-success btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={startHostingManually}
              disabled={isConnecting || isHosting || isConnected}
              style={{ fontWeight: 800, height: '36px', borderWidth: '1.5px' }}
            >
              <Share2 size={13} /> Start Screen Host
            </button>
          </div>

          {/* Card 3.5: File Transfer Sync */}
          <div className="card p-3 d-flex flex-column gap-2" style={{ background: 'var(--bg-card)', border: '2.5px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 800 }}>File Transfer Sync</strong>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', fontWeight: 600 }}>
              Upload and sync files directly into the active remote host environment.
            </div>
            
            {isConnected ? (
              <div 
                className="d-flex flex-column align-items-center justify-content-center p-3 rounded text-center cursor-pointer transition-all"
                style={{
                  border: '2px dashed var(--brand-primary)',
                  background: 'rgba(59,130,246,0.05)',
                  position: 'relative'
                }}
              >
                <Download size={24} className="text-primary mb-2 animate-pulse" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Drag & Drop or Click to Upload</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>TXT, JSON, JS, PY, MD, PNG</span>
                <input 
                  type="file" 
                  onChange={handleFileUpload}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer'
                  }}
                />
              </div>
            ) : (
              <div 
                className="d-flex flex-column align-items-center justify-content-center p-3 rounded text-center"
                style={{
                  border: '2px dashed var(--border-color)',
                  background: 'var(--bg-secondary)',
                  opacity: 0.6
                }}
              >
                <AlertTriangle size={20} className="text-warning mb-2" />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>No Active Session Connected</span>
              </div>
            )}
          </div>

          {/* Card 4: Network Peers Directory */}
          <div className="card p-3 d-flex flex-column gap-2" style={{ background: 'var(--bg-card)', border: '2.5px solid var(--border-color)', borderRadius: '12px', minHeight: '160px', maxHeight: '240px', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} className="text-primary" /> Active Teammates
              </span>
              <span className="badge bg-secondary text-white" style={{ fontSize: '10px', fontWeight: 700 }}>{onlinePeers.length} online</span>
            </div>

            <div className="d-flex flex-column gap-2 mt-2">
              {teammates.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>No peers available</div>
              ) : (
                teammates.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => {
                      if (t.isOnline) {
                        setTargetPhone(t.id);
                        toast.success(`Target ID set to ${t.fullName}`);
                      } else {
                        toast.error(`${t.fullName} is offline`);
                      }
                    }}
                    className="p-2 border rounded cursor-pointer d-flex align-items-center justify-content-between transition-all hover-peer-row"
                    style={{
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      borderWidth: '1.5px',
                      opacity: t.isOnline ? 1 : 0.55
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block', fontWeight: 700 }}>{t.fullName}</strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{formatPhoneId(t.phone || t.loginId)}</span>
                    </div>
                    <span 
                      style={{ 
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: t.isOnline ? 'var(--brand-success)' : '#94a3b8',
                        display: 'block'
                      }} 
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 5: Connection History Logs */}
          <div className="card p-3 d-flex flex-column gap-2 flex-grow-1" style={{ background: 'var(--bg-card)', border: '2.5px solid var(--border-color)', borderRadius: '12px', minHeight: '160px', overflowY: 'auto', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
            <div className="border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} className="text-warning" /> Connection History
              </span>
            </div>
            <div className="d-flex flex-column gap-2 mt-2">
              {connectionHistory.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '20px 0' }}>No history records</div>
              ) : (
                connectionHistory.map(log => (
                  <div 
                    key={log.id} 
                    className="p-2 border rounded d-flex justify-content-between align-items-center"
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', fontSize: '11px' }}
                  >
                    <div style={{ minWidth: 0, flex: 1, paddingRight: '6px' }}>
                      <div className="d-flex align-items-center gap-1 flex-wrap">
                        <span className={`badge ${log.type === 'Incoming' ? 'bg-primary' : 'bg-info'}`} style={{ fontSize: '8px', padding: '1px 3px' }}>
                          {log.type}
                        </span>
                        <strong className="text-truncate" style={{ maxWidth: '100px' }} title={log.peerName}>{log.peerName}</strong>
                      </div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '10px', marginTop: '2px' }}>
                        {log.timestamp} • <span style={{ 
                          fontWeight: 700,
                          color: log.status === 'Accepted' ? '#10b981' : log.status === 'Rejected' ? '#ef4444' : '#eab308'
                        }}>{log.status}</span>
                      </div>
                    </div>
                    <button 
                      className="btn btn-link p-0 text-danger" 
                      onClick={(e) => deleteHistoryEntry(log.id, e)}
                      style={{ border: 'none', background: 'transparent' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* STUN Configuration modal */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="modal animate-scale-in" style={{ maxWidth: '440px', background: 'var(--bg-modal)', border: '2px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1.5px solid var(--border-color)' }}>
              <h5 className="modal-title" style={{ fontWeight: 800 }}>WebRTC Network Setup</h5>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowConfigModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Quality Constraint</label>
                <select 
                  className="form-control" 
                  value={config.resolution} 
                  onChange={e => setConfig(prev => ({ ...prev, resolution: e.target.value }))}
                  style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px' }}
                >
                  <option value="720p">720p HD (Low bandwidth)</option>
                  <option value="1080p">1080p FHD (Default)</option>
                  <option value="4k">4K UHD (Lossless)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Framerate Target</label>
                <select 
                  className="form-control" 
                  value={config.fps} 
                  onChange={e => setConfig(prev => ({ ...prev, fps: e.target.value }))}
                  style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px' }}
                >
                  <option value="30">30 FPS (Standard)</option>
                  <option value="60">60 FPS (Fluid)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>STUN Server URI</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={config.stunServer} 
                  onChange={e => setConfig(prev => ({ ...prev, stunServer: e.target.value }))}
                  style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'monospace', padding: '6px' }}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Google Sheets Directory Sync ID</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. 1a2b3c4d5e6f..."
                  value={googleSheetId} 
                  onChange={e => setGoogleSheetId(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'monospace', padding: '6px' }}
                />
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>
                  Syncs your offline active directory to google sheets in real-time.
                </span>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1.5px solid var(--border-color)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowConfigModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => { localStorage.setItem('gsv-google-sheet-id', googleSheetId); setShowConfigModal(false); toast.success('STUN details and Google Sheets sync ID saved.'); }}>Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* Guided Agent Auto-Installer Modal */}
      {showInstallerModal && (
        <div className="modal-backdrop" onClick={() => setShowInstallerModal(false)}>
          <div className="modal animate-scale-in" style={{ maxWidth: '520px', background: 'var(--bg-modal)', border: '2px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '16px', padding: 0 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1.5px solid var(--border-color)', padding: '16px 20px' }}>
              <h5 className="modal-title" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🖥️ GSV Desktop Agent Auto-Installer
              </h5>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowInstallerModal(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {installerStep === 'detecting' && (
                <div style={{ textAlign: 'center', padding: '30px 10px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                  <div className="animate-spin" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid rgba(99, 102, 241, 0.1)', borderTopColor: 'var(--brand-primary)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Detecting client hardware and environment loopback ports...
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    PWA Bridge API initialized. Querying system installer daemon...
                  </div>
                </div>
              )}

              {installerStep === 'error_sandbox' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px', padding: '12px', color: '#ef4444', display: 'flex', gap: '10px', alignItems: 'flex-start'
                  }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <div>
                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '2px' }}>Browser Sandbox Restricts Direct Installation</strong>
                      <span style={{ fontSize: '12px', lineHeight: 1.4, display: 'block', color: 'var(--text-secondary)' }}>
                        Modern web security standard sandboxing prevents executing or installing local programs directly from raw web pages. Active loopback agent setup must be manually triggered.
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    1. Select target OS to download corresponding agent:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {[
                      { key: 'Windows', icon: '🖥️', title: 'Windows Agent', desc: 'x64 Setup .exe / Portable' },
                      { key: 'Android', icon: '📱', title: 'Android Client', desc: 'Direct Package .apk' },
                      { key: 'macOS', icon: '🍎', title: 'macOS Client', desc: 'Disk Image .dmg' },
                      { key: 'iOS', icon: '🌐', title: 'iOS PWA App', desc: 'Homescreen Link' }
                    ].map(os => (
                      <div
                        key={os.key}
                        onClick={() => setSelectedInstallerOS(os.key as any)}
                        style={{
                          padding: '12px', borderRadius: '10px', border: `1.5px solid ${selectedInstallerOS === os.key ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                          background: selectedInstallerOS === os.key ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                          cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>{os.icon}</div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{os.title}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{os.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start'
                  }}>
                    <span>ℹ️</span>
                    <span>
                      {selectedInstallerOS === 'iOS' 
                        ? 'For iOS: Open Safari, tap Share, and choose "Add to Home Screen" to install the PWA.' 
                        : `This will download the GSVOffice ${selectedInstallerOS} setup binary and simulate a local installer launch and loopback port registration.`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowInstallerModal(false)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" style={{ background: 'var(--gradient-brand)', border: 'none' }} onClick={() => {
                      if (selectedInstallerOS === 'iOS') {
                        toast.success('PWA instructions shown. Follow the iOS steps.');
                        setShowInstallerModal(false);
                      } else {
                        setInstallerStep('terms_conditions');
                      }
                    }}>
                      Download & Install Agent
                    </button>
                  </div>
                </div>
              )}

              {installerStep === 'terms_conditions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    End User License Agreement & Terms of Service
                  </div>
                  
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5
                  }}>
                    <strong>1. Scope of Agreement</strong>
                    <br />
                    This license governs your use of the GSV Office Remote Desktop Agent. It enables screen mirroring, peripheral inputs, clipboard sync, and file transfer functionality between authenticated workstations.
                    <br /><br />
                    <strong>2. Security & Authorized Use</strong>
                    <br />
                    Connections are protected via P2P WebRTC tunnels. Uninvited control override requires host authorization confirmation. You agree to use this client solely for business administration and remote technical overrides.
                    <br /><br />
                    <strong>3. Local Area Discoverability</strong>
                    <br />
                    By enabling discoverability, your machine registers with the local subnet router to allow colleagues on the same LAN network to ping and query remote control requests.
                  </div>

                  <label className="d-flex align-items-center gap-2 cursor-pointer" style={{ fontSize: '13px', margin: '6px 0' }}>
                    <input 
                      type="checkbox" 
                      checked={termsAccepted} 
                      onChange={e => setTermsAccepted(e.target.checked)} 
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontWeight: 600 }}>I accept the terms and conditions</span>
                  </label>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setInstallerStep('error_sandbox')}>Back</button>
                    <button 
                      className="btn btn-primary btn-sm" 
                      disabled={!termsAccepted}
                      onClick={() => setInstallerStep('permissions_select')}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {installerStep === 'permissions_select' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Configure Remote Access Permissions
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    Select which capabilities will be permitted. Users connecting to your ID will request these permissions:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', maxHeight: '200px', overflowY: 'auto' }}>
                    {[
                      { key: 'screen', title: 'Desktop Screen Recording', desc: 'Allows capture and streaming of local display' },
                      { key: 'keyboard', title: 'Remote Keyboard Keystrokes', desc: 'Allows typing keystroke overrides' },
                      { key: 'mouse', title: 'Remote Mouse Pointer Control', desc: 'Allows pointer overrides and clicking actions' },
                      { key: 'file', title: 'File Access & File Transfer', desc: 'Allows transferring files to/from current workstation' },
                      { key: 'clipboard', title: 'Clipboard Synchronization', desc: 'Allows synchronization of copy/paste buffers' },
                      { key: 'printer', title: 'Printer Requests & Peripherals', desc: 'Allows remote print job requests and peripheral querying' },
                    ].map(perm => (
                      <label key={perm.key} className="d-flex align-items-start gap-3 cursor-pointer" style={{ fontSize: '12px' }}>
                        <input 
                          type="checkbox" 
                          checked={(requestedPerms as any)[perm.key]} 
                          onChange={e => setRequestedPerms(p => ({ ...p, [perm.key]: e.target.checked }))}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', marginTop: '2px' }}
                        />
                        <div>
                          <strong style={{ display: 'block', color: 'var(--text-primary)', fontWeight: 700 }}>{perm.title}</strong>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{perm.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setInstallerStep('terms_conditions')}>Back</button>
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => {
                        setInstallerStep('installing');
                        setInstallerProgress(0);
                      }}
                    >
                      Install & Configure
                    </button>
                  </div>
                </div>
              )}

              {installerStep === 'installing' && (
                <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                    <span>Installing GSV Office Local Agent...</span>
                    <span>{installerProgress}%</span>
                  </div>
                  
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${installerProgress}%`, height: '100%', background: 'var(--gradient-brand)', borderRadius: '4px', transition: 'width 0.1s linear' }} />
                  </div>

                  <div style={{
                    background: '#090d16', border: '1px solid var(--border-color)', borderRadius: '8px',
                    padding: '12px', fontFamily: 'monospace', fontSize: '11px', color: '#4ade80',
                    minHeight: '44px', display: 'flex', alignItems: 'center'
                  }}>
                    <span>{installerLog}</span>
                  </div>
                </div>
              )}

              {installerStep === 'success' && (
                <div style={{ textAlign: 'center', padding: '10px', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '24px' }}>
                    ✓
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                      Agent Installation Succeeded!
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      The GSV Office {selectedInstallerOS} Agent service is active and running in the background. Natively simulated OS-level keyboard, mouse, and coordinate bindings are fully active on port 23489.
                    </p>
                  </div>

                  <button className="btn btn-primary btn-sm w-100" style={{ background: '#10b981', border: 'none', fontWeight: 700 }} onClick={() => {
                    setLocalAgentActive(true);
                    localStorage.setItem('gsv-local-agent-active', 'true');
                    setShowInstallerModal(false);
                    toast.success('Agent activated successfully! 🖥️');
                  }}>
                    Complete Setup & Active Control
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-peer-row:hover {
          background: var(--bg-hover) !important;
          border-color: var(--brand-primary) !important;
        }
        .animate-pulse-border {
          animation: pulseBorder 2s infinite;
        }
        @keyframes pulseBorder {
          0% { border-color: var(--brand-primary); }
          50% { border-color: #ef4444; }
          100% { border-color: var(--brand-primary); }
        }
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

    </div>
  );
}
