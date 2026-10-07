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

type LoginProps = {
  onLogin?: (email: string, password: string) => void
  error?: string
  loading?: boolean
}

export default function Login({ onLogin, error, loading = false }: LoginProps) {
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
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  )
}
