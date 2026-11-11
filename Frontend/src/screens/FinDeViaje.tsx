import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import Avatar from "../components/Avatar"
import AvatarStack from "../components/AvatarStack"
import BotonVolver from "../components/BotonVolver"
import Icon from "../components/Icon"
import { ApiError } from "../services/authApi"
import { listarFotos, type Foto } from "../services/fotosApi"
import { obtenerBalance, type SaldoMiembro } from "../services/gastosApi"
import { obtenerResumenDelViaje, type ResumenDelViaje } from "../services/resumenApi"
import { obtenerViaje, type ViajeDelUsuario } from "../services/viajesApi"
import { estiloAlerta } from "../styles/formulario"
import { C, NUNITO } from "../styles/tokens"
import { conEuros } from "../utils/gastos"
import { aMiembro, diasDelViaje, formatearFechasActivo } from "../utils/formatoViaje"
import { calcularTransferencias, listaDeNombres, textoDeDias, textoDeVotos } from "../utils/resumen"

const mensajeDeError = (e: unknown) => (e instanceof ApiError ? e.message : "Ha ocurrido un error")

const MAX_FOTOS_VISIBLES = 6

type FinDeViajeProps = {
  viajeId: string
  tokenSesion: string
  onVolver?: () => void
  onTerminar?: () => void
}

const FONDOS = [
  `linear-gradient(160deg, ${C.navy} 0%, #0F2A50 100%)`,
  `linear-gradient(160deg, #1A3A6B 0%, ${C.blue} 100%)`,
  "linear-gradient(160deg, #7B341E 0%, #C05621 100%)",
  "linear-gradient(160deg, #22543D 0%, #2F855A 100%)",
  "linear-gradient(160deg, #44337A 0%, #6B46C1 100%)",
  "linear-gradient(160deg, #1A202C 0%, #2D3748 100%)",
  `linear-gradient(160deg, ${C.navy} 0%, #1A3A6B 100%)`,
]

const estiloEtiqueta: CSSProperties = {
  fontFamily: NUNITO,
  fontSize: 13,
  fontWeight: 800,
  color: "rgba(255,255,255,0.85)",
  letterSpacing: 2,
  textTransform: "uppercase",
  margin: "0 0 16px",
}

const estiloDiapositiva: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100%",
  padding: "0 28px",
  textAlign: "center",
  fontFamily: NUNITO,
  color: "white",
}

const estiloBotonControl = (activo: boolean): CSSProperties => ({
  flex: 1,
  minHeight: 44,
  borderRadius: 14,
  border: "1.5px solid rgba(255,255,255,0.4)",
  background: "rgba(255,255,255,0.16)",
  color: "white",
  fontFamily: NUNITO,
  fontWeight: 800,
  fontSize: 14,
  cursor: activo ? "pointer" : "default",
  opacity: activo ? 1 : 0.4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
})

const estiloTarjeta: CSSProperties = {
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 14,
}

