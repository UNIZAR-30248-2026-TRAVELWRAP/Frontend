import { useEffect, useState, type FormEvent } from "react"
import DialogoConfirmacion from "./DialogoConfirmacion"
import Avatar, { type Miembro } from "./Avatar"
import Icon from "./Icon"
import SectionLabel from "./SectionLabel"
import { ApiError } from "../services/authApi"
import {
  borrarTarea,
  crearTarea,
  editarTarea,
  listarTareas,
  MAX_TEXTO_TAREA,
  type CambiosTarea,
  type Tarea,
} from "../services/tareasApi"
import type { ViajeDelUsuario } from "../services/viajesApi"
import { estiloAlerta, estiloCampo, estiloDesplegable, estiloEtiqueta } from "../styles/formulario"
import { C, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro } from "../utils/formatoViaje"
import { progresoDeTareas } from "../utils/tareas"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

// Mensaje cuando falla una acción sobre una tarea. El 409 es un viaje que ya ha terminado
const mensajeAlCambiar = (e: unknown, accion: string) => {
  if (e instanceof ApiError && e.estado === 409) return "El viaje ya no está activo: no se pueden modificar las tareas"
  return `No se ha podido ${accion}: ${mensajeDeError(e)}`
}

const estiloBotonIcono = {
  width: 36,
  height: 36,
  borderRadius: 11,
  border: `1.5px solid ${C.border}`,
  background: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  padding: 0,
} as const

type FormularioTareaProps = {
  viaje: ViajeDelUsuario
  // Datos de partida: vacíos al crear, los de la tarea al editarla. Un responsable vacío es «Sin asignar»
  textoInicial: string
  responsableInicial: string
  textoGuardar: string
  textoGuardando: string
  onGuardar: (datos: { texto: string; responsable_id: string | null }) => Promise<void>
  onCancelar: () => void
}

