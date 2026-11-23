import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearImagenResumen, ErrorDeImagen, type DatosImagenResumen } from '../src/utils/imagenResumen'

const completos: DatosImagenResumen = {
  lugar: 'Roma',
  anio: '2027',
  fechas: '12 may - 15 may',
  nombres: 'Berta y Adriana',
  dias: { numero: 4, texto: 'días de aventura' },
  estrella: { titulo: 'Coliseo', votos: '3 votos' },
  alma: { nombre: 'Berta', color: '#E05A47', estadisticas: [{ etiqueta: 'Pagos', valor: 2 }] },
  fotos: ['https://storage.test/a.jpg', 'https://storage.test/b.jpg'],
  totalFotos: 2,
}

const sinDatos: DatosImagenResumen = { ...completos, dias: null, estrella: null, alma: null, fotos: [], totalFotos: 0 }

const textos: string[] = []
const imagenesDibujadas: unknown[] = []
let lienzos: { width: number; height: number }[] = []
let devolverBlob: Blob | null = new Blob(['png'], { type: 'image/png' })

const crearContexto = () => ({
  fillText: (texto: string) => textos.push(texto),
  drawImage: (...args: unknown[]) => imagenesDibujadas.push(args),
  measureText: (texto: string) => ({ width: texto.length * 10 }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  beginPath: () => {},
  moveTo: () => {},
  arcTo: () => {},
  arc: () => {},
  closePath: () => {},
  fill: () => {},
  stroke: () => {},
  fillRect: () => {},
  save: () => {},
  restore: () => {},
  clip: () => {},
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: '',
  textBaseline: '',
})

beforeEach(() => {
  textos.length = 0
  imagenesDibujadas.length = 0
  lienzos = []
  devolverBlob = new Blob(['png'], { type: 'image/png' })
  const crearElemento = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation(((etiqueta: string) => {
    if (etiqueta !== 'canvas') return crearElemento(etiqueta)
    const lienzo = {
      width: 0,
      height: 0,
      getContext: () => crearContexto(),
      toBlob: (cuando: (blob: Blob | null) => void, tipo: string) => cuando(tipo === 'image/png' ? devolverBlob : null),
    }
    lienzos.push(lienzo)
    return lienzo as unknown as HTMLCanvasElement
  }) as typeof document.createElement)
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 400, height: 300 })))
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('x', { status: 200, headers: { 'Content-Type': 'image/jpeg' } })),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('crearImagenResumen', () => {
  it('devuelve un PNG de 1080 de ancho y al menos 1920 de alto', async () => {
    const blob = await crearImagenResumen(completos)

    expect(blob.type).toBe('image/png')
    const principal = lienzos[lienzos.length - 1]
    expect(principal.width).toBe(1080)
    expect(principal.height).toBeGreaterThanOrEqual(1920)
  })

  it('dibuja la portada, los bloques con datos y las fotos', async () => {
    await crearImagenResumen(completos)

    expect(textos).toContain('Roma')
    expect(textos).toContain('2027')
    expect(textos).toContain('12 may - 15 may')
    expect(textos).toContain('4')
    expect(textos).toContain('días de aventura')
    expect(textos).toContain('Coliseo')
    expect(textos).toContain('3 votos')
    expect(textos).toContain('Berta')
    expect(textos).toContain('Pagó la cuenta más veces')
    expect(textos).toContain('2 fotos')
    expect(textos).toContain('TravelWrap')
    expect(imagenesDibujadas).toHaveLength(2)
  })

  it('no dibuja los bloques sin datos ni gastos ni balance', async () => {
    await crearImagenResumen(sinDatos)

    expect(textos).toContain('Roma')
    expect(textos).not.toContain('días de aventura')
    expect(textos).not.toContain('Coliseo')
    expect(textos).not.toContain('Pagó la cuenta más veces')
    expect(textos.join(' ')).not.toMatch(/foto/)
    expect(imagenesDibujadas).toHaveLength(0)
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it('con una sola foto usa el singular', async () => {
    await crearImagenResumen({ ...completos, fotos: ['https://storage.test/a.jpg'], totalFotos: 1 })

    expect(textos).toContain('1 foto')
  })

  it('el total de fotos es el del viaje aunque solo se dibujen algunas', async () => {
    await crearImagenResumen({ ...completos, totalFotos: 12 })

    expect(textos).toContain('12 fotos')
  })

  it('pide cada foto con fetch', async () => {
    await crearImagenResumen(completos)

    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual(['https://storage.test/a.jpg', 'https://storage.test/b.jpg'])
  })

  it('falla con un error claro si una foto no responde bien', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 403 })))

    await expect(crearImagenResumen(completos)).rejects.toThrow(ErrorDeImagen)
    await expect(crearImagenResumen(completos)).rejects.toThrow('No se ha podido cargar alguna de las fotos para crear la imagen')
  })

  it('falla igual si la red se cae o la foto no se puede decodificar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(crearImagenResumen(completos)).rejects.toBeInstanceOf(ErrorDeImagen)

    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 200 })))
    vi.stubGlobal('createImageBitmap', vi.fn(async () => Promise.reject(new Error('corrupta'))))
    await expect(crearImagenResumen(completos)).rejects.toBeInstanceOf(ErrorDeImagen)
  })

  it('no espera indefinidamente a la fuente: pasados unos segundos dibuja con la de reserva', async () => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'fonts', { configurable: true, value: { load: () => new Promise(() => {}) } })
    try {
      const resultado = crearImagenResumen(sinDatos)
      await vi.advanceTimersByTimeAsync(2600)
      expect((await resultado).type).toBe('image/png')
    } finally {
      vi.useRealTimers()
      delete (document as unknown as Record<string, unknown>).fonts
    }
  })

  it('si la fuente carga antes del límite no se espera más', async () => {
    const cargar = vi.fn(async () => [])
    Object.defineProperty(document, 'fonts', { configurable: true, value: { load: cargar } })
    try {
      await crearImagenResumen(sinDatos)
      expect(cargar).toHaveBeenCalledTimes(2)
    } finally {
      delete (document as unknown as Record<string, unknown>).fonts
    }
  })

  it('falla si el navegador no puede crear el lienzo o el PNG', async () => {
    devolverBlob = null
    await expect(crearImagenResumen(completos)).rejects.toThrow('No se ha podido crear la imagen')
  })
})
