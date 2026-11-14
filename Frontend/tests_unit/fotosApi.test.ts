import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import { listarFotos, subirFoto } from '../src/services/fotosApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const llamada = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }]

const foto = {
  id: 'f1',
  viaje_id: VIAJE_ID,
  nombre: 'coliseo.jpg',
  tipo_mime: 'image/jpeg',
  tamano_bytes: 1000,
  subido_por: 'u1',
  creado_en: '2027-05-12T10:00:00Z',
  url: 'https://storage.test/coliseo.jpg',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fotosApi · listarFotos', () => {
  it('pide las fotos del viaje con la sesión y las devuelve', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { fotos: [foto] }))
    vi.stubGlobal('fetch', fetchMock)

    const lista = await listarFotos(VIAJE_ID, 'token-acceso')

    expect(lista.fotos).toEqual([foto])
    const [url, init] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/fotos$`))
    expect(init.headers.Authorization).toBe('Bearer token-acceso')
  })

  it('codifica el identificador del viaje en la URL', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { fotos: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await listarFotos('a/b', 't')
    expect(llamada(fetchMock)[0]).toMatch(/\/viajes\/a%2Fb\/fotos$/)
  })

  it('rechaza una respuesta que no tiene la forma esperada', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(200, { documentos: [] })))
    await expect(listarFotos(VIAJE_ID, 't')).rejects.toThrow('Respuesta de fotos no válida')
  })

  it('lanza el error del servidor con su código y mensaje', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respuesta(404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } })),
    )
    const error = await listarFotos(VIAJE_ID, 't').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.codigo).toBe('viaje_no_encontrado')
    expect(error.message).toBe('El viaje no existe o no perteneces a él')
  })
})

describe('fotosApi · subirFoto', () => {
  it('envía la foto en el campo «archivo» de un formulario con la sesión', async () => {
    const fetchMock = vi.fn(() => respuesta(201, foto))
    vi.stubGlobal('fetch', fetchMock)
    const archivo = new File(['x'], 'coliseo.jpg', { type: 'image/jpeg' })

    const subida = await subirFoto(VIAJE_ID, archivo, 'token-acceso')

    expect(subida).toEqual(foto)
    const [url, init] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/fotos$`))
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer token-acceso')
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('archivo')).toBeInstanceOf(File)
    expect(((init.body as FormData).get('archivo') as File).name).toBe('coliseo.jpg')
  })

  it('no fija el tipo del contenido, para que el navegador añada la frontera del formulario', async () => {
    const fetchMock = vi.fn(() => respuesta(201, foto))
    vi.stubGlobal('fetch', fetchMock)
    await subirFoto(VIAJE_ID, new File(['x'], 'a.jpg', { type: 'image/jpeg' }), 't')
    expect(llamada(fetchMock)[1].headers['Content-Type']).toBeUndefined()
  })

  it('lanza el error que devuelve el servidor', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está finalizado y ya no se puede modificar' } })),
    )
    const error = await subirFoto(VIAJE_ID, new File(['x'], 'a.jpg'), 't').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.codigo).toBe('viaje_no_activo')
  })
})
