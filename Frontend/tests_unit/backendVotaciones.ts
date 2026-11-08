// Backend de viajes y votaciones simulado en memoria para los tests de las pantallas de votaciones.
// Sustituye a fetch y responde como la API real (formato de las votaciones, errores y cierre).
import { act } from '@testing-library/react'
import { vi } from 'vitest'
import { escucharVotaciones, type CambioVotacion } from '../src/services/votacionesTiempoReal'

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

  type Peticion = { metodo: string; cuerpo: any; searchParams: URLSearchParams }

  const crear = ({ cuerpo }: Peticion) => {
    if (cuerpo.tipo === 'destino') return error(400, 'datos_invalidos', 'El tipo debe ser fecha, presupuesto, actividad, otro')
    const nueva: VotacionGuardada = {
      id: `votacion-${estado.votaciones.length + 1}`,
      titulo: cuerpo.titulo,
      tipo: cuerpo.tipo ?? 'otro',
      estado: 'abierta',
      opciones: cuerpo.opciones.map((o: { texto: string; valor_fecha?: string | null }, i: number) => ({
        ...opcion(`nueva-${i + 1}`, o.texto, i),
        valor_fecha: o.valor_fecha ?? null,
      })),
      votos: {},
    }
    estado.votaciones.unshift(nueva)
    return json(201, formatear(nueva))
  }

  const listar = ({ searchParams }: Peticion) => {
    const tipo = searchParams.get('tipo')
    const estadoBuscado = searchParams.get('estado')
    const lista = estado.votaciones.filter((v) => (!tipo || v.tipo === tipo) && (!estadoBuscado || v.estado === estadoBuscado))
    return json(200, { votaciones: lista.map(formatear) })
  }

  const proponer = (votacion: VotacionGuardada, { cuerpo }: Peticion) => {
    const texto = cuerpo.texto.trim()
    if (votacion.opciones.some((o) => o.texto.toLowerCase() === texto.toLowerCase())) {
      return error(409, 'opcion_duplicada', 'Esa opción ya está en la votación')
    }
    votacion.opciones.push(opcion(`op-${votacion.opciones.length + 1}`, texto, votacion.opciones.length))
    return json(201, formatear(votacion))
  }

  const votarORetirar = (votacion: VotacionGuardada, { metodo, cuerpo }: Peticion) => {
    if (metodo === 'DELETE') delete votacion.votos[YO]
    else votacion.votos[YO] = cuerpo.opcion_id
    return json(200, formatear(votacion))
  }

  const cerrar = (votacion: VotacionGuardada) => {
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

  const ACCIONES: Record<string, (votacion: VotacionGuardada, peticion: Peticion) => Promise<Response>> = {
    opciones: proponer,
    voto: votarORetirar,
    cerrar,
  }

  // /viajes/:viajeId/votaciones/:votacionId[/accion]
  const sobreUnaVotacion = (pathname: string, peticion: Peticion) => {
    const partes = pathname.split('/')
    const posicion = partes.indexOf('votaciones')
    const votacion = estado.votaciones.find((v) => v.id === partes[posicion + 1])
    const accion = partes[posicion + 2] ?? ''
    if (!votacion) return error(404, 'votacion_no_encontrada', 'La votación no existe en este viaje')
    if (accion === '') return json(200, formatear(votacion))
    if (votacion.estado === 'cerrada') return error(409, 'votacion_cerrada', 'La votación ya está cerrada')
    return ACCIONES[accion](votacion, peticion)
  }

  const fetchMock = vi.fn((url: string, opciones: RequestInit = {}) => {
    const { pathname, searchParams } = new URL(url)
    const peticion: Peticion = {
      metodo: opciones.method ?? 'GET',
      cuerpo: opciones.body ? JSON.parse(opciones.body as string) : undefined,
      searchParams,
    }
    if (pathname.endsWith(`/viajes/${VIAJE_ID}`)) return json(200, estado.viaje)
    if (pathname.endsWith(`/viajes/${VIAJE_ID}/votaciones`)) {
      return peticion.metodo === 'POST' ? crear(peticion) : listar(peticion)
    }
    return sobreUnaVotacion(pathname, peticion)
  })

  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, estado }
}

// Llamadas hechas con un método y cuya URL termina en la ruta dada
export const llamadas = (fetchMock: ReturnType<typeof vi.fn>, metodo: string, finRuta: string) =>
  (fetchMock.mock.calls as unknown as [string, RequestInit | undefined][]).filter(
    ([url, opciones]) => (opciones?.method ?? 'GET') === metodo && new URL(url).pathname.endsWith(finRuta),
  )

// Simula un aviso del servidor por WebSocket a la pantalla abierta. Los tests que lo usan simulan el módulo con
// vi.mock('../src/services/votacionesTiempoReal')
// (Omit sobre cada caso de la unión, para que se comprueben los campos de cada tipo de aviso)
type SinViaje<T> = T extends unknown ? Omit<T, 'viaje_id'> : never

export const avisarCambio = async (cambio: SinViaje<CambioVotacion>) => {
  const alCambiar = vi.mocked(escucharVotaciones).mock.calls.at(-1)?.[2]
  if (!alCambiar) throw new Error('La pantalla no está escuchando los cambios de las votaciones')
  await act(async () => alCambiar({ viaje_id: VIAJE_ID, ...cambio }))
}
