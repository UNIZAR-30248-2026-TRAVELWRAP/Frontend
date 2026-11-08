# language: es
Característica: Crear una votación (PB-18)
  Como miembro de un viaje
  Quiero crear votaciones con sus opciones
  Para que el grupo decida fechas, actividades y otras cuestiones

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850

  Escenario: Crear una votación de fechas con sus opciones
    Cuando abro las votaciones del viaje "Roma 2027"
    Y pulso el botón "Crear nueva votación"
    Y escribo la pregunta "¿Qué fin de semana salimos?"
    Y escribo las opciones "12 – 15 mayo" y "19 – 22 mayo"
    Y pulso el botón "Publicar votación"
    Entonces estoy en las votaciones del viaje
    Y veo la votación "¿Qué fin de semana salimos?" con las opciones "12 – 15 mayo" y "19 – 22 mayo"
    Y el servidor ha recibido la votación "¿Qué fin de semana salimos?" de tipo "fecha" con 2 opciones

  Escenario: Crear una votación de actividades con una opción añadida
    Cuando abro las votaciones del viaje "Roma 2027"
    Y pulso el botón "Crear nueva votación"
    Y elijo el tipo de votación "Actividades"
    Y escribo la pregunta "¿Qué visitamos el primer día?"
    Y escribo las opciones "Coliseo" y "Vaticano"
    Y pulso el botón "Añadir opción"
    Y escribo "Trastevere" en la opción "C"
    Y pulso el botón "Publicar votación"
    Entonces estoy en las votaciones del viaje
    Y el servidor ha recibido la votación "¿Qué visitamos el primer día?" de tipo "actividad" con 3 opciones

  Escenario: Crear una votación sin opciones para que el grupo las proponga después
    Cuando abro las votaciones del viaje "Roma 2027"
    Y pulso el botón "Crear nueva votación"
    Y escribo la pregunta "¿Dónde cenamos el sábado?"
    Y pulso el botón "Publicar votación"
    Entonces estoy en las votaciones del viaje
    Y veo el texto "Todavía no hay opciones. Propón la primera."
    Y el servidor ha recibido la votación "¿Dónde cenamos el sábado?" de tipo "fecha" con 0 opciones

  Escenario: No se puede crear una votación sin pregunta
    Cuando abro las votaciones del viaje "Roma 2027"
    Y pulso el botón "Crear nueva votación"
    Y escribo las opciones "Hotel" y "Apartamento"
    Y pulso el botón "Publicar votación"
    Entonces veo el mensaje de error "Escribe la pregunta de la votación"
    Y el servidor no ha recibido ninguna votación

  Escenario: No se pueden repetir las opciones
    Cuando abro las votaciones del viaje "Roma 2027"
    Y pulso el botón "Crear nueva votación"
    Y escribo la pregunta "¿Dónde dormimos?"
    Y escribo las opciones "Hotel" y " hotel "
    Y pulso el botón "Publicar votación"
    Entonces veo el mensaje de error "Las opciones no se pueden repetir"
    Y el servidor no ha recibido ninguna votación
