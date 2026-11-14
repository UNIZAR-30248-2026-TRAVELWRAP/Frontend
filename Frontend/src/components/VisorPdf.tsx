import { useEffect, useRef, useState } from "react"
import { cargarPdfjs } from "../services/pdfjs"
import { NUNITO } from "../styles/tokens"

type VisorPdfProps = {
  url: string
  onError: () => void
}

// Más de 2 píxeles por píxel de pantalla no se nota y gasta memoria en móviles
const MAX_DENSIDAD = 2

// Dibuja las páginas del PDF una debajo de otra con pdf.js. Chrome en Android no enseña PDF dentro de un iframe
export default function VisorPdf({ url, onError }: VisorPdfProps) {
  const zona = useRef<HTMLDivElement>(null)
  const lienzos = useRef<(HTMLCanvasElement | null)[]>([])
  const [numPaginas, setNumPaginas] = useState(0)
  const [paginaActual, setPaginaActual] = useState(1)
  const [dibujando, setDibujando] = useState(true)
  const avisarError = useRef(onError)

  useEffect(() => {
    avisarError.current = onError
  }, [onError])

  useEffect(() => {
    let vigente = true
    let tarea: { destroy: () => Promise<void> } | null = null

    const dibujar = async () => {
      const pdfjs = await cargarPdfjs()
      const carga = pdfjs.getDocument({ url })
      tarea = carga
      const pdf = await carga.promise
      if (!vigente) return
      setNumPaginas(pdf.numPages)
      // Se espera a que React cree el <canvas> de cada página
      await new Promise((resolver) => requestAnimationFrame(resolver))

      const anchoDisponible = zona.current?.clientWidth || 320
      const densidad = Math.min(window.devicePixelRatio || 1, MAX_DENSIDAD)
      for (let numero = 1; numero <= pdf.numPages; numero++) {
        const pagina = await pdf.getPage(numero)
        if (!vigente) return
        const base = pagina.getViewport({ scale: 1 })
        const viewport = pagina.getViewport({ scale: (anchoDisponible / base.width) * densidad })
        const lienzo = lienzos.current[numero - 1]
        const contexto = lienzo?.getContext("2d")
        if (!lienzo || !contexto) continue
        lienzo.width = viewport.width
        lienzo.height = viewport.height
        await pagina.render({ canvas: lienzo, canvasContext: contexto, viewport }).promise
      }
      if (vigente) setDibujando(false)
    }

    dibujar().catch(() => {
      if (vigente) avisarError.current()
    })
    return () => {
      vigente = false
      tarea?.destroy().catch(() => undefined)
    }
  }, [url])

  // La página actual es la última cuyo comienzo ya ha pasado la mitad de la zona visible
  const alDesplazar = () => {
    const elemento = zona.current
    if (!elemento) return
    const referencia = elemento.scrollTop + elemento.clientHeight / 2
    let actual = 1
    lienzos.current.forEach((lienzo, indice) => {
      if (lienzo && lienzo.offsetTop <= referencia) actual = indice + 1
    })
    setPaginaActual(actual)
  }

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        ref={zona}
        onScroll={alDesplazar}
        style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "0 8px 56px", position: "relative" }}
      >
        {Array.from({ length: numPaginas }, (_, indice) => (
          <canvas
            key={indice}
            ref={(elemento) => {
              lienzos.current[indice] = elemento
            }}
            aria-label={`Página ${indice + 1} del documento`}
            style={{ display: "block", width: "100%", height: "auto", background: "white", borderRadius: 4, marginBottom: 8 }}
          />
        ))}
        {dibujando && (
          <p style={{ fontFamily: NUNITO, color: "rgba(255,255,255,0.7)", fontSize: 12, textAlign: "center" }}>
            Dibujando páginas...
          </p>
        )}
      </div>
      {numPaginas > 0 && (
        <div
          role="status"
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(8,16,32,0.85)",
            color: "white",
            fontFamily: NUNITO,
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.25)",
          }}
        >
          Página {paginaActual} de {numPaginas}
        </div>
      )}
    </div>
  )
}
