# language: es
Característica: Cualquier viajero gestiona todos los apartados del viaje (PB-62)
  Como viajero, sea o no el creador del viaje
  Quiero poder editar, finalizar y gestionar las votaciones del viaje
  Para que nadie dependa de una única persona, y que las votaciones solo se cierren cuando hayan votado todos

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Un miembro que no es el creador puede editar, finalizar y abandonar el viaje
    Dado que soy miembro, pero no creador, del viaje activo "Lisboa 2027"
    Cuando abro el viaje "Lisboa 2027" desde mis viajes
    Entonces veo el botón "Editar viaje"
    Y veo el botón "Finalizar viaje"
    Y veo el botón "Abandonar"

  Escenario: Un miembro que no es el creador finaliza el viaje tras confirmarlo
    Dado que soy miembro, pero no creador, del viaje activo "Lisboa 2027"
    Cuando abro el viaje "Lisboa 2027" desde mis viajes
    Y pulso el botón "Finalizar viaje"
    Entonces veo el diálogo de confirmación "¿Finalizar este viaje?"

  Escenario: Un miembro que no es el creador no puede cerrar una votación mientras falten votos
    Dado que Berta ha creado el viaje "Roma 2027" con destino "Roma" y yo soy miembro
    Y que el viaje tiene la votación de fechas "¿Qué fin de semana salimos?" con las opciones "12 – 15 mayo" y "19 – 22 mayo"
    Y que ya he votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Cuando entro en las votaciones del viaje
    Entonces el botón «Cerrar votación» de "¿Qué fin de semana salimos?" está desactivado
    Y veo el texto "Podrás cerrarla cuando hayan votado todos los miembros."

  Escenario: Un miembro que no es el creador cierra la votación cuando han votado todos
    Dado que Berta ha creado el viaje "Roma 2027" con destino "Roma" y yo soy miembro
    Y que el viaje tiene la votación de fechas "¿Qué fin de semana salimos?" con las opciones "12 – 15 mayo" y "19 – 22 mayo"
    Y que ya he votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Y que Berta ya ha votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Cuando entro en las votaciones del viaje
    Y pulso «Cerrar votación» en "¿Qué fin de semana salimos?"
    Entonces veo el diálogo de confirmación "¿Cerrar la votación?"
    Cuando confirmo en el diálogo "Cerrar votación"
    Entonces la votación "¿Qué fin de semana salimos?" está cerrada con la ganadora "12 – 15 mayo"
