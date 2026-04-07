import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import SignupScreen from './screens/SignupScreen.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';

// Placeholder home screen (replaced in Part 2)
function HomeScreen() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-amber-50/30 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-stone-900">sandroad</h1>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50"
          >
            로그아웃
          </button>
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          <p className="text-sm text-stone-600">로그인 성공</p>
          <p className="text-xs text-stone-400 mt-2">{user?.email}</p>
          <p className="text-xs text-stone-400">{user?.uid}</p>
          <p className="text-xs text-amber-700 mt-4">
            ✓ 1부 완료. 2부에서 에디터 화면을 붙일 예정.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="sandroad 불러오는 중..." />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/signup" element={<SignupScreen />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeScreen />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
