// Test unitario de la Cartera de Documentos al escanear un documento: gasto y actividad se confirman en su pantalla,
// y cualquier otro documento se guarda como resumen .txt en la cartera
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CarteraDocumentos from '../src/screens/CarteraDocumentos'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'

const miembros = [{ usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'creador' }]

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const resumenGuardado = {
  id: 'r1',
  viaje_id: VIAJE_ID,
  nombre: 'Resumen escaneado.txt',
  tipo_mime: 'text/plain',
  tamano_bytes: 21,
  subido_por: ADRIANA,
  creado_en: '2026-11-22T10:00:00Z',
}

// Backend simulado: viaje, lista de documentos, escaneo y guardado del resumen, cada uno con la respuesta indicada
const simularBackend = (escaneo: () => Promise<Response>, resumen: () => Promise<Response> = () => json(201, resumenGuardado)) => {
  const fetchMock = vi.fn((url: string) => {
    if (url.endsWith('/gastos/escaneo')) return escaneo()
    if (url.endsWith('/documentos/texto')) return resumen()
    if (url.endsWith('/documentos')) return json(200, { documentos: [] })
    if (url.endsWith('/tareas')) return json(200, { tareas: [] })
    return json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado: 'activo', miembros })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const abrirCartera = async (props = {}) => {
  render(<CarteraDocumentos viajeId={VIAJE_ID} tokenSesion="token-acceso" usuarioId={ADRIANA} {...props} />)
  await screen.findByText('Documentos del viaje')
}

// Abre la ventana, elige una foto y espera a que termine el escaneo
const escanearFoto = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Escanear con OCR' }))
  const dialogo = screen.getByRole('dialog', { name: 'Escanear documento' })
  const selector = within(dialogo).getByLabelText('Foto del documento', { selector: 'input' })
  await userEvent.upload(selector, new File(['\xff\xd8\xff'], 'foto.jpg', { type: 'image/jpeg' }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Cartera de Documentos: escanear con OCR', () => {
  it('abre la ventana «Escanear documento» desde el botón de la cartera', async () => {
    simularBackend(() => json(200, { tipo: 'otro', datos: { resumen: '' } }))
    await abrirCartera()

    await userEvent.click(screen.getByRole('button', { name: 'Escanear con OCR' }))

    expect(screen.getByRole('dialog', { name: 'Escanear documento' })).toBeTruthy()
  })

  it('un gasto se entrega a la pantalla de confirmación con sus datos, sin guardar nada en la cartera', async () => {
    const fetchMock = simularBackend(() => json(200, { tipo: 'gasto', datos: { concepto: 'Bar Sol', importe: 12.5 } }))
    const onEscaneoConfirmar = vi.fn()
    await abrirCartera({ onEscaneoConfirmar })

    await escanearFoto()

    await waitFor(() =>
      expect(onEscaneoConfirmar).toHaveBeenCalledWith({ tipo: 'gasto', datos: { concepto: 'Bar Sol', importe: 12.5 } }),
    )
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/documentos/texto'))).toBe(false)
  })

  it('una actividad se entrega a la pantalla de confirmación con su fecha y su hora', async () => {
    simularBackend(() =>
      json(200, { tipo: 'actividad', datos: { titulo: 'Entradas Coliseo', fecha: '2027-05-13', hora_inicio: '10:00' } }),
    )
    const onEscaneoConfirmar = vi.fn()
    await abrirCartera({ onEscaneoConfirmar })

    await escanearFoto()

    await waitFor(() =>
      expect(onEscaneoConfirmar).toHaveBeenCalledWith({
        tipo: 'actividad',
        datos: { titulo: 'Entradas Coliseo', fecha: '2027-05-13', hora_inicio: '10:00' },
      }),
    )
  })

  it('otro documento se guarda como resumen .txt y aparece en la cartera', async () => {
    const fetchMock = simularBackend(() => json(200, { tipo: 'otro', datos: { resumen: 'Póliza de seguro' } }))
    const onEscaneoConfirmar = vi.fn()
    await abrirCartera({ onEscaneoConfirmar })

    await escanearFoto()

    expect(await screen.findByText('«Resumen escaneado.txt» se ha guardado en la cartera')).toBeTruthy()
    expect(onEscaneoConfirmar).not.toHaveBeenCalled()
    const guardado = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/documentos/texto'))
    expect(guardado).toBeDefined()
    const [, opciones] = guardado as unknown as [string, RequestInit]
    expect(JSON.parse(opciones.body as string)).toEqual({ texto: 'Póliza de seguro' })
  })

  it('si el OCR no lee ningún texto, no guarda nada y lo dice', async () => {
    const fetchMock = simularBackend(() => json(200, { tipo: 'otro', datos: { resumen: '' } }))
    await abrirCartera()

    await escanearFoto()

    expect((await screen.findByRole('alert')).textContent).toContain('No se ha leído ningún texto en el documento')
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/documentos/texto'))).toBe(false)
  })
})
