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

  Escenario: Sin portada el viaje se ve como siempre
    Dado que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Entonces veo el texto "Roma 2027"
    Y no veo ninguna foto de portada

  Escenario: Quitar la portada
    Dado que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Y que el viaje "Roma 2027" ya tiene una foto de portada
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Editar viaje"
    Y quito la foto de portada
    Y pulso el botón "Guardar cambios"
    Entonces estoy en el inicio del viaje
    Y no veo ninguna foto de portada
    Y el servidor ha quitado 1 foto de portada

  Escenario: Una foto de otro tipo se rechaza y la portada no cambia
    Dado que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Editar viaje"
    Y elijo la foto de portada "animacion.gif" de tipo "image/gif"
    Entonces veo el mensaje de error "La portada debe ser una foto JPEG o PNG"
    Y veo que el viaje no tiene portada
    Y el botón "Guardar cambios" está desactivado
    Y el servidor ha guardado 0 foto de portada

  Escenario: Si el servidor rechaza la foto de portada se muestra el error y no se cambia nada
    Dado que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Y que el servidor rechaza las fotos de portada por grandes
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Editar viaje"
    Y elijo la foto de portada "roma.png" de tipo "image/png"
    Y pulso el botón "Guardar cambios"
    Entonces veo el mensaje de error "La foto es demasiado grande (máximo 5 MB)"
    Y el servidor ha guardado 0 foto de portada

  Escenario: Un miembro que no es el creador también puede cambiar la portada
    Dado que soy miembro, pero no creador, del viaje activo "Lisboa 2027"
    Cuando abro el viaje "Lisboa 2027" desde mis viajes
    Y pulso el botón "Editar viaje"
    Y elijo la foto de portada "lisboa.png" de tipo "image/png"
    Y pulso el botón "Guardar cambios"
    Entonces estoy en el inicio del viaje
    Y veo la foto de portada del viaje
    Y el servidor ha guardado 1 foto de portada

  Escenario: En un viaje finalizado no se puede cambiar la portada
    Dado que soy miembro, pero no creador, del viaje finalizado "Praga 2025"
    Cuando abro el inicio del viaje "Praga 2025"
    Entonces veo el texto "Este viaje está finalizado"
    Y no veo el botón "Cambiar portada"
