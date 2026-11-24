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



  it('muestra el error del backend si no puede leer la foto', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json(502, { error: { codigo: 'error_ocr', mensaje: 'No se ha podido leer el ticket' } })))
    const { onEscaneado } = abrir()

    await userEvent.upload(selector(), foto())

    expect((await screen.findByRole('alert')).textContent).toContain('No se ha podido leer el ticket')
    expect(onEscaneado).not.toHaveBeenCalled()
  })

})
