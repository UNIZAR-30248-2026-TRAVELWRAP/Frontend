import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { ComponentProps } from "react";
import type { Sesion } from "../services/authApi";
import Login from "../screens/Login";
import MisViajes from "../screens/MisViajes";
import CrearViaje from "../screens/CrearViaje";
import InvitarViajeros from "../screens/InvitarViajeros";
import AuthCallback from "../screens/AuthCallback";
import Registro from "../screens/Registro";
import UnirseViaje from "../screens/UnirseViaje";
import Perfil from "../screens/Perfil";
import InicioViaje from "../screens/InicioViaje";
import EditarViaje from "../screens/EditarViaje";
import ViajesArchivados from "../screens/ViajesArchivados";
import Votaciones from "../screens/Votaciones";
import CrearVotacion from "../screens/CrearVotacion";
import ElegirDestino from "../screens/ElegirDestino";
import AnadirActividad from "../screens/AnadirActividad";
import AnadirGasto from "../screens/AnadirGasto";
import ControlGastos from "../screens/ControlGastos";
import Itinerario from "../screens/Itinerario";
import { buscarDirecciones } from "../services/actividadesApi";
import type { SeccionViaje } from "../components/BarraInferior";
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
  handleCerrarSesion: () => void;
  cerrandoSesion: boolean;
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

type NavegacionMisViajes = "onCreateTrip" | "onViewPerfil" | "onSelectTrip" | "onSelectPendingTrip" | "onViewPastTrip";

// Cualquier tarjeta (activa, pendiente de destino o anterior) abre el inicio de ese viaje
function RutaMisViajes(props: Omit<ComponentProps<typeof MisViajes>, NavegacionMisViajes>) {
  const navigate = useNavigate();
  const abrirViaje = (id: string) => navigate(`/viajes/${id}`);
  return (
    <MisViajes
      {...props}
      onCreateTrip={() => navigate("/viajes/nuevo")}
      onViewPerfil={() => navigate("/perfil")}
      onSelectTrip={abrirViaje}
      onSelectPendingTrip={(id) => navigate(`/viajes/${id}/destino`)}
      onViewPastTrip={abrirViaje}
    />
  );
}

function RutaPerfil(props: Omit<ComponentProps<typeof Perfil>, "onVolver" | "onVerArchivados">) {
  const navigate = useNavigate();
  return <Perfil {...props} onVolver={() => navigate("/")} onVerArchivados={() => navigate("/viajes/archivados")} />;
}

const RUTAS_DE_SECCION: Partial<Record<SeccionViaje, string>> = { itinerario: "itinerario", gastos: "gastos" };

const rutaDeSeccion = (viajeId: string, seccion: SeccionViaje) =>
  RUTAS_DE_SECCION[seccion] ? `/viajes/${viajeId}/${RUTAS_DE_SECCION[seccion]}` : `/viajes/${viajeId}`;

// Inicio del viaje de la URL. Al cerrarlo queda archivado y se va a «Viajes archivados»
function RutaInicioViaje({ sesion }: { sesion: Sesion }) {
  const { viajeId = "" } = useParams();
  const navigate = useNavigate();
  return (
    <InicioViaje
      key={viajeId}
      viajeId={viajeId}
      tokenSesion={sesion.token}
      onVolver={() => navigate("/")}
      onEditar={() => navigate(`/viajes/${viajeId}/editar`)}
      onInvitar={() => navigate(`/viajes/${viajeId}/invitar`)}
      onVotaciones={() => navigate(`/viajes/${viajeId}/votaciones`)}
      onCambiarSeccion={(seccion) => navigate(rutaDeSeccion(viajeId, seccion))}
      onPendienteDestino={() => navigate(`/viajes/${viajeId}/destino`, { replace: true })}
      onArchivado={() => navigate("/viajes/archivados")}
    />
  );
}

// Al guardar se vuelve al inicio del viaje, que vuelve a pedir los datos ya actualizados
function RutaEditarViaje({ sesion }: { sesion: Sesion }) {
  const { viajeId = "" } = useParams();
  const navigate = useNavigate();
  return (
    <EditarViaje
      key={viajeId}
      viajeId={viajeId}
      tokenSesion={sesion.token}
      onVolver={() => navigate(`/viajes/${viajeId}`)}
      onGuardado={() => navigate(`/viajes/${viajeId}`, { replace: true })}
    />
  );
}

function RutaViajesArchivados({ sesion }: { sesion: Sesion }) {
  const navigate = useNavigate();
  return (
    <ViajesArchivados
      tokenSesion={sesion.token}
      onVolver={() => navigate("/perfil")}
      onVerViaje={(id) => navigate(`/viajes/${id}`)}
    />
  );
}

