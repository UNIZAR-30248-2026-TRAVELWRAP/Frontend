import { useState, type CSSProperties, type FormEvent } from "react"
import { C, NUNITO } from "../styles/tokens"
import PortadaAcceso from "../components/PortadaAcceso"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LONGITUD_MINIMA = 8

const labelStyle: CSSProperties = {
  display: "block",
  fontFamily: NUNITO,
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(255,255,255,0.75)",
  letterSpacing: 0.8,
  textTransform: "uppercase",
  marginBottom: 6,
}

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "white",
  border: `1.5px solid ${C.border}`,
  borderRadius: 14,
  padding: "13px 16px",
  fontFamily: NUNITO,
  fontSize: 16,
  color: C.navy,
  outline: "none",
}

const avisoStyle: CSSProperties = {
  color: "#FEB2B2",
  fontFamily: NUNITO,
  fontSize: 12,
  fontWeight: 700,
  marginTop: 6,
}

type RegistroProps = {
  onRegistro?: (nombre: string, email: string, password: string) => void
  onIrALogin?: () => void
  error?: string
  aviso?: string
  loading?: boolean
}

export default function Registro({ onRegistro, onIrALogin, error, aviso, loading = false }: RegistroProps) {
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmacion, setConfirmacion] = useState("")

  const emailValido = EMAIL_REGEX.test(email.trim())
  const passwordValida = password.length >= LONGITUD_MINIMA
  const coinciden = password === confirmacion

  const avisoEmail = email !== "" && !emailValido ? "Introduce un email válido" : ""
  const avisoPassword =
    password !== "" && !passwordValida ? `La contraseña debe tener al menos ${LONGITUD_MINIMA} caracteres` : ""
  const avisoConfirmacion = confirmacion !== "" && !coinciden ? "Las contraseñas no coinciden" : ""

  const canSubmit =
    nombre.trim() !== "" && emailValido && passwordValida && confirmacion !== "" && coinciden && !loading

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    onRegistro?.(nombre.trim(), email.trim(), password)
  }

  return (
    <PortadaAcceso titulo="Crea tu cuenta" subtitulo="Empieza a organizar tus viajes en grupo">
      <form
        onSubmit={handleSubmit}
        noValidate
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label htmlFor="registro-nombre" style={labelStyle}>
            Nombre
          </label>
          <input
            id="registro-nombre"
            type="text"
            autoComplete="name"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Tu nombre"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="registro-email" style={labelStyle}>
            Email
          </label>
          <input
            id="registro-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@email.com"
            aria-invalid={avisoEmail !== ""}
            aria-describedby={avisoEmail ? "registro-email-aviso" : undefined}
            style={inputStyle}
          />
          {avisoEmail && (
            <div id="registro-email-aviso" style={avisoStyle}>
              {avisoEmail}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="registro-password" style={labelStyle}>
            Contraseña
          </label>
          <input
            id="registro-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={`Mínimo ${LONGITUD_MINIMA} caracteres`}
            aria-invalid={avisoPassword !== ""}
            aria-describedby={avisoPassword ? "registro-password-aviso" : undefined}
            style={inputStyle}
          />
          {avisoPassword && (
            <div id="registro-password-aviso" style={avisoStyle}>
              {avisoPassword}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="registro-confirmacion" style={labelStyle}>
            Repite la contraseña
          </label>
          <input
            id="registro-confirmacion"
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(event) => setConfirmacion(event.target.value)}
            placeholder="Vuelve a escribirla"
            aria-invalid={avisoConfirmacion !== ""}
            aria-describedby={avisoConfirmacion ? "registro-confirmacion-aviso" : undefined}
            style={inputStyle}
          />
          {avisoConfirmacion && (
            <div id="registro-confirmacion-aviso" style={avisoStyle}>
              {avisoConfirmacion}
            </div>
          )}
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: C.redBg,
              border: `1.5px solid ${C.red}55`,
              borderRadius: 12,
              padding: "10px 14px",
              color: C.red,
              fontFamily: NUNITO,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        {aviso && (
          <div
            role="status"
            style={{
              background: C.greenBg,
              border: `1.5px solid ${C.green}55`,
              borderRadius: 12,
              padding: "10px 14px",
              color: C.green,
              fontFamily: NUNITO,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {aviso}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            width: "100%",
            background: "white",
            border: `1.5px solid ${C.border}`,
            borderRadius: 15,
            padding: "14px 16px",
            color: C.navy,
            fontFamily: NUNITO,
            fontSize: 15,
            fontWeight: 800,
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.7,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            marginTop: 4,
          }}
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      {onIrALogin && (
        <div
          style={{
            textAlign: "center",
            marginTop: 22,
            color: "rgba(255,255,255,0.75)",
            fontFamily: NUNITO,
            fontSize: 14,
          }}
        >
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            onClick={onIrALogin}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: "white",
              fontFamily: NUNITO,
              fontSize: 14,
              fontWeight: 800,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Inicia sesión
          </button>
        </div>
      )}
    </PortadaAcceso>
  )
}
