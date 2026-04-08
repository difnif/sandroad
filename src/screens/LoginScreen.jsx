import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const { theme, t } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err) {
      setError(mapFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError('Google 로그인에 실패했습니다 / Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const monoCls = theme.fontMono ? 'font-mono-ui' : '';

  return (
    <div className={`min-h-screen ${theme.bg} flex items-center justify-center p-4`}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className={`text-2xl font-bold ${theme.text} ${monoCls}`}>sandroad</h1>
          <p className={`text-xs ${theme.textMuted} mt-1 ${monoCls}`}>{t.appTagline}</p>
        </div>

        <div className={`${theme.bgPanel} border ${theme.border} rounded-lg p-5`}>
          <h2 className={`text-sm font-bold ${theme.text} mb-4 ${monoCls}`}>Login / 로그인</h2>

          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div>
              <label className={`block text-xs font-medium ${theme.text} mb-1 ${monoCls}`}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${monoCls} ${theme.input}`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium ${theme.text} mb-1 ${monoCls}`}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${monoCls} ${theme.input}`}
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className={`w-full px-3 py-2 text-sm font-medium rounded-md disabled:opacity-50 ${monoCls} ${theme.buttonPrimary}`}
            >
              {loading ? '...' : 'Login'}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-2">
            <div className={`flex-1 h-px ${theme.border}`} style={{ borderTopWidth: 1 }} />
            <span className={`text-[10px] ${theme.textDim}`}>or</span>
            <div className={`flex-1 h-px ${theme.border}`} style={{ borderTopWidth: 1 }} />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`mt-3 w-full px-3 py-2 text-sm font-medium border rounded-md disabled:opacity-50 flex items-center justify-center gap-2 ${monoCls} ${theme.button}`}
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <p className={`mt-4 text-center text-xs ${theme.textMuted} ${monoCls}`}>
          No account?{' '}
          <Link to="/signup" className={`font-medium ${theme.accentText}`}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function mapFirebaseError(code) {
  const map = {
    'auth/invalid-email': 'Invalid email format',
    'auth/user-not-found': 'No account with this email',
    'auth/wrong-password': 'Wrong password',
    'auth/invalid-credential': 'Wrong email or password',
    'auth/too-many-requests': 'Too many attempts. Try later.',
    'auth/network-request-failed': 'Network error'
  };
  return map[code] || 'Login failed';
}