// El enlace de invitación lo pide la propia pantalla al backend con el viaje de la URL
function RutaInvitarViajeros({ sesion }: { sesion: Sesion }) {
  const { viajeId } = useParams();
  const navigate = useNavigate();
  return <InvitarViajeros viajeId={viajeId ?? ""} tokenSesion={sesion.token} onBack={() => navigate(-1)} />;
}

// Al crear el viaje se abre su pantalla; si el destino se va a votar, se abre la votación
function RutaCrearViaje({ sesion }: { sesion: Sesion }) {
  const navigate = useNavigate();
  return (
    <CrearViaje
      tokenSesion={sesion.token}
      onBack={() => navigate("/")}
      onCreated={(viaje) =>
        navigate(viaje.pendiente_destino ? `/viajes/${viaje.id}/destino` : `/viajes/${viaje.id}`, { replace: true })
      }
    />
  );
}

function RutaVotaciones({ sesion }: { sesion: Sesion }) {
  const { viajeId = "" } = useParams();
  const navigate = useNavigate();
  return (
    <Votaciones
      key={viajeId}
      viajeId={viajeId}
      tokenSesion={sesion.token}
      onVolver={() => navigate(`/viajes/${viajeId}`)}
      onCrearVotacion={() => navigate(`/viajes/${viajeId}/votaciones/nueva`)}
    />
  );
}

