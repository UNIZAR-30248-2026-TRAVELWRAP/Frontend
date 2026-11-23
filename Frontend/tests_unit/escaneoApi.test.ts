// Test unitario de los servicios del escaneo de documentos (OCR) y del resumen en texto de la cartera
import { afterEach, describe, expect, it, vi } from 'vitest'
import { escanearDocumento } from '../src/services/escaneoApi'
import { guardarResumen } from '../src/services/documentosApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('escanearDocumento', () => {
  it('envía la foto como multipart al endpoint de escaneo del viaje y devuelve el tipo detectado', async () => {
    const fetchMock = vi.fn(() => json(200, { tipo: 'gasto', datos: { concepto: 'RESTAURANTE EL FARO', importe: 11.5 } }))
    vi.stubGlobal('fetch', fetchMock)
    const foto = new File(['\xff\xd8\xff'], 'ticket.jpg', { type: 'image/jpeg' })

    const resultado = await escanearDocumento(VIAJE_ID, foto, 'token-acceso')

    expect(resultado).toEqual({ tipo: 'gasto', datos: { concepto: 'RESTAURANTE EL FARO', importe: 11.5 } })
    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain(`/viajes/${VIAJE_ID}/gastos/escaneo`)
    expect(opciones.method).toBe('POST')
    expect((opciones.body as FormData).get('archivo')).toBeInstanceOf(File)
  })

  it('devuelve una actividad con fecha y hora cuando el documento es una reserva', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json(200, { tipo: 'actividad', datos: { titulo: 'Vuelo Madrid a Roma', fecha: '2027-05-12', hora_inicio: '08:20' } })),
    )

    const resultado = await escanearDocumento(VIAJE_ID, new File(['x'], 'vuelo.png', { type: 'image/png' }), 'token-acceso')

    expect(resultado.tipo).toBe('actividad')
    expect(resultado.datos).toEqual({ titulo: 'Vuelo Madrid a Roma', fecha: '2027-05-12', hora_inicio: '08:20' })
  })

  it('propaga el error del backend con su mensaje', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json(502, { error: { codigo: 'error_ocr', mensaje: 'No se ha podido leer el ticket' } })))

    await expect(
      escanearDocumento(VIAJE_ID, new File(['x'], 'ticket.jpg', { type: 'image/jpeg' }), 'token-acceso'),
    ).rejects.toThrow('No se ha podido leer el ticket')
  })
})

describe('guardarResumen', () => {
  it('envía el texto en JSON al endpoint de texto de la cartera', async () => {
    const documento = { id: 'd9', nombre: 'Resumen escaneado.txt', tipo_mime: 'text/plain' }
    const fetchMock = vi.fn(() => json(201, documento))
    vi.stubGlobal('fetch', fetchMock)

    const guardado = await guardarResumen(VIAJE_ID, 'Póliza de seguro', 'token-acceso')

    expect(guardado).toEqual(documento)
    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toContain(`/viajes/${VIAJE_ID}/documentos/texto`)
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body as string)).toEqual({ texto: 'Póliza de seguro' })
  })
})
