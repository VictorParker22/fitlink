import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { IconDumbbell, IconPhone, IconMail } from '../components/Icons';
import './LoginPage.css';

export default function LoginPage() {
  const { signIn, signUp, signInWithPhone, verifyOtp, signInWithGoogle } = useAuth();
  
  // Auth mode: 'phone' (default, primary) or 'email' (secondary)
  const [authMode, setAuthMode] = useState('phone');
  // Phone flow steps: 'phone' → 'otp' → done
  const [phoneStep, setPhoneStep] = useState('phone');
  const [isNewUser, setIsNewUser] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailLink, setShowEmailLink] = useState(false);
  const [success, setSuccess] = useState('');

  // Phone fields
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phoneEmail, setPhoneEmail] = useState('');
  const [phoneName, setPhoneName] = useState('');

  // Email fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailName, setEmailName] = useState('');

  // Format phone: ensure +1 prefix for US numbers
  const formatPhone = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
    if (raw.startsWith('+')) return raw;
    return `+${digits}`;
  };

  // --- Phone OTP Flow ---
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formatted = formatPhone(phone);
    if (formatted.length < 11) {
      return setError('Please enter a valid phone number');
    }

    setLoading(true);
    try {
      await signInWithPhone(formatted);
      setPhone(formatted);

      // Check if this phone already has a trainer account
      const { data: existingTrainer } = await supabase
        .from('trainers')
        .select('id')
        .eq('phone', formatted)
        .maybeSingle();
      setIsNewUser(!existingTrainer);

      setPhoneStep('otp');
      setSuccess('Verification code sent! Check your phone.');
    } catch (err) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (otpCode.length < 6) {
      return setError('Please enter the 6-digit code');
    }

    setLoading(true);
    try {
      const metadata = {};
      if (phoneName.trim()) metadata.name = phoneName.trim();
      await verifyOtp(phone, otpCode, metadata);

      // Link email if provided (prevents duplicate accounts)
      if (phoneEmail.trim()) {
        try {
          await supabase.auth.updateUser({ email: phoneEmail.trim() });
        } catch (linkErr) {
          console.warn('Email link failed:', linkErr);
        }
      }
      // Auth state change handles redirect
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // --- Email/Password Flow ---
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        await signUp(email, password, emailName);
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setIsSignUp(false);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  // --- Forgot Password ---
  const handleForgotPassword = async () => {
    if (!email.trim()) return setError('Enter your email first, then click Forgot Password');
    setError('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (resetError) throw resetError;
      setSuccess('Password reset link sent! Check your email.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
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
      {/* Ambient background */}
      <div className="login-bg">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
      </div>

      <div className="login-content">
        {/* Logo */}
        <div className="login-logo">
          <div className="logo-icon">
            <IconDumbbell size={32} color="white" />
          </div>
          <h1 className="heading-1">FitLink</h1>
          <p className="text-body text-center" style={{ maxWidth: '260px' }}>
            Grow Your Gym.<br />One Client at a Time.
          </p>
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

        {/* Messages */}
        {error && <div className="auth-message auth-error" id="auth-error">{error}</div>}
        {success && <div className="auth-message auth-success" id="auth-success">{success}</div>}

        {/* ========== PHONE OTP FLOW ========== */}
        {authMode === 'phone' && (
          <>
            {phoneStep === 'phone' && (
              <form className="login-form" onSubmit={handleSendOtp}>
                <div className="input-group">
                  <label className="input-label">Phone Number</label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    id="login-phone"
                    autoComplete="tel"
                  />
                  <p className="input-hint">We'll send you a verification code via SMS</p>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                  id="send-otp-button"
                >
                  {loading ? <span className="btn-spinner" /> : 'Send Verification Code'}
                </button>
              </form>
            )}

            {phoneStep === 'otp' && (
              <form className="login-form" onSubmit={handleVerifyOtp}>
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

                {/* Only show name/email fields for NEW users */}
                {isNewUser && (
                  <>
                    <div className="input-group">
                      <label className="input-label">Your Name</label>
                      <input
                        className="input"
                        type="text"
                        placeholder="Coach Mike Johnson"
                        value={phoneName}
                        onChange={(e) => setPhoneName(e.target.value)}
                        id="phone-name"
                        autoComplete="name"
                      />
                    </div>

                    {/* Optional email linking */}
                    {!showEmailLink ? (
                      <button
                        type="button"
                        className="link-email-toggle"
                        onClick={() => setShowEmailLink(true)}
                      >
                        Already have an email account? <span className="text-accent">Link it</span>
                      </button>
                    ) : (
                      <div className="input-group">
                        <label className="input-label">Email (optional — links your accounts)</label>
                        <input
                          className="input"
                          type="email"
                          placeholder="coach@example.com"
                          value={phoneEmail}
                          onChange={(e) => setPhoneEmail(e.target.value)}
                          id="phone-email-link"
                          autoComplete="email"
                        />
                        <p className="input-hint">Prevents duplicate accounts if you already signed up with email</p>
                      </div>
                    )}
                  </>
                )}

                <div className="input-group">
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
                    required
                    id="otp-code"
                    autoComplete="one-time-code"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-full btn-lg"
                  disabled={loading}
                  id="verify-otp-button"
                >
                  {loading ? <span className="btn-spinner" /> : 'Verify & Sign In'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-full"
                  onClick={handleSendOtp}
                  disabled={loading}
                  id="resend-otp"
                >
                  Resend Code
                </button>
              </form>
            )}
          </>
        )}

        {/* ========== EMAIL FLOW ========== */}
        {authMode === 'email' && (
          <form className="login-form" onSubmit={handleEmailSubmit}>
            {isSignUp && (
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Coach Mike Johnson"
                  value={emailName}
                  onChange={(e) => setEmailName(e.target.value)}
                  required={isSignUp}
                  id="signup-name"
                />
              </div>
            )}
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="coach@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                id="login-email"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                id="login-password"
              />
            </div>

            {!isSignUp && (
              <button
                type="button"
                className="forgot-password-link"
                onClick={handleForgotPassword}
              >
                Forgot password?
              </button>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              id="login-button"
            >
              {loading ? (
                <span className="btn-spinner" />
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>

            <p className="login-switch text-center">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <button
                type="button"
                className="login-switch-link"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccess('');
                }}
                id="toggle-signup"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </form>
        )}

        {/* Divider + Social */}
        <div className="login-divider">
          <span>or continue with</span>
        </div>

        <div className="social-buttons">
          <button
            type="button"
            className="btn btn-secondary social-btn"
            onClick={handleGoogle}
            id="social-google"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <button type="button" className="btn btn-secondary social-btn" id="social-apple">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Apple
          </button>
        </div>
      </div>
    </div>
  );
}