export default function FinDeViaje({ viajeId, tokenSesion, onVolver, onTerminar }: FinDeViajeProps) {
  const [viaje, setViaje] = useState<ViajeDelUsuario | null>(null)
  const [resumen, setResumen] = useState<ResumenDelViaje | null>(null)
  const [fotos, setFotos] = useState<Foto[]>([])
  const [saldos, setSaldos] = useState<SaldoMiembro[]>([])
  const [error, setError] = useState("")
  const [pagina, setPagina] = useState(0)

  useEffect(() => {
    let vigente = true
    Promise.all([
      obtenerViaje(viajeId, tokenSesion),
      obtenerResumenDelViaje(viajeId, tokenSesion),
      listarFotos(viajeId, tokenSesion).catch(() => null),
      obtenerBalance(viajeId, tokenSesion).catch(() => null),
    ])
      .then(([datosViaje, datosResumen, listaFotos, balance]) => {
        if (!vigente) return
        setViaje(datosViaje)
        setResumen(datosResumen)
        setFotos((listaFotos?.fotos ?? []).filter((foto) => foto.url !== null))
        setSaldos(balance?.saldos ?? [])
      })
      .catch((e) => {
        if (vigente) setError(`No se ha podido preparar el resumen: ${mensajeDeError(e)}`)
      })
    return () => {
      vigente = false
    }
  }, [viajeId, tokenSesion])

  const miembros = (viaje?.miembros ?? []).map((m, indice) => aMiembro(m.nombre, indice))
  const nombres = miembros.map((m) => m.name)
  const dias = viaje?.fecha_inicio && viaje.fecha_fin ? diasDelViaje(viaje.fecha_inicio, viaje.fecha_fin) : []
  const lugar = viaje?.destino || viaje?.nombre || ""
  const anio = viaje?.fecha_inicio?.slice(0, 4) ?? ""
  const alma = resumen?.alma_del_grupo ?? null
  const indiceDelAlma = alma ? (viaje?.miembros ?? []).findIndex((m) => m.usuario_id === alma.usuario_id) : -1
  const transferencias = calcularTransferencias(saldos)
  const colorDe = (nombre: string) => {
    const indice = (viaje?.miembros ?? []).findIndex((m) => m.nombre === nombre)
    return aMiembro(nombre, Math.max(indice, 0))
  }

  const diapositivas: { titulo: string; contenido: ReactNode }[] =
    viaje && resumen
      ? [
          {
            titulo: "Portada",
            contenido: (
              <>
                <p style={estiloEtiqueta}>TravelWrap · Resumen</p>
                <h1 style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, margin: "0 0 8px", overflowWrap: "anywhere" }}>
                  {lugar}
                </h1>
                {anio && <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color: "#FBD38D", marginBottom: 28 }}>{anio}</div>}
                <p style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,0.9)", margin: "0 0 28px" }}>
                  {formatearFechasActivo(viaje.fecha_inicio, viaje.fecha_fin)}
                  <br />
                  {listaDeNombres(nombres)}
                </p>
                <AvatarStack members={miembros} size={44} max={5} />
              </>
            ),
          },
          {
            titulo: "Tiempo juntos",
            contenido: (
              <>
                <p style={estiloEtiqueta}>Tiempo juntos</p>
                <div style={{ fontSize: 110, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>{resumen.dias}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "rgba(255,255,255,0.95)", marginBottom: 24 }}>
                  {textoDeDias(resumen.dias)}
                </div>
                {dias.length > 0 && dias.length <= 6 && (
                  <ul
                    aria-label="Días del viaje"
                    style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10 }}
                  >
                    {dias.map((dia) => (
                      <li key={dia.fecha} style={{ ...estiloTarjeta, padding: "12px 14px", fontSize: 13, fontWeight: 800 }}>
                        {dia.texto.replace(/^Día \d+ · /, "")}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ),
          },
          {
            titulo: "Gastos",
            contenido: (
              <>
                <p style={estiloEtiqueta}>En total gastasteis</p>
                <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, marginBottom: 6, overflowWrap: "anywhere" }}>
                  {conEuros(resumen.gasto_total)}
                </div>
                <div style={{ fontSize: 16, color: "rgba(255,255,255,0.9)", marginBottom: 32 }}>
                  {miembros.length > 1 ? `entre los ${miembros.length}` : "en el viaje"}
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.95)", overflowWrap: "anywhere" }}>
                  {resumen.gasto_mayor
                    ? `El gasto más alto: ${resumen.gasto_mayor.concepto} · ${conEuros(resumen.gasto_mayor.importe)}`
                    : "No se registró ningún gasto en este viaje"}
                </div>
              </>
            ),
          },
          {
            titulo: "El momento estrella",
            contenido: (
              <>
                <p style={estiloEtiqueta}>El momento estrella</p>
                {resumen.actividad_mas_votada ? (
                  <div style={{ ...estiloTarjeta, width: "100%", borderRadius: 22, padding: 24, boxSizing: "border-box" }}>
                    <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 8, overflowWrap: "anywhere" }}>
                      {resumen.actividad_mas_votada.titulo}
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.95)", marginBottom: 6 }}>
                      La actividad más votada del viaje
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{textoDeVotos(resumen.actividad_mas_votada.votos)}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 16, color: "rgba(255,255,255,0.95)" }}>Nadie votó actividades en este viaje</div>
                )}
              </>
            ),
          },
          {
            titulo: "El alma del grupo",
            contenido: (
              <>
                <p style={estiloEtiqueta}>El alma del grupo</p>
                {alma ? (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <Avatar member={aMiembro(alma.nombre, Math.max(indiceDelAlma, 0))} size={90} showBorder={false} />
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 6, overflowWrap: "anywhere" }}>
                      {alma.nombre ?? "Antiguo miembro"}
                    </div>
                    <div style={{ fontSize: 15, color: "rgba(255,255,255,0.95)", marginBottom: 28 }}>Pagó la cuenta más veces</div>
                    <ul
                      aria-label={`Estadísticas de ${alma.nombre ?? "este viajero"}`}
                      style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", gap: 12 }}
                    >
                      {[
                        { etiqueta: "Pagos", valor: alma.pagos },
                        { etiqueta: "Planes propuestos", valor: alma.planes_propuestos },
                        { etiqueta: "Fotos subidas", valor: alma.fotos_subidas },
                      ].map((dato) => (
                        <li key={dato.etiqueta} style={{ ...estiloTarjeta, padding: "14px 12px", minWidth: 78 }}>
                          <div style={{ fontSize: 24, fontWeight: 900 }}>{dato.valor}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.9)", marginTop: 2 }}>{dato.etiqueta}</div>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div style={{ fontSize: 16, color: "rgba(255,255,255,0.95)" }}>Nadie registró pagos en este viaje</div>
                )}
              </>
            ),
          },
          {
            titulo: "Fotos",
            contenido: (
              <>
                <p style={estiloEtiqueta}>Vuestros recuerdos</p>
                <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 20 }}>
                  {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}
                </div>
                {fotos.length > 0 ? (
                  <ul
                    aria-label="Fotos del viaje"
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 4,
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    {fotos.slice(0, MAX_FOTOS_VISIBLES).map((foto) => (
                      <li key={foto.id} style={{ aspectRatio: "1", background: "#4A5568", overflow: "hidden" }}>
                        <img
                          src={foto.url ?? undefined}
                          alt={foto.nombre}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: 16, color: "rgba(255,255,255,0.95)" }}>Nadie subió fotos a la galería</div>
                )}
              </>
            ),
          },
          {
            titulo: "Balance final",
            contenido: (
              <>
                <p style={estiloEtiqueta}>Balance final</p>
                <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 24 }}>
                  {transferencias.length > 0 ? "Casi listos" : "Todo saldado"}
                </div>
                {transferencias.length > 0 ? (
                  <ul
                    aria-label="Pagos pendientes entre los viajeros"
                    style={{ ...estiloTarjeta, listStyle: "none", margin: 0, padding: 0, width: "100%", overflow: "hidden" }}
                  >
                    {transferencias.map((t, i) => (
                      <li
                        key={`${t.de}-${t.a}-${i}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "12px 14px",
                          borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.2)",
                          textAlign: "left",
                        }}
                      >
                        <Avatar member={colorDe(t.de)} size={30} showBorder={false} />
                        <span style={{ flex: 1, fontSize: 13, overflowWrap: "anywhere" }}>
                          <strong>{t.de}</strong> paga a <strong>{t.a}</strong>
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 900 }}>{conEuros(t.importe)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: 16, color: "rgba(255,255,255,0.95)" }}>Nadie debe nada a nadie</div>
                )}
              </>
            ),
          },
        ]
      : []

  const total = diapositivas.length
  const hayAnterior = pagina > 0
  const haySiguiente = pagina < total - 1

  useEffect(() => {
    if (total === 0) return
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "ArrowLeft") setPagina((p) => Math.max(p - 1, 0))
      else if (evento.key === "ArrowRight") setPagina((p) => Math.min(p + 1, total - 1))
    }
    window.addEventListener("keydown", alPulsar)
    return () => window.removeEventListener("keydown", alPulsar)
  }, [total])

  const fondo = total > 0 ? FONDOS[pagina % FONDOS.length] : FONDOS[0]

  return (
    <div style={{ background: fondo, minHeight: "100dvh", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          minHeight: "100dvh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          padding: "16px 0 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px 12px" }}>
          <BotonVolver onClick={onVolver} />
          {total > 0 && (
            <div aria-hidden="true" style={{ flex: 1, display: "flex", gap: 6 }}>
              {diapositivas.map((_, i) => (
                <div
                  key={i}
                  style={{ flex: 1, height: 4, borderRadius: 2, background: i <= pagina ? "white" : "rgba(255,255,255,0.3)" }}
                />
              ))}
            </div>
          )}
        </div>

        <div
          role="region"
          aria-label={total > 0 ? `Resumen del viaje, ${pagina + 1} de ${total}: ${diapositivas[pagina].titulo}` : "Resumen del viaje"}
          aria-live="polite"
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          {error && (
            <div style={{ padding: "0 20px" }}>
              <div role="alert" style={estiloAlerta}>
                {error}
              </div>
            </div>
          )}
          {!error && total === 0 && (
            <div style={{ ...estiloDiapositiva, flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 700 }}>Preparando el resumen del viaje...</p>
            </div>
          )}
          {total > 0 && <div style={{ ...estiloDiapositiva, flex: 1 }}>{diapositivas[pagina].contenido}</div>}
        </div>

        {total > 0 && (
          <div style={{ display: "flex", gap: 10, padding: "12px 20px 0" }}>
            <button type="button" onClick={() => setPagina(pagina - 1)} disabled={!hayAnterior} style={estiloBotonControl(hayAnterior)}>
              Anterior
            </button>
            {haySiguiente ? (
              <button type="button" onClick={() => setPagina(pagina + 1)} style={estiloBotonControl(true)}>
                Siguiente
              </button>
            ) : (
              <button type="button" onClick={onTerminar} style={estiloBotonControl(true)}>
                <Icon name="finish" size={18} color="white" strokeWidth={2} />
                Ir a Mis viajes
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
