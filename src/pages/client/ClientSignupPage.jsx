import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { IconPhone, IconMail } from '../../components/Icons';
import '../../pages/LoginPage.css';

export default function ClientSignupPage() {
  const [authMode, setAuthMode] = useState('phone');
  const [step, setStep] = useState('input'); // input | otp | success

  // Phone fields
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Shared fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trainerCode, setTrainerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    if (raw.startsWith('+')) return raw;
    return `+${digits}`;
  };

  // --- Phone OTP Signup ---
  const handlePhoneSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Please enter your name');
    const formatted = formatPhone(phone);
    if (formatted.length < 11) return setError('Please enter a valid phone number');

    setLoading(true);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (otpErr) throw otpErr;
      setPhone(formatted);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (otpCode.length < 6) return setError('Please enter the 6-digit code');

    setLoading(true);
    try {
      const { data: authData, error: verifyErr } = await supabase.auth.verifyOtp({
        phone,
        token: otpCode,
        type: 'sms',
      });
      if (verifyErr) throw verifyErr;

      // Set role metadata
      await supabase.auth.updateUser({
        data: { name: name.trim(), role: 'client' },
      });

      // Link to existing client record by phone or email
      if (authData.user) {
        const { data: clientRow } = await supabase
          .from('clients')
          .select('id')
          .or(`phone.eq.${phone},email.eq.${email.toLowerCase()}`)
          .is('auth_user_id', null)
          .limit(1)
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
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // --- Email Signup (fallback) ---
  const handleEmailSignup = async (e) => {
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
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: 'client' },
        },
      });
      if (authErr) throw authErr;

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

  const switchMode = (mode) => {
    setAuthMode(mode);
    setError('');
    setStep('input');
    setOtpCode('');
  };

  if (step === 'success') {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <h2 className="heading-2 mt-base">You're in!</h2>
          <p className="text-body mt-sm">
            {authMode === 'phone'
              ? 'Your account is ready. You can now access your workouts and chat with your trainer.'
              : 'Check your email to verify your account, then sign in.'}
          </p>
          <a
            href={authMode === 'phone' ? '/client' : '/client/login'}
            className="btn btn-primary btn-full btn-lg mt-xl"
          >
            {authMode === 'phone' ? 'Go to Dashboard' : 'Go to Sign In'}
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

        {/* Auth Method Toggle */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${authMode === 'phone' ? 'active' : ''}`}
            onClick={() => switchMode('phone')}
            type="button"
          >
            <IconPhone size={16} />
            Phone
          </button>
          <button
            className={`auth-tab ${authMode === 'email' ? 'active' : ''}`}
            onClick={() => switchMode('email')}
            type="button"
          >
            <IconMail size={16} />
            Email
          </button>
        </div>

        {error && <div className="auth-message auth-error">{error}</div>}

        {/* ========== PHONE FLOW ========== */}
        {authMode === 'phone' && step === 'input' && (
          <form onSubmit={handlePhoneSendOtp}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="input-group mt-base">
              <label className="input-label">Phone Number</label>
              <input
                className="input"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
              <p className="input-hint">We'll text you a verification code</p>
            </div>

            <div className="input-group mt-base">
              <label className="input-label">Trainer Code (optional)</label>
              <input className="input" placeholder="ABC-1234" value={trainerCode} onChange={(e) => setTrainerCode(e.target.value)} />
            </div>

            <button className="btn btn-primary btn-full btn-lg mt-xl" type="submit" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : 'Send Verification Code'}
            </button>
          </form>
        )}

        {authMode === 'phone' && step === 'otp' && (
          <form onSubmit={handlePhoneVerify}>
            <div className="otp-sent-info">
              <p className="text-small">Code sent to <strong>{phone}</strong></p>
              <button
                type="button"
                className="text-accent text-small"
                style={{ fontWeight: 600 }}
                onClick={() => { setStep('input'); setError(''); }}
              >
                Change
              </button>
            </div>

            <div className="input-group mt-base">
              <label className="input-label">Verification Code</label>
              <input
                className="input input-otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code"
              />
            </div>

            <button className="btn btn-primary btn-full btn-lg mt-xl" type="submit" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : 'Verify & Create Account'}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-full mt-base"
              onClick={handlePhoneSendOtp}
              disabled={loading}
            >
              Resend Code
            </button>
          </form>
        )}

        {/* ========== EMAIL FLOW ========== */}
        {authMode === 'email' && (
          <form onSubmit={handleEmailSignup}>
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
        )}

        <p className="text-small text-center mt-lg">
          Already have an account?{' '}
          <a href="/client/login" className="text-accent" style={{ fontWeight: 600 }}>Sign In</a>
        </p>
      </div>
    </div>
  );
}
