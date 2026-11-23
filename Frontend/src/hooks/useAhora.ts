import { useEffect, useState } from "react"

// Momento actual, que se refresca cada minuto para que la actividad en curso y la cuenta atrás avancen solas
export const useAhora = (periodoMs = 60_000) => {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const temporizador = setInterval(() => setAhora(new Date()), periodoMs)
    return () => clearInterval(temporizador)
  }, [periodoMs])
  return ahora
}
