import { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Play, Square, Settings, Share2, 
  MousePointer2, Keyboard, ShieldAlert, Cpu, Network,
  Volume2, Sliders, RefreshCw, X, Radio, Eye, FileCode2,
  Download, Copy, ClipboardCopy, ShieldCheck, AlertCircle, 
  AlertTriangle, Folder, HardDrive, Terminal, Users, Phone,
  Mic, MicOff, Shield, CheckSquare, Clock, ChevronDown, ChevronUp, Link, Trash2, Maximize,
  Search, Tag, Info, Power, Activity, Server, FileText, Smartphone, Usb, Printer, Wifi,
  FolderOpen, Plus, FileUp, Edit2, PlayCircle, StopCircle, Video, List, CheckCircle, Flame, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/auth.store';
import { usersApi, devicesApi } from '../../api';
import { useThemeStore } from '../../store/theme.store';
import { io, Socket } from 'socket.io-client';

// ── MOCK SYSTEM DATA FOR HIGH-FIDELITY RMM SIMULATION ──────────────────

interface MockApp {
  name: string;
  version: string;
  publisher: string;
  size: string;
  installedOn: string;
}

const INSTALLED_APPLICATIONS: MockApp[] = [
  { name: 'Google Chrome', version: '120.0.6099.129', publisher: 'Google LLC', size: '482 MB', installedOn: '2026-01-15' },
  { name: 'Microsoft Office LTSC Professional Plus 2021', version: '16.0.14332.20624', publisher: 'Microsoft Corporation', size: '2.45 GB', installedOn: '2026-02-10' },
  { name: 'Git v2.43.0', version: '2.43.0', publisher: 'The Git Development Team', size: '112 MB', installedOn: '2026-01-20' },
  { name: 'Node.js v20.11.0', version: '20.11.0', publisher: 'Node.js Foundation', size: '89 MB', installedOn: '2026-03-01' },
  { name: 'VS Code', version: '1.87.2', publisher: 'Microsoft Corporation', size: '360 MB', installedOn: '2026-03-15' },
  { name: 'AnyDesk', version: '7.1.13', publisher: 'AnyDesk Software GmbH', size: '42 MB', installedOn: '2026-02-18' },
  { name: 'GSV RMM Client Agent', version: '1.4.2', publisher: 'GSV R&D', size: '15.4 MB', installedOn: '2026-06-03' }
];

interface USBDevice {
  name: string;
  class: string;
  status: 'active' | 'suspended' | 'disconnected';
  speed: string;
}

const USB_DEVICES: USBDevice[] = [
  { name: 'Logitech USB Optical Mouse', class: 'HID (Mouse)', status: 'active', speed: '12 Mbps (USB 1.1)' },
  { name: 'Dell Wired Keyboard KB216', class: 'HID (Keyboard)', status: 'active', speed: '1.5 Mbps (USB 1.0)' },
  { name: 'HP LaserJet Pro MFP M127fn', class: 'Printer', status: 'active', speed: '480 Mbps (USB 2.0)' },
  { name: 'Intel Wireless Bluetooth Controller', class: 'Bluetooth Host Controller', status: 'active', speed: '12 Mbps (USB 1.1)' },
  { name: 'Realtek USB Gigabit Ethernet Adapter', class: 'Network', status: 'suspended', speed: '5.0 Gbps (USB 3.0)' },
  { name: 'Yubikey 5 NFC Security Key', class: 'Smart Card Reader', status: 'active', speed: '12 Mbps (USB 1.1)' }
];

interface NetworkAdapter {
  name: string;
  ipv4: string;
  mac: string;
  status: 'connected' | 'disconnected';
  speed: string;
}

const NETWORK_ADAPTERS: NetworkAdapter[] = [
  { name: 'Ethernet Connection (Intel I219-V)', ipv4: '192.168.0.231', mac: 'F8:E4:3B:56:C2:23', status: 'connected', speed: '1.0 Gbps' },
  { name: 'Intel Wi-Fi 6 AX201', ipv4: '192.168.0.232', mac: 'F8:E4:3B:56:C2:24', status: 'disconnected', speed: '2.4 Gbps' },
  { name: 'OpenVPN TAP-Windows Adapter V9', ipv4: '10.8.0.14', mac: '00:FF:28:C2:E0:41', status: 'connected', speed: '100 Mbps' }
];

interface SystemDriver {
  name: string;
  provider: string;
  version: string;
  date: string;
}

const INSTALLED_DRIVERS: SystemDriver[] = [
  { name: 'NVIDIA GeForce RTX 3060 Driver', provider: 'NVIDIA', version: '551.61', date: '2026-02-15' },
  { name: 'Intel Chipset Device Software', provider: 'Intel', version: '10.1.18793.8276', date: '2025-08-10' },
  { name: 'Realtek High Definition Audio Driver', provider: 'Realtek', version: '6.0.9621.1', date: '2026-01-08' },
  { name: 'Intel Rapid Storage Technology', provider: 'Intel', version: '19.5.2.1049', date: '2025-11-12' }
];

interface EventLog {
  time: string;
  source: string;
  id: number;
  level: 'Information' | 'Warning' | 'Error';
  message: string;
}

const EVENT_VIEWER_LOGS: EventLog[] = [
  { time: '03:15:24 AM', source: 'Service Control Manager', id: 7036, level: 'Information', message: 'The Print Spooler service entered the running state.' },
  { time: '03:00:10 AM', source: 'Windows Update Client', id: 19, level: 'Information', message: 'Installation Successful: Windows successfully installed the security update (KB5034123).' },
  { time: '02:45:12 AM', source: 'Microsoft-Windows-Security-Auditing', id: 4625, level: 'Warning', message: 'An account failed to log on. Logon Type: 3, Source Network Address: 192.168.0.104' },
  { time: '02:30:19 AM', source: 'Disk', id: 51, level: 'Error', message: 'An error was detected on device \\Device\\Harddisk0\\DR0 during a paging operation.' },
  { time: '02:15:00 AM', source: 'GSV RMM Agent', id: 100, level: 'Information', message: 'RMM Agent connection successfully established with signaling gateway server.' }
];

// ── WEB SCREEN CAPTURE FALLBACK FOR SIMULATION ─────────────────────────

function createMockStream(): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  
  let animationFrameId = 0;
  let frame = 0;

  const draw = () => {
    if (!ctx) return;
    frame++;

    // Base background
    const grad = ctx.createRadialGradient(640, 360, 50, 640, 360, 600);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);
    
    // Tech grids
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1280; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke();
    }
    for (let y = 0; y < 720; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke();
    }
    
    // Interactive mock applications and workspace details
    ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.fillRect(80, 80, 200, 120);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(80, 80, 200, 120);

    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(90, 95, 30, 30);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('GSV-RMM-Agent.exe', 130, 115);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('PID: 4096 • RUNNING', 90, 145);
    ctx.fillText('CPU: 0.8% • RAM: 15.4MB', 90, 160);

    // Center Console Display
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(340, 180, 600, 360);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(340, 180, 600, 360);
    
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 20px Courier New, monospace';
    ctx.fillText('🛡️ GSV ENTERPRISE RMM AGENT CONSOLE', 380, 230);
    
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px sans-serif';
    ctx.fillText('Status: Connected (Interactive RMM Simulation)', 380, 280);
    ctx.fillText(`OS Platform: Windows 11 Enterprise x64`, 380, 310);
    ctx.fillText(`Hardware Acceleration: DXVA2 Active`, 380, 340);
    
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 15px Courier New, monospace';
    ctx.fillText(`Target OS Time: ${new Date().toLocaleString()}`, 380, 390);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '13px monospace';
    const cpuLevel = 15 + Math.sin(frame * 0.05) * 5;
    ctx.fillText(`Live Telemetry Status: CPU: ${cpuLevel.toFixed(1)}% | Net Latency: 14ms`, 380, 435);

    // Animated mouse cursor simulation
    const cursorX = 640 + Math.cos(frame * 0.02) * 200;
    const cursorY = 360 + Math.sin(frame * 0.03) * 150;
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(cursorX, cursorY);
    ctx.lineTo(cursorX + 10, cursorY + 15);
    ctx.lineTo(cursorX + 3, cursorY + 15);
    ctx.closePath();
    ctx.fill();

    animationFrameId = requestAnimationFrame(draw);
  };
  
  draw();
  
  try {
    let stream: MediaStream;
    if ((canvas as any).captureStream) {
      stream = (canvas as any).captureStream(30);
    } else {
      stream = new MediaStream();
    }
    
    (stream as any)._animationId = animationFrameId;
    return stream;
  } catch (e) {
    console.error('Error in createMockStream:', e);
    return new MediaStream();
  }
}

