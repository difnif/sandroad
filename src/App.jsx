import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import LoginScreen from './screens/LoginScreen.jsx';
import SignupScreen from './screens/SignupScreen.jsx';
import EditorScreen from './screens/EditorScreen.jsx';
import CityViewScreen from './screens/CityViewScreen.jsx';
import LoadingSpinner from './components/common/LoadingSpinner.jsx';

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/signup" element={<SignupScreen />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <EditorScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/graph"
        element={
          <ProtectedRoute>
            <CityViewScreen />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
