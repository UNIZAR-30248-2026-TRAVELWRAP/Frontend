import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisorFotos from '../src/components/VisorFotos'
import ChatGaleria from '../src/screens/ChatGaleria'

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

  it('bloquea el scroll de la página mientras está abierto y lo devuelve al cerrarse', () => {
    document.body.style.overflow = 'auto'
    const { unmount } = render(<VisorFotos fotos={FOTOS} indice={0} onCambiar={vi.fn()} onCerrar={vi.fn()} />)

    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('auto')
  })
})

describe('ChatGaleria · ampliar una foto', () => {
  beforeEach(() => {
    let n = 0
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => `blob:foto-${n++}`, revokeObjectURL: () => undefined }))
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'v',
              nombre: 'Roma',
              estado: 'activo',
              miembros: [{ usuario_id: 'u', nombre: 'Ana', avatar_url: null, rol: 'creador' }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      ),
    )
  })

  const subir = async (user: ReturnType<typeof userEvent.setup>, nombres: string[]) => {
    const selector = await screen.findByLabelText('Elegir la foto que se va a subir')
    for (const nombre of nombres) {
      await user.upload(selector, new File(['x'], nombre, { type: 'image/jpeg' }))
    }
  }

  it('al pulsar una miniatura se abre el visor con esa foto y al cerrarlo el foco vuelve a la miniatura', async () => {
    const user = userEvent.setup()
    render(<ChatGaleria viajeId="v" tokenSesion="t" />)
    await subir(user, ['uno.jpg', 'dos.jpg'])

    await user.click(screen.getByRole('button', { name: 'Ampliar uno.jpg' }))

    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Foto 2 de 2: uno.jpg')
    await user.click(screen.getByRole('button', { name: 'Cerrar foto' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ampliar uno.jpg' })))
  })

  it('en el visor se puede pasar a otra foto', async () => {
    const user = userEvent.setup()
    render(<ChatGaleria viajeId="v" tokenSesion="t" />)
    await subir(user, ['uno.jpg', 'dos.jpg'])
    await user.click(screen.getByRole('button', { name: 'Ampliar dos.jpg' }))

    await user.click(screen.getByRole('button', { name: 'Foto siguiente' }))

    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Foto 2 de 2: uno.jpg')
  })
})
