import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import type { ComponentProps } from "react";
import type { Sesion } from "../services/authApi";
import Login from "../screens/Login";
import InvitarViajeros from "../screens/InvitarViajeros";
import AuthCallback from "../screens/AuthCallback";
import Registro from "../screens/Registro";

interface AppRouterProps {
  session: Sesion | null;
  handleLogin: (email: string, password: string) => Promise<void>;
  handleRegistro: (nombre: string, email: string, password: string) => Promise<void>;
  errorRegistro: string;
  avisoRegistro: string;
  loadingRegistro: boolean;
  handleReenviarConfirmacion?: () => void;
  avisoLogin: string;
  handleGoogleLogin: () => void;
  handleSesionGoogle: (sesion: Sesion) => void;
  handleErrorGoogle: (mensaje: string) => void;
  error: string;
  loading: boolean;
}

function RutaLogin(props: Omit<ComponentProps<typeof Login>, "onIrARegistro">) {
  const navigate = useNavigate();
  return <Login {...props} onIrARegistro={() => navigate("/registro")} />;
}

function RutaRegistro(props: Omit<ComponentProps<typeof Registro>, "onIrALogin">) {
  const navigate = useNavigate();
  return <Registro {...props} onIrALogin={() => navigate("/login")} />;
}

export default function AppRouter({
  session,
  handleLogin,
  handleRegistro,
  errorRegistro,
  avisoRegistro,
  loadingRegistro,
  handleReenviarConfirmacion,
  avisoLogin,
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
              <RutaLogin
                onLogin={handleLogin}
                onGoogleLogin={handleGoogleLogin}
                onReenviarConfirmacion={handleReenviarConfirmacion}
                aviso={avisoLogin}
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
          path="/registro"
          element={
            !session ? (
              <RutaRegistro
                onRegistro={handleRegistro}
                error={errorRegistro}
                aviso={avisoRegistro}
                loading={loadingRegistro}
              />
            ) : (
              <Navigate to="/" replace />
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
