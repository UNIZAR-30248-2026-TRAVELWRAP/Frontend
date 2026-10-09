import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { Sesion } from "../services/authApi";
import Login from "../screens/Login";
import InvitarViajeros from "../screens/InvitarViajeros";
import AuthCallback from "../screens/AuthCallback";

interface AppRouterProps {
  session: Sesion | null;
  handleLogin: (email: string, password: string) => Promise<void>;
  handleGoogleLogin: () => void;
  handleSesionGoogle: (sesion: Sesion) => void;
  handleErrorGoogle: (mensaje: string) => void;
  error: string;
  loading: boolean;
}

export default function AppRouter({
  session,
  handleLogin,
  handleGoogleLogin,
  handleSesionGoogle,
  handleErrorGoogle,
  error,
  loading,
}: AppRouterProps) {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública: si ya hay sesión, redirige al inicio */}
        <Route
          path="/login"
          element={
            !session ? (
              <Login
                onLogin={handleLogin}
                onGoogleLogin={handleGoogleLogin}
                error={error}
                loading={loading}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Ruta privada: si no hay sesión, redirige al login */}
        <Route
          path="/"
          element={
            session ? (
              <div style={{ padding: 24, fontFamily: "'Nunito', sans-serif" }}>
                Sesión iniciada como {session.usuario.email}
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Ruta para invitar a otros viajeros (protegida) */}
        <Route
          path="/invitar-viajeros"
          element={
            session ? (
              <InvitarViajeros />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/auth/callback"
          element={<AuthCallback onSesion={handleSesionGoogle} onError={handleErrorGoogle} />}
        />
      </Routes>
    </BrowserRouter>
  );
}
