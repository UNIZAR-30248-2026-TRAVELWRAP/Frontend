import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import type { ComponentProps } from "react";
import type { Sesion } from "../services/authApi";
import Login from "../screens/Login";
import MisViajes from "../screens/MisViajes";
import InvitarViajeros from "../screens/InvitarViajeros";
import AuthCallback from "../screens/AuthCallback";
import Registro from "../screens/Registro";
import UnirseViaje from "../screens/UnirseViaje";
import InvitarViajerosDeViaje from "../screens/InvitarViajerosDeViaje";
import { rutaTrasLogin } from "../services/invitacionPendiente";

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
        {/* Ruta pública: si ya hay sesión, redirige al inicio (o a la invitación que se abrió sin sesión) */}
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
              <Navigate to={rutaTrasLogin()} replace />
            )
          }
        />

        {/* Pantalla principal «Mis viajes» (privada): si no hay sesión, redirige al login */}
        <Route
          path="/"
          element={
            session ? (
              <MisViajes
                nombreUsuario={session.usuario.nombre ?? session.usuario.email.split("@")[0]}
                emailUsuario={session.usuario.email}
              />
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
        {/* Invitar con el enlace real del viaje (protegida) */}
        <Route
          path="/viajes/:viajeId/invitar"
          element={
            session ? <InvitarViajerosDeViaje sesion={session} /> : <Navigate to="/login" replace />
          }
        />

        {/* Enlace/QR de invitación: sin sesión pasa por el login y vuelve aquí */}
        <Route path="/unirse/:token" element={<UnirseViaje sesion={session} />} />

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
              <Navigate to={rutaTrasLogin()} replace />
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
