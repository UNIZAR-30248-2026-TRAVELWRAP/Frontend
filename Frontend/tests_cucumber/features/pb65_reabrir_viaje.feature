# language: es
Característica: Reabrir un viaje finalizado (PB-65)
  Como miembro de un viaje que ha terminado
  Quiero reabrirlo desde el final del resumen, confirmándolo antes
  Para volver a editarlo y que vuelva a estar en curso para todos

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Reabrir el viaje tras confirmarlo lo deja activo
    Dado que tengo el viaje finalizado "Roma 2027"
    Cuando llego a la última diapositiva del resumen del viaje "Roma 2027"
    Y pulso el botón "Reabrir viaje"
    Entonces veo el diálogo de confirmación "¿Reabrir este viaje?"
    Cuando confirmo en el diálogo "Reabrir viaje"
    Entonces estoy en el inicio del viaje
    Y no veo el texto "Este viaje está finalizado"
    Y veo el botón "Editar viaje"
    Y el servidor ha reabierto 1 viaje

  Escenario: Cancelar la reapertura no cambia nada
    Dado que tengo el viaje finalizado "Roma 2027"
    Cuando llego a la última diapositiva del resumen del viaje "Roma 2027"
    Y pulso el botón "Reabrir viaje"
    Y confirmo en el diálogo "Cancelar"
    Entonces ya no veo el diálogo de confirmación
    Y el servidor ha reabierto 0 viaje

  Escenario: El servidor no puede reabrir el viaje
    Dado que tengo el viaje finalizado "Roma 2027"
    Y que el servidor no puede reabrir viajes
    Cuando llego a la última diapositiva del resumen del viaje "Roma 2027"
    Y pulso el botón "Reabrir viaje"
    Y confirmo en el diálogo "Reabrir viaje"
    Entonces veo el mensaje de error "No se ha podido reabrir el viaje"
    Y el servidor ha reabierto 0 viaje

  Escenario: Un miembro que no es el creador también puede reabrir el viaje
    Dado que soy miembro, pero no creador, del viaje finalizado "Roma 2027"
    Cuando llego a la última diapositiva del resumen del viaje "Roma 2027"
    Y pulso el botón "Reabrir viaje"
    Y confirmo en el diálogo "Reabrir viaje"
    Entonces estoy en el inicio del viaje
    Y el servidor ha reabierto 1 viaje
