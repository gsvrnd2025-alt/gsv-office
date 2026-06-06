/**
 * GSV Office — Windows Desktop Client
 * System Tray Application
 * 
 * Features:
 * - Runs silently in the system tray
 * - Auto-starts with Windows on login
 * - Opens GSV Office in an integrated window (or browser)
 * - Shows online/offline server status
 * - Settings: configure server IP & port
 * - Multiple PCs can run the same app pointing to the same server
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');

// ─── Prevent second instance ─────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ─── Store (simple JSON persistence) ─────────────────────────────────────────
const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (e) {}
  return {
    serverUrl: 'http://192.168.0.177:8080',
    autoStart: true,
    openOnStart: false,
    minimizeToTray: true,
    windowWidth: 1280,
    windowHeight: 800
  };
}

function saveConfig(config) {
  try {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (e) {}
}

let config = loadConfig();

// ─── Treat Server URL as Secure Origin ────────────────────────────────────────
if (config.serverUrl) {
  try {
    const origin = new URL(config.serverUrl).origin;
    app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', origin);
  } catch (e) {
    console.error('Failed to append secure origin switch:', e);
  }
}

// ─── Protocol Deep Linking & Device Tracking ─────────────────────────────────
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('gsvoffice', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('gsvoffice');
}

const deviceIdPath = path.join(userDataPath, 'device_id.txt');
let persistentDeviceId = null;
try {
  if (fs.existsSync(deviceIdPath)) {
    persistentDeviceId = fs.readFileSync(deviceIdPath, 'utf8').trim();
  } else {
    const { randomUUID } = require('crypto');
    persistentDeviceId = randomUUID();
    fs.writeFileSync(deviceIdPath, persistentDeviceId);
  }
} catch (e) {
  persistentDeviceId = 'unknown-device';
}


// ─── App State ────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let settingsWindow = null;
let isServerOnline = false;
let checkInterval = null;
let selectedSourceId = null; // Stored source ID for WebRTC capture selection

// ─── Get asset path ──────────────────────────────────────────────────────────
function assetPath(name) {
  return path.join(__dirname, '..', 'assets', name);
}

// ─── Server health check ──────────────────────────────────────────────────────
function checkServer(callback) {
  try {
    const url = new URL(config.serverUrl + '/api/health');
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.get({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      timeout: 4000
    }, (res) => {
      callback(res.statusCode === 200);
    });
    req.on('error', () => callback(false));
    req.on('timeout', () => { req.destroy(); callback(false); });
  } catch (e) {
    callback(false);
  }
}

// ─── Auto-Updater ─────────────────────────────────────────────────────────────
const { autoUpdater } = require('electron-updater');

// Configure autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let updateCheckInProgress = false;

autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `A new version of GSV Office is available (${info.version}).`,
    detail: 'Would you like to download it now?',
    buttons: ['Download Update', 'Later']
  }).then(({ response }) => {
    if (response === 0) {
      autoUpdater.downloadUpdate();
    }
  });
});

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'The update has been downloaded.',
    detail: 'The app will restart and install the update now.',
    buttons: ['Restart Now', 'Later']
  }).then(({ response }) => {
    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  console.error('AutoUpdater Error:', err);
  updateCheckInProgress = false;
});

function checkForUpdates() {
  autoUpdater.checkForUpdates().catch(e => console.error('Check failed:', e));
}

ipcMain.handle('check-for-updates', async () => {
  if (updateCheckInProgress) return { success: false, message: 'Check already in progress.' };
  updateCheckInProgress = true;
  try {
    const result = await autoUpdater.checkForUpdates();
    updateCheckInProgress = false;
    if (!result || !result.updateInfo) {
      return { success: true, message: 'You are on the latest version.' };
    }
    return { success: true, message: 'Update check complete.' };
  } catch (err) {
    updateCheckInProgress = false;
    return { success: false, message: 'Failed to check for updates. Make sure GitHub releases are published.' };
  }
});

// ─── Update tray icon based on server status ──────────────────────────────────
function updateTrayStatus(online) {
  isServerOnline = online;
  if (!tray) return;
  
  // Try status-specific icon first, fall back to main icon
  const statusIcon = online ? 'icon-online.png' : 'icon-offline.png';
  const candidates = [assetPath(statusIcon), assetPath('icon.png'), assetPath('icon.ico')];
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const img = nativeImage.createFromPath(candidate);
        if (!img.isEmpty()) {
          tray.setImage(img);
          break;
        }
      } catch (e) {}
    }
  }
  
  tray.setToolTip(`GSV Office — ${online ? '🟢 Server Online' : '🔴 Server Offline'}\n${config.serverUrl}`);
  updateTrayMenu();
}

// ─── Build tray context menu ──────────────────────────────────────────────────
function updateTrayMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'GSV Office',
      icon: fs.existsSync(assetPath('icon-16.png')) ? assetPath('icon-16.png') : undefined,
      enabled: false
    },
    {
      label: isServerOnline ? '🟢 Server Online' : '🔴 Server Offline',
      enabled: false
    },
    { label: config.serverUrl, enabled: false, type: 'normal' },
    { type: 'separator' },
    {
      label: '🖥️  Open GSV Office',
      click: () => openMainWindow(),
      enabled: isServerOnline
    },
    {
      label: '🌐 Open in Browser',
      click: () => shell.openExternal(config.serverUrl)
    },
    { type: 'separator' },
    {
      label: '⚙️  Settings',
      click: () => openSettingsWindow()
    },
    {
      label: '🔄 Check Connection',
      click: () => {
        checkServer(online => updateTrayStatus(online));
      }
    },
    { type: 'separator' },
    {
      label: '❌ Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(menu);
}

// ─── Create main app window ───────────────────────────────────────────────────
function createMainWindow(showWindow = true) {
  mainWindow = new BrowserWindow({
    width: config.windowWidth || 1280,
    height: config.windowHeight || 800,
    minWidth: 900,
    minHeight: 600,
    title: 'GSV Office',
    icon: assetPath('icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true
  });

  // Load the GSV Office URL with retry mechanism
  const loadWithRetry = () => {
    if (!mainWindow) return;
    mainWindow.loadURL(config.serverUrl).catch(err => {
      console.error('Failed to load url, retrying in 5 seconds...', err);
      setTimeout(() => {
        if (mainWindow) loadWithRetry();
      }, 5000);
    });
  };
  
  loadWithRetry();

  mainWindow.once('ready-to-show', () => {
    if (showWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Save window size on resize
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      const [w, h] = mainWindow.getSize();
      config.windowWidth = w;
      config.windowHeight = h;
      saveConfig(config);
    }
  });

  // Minimize to tray instead of closing (if enabled)
  mainWindow.on('close', (e) => {
    if (!app.isQuitting && config.minimizeToTray) {
      e.preventDefault();
      mainWindow.hide();
      
      // Show notification on first minimize
      const notifShownKey = path.join(userDataPath, '.tray_notif_shown');
      if (!fs.existsSync(notifShownKey)) {
        try {
          new Notification({
            title: 'GSV Office',
            body: 'Running in the background. Click the tray icon to open.',
            icon: assetPath('icon.ico')
          }).show();
          fs.writeFileSync(notifShownKey, '1');
        } catch (e) {}
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation - keep within the same domain
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const targetUrl = new URL(url);
      const serverUrl = new URL(config.serverUrl);
      if (targetUrl.hostname !== serverUrl.hostname) {
        event.preventDefault();
        shell.openExternal(url);
      }
    } catch (e) {}
  });

  // Handle new windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Enable getDisplayMedia support in Electron
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    const { desktopCapturer } = require('electron');
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      let selectedSource = null;
      if (selectedSourceId) {
        selectedSource = sources.find(s => s.id === selectedSourceId);
      }
      if (!selectedSource && sources.length > 0) {
        selectedSource = sources[0]; // fallback
      }

      if (selectedSource) {
        console.log('Serving media stream capture for source:', selectedSource.id, selectedSource.name);
        callback({ video: selectedSource, audio: 'loopback' });
      } else {
        console.warn('No media capture source found.');
        callback({});
      }
    }).catch(err => {
      console.error('Error in DisplayMediaRequest handler:', err);
      callback({});
    });
  });
}

// ─── Open or focus main window ────────────────────────────────────────────────
function openMainWindow() {
  if (!isServerOnline) {
    dialog.showMessageBox({
      type: 'warning',
      title: 'GSV Office',
      message: 'Server is offline',
      detail: `Cannot connect to:\n${config.serverUrl}\n\nPlease check your network or configure the server IP in Settings.`,
      buttons: ['Configure Settings', 'Open Anyway', 'Cancel']
    }).then(({ response }) => {
      if (response === 0) {
        openSettingsWindow();
      } else if (response === 1) {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow(true);
        }
      }
    });
    return;
  }

  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createMainWindow(true);
  }
}

// ─── Settings Window ──────────────────────────────────────────────────────────
function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 520,
    height: 500,
    title: 'GSV Office — Settings',
    icon: assetPath('icon.ico'),
    resizable: false,
    parent: mainWindow || undefined,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'settings-preload.js')
    },
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    show: false
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  settingsWindow.once('ready-to-show', () => settingsWindow.show());
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

// ─── Persistent PowerShell process for zero-lag native input control ─────────
let psProcess = null;

function getPowerShellProcess() {
  if (process.platform !== 'win32') return null;
  if (psProcess && !psProcess.killed) return psProcess;

  try {
    const { spawn } = require('child_process');
    // Start persistent PowerShell session
    psProcess = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], {
      stdio: ['pipe', 'ignore', 'ignore']
    });
    
    // Initialize Assemblies
    const initCmds = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$signature = @"
using System;
using System.Runtime.InteropServices;
public class Win32Input {
    [DllImport("user32.dll")]
    public static extern void mouse_event(int flags, int dx, int dy, int data, int extraInfo);
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);
}
"@
if (-not ([System.Management.Automation.PSTypeName]"Win32Input").Type) {
    Add-Type -TypeDefinition $signature
}
`;
    psProcess.stdin.write(initCmds + "\n");
  } catch (e) {
    console.error('Failed to start persistent PowerShell process:', e);
  }
  return psProcess;
}

function runPSCommand(cmd) {
  const ps = getPowerShellProcess();
  if (ps) {
    try {
      ps.stdin.write(cmd + "\n");
    } catch (e) {
      console.error('PowerShell write failed, resetting process...', e);
      psProcess = null;
    }
  }
}

function mapKeyToSendKeys(key) {
  if (key.length === 1) {
    if (['+', '^', '%', '~', '(', ')', '[', ']', '{', '}'].includes(key)) {
      return `{${key}}`;
    }
    return key;
  }
  
  const specialKeys = {
    'Enter': '{ENTER}',
    'Backspace': '{BACKSPACE}',
    'Tab': '{TAB}',
    'Escape': '{ESC}',
    'ArrowUp': '{UP}',
    'ArrowDown': '{DOWN}',
    'ArrowLeft': '{LEFT}',
    'ArrowRight': '{RIGHT}',
    'Delete': '{DEL}',
    'Insert': '{INS}',
    'Home': '{HOME}',
    'End': '{END}',
    'PageUp': '{PGUP}',
    'PageDown': '{PGDN}',
    'F1': '{F1}', 'F2': '{F2}', 'F3': '{F3}', 'F4': '{F4}', 'F5': '{F5}', 'F6': '{F6}',
    'F7': '{F7}', 'F8': '{F8}', 'F9': '{F9}', 'F10': '{F10}', 'F11': '{F11}', 'F12': '{F12}',
  };
  
  return specialKeys[key] || '';
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
ipcMain.handle('select-source', async (event, sourceId) => {
  selectedSourceId = sourceId;
  console.log('Electron target capture source selected:', selectedSourceId);
  return { success: true };
});

ipcMain.handle('minimize-window', async () => {
  if (mainWindow) {
    mainWindow.minimize();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('remote-input', async (event, payload) => {
  if (process.platform !== 'win32') return { success: false, reason: 'Not Windows' };
  
  try {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;
    
    if (payload.type === 'mouse') {
      const fractionX = payload.fractionX !== undefined ? payload.fractionX : (payload.x / 1920);
      const fractionY = payload.fractionY !== undefined ? payload.fractionY : (payload.y / 1080);

      const nativeX = Math.round(fractionX * width);
      const nativeY = Math.round(fractionY * height);
      
      let cmd = `[Win32Input]::SetCursorPos(${nativeX}, ${nativeY})`;
      
      if (payload.action === 'move') {
        // Just move the cursor, no click
      } else if (payload.action === 'leftdown') {
        cmd += `\n[Win32Input]::mouse_event(0x0002, 0, 0, 0, 0)`;
      } else if (payload.action === 'leftup') {
        cmd += `\n[Win32Input]::mouse_event(0x0004, 0, 0, 0, 0)`;
      } else if (payload.action === 'rightdown') {
        cmd += `\n[Win32Input]::mouse_event(0x0008, 0, 0, 0, 0)`;
      } else if (payload.action === 'rightup') {
        cmd += `\n[Win32Input]::mouse_event(0x0010, 0, 0, 0, 0)`;
      } else if (payload.action === 'rightclick') {
        cmd += `\n[Win32Input]::mouse_event(0x0008, 0, 0, 0, 0)\n[Win32Input]::mouse_event(0x0010, 0, 0, 0, 0)`;
      } else {
        // Fallback for older clients: move + click
        cmd += `\n[Win32Input]::mouse_event(0x0002, 0, 0, 0, 0)\n[Win32Input]::mouse_event(0x0004, 0, 0, 0, 0)`;
      }
      
      runPSCommand(cmd);
      return { success: true };
    } 
    
    if (payload.type === 'key') {
      const sendKeysPattern = mapKeyToSendKeys(payload.key);
      if (sendKeysPattern) {
        const escaped = sendKeysPattern.replace(/"/g, '`"');
        const cmd = `[System.Windows.Forms.SendKeys]::SendWait("${escaped}")`;
        runPSCommand(cmd);
        return { success: true };
      }
    }
  } catch (err) {
    console.error('Error handling remote input IPC:', err);
  }
  return { success: false };
});

ipcMain.handle('get-sources', async () => {
  const { desktopCapturer } = require('electron');
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 300, height: 200 },
      fetchWindowIcons: true
    });
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null
    }));
  } catch (err) {
    console.error('Failed to get sources in main process:', err);
    return [];
  }
});

ipcMain.handle('get-config', () => config);

ipcMain.handle('open-settings', () => {
  openSettingsWindow();
  return { success: true };
});

ipcMain.handle('show-and-focus', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('save-config', (event, newConfig) => {
  const oldUrl = config.serverUrl;
  config = { ...config, ...newConfig };
  saveConfig(config);

  // Apply auto-start setting
  app.setLoginItemSettings({
    openAtLogin: config.autoStart,
    name: 'GSV Office',
    args: ['--hidden']
  });

  // Reload main window if URL changed
  if (mainWindow && newConfig.serverUrl && newConfig.serverUrl !== oldUrl) {
    mainWindow.loadURL(config.serverUrl);
  }

  updateTrayMenu();
  return { success: true };
});

ipcMain.handle('test-connection', async (event, url) => {
  return new Promise(resolve => {
    try {
      const testUrl = new URL((url || config.serverUrl) + '/api/health');
      const lib = testUrl.protocol === 'https:' ? https : http;
      const req = lib.get({
        hostname: testUrl.hostname,
        port: testUrl.port || 80,
        path: testUrl.pathname,
        timeout: 5000
      }, (res) => resolve({ online: res.statusCode === 200 }));
      req.on('error', () => resolve({ online: false }));
      req.on('timeout', () => { req.destroy(); resolve({ online: false }); });
    } catch (e) {
      resolve({ online: false });
    }
  });
});

ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('get-device-id', () => persistentDeviceId);

let callPopupWindow = null;

ipcMain.handle('show-incoming-call-popup', async (event, data) => {
  if (callPopupWindow) {
    callPopupWindow.close();
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const popupWidth = 320;
  const popupHeight = 220;

  callPopupWindow = new BrowserWindow({
    width: popupWidth,
    height: popupHeight,
    x: width - popupWidth - 20,
    y: height - popupHeight - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  callPopupWindow.loadFile(path.join(__dirname, 'call-popup.html'));

  callPopupWindow.webContents.once('did-finish-load', () => {
    callPopupWindow.webContents.send('call-data', data);
    callPopupWindow.showInactive();
  });

  callPopupWindow.on('closed', () => {
    callPopupWindow = null;
  });

  return { success: true };
});

ipcMain.handle('close-incoming-call-popup', async () => {
  if (callPopupWindow) {
    callPopupWindow.close();
    callPopupWindow = null;
  }
  return { success: true };
});

ipcMain.on('call-action-response', (event, action) => {
  if (callPopupWindow) {
    callPopupWindow.close();
    callPopupWindow = null;
  }
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.executeJavaScript(`
      window.dispatchEvent(new CustomEvent('gsv-call-action', { detail: '${action}' }));
    `).catch(err => console.error(err));
  }
  if (action === 'accept') {
    openMainWindow();
  }
});

// ─── Deep Link Handling Helper ────────────────────────────────────────────────
function handleDeepLink(url) {
  if (!url || !url.startsWith('gsvoffice://')) return;
  openMainWindow();
  
  // Pass the deep link to the frontend if it's ready
  if (mainWindow && mainWindow.webContents) {
    // We send it via executeJavaScript as a custom event
    mainWindow.webContents.executeJavaScript(`
      window.dispatchEvent(new CustomEvent('gsv-deep-link', { detail: '${url}' }));
    `).catch(err => console.error('Failed to dispatch deep link event', err));
  }
}

// macOS Protocol Handler
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// ─── Second instance focus ────────────────────────────────────────────────────
app.on('second-instance', (event, commandLine, workingDirectory) => {
  openMainWindow();
  // Handle Windows deep links
  const url = commandLine.find(arg => arg.startsWith('gsvoffice://'));
  if (url) {
    handleDeepLink(url);
  }
});

// ─── App Ready ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Create tray - try different icon formats
  const iconCandidates = ['icon-tray.png', 'icon.png', 'icon.ico'].map(assetPath);
  let trayImage = nativeImage.createEmpty();
  
  for (const candidate of iconCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        const img = nativeImage.createFromPath(candidate);
        if (!img.isEmpty()) {
          trayImage = img;
          break;
        }
      } catch (e) {}
    }
  }

  tray = new Tray(trayImage.isEmpty() ? nativeImage.createEmpty() : trayImage);
  tray.setToolTip('GSV Office — Checking connection...');
  
  // Double-click to open
  tray.on('double-click', () => openMainWindow());

  // Build initial menu
  updateTrayMenu();

  // Set auto-start
  app.setLoginItemSettings({
    openAtLogin: config.autoStart,
    name: 'GSV Office',
    args: ['--hidden']
  });

  // Start health check loop
  const startHealthChecks = () => {
    checkServer(online => updateTrayStatus(online));
    checkInterval = setInterval(() => {
      checkServer(online => updateTrayStatus(online));
    }, 30000); // every 30 seconds
  };

  startHealthChecks();
  
  // Start update check loop
  checkForUpdates();
  setInterval(checkForUpdates, 4 * 60 * 60 * 1000); // every 4 hours

  // Create window hidden immediately so it starts trying to load WebSockets
  createMainWindow(false);

  // Auto-open on start (if not launched with --hidden)
  const hiddenArg = process.argv.includes('--hidden');
  if (config.openOnStart && !hiddenArg) {
    // Wait a bit for server check
    setTimeout(() => openMainWindow(), 2000);
  }

  // Handle Windows deep links if app started with one (first instance)
  const url = process.argv.find(arg => arg.startsWith('gsvoffice://'));
  if (url) {
    setTimeout(() => handleDeepLink(url), 3000);
  }
});

// ─── Quit behavior ────────────────────────────────────────────────────────────
app.on('window-all-closed', (e) => {
  // Don't quit when all windows closed — stay in tray
  if (!app.isQuitting) {
    e.preventDefault();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (checkInterval) clearInterval(checkInterval);
  if (psProcess && !psProcess.killed) {
    try {
      psProcess.kill();
    } catch (e) {}
  }
});

app.on('activate', () => {
  openMainWindow();
});
