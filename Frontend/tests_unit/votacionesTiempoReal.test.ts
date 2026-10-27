import { afterEach, describe, expect, it, vi } from 'vitest'
import { io } from 'socket.io-client'
import { escucharVotaciones } from '../src/services/votacionesTiempoReal'

vi.mock('socket.io-client', () => ({ io: vi.fn() }))

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

// Socket falso: guarda los manejadores para poder lanzar los eventos del servidor desde el test
const socketFalso = () => {
  const manejadores: Record<string, (datos?: unknown) => void> = {}
  const socket = {
    on: vi.fn((evento: string, manejador: (datos?: unknown) => void) => {
      manejadores[evento] = manejador
      return socket
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    lanzar: (evento: string, datos?: unknown) => manejadores[evento]?.(datos),
  }
  vi.mocked(io).mockReturnValue(socket as never)
  return socket
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('votacionesTiempoReal', () => {
  it('se conecta al namespace /votaciones del servidor de la API con el token de sesión', () => {
    socketFalso()

    escucharVotaciones(VIAJE_ID, 'token-acceso', vi.fn())

    const [url, opciones] = vi.mocked(io).mock.calls[0]
    expect(url).toBe('http://localhost:3000/votaciones')
    expect(opciones).toMatchObject({ auth: { token: 'token-acceso' }, transports: ['websocket'] })
  })

  it('al conectarse (y al reconectarse) se une a la sala del viaje', () => {
    const socket = socketFalso()
    escucharVotaciones(VIAJE_ID, 'token-acceso', vi.fn())

    socket.lanzar('connect')
    socket.lanzar('connect')

    expect(socket.emit).toHaveBeenCalledTimes(2)
    expect(socket.emit).toHaveBeenCalledWith('unirse_viaje', { viaje_id: VIAJE_ID })
  })

  it('pasa los cambios de las votaciones de su viaje y descarta los de otros', () => {
    const socket = socketFalso()
    const alCambiar = vi.fn()
    escucharVotaciones(VIAJE_ID, 'token-acceso', alCambiar)

    const cambio = { viaje_id: VIAJE_ID, votacion_id: 'v1', motivo: 'voto' }
    socket.lanzar('votacion_cambiada', cambio)
    socket.lanzar('votacion_cambiada', { ...cambio, viaje_id: 'otro-viaje' })

    expect(alCambiar).toHaveBeenCalledTimes(1)
    expect(alCambiar).toHaveBeenCalledWith(cambio)
  })

  it('al dejar de escuchar se desconecta', () => {
    const socket = socketFalso()
    const dejarDeEscuchar = escucharVotaciones(VIAJE_ID, 'token-acceso', vi.fn())

    dejarDeEscuchar()

    expect(socket.disconnect).toHaveBeenCalled()
  })
})
