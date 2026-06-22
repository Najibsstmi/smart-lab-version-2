import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';

import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import BookingForm from './pages/BookingForm';
import BookingList from './pages/BookingList';
import Analysis from './pages/Analysis';
import PrintLayout from './pages/PrintLayout';

import { useAuth } from './contexts/AuthContext';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Memuatkan...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/lupa-kata-laluan" element={<ForgotPassword />} />

          {/* Print pun kena login supaya data & akses terkawal */}
          <Route
            path="/print/:id"
            element={
              <RequireAuth>
                <PrintLayout />
              </RequireAuth>
            }
          />

          {/* Semua page utama dalam Layout */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="tempahan-baru" element={<BookingForm />} />
            <Route path="tempahan" element={<BookingList />} />
            <Route path="analisis" element={<Analysis />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </DataProvider>
    </AuthProvider>
  );
}
