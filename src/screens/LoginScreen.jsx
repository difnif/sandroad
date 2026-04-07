import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { loginWithEmail, loginWithGoogle } = useAuth();
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
      setError('Google 로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-stone-900">sandroad</h1>
          <p className="text-xs text-stone-500 mt-1">구조 기획 도구</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-5">
          <h2 className="text-sm font-bold text-stone-900 mb-4">로그인</h2>

          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:border-amber-500 focus:outline-none"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-stone-800 rounded-md hover:bg-stone-900 disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-[10px] text-stone-400">또는</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-3 w-full px-3 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <GoogleIcon />
            Google로 계속하기
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-stone-500">
          계정이 없나요?{' '}
          <Link to="/signup" className="text-amber-700 hover:text-amber-900 font-medium">
            회원가입
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
    'auth/invalid-email': '이메일 형식이 올바르지 않습니다',
    'auth/user-not-found': '등록되지 않은 이메일입니다',
    'auth/wrong-password': '비밀번호가 올바르지 않습니다',
    'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다',
    'auth/too-many-requests': '너무 많은 시도. 잠시 후 다시 시도하세요',
    'auth/network-request-failed': '네트워크 연결을 확인하세요'
  };
  return map[code] || '로그인에 실패했습니다';
}
