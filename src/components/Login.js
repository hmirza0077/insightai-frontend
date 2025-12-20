import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import Logo from './Logo';
import './Login.css';

const Login = () => {
  const [step, setStep] = useState('identifier'); // identifier, otp, password, setup-password
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loginMethod, setLoginMethod] = useState('otp'); // 'otp' or 'password'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [otpType, setOtpType] = useState(''); // 'email' or 'sms'
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const { login, user } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Redirect if already logged in
  useEffect(() => {
    if (user || authAPI.isAuthenticated()) {
      navigate('/main');
    }
  }, [user, navigate]);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await authAPI.requestOTP(identifier);
      if (result.success) {
        setOtpType(result.otp_type);
        setMessage(result.message);
        setStep('otp');
        setResendCountdown(60); // Start 60 second countdown
      } else {
        setError(result.error || t.login.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || t.login.error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authAPI.verifyOTP(identifier, otpCode);
      if (result.success) {
        if (result.needs_password_setup) {
          setNeedsPasswordSetup(true);
          setStep('setup-password');
        } else {
          // User already has password, login successful
          await login(result);
          navigate('/main');
        }
      } else {
        setError(result.error || t.login.otpError);
      }
    } catch (err) {
      setError(err.response?.data?.error || t.login.otpError);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== passwordConfirm) {
      setError(t.login.passwordsDoNotMatch);
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError(t.login.passwordMinLength);
      setLoading(false);
      return;
    }

    try {
      const result = await authAPI.setupPassword(password, passwordConfirm);
      if (result.success) {
        await login(result);
        navigate('/main');
      } else {
        setError(result.error || t.login.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || t.login.error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authAPI.passwordLogin(identifier, password);
      if (result.success) {
        await login(result);
        navigate('/main');
      } else {
        setError(result.error || t.login.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || t.login.error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCountdown > 0) return; // Prevent clicking during countdown
    
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await authAPI.resendOTP(identifier);
      if (result && result.success) {
        setMessage(result.message || t.login.otpResent);
        setResendCountdown(60); // Reset countdown to 60 seconds
        setOtpCode(''); // Clear OTP input
      } else {
        setError(result?.error || t.login.error);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || t.login.error);
    } finally {
      setLoading(false);
    }
  };

  const renderIdentifierStep = () => (
    <form onSubmit={loginMethod === 'otp' ? handleRequestOTP : (e) => { e.preventDefault(); setStep('password'); }}>
      <div className="form-group">
        <label htmlFor="identifier">{t.login.emailOrMobile}</label>
        <div className="input-wrapper">
          <input
            type="text"
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={t.login.placeholder}
            className="login-input"
            required
          />
          <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
      </div>

      <div className="login-method-toggle">
        <button
          type="button"
          className={`method-btn ${loginMethod === 'otp' ? 'active' : ''}`}
          onClick={() => setLoginMethod('otp')}
        >
          {t.login.loginWithOtp}
        </button>
        <button
          type="button"
          className={`method-btn ${loginMethod === 'password' ? 'active' : ''}`}
          onClick={() => setLoginMethod('password')}
        >
          {t.login.loginWithPassword}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <button type="submit" disabled={loading} className="login-button">
        {loading ? t.login.processing : loginMethod === 'otp' ? t.login.sendOtp : t.login.continue}
      </button>

      <p className="info-text">
        {loginMethod === 'otp' 
          ? t.login.info
          : t.login.passwordLoginInfo}
      </p>
    </form>
  );

  const renderOTPStep = () => (
    <form onSubmit={handleVerifyOTP}>
      <div className="form-group">
        <label>{t.login.enterOtp}</label>
        <p className="otp-info">
          {t.login.codeSentTo} {otpType === 'email' ? t.login.yourEmail : t.login.yourPhone}
        </p>
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={otpCode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setOtpCode(value);
          }}
          placeholder={t.login.otpPlaceholder}
          maxLength={6}
          required
          className="otp-input"
          autoComplete="one-time-code"
        />
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <button type="submit" disabled={loading || otpCode.length !== 6} className="login-button">
        {loading ? t.login.verifying : t.login.verifyCode}
      </button>

      <div className="resend-section">
        {resendCountdown > 0 ? (
          <p className="countdown-text">
            {t.login.resendIn} <span className="countdown">{resendCountdown}</span> {t.login.seconds}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={loading}
            className="resend-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {t.login.resendOtp}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => { 
          setStep('identifier'); 
          setOtpCode(''); 
          setError(''); 
          setMessage('');
          setResendCountdown(0);
        }}
        className="back-button-text"
      >
        {t.login.back}
      </button>
    </form>
  );

  const renderPasswordStep = () => (
    <form onSubmit={handlePasswordLogin}>
      <div className="form-group">
        <label htmlFor="password">{t.login.password}</label>
        <div className="input-wrapper">
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.login.passwordPlaceholder}
            className="login-input"
            required
          />
          <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25h-10.5a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button type="submit" disabled={loading} className="login-button">
        {loading ? t.login.loggingIn : t.login.button}
      </button>

      <button
        type="button"
        onClick={() => { setStep('identifier'); setPassword(''); setError(''); }}
        className="back-button-text"
      >
        {t.login.back}
      </button>
    </form>
  );

  const renderSetupPasswordStep = () => (
    <form onSubmit={handleSetupPassword}>
      <div className="form-group">
        <label htmlFor="password">{t.login.setupPassword}</label>
        <p className="setup-info">
          {t.login.setupPasswordInfo}
        </p>
        <div className="input-wrapper">
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.login.passwordPlaceholder}
            className="login-input"
            required
            minLength="8"
          />
          <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25h-10.5a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="passwordConfirm">{t.login.passwordConfirm}</label>
        <div className="input-wrapper">
          <input
            type="password"
            id="passwordConfirm"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder={t.login.passwordConfirmPlaceholder}
            className="login-input"
            required
            minLength="8"
          />
          <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25h-10.5a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button type="submit" disabled={loading || password !== passwordConfirm || password.length < 8} className="login-button">
        {loading ? t.login.settingUp : t.login.setPasswordContinue}
      </button>
    </form>
  );

  return (
    <div className="login-container">
      <button onClick={toggleLanguage} className="language-switch">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
        {t.language[language === 'fa' ? 'en' : 'fa']}
      </button>
      
      <div className="login-card">
        <div className="login-logo">
          <Logo size={64} className="logo-icon" />
        </div>
        <h1>{t.login.title}</h1>
        <p className="subtitle">{t.login.subtitle}</p>

        {step === 'identifier' && renderIdentifierStep()}
        {step === 'otp' && renderOTPStep()}
        {step === 'password' && renderPasswordStep()}
        {step === 'setup-password' && renderSetupPasswordStep()}
      </div>
    </div>
  );
};

export default Login;
