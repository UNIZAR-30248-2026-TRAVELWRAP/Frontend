import { afterEach, describe, expect, it, vi } from 'vitest'
import { io } from 'socket.io-client'
import { escucharMensajes } from '../src/services/chatTiempoReal'

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
  vi.mocked(io).mockReturnValue(socket as unknown as ReturnType<typeof io>)
  return socket
}

const mensaje = { id: 'm1', texto: 'Hola', creado_en: '2026-05-12T10:00:00Z', autor: { usuario_id: 'u2', nombre: 'Berta', avatar_url: null } }

afterEach(() => {
  vi.clearAllMocks()
})

describe('chatTiempoReal', () => {
  it('se conecta al namespace /chat con el token de la sesión', () => {
    socketFalso()
    escucharMensajes(VIAJE_ID, 'token-acceso', vi.fn())

    expect(io).toHaveBeenCalledWith(
      expect.stringMatching(/\/chat$/),
      expect.objectContaining({ auth: { token: 'token-acceso' } }),
    )
  })

  it('al conectarse (y al reconectarse) se une a la sala del viaje', () => {
    const socket = socketFalso()
    escucharMensajes(VIAJE_ID, 'token-acceso', vi.fn())

    socket.lanzar('connect')
    socket.lanzar('connect')

    expect(socket.emit).toHaveBeenCalledTimes(2)
    expect(socket.emit).toHaveBeenCalledWith('unirse_viaje', { viaje_id: VIAJE_ID })
  })

  it('entrega los mensajes de su viaje y descarta los de otros', () => {
    const socket = socketFalso()
    const alRecibir = vi.fn()
    escucharMensajes(VIAJE_ID, 'token-acceso', alRecibir)

    socket.lanzar('mensaje', { viaje_id: VIAJE_ID, mensaje })
    socket.lanzar('mensaje', { viaje_id: 'otro-viaje', mensaje })

    expect(alRecibir).toHaveBeenCalledTimes(1)
    expect(alRecibir).toHaveBeenCalledWith(mensaje)
  })

  it('al dejar de escuchar desconecta el socket', () => {
    const socket = socketFalso()
    const dejarDeEscuchar = escucharMensajes(VIAJE_ID, 'token-acceso', vi.fn())

    dejarDeEscuchar()

    expect(socket.disconnect).toHaveBeenCalledTimes(1)
  })
})
