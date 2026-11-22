// Estilo que necesita el contenedor de una foto de portada (components/FondoPortada): la foto queda recortada
// al contenedor y detrás de su contenido, pero encima de su fondo
import type { CSSProperties } from "react"

export const ESTILO_CON_PORTADA: CSSProperties = { position: "relative", overflow: "hidden", isolation: "isolate" }
