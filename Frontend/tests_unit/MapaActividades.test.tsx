import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import MapaActividades, { ALTO_MAPA, type PuntoDelMapa } from '../src/components/MapaActividades'

type LineaFalsa = { puntos: number[][]; opciones: { color: string; dashArray: string; interactive: boolean } }

type MarcadorFalso = {
  latlng: [number, number]
  opciones: { title: string; alt: string; icon: { html: string } }
  popup: HTMLElement | null
}

const falso = vi.hoisted(() => {
  const estado = { marcadores: [] as MarcadorFalso[], lineas: [] as LineaFalsa[] }
  const mapa = { setView: vi.fn(), fitBounds: vi.fn(), remove: vi.fn(), invalidateSize: vi.fn() }
  const capa = {
    clearLayers: vi.fn(() => {
      estado.marcadores.length = 0
      estado.lineas.length = 0
    }),
    addTo: vi.fn(() => capa),
  }
  const capaDeTeselas = { addTo: vi.fn() }
  const L = {
    map: vi.fn(() => mapa),
    tileLayer: vi.fn(() => capaDeTeselas),
    layerGroup: vi.fn(() => capa),
    divIcon: vi.fn((opciones: { html: string }) => opciones),
    polyline: vi.fn((puntos: number[][], opciones: LineaFalsa['opciones']) => {
      const linea = {
        addTo: () => {
          estado.lineas.push({ puntos, opciones })
          return linea
        },
      }
      return linea
    }),
    latLngBounds: vi.fn((puntos: number[][]) => ({ puntos })),
    marker: vi.fn((latlng: [number, number], opciones: MarcadorFalso['opciones']) => {
      const marcador: MarcadorFalso & { bindPopup: (c: HTMLElement) => unknown; addTo: () => unknown } = {
        latlng,
        opciones,
        popup: null,
        bindPopup: (contenido) => {
          marcador.popup = contenido
          return marcador
        },
        addTo: () => {
          estado.marcadores.push(marcador)
          return marcador
        },
      }
      return marcador
    }),
  }
  return { estado, mapa, capa, capaDeTeselas, L }
})

vi.mock('leaflet', () => ({ default: falso.L }))

const COLISEO: PuntoDelMapa = {
  id: 'a1',
  titulo: 'Visita al Coliseo',
  ubicacion: 'Colosseo, Roma',
  latitud: 41.890214,
  longitud: 12.492231,
}
const FORO: PuntoDelMapa = {
  id: 'a2',
  titulo: 'Foro Romano',
  ubicacion: null,
  latitud: 41.892462,
  longitud: 12.485325,
}

beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
  falso.estado.marcadores.length = 0
  falso.estado.lineas.length = 0
})

