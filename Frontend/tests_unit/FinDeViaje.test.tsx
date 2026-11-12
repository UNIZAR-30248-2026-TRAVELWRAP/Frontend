import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FinDeViaje from '../src/screens/FinDeViaje'
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
  estado: 'archivado',
  miembros: [
    { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
}

const RESUMEN = {
  dias: 4,
  gasto_total: 178,
  gasto_mayor: { concepto: 'Cena Trastevere', importe: 120.5 },
  actividad_mas_votada: { titulo: 'Coliseo', votos: 3 },
  alma_del_grupo: { usuario_id: BERTA, nombre: 'Berta', pagos: 2, planes_propuestos: 4, fotos_subidas: 1 },
}

const RESUMEN_VACIO = { dias: 4, gasto_total: 0, gasto_mayor: null, actividad_mas_votada: null, alma_del_grupo: null }

const foto = { id: 'f1', viaje_id: VIAJE_ID, nombre: 'coliseo.jpg', tipo_mime: 'image/jpeg', tamano_bytes: 1, subido_por: BERTA, creado_en: '2027-05-12T10:00:00Z', url: 'https://storage.test/coliseo.jpg' }

const saldos = [
  { usuario_id: BERTA, nombre: 'Berta', pagado: 178, parte: 89, saldo: 89 },
  { usuario_id: ADRIANA, nombre: 'Adriana', pagado: 0, parte: 89, saldo: -89 },
]

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const simularBackend = ({ resumen = RESUMEN as unknown, fotos = [foto] as unknown[], balance = saldos as unknown[], falla = false } = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.endsWith('/resumen')) return falla ? json(502, { error: { codigo: 'error_resumen', mensaje: 'No se ha podido calcular el resumen del viaje' } }) : json(200, resumen)
      if (url.endsWith('/fotos')) return json(200, { fotos })
      if (url.endsWith('/balance')) return json(200, { saldos: balance })
      return json(200, viaje)
    }),
  )

const terminarBarra = () => {
  const barra = screen.getByTestId('progreso-activo')
  fireEvent(barra, new Event('animationend', { bubbles: true }))
  fireEvent(barra, new Event('webkitAnimationEnd', { bubbles: true }))
}

const abrir = async (props = {}) => {
  render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" {...props} />)
  await screen.findByText('TravelWrap · Resumen')
}

