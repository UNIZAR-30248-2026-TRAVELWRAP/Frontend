import { C } from "../styles/tokens"

export type DatosImagenResumen = {
  lugar: string
  anio: string
  fechas: string
  nombres: string
  dias: { numero: number; texto: string } | null
  estrella: { titulo: string; votos: string } | null
  alma: { nombre: string; color: string; estadisticas: { etiqueta: string; valor: number }[] } | null
  fotos: string[]
  totalFotos: number
}

export class ErrorDeImagen extends Error {}

const ANCHO = 1080
const ALTO_MINIMO = 1920
const MARGEN = 84
const FUENTE = "Nunito, sans-serif"
const DORADO = "#FBD38D"
const BLANCO_SUAVE = "rgba(255,255,255,0.88)"
const TARJETA = "rgba(255,255,255,0.16)"
const BORDE_TARJETA = "rgba(255,255,255,0.3)"
const COLUMNAS_FOTOS = 3
const HUECO_FOTOS = 12

const fuente = (peso: number, tamano: number) => `${peso} ${tamano}px ${FUENTE}`

const cargarFuentes = async () => {
  if (!document.fonts?.load) return
  await Promise.all([800, 900].map((peso) => document.fonts.load(fuente(peso, 40)).catch(() => [])))
}

const cargarFoto = async (url: string) => {
  try {
    const respuesta = await fetch(url)
    if (!respuesta.ok) throw new Error("respuesta no válida")
    return await createImageBitmap(await respuesta.blob())
  } catch {
    throw new ErrorDeImagen("No se ha podido cargar alguna de las fotos para crear la imagen")
  }
}

const dividirEnLineas = (contexto: CanvasRenderingContext2D, texto: string, ancho: number) => {
  const lineas: string[] = []
  let actual = ""
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    if (actual && contexto.measureText(prueba).width > ancho) {
      lineas.push(actual)
      actual = palabra
    } else actual = prueba
  }
  if (actual) lineas.push(actual)
  return lineas
}

const rectanguloRedondeado = (contexto: CanvasRenderingContext2D, x: number, y: number, ancho: number, alto: number, radio: number) => {
  contexto.beginPath()
  contexto.moveTo(x + radio, y)
  contexto.arcTo(x + ancho, y, x + ancho, y + alto, radio)
  contexto.arcTo(x + ancho, y + alto, x, y + alto, radio)
  contexto.arcTo(x, y + alto, x, y, radio)
  contexto.arcTo(x, y, x + ancho, y, radio)
  contexto.closePath()
}

const dibujarRecortada = (contexto: CanvasRenderingContext2D, imagen: ImageBitmap, x: number, y: number, ancho: number, alto: number) => {
  const escala = Math.max(ancho / imagen.width, alto / imagen.height)
  const origenAncho = ancho / escala
  const origenAlto = alto / escala
  contexto.drawImage(imagen, (imagen.width - origenAncho) / 2, (imagen.height - origenAlto) / 2, origenAncho, origenAlto, x, y, ancho, alto)
}

type Bloque = { alto: number; dibujar: (contexto: CanvasRenderingContext2D, y: number) => void }

const etiqueta = (contexto: CanvasRenderingContext2D, texto: string, y: number) => {
  contexto.fillStyle = BLANCO_SUAVE
  contexto.font = fuente(800, 30)
  contexto.textAlign = "center"
  contexto.textBaseline = "alphabetic"
  contexto.fillText(texto.toUpperCase().split("").join(" "), ANCHO / 2, y)
}

