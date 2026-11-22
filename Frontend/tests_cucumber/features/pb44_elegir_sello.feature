# language: es
Característica: Elegir el sello al terminar el viaje (PB-44)
  Como viajero de un viaje que ya ha terminado
  Quiero elegir un sello con el destino y el año
  Para guardar un recuerdo del viaje en mi perfil

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Elige uno de los cuatro sellos con el destino del viaje
    Dado que tengo el viaje finalizado "Roma 2027"
    Y que el servidor guarda mis sellos
    Cuando llego a la última diapositiva del resumen del viaje "Roma 2027"
    Y pulso el botón "Sellar"
    Entonces veo el diálogo de confirmación "Elige tu sello de Roma"
    Y veo el sello de "Roma 2027"
    Cuando elijo el diseño de sello "Ruta"
    Y confirmo en el diálogo "Elegir"
    Entonces ya no veo el diálogo de confirmación
    Y el servidor guarda el sello "ruta" de "Roma"

  Escenario: El sello que ya tenía aparece marcado y se puede cambiar
    Dado que tengo el viaje finalizado "Roma 2027"
    Y que el servidor guarda mis sellos
    Y que ya he elegido el sello "mapa" en el viaje "Roma 2027"
    Cuando llego a la última diapositiva del resumen del viaje "Roma 2027"
    Y pulso el botón "Sellar"
    Entonces el diseño de sello "Mapa" aparece marcado
    Cuando elijo el diseño de sello "Avión"
    Y confirmo en el diálogo "Elegir"
    Entonces el servidor guarda el sello "avion" de "Roma"

  Escenario: Quita el sello con «Deseleccionar todos»
    Dado que tengo el viaje finalizado "Roma 2027"
    Y que el servidor guarda mis sellos
    Y que ya he elegido el sello "mapa" en el viaje "Roma 2027"
    Cuando llego a la última diapositiva del resumen del viaje "Roma 2027"
    Y pulso el botón "Sellar"
    Y confirmo en el diálogo "Deseleccionar todos"
    Y confirmo en el diálogo "Elegir"
    Entonces el servidor no guarda ningún sello

  Escenario: Cancelar deja el sello que tenía
    Dado que tengo el viaje finalizado "Roma 2027"
    Y que el servidor guarda mis sellos
    Y que ya he elegido el sello "mapa" en el viaje "Roma 2027"
    Cuando llego a la última diapositiva del resumen del viaje "Roma 2027"
    Y pulso el botón "Sellar"
    Y elijo el diseño de sello "Chincheta"
    Y confirmo en el diálogo "Cancelar"
    Entonces ya no veo el diálogo de confirmación
    Y el servidor guarda el sello "mapa" de "Roma"

  Escenario: Un miembro que no es el creador también puede sellar un viaje archivado
    Dado que soy miembro, pero no creador, del viaje archivado "Roma 2027"
    Y que el servidor guarda mis sellos
    Cuando llego a la última diapositiva del resumen del viaje "Roma 2027"
    Y pulso el botón "Sellar"
    Y elijo el diseño de sello "Chincheta"
    Y confirmo en el diálogo "Elegir"
    Entonces el servidor guarda el sello "chincheta" de "Roma"
