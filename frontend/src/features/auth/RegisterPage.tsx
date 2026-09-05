import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, LogIn, Lock, User, Mail, Phone, MapPin, Calendar, Briefcase, Building } from 'lucide-react';
import { departmentsApi, authApi } from '../../api';
import toast from 'react-hot-toast';
import logoImg from '../../assets/gsvlogo.png';

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    dob: '', address: '', departmentId: '',
    designation: '', password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll().then(r => r.data?.data || r.data || [])
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password || !form.departmentId) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      // Create user self-registration
      await authApi.register({ ...form });
      toast.success('Registration successful! Awaiting admin approval. 🎉');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'slideUp 0.4s ease', maxHeight: '90vh', overflowY: 'auto', paddingRight: '4px' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '12px', boxShadow: '0 8px 24px rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <img src={logoImg} alt="GSV Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '4px', letterSpacing: '-0.5px' }}>
          GSV Office
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
          Create new workspace account
        </p>
      </div>

      {/* Card */}
      <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
              Full Name *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input
                type="text"
                value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
                placeholder="e.g. John Doe"
                required
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
              Email Address *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="e.g. john@gsv.local"
                required
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
              Phone Number
            </label>
            <div style={{ position: 'relative' }}>
              <Phone size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input
                type="text"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 9876543210"
                style={inputStyle}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </div>
          </div>

          {/* Date of Birth & Address */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                Date of Birth
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="date"
                  value={form.dob}
                  onChange={e => set('dob', e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '34px' }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                Address
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="Chennai, India"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>
          </div>

          {/* Department & Designation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                Department *
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
                <select
                  value={form.departmentId}
                  onChange={e => set('departmentId', e.target.value)}
                  required
                  style={{ ...inputStyle, paddingLeft: '34px', appearance: 'none', color: form.departmentId ? '#fff' : 'rgba(255,255,255,0.4)' }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                >
                  <option value="" style={{ background: '#302b63', color: 'rgba(255,255,255,0.5)' }}>Select Dept</option>
                  {departments.map((d: any) => (
                    <option key={d.id} value={d.id} style={{ background: '#302b63', color: '#fff' }}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
                Designation
              </label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                <input
                  type="text"
                  value={form.designation}
                  onChange={e => set('designation', e.target.value)}
                  placeholder="e.g. HR"
                  style={inputStyle}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Enter password"
                required
                minLength={8}
                style={{ ...inputStyle, paddingRight: '36px' }}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: '12px',
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '6px',
              boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}
          >
            <span>Register & Request Approval</span>
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px 10px 34px',
  background: 'rgba(255,255,255,0.08)',
  border: '1.5px solid rgba(255,255,255,0.1)',
  borderRadius: '12px', color: '#fff',
  fontSize: '13px', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const handleFocus = (e: any) => {
  e.target.style.borderColor = '#6366f1';
  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)';
};

const handleBlur = (e: any) => {
  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
  e.target.style.boxShadow = 'none';
};
