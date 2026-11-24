// Test unitario de la actividad en curso y la próxima actividad del viaje
import { describe, expect, it } from 'vitest'
import { actividadEnCurso, etiquetaCuandoEmpieza, etiquetaDia, proximaActividad } from '../src/utils/actividadEnCurso'

const HOY = '2027-05-12'
const a = (id: string, hora_inicio: string | null, hora_fin: string | null = null, fecha = HOY, orden = 0) => ({
  id,
  fecha,
  hora_inicio,
  hora_fin,
  orden,
})
const a1 = a('a1', '09:00', '10:30')
const a2 = a('a2', '11:00', '12:30')
const a3 = a('a3', '15:00')
const delDia = [a1, a2, a3]
const a_las = (hora: string, fecha = HOY) => new Date(`${fecha}T${hora}:00`)

describe('actividadEnCurso', () => {
  it('antes de la primera actividad del día, la primera está en curso', () => {
    expect(actividadEnCurso(delDia, a_las('08:00'))?.id).toBe('a1')
  })

  it('mientras dura una actividad, esa es la que está en curso', () => {
    expect(actividadEnCurso(delDia, a_las('09:45'))?.id).toBe('a1')
  })

  it('al terminar una y no empezar la siguiente, no hay ninguna en curso', () => {
    expect(actividadEnCurso(delDia, a_las('10:45'))).toBeNull()
  })

  it('la actividad en curso avanza cuando empieza la siguiente', () => {
    expect(actividadEnCurso(delDia, a_las('11:10'))?.id).toBe('a2')
    expect(actividadEnCurso(delDia, a_las('15:30'))?.id).toBe('a3')
  })

  it('una actividad sin hora de fin sigue en curso hasta que empieza otra', () => {
    expect(actividadEnCurso(delDia, a_las('17:00'))?.id).toBe('a3')
  })


  it('las actividades sin hora de inicio no cuentan', () => {
    expect(actividadEnCurso([a('sinHora', null)], a_las('09:30'))).toBeNull()
  })

})

describe('proximaActividad', () => {
  it('es la primera que empieza después de ahora', () => {
    expect(proximaActividad(delDia, a_las('09:45'))?.id).toBe('a2')
  })

  it('antes del día es la primera del día', () => {
    expect(proximaActividad(delDia, a_las('08:00'))?.id).toBe('a1')
  })

})

describe('etiquetaCuandoEmpieza', () => {
  it('muestra horas y minutos hasta el inicio', () => {
    expect(etiquetaCuandoEmpieza(a3, a_las('12:30'))).toBe('En 2h 30m')
  })

  it('muestra solo minutos si faltan menos de dos horas', () => {
    expect(etiquetaCuandoEmpieza(a2, a_las('10:15'))).toBe('En 45 min')
  })

  it('muestra solo horas si el resto es cero', () => {
    expect(etiquetaCuandoEmpieza(a3, a_las('13:00'))).toBe('En 2h')
  })

  it('muestra días si falta más de un día', () => {
    expect(etiquetaCuandoEmpieza(a('lejos', '10:00', null, '2027-05-15'), a_las('10:00', HOY))).toBe('En 3 días')
  })
})

