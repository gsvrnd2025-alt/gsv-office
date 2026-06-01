interface Props { children: React.ReactNode; }

export function AuthLayout({ children }: Props) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background blobs */}
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
        borderRadius: '50%', animation: 'pulse 4s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
        borderRadius: '50%', animation: 'pulse 5s ease-in-out infinite 1s',
      }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px', padding: '1.5rem' }}>
        {children}
      </div>
    </div>
  );
}
