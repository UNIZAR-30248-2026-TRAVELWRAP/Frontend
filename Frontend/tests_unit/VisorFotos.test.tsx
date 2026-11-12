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

  describe('deslizar con el dedo', () => {
    const zona = () => {
      const elemento = screen.getByTestId('zona-foto')
      elemento.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 600, width: 400, height: 600, x: 0, y: 0, toJSON: () => ({}) })
      return elemento
    }
    const arrastrar = (desde: number, hasta: number) => {
      fireEvent.pointerDown(zona(), { clientX: desde, pointerId: 1, button: 0 })
      fireEvent.pointerMove(zona(), { clientX: hasta, pointerId: 1 })
      fireEvent.pointerUp(zona(), { clientX: hasta, pointerId: 1 })
    }

    it('la foto sigue al dedo y al soltar pasado el umbral cambia de foto', () => {
      const onCambiar = vi.fn()
      render(<VisorFotos fotos={FOTOS} indice={1} onCambiar={onCambiar} onCerrar={vi.fn()} />)

      fireEvent.pointerDown(zona(), { clientX: 300, pointerId: 1, button: 0 })
      fireEvent.pointerMove(zona(), { clientX: 250, pointerId: 1 })
      expect(screen.getByAltText('trevi.jpg').style.transform).toBe('translateX(-50px)')
      fireEvent.pointerUp(zona(), { clientX: 250, pointerId: 1 })
      expect(onCambiar).not.toHaveBeenCalled()

      arrastrar(300, 150)
      arrastrar(100, 300)
      expect(onCambiar.mock.calls.map(([i]) => i)).toEqual([2, 0])
      expect(screen.getByAltText('trevi.jpg').style.transform).toBe('translateX(0px)')
    })

    it('si se devuelve a su sitio o se arrastra poco no cambia', () => {
      const onCambiar = vi.fn()
      render(<VisorFotos fotos={FOTOS} indice={1} onCambiar={onCambiar} onCerrar={vi.fn()} />)

      fireEvent.pointerDown(zona(), { clientX: 300, pointerId: 1, button: 0 })
      fireEvent.pointerMove(zona(), { clientX: 100, pointerId: 1 })
      fireEvent.pointerMove(zona(), { clientX: 300, pointerId: 1 })
      fireEvent.pointerUp(zona(), { clientX: 300, pointerId: 1 })
      arrastrar(300, 260)

      expect(onCambiar).not.toHaveBeenCalled()
    })

    it('en los extremos no hay foto a la que ir', () => {
      const onCambiar = vi.fn()
      const { rerender } = render(<VisorFotos fotos={FOTOS} indice={0} onCambiar={onCambiar} onCerrar={vi.fn()} />)
      arrastrar(100, 350)
      rerender(<VisorFotos fotos={FOTOS} indice={2} onCambiar={onCambiar} onCerrar={vi.fn()} />)
      arrastrar(300, 50)

      expect(onCambiar).not.toHaveBeenCalled()
    })
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
    const json = (cuerpo: unknown, estado = 200) =>
      Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (String(url).endsWith('/fotos')) {
          if (init?.method === 'POST') {
            const archivo = (init.body as FormData).get('archivo') as File
            n += 1
            return json({ id: `f${n}`, viaje_id: 'v', nombre: archivo.name, tipo_mime: 'image/jpeg', tamano_bytes: 1, subido_por: 'u', creado_en: '2027-05-12T10:00:00Z', url: `https://storage/f${n}` }, 201)
          }
          return json({ fotos: [] })
        }
        return json({
          id: 'v',
          nombre: 'Roma',
          estado: 'activo',
          miembros: [{ usuario_id: 'u', nombre: 'Ana', avatar_url: null, rol: 'creador' }],
        })
      }),
    )
  })

  const subir = async (user: ReturnType<typeof userEvent.setup>, nombres: string[]) => {
    const selector = await screen.findByLabelText('Elegir la foto que se va a subir')
    for (const nombre of nombres) {
      await user.upload(selector, new File(['x'], nombre, { type: 'image/jpeg' }))
      await screen.findByRole('button', { name: `Ampliar ${nombre}` })
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