// Formulario único para crear y editar una tarea: el campo «Tarea» y el selector «Responsable»
function FormularioTarea({
  viaje,
  textoInicial,
  responsableInicial,
  textoGuardar,
  textoGuardando,
  onGuardar,
  onCancelar,
}: FormularioTareaProps) {
  const [texto, setTexto] = useState(textoInicial)
  const [responsable, setResponsable] = useState(responsableInicial)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState("")
  const sufijo = textoGuardar.toLowerCase()

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!texto.trim() || enviando) return
    setEnviando(true)
    setError("")
    try {
      await onGuardar({ texto: texto.trim(), responsable_id: responsable || null })
    } catch (e) {
      setError(mensajeAlCambiar(e, sufijo === "añadir" ? "añadir la tarea" : "guardar la tarea"))
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={enviar}
      style={{
        background: "white",
        borderRadius: RADIUS.lg,
        padding: 16,
        border: `1.5px solid ${C.blue}`,
        boxShadow: SHADOWS.card,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <label htmlFor={`tarea-texto-${sufijo}`} style={estiloEtiqueta}>
          Tarea
        </label>
        <input
          id={`tarea-texto-${sufijo}`}
          type="text"
          value={texto}
          maxLength={MAX_TEXTO_TAREA}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Por ejemplo: reservar la cena del sábado"
          style={estiloCampo}
        />
      </div>
      <div>
        <label htmlFor={`tarea-responsable-${sufijo}`} style={estiloEtiqueta}>
          Responsable
        </label>
        <select
          id={`tarea-responsable-${sufijo}`}
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          style={estiloDesplegable}
        >
          <option value="">Sin asignar</option>
          {viaje.miembros.map((miembro) => (
            <option key={miembro.usuario_id} value={miembro.usuario_id}>
              {miembro.nombre ?? "Sin nombre"}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <div role="alert" style={estiloAlerta}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onCancelar}
          disabled={enviando}
          style={{
            flex: 1,
            minHeight: 44,
            border: `1.5px solid ${C.border}`,
            borderRadius: 13,
            background: "white",
            color: C.navy,
            fontFamily: NUNITO,
            fontWeight: 800,
            cursor: enviando ? "not-allowed" : "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!texto.trim() || enviando}
          style={{
            flex: 1,
            minHeight: 44,
            border: "none",
            borderRadius: 13,
            background: C.blue,
            color: "white",
            fontFamily: NUNITO,
            fontWeight: 800,
            cursor: !texto.trim() || enviando ? "not-allowed" : "pointer",
            opacity: !texto.trim() || enviando ? 0.6 : 1,
          }}
        >
          {enviando ? textoGuardando : textoGuardar}
        </button>
      </div>
    </form>
  )
}

type ListaTareasProps = {
  viajeId: string
  tokenSesion: string
  viaje: ViajeDelUsuario
  // Responsable por defecto al crear una tarea; si falta, el primer miembro
  usuarioId?: string
}

// Lista de tareas colaborativa del viaje: cualquier miembro las crea, marca, edita y borra mientras el viaje está activo
export default function ListaTareas({ viajeId, tokenSesion, viaje, usuarioId }: ListaTareasProps) {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [recarga, setRecarga] = useState(0)
  const [marcando, setMarcando] = useState<string[]>([])
  const [errorAccion, setErrorAccion] = useState("")
  const [aviso, setAviso] = useState("")
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [aEliminar, setAEliminar] = useState<Tarea | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState("")

  useEffect(() => {
    let vigente = true
    listarTareas(viajeId, tokenSesion)
      .then((lista) => {
        if (!vigente) return
        setTareas(lista.tareas)
        setError("")
      })
      .catch((e) => {
        if (vigente) setError(`No se han podido cargar las tareas: ${mensajeDeError(e)}`)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion, recarga])

  const activo = viaje.estado === "activo"
  const miembros = viaje.miembros
  const progreso = progresoDeTareas(tareas)
  const responsablePorDefecto = miembros.some((m) => m.usuario_id === usuarioId) ? (usuarioId ?? "") : (miembros[0]?.usuario_id ?? "")

  // Avatar del responsable, con el mismo color que en el resto de pantallas
  const miembroDe = (tarea: Tarea): Miembro => {
    const responsable = tarea.responsable
    if (!responsable) return { name: "Sin asignar", initial: "?", color: C.muted, imageUrl: null }
    const indice = miembros.findIndex((m) => m.usuario_id === responsable.usuario_id)
    if (indice === -1) return { name: "Un antiguo miembro", initial: "?", color: C.muted, imageUrl: null }
    return aMiembro(responsable.nombre, indice, responsable.avatar_url)
  }

  const abrirCrear = () => {
    setAviso("")
    setEditando(null)
    setCreando(true)
  }

  const sustituir = (nueva: Tarea) => setTareas((anteriores) => anteriores.map((t) => (t.id === nueva.id ? nueva : t)))

  const reintentar = () => {
    setCargando(true)
    setError("")
    setRecarga((n) => n + 1)
  }

  const handleMarcar = async (tarea: Tarea) => {
    setAviso("")
    setErrorAccion("")
    setMarcando((ids) => [...ids, tarea.id])
    try {
      const cambios: CambiosTarea = { hecha: !tarea.hecha }
      sustituir(await editarTarea(viajeId, tarea.id, cambios, tokenSesion))
    } catch (e) {
      // La tarea se queda como estaba
      setErrorAccion(mensajeAlCambiar(e, tarea.hecha ? "desmarcar la tarea" : "marcar la tarea"))
    } finally {
      setMarcando((ids) => ids.filter((id) => id !== tarea.id))
    }
  }

  const handleCrear = async (datos: { texto: string; responsable_id: string | null }) => {
    const nueva = await crearTarea(viajeId, datos, tokenSesion)
    setTareas((anteriores) => [...anteriores, nueva])
    setCreando(false)
    setErrorAccion("")
    setAviso(`«${nueva.texto}» se ha añadido a la lista`)
  }

  const handleEditar = async (tarea: Tarea, datos: { texto: string; responsable_id: string | null }) => {
    sustituir(await editarTarea(viajeId, tarea.id, datos, tokenSesion))
    setEditando(null)
    setErrorAccion("")
    setAviso("Tarea actualizada")
  }

  const handleEliminar = async () => {
    if (!aEliminar) return
    setEliminando(true)
    setErrorEliminar("")
    const quitarDeLaLista = (mensaje: string) => {
      setTareas((anteriores) => anteriores.filter((t) => t.id !== aEliminar.id))
      setAEliminar(null)
      setErrorAccion("")
      setAviso(mensaje)
    }
    try {
      await borrarTarea(viajeId, aEliminar.id, tokenSesion)
      quitarDeLaLista("Tarea eliminada")
    } catch (e) {
      // Si otro miembro la borró antes, ya no existe: se quita igualmente de la lista
      if (e instanceof ApiError && e.estado === 404) quitarDeLaLista("Esta tarea ya la había eliminado otro miembro")
      else setErrorEliminar(mensajeAlCambiar(e, "eliminar la tarea"))
    } finally {
      setEliminando(false)
    }
  }

  if (cargando) {
    return <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center" }}>Cargando tareas...</p>
  }

  if (error) {
    return (
      <div>
        <div role="alert" style={{ ...estiloAlerta, marginBottom: 12 }}>
          {error}
        </div>
        <button
          type="button"
          onClick={reintentar}
          style={{
            width: "100%",
            minHeight: 44,
            border: `1.5px solid ${C.border}`,
            borderRadius: RADIUS.md,
            background: "white",
            color: C.navy,
            fontFamily: NUNITO,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <>
      {tareas.length > 0 && (
        <div
          style={{
            background: "white",
            borderRadius: RADIUS.lg,
            padding: 16,
            boxShadow: SHADOWS.card,
            border: `1.5px solid ${C.border}`,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              flexShrink: 0,
              background: `conic-gradient(${C.greenMid} ${progreso.porcentaje * 3.6}deg, ${C.border} 0deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: NUNITO,
                fontWeight: 900,
                fontSize: 13,
                color: C.green,
              }}
            >
              {progreso.hechas}/{progreso.total}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: NUNITO, fontWeight: 800, color: C.navy, fontSize: 14 }}>
              {progreso.pendientes === 0
                ? "¡Todo listo!"
                : progreso.pendientes === 1
                  ? "1 tarea pendiente"
                  : `${progreso.pendientes} tareas pendientes`}
            </div>
            <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 12, marginTop: 2 }}>
              {progreso.porcentaje}% completado
            </div>
          </div>
          {/* Con tareas, «Nueva» va dentro de la tarjeta de progreso; sin tareas ocupa todo el ancho, más abajo */}
          {activo && !creando && (
            <button
              type="button"
              onClick={abrirCrear}
              style={{
                marginLeft: "auto",
                minHeight: 36,
                background: C.blue,
                color: "white",
                border: "none",
                borderRadius: RADIUS.sm,
                padding: "7px 12px",
                fontFamily: NUNITO,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexShrink: 0,
              }}
            >
              <Icon name="plus" size={13} color="white" strokeWidth={2.5} />
              Nueva
            </button>
          )}
        </div>
      )}

      {activo ? (
        !creando &&
        tareas.length === 0 && (
          <button
            type="button"
            onClick={abrirCrear}
            style={{
              width: "100%",
              background: C.blue,
              color: "white",
              border: "none",
              borderRadius: RADIUS.md,
              padding: 13,
              fontFamily: NUNITO,
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              boxShadow: SHADOWS.button,
              marginBottom: 16,
            }}
          >
            <Icon name="plus" size={16} color="white" strokeWidth={2.5} />
            Nueva
          </button>
        )
      ) : (
        <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, margin: "0 0 20px" }}>
          El viaje está finalizado: se pueden consultar sus tareas, pero ya no se pueden modificar.
        </p>
      )}

      {creando && (
        <div style={{ marginBottom: 16 }}>
          <FormularioTarea
            viaje={viaje}
            textoInicial=""
            responsableInicial={responsablePorDefecto}
            textoGuardar="Añadir"
            textoGuardando="Añadiendo..."
            onGuardar={handleCrear}
            onCancelar={() => setCreando(false)}
          />
        </div>
      )}

      {errorAccion && (
        <div role="alert" style={{ ...estiloAlerta, marginBottom: 16 }}>
          {errorAccion}
        </div>
      )}
      {aviso && (
        <div
          role="status"
          style={{
            background: C.greenBg,
            border: `1.5px solid ${C.green}55`,
            borderRadius: 12,
            padding: "10px 14px",
            color: C.green,
            fontFamily: NUNITO,
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 16,
            overflowWrap: "anywhere",
          }}
        >
          {aviso}
        </div>
      )}

      <SectionLabel>Tareas del viaje</SectionLabel>
      {tareas.length === 0 ? (
        <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>
          Aún no hay tareas.
        </p>
      ) : (
        <ul
          aria-label="Tareas del viaje"
          style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}
        >
          {tareas.map((tarea) => {
            if (editando === tarea.id) {
              const responsableId = tarea.responsable?.usuario_id ?? ""
              const sigueSiendoMiembro = miembros.some((m) => m.usuario_id === responsableId)
              return (
                <li key={tarea.id}>
                  <FormularioTarea
                    viaje={viaje}
                    textoInicial={tarea.texto}
                    responsableInicial={sigueSiendoMiembro ? responsableId : ""}
                    textoGuardar="Guardar"
                    textoGuardando="Guardando..."
                    onGuardar={(datos) => handleEditar(tarea, datos)}
                    onCancelar={() => setEditando(null)}
                  />
                </li>
              )
            }
            const responsable = miembroDe(tarea)
            const enviando = marcando.includes(tarea.id)
            return (
              <li
                key={tarea.id}
                style={{
                  background: "white",
                  borderRadius: RADIUS.lg,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: SHADOWS.card,
                  border: `1.5px solid ${C.border}`,
                }}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={tarea.hecha}
                  aria-label={`Marcar ${tarea.texto} como hecha`}
                  disabled={!activo || enviando}
                  onClick={() => handleMarcar(tarea)}
                  style={{
                    ...estiloBotonIcono,
                    border: `2px solid ${tarea.hecha ? C.greenMid : C.border}`,
                    background: tarea.hecha ? C.greenMid : "white",
                    cursor: !activo || enviando ? "not-allowed" : "pointer",
                    opacity: enviando ? 0.6 : 1,
                  }}
                >
                  {tarea.hecha && <Icon name="check" size={18} color="white" strokeWidth={3} />}
                </button>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: NUNITO,
                    fontSize: 14,
                    fontWeight: 700,
                    color: tarea.hecha ? C.muted : C.navy,
                    textDecoration: tarea.hecha ? "line-through" : "none",
                    overflowWrap: "anywhere",
                  }}
                >
                  {tarea.texto}
                </div>
                {/* Sin responsable no se muestra ningún avatar */}
                {tarea.responsable && (
                  <div role="img" aria-label={`Responsable: ${responsable.name}`} title={responsable.name}>
                    <Avatar member={responsable} size={24} showBorder={false} />
                  </div>
                )}
                {activo && (
                  <>
                    <button
                      type="button"
                      aria-label={`Editar ${tarea.texto}`}
                      onClick={() => {
                        setAviso("")
                        setCreando(false)
                        setEditando(tarea.id)
                      }}
                      style={estiloBotonIcono}
                    >
                      <Icon name="edit" size={16} color={C.navy} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Eliminar ${tarea.texto}`}
                      onClick={() => {
                        setErrorEliminar("")
                        setAEliminar(tarea)
                      }}
                      style={estiloBotonIcono}
                    >
                      <Icon name="trash" size={16} color={C.red} strokeWidth={1.8} />
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {aEliminar && (
        <DialogoConfirmacion
          titulo="¿Eliminar esta tarea?"
          icono="trash"
          color={C.red}
          colorFondo={C.redBg}
          textoConfirmar="Eliminar tarea"
          textoConfirmando="Eliminando..."
          ocupado={eliminando}
          error={errorEliminar}
          onConfirmar={handleEliminar}
          onCancelar={() => setAEliminar(null)}
        >
          <strong style={{ color: C.navy, overflowWrap: "anywhere" }}>{aEliminar.texto}</strong> se borrará para todos los
          miembros del viaje.
        </DialogoConfirmacion>
      )}
    </>
  )
}
