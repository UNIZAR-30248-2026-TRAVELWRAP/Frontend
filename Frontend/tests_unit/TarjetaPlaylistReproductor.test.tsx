// Test unitario del reproductor embebido de la playlist del viaje (PB-56): la URL de incrustación de Spotify
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import TarjetaPlaylist from '../src/components/TarjetaPlaylist'
import { urlEmbebida } from '../src/utils/playlistEmbebida'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ID = '37i9dQZF1DXcBWIGoYBM5M'

const json = (cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'Content-Type': 'application/json' } }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('urlEmbebida', () => {
  it('convierte el enlace de la playlist en su enlace de incrustación', () => {
    expect(urlEmbebida(`https://open.spotify.com/playlist/${ID}`)).toBe(`https://open.spotify.com/embed/playlist/${ID}`)
  })

  it('no incrusta enlaces que no son de una playlist', () => {
    expect(urlEmbebida('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBeNull()
    expect(urlEmbebida('https://example.com/playlist/abc')).toBeNull()
  })
})

describe('reproductor de la playlist en la tarjeta', () => {
  it('incrusta el reproductor de Spotify cuando el viaje tiene playlist', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json({ playlist: { url: `https://open.spotify.com/playlist/${ID}`, actualizado_en: '2026-11-22T10:00:00Z' } })))
    render(<TarjetaPlaylist viajeId={VIAJE_ID} tokenSesion="token-acceso" activo={false} />)

    const reproductor = await screen.findByTitle('Reproductor de la playlist del viaje')
    expect(reproductor.getAttribute('src')).toBe(`https://open.spotify.com/embed/playlist/${ID}`)
    expect(reproductor.getAttribute('allow')).toContain('encrypted-media')
  })

  it('sin playlist no hay reproductor', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json({ playlist: null })))
    render(<TarjetaPlaylist viajeId={VIAJE_ID} tokenSesion="token-acceso" activo={false} />)

    await screen.findByText('Este viaje no tiene playlist.')
    expect(screen.queryByTitle('Reproductor de la playlist del viaje')).toBeNull()
  })
})
