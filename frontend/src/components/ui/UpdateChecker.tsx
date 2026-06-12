import React, { useEffect, useState } from 'react';
import { serverApi } from '../../api';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';

export const UpdateChecker = () => {
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; apkUrl: string; exeUrl: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const checkUpdate = async (isManual = false) => {
    let toastId;
    if (isManual) {
      toastId = toast.loading('Checking for updates...');
    }
    try {
      const res = await serverApi.getPublicSettings();
      const settings = res.data?.data || res.data || {};
      
      const serverVersion = settings.app_version;
      if (serverVersion && currentVersion) {
        if (compareVersions(serverVersion, currentVersion) > 0) {
          setUpdateInfo({
            version: serverVersion,
            apkUrl: settings.apk_update_url || '/downloads/app-release.apk',
            exeUrl: settings.exe_update_url || '/downloads/GSVOffice-Setup.exe'
          });
          setUpdateAvailable(true);
          if (isManual) {
            toast.success('New update available!', { id: toastId });
          }
          return;
        }
      }
      if (isManual) {
        toast.success(`GSV Connect is up to date (Version ${currentVersion})`, { id: toastId });
      }
    } catch (err) {
      console.error('Failed to check for updates', err);
      if (isManual) {
        toast.error('Failed to check for updates', { id: toastId });
      }
    }
  };

  useEffect(() => {
    // Check immediately, then every 1 hour
    checkUpdate(false);
    const interval = setInterval(() => checkUpdate(false), 60 * 60 * 1000);

    const handleManualCheck = () => {
      checkUpdate(true);
    };
    window.addEventListener('gsv-check-update-manual', handleManualCheck);

    return () => {
      clearInterval(interval);
      window.removeEventListener('gsv-check-update-manual', handleManualCheck);
    };
  }, []);

  const compareVersions = (v1: string, v2: string) => {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  };

  const handleUpdate = async () => {
    if (!updateInfo) return;
    setIsUpdating(true);
    
    // Desktop (Electron)
    if ((window as any).gsvDesktop) {
      toast.loading('Downloading update...', { id: 'update-toast' });
      try {
        const res = await (window as any).gsvDesktop.downloadAndInstallUpdate({
          exeUrl: updateInfo.exeUrl.startsWith('http') ? updateInfo.exeUrl : `${window.location.origin}${updateInfo.exeUrl}`
        });
        if (res?.success) {
          toast.success('Download complete! Restarting to install...', { id: 'update-toast' });
        } else {
          toast.error(`Update failed: ${res?.error || 'Unknown error'}`, { id: 'update-toast' });
          setIsUpdating(false);
        }
      } catch (err: any) {
        toast.error(`Update error: ${err.message}`, { id: 'update-toast' });
        setIsUpdating(false);
      }
    } 
    // Android/Capacitor or Web Fallback
    else {
      toast.success('Redirecting to download...');
      const targetUrl = Capacitor.isNativePlatform() ? updateInfo.apkUrl : updateInfo.exeUrl;
      const fullUrl = targetUrl.startsWith('http') ? targetUrl : `${window.location.origin}${targetUrl}`;
      window.open(fullUrl, '_system');
      setIsUpdating(false);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card card-body text-center animate-scale-in" style={{ width: '400px', maxWidth: '90vw', background: 'var(--bg-card)', padding: '32px' }}>
        <div style={{ width: '64px', height: '64px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
          <Download size={32} style={{ color: 'var(--brand-primary)' }} />
        </div>
        
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Update Available</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
          A new version of GSV Office ({updateInfo?.version}) is available. You are currently on version {currentVersion}.
          Please update to continue using the application with the latest features and security improvements.
        </p>

        <button 
          className="btn btn-primary" 
          onClick={handleUpdate} 
          disabled={isUpdating}
          style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600 }}
        >
          {isUpdating ? 'Downloading...' : 'Update Now'}
        </button>
      </div>
    </div>
  );
};
