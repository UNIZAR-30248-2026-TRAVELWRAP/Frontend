import { useEffect, useState, type FormEvent } from "react"
import AvatarStack from "../components/AvatarStack"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import SectionLabel from "../components/SectionLabel"
import { ApiError } from "../services/authApi"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { crearVotacion, type NuevaVotacion, type Votacion } from "../services/votacionesApi"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro } from "../utils/formatoViaje"
import BotonVolver from "../components/BotonVolver"
import { estiloCampo, estiloEtiqueta } from "../styles/formulario"

type TipoCreable = NonNullable<NuevaVotacion["tipo"]>

// La de destino no se crea a mano: se abre sola al crear un viaje sin destino
const TIPOS: { tipo: TipoCreable; texto: string }[] = [
  { tipo: "fecha", texto: "Fechas" },
  { tipo: "actividad", texto: "Actividades" },
  { tipo: "otro", texto: "Otro" },
]

const MAX_PREGUNTA = 200
const MAX_OPCION = 100
const MIN_OPCIONES = 2
const MAX_OPCIONES = 20

type OpcionEnEdicion = { texto: string; fecha: string }

const opcionVacia = (): OpcionEnEdicion => ({ texto: "", fecha: "" })

// Opción A, B, C...
const letra = (indice: number) => String.fromCharCode(65 + indice)

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

// Comprueba el formulario antes de enviarlo. Devuelve el motivo por el que no es válido, o "" si lo es
const validar = (pregunta: string, opciones: OpcionEnEdicion[]) => {
  if (pregunta.trim() === "") return "Escribe la pregunta de la votación"
  const textos = opciones.map((o) => o.texto.trim())
  if (textos.some((texto) => texto === "")) return "Ninguna opción puede quedar vacía"
  if (new Set(textos.map((texto) => texto.toLowerCase())).size !== textos.length) {
    return "Las opciones no se pueden repetir"
  }
  return ""
}

// ─── Pantalla: Crear votación ─────────────────────────────────────────────────
type CrearVotacionProps = {
  viajeId: string
  tokenSesion: string
  onVolver?: () => void
  onCreada?: (votacion: Votacion) => void
}

