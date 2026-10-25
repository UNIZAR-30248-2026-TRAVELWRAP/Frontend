# language: es
Característica: Crear un viaje y verlo en Mis viajes (RF8)
  Como usuario de TravelWrap
  Quiero crear un viaje indicando su destino
  Para poder organizar el itinerario y los gastos con mi grupo

  Antecedentes:
    Dado que existe un usuario registrado con email "daniel@travelwrap.app" y contraseña "secreta123"
    Y que el servidor guarda los viajes que creo
    Y que he iniciado sesión con el email "daniel@travelwrap.app" y la contraseña "secreta123"

  Escenario: Crear un viaje con el destino ya elegido
    Cuando creo el viaje "Escapada a París" con destino "París" y presupuesto "900"
    Entonces estoy en el inicio del viaje
    Y veo el texto "Escapada a París"
    Y veo el texto "900 €"

  Escenario: El servidor no puede crear el viaje
    Dado que el servidor no puede crear viajes
    Cuando creo el viaje "Roma 2027" con destino "Roma" y presupuesto "850"
    Entonces veo el mensaje de error "No se ha podido crear el viaje"
    Y sigo en el formulario de nuevo viaje
