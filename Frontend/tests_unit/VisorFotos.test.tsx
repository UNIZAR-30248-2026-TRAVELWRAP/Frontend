import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisorFotos from '../src/components/VisorFotos'

configure({ asyncUtilTimeout: 5000 })

const FOTOS = [
  { id: 'a', url: 'blob:a', nombre: 'coliseo.jpg' },
  { id: 'b', url: 'blob:b', nombre: 'trevi.jpg' },
  { id: 'c', url: 'blob:c', nombre: 'plaza.jpg' },
]

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.body.style.overflow = ''
})

describe('VisorFotos', () => {
  it('muestra la foto entera con su posición y el foco en el botón de cerrar', () => {
    render(<VisorFotos fotos={FOTOS} indice={1} onCambiar={vi.fn()} onCerrar={vi.fn()} />)

    const dialogo = screen.getByRole('dialog')
    expect(dialogo.getAttribute('aria-modal')).toBe('true')
    expect(dialogo.getAttribute('aria-label')).toBe('Foto 2 de 3: trevi.jpg')
    expect(screen.getByText('2 de 3')).toBeTruthy()
    expect(screen.getByAltText('trevi.jpg').getAttribute('src')).toBe('blob:b')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cerrar foto' }))
  })

  it('muestra quién subió la foto y cuándo, si se sabe', () => {
    const { rerender } = render(
      <VisorFotos fotos={[{ ...FOTOS[0], descripcion: 'Subida por Berta · 12 may 2027' }, FOTOS[1]]} indice={0} onCambiar={vi.fn()} onCerrar={vi.fn()} />,
    )
    expect(screen.getByText('Subida por Berta · 12 may 2027')).toBeTruthy()

    rerender(<VisorFotos fotos={[{ ...FOTOS[0], descripcion: 'Subida por Berta · 12 may 2027' }, FOTOS[1]]} indice={1} onCambiar={vi.fn()} onCerrar={vi.fn()} />)
    expect(screen.queryByText(/Subida por/)).toBeNull()
  })

  it('cierra con el botón y con Escape', async () => {
    const user = userEvent.setup()
    const onCerrar = vi.fn()
    render(<VisorFotos fotos={FOTOS} indice={0} onCambiar={vi.fn()} onCerrar={onCerrar} />)

    await user.click(screen.getByRole('button', { name: 'Cerrar foto' }))
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onCerrar).toHaveBeenCalledTimes(2)
  })

  it('pasa a la anterior y a la siguiente con los botones y con las flechas', async () => {
    const user = userEvent.setup()
    const onCambiar = vi.fn()
    render(<VisorFotos fotos={FOTOS} indice={1} onCambiar={onCambiar} onCerrar={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Foto anterior' }))
    await user.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })

    expect(onCambiar.mock.calls.map(([i]) => i)).toEqual([0, 2, 0, 2])
  })

  it('en la primera no hay anterior y en la última no hay siguiente', () => {
    const onCambiar = vi.fn()
    const { rerender } = render(<VisorFotos fotos={FOTOS} indice={0} onCambiar={onCambiar} onCerrar={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Foto anterior' })).toHaveProperty('disabled', true)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(onCambiar).not.toHaveBeenCalled()

    rerender(<VisorFotos fotos={FOTOS} indice={2} onCambiar={onCambiar} onCerrar={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Foto siguiente' })).toHaveProperty('disabled', true)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(onCambiar).not.toHaveBeenCalled()
  })

  describe('borrar y vídeos', () => {
    const VIDEO = { id: 'v', url: 'blob:v', nombre: 'paseo.mp4', esVideo: true }

    it('el botón de borrar solo está si se puede borrar, y lo avisa', async () => {
      const user = userEvent.setup()
      const onBorrar = vi.fn()
      const { rerender } = render(<VisorFotos fotos={FOTOS} indice={0} onCambiar={vi.fn()} onCerrar={vi.fn()} />)
      expect(screen.queryByRole('button', { name: 'Borrar foto' })).toBeNull()

      rerender(<VisorFotos fotos={FOTOS} indice={0} onCambiar={vi.fn()} onCerrar={vi.fn()} onBorrar={onBorrar} />)
      await user.click(screen.getByRole('button', { name: 'Borrar foto' }))

      expect(onBorrar).toHaveBeenCalledTimes(1)
    })

    it('un vídeo se reproduce con controles, con su nombre y el botón de borrar lo dice', () => {
      render(<VisorFotos fotos={[VIDEO, ...FOTOS]} indice={0} onCambiar={vi.fn()} onCerrar={vi.fn()} onBorrar={vi.fn()} />)

      expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Vídeo 1 de 4: paseo.mp4')
      const reproductor = document.querySelector('video') as HTMLVideoElement
      expect(reproductor.getAttribute('src')).toBe('blob:v')
      expect(reproductor.controls).toBe(true)
      expect(screen.queryByRole('img')).toBeNull()
      expect(screen.getByRole('button', { name: 'Borrar vídeo' })).toBeTruthy()
    })

  })


})