export const crearImagenResumen = async (datos: DatosImagenResumen): Promise<Blob> => {
  await cargarFuentes()
  const fotos = await Promise.all(datos.fotos.map(cargarFoto))
  const medidor = document.createElement("canvas").getContext("2d")
  if (!medidor) throw new ErrorDeImagen("Tu navegador no puede crear la imagen")

  medidor.font = fuente(900, 132)
  const lineasLugar = dividirEnLineas(medidor, datos.lugar, ANCHO - MARGEN * 2).slice(0, 2)
  medidor.font = fuente(700, 36)
  const lineasNombres = dividirEnLineas(medidor, datos.nombres, ANCHO - MARGEN * 2).slice(0, 2)
  medidor.font = fuente(900, 56)
  const lineasEstrella = datos.estrella ? dividirEnLineas(medidor, datos.estrella.titulo, ANCHO - MARGEN * 2 - 96).slice(0, 3) : []

  const lado = (ANCHO - MARGEN * 2 - HUECO_FOTOS * (COLUMNAS_FOTOS - 1)) / COLUMNAS_FOTOS
  const filasDeFotos = Math.ceil(fotos.length / COLUMNAS_FOTOS)

  const bloques: Bloque[] = []

  const altoPortada = 140 + lineasLugar.length * 140 + (datos.anio ? 140 : 0) + 48 + (datos.fechas ? 50 : 0) + lineasNombres.length * 50 + 60
  bloques.push({
    alto: altoPortada,
    dibujar: (contexto, y) => {
      let cursor = y + 140
      etiqueta(contexto, "TravelWrap · Resumen", y + 70)
      contexto.fillStyle = "white"
      contexto.font = fuente(900, 132)
      contexto.textAlign = "center"
      for (const linea of lineasLugar) {
        contexto.fillText(linea, ANCHO / 2, cursor + 100)
        cursor += 140
      }
      if (datos.anio) {
        contexto.fillStyle = DORADO
        contexto.fillText(datos.anio, ANCHO / 2, cursor + 100)
        cursor += 140
      }
      cursor += 48
      contexto.fillStyle = BLANCO_SUAVE
      contexto.font = fuente(700, 36)
      if (datos.fechas) {
        contexto.fillText(datos.fechas, ANCHO / 2, cursor + 36)
        cursor += 50
      }
      for (const linea of lineasNombres) {
        contexto.fillText(linea, ANCHO / 2, cursor + 36)
        cursor += 50
      }
    },
  })

  if (datos.dias) {
    const dias = datos.dias
    bloques.push({
      alto: 420,
      dibujar: (contexto, y) => {
        etiqueta(contexto, "Tiempo juntos", y + 40)
        contexto.fillStyle = "white"
        contexto.font = fuente(900, 220)
        contexto.textAlign = "center"
        contexto.fillText(String(dias.numero), ANCHO / 2, y + 260)
        contexto.font = fuente(800, 56)
        contexto.fillText(dias.texto, ANCHO / 2, y + 340)
      },
    })
  }

  if (datos.estrella) {
    const estrella = datos.estrella
    const altoTarjeta = 70 + lineasEstrella.length * 70 + 120
    bloques.push({
      alto: altoTarjeta + 130,
      dibujar: (contexto, y) => {
        etiqueta(contexto, "El momento estrella", y + 40)
        contexto.fillStyle = TARJETA
        rectanguloRedondeado(contexto, MARGEN, y + 90, ANCHO - MARGEN * 2, altoTarjeta, 44)
        contexto.fill()
        contexto.strokeStyle = BORDE_TARJETA
        contexto.lineWidth = 2
        contexto.stroke()
        contexto.fillStyle = "white"
        contexto.font = fuente(900, 56)
        contexto.textAlign = "center"
        lineasEstrella.forEach((linea, i) => contexto.fillText(linea, ANCHO / 2, y + 90 + 90 + i * 70))
        contexto.font = fuente(700, 32)
        contexto.fillStyle = BLANCO_SUAVE
        contexto.fillText("La actividad más votada del viaje", ANCHO / 2, y + 90 + 90 + lineasEstrella.length * 70)
        contexto.font = fuente(800, 34)
        contexto.fillStyle = "white"
        contexto.fillText(estrella.votos, ANCHO / 2, y + 90 + 90 + lineasEstrella.length * 70 + 50)
      },
    })
  }

  if (datos.alma) {
    const alma = datos.alma
    bloques.push({
      alto: 470 + (alma.estadisticas.length > 0 ? 190 : 0),
      dibujar: (contexto, y) => {
        etiqueta(contexto, "El alma del grupo", y + 40)
        contexto.fillStyle = alma.color
        contexto.beginPath()
        contexto.arc(ANCHO / 2, y + 190, 100, 0, Math.PI * 2)
        contexto.fill()
        contexto.fillStyle = "white"
        contexto.font = fuente(900, 96)
        contexto.textAlign = "center"
        contexto.textBaseline = "middle"
        contexto.fillText(alma.nombre.charAt(0).toUpperCase() || "?", ANCHO / 2, y + 196)
        contexto.textBaseline = "alphabetic"
        contexto.font = fuente(900, 84)
        contexto.fillText(alma.nombre, ANCHO / 2, y + 378)
        contexto.font = fuente(700, 36)
        contexto.fillStyle = BLANCO_SUAVE
        contexto.fillText("Pagó la cuenta más veces", ANCHO / 2, y + 440)
        const ancho = 220
        const hueco = 24
        const inicio = (ANCHO - (alma.estadisticas.length * ancho + (alma.estadisticas.length - 1) * hueco)) / 2
        alma.estadisticas.forEach((dato, i) => {
          const x = inicio + i * (ancho + hueco)
          contexto.fillStyle = TARJETA
          rectanguloRedondeado(contexto, x, y + 490, ancho, 150, 32)
          contexto.fill()
          contexto.strokeStyle = BORDE_TARJETA
          contexto.lineWidth = 2
          contexto.stroke()
          contexto.fillStyle = "white"
          contexto.textAlign = "center"
          contexto.font = fuente(900, 60)
          contexto.fillText(String(dato.valor), x + ancho / 2, y + 555)
          contexto.font = fuente(700, 26)
          contexto.fillText(dato.etiqueta, x + ancho / 2, y + 610)
        })
      },
    })
  }

  if (fotos.length > 0) {
    bloques.push({
      alto: 170 + filasDeFotos * (lado + HUECO_FOTOS),
      dibujar: (contexto, y) => {
        etiqueta(contexto, "Vuestros recuerdos", y + 40)
        contexto.fillStyle = "white"
        contexto.font = fuente(900, 64)
        contexto.textAlign = "center"
        contexto.fillText(`${datos.totalFotos} ${datos.totalFotos === 1 ? "foto" : "fotos"}`, ANCHO / 2, y + 120)
        fotos.forEach((foto, i) => {
          const x = MARGEN + (i % COLUMNAS_FOTOS) * (lado + HUECO_FOTOS)
          const arriba = y + 170 + Math.floor(i / COLUMNAS_FOTOS) * (lado + HUECO_FOTOS)
          contexto.save()
          rectanguloRedondeado(contexto, x, arriba, lado, lado, 24)
          contexto.clip()
          dibujarRecortada(contexto, foto, x, arriba, lado, lado)
          contexto.restore()
        })
      },
    })
  }

  const alto = Math.max(ALTO_MINIMO, bloques.reduce((suma, bloque) => suma + bloque.alto, 0) + 220)
  const lienzo = document.createElement("canvas")
  lienzo.width = ANCHO
  lienzo.height = alto
  const contexto = lienzo.getContext("2d")
  if (!contexto) throw new ErrorDeImagen("Tu navegador no puede crear la imagen")

  const fondo = contexto.createLinearGradient(0, 0, ANCHO * 0.4, alto)
  fondo.addColorStop(0, C.navy)
  fondo.addColorStop(1, C.blue)
  contexto.fillStyle = fondo
  contexto.fillRect(0, 0, ANCHO, alto)

  const huecoEntreBloques = (alto - 220 - bloques.reduce((suma, bloque) => suma + bloque.alto, 0)) / Math.max(bloques.length, 1)
  let y = 90
  for (const bloque of bloques) {
    bloque.dibujar(contexto, y)
    y += bloque.alto + huecoEntreBloques
  }

  contexto.fillStyle = "rgba(255,255,255,0.7)"
  contexto.font = fuente(800, 32)
  contexto.textAlign = "center"
  contexto.textBaseline = "alphabetic"
  contexto.fillText("TravelWrap", ANCHO / 2, alto - 70)

  return new Promise<Blob>((resolver, rechazar) => {
    lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new ErrorDeImagen("No se ha podido crear la imagen"))), "image/png")
  })
}
