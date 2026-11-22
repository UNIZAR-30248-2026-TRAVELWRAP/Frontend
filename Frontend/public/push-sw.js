// Notificaciones push de los avisos del viaje. El service worker de la PWA lo carga con importScripts (vite.config.ts)

// Ruta de la pantalla a la que lleva el aviso (la misma que rutaDeAviso en notificacionesTiempoReal.ts)
const rutaDeAviso = (aviso) => {
  const base = `/viajes/${aviso.viaje_id}`
  return aviso.pantalla === 'tareas' ? `${base}/documentos?pestana=tareas` : `${base}/${aviso.pantalla}`
}

self.addEventListener('push', (evento) => {
  const aviso = evento.data ? evento.data.json() : null
  if (!aviso) return

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      // Con la app abierta y a la vista, el aviso sale dentro de la app: no se duplica con una notificación del móvil
      if (ventanas.some((ventana) => ventana.visibilityState === 'visible')) return undefined
      return self.registration.showNotification(aviso.viaje_nombre, {
        body: aviso.texto,
        icon: '/notificacion-192x192.png',
        badge: '/notificacion-192x192.png',
        tag: `${aviso.viaje_id}-${aviso.tipo}`,
        data: { ruta: rutaDeAviso(aviso) },
      })
    }),
  )
})

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  const ruta = evento.notification.data?.ruta ?? '/'

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas[0]
      if (abierta) return abierta.focus().then((ventana) => ventana.navigate(ruta))
      return self.clients.openWindow(ruta)
    }),
  )
})
