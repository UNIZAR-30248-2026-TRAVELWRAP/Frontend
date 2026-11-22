import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FinDeViaje from '../src/screens/FinDeViaje'

const mocks = vi.hoisted(() => ({
  crearImagenResumen: vi.fn(),
  descargarArchivo: vi.fn(),
}))

vi.mock('../src/utils/imagenResumen', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../src/utils/imagenResumen')>()
  return { ...original, crearImagenResumen: mocks.crearImagenResumen }
})

vi.mock('../src/utils/compartir', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../src/utils/compartir')>()
  return { ...original, descargarArchivo: mocks.descargarArchivo }
})

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'

const viaje = {
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma, Italia',
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  estado: 'finalizado',
  archivado: false,
  miembros: [{ usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'creador' }],
}

const resumen = {
  dias: 4,
  actividad_mas_votada: { titulo: 'Coliseo', votos: 3 },
  alma_del_grupo: { usuario_id: BERTA, nombre: 'Berta', pagos: 2, planes_propuestos: 0, fotos_subidas: 1 },
}

const fotos = Array.from({ length: 8 }, (_, i) => ({
  id: `f${i}`,
  viaje_id: VIAJE_ID,
  nombre: `foto${i}.jpg`,
  tipo_mime: 'image/jpeg',
  tamano_bytes: 1,
  subido_por: BERTA,
  creado_en: `2027-05-1${i}T10:00:00Z`,
  url: `https://storage.test/foto${i}.jpg`,
}))

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const simular = (opciones: { resumen?: unknown; fotos?: unknown[]; datosViaje?: Record<string, unknown> } = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.endsWith('/sello')) return json(200, { sello: null })
      if (url.endsWith('/resumen')) return json(200, opciones.resumen ?? resumen)
      if (url.endsWith('/fotos')) return json(200, { fotos: opciones.fotos ?? fotos })
      return json(200, { ...viaje, ...opciones.datosViaje })
    }),
  )

const abrirUltima = async () => {
  render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
  await screen.findByText('TravelWrap · Resumen')
  const usuario = userEvent.setup()
  for (let i = 0; i < 4; i++) await usuario.keyboard('{ArrowRight}')
  return usuario
}

beforeEach(() => {
  mocks.crearImagenResumen.mockReset()
  mocks.descargarArchivo.mockReset()
  mocks.crearImagenResumen.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('FinDeViaje: descargar imagen', () => {
  it('el botón solo aparece en la última diapositiva', async () => {
    simular()
    render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('TravelWrap · Resumen')
    expect(screen.queryByRole('button', { name: 'Descargar imagen' })).toBeNull()

    const usuario = userEvent.setup()
    for (let i = 0; i < 4; i++) await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Descargar imagen' })).toBeTruthy()
  })

  it('crea la imagen con los datos del viaje y la descarga con nombre TravelWrap-lugar-año.png', async () => {
    simular()
    const usuario = await abrirUltima()

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))

    await waitFor(() => expect(mocks.descargarArchivo).toHaveBeenCalledTimes(1))
    const datos = mocks.crearImagenResumen.mock.calls[0][0]
    expect(datos.lugar).toBe('Roma, Italia')
    expect(datos.anio).toBe('2027')
    expect(datos.dias).toEqual({ numero: 4, texto: 'días de aventura' })
    expect(datos.estrella).toEqual({ titulo: 'Coliseo', votos: '3 votos' })
    expect(datos.alma.nombre).toBe('Berta')
    expect(datos.alma.estadisticas.map((dato: { etiqueta: string }) => dato.etiqueta)).toHaveLength(2)
    expect(datos.fotos).toHaveLength(6)
    expect(datos.totalFotos).toBe(8)

    const archivo = mocks.descargarArchivo.mock.calls[0][0] as File
    expect(archivo.name).toBe('TravelWrap-Roma-Italia-2027.png')
    expect(archivo.type).toBe('image/png')
  })

  it('lo que no tiene datos viaja como null y no se pasan fotos', async () => {
    simular({ resumen: { dias: 0, actividad_mas_votada: null, alma_del_grupo: null }, fotos: [fotos[0]] })
    render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('TravelWrap · Resumen')
    const usuario = userEvent.setup()
    await usuario.keyboard('{ArrowRight}')

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))

    await waitFor(() => expect(mocks.descargarArchivo).toHaveBeenCalled())
    const datos = mocks.crearImagenResumen.mock.calls[0][0]
    expect(datos.dias).toBeNull()
    expect(datos.estrella).toBeNull()
    expect(datos.alma).toBeNull()
    expect(datos.fotos).toEqual(['https://storage.test/foto0.jpg'])
  })

  it('mientras se crea muestra «Creando la imagen...», se bloquea y no se lanza dos veces', async () => {
    simular()
    let terminar: (blob: Blob) => void = () => {}
    mocks.crearImagenResumen.mockImplementation(() => new Promise<Blob>((resolver) => (terminar = resolver)))
    const usuario = await abrirUltima()

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))
    const ocupado = await screen.findByRole('button', { name: 'Creando la imagen...' })
    expect(ocupado.getAttribute('aria-busy')).toBe('true')
    expect((ocupado as HTMLButtonElement).disabled).toBe(true)
    await usuario.click(ocupado)
    expect(mocks.crearImagenResumen).toHaveBeenCalledTimes(1)

    terminar(new Blob(['png'], { type: 'image/png' }))
    await screen.findByRole('button', { name: 'Descargar imagen' })
    expect(mocks.descargarArchivo).toHaveBeenCalledTimes(1)
  })

  it('si una foto no se puede cargar enseña el aviso del error, no descarga y deja reintentar', async () => {
    simular()
    const { ErrorDeImagen } = await import('../src/utils/imagenResumen')
    mocks.crearImagenResumen.mockRejectedValueOnce(new ErrorDeImagen('No se ha podido cargar alguna de las fotos para crear la imagen'))
    const usuario = await abrirUltima()

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toBe('No se ha podido cargar alguna de las fotos para crear la imagen')
    expect(mocks.descargarArchivo).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))
    await waitFor(() => expect(mocks.descargarArchivo).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('un fallo inesperado muestra un aviso genérico', async () => {
    simular()
    mocks.crearImagenResumen.mockRejectedValueOnce(new Error('boom'))
    const usuario = await abrirUltima()

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))

    expect((await screen.findByRole('alert')).textContent).toBe('No se ha podido crear la imagen')
  })

  it('también se puede descargar con el viaje archivado', async () => {
    simular({ datosViaje: { archivado: true } })
    const usuario = await abrirUltima()

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))

    await waitFor(() => expect(mocks.descargarArchivo).toHaveBeenCalledTimes(1))
  })
})
