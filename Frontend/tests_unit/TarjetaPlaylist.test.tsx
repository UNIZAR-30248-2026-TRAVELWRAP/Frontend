// Test unitario de la tarjeta de la playlist del viaje (PB-56): ver el enlace, enlazar, cambiar y quitar la playlist
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TarjetaPlaylist from '../src/components/TarjetaPlaylist'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ID = '37i9dQZF1DXcBWIGoYBM5M'
const CANONICO = `https://open.spotify.com/playlist/${ID}`

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

// Backend simulado: GET, PUT y DELETE de la playlist con la respuesta indicada
const simularBackend = ({
  obtener = () => json(200, { playlist: { url: CANONICO, actualizado_en: '2026-11-22T10:00:00Z' } }),
  guardar = () => json(200, { playlist: { url: CANONICO, actualizado_en: '2026-11-22T11:00:00Z' } }),
  quitar = () => json(204),
} = {}) => {
  const fetchMock = vi.fn((_url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'PUT') return guardar()
    if (opciones?.method === 'DELETE') return quitar()
    return obtener()
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('TarjetaPlaylist', () => {
  it('muestra el enlace para abrir la playlist en Spotify', async () => {
    simularBackend()
    render(<TarjetaPlaylist viajeId={VIAJE_ID} tokenSesion="token-acceso" activo />)

    const enlace = await screen.findByRole('link', { name: 'Abrir la playlist del viaje en Spotify' })
    expect(enlace.getAttribute('href')).toBe(CANONICO)
    expect(enlace.getAttribute('target')).toBe('_blank')
    expect(enlace.getAttribute('rel')).toContain('noopener')
  })

  it('en un viaje finalizado solo se ve la playlist, sin cambiarla ni quitarla', async () => {
    simularBackend()
    render(<TarjetaPlaylist viajeId={VIAJE_ID} tokenSesion="token-acceso" activo={false} />)

    await screen.findByRole('link', { name: 'Abrir la playlist del viaje en Spotify' })
    expect(screen.queryByRole('button', { name: 'Cambiar playlist' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Quitar playlist' })).toBeNull()
  })



  it('no envía un enlace vacío', async () => {
    const fetchMock = simularBackend({ obtener: () => json(200, { playlist: null }) })
    render(<TarjetaPlaylist viajeId={VIAJE_ID} tokenSesion="token-acceso" activo />)

    await userEvent.click(await screen.findByRole('button', { name: 'Añadir playlist' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Guardar playlist' }))

    expect((await screen.findByRole('alert')).textContent).toContain('Pega el enlace de la playlist de Spotify')
    expect(fetchMock.mock.calls.some(([, opciones]) => opciones?.method === 'PUT')).toBe(false)
  })

  it('muestra el error del backend si el enlace no es de Spotify', async () => {
    simularBackend({
      obtener: () => json(200, { playlist: null }),
      guardar: () => json(400, { error: { codigo: 'datos_invalidos', mensaje: 'El enlace tiene que ser de una playlist de Spotify' } }),
    })
    render(<TarjetaPlaylist viajeId={VIAJE_ID} tokenSesion="token-acceso" activo />)

    await userEvent.click(await screen.findByRole('button', { name: 'Añadir playlist' }))
    await userEvent.type(await screen.findByLabelText('Enlace de la playlist de Spotify'), 'https://example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar playlist' }))

    expect((await screen.findByRole('alert')).textContent).toContain('El enlace tiene que ser de una playlist de Spotify')
  })

})