describe('MapaActividades', () => {
  it('crea el mapa con las teselas de OpenStreetMap, su atribución y sin zoom con la rueda', () => {
    render(<MapaActividades puntos={[COLISEO]} />)

    expect(falso.L.map).toHaveBeenCalledTimes(1)
    expect(falso.L.map.mock.calls[0][1]).toMatchObject({ scrollWheelZoom: false })
    const [plantilla, opciones] = falso.L.tileLayer.mock.calls[0] as unknown as [string, { attribution: string }]
    expect(plantilla).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png')
    expect(opciones.attribution).toContain('OpenStreetMap')
    expect(falso.capaDeTeselas.addTo).toHaveBeenCalledTimes(1)
  })

  it('es una región accesible con el alto del mapa', () => {
    render(<MapaActividades puntos={[COLISEO]} />)

    const region = screen.getByRole('region', { name: 'Mapa de las actividades del día' })
    expect((region.parentElement as HTMLElement).style.height).toBe(`${ALTO_MAPA}px`)
  })

  it('con una sola actividad pone un marcador numerado y centra el mapa en él', () => {
    render(<MapaActividades puntos={[COLISEO]} />)

    expect(falso.estado.marcadores).toHaveLength(1)
    expect(falso.estado.marcadores[0].latlng).toEqual([41.890214, 12.492231])
    expect(falso.estado.marcadores[0].opciones.title).toBe('1. Visita al Coliseo')
    expect(falso.estado.marcadores[0].opciones.alt).toBe('1. Visita al Coliseo')
    expect(falso.mapa.setView).toHaveBeenCalledWith([41.890214, 12.492231], 15)
    expect(falso.mapa.fitBounds).not.toHaveBeenCalled()
  })

  it('con varias actividades las numera en orden y ajusta el mapa para verlas todas', () => {
    render(<MapaActividades puntos={[COLISEO, FORO]} />)

    expect(falso.estado.marcadores.map((m) => m.opciones.title)).toEqual(['1. Visita al Coliseo', '2. Foro Romano'])
    expect(falso.estado.marcadores[0].opciones.icon.html).toContain('>1</text>')
    expect(falso.estado.marcadores[1].opciones.icon.html).toContain('>2</text>')
    expect(falso.L.latLngBounds).toHaveBeenCalledWith([
      [41.890214, 12.492231],
      [41.892462, 12.485325],
    ])
    expect(falso.mapa.fitBounds).toHaveBeenCalledWith(expect.anything(), { padding: [36, 36], maxZoom: 16 })
    expect(falso.mapa.setView).not.toHaveBeenCalled()
  })

  it('el primer marcador es naranja y los demás azules', () => {
    render(<MapaActividades puntos={[COLISEO, FORO]} />)

    expect(falso.estado.marcadores[0].opciones.icon.html).toContain('fill="#DD6B20"')
    expect(falso.estado.marcadores[1].opciones.icon.html).toContain('fill="#2B6CB0"')
  })

  it('con varias actividades dibuja una línea que las une en el orden de la agenda', () => {
    render(<MapaActividades puntos={[COLISEO, FORO]} />)

    expect(falso.estado.lineas).toHaveLength(1)
    expect(falso.estado.lineas[0].puntos).toEqual([
      [41.890214, 12.492231],
      [41.892462, 12.485325],
    ])
    expect(falso.estado.lineas[0].opciones).toMatchObject({ color: '#2B6CB0', dashArray: '8 8', interactive: false })
  })

  it('con el trazado por calles dibuja esa línea continua en lugar de la recta', () => {
    const calles: [number, number][] = [
      [41.890214, 12.492231],
      [41.8911, 12.49],
      [41.892462, 12.485325],
    ]
    render(<MapaActividades puntos={[COLISEO, FORO]} trazado={calles} />)

    expect(falso.estado.lineas).toHaveLength(1)
    expect(falso.estado.lineas[0].puntos).toEqual(calles)
    expect(falso.estado.lineas[0].opciones.dashArray).toBeUndefined()
  })

  it('al llegar el trazado por calles sustituye a la línea recta sin crear otro mapa', () => {
    const { rerender } = render(<MapaActividades puntos={[COLISEO, FORO]} />)
    expect(falso.estado.lineas[0].opciones.dashArray).toBe('8 8')

    rerender(
      <MapaActividades
        puntos={[COLISEO, FORO]}
        trazado={[
          [41.890214, 12.492231],
          [41.892462, 12.485325],
        ]}
      />,
    )

    expect(falso.L.map).toHaveBeenCalledTimes(1)
    expect(falso.estado.lineas).toHaveLength(1)
    expect(falso.estado.lineas[0].opciones.dashArray).toBeUndefined()
  })

  it('con una sola actividad o ninguna no dibuja línea', () => {
    const { rerender } = render(<MapaActividades puntos={[COLISEO]} />)
    expect(falso.estado.lineas).toHaveLength(0)

    rerender(<MapaActividades puntos={[]} />)

    expect(falso.estado.lineas).toHaveLength(0)
    expect(falso.L.polyline).not.toHaveBeenCalled()
  })

  it('al cambiar las actividades la línea anterior se borra y se dibuja la nueva', () => {
    const { rerender } = render(<MapaActividades puntos={[COLISEO, FORO]} />)

    rerender(<MapaActividades puntos={[FORO, COLISEO]} />)

    expect(falso.estado.lineas).toHaveLength(1)
    expect(falso.estado.lineas[0].puntos[0]).toEqual([41.892462, 12.485325])
  })

  it('al tocar un marcador se abre una ventana con el título y el lugar de la actividad', () => {
    render(<MapaActividades puntos={[COLISEO, FORO]} />)

    expect(falso.estado.marcadores[0].popup?.textContent).toBe('Visita al ColiseoColosseo, Roma')
    expect(falso.estado.marcadores[1].popup?.textContent).toBe('Foro Romano')
  })

  it('escribe el título como texto, sin interpretar HTML', () => {
    const malicioso: PuntoDelMapa = { ...COLISEO, titulo: '<img src=x onerror=alert(1)>', ubicacion: '<b>Roma</b>' }
    render(<MapaActividades puntos={[malicioso]} />)

    const ventana = falso.estado.marcadores[0].popup as HTMLElement
    expect(ventana.querySelector('img')).toBeNull()
    expect(ventana.querySelector('b')).toBeNull()
    expect(ventana.textContent).toBe('<img src=x onerror=alert(1)><b>Roma</b>')
  })

  it('sin actividades con ubicación no pone marcadores y enseña el mundo entero', () => {
    render(<MapaActividades puntos={[]} />)

    expect(falso.estado.marcadores).toHaveLength(0)
    expect(falso.mapa.setView).toHaveBeenCalledWith([25, 10], 2)
    expect(falso.mapa.fitBounds).not.toHaveBeenCalled()
  })

  it('al cambiar las actividades borra los marcadores anteriores y pinta los nuevos sin crear otro mapa', () => {
    const { rerender } = render(<MapaActividades puntos={[COLISEO, FORO]} />)

    rerender(<MapaActividades puntos={[FORO]} />)

    expect(falso.L.map).toHaveBeenCalledTimes(1)
    expect(falso.capa.clearLayers).toHaveBeenCalledTimes(2)
    expect(falso.estado.marcadores.map((m) => m.opciones.title)).toEqual(['1. Foro Romano'])
    expect(falso.mapa.setView).toHaveBeenLastCalledWith([41.892462, 12.485325], 15)
  })

  it('al pasar de tener actividades a no tenerlas vuelve a la vista del mundo', () => {
    const { rerender } = render(<MapaActividades puntos={[COLISEO]} />)

    rerender(<MapaActividades puntos={[]} />)

    expect(falso.estado.marcadores).toHaveLength(0)
    expect(falso.mapa.setView).toHaveBeenLastCalledWith([25, 10], 2)
  })

  it('si las actividades no cambian no vuelve a pintar el mapa', () => {
    const { rerender } = render(<MapaActividades puntos={[COLISEO]} />)

    rerender(<MapaActividades puntos={[{ ...COLISEO }]} />)

    expect(falso.capa.clearLayers).toHaveBeenCalledTimes(1)
  })

  it('sin función para ampliar no muestra el botón', () => {
    render(<MapaActividades puntos={[COLISEO]} />)

    expect(screen.queryByRole('button', { name: /mapa/i })).toBeNull()
  })

  it('con función para ampliar muestra el botón «Ampliar mapa» y lo avisa al pulsarlo', () => {
    const alternar = vi.fn()
    render(<MapaActividades puntos={[COLISEO]} alAlternarAmpliado={alternar} />)

    const boton = screen.getByRole('button', { name: 'Ampliar mapa' })
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(boton)

    expect(alternar).toHaveBeenCalledTimes(1)
  })

  it('ampliado el botón pasa a «Reducir mapa» y el mapa ocupa el espacio libre', () => {
    render(<MapaActividades puntos={[COLISEO]} ampliado alAlternarAmpliado={() => undefined} />)

    const boton = screen.getByRole('button', { name: 'Reducir mapa' })
    expect(boton.getAttribute('aria-expanded')).toBe('true')
    const region = screen.getByRole('region', { name: 'Mapa de las actividades del día' })
    expect((region.parentElement as HTMLElement).style.height).toBe('')
    expect((region.parentElement as HTMLElement).style.flex).toContain('1')
  })

  it('el botón de ampliar mide al menos 44 px para el dedo', () => {
    render(<MapaActividades puntos={[COLISEO]} alAlternarAmpliado={() => undefined} />)

    const boton = screen.getByRole('button', { name: 'Ampliar mapa' })
    expect(boton.style.width).toBe('44px')
    expect(boton.style.height).toBe('44px')
  })

  it('al ampliar o reducir avisa a Leaflet del cambio de tamaño sin crear otro mapa', () => {
    const { rerender } = render(<MapaActividades puntos={[COLISEO]} alAlternarAmpliado={() => undefined} />)
    falso.mapa.invalidateSize.mockClear()

    rerender(<MapaActividades puntos={[COLISEO]} ampliado alAlternarAmpliado={() => undefined} />)
    expect(falso.mapa.invalidateSize).toHaveBeenCalledTimes(1)
    rerender(<MapaActividades puntos={[COLISEO]} alAlternarAmpliado={() => undefined} />)

    expect(falso.mapa.invalidateSize).toHaveBeenCalledTimes(2)
    expect(falso.L.map).toHaveBeenCalledTimes(1)
  })

  it('al girar el dispositivo o cambiar el tamaño de la ventana recalcula el tamaño del mapa', () => {
    render(<MapaActividades puntos={[COLISEO]} />)
    falso.mapa.invalidateSize.mockClear()

    window.dispatchEvent(new Event('resize'))

    expect(falso.mapa.invalidateSize).toHaveBeenCalledTimes(1)
  })

  it('al salir de la pantalla deja de escuchar los cambios de tamaño', () => {
    const { unmount } = render(<MapaActividades puntos={[COLISEO]} />)
    unmount()
    falso.mapa.invalidateSize.mockClear()

    window.dispatchEvent(new Event('resize'))

    expect(falso.mapa.invalidateSize).not.toHaveBeenCalled()
  })

  it('al salir de la pantalla destruye el mapa', () => {
    const { unmount } = render(<MapaActividades puntos={[COLISEO]} />)

    unmount()

    expect(falso.mapa.remove).toHaveBeenCalledTimes(1)
  })
})
