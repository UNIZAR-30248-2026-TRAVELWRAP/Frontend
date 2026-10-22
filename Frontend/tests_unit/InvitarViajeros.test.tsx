import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import InvitarViajeros from '../src/screens/InvitarViajeros'

const VIAJE_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const ENLACE = 'http://localhost:5173/unirse/3f2b8c1d9e7a4f60b5d2c8a1e9f04b37'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

const viaje = {
  id: VIAJE_ID,
  nombre: 'Lisboa 2027',
  destino: 'Lisboa',
  rol: 'creador',
  miembros: [
    { usuario_id: 'u1', nombre: 'Lucía', avatar_url: null, rol: 'creador' },
    { usuario_id: 'u2', nombre: 'Marcos', avatar_url: null, rol: 'miembro' },
  ],
}

// Backend simulado: responde al enlace de invitación y al detalle del viaje según la URL
const backend = (enlace = respuesta(200, { token: 'x', enlace: ENLACE })) =>
  vi.fn((url: string) => (url.endsWith('/invitacion') ? enlace : respuesta(200, viaje)))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('InvitarViajeros', () => {
  it('con viaje y sesión pide al backend el enlace y los datos del viaje', async () => {
    const fetchMock = backend()
    vi.stubGlobal('fetch', fetchMock)

    render(<InvitarViajeros viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    expect(await screen.findByText(ENLACE)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ampliar codigo QR' })).toBeTruthy()
    const urls = fetchMock.mock.calls.map((llamada) => llamada[0] as string)
    expect(urls.some((url) => url.endsWith(`/viajes/${VIAJE_ID}/invitacion`))).toBe(true)
    expect(urls.some((url) => url.endsWith(`/viajes/${VIAJE_ID}`))).toBe(true)
    for (const [, opciones] of fetchMock.mock.calls as unknown as [string, RequestInit & { headers: Record<string, string> }][]) {
      expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    }
  })

  it('muestra el nombre y los miembros del viaje', async () => {
    vi.stubGlobal('fetch', backend())

    render(<InvitarViajeros viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    expect(await screen.findByText('Lucía')).toBeTruthy()
    expect(screen.getByText('Marcos')).toBeTruthy()
    expect(screen.getAllByText(/Lisboa 2027/).length).toBeGreaterThan(0)
  })

  it('no pinta la pantalla hasta tener los datos', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    const { container } = render(<InvitarViajeros viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    expect(container.textContent).toBe('')
  })

  it('muestra el error del backend si no se puede obtener el enlace', async () => {
    vi.stubGlobal('fetch', backend(
      respuesta(404, {
        error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' },
      }),
    ))

    render(<InvitarViajeros viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toBe('El viaje no existe o no perteneces a él')
    expect(screen.queryByRole('button', { name: 'Ampliar codigo QR' })).toBeNull()
  })

  it('muestra un aviso genérico si falla la conexión', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

    render(<InvitarViajeros viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    expect((await screen.findByRole('alert')).textContent).toBe('No se puede conectar con el servidor')
  })
})
