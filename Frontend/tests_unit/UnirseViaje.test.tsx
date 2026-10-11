import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import UnirseViaje from '../src/screens/UnirseViaje'
import { leerInvitacionPendiente, rutaTrasLogin } from '../src/services/invitacionPendiente'
import type { Sesion } from '../src/services/authApi'

const TOKEN_INVITACION = '3f2b8c1d9e7a4f60b5d2c8a1e9f04b37'

const sesion: Sesion = {
  usuario: {
    id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
    nombre: 'Berta',
    email: 'berta@travelwrap.app',
    avatar_url: null,
    creado_en: '2026-10-08T10:00:00Z',
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
}

const unido = (yaEraMiembro: boolean) => ({
  viaje: { id: 'v1', nombre: 'Roma 2025', destino: 'Roma, Italia', imagen_portada_url: null },
  miembro: { rol: 'miembro', unido_en: '2026-10-11T16:30:00Z' },
  ya_era_miembro: yaEraMiembro,
})

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

const renderizar = (sesionActual: Sesion | null) =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={[`/unirse/${TOKEN_INVITACION}`]}>
        <Routes>
          <Route path="/unirse/:token" element={<UnirseViaje sesion={sesionActual} />} />
          <Route path="/" element={<div>Pantalla de inicio</div>} />
          <Route path="/login" element={<div>Pantalla de login</div>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  )

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

describe('UnirseViaje', () => {
  it('sin sesión recuerda la invitación y manda al login sin llamar al backend', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    renderizar(null)

    expect(await screen.findByText('Pantalla de login')).toBeTruthy()
    expect(leerInvitacionPendiente()).toBe(TOKEN_INVITACION)
    expect(rutaTrasLogin()).toBe(`/unirse/${TOKEN_INVITACION}`)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('con sesión une al usuario una sola vez y le da la bienvenida al viaje', async () => {
    sessionStorage.setItem('travelwrap.invitacionPendiente', TOKEN_INVITACION)
    const fetchMock = vi.fn(() => respuesta(200, unido(false)))
    vi.stubGlobal('fetch', fetchMock)

    renderizar(sesion)

    expect(await screen.findByText('¡Bienvenido a Roma 2025!')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(new RegExp(`/invitaciones/${TOKEN_INVITACION}/unirse$`))
    expect(opciones.method).toBe('POST')
    expect(leerInvitacionPendiente()).toBeNull()
    expect(rutaTrasLogin()).toBe('/')
  })

  it('lleva al inicio al pulsar Entrar al viaje', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(() => respuesta(200, unido(false))))

    renderizar(sesion)
    await user.click(await screen.findByRole('button', { name: 'Entrar al viaje' }))

    expect(await screen.findByText('Pantalla de inicio')).toBeTruthy()
  })

  it('avisa si el usuario ya era miembro del viaje', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(200, unido(true))))

    renderizar(sesion)

    expect(await screen.findByText('Ya formas parte de Roma 2025')).toBeTruthy()
  })

  it('muestra un error si el enlace de invitación no es válido', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(404, {
        error: { codigo: 'invitacion_no_encontrada', mensaje: 'El enlace de invitación no es válido' },
      }),
    ))

    renderizar(sesion)

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('Este enlace de invitación no es válido')
    expect(screen.queryByRole('button', { name: 'Entrar al viaje' })).toBeNull()
  })

  it('muestra un error si el viaje ya no está activo', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(409, {
        error: { codigo: 'viaje_no_activo', mensaje: 'El viaje ya no admite nuevos miembros' },
      }),
    ))

    renderizar(sesion)

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('no admite nuevos miembros')
  })
})
