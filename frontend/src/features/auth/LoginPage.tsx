import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Lock, User } from 'lucide-react';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import toast from 'react-hot-toast';
import logoImg from '../../assets/gsvlogo.png';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

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
      login(user, accessToken);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}! 🎉`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Invalid credentials');
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
                placeholder="e.g. admin, admin@gsv.local, or 9876543210"
                autoComplete="username"
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
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
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


        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            New to the workspace?{' '}
            <Link to="/register" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
              Create Account
            </Link>
          </p>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '24px' }}>
        GSV Office v1.0 — Self-Hosted Workspace Platform
      </p>
    </div>
  );
}
