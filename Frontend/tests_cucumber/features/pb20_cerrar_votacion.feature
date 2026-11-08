# language: es
Característica: Cerrar una votación (PB-20)
  Como creador de un viaje
  Quiero cerrar una votación cuando han votado todos los miembros
  Para dejar fijada la opción ganadora

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Mientras falten votos no se puede cerrar la votación
    Dado que he creado el viaje "Roma 2027" con destino "Roma", en el que también está Berta
    Y que el viaje tiene la votación de fechas "¿Qué fin de semana salimos?" con las opciones "12 – 15 mayo" y "19 – 22 mayo"
    Y que ya he votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Cuando entro en las votaciones del viaje
    Entonces el botón «Cerrar votación» de "¿Qué fin de semana salimos?" está desactivado
    Y veo el texto "Podrás cerrarla cuando hayan votado todos los miembros."

  Escenario: El creador cierra la votación y queda la ganadora
    Dado que he creado el viaje "Roma 2027" con destino "Roma", en el que también está Berta
    Y que el viaje tiene la votación de fechas "¿Qué fin de semana salimos?" con las opciones "12 – 15 mayo" y "19 – 22 mayo"
    Y que ya he votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Y que Berta ya ha votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Cuando entro en las votaciones del viaje
    Y pulso «Cerrar votación» en "¿Qué fin de semana salimos?"
    Entonces veo el diálogo de confirmación "¿Cerrar la votación?"
    Y el diálogo dice "Ganará 12 – 15 mayo, la opción más votada."
    Cuando confirmo en el diálogo "Cerrar votación"
    Entonces la votación "¿Qué fin de semana salimos?" está cerrada con la ganadora "12 – 15 mayo"
    Y ya no se puede votar en "¿Qué fin de semana salimos?"
    Y el servidor ha cerrado 1 votación

  Escenario: Con empate se avisa de que la ganadora se elegirá al azar
    Dado que he creado el viaje "Roma 2027" con destino "Roma", en el que también está Berta
    Y que el viaje tiene la votación de fechas "¿Qué fin de semana salimos?" con las opciones "12 – 15 mayo" y "19 – 22 mayo"
    Y que ya he votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Y que Berta ya ha votado "19 – 22 mayo" en "¿Qué fin de semana salimos?"
    Cuando entro en las votaciones del viaje
    Y pulso «Cerrar votación» en "¿Qué fin de semana salimos?"
    Entonces el diálogo dice "Hay un empate entre 12 – 15 mayo y 19 – 22 mayo: se elegirá una de ellas al azar."

  Escenario: Cancelar el cierre deja la votación abierta
    Dado que he creado el viaje "Roma 2027" con destino "Roma", en el que también está Berta
    Y que el viaje tiene la votación de fechas "¿Qué fin de semana salimos?" con las opciones "12 – 15 mayo" y "19 – 22 mayo"
    Y que ya he votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Y que Berta ya ha votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Cuando entro en las votaciones del viaje
    Y pulso «Cerrar votación» en "¿Qué fin de semana salimos?"
    Y pulso el botón "Cancelar"
    Entonces ya no veo el diálogo de confirmación
    Y el servidor ha cerrado 0 votaciones
    Y la opción "12 – 15 mayo" de "¿Qué fin de semana salimos?" tiene 2 votos (100 %)

  Escenario: Solo el creador del viaje puede cerrar votaciones
    Dado que Berta ha creado el viaje "Roma 2027" con destino "Roma" y yo soy miembro
    Y que el viaje tiene la votación de fechas "¿Qué fin de semana salimos?" con las opciones "12 – 15 mayo" y "19 – 22 mayo"
    Y que ya he votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Y que Berta ya ha votado "12 – 15 mayo" en "¿Qué fin de semana salimos?"
    Cuando entro en las votaciones del viaje
    Entonces no veo el botón «Cerrar votación» en "¿Qué fin de semana salimos?"

  Escenario: Los demás miembros ven la votación cerrada sin recargar
    Dado que Berta ha creado el viaje "Roma 2027" con destino "Roma" y yo soy miembro
    Y que el viaje tiene la votación de fechas "¿Qué fin de semana salimos?" con las opciones "12 – 15 mayo" y "19 – 22 mayo"
    Y que ya he votado "19 – 22 mayo" en "¿Qué fin de semana salimos?"
    Y que Berta ya ha votado "19 – 22 mayo" en "¿Qué fin de semana salimos?"
    Cuando entro en las votaciones del viaje
    Y Berta cierra la votación "¿Qué fin de semana salimos?" desde su móvil
    Entonces la votación "¿Qué fin de semana salimos?" está cerrada con la ganadora "19 – 22 mayo"
    Y ya no se puede votar en "¿Qué fin de semana salimos?"
