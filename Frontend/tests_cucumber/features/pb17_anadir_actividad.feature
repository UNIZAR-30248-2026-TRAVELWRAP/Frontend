# language: es
Característica: Añadir una actividad al itinerario (PB-17)
  Como miembro de un viaje
  Quiero añadir una actividad con título, fecha, hora y ubicación
  Para que el grupo tenga planificado el itinerario

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Añadir una actividad con título, día, hora y ubicación
    Dado que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Cuando abro la pantalla para añadir una actividad al viaje "Roma 2027"
    Y elijo el día "Día 2 · 13 may"
    Y relleno la actividad con título "Visita al Coliseo", lugar "Piazza del Colosseo" y hora "10:00"
    Y pulso el botón "Añadir al itinerario"
    Entonces estoy en el inicio del viaje
    Y el servidor ha guardado la actividad "Visita al Coliseo" el "2027-05-13" a las "10:00" en "Piazza del Colosseo"

  Escenario: No se puede añadir una actividad sin título
    Dado que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Cuando abro la pantalla para añadir una actividad al viaje "Roma 2027"
    Entonces el botón "Añadir al itinerario" está desactivado

  Escenario: Si el servidor rechaza la actividad se muestra el error
    Dado que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Y que el servidor rechaza las actividades porque el viaje está cerrado
    Cuando abro la pantalla para añadir una actividad al viaje "Roma 2027"
    Y relleno la actividad con título "Cena", lugar "" y hora ""
    Y pulso el botón "Añadir al itinerario"
    Entonces veo el mensaje de error "El viaje está cerrado y ya no se puede modificar"
    Y sigo en la pantalla de añadir actividad

  Escenario: Un viaje archivado no admite actividades nuevas
    Dado que tengo el viaje archivado "Lisboa 2026"
    Cuando abro la pantalla para añadir una actividad al viaje "Lisboa 2026"
    Entonces veo el mensaje de error "El viaje está cerrado y ya no se pueden añadir actividades"
    Y no veo el botón "Añadir al itinerario"
