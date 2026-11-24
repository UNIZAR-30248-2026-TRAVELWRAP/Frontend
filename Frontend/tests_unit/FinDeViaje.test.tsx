import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FinDeViaje from '../src/screens/FinDeViaje'

vi.mock('../src/utils/imagenResumen', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../src/utils/imagenResumen')>()),
  crearImagenResumen: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
}))
import { calcularTransferencias, listaDeNombres, textoDeDias, textoDeVotos } from '../src/utils/resumen'

configure({ asyncUtilTimeout: 5000 })

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'

const viaje = {
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  estado: 'finalizado',
  archivado: false,
  miembros: [
    { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
}

const RESUMEN = {
  dias: 4,
  actividad_mas_votada: { titulo: 'Coliseo', votos: 3 },
  alma_del_grupo: { usuario_id: BERTA, nombre: 'Berta', pagos: 2, planes_propuestos: 4, fotos_subidas: 1 },
}


const foto = { id: 'f1', viaje_id: VIAJE_ID, nombre: 'coliseo.jpg', tipo_mime: 'image/jpeg', tamano_bytes: 1, subido_por: BERTA, creado_en: '2027-05-12T10:00:00Z', url: 'https://storage.test/coliseo.jpg' }

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const simularBackend = ({
  resumen = RESUMEN as unknown,
  fotos = [foto] as unknown[],
  falla = false,
  datosViaje = {} as Record<string, unknown>,
  archivar = () => json(200, { ...viaje, estado: 'finalizado', archivado: true }),
  reabrir = () => json(200, { ...viaje, estado: 'activo' }),
  sello = null as unknown,
} = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, opciones?: RequestInit) => {
      if (url.endsWith('/sello')) {
        if (opciones?.method === 'PUT') {
          const { diseno } = JSON.parse(String(opciones.body))
          return json(200, { sello: { id: 's1', viaje_id: VIAJE_ID, diseno, destino: 'Roma', anio: 2027, elegido_en: '2027-05-20T10:00:00Z' } })
        }
        if (opciones?.method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }))
        return json(200, { sello })
      }
      if (opciones?.method === 'POST' && url.endsWith('/archivar')) return archivar()
      if (opciones?.method === 'POST' && url.endsWith('/reabrir')) return reabrir()
      if (url.endsWith('/resumen')) return falla ? json(502, { error: { codigo: 'error_resumen', mensaje: 'No se ha podido calcular el resumen del viaje' } }) : json(200, resumen)
      if (url.endsWith('/fotos')) return json(200, { fotos })
      return json(200, { ...viaje, ...datosViaje })
    }),
  )


const abrir = async (props = {}) => {
  render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" {...props} />)
  await screen.findByText('TravelWrap · Resumen')
}

const siguiente = async (veces = 1) => {
  const usuario = userEvent.setup()
  for (let i = 0; i < veces; i++) await usuario.keyboard('{ArrowRight}')
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:resumen')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const SELLO_MAPA = { id: 's1', viaje_id: VIAJE_ID, diseno: 'mapa', destino: 'Roma', anio: 2027, elegido_en: '2027-05-20T10:00:00Z' }

const abrirUltima = async (opciones = {}) => {
  simularBackend(opciones)
  await abrir()
  await siguiente(6)
}

const llamadasA = (fin: string, metodo: string) =>
  vi.mocked(fetch).mock.calls.filter(([url, op]) => String(url).endsWith(fin) && (op?.method ?? 'GET') === metodo)

describe('FinDeViaje: sello', () => {
  it('«Sellar» aparece en un viaje finalizado, archivado o no, también para quien no es el creador', async () => {
    for (const datosViaje of [{ archivado: false }, { archivado: true }, { archivado: false, rol: 'miembro' }]) {
      await abrirUltima({ datosViaje })
      expect(screen.getByRole('button', { name: 'Sellar' })).toBeTruthy()
      cleanup()
    }
  })

  it('no aparece en un viaje activo', async () => {
    await abrirUltima({ datosViaje: { estado: 'activo' } })
    expect(screen.queryByRole('button', { name: 'Sellar' })).toBeNull()
  })

  it('sin sello previo el selector abre sin ninguno marcado y se llama siempre «Sellar»', async () => {
    await abrirUltima()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sellar' }))

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText('Ningún sello seleccionado')).toBeTruthy()
    expect(within(dialogo).queryAllByRole('button', { pressed: true })).toHaveLength(0)
  })


  it('elegir un diseño lo guarda con PUT', async () => {
    await abrirUltima()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Sellar' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Sello 3: Ruta' }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Elegir' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const [, opciones] = llamadasA('/sello', 'PUT')[0]
    expect(JSON.parse(String(opciones?.body))).toEqual({ diseno: 'ruta' })
  })

  it('deseleccionar y elegir quita el sello con DELETE', async () => {
    await abrirUltima({ sello: SELLO_MAPA })
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Sellar' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Deseleccionar todos' }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Elegir' }))

    await waitFor(() => expect(llamadasA('/sello', 'DELETE')).toHaveLength(1))
  })

  it('cancelar no llama a la API', async () => {
    await abrirUltima({ sello: SELLO_MAPA })
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Sellar' }))
    const dialogo = await screen.findByRole('dialog')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Sello 4: Avión' }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(llamadasA('/sello', 'PUT')).toHaveLength(0)
    expect(llamadasA('/sello', 'DELETE')).toHaveLength(0)
  })
})

