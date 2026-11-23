// Test unitario de las llamadas que piden la foto del ticket de un gasto y del documento de una actividad
import { afterEach, describe, expect, it, vi } from 'vitest'
import { crearGasto, urlFotoGasto } from '../src/services/gastosApi'
import { urlFotoActividad } from '../src/services/actividadesApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const GASTO_ID = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'
const ACTIVIDAD_ID = 'a7b8c9d0-e1f2-4a3b-8c4d-5e6f7a8b9c0d'
const RUTA = `${VIAJE_ID}/escaneos/0b1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e.jpg`

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('foto de un gasto escaneado', () => {
  it('pide el enlace de la foto del gasto y lo devuelve', async () => {
    const fetchMock = vi.fn(() => json(200, { url: 'https://x/ticket.jpg', expira_en: '2026-11-22T10:05:00Z' }))
    vi.stubGlobal('fetch', fetchMock)

    const enlace = await urlFotoGasto(VIAJE_ID, GASTO_ID, 'token-acceso')

    expect(enlace.url).toBe('https://x/ticket.jpg')
    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toContain(`/viajes/${VIAJE_ID}/gastos/${GASTO_ID}/foto/url`)
  })

  it('envía la ruta de la foto al crear el gasto', async () => {
    const fetchMock = vi.fn(() => json(201, { id: GASTO_ID }))
    vi.stubGlobal('fetch', fetchMock)

    await crearGasto(
      VIAJE_ID,
      { concepto: 'Cena', importe: 60, pagado_por: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc', participantes: [], foto_ruta: RUTA },
      'token-acceso',
    )

    const [, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(opciones.body as string).foto_ruta).toBe(RUTA)
  })
})

describe('foto de una actividad escaneada', () => {
  it('pide el enlace de la foto del documento de la actividad', async () => {
    const fetchMock = vi.fn(() => json(200, { url: 'https://x/doc.jpg', expira_en: '2026-11-22T10:05:00Z' }))
    vi.stubGlobal('fetch', fetchMock)

    const enlace = await urlFotoActividad(VIAJE_ID, ACTIVIDAD_ID, 'token-acceso')

    expect(enlace.url).toBe('https://x/doc.jpg')
    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toContain(`/viajes/${VIAJE_ID}/actividades/${ACTIVIDAD_ID}/foto/url`)
  })
})
