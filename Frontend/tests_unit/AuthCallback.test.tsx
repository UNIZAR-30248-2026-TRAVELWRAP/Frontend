import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AuthCallback from '../src/screens/AuthCallback'

const sesion = {
  usuario: {
    id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
    nombre: 'Daniel',
    email: 'daniel@gmail.com',
    avatar_url: null,
    creado_en: '2026-10-08T10:00:00Z',
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
}

const codificar = (valor: unknown) =>
  btoa(JSON.stringify(valor)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const renderizar = (fragmento: string, onSesion = vi.fn(), onError = vi.fn()) => {
  window.location.hash = fragmento
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/auth/callback']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback onSesion={onSesion} onError={onError} />} />
          <Route path="/" element={<div>Pantalla de inicio</div>} />
          <Route path="/login" element={<div>Pantalla de login</div>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  )
  return { onSesion, onError }
}

afterEach(() => {
  cleanup()
  window.location.hash = ''
})

describe('AuthCallback', () => {
  it('entrega la sesión y lleva al inicio si el login con Google ha ido bien', async () => {
    const { onSesion, onError } = renderizar(`#sesion=${codificar(sesion)}`)

    expect(await screen.findByText('Pantalla de inicio')).toBeTruthy()
    expect(onSesion).toHaveBeenCalledWith(sesion)
    expect(onError).not.toHaveBeenCalled()
  })

  it('procesa la respuesta una sola vez aunque React ejecute el efecto dos veces', async () => {
    const { onSesion } = renderizar(`#sesion=${codificar(sesion)}`)

    await screen.findByText('Pantalla de inicio')
    expect(onSesion).toHaveBeenCalledTimes(1)
  })

  it('informa del error y vuelve al login si el usuario cancela', async () => {
    const { onSesion, onError } = renderizar('#error=google_cancelado')

    expect(await screen.findByText('Pantalla de login')).toBeTruthy()
    expect(onError).toHaveBeenCalledWith('Has cancelado el inicio de sesión con Google')
    expect(onSesion).not.toHaveBeenCalled()
  })

  it('informa del error y vuelve al login si el backend no ha podido completar el login', async () => {
    const { onError } = renderizar('#error=google')

    expect(await screen.findByText('Pantalla de login')).toBeTruthy()
    expect(onError).toHaveBeenCalledWith('No se ha podido iniciar sesión con Google')
  })

  it('vuelve al login si se accede sin ningún resultado', async () => {
    const { onError } = renderizar('')

    expect(await screen.findByText('Pantalla de login')).toBeTruthy()
    expect(onError).toHaveBeenCalledTimes(1)
  })
})
