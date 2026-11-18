import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import { enviarMensaje, listarMensajes } from '../src/services/chatApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const llamada = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('chatApi · historial', () => {
  it('pide los mensajes con GET y el token de la sesión', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { mensajes: [] }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await listarMensajes(VIAJE_ID, 'token-acceso')).toEqual({ mensajes: [] })

    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/mensajes$`))
    expect(opciones.method ?? 'GET').toBe('GET')
    expect(new Headers(opciones.headers).get('Authorization')).toBe('Bearer token-acceso')
  })

  it('con antes pide solo los mensajes anteriores a esa fecha', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { mensajes: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await listarMensajes(VIAJE_ID, 'token-acceso', '2026-05-12T10:00:00Z')

    const [url] = llamada(fetchMock)
    expect(url).toContain('?antes=2026-05-12T10%3A00%3A00Z')
  })
})

describe('chatApi · envío', () => {
  it('envía el texto con POST y devuelve el mensaje guardado', async () => {
    const guardado = { id: 'm1', texto: 'Hola', creado_en: '2026-05-12T10:00:00Z', autor: { usuario_id: 'u1', nombre: 'Adriana', avatar_url: null } }
    const fetchMock = vi.fn(() => respuesta(201, guardado))
    vi.stubGlobal('fetch', fetchMock)

    expect(await enviarMensaje(VIAJE_ID, 'Hola', 'token-acceso')).toEqual(guardado)

    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/mensajes$`))
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body as unknown as string)).toEqual({ texto: 'Hola' })
  })

  it('propaga el rechazo del backend como ApiError con su mensaje', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está finalizado y ya no se puede modificar' } })))

    const error = await enviarMensaje(VIAJE_ID, 'Hola', 'token-acceso').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.codigo).toBe('viaje_no_activo')
    expect(error.message).toBe('El viaje está finalizado y ya no se puede modificar')
  })
})
