// Backend de viajes y votaciones simulado en memoria para los tests de las pantallas de votaciones.
// Sustituye a fetch y responde como la API real (formato de las votaciones, errores y cierre).
import { vi } from 'vitest'

export const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
export const YO = 'u1'

type OpcionGuardada = { id: string; texto: string; valor_fecha: string | null; orden: number }
export type VotacionGuardada = {
  id: string
  titulo: string
  descripcion?: string | null
  tipo: string
  estado: 'abierta' | 'cerrada'
  opcion_ganadora_id?: string | null
  opciones: OpcionGuardada[]
  // usuario → opción votada
  votos: Record<string, string>
}

export const opcion = (id: string, texto: string, orden = 0): OpcionGuardada => ({ id, texto, valor_fecha: null, orden })

export const viajeDePrueba = (datos: Record<string, unknown> = {}) => ({
  id: VIAJE_ID,
  nombre: 'Verano 2027',
  destino: null,
  estado: 'activo',
  pendiente_destino: true,
  rol: 'creador',
  miembros: [
    { usuario_id: YO, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
    { usuario_id: 'u3', nombre: 'Daniel', avatar_url: null, rol: 'miembro' },
  ],
  ...datos,
})

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const error = (estado: number, codigo: string, mensaje: string) => json(estado, { error: { codigo, mensaje } })

export const simularBackendVotaciones = (
  { viaje = viajeDePrueba(), votaciones = [] }: { viaje?: ReturnType<typeof viajeDePrueba>; votaciones?: VotacionGuardada[] } = {},
) => {
  const estado = { viaje: { ...viaje }, votaciones: votaciones.map((v) => ({ ...v, opciones: [...v.opciones], votos: { ...v.votos } })) }

  // Formato de la API: recuento, votantes y voto del usuario
  const formatear = (v: VotacionGuardada) => {
    const votos = Object.entries(v.votos)
    return {
      id: v.id,
      titulo: v.titulo,
      descripcion: v.descripcion ?? null,
      tipo: v.tipo,
      estado: v.estado,
      opcion_ganadora_id: v.opcion_ganadora_id ?? null,
      creado_por: YO,
      creado_en: '2026-10-20T10:00:00Z',
      cerrada_en: v.estado === 'cerrada' ? '2026-10-22T10:00:00Z' : null,
      opciones: v.opciones.map((o) => {
        const votantes = votos.filter(([, op]) => op === o.id).map(([usuario]) => usuario)
        return { ...o, votos: votantes.length, votantes }
      }),
      total_votos: votos.length,
      total_miembros: estado.viaje.miembros.length,
      todos_han_votado: estado.viaje.miembros.every((m) => v.votos[m.usuario_id] !== undefined),
      mi_voto: v.votos[YO] ?? null,
    }
  }

  const fetchMock = vi.fn((url: string, opciones: RequestInit = {}) => {
    const { pathname, searchParams } = new URL(url)
    const metodo = opciones.method ?? 'GET'
    const cuerpo = opciones.body ? JSON.parse(opciones.body as string) : undefined

    if (pathname.endsWith(`/viajes/${VIAJE_ID}`)) return json(200, estado.viaje)

    if (pathname.endsWith(`/viajes/${VIAJE_ID}/votaciones`)) {
      const lista = estado.votaciones.filter(
        (v) =>
          (!searchParams.get('tipo') || v.tipo === searchParams.get('tipo')) &&
          (!searchParams.get('estado') || v.estado === searchParams.get('estado')),
      )
      return json(200, { votaciones: lista.map(formatear) })
    }

    const [, votacionId, accion] = pathname.match(/\/votaciones\/([^/]+)\/?([a-z]*)$/) ?? []
    const votacion = estado.votaciones.find((v) => v.id === votacionId)
    if (!votacion) return error(404, 'votacion_no_encontrada', 'La votación no existe en este viaje')
    if (accion !== '' && votacion.estado === 'cerrada') return error(409, 'votacion_cerrada', 'La votación ya está cerrada')

    if (accion === 'opciones') {
      const texto = cuerpo.texto.trim()
      if (votacion.opciones.some((o) => o.texto.toLowerCase() === texto.toLowerCase())) {
        return error(409, 'opcion_duplicada', 'Esa opción ya está en la votación')
      }
      votacion.opciones.push(opcion(`op-${votacion.opciones.length + 1}`, texto, votacion.opciones.length))
      return json(201, formatear(votacion))
    }

    if (accion === 'voto') {
      if (metodo === 'DELETE') delete votacion.votos[YO]
      else votacion.votos[YO] = cuerpo.opcion_id
      return json(200, formatear(votacion))
    }

    if (accion === 'cerrar') {
      if (estado.viaje.rol !== 'creador') return error(403, 'no_creador', 'Solo el creador del viaje puede cerrar las votaciones')
      const actual = formatear(votacion)
      if (!actual.todos_han_votado) {
        return error(409, 'faltan_votos', 'La votación solo se puede cerrar cuando hayan votado todos los miembros')
      }
      const maximo = Math.max(0, ...actual.opciones.map((o) => o.votos))
      const empatadas = actual.opciones.filter((o) => o.votos === maximo)
      // En la API real se elige al azar entre las empatadas; aquí, la primera para que el test sea predecible
      const ganadora = empatadas[0] ?? null
      votacion.estado = 'cerrada'
      votacion.opcion_ganadora_id = ganadora?.id ?? null
      const destino = votacion.tipo === 'destino' ? (ganadora?.texto ?? null) : null
      if (destino) estado.viaje = { ...estado.viaje, destino, pendiente_destino: false }
      return json(200, { votacion: formatear(votacion), hubo_empate: empatadas.length > 1, destino })
    }

    return json(200, formatear(votacion))
  })

  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, estado }
}

// Llamadas hechas con un método y cuya URL termina en la ruta dada
export const llamadas = (fetchMock: ReturnType<typeof vi.fn>, metodo: string, finRuta: string) =>
  (fetchMock.mock.calls as unknown as [string, RequestInit | undefined][]).filter(
    ([url, opciones]) => (opciones?.method ?? 'GET') === metodo && new URL(url).pathname.endsWith(finRuta),
  )
