import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react"
import BarraInferior, { ALTO_BARRA_INFERIOR, type SeccionViaje } from "../components/BarraInferior"
import BotonVolver from "../components/BotonVolver"
import Heading from "../components/Heading"
import Icon from "../components/Icon"
import VistaPreviaDocumento from "../components/VistaPreviaDocumento"
import SectionLabel from "../components/SectionLabel"
import { ApiError } from "../services/authApi"
import { listarDocumentos, subirDocumento, TIPOS_DOCUMENTO, type Documento } from "../services/documentosApi"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { estiloAlerta } from "../styles/formulario"
import { C, GRADIENTS, NUNITO, RADIUS, SHADOWS } from "../styles/tokens"
import { aMiembro } from "../utils/formatoViaje"
import {
  aspectoDeDocumento,
  descargarDocumento,
  fechaDeSubida,
  mensajeAlAbrir,
  motivoParaNoSubir,
  tamanoLegible,
} from "../utils/documentos"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

// Pantalla: Cartera de Documentos (billetes, reservas, seguros... compartidos por los miembros del viaje)
type CarteraDocumentosProps = {
  viajeId: string
  tokenSesion: string
  onVolver?: () => void
  onCambiarSeccion?: (seccion: SeccionViaje) => void
}

export default function CarteraDocumentos({ viajeId, tokenSesion, onVolver, onCambiarSeccion }: CarteraDocumentosProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")
  const [subiendo, setSubiendo] = useState(false)
  const [errorSubida, setErrorSubida] = useState("")
  const [aviso, setAviso] = useState("")
  const [abierto, setAbierto] = useState<Documento | null>(null)
  const [errorDescarga, setErrorDescarga] = useState("")
  const selectorArchivo = useRef<HTMLInputElement>(null)

  // El viaje hace falta para saber quién subió cada documento y si aún se pueden subir
  useEffect(() => {
    let vigente = true
    Promise.all([obtenerViaje(viajeId, tokenSesion), listarDocumentos(viajeId, tokenSesion)])
      .then(([datosViaje, lista]) => {
        if (!vigente) return
        setViaje(datosViaje)
        setDocumentos(lista.documentos)
      })
      .catch((e) => {
        if (vigente) setError(`No se han podido cargar los documentos: ${mensajeDeError(e)}`)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  const miembros = viaje?.miembros ?? []
  // Nombre y color de quien lo subió, con el mismo color que su avatar en el resto de pantallas
  const autor = (usuarioId: string | null) => {
    const indice = miembros.findIndex((m) => m.usuario_id === usuarioId)
    return indice === -1 ? { name: "Un antiguo miembro", color: C.muted } : aMiembro(miembros[indice].nombre, indice)
  }
  const activo = viaje?.estado === "activo"

  const handleArchivoElegido = async (evento: ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0]
    // Se vacía el selector para poder volver a elegir el mismo archivo si falla
    evento.target.value = ""
    if (!archivo) return

    setAviso("")
    const motivo = motivoParaNoSubir(archivo)
    if (motivo) {
      setErrorSubida(motivo)
      return
    }

    setErrorSubida("")
    setSubiendo(true)
    try {
      const documento = await subirDocumento(viajeId, archivo, tokenSesion)
      setDocumentos((anteriores) => [documento, ...anteriores])
      setAviso(`«${documento.nombre}» se ha añadido a la cartera`)
    } catch (e) {
      setErrorSubida(`No se ha podido subir el documento: ${mensajeDeError(e)}`)
    } finally {
      setSubiendo(false)
    }
  }

  const cerrarVistaPrevia = useCallback(() => setAbierto(null), [])

  const handleAbrir = (documento: Documento) => {
    setErrorDescarga("")
    setAbierto(documento)
  }

  const handleDescargar = async (documento: Documento) => {
    setErrorDescarga("")
    try {
      await descargarDocumento(viajeId, documento.id, tokenSesion)
    } catch (e) {
      setErrorDescarga(mensajeAlAbrir(e))
    }
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: ALTO_BARRA_INFERIOR + 24 }}>
        {/* Cabecera */}
        <div style={{ background: GRADIENTS.header, padding: "20px 20px 24px", borderRadius: RADIUS.header }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BotonVolver onClick={onVolver} />
            <div style={{ minWidth: 0 }}>
              {viaje && (
                <SectionLabel>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.55)",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {viaje.nombre}
                  </span>
                </SectionLabel>
              )}
              <Heading size={22} color="white">
                Cartera de Documentos
              </Heading>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 16px 0" }}>
          {error && (
            <div role="alert" style={{ ...estiloAlerta, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {cargando && (
            <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center" }}>Cargando documentos...</p>
          )}

          {viaje && (
            <>
              {/* Solo se suben documentos mientras el viaje está activo */}
              {activo ? (
                <>
                  <input
                    ref={selectorArchivo}
                    type="file"
                    accept={TIPOS_DOCUMENTO.join(",")}
                    aria-label="Elegir el documento que se va a subir"
                    onChange={handleArchivoElegido}
                    hidden
                  />
                  <button
                    type="button"
                    onClick={() => selectorArchivo.current?.click()}
                    disabled={subiendo}
                    style={{
                      width: "100%",
                      background: C.blue,
                      color: "white",
                      border: "none",
                      borderRadius: RADIUS.md,
                      padding: 13,
                      fontFamily: NUNITO,
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: subiendo ? "wait" : "pointer",
                      opacity: subiendo ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      boxShadow: SHADOWS.button,
                      marginBottom: 8,
                    }}
                  >
                    <Icon name="plus" size={16} color="white" strokeWidth={2.5} />
                    {subiendo ? "Subiendo documento..." : "Subir documento"}
                  </button>
                  <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 11, textAlign: "center", margin: "0 0 16px" }}>
                    PDF o imagen JPEG o PNG, de 8 MB como máximo
                  </p>
                </>
              ) : (
                <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, margin: "0 0 20px" }}>
                  El viaje está finalizado: se pueden consultar sus documentos, pero ya no se pueden subir.
                </p>
              )}

              {errorDescarga && (
                <div role="alert" style={{ ...estiloAlerta, marginBottom: 16 }}>
                  {errorDescarga}
                </div>
              )}
              {errorSubida && (
                <div role="alert" style={{ ...estiloAlerta, marginBottom: 16 }}>
                  {errorSubida}
                </div>
              )}
              {aviso && (
                <div
                  role="status"
                  style={{
                    background: C.greenBg,
                    border: `1.5px solid ${C.green}55`,
                    borderRadius: 12,
                    padding: "10px 14px",
                    color: C.green,
                    fontFamily: NUNITO,
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 16,
                    overflowWrap: "anywhere",
                  }}
                >
                  {aviso}
                </div>
              )}

              <SectionLabel>Documentos del viaje</SectionLabel>
              {documentos.length === 0 ? (
                <p style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, textAlign: "center", padding: "24px 0" }}>
                  Aún no hay documentos en la cartera del viaje.
                </p>
              ) : (
                <ul
                  aria-label="Documentos del viaje"
                  style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {documentos.map((documento) => {
                    const aspecto = aspectoDeDocumento(documento.tipo_mime)
                    const quien = autor(documento.subido_por)
                    return (
                      <li
                        key={documento.id}
                        style={{
                          background: "white",
                          borderRadius: RADIUS.lg,
                          padding: "14px 16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          boxShadow: SHADOWS.card,
                          border: `1.5px solid ${C.border}`,
                        }}
                      >
                        <button
                          type="button"
                          aria-label={`Abrir ${documento.nombre}`}
                          onClick={() => handleAbrir(documento)}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            background: "none",
                            border: "none",
                            padding: 0,
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            aria-hidden="true"
                            style={{
                              width: 46,
                              height: 46,
                              borderRadius: 13,
                              background: aspecto.fondo,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon name={aspecto.icono} size={22} color={aspecto.color} strokeWidth={1.6} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: NUNITO,
                                color: C.navy,
                                fontSize: 13,
                                fontWeight: 700,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {documento.nombre}
                            </div>
                            <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 11, marginTop: 2 }}>
                              {aspecto.texto} · {tamanoLegible(documento.tamano_bytes)} · {fechaDeSubida(documento.creado_en)}
                            </div>
                            <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 11, marginTop: 2 }}>
                              Subido por <span style={{ color: quien.color, fontWeight: 700 }}>{quien.name}</span>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-label={`Descargar ${documento.nombre}`}
                          onClick={() => handleDescargar(documento)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 13,
                            border: `1.5px solid ${C.border}`,
                            background: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          <Icon name="download" size={18} color={C.navy} strokeWidth={1.8} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {abierto && (
        <VistaPreviaDocumento viajeId={viajeId} documento={abierto} tokenSesion={tokenSesion} onCerrar={cerrarVistaPrevia} />
      )}

      <BarraInferior activa="agenda" onCambiar={onCambiarSeccion} />
    </div>
  )
}
