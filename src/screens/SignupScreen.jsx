import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';

export default function SignupScreen() {
  const navigate = useNavigate();
  const { signupWithEmail, loginWithGoogle } = useAuth();
  const { theme, t } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be 6+ characters');
      return;
    }
    setLoading(true);
    try {
      await signupWithEmail(email, password, displayName);
      navigate('/');
    } catch (err) {
      setError(mapSignupError(err.code));
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
      setError('Google login failed');
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
          <h2 className={`text-sm font-bold ${theme.text} mb-4 ${monoCls}`}>Sign up / 회원가입</h2>

          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className={`block text-xs font-medium ${theme.text} mb-1 ${monoCls}`}>Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${monoCls} ${theme.input}`}
              />
            </div>
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
              <label className={`block text-xs font-medium ${theme.text} mb-1 ${monoCls}`}>Password (6+)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${monoCls} ${theme.input}`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium ${theme.text} mb-1 ${monoCls}`}>Confirm</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
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
              {loading ? '...' : 'Sign up'}
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
            className={`mt-3 w-full px-3 py-2 text-sm font-medium border rounded-md disabled:opacity-50 ${monoCls} ${theme.button}`}
          >
            Continue with Google
          </button>
        </div>

        <p className={`mt-4 text-center text-xs ${theme.textMuted} ${monoCls}`}>
          Already have an account?{' '}
          <Link to="/login" className={`font-medium ${theme.accentText}`}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

function mapSignupError(code) {
  const map = {
    'auth/email-already-in-use': 'Email already in use',
    'auth/invalid-email': 'Invalid email format',
    'auth/weak-password': 'Password too weak'
  };
  return map[code] || 'Sign up failed';
}
