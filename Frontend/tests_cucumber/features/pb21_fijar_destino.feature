# language: es
Característica: Fijar el destino ganador en el viaje (PB-21)
  Como creador de un viaje sin destino
  Quiero cerrar la votación del destino
  Para que el viaje quede con el destino que ha elegido el grupo

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que he creado el viaje "Verano 2027" para votar el destino, con Berta como miembro

  Escenario: Un viaje pendiente de destino solo muestra «Elegir destino»
    Dado que en la votación del destino están propuestos "Praga" y "Lisboa"
    Cuando abro el viaje pendiente "Verano 2027" desde mis viajes
    Entonces estoy en «Elegir destino» del viaje
    Y en la votación del destino han votado 0 de 2 miembros

  Escenario: Se proponen y votan destinos hasta que han votado todos
    Dado que en la votación del destino están propuestos "Praga" y "Lisboa"
    Y que Berta ya ha votado "Praga" en "¿A dónde queremos ir?"
    Cuando abro el viaje pendiente "Verano 2027" desde mis viajes
    Entonces el botón "Fijar «Praga» como destino" está desactivado
    Cuando propongo el destino "Oporto"
    Y voto el destino "Praga"
    Entonces en la votación del destino han votado 2 de 2 miembros

  Escenario: El creador fija el destino ganador y el viaje se desbloquea
    Dado que en la votación del destino están propuestos "Praga" y "Lisboa"
    Y que Berta ya ha votado "Praga" en "¿A dónde queremos ir?"
    Cuando abro el viaje pendiente "Verano 2027" desde mis viajes
    Y voto el destino "Praga"
    Y pulso el botón "Fijar «Praga» como destino"
    Y pulso el botón "Confirmar Praga"
    Entonces estoy en el inicio del viaje
    Y el viaje tiene como destino "Praga"
    Y el servidor ha cerrado 1 votación
    Y veo el viaje "Verano 2027" en mis viajes sin destino pendiente

  Escenario: Después la votación del destino aparece cerrada con el ganador
    Dado que en la votación del destino están propuestos "Praga" y "Lisboa"
    Y que Berta ya ha votado "Lisboa" en "¿A dónde queremos ir?"
    Cuando abro el viaje pendiente "Verano 2027" desde mis viajes
    Y voto el destino "Lisboa"
    Y pulso el botón "Fijar «Lisboa» como destino"
    Y pulso el botón "Confirmar Lisboa"
    Y entro en las votaciones del viaje
    Entonces la votación "¿A dónde queremos ir?" está cerrada con la ganadora "Lisboa"

  Escenario: Con empate el destino se sortea
    Dado que en la votación del destino están propuestos "Praga" y "Lisboa"
    Y que Berta ya ha votado "Praga" en "¿A dónde queremos ir?"
    Cuando abro el viaje pendiente "Verano 2027" desde mis viajes
    Y voto el destino "Lisboa"
    Entonces veo el texto "Fijar destino (hay empate)"
    Cuando pulso el botón "Fijar destino (hay empate)"
    Y pulso el botón "Confirmar sorteo"
    Entonces estoy en el inicio del viaje
    Y el viaje tiene como destino "Praga"

  Escenario: Cuando la creadora fija el destino, los demás pasan solos al inicio del viaje
    Dado que en realidad la creadora del viaje es Berta y yo solo soy miembro
    Y que en la votación del destino están propuestos "Praga" y "Lisboa"
    Y que ya he votado "Lisboa" en "¿A dónde queremos ir?"
    Y que Berta ya ha votado "Lisboa" en "¿A dónde queremos ir?"
    Cuando abro el viaje pendiente "Verano 2027" desde mis viajes
    Y Berta cierra la votación "¿A dónde queremos ir?" desde su móvil
    Entonces estoy en el inicio del viaje