export default function RemoteDesktopPage() {
  const { user, accessToken } = useAuthStore();
  const { theme } = useThemeStore();
  const [socket, setSocket] = useState<Socket | null>(null);

  // General views
  const [activeView, setActiveView] = useState<'inventory' | 'console'>('inventory');
  const [isConnecting, setIsConnecting] = useState(false);
  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [selectedConsoleTab, setSelectedConsoleTab] = useState<'screen' | 'terminal' | 'processes' | 'software' | 'files' | 'peripherals' | 'health'>('screen');
  const [deviceList, setDeviceList] = useState<any[]>([]);
  const [teammates, setTeammates] = useState<any[]>([]);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<'All' | 'Servers' | 'Workstations' | 'Virtual Machines'>('All');

  // Pair New Device Modal
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [pairingDeviceName, setPairingDeviceName] = useState('');
  const [pairingDeviceGroup, setPairingDeviceGroup] = useState('Workstations');
  const [pairingDeviceOS, setPairingDeviceOS] = useState('Windows 11 Pro');
  const [pairingDeviceIP, setPairingDeviceIP] = useState('192.168.0.');
  const [pairingDeviceMAC, setPairingDeviceMAC] = useState('');

  // WebRTC & Stream variables
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHosting, setIsHosting] = useState(false);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [activePartnerName, setActivePartnerName] = useState<string>('');
  
  // Real-time quality metrics state
  const [streamFps, setStreamFps] = useState(30);
  const [streamBitrate, setStreamBitrate] = useState('1.8 Mbps');
  const [packetLoss, setPacketLoss] = useState('0.0%');
  const [activeMonitor, setActiveMonitor] = useState('Monitor 1 (Primary 1920x1080)');
  const [resolutionTarget, setResolutionTarget] = useState('1080p');
  const [gpuAccelActive, setGpuAccelActive] = useState(true);

  // Screen Session Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedSessions, setRecordedSessions] = useState<{ id: string; name: string; date: string; length: string }[]>([]);
  const [showPlaybackModal, setShowPlaybackModal] = useState(false);
  const [playbackSessionName, setPlaybackSessionName] = useState('');
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Interlock override state
  const [isControlLocked, setIsControlLocked] = useState(false);

  // Auto-Repair tool
  const [isAutoRepairActive, setIsAutoRepairActive] = useState(false);
  const [autoRepairLogs, setAutoRepairLogs] = useState<string[]>([]);
  const [isScreenFrozen, setIsScreenFrozen] = useState(false);

  // Console Terminal
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // File explorer path & state
  const [currentFolderPath, setCurrentFolderPath] = useState('C:\\Users\\gsv-admin\\Documents');
  const [fileExplorerFiles, setFileExplorerFiles] = useState<any[]>([]);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileUploadProgress, setFileUploadProgress] = useState<number | null>(null);
  const [fileDownloadProgress, setFileDownloadProgress] = useState<number | null>(null);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsState, setPermissionsState] = useState({ owner: 'gsv-admin', read: true, write: true, execute: false });

  // Peripheral states
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isCameraSimulated, setIsCameraSimulated] = useState(false);
  const micIntervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // System Health live data history
  const [cpuHistory, setCpuHistory] = useState<number[]>(new Array(30).fill(15));
  const [ramHistory, setRamHistory] = useState<number[]>(new Array(30).fill(42));
  const [gpuHistory, setGpuHistory] = useState<number[]>(new Array(30).fill(8));
  const healthCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Wake-on-LAN status
  const [isWakingDevice, setIsWakingDevice] = useState<string | null>(null);

  // Local/Remote streams and WebRTC connection refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Connection History Logs state
  const [connectionHistory, setConnectionHistory] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gsv-rmm-history') || '[]');
    } catch {
      return [];
    }
  });

  // Fetch paired devices from backend database
  const fetchDevices = async () => {
    try {
      const res = await devicesApi.getAll();
      if (res.data?.success) {
        setDeviceList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load RMM devices:', err);
    }
  };

  // Fetch users for legacy P2P directory
  const fetchTeammates = async () => {
    try {
      const res = await usersApi.getDirectory();
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setTeammates(list);
    } catch (e) {
      console.error('Failed to fetch teammates:', e);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchTeammates();
    const interval = setInterval(() => {
      fetchDevices();
      // Randomize history graph metrics slightly to show real-time changes
      setCpuHistory(prev => [...prev.slice(1), Math.max(2, Math.min(98, prev[prev.length - 1] + Math.floor(Math.random() * 11) - 5))]);
      setRamHistory(prev => [...prev.slice(1), Math.max(10, Math.min(95, prev[prev.length - 1] + Math.floor(Math.random() * 5) - 2))]);
      setGpuHistory(prev => [...prev.slice(1), Math.max(0, Math.min(100, prev[prev.length - 1] + Math.floor(Math.random() * 7) - 3))]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Sync video streams to video element
  useEffect(() => {
    if (videoRef.current) {
      if (remoteStream) {
        videoRef.current.srcObject = remoteStream;
      } else if (localStream) {
        videoRef.current.srcObject = localStream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [videoRef.current, remoteStream, localStream]);

  // Canvas drawing effect for health graphs
  useEffect(() => {
    if (selectedConsoleTab === 'health' && activeView === 'console' && healthCanvasRef.current) {
      const canvas = healthCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animId: number;
      const draw = () => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grids
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 40) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 30) {
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
        }

        // Helper to draw waves
        const drawWave = (data: number[], color: string, fillGrad: [string, string]) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          const step = canvas.width / (data.length - 1);
          data.forEach((val, index) => {
            const x = index * step;
            const y = canvas.height - (val / 100) * canvas.height;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // Fill area
          ctx.lineTo(canvas.width, canvas.height);
          ctx.lineTo(0, canvas.height);
          ctx.closePath();
          const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
          grad.addColorStop(0, fillGrad[0]);
          grad.addColorStop(1, fillGrad[1]);
          ctx.fillStyle = grad;
          ctx.fill();
        };

        // Draw CPU, RAM, GPU
        drawWave(cpuHistory, '#3b82f6', ['rgba(59, 130, 246, 0.25)', 'rgba(59, 130, 246, 0)']);
        drawWave(ramHistory, '#10b981', ['rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0)']);
        drawWave(gpuHistory, '#f59e0b', ['rgba(245, 158, 11, 0.25)', 'rgba(245, 158, 11, 0)']);

        animId = requestAnimationFrame(draw);
      };
      draw();
      return () => cancelAnimationFrame(animId);
    }
  }, [selectedConsoleTab, activeView, cpuHistory, ramHistory, gpuHistory]);

  // Populate file list based on path changes
  const loadFilesForPath = (path: string) => {
    let mockList = [];
    if (path === 'C:\\') {
      mockList = [
        { name: 'Program Files', isFolder: true, modified: '2026-06-01 10:24 AM', permissions: 'rx-r--r--' },
        { name: 'Users', isFolder: true, modified: '2026-06-02 04:12 PM', permissions: 'rwxr-xr-x' },
        { name: 'Windows', isFolder: true, modified: '2026-06-03 09:30 AM', permissions: 'rx-r-----' },
        { name: 'gsv_rmm_agent.exe', isFolder: false, size: '2.0 MB', modified: '2026-06-04 03:00 AM', permissions: 'rwxrwxr-x' },
        { name: 'config.json', isFolder: false, size: '4.8 KB', modified: '2026-06-04 02:45 AM', permissions: 'rw-rw-r--' }
      ];
    } else if (path === 'C:\\Program Files') {
      mockList = [
        { name: 'GSV-Agent', isFolder: true, modified: '2026-06-03 11:10 PM', permissions: 'rwxr-xr-x' },
        { name: 'Google', isFolder: true, modified: '2026-04-18 10:00 AM', permissions: 'rx-r--r--' },
        { name: 'Microsoft Office', isFolder: true, modified: '2026-05-01 02:30 PM', permissions: 'rx-r--r--' }
      ];
    } else if (path === 'C:\\Program Files\\GSV-Agent') {
      mockList = [
        { name: 'gsv-rmm-agent.exe', isFolder: false, size: '2.0 MB', modified: '2026-06-04 03:00 AM', permissions: 'rwxrwxr-x' },
        { name: 'config.json', isFolder: false, size: '4.8 KB', modified: '2026-06-04 02:45 AM', permissions: 'rw-rw-r--' },
        { name: 'logs.txt', isFolder: false, size: '458 KB', modified: '2026-06-04 03:01 AM', permissions: 'rw-r--r--' }
      ];
    } else if (path === 'C:\\Users') {
      mockList = [
        { name: 'gsv-admin', isFolder: true, modified: '2026-06-04 01:12 AM', permissions: 'rwxr-xr-x' },
        { name: 'Public', isFolder: true, modified: '2026-01-01 12:00 AM', permissions: 'rwxr-xr-x' }
      ];
    } else if (path === 'C:\\Users\\gsv-admin') {
      mockList = [
        { name: 'Desktop', isFolder: true, modified: '2026-06-04 02:00 AM', permissions: 'rwxr-xr-x' },
        { name: 'Documents', isFolder: true, modified: '2026-06-04 01:30 AM', permissions: 'rwxr-xr-x' },
        { name: 'Downloads', isFolder: true, modified: '2026-06-03 11:22 PM', permissions: 'rwxr-xr-x' },
        { name: 'credentials.txt', isFolder: false, size: '1.2 KB', modified: '2026-06-04 01:15 AM', permissions: 'rw-------' }
      ];
    } else if (path === 'C:\\Users\\gsv-admin\\Documents') {
      mockList = [
        { name: 'audit_logs.xlsx', isFolder: false, size: '1.2 MB', modified: '2026-05-15 04:00 PM', permissions: 'rw-rw-r--' },
        { name: 'truenas_dataset_config.json', isFolder: false, size: '4.8 KB', modified: '2026-06-01 02:00 PM', permissions: 'rw-r--r--' },
        { name: 'readme_deployment.txt', isFolder: false, size: '15 KB', modified: '2026-06-03 11:45 PM', permissions: 'rw-r--r--' }
      ];
    } else {
      mockList = [
        { name: 'System32', isFolder: true, modified: '2026-06-04 03:00 AM', permissions: 'rx-r-----' },
        { name: 'regedit.exe', isFolder: false, size: '348 KB', modified: '2026-01-01 12:00 AM', permissions: 'rx-r-----' }
      ];
    }
    setFileExplorerFiles(mockList);
  };

  useEffect(() => {
    loadFilesForPath(currentFolderPath);
  }, [currentFolderPath]);

  // Terminal command executor
  const executeTerminalCommand = (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    const parts = cmd.split(' ');
    const base = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    let reply = '';
    switch (base) {
      case 'help':
        reply = 'Available diagnostics commands:\n  help         - Show diagnostic terminal commands\n  ipconfig     - Show host IP configuration\n  systeminfo   - Show complete operating system and hardware configuration\n  dir / ls     - List contents of current folder\n  cd <dir>     - Navigate folder structure\n  cat <file>   - Read target file content\n  get-service  - Fetch status of Windows core services\n  get-process  - Fetch processes active with system specs\n  ping <ip>    - Test remote connection packets latency\n  whoami       - Display active login context\n  clear / cls  - Flush terminal stdout';
        break;
      case 'clear':
      case 'cls':
        setTerminalLogs([]);
        setTerminalInput('');
        return;
      case 'ipconfig':
        reply = `Windows IP Configuration\n\nEthernet adapter Ethernet0:\n   Connection-specific DNS Suffix  . : localdomain\n   IPv4 Address. . . . . . . . . . . : ${selectedDevice?.ipAddress || '192.168.0.231'}\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.0.1`;
        break;
      case 'systeminfo':
        reply = `Host Name:                 ${selectedDevice?.name || 'GSV-RMM-ENDPOINT'}\nOS Name:                   ${selectedDevice?.osVersion || 'Microsoft Windows 11 Enterprise'}\nOS Version:                10.0.22631 N/A Build 22631\nProcessor(s):              ${selectedDevice?.cpuModel || 'Intel Core i7'}\nTotal Physical Memory:     16,318 MB\nAntivirus Protection:      ${selectedDevice?.antivirus || 'Active Defender'}`;
        break;
      case 'whoami':
        reply = 'gsv-rmm-system\\administrator';
        break;
      case 'get-service':
        reply = 'Status   Name               DisplayName\n------   ----               -----------\nRunning  Spooler            Print Spooler\nStopped  wuauserv           Windows Update\nRunning  gsv-rmm-agent      GSV RMM Agent Service\nRunning  Dnscache           DNS Client';
        break;
      case 'get-process':
        reply = 'Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  ProcessName\n-------  ------    -----      -----     ------     --  -----------\n    241      15    12044      28402       1.24   4096  gsv-rmm-agent.exe\n    840      34    84092     124800       4.88   1402  chrome.exe\n    120      10     4200       8504       0.11      4  System';
        break;
      case 'cd':
        if (!args) {
          reply = currentFolderPath;
        } else if (args === '..') {
          const idx = currentFolderPath.lastIndexOf('\\');
          if (idx > 2) {
            const next = currentFolderPath.substring(0, idx);
            setCurrentFolderPath(next);
            reply = `Directory changed to ${next}`;
          } else if (currentFolderPath !== 'C:\\') {
            setCurrentFolderPath('C:\\');
            reply = 'Directory changed to C:\\';
          } else {
            reply = 'Already at root folder level.';
          }
        } else {
          // Check if folder exists
          const cleanDir = args.replace(/['"]/g, '');
          const match = fileExplorerFiles.find(f => f.isFolder && f.name.toLowerCase() === cleanDir.toLowerCase());
          if (match) {
            const next = currentFolderPath === 'C:\\' ? `C:\\${match.name}` : `${currentFolderPath}\\${match.name}`;
            setCurrentFolderPath(next);
            reply = `Directory changed to ${next}`;
          } else {
            reply = `Error: Folder '${args}' not found in current path.`;
          }
        }
        break;
      case 'dir':
      case 'ls':
        reply = `Directory of ${currentFolderPath}\n\n` + fileExplorerFiles.map(f => {
          const type = f.isFolder ? '<DIR>' : f.size;
          return `${f.modified.padEnd(20)} ${type.padEnd(10)} ${f.name}`;
        }).join('\n');
        break;
      case 'cat':
        if (!args) {
          reply = 'Usage: cat <filename>';
        } else {
          const matchFile = fileExplorerFiles.find(f => !f.isFolder && f.name.toLowerCase() === args.toLowerCase());
          if (matchFile) {
            reply = `Reading file: ${matchFile.name} (${matchFile.size})\n-------------------------------\n`;
            if (matchFile.name === 'config.json') {
              reply += JSON.stringify({
                agentVersion: '1.4.2',
                serverUrl: 'https://gsv-office-rmm.local',
                pairingToken: 'tok_8d7c2a1e948b',
                checkIntervalSeconds: 15,
                logLevel: 'debug'
              }, null, 2);
            } else if (matchFile.name === 'credentials.txt') {
              reply += 'ADMIN_PASS=GsvAdminSecure2026!\nSIGNAL_KEY=7c8d9e2a1b0c4f\nPOSTGRES_PWD=tank_storage_pass';
            } else {
              reply += `GSV Office diagnostic database details\nDate: ${new Date().toLocaleDateString()}\nStatus: PASS\nLogs written: 1,492 events.`;
            }
          } else {
            reply = `Error: File '${args}' not found.`;
          }
        }
        break;
      case 'ping':
        reply = `Pinging ${args || '192.168.0.1'} with 32 bytes of data:\nReply from ${args || '192.168.0.1'}: bytes=32 time=14ms TTL=128\nReply from ${args || '192.168.0.1'}: bytes=32 time=12ms TTL=128\n\nPing statistics:\n    Packets: Sent = 2, Received = 2, Lost = 0 (0% loss)`;
        break;
      default:
        reply = `'${base}' is not recognized as an internal or external command, operable program or batch file. Type 'help' for diagnostics.`;
    }

    setTerminalLogs(prev => [...prev, `C:\\Users\\administrator>${cmd}`, reply]);
    setTerminalInput('');
  };

  // Connect to target RMM Endpoint Device
  const handleConnectDevice = async (device: any) => {
    setSelectedDevice(device);
    setSelectedConsoleTab('screen');
    setIsConnecting(true);
    addLog(`Initiating RMM secure tunneling channel to ${device.name}...`);
    
    // Simulate connection delay
    setTimeout(() => {
      setIsConnecting(false);
      setActiveView('console');
      setIsConnected(true);
      setActivePartnerName(device.name);
      
      const stream = createMockStream();
      setRemoteStream(stream);

      // Add audit log
      const newAudit = {
        peerName: device.name,
        peerPhone: device.ipAddress,
        type: 'Outgoing',
        status: 'Accepted'
      };
      const updated = [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('en-IN'),
          ...newAudit
        },
        ...connectionHistory
      ];
      localStorage.setItem('gsv-rmm-history', JSON.stringify(updated));
      setConnectionHistory(updated);

      toast.success(`Connected to RMM Agent on ${device.name}!`);
    }, 1200);
  };

  // Wake-on-LAN simulation
  const handleWakeOnLan = (device: any) => {
    setIsWakingDevice(device.id);
    toast.success(`Wake-on-LAN magic packet sent to MAC ${device.macAddress || 'F8:E4:3B:56:C2:23'}`);
    setTimeout(() => {
      setIsWakingDevice(null);
      // Change device status to online in database
      devicesApi.updateMetrics(device.id, {
        cpuUsage: 12.4,
        ramUsage: 38.2,
        status: 'online'
      }).then(() => {
        fetchDevices();
        toast.success(`${device.name} is now booting online.`);
      });
    }, 3000);
  };

  // Disconnect Console
  const handleDisconnect = () => {
    if (remoteStream) {
      const animId = (remoteStream as any)._animationId;
      if (animId) cancelAnimationFrame(animId);
      remoteStream.getTracks().forEach(t => t.stop());
    }
    setRemoteStream(null);
    setIsConnected(false);
    setActiveView('inventory');
    setSelectedDevice(null);
    if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    if (micStream) micStream.getTracks().forEach(t => t.stop());
    setWebcamStream(null);
    setMicStream(null);
    if (micIntervalIdRef.current) clearInterval(micIntervalIdRef.current);
    toast.success('RMM connection terminated.');
  };

  // Auto-Repair Black Screen tool
  const triggerAutoRepair = () => {
    setIsAutoRepairActive(true);
    setAutoRepairLogs([]);
    setIsScreenFrozen(false);
    
    const steps = [
      'Step 1/5: Requesting intra-frame updates from remote display manager...',
      'Step 2/5: Validating display resolution & multi-monitor coordinates...',
      'Step 3/5: Forcing WebRTC ICE connection re-negotiation...',
      'Step 4/5: Fallback to software encoding (H.264 / CPU rendering)...',
      'Step 5/5: Resetting video capture frame buffer...'
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setAutoRepairLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step} SUCCESS`]);
        if (index === steps.length - 1) {
          setIsAutoRepairActive(false);
          toast.success('Display stream successfully recovered!');
        }
      }, (index + 1) * 800);
    });
  };

  // Session Recording functions
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      toast.success('RMM Session recording saved.');
      // Add to recorded list
      setRecordedSessions(prev => [
        {
          id: `rec-${Date.now()}`,
          name: `RMM_Session_${selectedDevice?.name || 'Device'}_${new Date().toLocaleDateString()}.webm`,
          date: new Date().toLocaleDateString(),
          length: `${Math.floor(recordingDuration / 60)}m ${recordingDuration % 60}s`
        },
        ...prev
      ]);
    } else {
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
      toast.success('Recording remote console desktop feed.');
    }
  };

  // Keyboard shortcut actions
  const sendCtrlAltDel = () => {
    setTerminalLogs(prev => [...prev, `[SYSTEM] Dispatched remote: Ctrl+Alt+Del interrupt signal.`]);
    toast.success('Ctrl+Alt+Del signal injected.');
  };

  // Drag and Drop simulation
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      setFileUploadProgress(10);
      let p = 10;
      const interval = setInterval(() => {
        p += 25;
        setFileUploadProgress(p);
        if (p >= 100) {
          clearInterval(interval);
          setFileUploadProgress(null);
          toast.success(`Uploaded ${file.name} successfully to ${currentFolderPath}!`);
          setFileExplorerFiles(prev => [
            { name: file.name, isFolder: false, size: `${(file.size / 1024).toFixed(1)} KB`, modified: new Date().toLocaleString(), permissions: 'rw-r--r--' },
            ...prev
          ]);
        }
      }, 300);
    }
  };

  // File explorer actions
  const handleCreateFolder = () => {
    const name = prompt('Enter folder name:');
    if (name) {
      setFileExplorerFiles(prev => [
        { name, isFolder: true, modified: new Date().toLocaleString(), permissions: 'rwxr-xr-x' },
        ...prev
      ]);
      toast.success(`Folder '${name}' created.`);
    }
  };

  const handleRenameFile = (index: number) => {
    const file = fileExplorerFiles[index];
    const newName = prompt(`Rename ${file.name} to:`, file.name);
    if (newName) {
      const updated = [...fileExplorerFiles];
      updated[index] = { ...file, name: newName, modified: new Date().toLocaleString() };
      setFileExplorerFiles(updated);
      toast.success('Item renamed successfully.');
    }
  };

  const handleDeleteFile = (index: number) => {
    if (confirm(`Are you sure you want to delete ${fileExplorerFiles[index].name}?`)) {
      setFileExplorerFiles(prev => prev.filter((_, i) => i !== index));
      toast.success('Item removed.');
    }
  };

  const handleDownloadFile = (file: any) => {
    setFileDownloadProgress(10);
    let p = 10;
    const interval = setInterval(() => {
      p += 30;
      setFileDownloadProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setFileDownloadProgress(null);
        toast.success(`Downloaded ${file.name} from remote host.`);
      }
    }, 250);
  };

  // Process & Service actions
  const [activeProcesses, setActiveProcesses] = useState<any[]>([]);
  const [activeServices, setActiveServices] = useState<any[]>([]);

  useEffect(() => {
    if (selectedDevice) {
      const meta = selectedDevice.metadata || {};
      setActiveProcesses(meta.processes || [
        { pid: 4, name: 'System', cpu: 0.1, ram: 0.1 },
        { pid: 140, name: 'svchost.exe', cpu: 0.4, ram: 1.2 },
        { pid: 884, name: 'explorer.exe', cpu: 1.8, ram: 3.5 },
        { pid: 2048, name: 'gsv-rmm-agent.exe', cpu: 1.1, ram: 0.9 }
      ]);
      setActiveServices(meta.services || [
        { name: 'Print Spooler', state: 'running', startup: 'Automatic' },
        { name: 'Windows Update', state: 'stopped', startup: 'Manual' },
        { name: 'GSV RMM Agent Service', state: 'running', startup: 'Automatic' }
      ]);
    }
  }, [selectedDevice]);

  const handleKillProcess = async (pid: number) => {
    const updated = activeProcesses.filter(p => p.pid !== pid);
    setActiveProcesses(updated);
    
    if (selectedDevice) {
      const updatedMetadata = {
        ...(selectedDevice.metadata || {}),
        processes: updated
      };
      try {
        await devicesApi.update(selectedDevice.id, { metadata: updatedMetadata });
        toast.success(`Process PID ${pid} terminated.`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleService = async (serviceName: string) => {
    const updated = activeServices.map(s => {
      if (s.name === serviceName) {
        return { ...s, state: s.state === 'running' ? 'stopped' : 'running' };
      }
      return s;
    });
    setActiveServices(updated);
    
    if (selectedDevice) {
      const updatedMetadata = {
        ...(selectedDevice.metadata || {}),
        services: updated
      };
      try {
        await devicesApi.update(selectedDevice.id, { metadata: updatedMetadata });
        toast.success(`Service '${serviceName}' status updated.`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Webcam & Audio diagnostics
  const startWebcamTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setWebcamStream(stream);
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }
      setIsCameraSimulated(false);
      toast.success('Webcam diagnostic preview started!');
    } catch (err) {
      console.warn('Webcam failed, starting simulated camera:', err);
      setIsCameraSimulated(true);
      toast.success('Simulated test patterns activated.');
    }
  };

  const startMicTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
      }, 100);
      
      micIntervalIdRef.current = interval;
      toast.success('Microphone diagnostic input test active.');
    } catch (err) {
      console.error('Mic failed:', err);
      toast.error('Microphone access denied or not found.');
    }
  };

  const stopWebcamTest = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach(t => t.stop());
    }
    setWebcamStream(null);
    setIsCameraSimulated(false);
  };

  const stopMicTest = () => {
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
    }
    setMicStream(null);
    setMicLevel(0);
    if (micIntervalIdRef.current) clearInterval(micIntervalIdRef.current);
  };

  const handlePairNewDevice = async () => {
    if (!pairingDeviceName) {
      toast.error('Device name is required');
      return;
    }
    try {
      const res = await devicesApi.register({
        name: pairingDeviceName,
        group: pairingDeviceGroup,
        osVersion: pairingDeviceOS,
        ipAddress: pairingDeviceIP,
        macAddress: pairingDeviceMAC || '00:1A:2B:3C:4D:5E',
        status: 'online',
        cpuModel: 'Intel Core i5-11400 @ 2.60GHz',
        cpuUsage: 8.4,
        ramTotal: 17179869184,
        ramUsage: 32.1,
        diskTotal: 512110190592,
        diskUsage: 41.5,
        antivirus: 'Windows Defender Antivirus',
        windowsUpdate: 'Up to Date',
        metadata: {
          services: [
            { name: 'Print Spooler', state: 'running', startup: 'Automatic' },
            { name: 'GSV RMM Agent Service', state: 'running', startup: 'Automatic' }
          ],
          processes: [
            { pid: 104, name: 'System', cpu: 0.1, ram: 0.1 },
            { pid: 2048, name: 'gsv-rmm-agent.exe', cpu: 0.5, ram: 0.8 }
          ]
        }
      });
      if (res.data?.success) {
        toast.success(`Device '${pairingDeviceName}' paired successfully via secure token!`);
        setIsPairingModalOpen(false);
        setPairingDeviceName('');
        fetchDevices();
      }
    } catch (err) {
      console.error(err);
      toast.error('Registration failed.');
    }
  };

  const handleTriggerPowerAction = async (action: string) => {
    if (!selectedDevice) return;
    try {
      const res = await devicesApi.triggerAction(selectedDevice.id, action);
      if (res.data?.success) {
        toast.success(res.data.message);
        if (action === 'shutdown' || action === 'reboot') {
          handleDisconnect();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter devices
  const filteredDevices = deviceList.filter(dev => {
    const matchesSearch = dev.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          dev.ipAddress?.includes(searchQuery) ||
                          (dev.tags && dev.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesGroup = selectedGroup === 'All' || dev.group === selectedGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', color: 'var(--text-primary)', padding: '4px' }}>
      
      {/* ── HEADER SECTION ────────────────────────────────────────────────── */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity className="text-primary" /> GSV Enterprise RMM Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, fontWeight: 500 }}>
            Unified Remote Monitoring, WebRTC screen synchronization, and system control dashboard
          </p>
        </div>
        
        {activeView === 'inventory' ? (
          <div className="d-flex gap-2">
            <button className="btn btn-primary btn-sm d-flex align-items-center gap-2" style={{ fontWeight: 700 }} onClick={() => setIsPairingModalOpen(true)}>
              <Plus size={14} /> Pair Agent Device
            </button>
          </div>
        ) : (
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center gap-2 px-3 py-1.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} className="animate-pulse" />
              <span style={{ fontSize: '12px', fontWeight: 700 }}>{selectedDevice?.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({selectedDevice?.ipAddress})</span>
            </div>
            <button className="btn btn-outline-danger btn-sm" style={{ fontWeight: 700 }} onClick={handleDisconnect}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* ── 1. DEVICE INVENTORY DASHBOARD (DEFAULT VIEW) ────────────────────── */}
      {activeView === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          
          {/* Filters Bar */}
          <div className="card p-3 d-flex flex-row flex-wrap justify-content-between align-items-center gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            {/* Search */}
            <div className="position-relative" style={{ width: '280px' }}>
              <Search size={16} className="position-absolute top-50 translate-middle-y start-3 text-secondary" style={{ left: '12px' }} />
              <input 
                type="text" 
                className="form-control form-control-sm text-primary" 
                placeholder="Search devices, IP, tags..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'var(--bg-input)', border: '1.5px solid var(--border-input)', paddingLeft: '36px', borderRadius: '8px', height: '36px', fontWeight: 600 }}
              />
            </div>
            
            {/* Group Tabs */}
            <div className="d-flex gap-1">
              {(['All', 'Servers', 'Workstations', 'Virtual Machines'] as const).map(grp => (
                <button
                  key={grp}
                  className={`btn btn-sm ${selectedGroup === grp ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontWeight: 700, fontSize: '12px', borderRadius: '6px' }}
                  onClick={() => setSelectedGroup(grp)}
                >
                  {grp}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of paired devices */}
          <div className="row g-3">
            {filteredDevices.map(dev => {
              const isOnline = dev.status === 'online';
              return (
                <div key={dev.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
                  <div className="card p-3 d-flex flex-column gap-3 transition-all hover-peer-row" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', minHeight: '220px', position: 'relative' }}>
                    
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>{dev.name}</h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{dev.ipAddress}</span>
                      </div>
                      <span className={`badge ${isOnline ? 'bg-success' : 'bg-secondary'}`} style={{ fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isOnline ? <Play size={8} fill="#fff" /> : <Square size={8} />} {dev.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Hardware specs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                      <div className="d-flex align-items-center gap-1.5 text-secondary">
                        <Monitor size={12} /> <span className="text-truncate">{dev.osVersion}</span>
                      </div>
                      <div className="d-flex align-items-center gap-1.5 text-secondary">
                        <Cpu size={12} /> <span className="text-truncate">{dev.cpuModel || 'Intel CPU'}</span>
                      </div>
                    </div>

                    {/* Progress meters for online devices */}
                    {isOnline ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                          <div className="d-flex justify-content-between text-secondary" style={{ fontSize: '10px', fontWeight: 700, marginBottom: '2px' }}>
                            <span>CPU ({dev.cpuUsage}%)</span>
                            <span>RAM ({dev.ramUsage}%)</span>
                          </div>
                          <div className="d-flex gap-1">
                            <div className="progress w-100" style={{ height: '4px', background: 'rgba(255,255,255,0.05)' }}>
                              <div className="progress-bar bg-primary" style={{ width: `${dev.cpuUsage}%` }}></div>
                            </div>
                            <div className="progress w-100" style={{ height: '4px', background: 'rgba(255,255,255,0.05)' }}>
                              <div className="progress-bar bg-success" style={{ width: `${dev.ramUsage}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center justify-content-center p-3 rounded" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Offline. Diagnostic agent asleep.</span>
                      </div>
                    )}

                    {/* Tags */}
                    {dev.tags && dev.tags.length > 0 && (
                      <div className="d-flex flex-wrap gap-1">
                        {dev.tags.map((t: string) => (
                          <span key={t} className="badge bg-secondary text-light-secondary" style={{ fontSize: '9px', fontWeight: 700 }}>#{t}</span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="d-flex gap-2 mt-auto" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      {isOnline ? (
                        <>
                          <button className="btn btn-primary btn-sm w-100" style={{ fontWeight: 700, fontSize: '11px' }} onClick={() => handleConnectDevice(dev)}>
                            Connect Console
                          </button>
                          <button className="btn btn-outline-primary btn-sm btn-icon" onClick={() => toast.success(`Ping: 12ms`)}>
                            <Radio size={12} />
                          </button>
                        </>
                      ) : (
                        <button 
                          className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-1"
                          style={{ fontWeight: 700, fontSize: '11px' }}
                          onClick={() => handleWakeOnLan(dev)}
                          disabled={isWakingDevice === dev.id}
                        >
                          <Power size={11} /> {isWakingDevice === dev.id ? 'Waking...' : 'Wake on LAN'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connection history panel */}
          <div className="card p-3 mt-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} className="text-warning" /> Connection History & Auditing
            </h3>
            <div className="table-responsive">
              <table className="table table-dark table-hover" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Target Endpoint</th>
                    <th>IP / Code Address</th>
                    <th>Role Mode</th>
                    <th>Audit Status</th>
                    <th>Connection Date</th>
                  </tr>
                </thead>
                <tbody>
                  {connectionHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary py-3">No audits recorded. Connect to start tracking.</td>
                    </tr>
                  ) : (
                    connectionHistory.map((log: any) => (
                      <tr key={log.id}>
                        <td style={{ fontWeight: 700 }}>{log.peerName}</td>
                        <td style={{ fontFamily: 'monospace' }}>{log.peerPhone}</td>
                        <td>
                          <span className={`badge ${log.type === 'Incoming' ? 'bg-primary' : 'bg-info'}`}>{log.type}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: log.status === 'Accepted' ? '#10b981' : log.status === 'Rejected' ? '#ef4444' : '#f59e0b' }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{log.timestamp}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. RMM CONSOLE VIEW (DURING INTERACTIVE SESSION) ──────────────── */}
      {activeView === 'console' && selectedDevice && (
        <div className="row g-3 flex-grow-1" style={{ minHeight: '580px' }}>
          
          {/* Left Navigation Console Sidebar */}
          <div className="col-12 col-md-3 col-xl-2 d-flex flex-column gap-1.5">
            <button 
              onClick={() => handleDisconnect()}
              className="btn btn-outline-secondary btn-sm mb-3 d-flex align-items-center justify-content-center gap-1.5"
              style={{ fontWeight: 700 }}
            >
              ← Inventory List
            </button>

            {[
              { id: 'screen', label: 'Screen Stream', icon: Monitor },
              { id: 'terminal', label: 'Terminal Shell', icon: Terminal },
              { id: 'processes', label: 'Process / Service', icon: Sliders },
              { id: 'software', label: 'App Management', icon: FileCode2 },
              { id: 'files', label: 'File Explorer', icon: FolderOpen },
              { id: 'peripherals', label: 'Peripheral Diag', icon: Usb },
              { id: 'health', label: 'System Health', icon: Activity }
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedConsoleTab(tab.id as any)}
                  className={`btn btn-sm text-start d-flex align-items-center gap-2.5 py-2.5 px-3 ${selectedConsoleTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}
                >
                  <IconComp size={15} /> {tab.label}
                </button>
              );
            })}

            {/* Quick Actions Panel */}
            <div className="card p-2.5 mt-3 d-flex flex-column gap-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)' }}>POWER & OS CONTROLS</span>
              <button className="btn btn-outline-danger btn-sm text-start" style={{ fontSize: '11px', fontWeight: 700 }} onClick={() => handleTriggerPowerAction('lock')}>
                🔒 Lock Workstation
              </button>
              <button className="btn btn-outline-danger btn-sm text-start" style={{ fontSize: '11px', fontWeight: 700 }} onClick={() => handleTriggerPowerAction('logoff')}>
                🚪 Log Off Session
              </button>
              <button className="btn btn-outline-danger btn-sm text-start" style={{ fontSize: '11px', fontWeight: 700 }} onClick={() => handleTriggerPowerAction('reboot')}>
                🔄 Restart System
              </button>
              <button className="btn btn-outline-danger btn-sm text-start" style={{ fontSize: '11px', fontWeight: 700 }} onClick={() => handleTriggerPowerAction('shutdown')}>
                🛑 Force Shutdown
              </button>
            </div>
          </div>

          {/* Right Console Workspace */}
          <div className="col-12 col-md-9 col-xl-10 d-flex flex-column">
            
            {/* TAB 1: SCREEN STREAM */}
            {selectedConsoleTab === 'screen' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                
                {/* Controller Settings Bar */}
                <div className="card p-2.5 d-flex flex-row flex-wrap justify-content-between align-items-center gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  
                  {/* Select Monitor */}
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>Monitor:</span>
                    <select 
                      value={activeMonitor} 
                      onChange={e => setActiveMonitor(e.target.value)}
                      className="bg-dark text-white border-0 p-1.5 rounded"
                      style={{ fontSize: '11px', border: '1px solid var(--border-color)', outline: 'none', fontWeight: 700 }}
                    >
                      <option>Monitor 1 (Primary 1920x1080)</option>
                      <option>Monitor 2 (Dell U2720Q 2560x1440)</option>
                      <option>Virtual Workspace Display (1280x720)</option>
                    </select>
                  </div>

                  {/* Resolution & Codecs */}
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <div className="d-flex align-items-center gap-2">
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>Resolution:</span>
                      <select 
                        value={resolutionTarget}
                        onChange={e => setResolutionTarget(e.target.value)}
                        className="bg-dark text-white border-0 p-1.5 rounded"
                        style={{ fontSize: '11px', border: '1px solid var(--border-color)', outline: 'none', fontWeight: 700 }}
                      >
                        <option value="720p">720p HD (Low bandwidth)</option>
                        <option value="1080p">1080p FHD (Lossless)</option>
                        <option value="4k">4k UHD (High Latency)</option>
                      </select>
                    </div>

                    <label className="d-flex align-items-center gap-1.5 cursor-pointer" style={{ fontSize: '11px', fontWeight: 700 }}>
                      <input 
                        type="checkbox" 
                        checked={gpuAccelActive} 
                        onChange={e => setGpuAccelActive(e.target.checked)} 
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Hardware Acceleration Fallback</span>
                    </label>
                  </div>

                  {/* Recording and Ctrl+Alt+Del */}
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1.5" style={{ fontWeight: 700 }} onClick={sendCtrlAltDel}>
                      <Keyboard size={13} /> Send Ctrl+Alt+Del
                    </button>
                    
                    <button 
                      className={`btn btn-sm d-flex align-items-center gap-1.5 ${isRecording ? 'btn-danger animate-pulse' : 'btn-outline-danger'}`} 
                      style={{ fontWeight: 700 }}
                      onClick={toggleRecording}
                    >
                      {isRecording ? <StopCircle size={13} /> : <Video size={13} />}
                      {isRecording ? `Recording (${recordingDuration}s)` : 'Record Session'}
                    </button>
                  </div>
                </div>

                {/* Viewport Frame */}
                <div 
                  ref={viewportRef}
                  onDragOver={handleDragOver}
                  onDrop={handleDropFile}
                  className="card p-0 overflow-hidden bg-black position-relative d-flex align-items-center justify-content-center flex-grow-1" 
                  style={{ 
                    minHeight: '440px', 
                    border: '2px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    boxShadow: 'inset 0 4px 30px rgba(0,0,0,0.85)'
                  }}
                >
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-100 h-100" 
                    style={{ objectFit: 'contain', display: isScreenFrozen ? 'none' : 'block' }} 
                  />
                  
                  {isScreenFrozen && (
                    <div className="text-center p-5">
                      <AlertTriangle size={48} className="text-warning mx-auto mb-3" />
                      <h5 style={{ fontWeight: 800, color: '#f59e0b' }}>Desktop Frame Not Rendering</h5>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>WebRTC handshake established but frame feed is black. Run Auto-Repair.</p>
                    </div>
                  )}

                  {/* Drag and drop overlay banner */}
                  {fileUploadProgress !== null && (
                    <div className="position-absolute bottom-3 right-3 card p-3 animate-scale-in" style={{ background: '#1e293b', border: '1.5px solid var(--brand-primary)', width: '260px', borderRadius: '10px', zIndex: 10 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', display: 'block', marginBottom: '6px' }}>Uploading File...</span>
                      <div className="progress" style={{ height: '6px' }}>
                        <div className="progress-bar bg-primary" style={{ width: `${fileUploadProgress}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stream statistics drawer */}
                <div className="card p-3 d-flex flex-row justify-content-between align-items-center flex-wrap gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '11px' }}>
                  <div className="d-flex gap-4 flex-wrap">
                    <span><strong>Codec:</strong> {gpuAccelActive ? 'H.264 (NVIDIA NVENC)' : 'VP8 Software'}</span>
                    <span><strong>FPS Target:</strong> {streamFps} Hz</span>
                    <span><strong>Latency:</strong> 12ms (P2P Tunnel)</span>
                    <span><strong>Bitrate:</strong> {streamBitrate}</span>
                    <span><strong>Packet Loss:</strong> {packetLoss}</span>
                  </div>

                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-warning btn-sm d-flex align-items-center gap-1.5" style={{ fontWeight: 700 }} onClick={triggerAutoRepair} disabled={isAutoRepairActive}>
                      <RefreshCw size={13} className={isAutoRepairActive ? 'spin' : ''} /> Auto-Repair Black Screen
                    </button>
                    
                    <button className="btn btn-ghost btn-sm" style={{ fontWeight: 700, color: '#3b82f6' }} onClick={() => setIsScreenFrozen(!isScreenFrozen)}>
                      Simulate Screen Failure
                    </button>
                  </div>
                </div>

                {/* Diagnostic Auto-Repair Log History */}
                {autoRepairLogs.length > 0 && (
                  <div className="p-2.5 rounded font-monospace" style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', fontSize: '10px', color: '#10b981', maxHeight: '100px', overflowY: 'auto' }}>
                    <div style={{ fontWeight: 800, marginBottom: '4px', color: '#60a5fa' }}>SYSTEM DIAGNOSTIC RUNS:</div>
                    {autoRepairLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INTERACTIVE POWERYSHELL / CMD TERMINAL */}
            {selectedConsoleTab === 'terminal' && (
              <div className="d-flex flex-column flex-grow-1" style={{ minHeight: '400px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '6px 12px', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}>
                    <Terminal size={14} /> SYSTEM CONSOLE SHELL (POWERSHELL / CMD)
                  </span>
                  <button className="btn btn-xs btn-ghost text-white" onClick={() => setTerminalLogs([])}>Clear Console</button>
                </div>
                <div 
                  style={{ 
                    flex: 1, background: '#020617', padding: '12px', fontFamily: 'monospace', 
                    fontSize: '13px', color: '#22c55e', overflowY: 'auto', maxHeight: '420px', minHeight: '320px',
                    borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', border: '1.5px solid #1e293b', borderTop: 'none'
                  }}
                >
                  <div style={{ color: '#cbd5e1', marginBottom: '8px' }}>Windows PowerShell v7.4.2<br />Copyright (C) Microsoft Corporation. All rights reserved.<br />Type 'help' to list available system diagnostics commands.<br /></div>
                  {terminalLogs.map((lg, i) => (
                    <div key={i} style={{ whiteSpace: 'pre-wrap', marginBottom: '6px' }}>{lg}</div>
                  ))}
                  <div className="d-flex align-items-center gap-1.5 mt-2">
                    <span style={{ color: '#cbd5e1' }}>C:\Users\administrator&gt;</span>
                    <input 
                      type="text" 
                      className="flex-grow-1 bg-transparent border-0 text-success font-monospace"
                      value={terminalInput}
                      onChange={e => setTerminalInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') executeTerminalCommand(terminalInput); }}
                      style={{ outline: 'none', color: '#22c55e' }}
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PROCESS & WINDOWS SERVICE MANAGER */}
            {selectedConsoleTab === 'processes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* Process List */}
                <div className="card p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={15} className="text-primary" /> Active Tasks & Running Processes
                  </h3>
                  <div className="table-responsive" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    <table className="table table-dark table-hover" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>PID</th>
                          <th>Process Name</th>
                          <th>CPU Usage</th>
                          <th>RAM Footprint</th>
                          <th className="text-end">Command</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeProcesses.map((proc: any) => (
                          <tr key={proc.pid}>
                            <td style={{ fontFamily: 'monospace' }}>{proc.pid}</td>
                            <td style={{ fontWeight: 700 }}>{proc.name}</td>
                            <td>{proc.cpu || 0.5}%</td>
                            <td>{proc.ram || 12.4} MB</td>
                            <td className="text-end">
                              <button className="btn btn-outline-danger btn-xs" style={{ fontWeight: 700 }} onClick={() => handleKillProcess(proc.pid)}>
                                Force Kill
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Services List */}
                <div className="card p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sliders size={15} className="text-warning" /> Core System Windows Services
                  </h3>
                  <div className="table-responsive" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    <table className="table table-dark table-hover" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Service Name</th>
                          <th>Status</th>
                          <th>Startup Type</th>
                          <th className="text-end">Control</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeServices.map((svc: any) => {
                          const isRunning = svc.state === 'running';
                          return (
                            <tr key={svc.name}>
                              <td style={{ fontWeight: 700 }}>{svc.name}</td>
                              <td>
                                <span className={`badge ${isRunning ? 'bg-success' : 'bg-secondary'}`}>
                                  {svc.state.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>{svc.startup}</td>
                              <td className="text-end">
                                <button 
                                  className={`btn btn-xs ${isRunning ? 'btn-outline-danger' : 'btn-success'}`}
                                  style={{ fontWeight: 700 }}
                                  onClick={() => handleToggleService(svc.name)}
                                >
                                  {isRunning ? 'Stop Service' : 'Start Service'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SOFTWARE MANAGER */}
            {selectedConsoleTab === 'software' && (
              <div className="card p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 style={{ fontSize: '13px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileCode2 size={15} className="text-primary" /> Paired Installed Applications
                  </h3>
                  <button className="btn btn-primary btn-sm" style={{ fontWeight: 700 }} onClick={() => toast.success('Silent installation agent triggered.')}>
                    + Deploy Software Package
                  </button>
                </div>
                <div className="table-responsive">
                  <table className="table table-dark table-hover" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Application Name</th>
                        <th>Publisher</th>
                        <th>Installed Date</th>
                        <th>Size Footprint</th>
                        <th className="text-end">Operation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {INSTALLED_APPLICATIONS.map(app => (
                        <tr key={app.name}>
                          <td style={{ fontWeight: 700 }}>{app.name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{app.publisher}</td>
                          <td>{app.installedOn}</td>
                          <td>{app.size}</td>
                          <td className="text-end">
                            <button className="btn btn-outline-danger btn-xs" style={{ fontWeight: 700 }} onClick={() => toast.success(`Uninstallation sequence dispatched silently for ${app.name}.`)}>
                              Uninstall
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: FILE EXPLORER */}
            {selectedConsoleTab === 'files' && (
              <div className="card p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                
                {/* Explorer Header */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom pb-3 mb-3" style={{ borderColor: 'var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <Folder size={14} /> Path: <strong style={{ color: '#fff' }}>{currentFolderPath}</strong>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary btn-sm" style={{ fontWeight: 700 }} onClick={() => {
                      const idx = currentFolderPath.lastIndexOf('\\');
                      if (idx > 2) setCurrentFolderPath(currentFolderPath.substring(0, idx));
                      else if (currentFolderPath !== 'C:\\') setCurrentFolderPath('C:\\');
                    }}>
                      ← Go Up
                    </button>
                    <button className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1.5" style={{ fontWeight: 700 }} onClick={handleCreateFolder}>
                      <Plus size={13} /> New Folder
                    </button>
                    <label className="btn btn-primary btn-sm d-flex align-items-center gap-1.5 cursor-pointer" style={{ fontWeight: 700, margin: 0 }}>
                      <FileUp size={13} /> Upload File
                      <input 
                        type="file" 
                        style={{ display: 'none' }} 
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFileUploadProgress(10);
                            let p = 10;
                            const interval = setInterval(() => {
                              p += 25;
                              setFileUploadProgress(p);
                              if (p >= 100) {
                                clearInterval(interval);
                                setFileUploadProgress(null);
                                toast.success(`Uploaded ${file.name} successfully to ${currentFolderPath}!`);
                                setFileExplorerFiles(prev => [
                                  { name: file.name, isFolder: false, size: `${(file.size / 1024).toFixed(1)} KB`, modified: new Date().toLocaleString(), permissions: 'rw-r--r--' },
                                  ...prev
                                ]);
                              }
                            }, 250);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Progress Meters */}
                {fileUploadProgress !== null && (
                  <div className="alert alert-info py-2 px-3 mb-3" style={{ fontSize: '12px', fontWeight: 600 }}>
                    📤 Upload progress: {fileUploadProgress}%...
                  </div>
                )}
                {fileDownloadProgress !== null && (
                  <div className="alert alert-success py-2 px-3 mb-3" style={{ fontSize: '12px', fontWeight: 600 }}>
                    📥 Download progress: {fileDownloadProgress}%...
                  </div>
                )}

                {/* Explorer File list */}
                <div className="table-responsive">
                  <table className="table table-dark table-hover" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Modified</th>
                        <th>Permissions</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fileExplorerFiles.map((file, idx) => (
                        <tr key={idx} className="cursor-pointer" onDoubleClick={() => {
                          if (file.isFolder) {
                            const next = currentFolderPath === 'C:\\' ? `C:\\${file.name}` : `${currentFolderPath}\\${file.name}`;
                            setCurrentFolderPath(next);
                          }
                        }}>
                          <td style={{ fontWeight: 700 }} className="text-white">
                            {file.isFolder ? '📁' : '📄'} {file.name}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{file.isFolder ? 'Folder' : 'File'}</td>
                          <td>{file.isFolder ? '—' : file.size}</td>
                          <td>{file.modified}</td>
                          <td style={{ fontFamily: 'monospace' }}>{file.permissions}</td>
                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-1">
                              {!file.isFolder && (
                                <button className="btn btn-outline-primary btn-xs btn-icon" onClick={() => handleDownloadFile(file)} title="Download">
                                  <Download size={11} />
                                </button>
                              )}
                              <button className="btn btn-outline-warning btn-xs btn-icon" onClick={() => handleRenameFile(idx)} title="Rename">
                                <Edit2 size={11} />
                              </button>
                              <button className="btn btn-outline-danger btn-xs btn-icon" onClick={() => handleDeleteFile(idx)} title="Delete">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 6: PERIPHERAL DIAGNOSTICS */}
            {selectedConsoleTab === 'peripherals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* Camera and Microphone Live Diagnostic Tools */}
                <div className="row g-3">
                  {/* Camera */}
                  <div className="col-12 col-md-6">
                    <div className="card p-3 d-flex flex-column gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Radio size={14} className="text-primary animate-pulse" /> Diagnostic Web Camera Live Test
                      </h3>
                      
                      <div className="bg-black rounded d-flex align-items-center justify-content-center" style={{ height: '180px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        {webcamStream ? (
                          <video ref={webcamVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : isCameraSimulated ? (
                          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #fff 0%, #e0e030 14%, #30e0e0 28%, #30e030 42%, #e030e0 56%, #e03030 70%, #3030e0 84%, #000 100%)', display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
                            <div className="w-100 text-center py-2 bg-black bg-opacity-75" style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>SIMULATED SMPTE COLOR BARS ACTIVE</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Camera stream inactive. Click Start Test.</span>
                        )}
                      </div>

                      <div className="d-flex gap-2">
                        <button className="btn btn-primary btn-sm w-100 font-bold" onClick={startWebcamTest} disabled={!!webcamStream || isCameraSimulated}>
                          Start Camera Test
                        </button>
                        {(webcamStream || isCameraSimulated) && (
                          <button className="btn btn-outline-danger btn-sm" onClick={stopWebcamTest}>Stop</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Microphone */}
                  <div className="col-12 col-md-6">
                    <div className="card p-3 d-flex flex-column gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                      <h3 style={{ fontSize: '13px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mic size={14} className="text-warning" /> Microphone Input Signal Level Test
                      </h3>

                      <div className="d-flex flex-column justify-content-center bg-black p-3 rounded" style={{ height: '180px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textAlign: 'center' }}>
                          Speak into mic. Gauge measures live audio input levels.
                        </span>
                        
                        {/* Audio Meter */}
                        <div className="w-100 bg-secondary rounded overflow-hidden mb-3" style={{ height: '24px', background: 'rgba(255,255,255,0.05)' }}>
                          <div 
                            className="bg-success transition-all duration-75" 
                            style={{ 
                              width: `${micLevel}%`, 
                              height: '100%',
                              background: micLevel > 80 ? '#ef4444' : micLevel > 50 ? '#f59e0b' : '#10b981'
                            }}
                          ></div>
                        </div>

                        <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 900, fontFamily: 'monospace' }}>
                          Volume Level: {micLevel} dB
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <button className="btn btn-warning btn-sm w-100 font-bold" onClick={startMicTest} disabled={!!micStream}>
                          Test Microphone
                        </button>
                        {micStream && (
                          <button className="btn btn-outline-danger btn-sm" onClick={stopMicTest}>Stop</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* USB Devices list */}
                <div className="card p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Usb size={15} className="text-primary" /> Active Paired USB Peripherals
                  </h3>
                  <div className="table-responsive">
                    <table className="table table-dark table-hover" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Device Description</th>
                          <th>Class Type</th>
                          <th>Speed Limit</th>
                          <th className="text-end">USB Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {USB_DEVICES.map(usb => (
                          <tr key={usb.name}>
                            <td style={{ fontWeight: 700 }}>{usb.name}</td>
                            <td>{usb.class}</td>
                            <td>{usb.speed}</td>
                            <td className="text-end">
                              <span className={`badge ${usb.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>{usb.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Network & UPS status */}
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="card p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', minHeight: '180px' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 800, margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>UPS STATUS MONITOR</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                        <div className="d-flex justify-content-between">
                          <span>Battery State:</span>
                          <strong className="text-success">AC Online (Battery Charging)</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Charge Level:</span>
                          <strong>92%</strong>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Runtime Remainder:</span>
                          <strong>18 Minutes</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="card p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', minHeight: '180px' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: 800, margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>SERIAL COM PORTS</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                        <div className="d-flex justify-content-between">
                          <span>COM1:</span>
                          <span>Motherboard DB9 (Disconnected)</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>COM3:</span>
                          <span className="text-warning">FTDI USB-to-UART Adapter (Baud: 115200)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: SYSTEM HEALTH CHARTS & EVENT LOGS */}
            {selectedConsoleTab === 'health' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* Canvas graph */}
                <div className="card p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 style={{ fontSize: '13px', fontWeight: 800, margin: 0 }}>Real-time System Load History</h3>
                    <div className="d-flex gap-3" style={{ fontSize: '11px', fontWeight: 700 }}>
                      <span style={{ color: '#3b82f6' }}>● CPU ({cpuHistory[cpuHistory.length - 1]}%)</span>
                      <span style={{ color: '#10b981' }}>● RAM ({ramHistory[ramHistory.length - 1]}%)</span>
                      <span style={{ color: '#f59e0b' }}>● GPU ({gpuHistory[gpuHistory.length - 1]}%)</span>
                    </div>
                  </div>
                  <canvas 
                    ref={healthCanvasRef} 
                    width={800} 
                    height={180} 
                    style={{ width: '100%', height: '180px', borderRadius: '8px', background: '#020617' }} 
                  />
                </div>

                {/* Event Viewer Logs */}
                <div className="card p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={15} className="text-primary" /> Core Windows Event Viewer (Security & System Auditing)
                  </h3>
                  <div className="table-responsive" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <table className="table table-dark table-hover" style={{ fontSize: '11px' }}>
                      <thead>
                        <tr>
                          <th>Timestamp</th>
                          <th>Source</th>
                          <th>Event ID</th>
                          <th>Severity</th>
                          <th>Message Log</th>
                        </tr>
                      </thead>
                      <tbody>
                        {EVENT_VIEWER_LOGS.map((log, idx) => (
                          <tr key={idx}>
                            <td>{log.time}</td>
                            <td style={{ fontWeight: 700 }}>{log.source}</td>
                            <td>{log.id}</td>
                            <td>
                              <span className={`badge ${log.level === 'Error' ? 'bg-danger' : log.level === 'Warning' ? 'bg-warning text-dark' : 'bg-primary'}`}>
                                {log.level}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>{log.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Drivers list */}
                <div className="card p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 10px 0' }}>Device Manager Driver Inventory</h3>
                  <div className="table-responsive" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                    <table className="table table-dark table-hover" style={{ fontSize: '11px' }}>
                      <thead>
                        <tr>
                          <th>Hardware Class / Device</th>
                          <th>Provider</th>
                          <th>Driver Version</th>
                          <th>Driver Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {INSTALLED_DRIVERS.map(drv => (
                          <tr key={drv.name}>
                            <td style={{ fontWeight: 700 }}>{drv.name}</td>
                            <td>{drv.provider}</td>
                            <td style={{ fontFamily: 'monospace' }}>{drv.version}</td>
                            <td>{drv.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PAIR NEW DEVICE MODAL ─────────────────────────────────────────── */}
      {isPairingModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsPairingModalOpen(false)}>
          <div className="modal animate-scale-in" style={{ maxWidth: '440px', background: 'var(--bg-modal)', border: '2px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '16px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1.5px solid var(--border-color)' }}>
              <h5 className="modal-title" style={{ fontWeight: 800 }}>Pair New Windows Agent</h5>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsPairingModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Device Name / Hostname</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={pairingDeviceName}
                  onChange={e => setPairingDeviceName(e.target.value)}
                  placeholder="e.g. GSV-SERVER-02"
                  style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Device Group Category</label>
                <select 
                  className="form-control" 
                  value={pairingDeviceGroup} 
                  onChange={e => setPairingDeviceGroup(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px' }}
                >
                  <option>Workstations</option>
                  <option>Servers</option>
                  <option>Virtual Machines</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Operating System</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={pairingDeviceOS}
                  onChange={e => setPairingDeviceOS(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>IPv4 Network Address</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={pairingDeviceIP}
                  onChange={e => setPairingDeviceIP(e.target.value)}
                  style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>MAC Address (WOL support)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={pairingDeviceMAC}
                  onChange={e => setPairingDeviceMAC(e.target.value)}
                  placeholder="e.g. F8:E4:3B:56:C2:25"
                  style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px' }}
                />
              </div>

              <div className="alert alert-info py-2 px-3 mb-0" style={{ fontSize: '11px', lineHeight: 1.4 }}>
                🔒 <strong>Token Pairing:</strong> Generates an encryption security certificate token for agent handshake logs matching TrueNAS configurations.
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1.5px solid var(--border-color)' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsPairingModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handlePairNewDevice}>Pair Device</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .hover-peer-row:hover {
          background: var(--bg-hover) !important;
          border-color: var(--brand-primary) !important;
        }
        .progress {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>

    </div>
  );
}