describe('FinDeViaje: diapositivas', () => {
  it('recorre las seis diapositivas con sus datos', async () => {
    simularBackend()
    await abrir()
    expect(screen.getByRole('heading', { name: 'Roma' })).toBeTruthy()
    expect(screen.getByRole('region').getAttribute('aria-label')).toBe('Resumen del viaje, 1 de 7: Portada')

    await siguiente()
    expect(screen.getByText('días de aventura')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()

    await siguiente()
    expect(screen.getByText('Coliseo')).toBeTruthy()
    expect(screen.getByText('3 votos')).toBeTruthy()

    await siguiente()
    expect(screen.getByText('Pagó la cuenta más veces')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Estadísticas de Berta' }).textContent).toContain('Planes propuestos')

    await siguiente()
    expect(screen.getByText('1 foto')).toBeTruthy()
    expect(screen.getByAltText('coliseo.jpg')).toBeTruthy()

    await siguiente()
    expect(screen.getByRole('region').getAttribute('aria-label')).toBe('Resumen del viaje, 6 de 7: Resumen')
    expect((await screen.findByAltText('Resumen del viaje a Roma')).getAttribute('src')).toBe('blob:resumen')
  })

  it('el resumen final se crea al llegar a él y no antes, y una sola vez', async () => {
    const { crearImagenResumen } = await import('../src/utils/imagenResumen')
    vi.mocked(crearImagenResumen).mockClear()
    simularBackend()
    await abrir()
    await siguiente(4)
    expect(crearImagenResumen).not.toHaveBeenCalled()

    await siguiente()
    await screen.findByAltText('Resumen del viaje a Roma')
    await siguiente()
    expect(crearImagenResumen).toHaveBeenCalledTimes(1)
  })

  it('si una foto no carga el resumen se crea sin fotos y lo avisa', async () => {
    const { crearImagenResumen, ErrorDeImagen } = await import('../src/utils/imagenResumen')
    vi.mocked(crearImagenResumen).mockRejectedValueOnce(new ErrorDeImagen('No se ha podido cargar alguna de las fotos para crear la imagen'))
    simularBackend()
    await abrir()
    await siguiente(5)

    await screen.findByAltText('Resumen del viaje a Roma')
    expect((await screen.findByRole('status')).textContent).toBe('No se han podido incluir las fotos en la imagen')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(vi.mocked(crearImagenResumen).mock.calls.at(-1)?.[0].fotos).toEqual([])
  })


  it('ya no enseña los gastos ni el balance y no pide el balance', async () => {
    simularBackend()
    await abrir()
    const titulos: string[] = []
    for (let i = 0; i < 6; i++) {
      titulos.push(screen.getByRole('region').getAttribute('aria-label') ?? '')
      await siguiente()
    }

    expect(titulos.join(' | ')).not.toMatch(/Gastos|Balance/)
    expect(screen.queryByText('Casi listos')).toBeNull()
    expect(screen.queryByText('Todo saldado')).toBeNull()
    expect(screen.queryByText(/Gasto/)).toBeNull()
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith('/balance'))).toBe(false)
  })

  it('la portada usa como fondo la última foto subida', async () => {
    const antigua = { ...foto, id: 'f0', nombre: 'antigua.jpg', url: 'https://storage.test/antigua.jpg', creado_en: '2027-05-12T09:00:00Z' }
    const reciente = { ...foto, id: 'f2', nombre: 'reciente.jpg', url: 'https://storage.test/reciente.jpg', creado_en: '2027-05-14T18:00:00Z' }
    simularBackend({ fotos: [antigua, reciente, { ...antigua, id: 'f3', creado_en: '2027-05-13T12:00:00Z' }] })
    const { container } = render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('TravelWrap · Resumen')

    const fondo = (container.firstElementChild as HTMLElement).style.background
    expect(fondo).toContain('https://storage.test/reciente.jpg')
    expect(fondo).not.toContain('antigua.jpg')

    await siguiente()
    expect((container.firstElementChild as HTMLElement).style.background).not.toContain('storage.test')
  })

  it('sin fotos la portada conserva su degradado', async () => {
    simularBackend({ fotos: [] })
    const { container } = render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('TravelWrap · Resumen')

    expect((container.firstElementChild as HTMLElement).style.background).not.toContain('url(')
  })

  it('las acciones están en una diapositiva propia tras la del resumen, con Descargar y Compartir en esta', async () => {
    simularBackend()
    await abrir()
    await siguiente(5)
    expect(diapositivaActual()).toContain('6 de 7: Resumen')
    expect(screen.getByRole('button', { name: 'Descargar imagen' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Compartir' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reabrir viaje' })).toBeNull()

    await siguiente()
    expect(diapositivaActual()).toContain('7 de 7: Acciones')
    for (const nombre of ['Sellar', 'Reabrir viaje']) expect(screen.getByRole('button', { name: nombre })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Descargar imagen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ir a Mis viajes' })).toBeNull()
  })

  it('pide confirmación, reabre el viaje y avisa con onReabierto', async () => {
    simularBackend({ datosViaje: { rol: 'miembro' } })
    const alReabrir = vi.fn()
    await abrir({ onReabierto: alReabrir })
    await siguiente(6)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Reabrir viaje' }))
    const ventana = screen.getByRole('dialog')
    expect(ventana.textContent).toContain('¿Reabrir este viaje?')
    await usuario.click(within(ventana).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(llamadasA('/reabrir', 'POST')).toHaveLength(0)

    await usuario.click(screen.getByRole('button', { name: 'Reabrir viaje' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reabrir viaje' }))

    await waitFor(() => expect(alReabrir).toHaveBeenCalledTimes(1))
    expect(llamadasA(`/viajes/${VIAJE_ID}/reabrir`, 'POST')).toHaveLength(1)
  })

  it('si no se puede reabrir muestra el error en el diálogo y no avisa', async () => {
    simularBackend({ reabrir: () => json(409, { error: { codigo: 'viaje_no_finalizado', mensaje: 'El viaje no está finalizado' } }) })
    const alReabrir = vi.fn()
    await abrir({ onReabierto: alReabrir })
    await siguiente(6)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Reabrir viaje' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reabrir viaje' }))

    const alerta = await within(screen.getByRole('dialog')).findByRole('alert')
    expect(alerta.textContent).toBe('El viaje no está finalizado')
    expect(alReabrir).not.toHaveBeenCalled()
  })

  it('«Archivar viaje» solo aparece en la diapositiva de acciones, con el viaje finalizado y sin archivar', async () => {
    simularBackend({ datosViaje: { rol: 'creador' } })
    await abrir()
    expect(screen.queryByRole('button', { name: 'Archivar viaje' })).toBeNull()
    await siguiente(6)
    expect(screen.getByRole('button', { name: 'Archivar viaje' })).toBeTruthy()
    cleanup()

    simularBackend({ datosViaje: { rol: 'creador', archivado: true } })
    await abrir()
    await siguiente(6)
    expect(screen.getByRole('button', { name: 'Reabrir viaje' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Archivar viaje' })).toBeNull()
  })

  it('un miembro que no es el creador también puede archivar el viaje para sí mismo', async () => {
    simularBackend({ datosViaje: { rol: 'miembro' } })
    const alArchivar = vi.fn()
    await abrir({ onArchivado: alArchivar })
    await siguiente(6)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Archivar viaje' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Archivar viaje' }))

    await waitFor(() => expect(alArchivar).toHaveBeenCalledTimes(1))
  })

  it('pide confirmación, archiva el viaje y avisa con onArchivado', async () => {
    simularBackend({ datosViaje: { rol: 'creador' } })
    const alArchivar = vi.fn()
    await abrir({ onArchivado: alArchivar })
    await siguiente(6)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Archivar viaje' }))
    const ventana = screen.getByRole('dialog')
    expect(ventana.textContent).toContain('¿Archivar este viaje?')
    expect(ventana.textContent).toContain('Roma 2027 pasará a «Viajes archivados» solo en tu perfil')
    expect(ventana.textContent).toContain('Los demás viajeros lo seguirán viendo como ahora')
    await usuario.click(within(ventana).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(alArchivar).not.toHaveBeenCalled()

    await usuario.click(screen.getByRole('button', { name: 'Archivar viaje' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Archivar viaje' }))

    await waitFor(() => expect(alArchivar).toHaveBeenCalledTimes(1))
    const llamadas = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit | undefined][]
    expect(llamadas.some(([url, opciones]) => url.endsWith(`/viajes/${VIAJE_ID}/archivar`) && opciones?.method === 'POST')).toBe(true)
  })




  it('oculta cada diapositiva que no tiene datos y deja las demás', async () => {
    simularBackend({ resumen: { ...RESUMEN, actividad_mas_votada: null }, fotos: [] })
    await abrir()
    expect(diapositivaActual()).toContain('1 de 5')
    await siguiente(2)
    expect(diapositivaActual()).toBe('Resumen del viaje, 3 de 5: El alma del grupo')
    cleanup()

    simularBackend({ resumen: { ...RESUMEN, alma_del_grupo: null } })
    await abrir()
    expect(diapositivaActual()).toContain('1 de 6')
    await siguiente(3)
    expect(diapositivaActual()).toBe('Resumen del viaje, 4 de 6: Fotos')
    cleanup()

    simularBackend({ resumen: { ...RESUMEN, dias: 0 } })
    await abrir()
    expect(diapositivaActual()).toContain('1 de 6')
    await siguiente()
    expect(diapositivaActual()).toBe('Resumen del viaje, 2 de 6: El momento estrella')
  })

  it('en el alma del grupo solo salen los contadores mayores que cero', async () => {
    simularBackend({ resumen: { ...RESUMEN, alma_del_grupo: { usuario_id: BERTA, nombre: 'Berta', pagos: 2, planes_propuestos: 0, fotos_subidas: 0 } }, fotos: [] })
    await abrir()
    await siguiente(3)

    const lista = screen.getByRole('list', { name: 'Estadísticas de Berta' })
    expect(within(lista).getAllByRole('listitem')).toHaveLength(1)
    expect(lista.textContent).not.toContain('Planes propuestos')
    expect(lista.textContent).not.toContain('Fotos subidas')
  })



})

const region = () => {
  const elemento = screen.getByRole('region')
  elemento.getBoundingClientRect = () => ({ left: 0, top: 0, right: 400, bottom: 600, width: 400, height: 600, x: 0, y: 0, toJSON: () => ({}) })
  return elemento
}
const pulsar = (x: number) => fireEvent.pointerDown(region(), { clientX: x, pointerId: 1, button: 0 })
const mover = (x: number) => fireEvent.pointerMove(region(), { clientX: x, pointerId: 1 })
const soltar = (x: number) => fireEvent.pointerUp(region(), { clientX: x, pointerId: 1 })
const toque = (x: number) => {
  pulsar(x)
  soltar(x)
}
const diapositivaActual = () => screen.getByRole('region').getAttribute('aria-label')

describe('FinDeViaje: como las historias', () => {
  it('tocar la parte derecha avanza y la izquierda retrocede', async () => {
    simularBackend()
    await abrir()

    toque(300)
    toque(300)
    expect(diapositivaActual()).toContain('3 de 7')

    toque(50)
    expect(diapositivaActual()).toContain('2 de 7')

    toque(50)
    toque(50)
    expect(diapositivaActual()).toContain('1 de 7')
  })





  it('el cubo no gira más de 90 grados aunque se arrastre más allá del ancho', async () => {
    simularBackend()
    await abrir()
    toque(300)

    pulsar(390)
    mover(-200)
    const cubo = document.querySelector('[style*="preserve-3d"]') as HTMLElement
    expect(cubo.style.transform).toContain('rotateY(-90deg)')

    mover(900)
    expect(cubo.style.transform).toContain('rotateY(90deg)')
    soltar(900)
    await waitFor(() => expect(document.querySelector('[style*="preserve-3d"]')).toBeNull())
  })






})

