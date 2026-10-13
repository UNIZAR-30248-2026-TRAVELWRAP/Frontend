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

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('InvitarViajeros', () => {
  it('con viaje y sesión pide el enlace al backend y lo muestra con su QR', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { token: 'x', enlace: ENLACE }))
    vi.stubGlobal('fetch', fetchMock)

    render(<InvitarViajeros viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    expect(await screen.findByText(ENLACE)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ampliar codigo QR' })).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit & { headers: Record<string, string> },
    ]
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/invitacion$`))
    expect(opciones.method).toBe('GET')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
  })

  it('no pinta la pantalla hasta tener el enlace', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))

    const { container } = render(<InvitarViajeros viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    expect(container.textContent).toBe('')
  })

  it('muestra el error del backend si no se puede obtener el enlace', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
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

  it('sin viaje usa el enlace recibido por props y no llama al backend', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<InvitarViajeros inviteLink="https://travelwrap.app/unirse/abc123" />)

    expect(screen.getByText('https://travelwrap.app/unirse/abc123')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
