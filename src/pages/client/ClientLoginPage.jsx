import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import '../../pages/LoginPage.css';

export default function ClientLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) return setError('Please fill in all fields');

    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      // Auth state change will redirect via App.jsx role routing
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon-wrap">💪</div>
          <h1 className="login-title">FitLink</h1>
          <p className="login-subtitle">Client Portal</p>
        </div>

        {error && <div className="auth-message auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="input-group mt-base">
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button className="btn btn-primary btn-full btn-lg mt-xl" type="submit" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-small text-center mt-lg">
          Don't have an account?{' '}
          <a href="/client/signup" className="text-accent" style={{ fontWeight: 600 }}>Sign Up</a>
        </p>
      </div>
    </div>
  );
}
