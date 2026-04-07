import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function SignupScreen() {
  const navigate = useNavigate();
  const { signupWithEmail, loginWithGoogle } = useAuth();
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
      setError('비밀번호가 일치하지 않습니다');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다');
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
          <h2 className="text-sm font-bold text-stone-900 mb-4">회원가입</h2>

          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">이름</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:border-amber-500 focus:outline-none"
              />
            </div>
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
              <label className="block text-xs font-medium text-stone-700 mb-1">비밀번호 (6자 이상)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-md focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">비밀번호 확인</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
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
              {loading ? '가입 중...' : '가입하기'}
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
            className="mt-3 w-full px-3 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50 disabled:opacity-50"
          >
            Google로 계속하기
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-stone-500">
          이미 계정이 있나요?{' '}
          <Link to="/login" className="text-amber-700 hover:text-amber-900 font-medium">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

function mapSignupError(code) {
  const map = {
    'auth/email-already-in-use': '이미 사용 중인 이메일입니다',
    'auth/invalid-email': '이메일 형식이 올바르지 않습니다',
    'auth/weak-password': '비밀번호가 너무 약합니다'
  };
  return map[code] || '회원가입에 실패했습니다';
}
