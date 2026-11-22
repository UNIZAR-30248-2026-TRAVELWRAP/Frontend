import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import PantallaCarga from '../src/components/PantallaCarga'
import App from '../src/App'
import { refrescar } from '../src/services/authApi'
import { leerSesion } from '../src/services/sesionStorage'

vi.mock('../src/services/authApi', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../src/services/authApi')>()),
  refrescar: vi.fn(),
}))
vi.mock('../src/services/sesionStorage', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../src/services/sesionStorage')>()),
  leerSesion: vi.fn(),
}))
vi.mock('../src/router/AppRouter', () => ({ default: () => <p>Aplicación lista</p> }))

const MENSAJE_LARGO = /Conectando con el servidor, puede tardar unos segundos/

const SESION = {
  usuario: { id: 'u1', email: 'ana@correo.es', nombre: 'Ana' },
  token: 'token',
  refresh_token: 'refresh',
}

describe('PantallaCarga', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('muestra «Cargando...» al principio y el aviso del servidor a los 3 segundos', () => {
    render(<PantallaCarga />)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText('Cargando...')).toBeTruthy()
    expect(screen.queryByText(MENSAJE_LARGO)).toBeNull()

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText(MENSAJE_LARGO)).toBeTruthy()
  })

  it('en App se ve mientras se renueva la sesión y desaparece al terminar', async () => {
    let terminar: (tokens: { token: string; refresh_token: string }) => void = () => undefined
    vi.mocked(leerSesion).mockReturnValue(SESION)
    vi.mocked(refrescar).mockReturnValue(
      new Promise((resolver) => {
        terminar = resolver
      }),
    )

    render(<App />)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.queryByText('Aplicación lista')).toBeNull()

    await act(async () => {
      terminar({ token: 'nuevo', refresh_token: 'nuevo-refresh' })
    })
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByText('Aplicación lista')).toBeTruthy()
  })

  it('en App sin sesión guardada no se muestra la pantalla de carga', () => {
    vi.mocked(leerSesion).mockReturnValue(null)
    render(<App />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByText('Aplicación lista')).toBeTruthy()
  })
})
