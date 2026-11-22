// Test unitario de la ventana «Escanear documento»: elegir la foto, detectar el tipo y los errores
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EscanerDocumento from '../src/components/EscanerDocumento'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const foto = (nombre = 'ticket.jpg', tipo = 'image/jpeg') => new File(['\xff\xd8\xff'], nombre, { type: tipo })

const abrir = (props = {}) => {
  const onEscaneado = vi.fn()
  const onCerrar = vi.fn()
  render(
    <EscanerDocumento viajeId={VIAJE_ID} tokenSesion="token-acceso" onCerrar={onCerrar} onEscaneado={onEscaneado} {...props} />,
  )
  return { onEscaneado, onCerrar }
}

// El selector de archivos (oculto) que abre el botón «Abrir cámara»
const selector = () => screen.getByLabelText('Foto del documento', { selector: 'input' }) as HTMLInputElement

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('EscanerDocumento', () => {
  it('se presenta como diálogo con su título y el marco para el documento', () => {
    abrir()

    expect(screen.getByRole('dialog', { name: 'Escanear documento' })).toBeTruthy()
    expect(screen.getByText('Coloca el documento dentro del marco')).toBeTruthy()
  })

  it('el selector de la galería solo admite JPEG y PNG', () => {
    abrir()

    expect(selector().getAttribute('accept')).toBe('image/jpeg,image/png')
  })

  it('si el navegador niega la cámara, avisa y deja elegir una foto de la galería', async () => {
    const denegada = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: denegada }, configurable: true })
    abrir()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir cámara' }))

    expect((await screen.findByRole('alert')).textContent).toContain('No se ha podido abrir la cámara')
    expect(denegada).toHaveBeenCalledTimes(1)
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
  })

  it('escanea la foto elegida y devuelve el tipo detectado', async () => {
    const fetchMock = vi.fn(() => json(200, { tipo: 'gasto', datos: { concepto: 'Bar Sol', importe: 12.5 } }))
    vi.stubGlobal('fetch', fetchMock)
    const { onEscaneado } = abrir()

    await userEvent.upload(selector(), foto())

    await waitFor(() =>
      expect(onEscaneado).toHaveBeenCalledWith({ tipo: 'gasto', datos: { concepto: 'Bar Sol', importe: 12.5 } }),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('no envía una foto que no es JPEG ni PNG y avisa al momento', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    abrir()

    // applyAccept: false deja elegir un PDF aunque el selector solo admita JPEG y PNG, como haría un móvil sin filtro
    const usuario = userEvent.setup({ applyAccept: false })
    await usuario.upload(selector(), foto('factura.pdf', 'application/pdf'))

    expect((await screen.findByRole('alert')).textContent).toContain('Solo se pueden escanear fotos JPEG o PNG')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('muestra el error del backend si no puede leer la foto', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json(502, { error: { codigo: 'error_ocr', mensaje: 'No se ha podido leer el ticket' } })))
    const { onEscaneado } = abrir()

    await userEvent.upload(selector(), foto())

    expect((await screen.findByRole('alert')).textContent).toContain('No se ha podido leer el ticket')
    expect(onEscaneado).not.toHaveBeenCalled()
  })

  it('cierra la ventana con Cancelar sin escanear nada', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { onCerrar } = abrir()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCerrar).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
