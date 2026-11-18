import { useEffect, useState } from "react"
import { listarMensajes, type Mensaje } from "./chatApi"
import { escucharMensajes } from "./chatTiempoReal"

// Cuando se lee el chat de un viaje, la pestaña Chat de la barra inferior vuelve a contar desde cero
export const CAMBIO_LECTURA = "travelwrap:chat-leido"

const CLAVE = (viajeId: string) => `travelwrap.chatLeido.${viajeId}`

// Fecha de la última lectura del chat de este viaje en este dispositivo (null si nunca se ha abierto)
export const fechaUltimaLectura = (viajeId: string): string | null => {
  try {
    return localStorage.getItem(CLAVE(viajeId));
  } catch {
    return null;
  }
}

// Guarda cuándo se ha leído el chat (por defecto, ahora) y avisa a la barra inferior
export const marcarChatLeido = (viajeId: string, fecha: string = new Date().toISOString()) => {
  try {
    localStorage.setItem(CLAVE(viajeId), fecha);
  } catch {
    // Sin almacenamiento el contador no se puede guardar, pero el aviso sí se envía
  }
  window.dispatchEvent(new CustomEvent(CAMBIO_LECTURA, { detail: { viajeId } }));
};

// Mensajes de otros miembros creados después de la última lectura
export const contarNoLeidos = (mensajes: Mensaje[], usuarioId: string, desde: string | null) => {
  const limite = desde ? Date.parse(desde) : -Infinity;
  return mensajes.filter((m) => m.autor.usuario_id !== usuarioId && Date.parse(m.creado_en) > limite).length;
};

const estaEnElChat = () => window.location.pathname.endsWith("/chat");

// Número de mensajes nuevos del viaje para la pestaña Chat. Se actualiza en tiempo real, también cuando la app está
// en otra pantalla del viaje, y vuelve a 0 al abrir el chat
export const useMensajesNoLeidos = (
  viajeId: string | undefined,
  tokenSesion: string | undefined,
  usuarioId: string | undefined,
) => {
  const [noLeidos, setNoLeidos] = useState(0);

  useEffect(() => {
    if (!viajeId || !tokenSesion || !usuarioId) {
      setNoLeidos(0);
      return;
    }
    let vigente = true;

    listarMensajes(viajeId, tokenSesion)
      .then(({ mensajes }) => {
        if (vigente) setNoLeidos(contarNoLeidos(mensajes, usuarioId, fechaUltimaLectura(viajeId)));
      })
      .catch(() => {
        if (vigente) setNoLeidos(0);
      });

    const dejarDeEscuchar = escucharMensajes(viajeId, tokenSesion, (mensaje) => {
      if (mensaje.autor.usuario_id === usuarioId) return;
      // Con el chat abierto el mensaje se lee al momento
      if (estaEnElChat()) {
        marcarChatLeido(viajeId, mensaje.creado_en);
        return;
      }
      setNoLeidos((n) => n + 1);
    });

    const alLeer = (evento: Event) => {
      if (evento instanceof CustomEvent && evento.detail?.viajeId === viajeId) setNoLeidos(0);
    };
    window.addEventListener(CAMBIO_LECTURA, alLeer);

    return () => {
      vigente = false;
      dejarDeEscuchar();
      window.removeEventListener(CAMBIO_LECTURA, alLeer);
    };
  }, [viajeId, tokenSesion, usuarioId]);

  return noLeidos;
};
