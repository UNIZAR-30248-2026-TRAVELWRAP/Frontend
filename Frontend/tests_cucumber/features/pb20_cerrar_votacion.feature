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

  Escenario: Los demás miembros ven la votación cerrada sin recargar
    Dado que Berta ha creado el viaje "Roma 2027" con destino "Roma" y yo soy miembro
    Y que el viaje tiene la votación de fechas "¿Qué fin de semana salimos?" con las opciones "12 – 15 mayo" y "19 – 22 mayo"
    Y que ya he votado "19 – 22 mayo" en "¿Qué fin de semana salimos?"
    Y que Berta ya ha votado "19 – 22 mayo" en "¿Qué fin de semana salimos?"
    Cuando entro en las votaciones del viaje
    Y Berta cierra la votación "¿Qué fin de semana salimos?" desde su móvil
    Entonces la votación "¿Qué fin de semana salimos?" está cerrada con la ganadora "19 – 22 mayo"
    Y ya no se puede votar en "¿Qué fin de semana salimos?"