// Al publicarla (o al volver) se regresa a la lista, que la muestra la primera, sin dejar el formulario en el
// historial. Si se entró directamente por la URL, no hay a dónde volver y se abre la lista en su lugar
function RutaCrearVotacion({ sesion }: { sesion: Sesion }) {
  const { viajeId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const volverALaLista = () => {
    if (location.key === "default") void navigate(`/viajes/${viajeId}/votaciones`, { replace: true });
    else void navigate(-1);
  };
  return (
    <CrearVotacion
      key={viajeId}
      viajeId={viajeId}
      tokenSesion={sesion.token}
      onVolver={volverALaLista}
      onCreada={volverALaLista}
    />
  );
}

const rutaItinerario = (viajeId: string, fecha: string) =>
  `/viajes/${viajeId}/itinerario${fecha ? `?fecha=${fecha}` : ""}`;

function RutaItinerario({ sesion }: { sesion: Sesion }) {
  const { viajeId = "" } = useParams();
  const [parametros] = useSearchParams();
  const navigate = useNavigate();
  return (
    <Itinerario
      key={viajeId}
      viajeId={viajeId}
      tokenSesion={sesion.token}
      diaInicial={parametros.get("fecha") ?? ""}
      onVolver={() => navigate("/")}
      onAnadirActividad={(fecha) => navigate(`/viajes/${viajeId}/actividades/nueva${fecha ? `?fecha=${fecha}` : ""}`)}
      onEditarActividad={(actividad) =>
        navigate(`/viajes/${viajeId}/actividades/${actividad.id}/editar?fecha=${actividad.fecha}`)
      }
      onCambiarSeccion={(seccion) => navigate(rutaDeSeccion(viajeId, seccion))}
    />
  );
}

function RutaAnadirActividad({ sesion }: { sesion: Sesion }) {
  const { viajeId = "" } = useParams();
  const [parametros] = useSearchParams();
  const navigate = useNavigate();
  const fechaInicial = parametros.get("fecha") ?? "";
  return (
    <AnadirActividad
      key={viajeId}
      viajeId={viajeId}
      tokenSesion={sesion.token}
      fechaInicial={fechaInicial}
      onVolver={() => navigate(rutaItinerario(viajeId, fechaInicial))}
      onGuardada={(fecha) => navigate(rutaItinerario(viajeId, fecha), { replace: true })}
      onBuscarDirecciones={(consulta) => buscarDirecciones(consulta, sesion.token).then((resultado) => resultado.direcciones)}
    />
  );
}

function RutaEditarActividad({ sesion }: { sesion: Sesion }) {
  const { viajeId = "", actividadId = "" } = useParams();
  const [parametros] = useSearchParams();
  const navigate = useNavigate();
  const fechaDeVuelta = parametros.get("fecha") ?? "";
  return (
    <AnadirActividad
      key={actividadId}
      viajeId={viajeId}
      actividadId={actividadId}
      tokenSesion={sesion.token}
      onVolver={() => navigate(rutaItinerario(viajeId, fechaDeVuelta))}
      onGuardada={(fecha) => navigate(rutaItinerario(viajeId, fecha), { replace: true })}
      onBuscarDirecciones={(consulta) => buscarDirecciones(consulta, sesion.token).then((resultado) => resultado.direcciones)}
    />
  );
}

function RutaControlGastos({ sesion }: { sesion: Sesion }) {
  const { viajeId = "" } = useParams();
  const navigate = useNavigate();
  return (
    <ControlGastos
      key={viajeId}
      viajeId={viajeId}
      tokenSesion={sesion.token}
      onVolver={() => navigate("/")}
      onAnadirGasto={() => navigate(`/viajes/${viajeId}/gastos/nuevo`)}
      onCambiarSeccion={(seccion) => navigate(rutaDeSeccion(viajeId, seccion))}
    />
  );
}

// Al registrar el gasto (o al volver) se regresa a Control de Gastos, que vuelve a pedir el historial,
// sin dejar el formulario en el historial del navegador
function RutaAnadirGasto({ sesion }: { sesion: Sesion }) {
  const { viajeId = "" } = useParams();
  const navigate = useNavigate();
  const volverAControlGastos = () => navigate(`/viajes/${viajeId}/gastos`, { replace: true });
  return (
    <AnadirGasto
      key={viajeId}
      viajeId={viajeId}
      tokenSesion={sesion.token}
      usuarioId={sesion.usuario.id}
      onVolver={volverAControlGastos}
      onRegistrado={volverAControlGastos}
    />
  );
}

// Viaje pendiente de destino. Al fijarlo (o si ya lo tenía) se pasa al inicio del viaje
function RutaElegirDestino({ sesion }: { sesion: Sesion }) {
  const { viajeId = "" } = useParams();
  const navigate = useNavigate();
  return (
    <ElegirDestino
      key={viajeId}
      viajeId={viajeId}
      tokenSesion={sesion.token}
      onVolver={() => navigate("/")}
      onInvitar={() => navigate(`/viajes/${viajeId}/invitar`)}
      onDestinoFijado={() => navigate(`/viajes/${viajeId}`, { replace: true })}
    />
  );
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
  handleCerrarSesion,
  cerrandoSesion,
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
              <RutaMisViajes
                nombreUsuario={session.usuario.nombre ?? session.usuario.email.split("@")[0]}
                emailUsuario={session.usuario.email}
                tokenSesion={session.token}
                mostrarEjemplos={false}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Mi Perfil y cierre de sesión (privada) */}
        <Route
          path="/perfil"
          element={
            session ? (
              <RutaPerfil
                nombre={session.usuario.nombre ?? session.usuario.email.split("@")[0]}
                email={session.usuario.email}
                onCerrarSesion={handleCerrarSesion}
                cerrandoSesion={cerrandoSesion}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Formulario «Nuevo viaje» (privada) */}
        <Route
          path="/viajes/nuevo"
          element={session ? <RutaCrearViaje sesion={session} /> : <Navigate to="/login" replace />}
        />

        {/* Viajes archivados, de solo lectura, con la opción de eliminarlos (privada) */}
        <Route
          path="/viajes/archivados"
          element={session ? <RutaViajesArchivados sesion={session} /> : <Navigate to="/login" replace />}
        />

        {/* Inicio del viaje con la barra inferior (privada) */}
        <Route
          path="/viajes/:viajeId"
          element={session ? <RutaInicioViaje sesion={session} /> : <Navigate to="/login" replace />}
        />

        {/* Votaciones del viaje (privada) */}
        <Route
          path="/viajes/:viajeId/votaciones"
          element={session ? <RutaVotaciones sesion={session} /> : <Navigate to="/login" replace />}
        />

        {/* Crear una votación del viaje (privada) */}
        <Route
          path="/viajes/:viajeId/votaciones/nueva"
          element={session ? <RutaCrearVotacion sesion={session} /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/viajes/:viajeId/itinerario"
          element={session ? <RutaItinerario sesion={session} /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/viajes/:viajeId/actividades/:actividadId/editar"
          element={session ? <RutaEditarActividad sesion={session} /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/viajes/:viajeId/actividades/nueva"
          element={session ? <RutaAnadirActividad sesion={session} /> : <Navigate to="/login" replace />}
        />

        {/* Control de Gastos: total e historial de gastos del viaje (privada) */}
        <Route
          path="/viajes/:viajeId/gastos"
          element={session ? <RutaControlGastos sesion={session} /> : <Navigate to="/login" replace />}
        />

        {/* Registrar un gasto compartido del viaje (privada) */}
        <Route
          path="/viajes/:viajeId/gastos/nuevo"
          element={session ? <RutaAnadirGasto sesion={session} /> : <Navigate to="/login" replace />}
        />

        {/* Votación del destino de un viaje que aún no lo tiene (privada) */}
        <Route
          path="/viajes/:viajeId/destino"
          element={session ? <RutaElegirDestino sesion={session} /> : <Navigate to="/login" replace />}
        />

        {/* Editar los datos del viaje: solo el creador y mientras está activo (privada) */}
        <Route
          path="/viajes/:viajeId/editar"
          element={session ? <RutaEditarViaje sesion={session} /> : <Navigate to="/login" replace />}
        />

        {/* Invitar con el enlace real del viaje (protegida) */}
        <Route
          path="/viajes/:viajeId/invitar"
          element={
            session ? <RutaInvitarViajeros sesion={session} /> : <Navigate to="/login" replace />
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
