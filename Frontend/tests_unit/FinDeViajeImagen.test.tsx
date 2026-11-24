import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FinDeViaje from '../src/screens/FinDeViaje'

const mocks = vi.hoisted(() => ({
  crearImagenResumen: vi.fn(),
  descargarArchivo: vi.fn(),
  compartirFichero: vi.fn(),
}))

vi.mock('../src/utils/imagenResumen', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../src/utils/imagenResumen')>()
  return { ...original, crearImagenResumen: mocks.crearImagenResumen }
})

vi.mock('../src/utils/compartir', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../src/utils/compartir')>()
  return { ...original, descargarArchivo: mocks.descargarArchivo, compartirFichero: mocks.compartirFichero }
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
  for (let i = 0; i < 5; i++) await usuario.keyboard('{ArrowRight}')
  return usuario
}

beforeEach(() => {
  mocks.crearImagenResumen.mockReset()
  mocks.descargarArchivo.mockReset()
  mocks.compartirFichero.mockReset()
  mocks.compartirFichero.mockResolvedValue('compartido')
  mocks.crearImagenResumen.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  URL.createObjectURL = vi.fn(() => 'blob:resumen')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('FinDeViaje: resumen final y descarga de la imagen', () => {



  it('lo que no tiene datos viaja como null', async () => {
    simular({ resumen: { dias: 0, actividad_mas_votada: null, alma_del_grupo: null }, fotos: [fotos[0]] })
    render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('TravelWrap · Resumen')
    const usuario = userEvent.setup()
    await usuario.keyboard('{ArrowRight}')
    await usuario.keyboard('{ArrowRight}')

    await screen.findByAltText('Resumen del viaje a Roma, Italia')
    const datos = mocks.crearImagenResumen.mock.calls[0][0]
    expect(datos.dias).toBeNull()
    expect(datos.estrella).toBeNull()
    expect(datos.alma).toBeNull()
    expect(datos.fotos).toEqual(['https://storage.test/foto0.jpg'])
  })


  it('si una foto no se puede cargar crea el resumen sin fotos y lo avisa', async () => {
    simular()
    const { ErrorDeImagen } = await import('../src/utils/imagenResumen')
    mocks.crearImagenResumen.mockRejectedValueOnce(new ErrorDeImagen('No se ha podido cargar alguna de las fotos para crear la imagen'))
    const usuario = await abrirUltima()

    await screen.findByAltText('Resumen del viaje a Roma, Italia')
    expect((await screen.findByRole('status')).textContent).toBe('No se han podido incluir las fotos en la imagen')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(mocks.crearImagenResumen.mock.calls[1][0].fotos).toEqual([])

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))
    await waitFor(() => expect(mocks.descargarArchivo).toHaveBeenCalledTimes(1))
  })

  it('si no se puede crear ni sin fotos avisa, no descarga y deja reintentar', async () => {
    simular()
    const { ErrorDeImagen } = await import('../src/utils/imagenResumen')
    mocks.crearImagenResumen.mockRejectedValueOnce(new ErrorDeImagen('Tu navegador no puede crear la imagen'))
    mocks.crearImagenResumen.mockRejectedValueOnce(new ErrorDeImagen('Tu navegador no puede crear la imagen'))
    const usuario = await abrirUltima()

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toBe('Tu navegador no puede crear la imagen')
    expect(screen.getByText('Pulsa «Descargar imagen» para volver a intentarlo')).toBeTruthy()
    expect(mocks.descargarArchivo).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))
    await waitFor(() => expect(mocks.descargarArchivo).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(await screen.findByAltText('Resumen del viaje a Roma, Italia')).toBeTruthy()
  })



  it('«Compartir» comparte la imagen ya creada con su nombre y no la descarga', async () => {
    simular()
    const usuario = await abrirUltima()
    await screen.findByAltText('Resumen del viaje a Roma, Italia')

    await usuario.click(screen.getByRole('button', { name: 'Compartir' }))

    await waitFor(() => expect(mocks.compartirFichero).toHaveBeenCalledTimes(1))
    const archivo = mocks.compartirFichero.mock.calls[0][0] as File
    expect(archivo.name).toBe('TravelWrap-Roma-Italia-2027.png')
    expect(archivo.type).toBe('image/png')
    expect(mocks.crearImagenResumen).toHaveBeenCalledTimes(1)
    expect(mocks.descargarArchivo).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('si el dispositivo no puede compartir se descarga y se avisa', async () => {
    simular()
    mocks.compartirFichero.mockResolvedValue('descargado')
    const usuario = await abrirUltima()
    await screen.findByAltText('Resumen del viaje a Roma, Italia')

    await usuario.click(screen.getByRole('button', { name: 'Compartir' }))

    expect((await screen.findByRole('status')).textContent).toContain('se ha descargado la imagen')
  })


  it('si compartir falla enseña un error', async () => {
    simular()
    mocks.compartirFichero.mockRejectedValue(new Error('boom'))
    const usuario = await abrirUltima()
    await screen.findByAltText('Resumen del viaje a Roma, Italia')

    await usuario.click(screen.getByRole('button', { name: 'Compartir' }))

    expect((await screen.findByRole('alert')).textContent).toBe('No se ha podido compartir la imagen')
  })

  it('«Compartir» crea la imagen si todavía no existe y no comparte si no se puede crear', async () => {
    simular()
    mocks.crearImagenResumen.mockRejectedValue(new Error('boom'))
    const usuario = await abrirUltima()
    await screen.findByRole('alert')

    await usuario.click(screen.getByRole('button', { name: 'Compartir' }))

    await waitFor(() => expect(mocks.crearImagenResumen).toHaveBeenCalledTimes(2))
    expect(mocks.compartirFichero).not.toHaveBeenCalled()
  })

  it('un viaje sin datos también enseña el resumen y se descarga', async () => {
    simular({ resumen: { dias: 0, actividad_mas_votada: null, alma_del_grupo: null }, fotos: [] })
    render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('TravelWrap · Resumen')
    const usuario = userEvent.setup()
    await usuario.keyboard('{ArrowRight}')
    expect(await screen.findByAltText('Resumen del viaje a Roma, Italia')).toBeTruthy()
    const datos = mocks.crearImagenResumen.mock.calls[0][0]
    expect(datos.dias).toBeNull()
    expect(datos.estrella).toBeNull()
    expect(datos.alma).toBeNull()
    expect(datos.fotos).toEqual([])

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))

    await waitFor(() => expect(mocks.descargarArchivo).toHaveBeenCalledTimes(1))
    expect(mocks.crearImagenResumen).toHaveBeenCalledTimes(1)
  })
})
