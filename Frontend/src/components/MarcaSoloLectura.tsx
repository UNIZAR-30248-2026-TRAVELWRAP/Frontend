import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"
import Icon from "./Icon"
import { obtenerViaje } from "../services/viajesApi"
import { guardarViajeEnCache, viajeEnCache } from "../services/viajesEnCache"

// Pantallas bajo /viajes/:id que no son una sección del viaje (o que tienen su propio aspecto)
const NO_SON_SECCION = new Set(["nuevo", "archivados"])
const SUBRUTAS_SIN_MARCA = new Set(["resumen", "destino", "invitar"])

const viajeDeLaRuta = (pathname: string): string | null => {
  const [raiz, id, subruta] = pathname.split("/").filter(Boolean)
  if (raiz !== "viajes" || !id || NO_SON_SECCION.has(id)) return null
  if (subruta && SUBRUTAS_SIN_MARCA.has(subruta)) return null
  return decodeURIComponent(id)
}

// Modo visualización: con el viaje finalizado, un velo gris muy suave y un candado cubren toda sección del viaje
// para indicar que solo se puede consultar. No intercepta toques (pointer-events: none)
export default function MarcaSoloLectura({ tokenSesion }: Readonly<{ tokenSesion: string }>) {
  const { pathname } = useLocation()
  const viajeId = viajeDeLaRuta(pathname)
  const [finalizados, setFinalizados] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!viajeId) return
    let vigente = true
    obtenerViaje(viajeId, tokenSesion)
      .then((viaje) => {
        guardarViajeEnCache(viaje)
        if (vigente) setFinalizados((previos) => ({ ...previos, [viajeId]: viaje.estado === "finalizado" }))
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [viajeId, pathname, tokenSesion])

  if (!viajeId) return null
  const soloLectura = finalizados[viajeId] ?? viajeEnCache(viajeId)?.estado === "finalizado"
  if (!soloLectura) return null

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, pointerEvents: "none" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(110,120,135,0.18)" }} />
      <div
        role="img"
        aria-label="Modo visualización: el viaje no se puede modificar"
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(100,110,125,0.3)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="lock" size={14} color="#4A5568" strokeWidth={2.2} />
      </div>
    </div>
  )
}
