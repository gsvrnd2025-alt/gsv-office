import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Save, Key, Bell, Palette, LogOut, Shield, Volume2, VolumeX } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { authApi, usersApi } from '../../api';
import { useThemeStore } from '../../store/theme.store';
import { SoundManager } from '../../utils/sound';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  
  // Sound Preferences states
  const [soundNotifications, setSoundNotifications] = useState(() => localStorage.getItem('gsv-sound-notifications') !== 'false');
  const [soundClicks, setSoundClicks] = useState(() => localStorage.getItem('gsv-sound-clicks') !== 'false');

  const toggleSoundNotifications = () => {
    const newVal = !soundNotifications;
    setSoundNotifications(newVal);
    localStorage.setItem('gsv-sound-notifications', String(newVal));
    SoundManager.playClick();
    if (newVal) SoundManager.playNotification();
  };

  const toggleSoundClicks = () => {
    const newVal = !soundClicks;
    setSoundClicks(newVal);
    localStorage.setItem('gsv-sound-clicks', String(newVal));
    if (newVal) SoundManager.playClick();
  };
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: (user as any)?.phone || '',
    designation: (user as any)?.designation || '',
  });
  const [pwdForm, setPwdForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setPwd = (k: string, v: string) => setPwdForm(f => ({ ...f, [k]: v }));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.update(user!.id, form);
      updateUser(form);
      toast.success('Profile updated successfully');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await authApi.changePassword({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword });
      toast.success('Password changed successfully');
      setPwdForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
  };

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="page-enter" style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Profile Header */}
      <div className="card" style={{ padding: '28px', background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '28px', fontWeight: 700, fontFamily: '"Space Grotesk", sans-serif' }}>
              {user?.avatarUrl ? <img src={user.avatarUrl} alt={user.fullName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
            </div>
            <button style={{ position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
              <Camera size={12} />
            </button>
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', fontFamily: '"Space Grotesk", sans-serif' }}>{user?.fullName}</h1>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', marginTop: '2px' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <span style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '12px', color: '#fff', fontWeight: 600 }}>
                {user?.role?.name || 'User'}
              </span>
              <span style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                {user?.department?.name || 'No Department'}
              </span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={handleLogout} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div style={{ padding: '0 20px' }}>
          <div className="tabs">
            {[{ key: 'profile', label: 'Profile' }, { key: 'security', label: 'Security' }, { key: 'preferences', label: 'Preferences' }].map(t => (
              <div key={t.key} className={`tab-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key as any)}>{t.label}</div>
            ))}
          </div>
        </div>

        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile}>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { key: 'fullName', label: 'Full Name', required: true },
                  { key: 'email', label: 'Email Address', type: 'email', required: true },
                  { key: 'phone', label: 'Phone Number' },
                  { key: 'designation', label: 'Designation / Job Title' },
                ].map(f => (
                  <div key={f.key} className="form-group">
                    <label className="form-label">{f.label}{f.required && <span className="required"> *</span>}</label>
                    <input type={f.type || 'text'} className="form-control" value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value)} required={f.required} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Employee ID</label>
                  <input type="text" className="form-control" value={(user as any)?.employeeId || '—'} readOnly />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Status</label>
                  <input type="text" className="form-control" value={user?.status || 'active'} readOnly />
                </div>
              </div>
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}><Save size={15} /> {saving ? 'Saving...' : 'Save Profile'}</button>
            </div>
          </form>
        )}

        {tab === 'security' && (
          <form onSubmit={handleChangePassword}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
              <div className="alert alert-info"><Shield size={16} />Password must be at least 8 characters with uppercase, lowercase, and numbers.</div>
              {[
                { key: 'oldPassword', label: 'Current Password' },
                { key: 'newPassword', label: 'New Password' },
                { key: 'confirmPassword', label: 'Confirm New Password' },
              ].map(f => (
                <div key={f.key} className="form-group">
                  <label className="form-label">{f.label} <span className="required">*</span></label>
                  <input type="password" className="form-control" value={(pwdForm as any)[f.key]} onChange={e => setPwd(f.key, e.target.value)} required minLength={f.key !== 'oldPassword' ? 8 : undefined} />
                </div>
              ))}
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}><Key size={15} /> {saving ? 'Changing...' : 'Change Password'}</button>
            </div>
          </form>
        )}

        {tab === 'preferences' && (
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Palette size={20} style={{ color: 'var(--brand-primary)' }} />
                <div><div style={{ fontSize: '14px', fontWeight: 600 }}>Theme</div><div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Choose your preferred appearance</div></div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['light', 'dark'].map(t => (
                  <button key={t} onClick={() => { setTheme(t as any); SoundManager.playClick(); }} className={`btn btn-sm ${theme === t ? 'btn-primary' : 'btn-secondary'}`} style={{ minWidth: '70px' }}>
                    {t === 'light' ? '☀️' : '🌙'} {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Sound Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Volume2 size={20} style={{ color: soundNotifications ? 'var(--brand-success)' : 'var(--text-tertiary)' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Notification Chime</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Play Ding-Dong sound when new message arrives</div>
                </div>
              </div>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={soundNotifications} onChange={toggleSoundNotifications} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{soundNotifications ? 'Enabled' : 'Muted'}</span>
              </label>
            </div>

            {/* Click Sound Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {soundClicks ? <Volume2 size={20} style={{ color: 'var(--brand-primary)' }} /> : <VolumeX size={20} style={{ color: 'var(--text-tertiary)' }} />}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>UI Click Sound Feedback</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Play a soft click sound when tapping controls</div>
                </div>
              </div>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={soundClicks} onChange={toggleSoundClicks} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{soundClicks ? 'Enabled' : 'Disabled'}</span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Bell size={20} style={{ color: 'var(--brand-primary)' }} />
                <div><div style={{ fontSize: '14px', fontWeight: 600 }}>Notifications</div><div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Desktop and email alerts</div></div>
              </div>
              <label style={{ cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> <span style={{ fontSize: '13px', marginLeft: '4px' }}>Enabled</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
