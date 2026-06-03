import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Lock, User, KeyRound, ShieldAlert, ChevronLeft } from 'lucide-react';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';
import logoImg from '../../assets/gsvlogo.png';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoLogin, setAutoLogin] = useState(() => localStorage.getItem('gsv-autologin') === 'true');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  // Forgot password flow states
  const [viewMode, setViewMode] = useState<'login' | 'forgot_request' | 'forgot_reset'>('login');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) { toast.error('Please enter your credentials'); return; }
    setLoading(true);
    try {
      const res = await authApi.login({ loginId, password });
      if (!res.data || res.data.success === false) {
        toast.error(res.data?.message || 'Invalid credentials');
        return;
      }
      const { accessToken, user } = res.data.data;
      
      // Save autoLogin state
      localStorage.setItem('gsv-autologin', autoLogin ? 'true' : 'false');
      
      login(user, accessToken);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}! 🎉`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier) { toast.error('Please enter your Employee ID, Email, or Mobile'); return; }
    setLoading(true);
    try {
      const res = await authApi.forgotPasswordRequest({ identifier: resetIdentifier });
      if (res.data?.success) {
        toast.success('Password reset request submitted to admin! Please wait for approval.');
        setViewMode('forgot_reset');
      } else {
        toast.error(res.data?.message || 'Submission failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier || !newPassword) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const res = await authApi.forgotPasswordReset({ identifier: resetIdentifier, newPassword });
      if (res.data?.success) {
        toast.success('Password reset successfully! Auto-logged in. 🎉');
        
        // Save autoLogin state
        localStorage.setItem('gsv-autologin', autoLogin ? 'true' : 'false');
        
        const { accessToken, user } = res.data.data;
        login(user, accessToken);
        navigate('/dashboard');
      } else {
        toast.error(res.data?.message || 'Reset failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Reset rejected. Ensure admin approved the request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'slideUp 0.4s ease' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px', boxShadow: '0 8px 24px rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <img src={logoImg} alt="GSV Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '6px', letterSpacing: '-0.5px' }}>
          GSV Office
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          Enterprise Workspace Platform
        </p>
      </div>

      {/* Card */}
      <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
        
        {/* LOGIN MODE */}
        {viewMode === 'login' && (
          <>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '6px', fontFamily: '"Space Grotesk", sans-serif' }}>
              Sign in to your workspace
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '28px' }}>
              Use your Employee ID, email address, or mobile number
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Login ID */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                  Employee ID, Email, or Mobile Number
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                    placeholder="e.g. EMP-0001, admin@gsv.local, or 9876543210"
                    autoComplete="username"
                    required
                    style={{
                      width: '100%', padding: '12px 14px 12px 40px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px', color: '#fff',
                      fontSize: '14px', fontFamily: 'inherit',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setViewMode('forgot_request')}
                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    style={{
                      width: '100%', padding: '12px 40px 12px 40px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px', color: '#fff',
                      fontSize: '14px', fontFamily: 'inherit',
                      outline: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Auto Login option */}
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoLogin}
                    onChange={e => {
                      const val = e.target.checked;
                      setAutoLogin(val);
                      localStorage.setItem('gsv-autologin', val ? 'true' : 'false');
                    }}
                    style={{ accentColor: '#6366f1', width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <span>Auto Login (Remember Me)</span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none', borderRadius: '12px',
                  color: '#fff', fontSize: '15px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  marginTop: '8px',
                  boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
                  transition: 'all 0.2s', fontFamily: 'inherit',
                }}
              >
                {loading ? (
                  <><div className="spinner" /><span>Signing in...</span></>
                ) : (
                  <><LogIn size={18} /><span>Sign In</span></>
                )}
              </button>
            </form>
          </>
        )}

        {/* FORGOT PASSWORD REQUEST MODE */}
        {viewMode === 'forgot_request' && (
          <>
            <button
              onClick={() => setViewMode('login')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: 0, marginBottom: '16px' }}
            >
              <ChevronLeft size={16} /> Back to Login
            </button>

            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '6px', fontFamily: '"Space Grotesk", sans-serif' }}>
              Request Password Reset
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '24px', lineHeight: 1.4 }}>
              Enter your Employee ID, email address, or mobile number to send a reset approval request to the administrator.
            </p>

            <form onSubmit={handleForgotRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                  User Identifier
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    value={resetIdentifier}
                    onChange={e => setResetIdentifier(e.target.value)}
                    placeholder="e.g. EMP-0001, email, or mobile"
                    required
                    style={{
                      width: '100%', padding: '12px 14px 12px 40px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px', color: '#fff',
                      fontSize: '14px', fontFamily: 'inherit',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: 'linear-gradient(135deg, #f59e0b, #eab308)',
                  border: 'none', borderRadius: '12px',
                  color: '#000', fontSize: '14px', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 8px 24px rgba(234,179,8,0.25)',
                  fontFamily: 'inherit',
                }}
              >
                {loading ? 'Submitting...' : 'Submit Request to Admin'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('forgot_reset')}
                  style={{ background: 'none', border: 'none', color: '#a855f7', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Already Approved? Reset & Login
                </button>
              </div>
            </form>
          </>
        )}

        {/* FORGOT PASSWORD RESET MODE */}
        {viewMode === 'forgot_reset' && (
          <>
            <button
              onClick={() => setViewMode('login')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: '13px', fontWeight: 600, padding: 0, marginBottom: '16px' }}
            >
              <ChevronLeft size={16} /> Back to Login
            </button>

            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '6px', fontFamily: '"Space Grotesk", sans-serif' }}>
              Reset Password & Log In
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '24px', lineHeight: 1.4 }}>
              If the Super Admin has approved your reset request, enter your user details and choose a new password.
            </p>

            <form onSubmit={handleForgotReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                  User Identifier
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    value={resetIdentifier}
                    onChange={e => setResetIdentifier(e.target.value)}
                    placeholder="e.g. EMP-0001, email, or mobile"
                    required
                    style={{
                      width: '100%', padding: '12px 14px 12px 40px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px', color: '#fff',
                      fontSize: '14px', fontFamily: 'inherit',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    style={{
                      width: '100%', padding: '12px 40px 12px 40px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px', color: '#fff',
                      fontSize: '14px', fontFamily: 'inherit',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoLogin}
                    onChange={e => {
                      const val = e.target.checked;
                      setAutoLogin(val);
                      localStorage.setItem('gsv-autologin', val ? 'true' : 'false');
                    }}
                    style={{ accentColor: '#6366f1', width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <span>Auto Login (Remember Me)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none', borderRadius: '12px',
                  color: '#fff', fontSize: '14px', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.25)',
                  fontFamily: 'inherit',
                }}
              >
                {loading ? 'Processing...' : 'Reset & Log In'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('forgot_request')}
                  style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Send Reset Request Instead
                </button>
              </div>
            </form>
          </>
        )}

        {viewMode === 'login' && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              New to the workspace?{' '}
              <Link to="/register" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
                Create Account
              </Link>
            </p>
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '24px' }}>
        GSV Office v1.0 — Self-Hosted Workspace Platform
      </p>
    </div>
  );
}
