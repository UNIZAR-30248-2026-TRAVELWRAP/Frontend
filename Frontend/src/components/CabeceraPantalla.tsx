import type { ReactNode } from "react"
import { GRADIENTS, NUNITO, RADIUS } from "../styles/tokens"
import BotonVolver from "./BotonVolver"
import Heading from "./Heading"

// Etiqueta de contexto de las cabeceras (nombre del viaje), en blanco suave y en mayúsculas
export function EtiquetaCabecera({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        color: "rgba(255,255,255,0.8)",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: NUNITO,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  )
}

type CabeceraPantallaProps = {
  titulo: string
  // Contexto encima del título, normalmente el nombre del viaje
  contexto?: string | null
  onVolver?: () => void
  // Nombre accesible del botón de volver (por ejemplo, «Volver a Mis Viajes»)
  etiquetaVolver?: string
  // Texto discreto junto a la flecha de volver (por ejemplo, «Mis Viajes»)
  textoVolver?: string
  // Acciones opcionales a la derecha del título
  derecha?: ReactNode
  // Selector de pestañas (PestanasCabecera), debajo del título
  pestanas?: ReactNode
  // Se queda arriba al desplazarse por la pantalla
  fija?: boolean
  // Contenido extra debajo de las pestañas (por ejemplo, un selector de días)
  children?: ReactNode
}

// Cabecera azul de todas las pantallas: mismo botón de volver, mismo contexto y mismo espacio
export default function CabeceraPantalla({ titulo, contexto, onVolver, etiquetaVolver, textoVolver, derecha, pestanas, fija = false, children }: CabeceraPantallaProps) {
  return (
    <div
      style={{
        background: GRADIENTS.header,
        padding: "20px 20px 22px",
        borderRadius: RADIUS.header,
        ...(fija ? { position: "sticky", top: 0, zIndex: 15 } : {}),
      }}
    >
      {onVolver && <BotonVolver onClick={onVolver} etiqueta={etiquetaVolver} texto={textoVolver} />}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: pestanas ? 14 : 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {contexto && <EtiquetaCabecera>{contexto}</EtiquetaCabecera>}
          <Heading size={22} color="white">
            {titulo}
          </Heading>
        </div>
        {derecha}
      </div>
      {pestanas}
      {children}
    </div>
  )
}

