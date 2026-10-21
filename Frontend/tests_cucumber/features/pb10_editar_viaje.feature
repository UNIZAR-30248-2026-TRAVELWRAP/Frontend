# language: es
Característica: Editar los datos de un viaje (PB-10)
  Como creador de un viaje
  Quiero cambiar su nombre, sus fechas o su presupuesto
  Para que todo el grupo vea los datos actualizados en el inicio del viaje

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Cambiar el nombre y el presupuesto
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Editar viaje"
    Y cambio el nombre a "Roma y Florencia" y el presupuesto a "1100"
    Y pulso el botón "Guardar cambios"
    Entonces estoy en el inicio del viaje
    Y veo el texto "Roma y Florencia"
    Y veo el texto "1.100 €"

  Escenario: No se puede guardar con la fecha de fin anterior a la de inicio
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Editar viaje"
    Y pongo como fecha de fin "2027-05-01"
    Entonces veo el mensaje de error "La fecha de fin no puede ser anterior a la de inicio"
    Y el botón "Guardar cambios" está desactivado

  Escenario: Un miembro que no es el creador no puede editar el viaje
    Dado que soy miembro, pero no creador, del viaje activo "Lisboa 2027"
    Cuando abro el viaje "Lisboa 2027" desde mis viajes
    Entonces no veo el botón "Editar viaje"
