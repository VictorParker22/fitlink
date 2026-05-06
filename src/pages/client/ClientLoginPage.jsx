import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { IconPhone, IconMail } from '../../components/Icons';
import '../../pages/LoginPage.css';

export default function ClientLoginPage() {
  const [authMode, setAuthMode] = useState('phone');
  const [phoneStep, setPhoneStep] = useState('phone'); // phone | otp

  // Phone fields
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Email fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    if (raw.startsWith('+')) return raw;
    return `+${digits}`;
  };

  // --- Phone OTP ---
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formatted = formatPhone(phone);
    if (formatted.length < 11) return setError('Please enter a valid phone number');

    setLoading(true);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (otpErr) throw otpErr;
      setPhone(formatted);
      setPhoneStep('otp');
      setSuccess('Verification code sent!');
    } catch (err) {
      setError(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (otpCode.length < 6) return setError('Please enter the 6-digit code');

    setLoading(true);
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        phone,
        token: otpCode,
        type: 'sms',
      });
      if (verifyErr) throw verifyErr;
      // Auth state change will redirect via App.jsx role routing
    } catch (err) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  // --- Email/Password ---
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) return setError('Please fill in all fields');

    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setError('');
    setSuccess('');
    setPhoneStep('phone');
    setOtpCode('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon-wrap">💪</div>
          <h1 className="login-title">FitLink</h1>
          <p className="login-subtitle">Client Portal</p>
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
        {success && <div className="auth-message auth-success">{success}</div>}

        {/* ========== PHONE FLOW ========== */}
        {authMode === 'phone' && phoneStep === 'phone' && (
          <form onSubmit={handleSendOtp}>
            <div className="input-group">
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

            <button className="btn btn-primary btn-full btn-lg mt-xl" type="submit" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : 'Send Verification Code'}
            </button>
          </form>
        )}

        {authMode === 'phone' && phoneStep === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <div className="otp-sent-info">
              <p className="text-small">Code sent to <strong>{phone}</strong></p>
              <button
                type="button"
                className="text-accent text-small"
                style={{ fontWeight: 600 }}
                onClick={() => { setPhoneStep('phone'); setError(''); setSuccess(''); }}
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
              {loading ? <span className="btn-spinner" /> : 'Verify & Sign In'}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-full mt-base"
              onClick={handleSendOtp}
              disabled={loading}
            >
              Resend Code
            </button>
          </form>
        )}

        {/* ========== EMAIL FLOW ========== */}
        {authMode === 'email' && (
          <form onSubmit={handleEmailLogin}>
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
        )}

        <p className="text-small text-center mt-lg">
          Don't have an account?{' '}
          <a href="/client/signup" className="text-accent" style={{ fontWeight: 600 }}>Sign Up</a>
        </p>
      </div>
    </div>
  );
}