const siguiente = async (veces = 1) => {
  const usuario = userEvent.setup()
  for (let i = 0; i < veces; i++) await usuario.keyboard('{ArrowRight}')
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('FinDeViaje: diapositivas', () => {
  it('recorre las siete diapositivas con sus datos', async () => {
    simularBackend()
    await abrir()
    expect(screen.getByRole('heading', { name: 'Roma' })).toBeTruthy()
    expect(screen.getByRole('region').getAttribute('aria-label')).toBe('Resumen del viaje, 1 de 7: Portada')

    await siguiente()
    expect(screen.getByText('días de aventura')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()

    await siguiente()
    expect(screen.getByText(/178/)).toBeTruthy()
    expect(screen.getByText(/Cena Trastevere/)).toBeTruthy()

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
    expect(screen.getByText('Casi listos')).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Pagos pendientes entre los viajeros' }).textContent).toContain('Adriana paga a Berta')
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

  it('en la última diapositiva el botón lleva a Mis viajes', async () => {
    simularBackend()
    const alTerminar = vi.fn()
    await abrir({ onTerminar: alTerminar })

    await siguiente(6)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ir a Mis viajes' }))

    expect(alTerminar).toHaveBeenCalledTimes(1)
  })

  it('las flechas del teclado navegan y no hay botones de Anterior ni Siguiente', async () => {
    simularBackend()
    await abrir()
    const usuario = userEvent.setup()
    expect(screen.queryByRole('button', { name: 'Anterior' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ir a Mis viajes' })).toBeNull()

    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('region').getAttribute('aria-label')).toContain('2 de 7')
    await usuario.keyboard('{ArrowLeft}')
    await usuario.keyboard('{ArrowLeft}')
    expect(screen.getByRole('region').getAttribute('aria-label')).toContain('1 de 7')
  })

  it('un viaje sin datos muestra el caso vacío de cada diapositiva', async () => {
    simularBackend({ resumen: RESUMEN_VACIO, fotos: [], balance: [] })
    await abrir()

    await siguiente(2)
    expect(screen.getByText('No se registró ningún gasto en este viaje')).toBeTruthy()
    await siguiente()
    expect(screen.getByText('Nadie votó actividades en este viaje')).toBeTruthy()
    await siguiente()
    expect(screen.getByText('Nadie registró pagos en este viaje')).toBeTruthy()
    await siguiente()
    expect(screen.getByText('0 fotos')).toBeTruthy()
    expect(screen.getByText('Nadie subió fotos a la galería')).toBeTruthy()
    await siguiente()
    expect(screen.getByText('Todo saldado')).toBeTruthy()
  })

  it('si fallan las fotos o el balance el resumen se muestra igual', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.endsWith('/resumen')) return json(200, RESUMEN)
        if (url.endsWith('/fotos') || url.endsWith('/balance')) return json(502, { error: { codigo: 'error', mensaje: 'fallo' } })
        return json(200, viaje)
      }),
    )
    await abrir()

    await siguiente(5)
    expect(screen.getByText('0 fotos')).toBeTruthy()
    await siguiente()
    expect(screen.getByText('Todo saldado')).toBeTruthy()
  })

  it('si falla el resumen muestra el error y no hay botones de navegación', async () => {
    simularBackend({ falla: true })
    render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('No se ha podido preparar el resumen')
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull()
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

  it('una pulsación larga pausa la barra y no cambia de diapositiva', async () => {
    simularBackend()
    await abrir()
    const ahora = vi.spyOn(Date, 'now')

    ahora.mockReturnValue(1000)
    pulsar(300)
    expect(screen.getByTestId('progreso-activo').style.animationPlayState).toBe('paused')

    ahora.mockReturnValue(1800)
    soltar(300)

    expect(diapositivaActual()).toContain('1 de 7')
    expect(screen.getByTestId('progreso-activo').style.animationPlayState).toBe('running')
    ahora.mockRestore()
  })

  it('al arrastrar el cubo gira y se ve la historia vecina; al soltar pasado el umbral se cambia', async () => {
    simularBackend()
    await abrir()
    toque(300)

    pulsar(300)
    mover(150)
    const cubo = screen.getByText('Cena Trastevere', { exact: false }).closest('[style*="preserve-3d"]') as HTMLElement
    expect(cubo.style.transform).toContain('rotateY(-33.75deg)')
    expect(screen.getByText('Cena Trastevere', { exact: false }).closest('[aria-hidden="true"]')).not.toBeNull()
    soltar(150)

    await waitFor(() => expect(diapositivaActual()).toContain('3 de 7'))
    expect(document.querySelector('[style*="preserve-3d"]')).toBeNull()
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

  it('arrastrar hacia la derecha vuelve a la anterior', async () => {
    simularBackend()
    await abrir()
    await siguiente(2)

    pulsar(100)
    mover(300)
    soltar(300)

    await waitFor(() => expect(diapositivaActual()).toContain('2 de 7'))
  })

  it('si se vuelve a la posición normal o se arrastra poco no se cambia', async () => {
    simularBackend()
    await abrir()

    pulsar(300)
    mover(100)
    mover(300)
    soltar(300)
    await waitFor(() => expect(document.querySelector('[style*="preserve-3d"]')).toBeNull())
    expect(diapositivaActual()).toContain('1 de 7')

    pulsar(300)
    mover(260)
    soltar(260)
    await waitFor(() => expect(document.querySelector('[style*="preserve-3d"]')).toBeNull())
    expect(diapositivaActual()).toContain('1 de 7')
  })

  it('en los extremos no hay vecina a la que ir', async () => {
    simularBackend()
    await abrir()

    pulsar(100)
    mover(350)
    soltar(350)
    await waitFor(() => expect(document.querySelector('[style*="preserve-3d"]')).toBeNull())
    expect(diapositivaActual()).toContain('1 de 7')

    await siguiente(6)
    pulsar(300)
    mover(50)
    soltar(50)
    await waitFor(() => expect(document.querySelector('[style*="preserve-3d"]')).toBeNull())
    expect(diapositivaActual()).toContain('7 de 7')
  })

  it('al acabar la barra pasa sola a la siguiente y en la última se queda', async () => {
    simularBackend()
    const alTerminar = vi.fn()
    await abrir({ onTerminar: alTerminar })

    terminarBarra()
    expect(diapositivaActual()).toContain('2 de 7')

    await siguiente(5)
    terminarBarra()
    expect(diapositivaActual()).toContain('7 de 7')
    expect(alTerminar).not.toHaveBeenCalled()
  })

  it('con «reducir movimiento» no avanza sola, no gira el cubo y el arrastre cambia sin animación', async () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduce'), addEventListener: () => {}, removeEventListener: () => {} }))
    simularBackend()
    await abrir()

    expect(screen.queryByTestId('progreso-activo')).toBeNull()
    toque(300)
    expect(diapositivaActual()).toContain('2 de 7')

    pulsar(300)
    mover(100)
    expect(document.querySelector('[style*="preserve-3d"]')).toBeNull()
    soltar(100)
    expect(diapositivaActual()).toContain('3 de 7')
  })
})

describe('utilidades del resumen', () => {
  it('listaDeNombres une con comas y «y»', () => {
    expect(listaDeNombres([])).toBe('')
    expect(listaDeNombres(['Ana'])).toBe('Ana')
    expect(listaDeNombres(['Ana', 'Luis'])).toBe('Ana y Luis')
    expect(listaDeNombres(['Ana', 'Luis', 'Eva'])).toBe('Ana, Luis y Eva')
  })

  it('pluraliza los días y los votos', () => {
    expect(textoDeDias(1)).toBe('día de aventura')
    expect(textoDeDias(4)).toBe('días de aventura')
    expect(textoDeVotos(1)).toBe('1 voto')
    expect(textoDeVotos(3)).toBe('3 votos')
  })

  it('calcularTransferencias salda las cuentas con el menor número de pagos y sin errores de coma flotante', () => {
    expect(
      calcularTransferencias([
        { nombre: 'Ana', saldo: 60.1 },
        { nombre: 'Luis', saldo: -20.05 },
        { nombre: 'Eva', saldo: -40.05 },
      ]),
    ).toEqual([
      { de: 'Eva', a: 'Ana', importe: 40.05 },
      { de: 'Luis', a: 'Ana', importe: 20.05 },
    ])
    expect(calcularTransferencias([{ nombre: 'Ana', saldo: 0 }])).toEqual([])
    expect(calcularTransferencias([{ nombre: null, saldo: -5 }, { nombre: 'Ana', saldo: 5 }])).toEqual([
      { de: 'Antiguo miembro', a: 'Ana', importe: 5 },
    ])
  })
})
