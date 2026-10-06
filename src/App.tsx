import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import Login from "./screens/Login"
import { supabase } from "./lib/supabase"

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const handleLogin = async (email: string, password: string) => {
    setLoading(true)
    setError("")
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (authError) setError("Email o contraseña incorrectos")
    setLoading(false)
  }

  if (checking) return null

  if (session) {
    return (
      <div style={{ padding: 24, fontFamily: "'Nunito', sans-serif" }}>
        Sesión iniciada como {session.user.email}
      </div>
    )
  }

  return <Login onLogin={handleLogin} error={error} loading={loading} />
}
