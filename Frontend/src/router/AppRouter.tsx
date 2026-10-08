import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import Login from "../screens/Login";
import InvitarViajeros from "../screens/InvitarViajeros";

interface AppRouterProps {
  session: Session | null;
  handleLogin: (email: string, password: string) => Promise<void>;
  error: string;
  loading: boolean;
}

export default function AppRouter({ session, handleLogin, error, loading }: AppRouterProps) {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública: si ya hay sesión, redirige al inicio */}
        <Route
          path="/login"
          element={
            !session ? (
              <Login onLogin={handleLogin} error={error} loading={loading} />
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
                Sesión iniciada como {session.user.email}
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
      </Routes>
    </BrowserRouter>
  );
}
