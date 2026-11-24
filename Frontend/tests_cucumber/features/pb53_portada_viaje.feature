# language: es
Característica: Foto de portada del viaje (PB-53)
  Como viajero
  Quiero elegir una foto de portada para el viaje
  Para que todo el grupo la vea en Mis viajes y en el inicio del viaje

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Elegir una foto de portada y verla en el inicio y en Mis viajes
    Dado que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Editar viaje"
    Y elijo la foto de portada "roma.png" de tipo "image/png"
    Y pulso el botón "Guardar cambios"
    Entonces estoy en el inicio del viaje
    Y veo la foto de portada del viaje
    Y el servidor ha guardado 1 foto de portada
    Cuando vuelvo a Mis viajes
    Entonces veo la foto de portada en la tarjeta de "Roma 2027"

  Escenario: Una foto de otro tipo se rechaza y la portada no cambia
    Dado que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Editar viaje"
    Y elijo la foto de portada "animacion.gif" de tipo "image/gif"
    Entonces veo el mensaje de error "La portada debe ser una foto JPEG o PNG"
    Y veo que el viaje no tiene portada
    Y el botón "Guardar cambios" está desactivado
    Y el servidor ha guardado 0 foto de portada
