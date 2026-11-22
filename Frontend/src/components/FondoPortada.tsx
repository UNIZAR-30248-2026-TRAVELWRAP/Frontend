// Foto de portada de un viaje como fondo de una cabecera o tarjeta. Se ve aclarada y transparente sobre el degradado
// azul del contenedor, para que el texto blanco se siga leyendo. El contenedor tiene que llevar
// position: relative, overflow: hidden e isolation: isolate (ver ESTILO_CON_PORTADA en styles/portada)

// Opacidad de la foto sobre el azul del viaje
const OPACIDAD_PORTADA = 0.3

type FondoPortadaProps = { url?: string | null }

export default function FondoPortada({ url }: FondoPortadaProps) {
  if (!url) return null
  return (
    <img
      src={url}
      alt=""
      aria-hidden="true"
      data-testid="fondo-portada"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: OPACIDAD_PORTADA,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  )
}
