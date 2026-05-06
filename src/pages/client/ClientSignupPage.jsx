import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import '../../pages/LoginPage.css';

export default function ClientSignupPage() {
  const [step, setStep] = useState('signup'); // signup | success
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [trainerCode, setTrainerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      return setError('Please fill in all fields');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      // 1. Sign up with role metadata
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: 'client' },
        },
      });
      if (authErr) throw authErr;

      // 2. Find client record by email and link auth_user_id
      if (authData.user) {
        const { data: clientRow } = await supabase
          .from('clients')
          .select('id')
          .eq('email', email.toLowerCase())
          .is('auth_user_id', null)
          .single();

        if (clientRow) {
          await supabase
            .from('clients')
            .update({ auth_user_id: authData.user.id })
            .eq('id', clientRow.id);
        }
      }

      setStep('success');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <h2 className="heading-2 mt-base">You're in!</h2>
          <p className="text-body mt-sm">
            Check your email to verify your account, then sign in.
          </p>
          <a
            href="/client/login"
            className="btn btn-primary btn-full btn-lg mt-xl"
          >
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon-wrap">💪</div>
          <h1 className="login-title">Join FitLink</h1>
          <p className="login-subtitle">Your trainer invited you.<br />Create your account to get started.</p>
        </div>

        {error && <div className="auth-message auth-error">{error}</div>}

        <form onSubmit={handleSignup}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input className="input" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="input-group mt-base">
            <label className="input-label">Email</label>
            <input className="input" type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="input-group mt-base">
            <label className="input-label">Password</label>
            <input className="input" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="input-group mt-base">
            <label className="input-label">Trainer Code (optional)</label>
            <input className="input" placeholder="ABC-1234" value={trainerCode} onChange={(e) => setTrainerCode(e.target.value)} />
          </div>

          <button className="btn btn-primary btn-full btn-lg mt-xl" type="submit" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="text-small text-center mt-lg">
          Already have an account?{' '}
          <a href="/client/login" className="text-accent" style={{ fontWeight: 600 }}>Sign In</a>
        </p>
      </div>
    </div>
  );
}
