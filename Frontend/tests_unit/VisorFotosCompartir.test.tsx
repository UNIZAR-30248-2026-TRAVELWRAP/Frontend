import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisorFotos from '../src/components/VisorFotos'

const FOTOS = [
  { id: 'a', url: 'blob:a', nombre: 'coliseo.jpg' },
  { id: 'b', url: 'blob:b', nombre: 'trevi.jpg' },
]

const visor = (props: Partial<Parameters<typeof VisorFotos>[0]> = {}) => (
  <VisorFotos fotos={FOTOS} indice={0} onCambiar={vi.fn()} onCerrar={vi.fn()} onCompartir={vi.fn()} {...props} />
)

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('VisorFotos · compartir', () => {

  it('en un vídeo el botón se llama «Compartir vídeo»', () => {
    render(visor({ fotos: [{ id: 'v', url: 'blob:v', nombre: 'paseo.mp4', esVideo: true }] }))

    expect(screen.getByRole('button', { name: 'Compartir vídeo' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Compartir foto' })).toBeNull()
  })

  it('sin la función de compartir no hay botón', () => {
    render(visor({ onCompartir: undefined }))

    expect(screen.queryByRole('button', { name: /^Compartir/ })).toBeNull()
  })

  it('el botón de compartir convive con el de borrar y el de cerrar', () => {
    render(visor({ onBorrar: vi.fn() }))

    expect(screen.getByRole('button', { name: 'Compartir foto' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Borrar foto' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cerrar foto' })).toBeTruthy()
  })

  it('mientras se prepara el archivo muestra el estado y desactiva el botón', () => {
    render(visor({ compartiendo: true }))

    const boton = screen.getByRole('button', { name: 'Compartir foto' }) as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    expect(boton.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole('status').textContent).toBe('Preparando el archivo...')
  })

  it('un aviso informativo sale como estado y uno de error como alerta', () => {
    const { rerender } = render(visor({ aviso: { tipo: 'info', texto: 'Se ha descargado' } }))
    expect(screen.getByRole('status').textContent).toBe('Se ha descargado')
    expect(screen.queryByRole('alert')).toBeNull()

    rerender(visor({ aviso: { tipo: 'error', texto: 'No se ha podido' } }))
    expect(screen.getByRole('alert').textContent).toBe('No se ha podido')
  })

})