export default function CrearVotacion({ viajeId, tokenSesion, onVolver, onCreada }: CrearVotacionProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [tipo, setTipo] = useState<TipoCreable>("fecha")
  const [pregunta, setPregunta] = useState("")
  const [opciones, setOpciones] = useState<OpcionEnEdicion[]>([opcionVacia(), opcionVacia()])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")

  // El viaje solo hace falta para mostrar quién podrá votar
  useEffect(() => {
    let vigente = true
    obtenerViaje(viajeId, tokenSesion)
      .then((datos) => {
        if (vigente) setViaje(datos)
      })
      .catch((e) => {
        if (vigente) setError(`No se ha podido cargar el viaje: ${mensajeDeError(e)}`)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  const miembros = (viaje?.miembros ?? []).map((m, i) => aMiembro(m.nombre, i))

  const cambiarOpcion = (indice: number, cambios: Partial<OpcionEnEdicion>) => {
    setOpciones((lista) => lista.map((o, i) => (i === indice ? { ...o, ...cambios } : o)))
    setError("")
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (enviando) return
    const motivo = validar(pregunta, opciones)
    if (motivo) {
      setError(motivo)
      return
    }
    setEnviando(true)
    setError("")
    try {
      const votacion = await crearVotacion(
        viajeId,
        {
          titulo: pregunta.trim(),
          tipo,
          opciones: opciones.map((o) => ({
            texto: o.texto.trim(),
            valor_fecha: tipo === "fecha" && o.fecha ? o.fecha : null,
          })),
        },
        tokenSesion,
      )
      onCreada?.(votacion)
    } catch (e) {
      setError(mensajeDeError(e))
      setEnviando(false)
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {/* Cabecera con el tipo de votación */}
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 24px", borderRadius: RADIUS.header }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <BotonVolver onClick={onVolver} />
            <div>
              <div
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: NUNITO,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Votaciones
              </div>
              <Heading size={22} color="white">
                Crear Votación
              </Heading>
            </div>
          </div>
          <div role="radiogroup" aria-label="Tipo de votación" style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {TIPOS.map(({ tipo: valor, texto }) => {
              const activo = tipo === valor
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  key={valor}
                  onClick={() => setTipo(valor)}
                  style={{
                    background: activo ? "white" : "rgba(255,255,255,0.18)",
                    color: activo ? C.blue : "rgba(255,255,255,0.85)",
                    border: "none",
                    borderRadius: 999,
                    padding: "8px 16px",
                    fontFamily: NUNITO,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  {texto}
                </button>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ padding: "20px 16px 32px" }}>
          <div style={{ marginBottom: 22 }}>
            <label htmlFor="votacion-pregunta" style={estiloEtiqueta}>
              Pregunta de la votación
            </label>
            <textarea
              id="votacion-pregunta"
              value={pregunta}
              onChange={(event) => {
                setPregunta(event.target.value)
                setError("")
              }}
              maxLength={MAX_PREGUNTA}
              placeholder="Ej. ¿Qué fin de semana preferimos para el viaje?"
              rows={3}
              style={{ ...estiloCampo, resize: "none", lineHeight: 1.6 }}
            />
          </div>

          <SectionLabel>Opciones de respuesta</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            {opciones.map((opcion, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    marginTop: 12,
                    borderRadius: 8,
                    background: i === 0 ? C.lightAccent : C.lightBlue,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontFamily: NUNITO,
                    fontWeight: 900,
                    fontSize: 13,
                    color: i === 0 ? C.accent : C.blue,
                  }}
                >
                  {letra(i)}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <input
                    aria-label={`Opción ${letra(i)}`}
                    value={opcion.texto}
                    onChange={(event) => cambiarOpcion(i, { texto: event.target.value })}
                    maxLength={MAX_OPCION}
                    placeholder={`Opción ${i + 1}`}
                    style={estiloCampo}
                  />
                  {/* En las votaciones de fechas cada opción puede llevar su fecha */}
                  {tipo === "fecha" && (
                    <input
                      type="date"
                      aria-label={`Fecha de la opción ${letra(i)}`}
                      value={opcion.fecha}
                      onChange={(event) => cambiarOpcion(i, { fecha: event.target.value })}
                      style={{ ...estiloCampo, padding: "9px 14px", color: opcion.fecha ? C.navy : C.muted }}
                    />
                  )}
                </div>
                {opciones.length > MIN_OPCIONES && (
                  <button
                    type="button"
                    aria-label={`Quitar opción ${letra(i)}`}
                    onClick={() => setOpciones((lista) => lista.filter((_, j) => j !== i))}
                    style={{
                      background: C.redBg,
                      border: "none",
                      borderRadius: 9,
                      width: 36,
                      height: 36,
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="trash" size={15} color={C.red} strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {opciones.length < MAX_OPCIONES && (
            <button
              type="button"
              onClick={() => setOpciones((lista) => [...lista, opcionVacia()])}
              style={{
                width: "100%",
                background: "white",
                color: C.blue,
                border: `1.5px dashed ${C.blue}`,
                borderRadius: RADIUS.md,
                padding: 12,
                fontFamily: NUNITO,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                marginBottom: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Icon name="plus" size={15} color={C.blue} strokeWidth={2.5} />
              Añadir opción
            </button>
          )}

          {/* Quién puede votar: siempre todos los miembros del viaje */}
          <SectionLabel>Quién puede votar</SectionLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
            {miembros.length > 0 && <AvatarStack members={miembros} size={34} />}
            <span style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13 }}>Todos los miembros del viaje</span>
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
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            style={{
              width: "100%",
              background: C.blue,
              color: "white",
              border: "none",
              borderRadius: 16,
              padding: 15,
              fontFamily: NUNITO,
              fontWeight: 800,
              fontSize: 15,
              cursor: enviando ? "not-allowed" : "pointer",
              opacity: enviando ? 0.7 : 1,
              boxShadow: SHADOWS.button,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Icon name="vote" size={18} color="white" strokeWidth={2} />
            {enviando ? "Publicando votación..." : "Publicar votación"}
          </button>
        </form>
      </div>
    </div>
  )
}
