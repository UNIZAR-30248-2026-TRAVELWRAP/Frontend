import { useState, type CSSProperties, type FormEvent } from "react"
import appLogo from "../assets/travelwrap-logo.png"

const C = {
  navy: "#1A365D",
  blue: "#2B6CB0",
  muted: "#718096",
  border: "#E2E8F0",
  red: "#C53030",
  redBg: "#FFF5F5",
}

const NUNITO = "'Nunito', sans-serif"

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
  fontSize: 14,
  color: C.navy,
  outline: "none",
}

const buttonStyle: CSSProperties = {
  width: "100%",
  background: "white",
  border: `1.5px solid ${C.border}`,
  borderRadius: 15,
  padding: "14px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  color: C.navy,
  fontFamily: NUNITO,
  fontSize: 15,
  fontWeight: 800,
  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 01-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0012 22z" />
      <path fill="#FBBC05" d="M6.39 13.92A6.02 6.02 0 016.07 12c0-.67.11-1.32.32-1.92V7.47H3.04A10 10 0 002 12c0 1.61.39 3.14 1.04 4.53l3.35-2.61z" />
      <path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.82 1.49l2.88-2.88A9.65 9.65 0 0012 2a10 10 0 00-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95z" />
    </svg>
  )
}

type LoginProps = {
  onLogin?: (email: string, password: string) => void
  onGoogleLogin?: () => void
  error?: string
  loading?: boolean
}

export default function Login({ onLogin, onGoogleLogin, error, loading = false }: LoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const canSubmit = email.trim() !== "" && password !== "" && !loading

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    onLogin?.(email.trim(), password)
  }

  return (
    <div
      style={{
        background: `linear-gradient(160deg, ${C.navy} 0%, ${C.blue} 100%)`,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "40px 24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              background: "white",
              width: 92,
              height: 92,
              borderRadius: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            <img
              src={appLogo}
              alt="Logo de TravelWrap"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div
            style={{
              fontFamily: NUNITO,
              fontSize: 32,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.15,
            }}
          >
            TravelWrap
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.7)",
              fontFamily: NUNITO,
              marginTop: 8,
              fontSize: 15,
            }}
          >
            Organiza tus viajes en grupo
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div>
            <label htmlFor="login-email" style={labelStyle}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor="login-password" style={labelStyle}>
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contraseña"
              style={inputStyle}
            />
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

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              ...buttonStyle,
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.7,
              marginTop: 4,
            }}
          >
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "20px 0",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.3)" }} />
          <span
            style={{
              color: "rgba(255,255,255,0.7)",
              fontFamily: NUNITO,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            o
          </span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.3)" }} />
        </div>

        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={loading}
          style={{
            ...buttonStyle,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <GoogleLogo />
          Continuar con Google
        </button>
      </div>
    </div>
  )
}
