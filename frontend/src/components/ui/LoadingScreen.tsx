export function LoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      gap: '24px',
      zIndex: 9999,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '64px', height: '64px', animation: 'pulse 2s ease-in-out infinite' }}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="16" fill="url(#lgrad)"/>
            <path d="M16 32C16 23.2 23.2 16 32 16s16 7.2 16 16-7.2 16-16 16" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
            <circle cx="32" cy="32" r="6" fill="#fff"/>
            <defs>
              <linearGradient id="lgrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/>
                <stop offset="1" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '28px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
            GSV Office
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginTop: '4px' }}>
            Enterprise Workspace Platform
          </p>
        </div>
      </div>

      {/* Loading dots */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '8px', height: '8px',
            background: '#6366f1',
            borderRadius: '50%',
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}
