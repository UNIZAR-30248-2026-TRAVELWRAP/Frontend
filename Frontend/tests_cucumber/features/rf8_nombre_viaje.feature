# language: es
Característica: Nombre por defecto al crear un viaje (RF8)
  Como usuario de TravelWrap
  Quiero poder crear un viaje sin escribir su nombre
  Para que se llame como su destino y el año sin tener que escribirlo

  Antecedentes:
    Dado que existe un usuario registrado con email "daniel@travelwrap.app" y contraseña "secreta123"
    Y que el servidor guarda los viajes que creo
    Y que he iniciado sesión con el email "daniel@travelwrap.app" y la contraseña "secreta123"

  Escenario: Sin nombre, el viaje se llama como el destino y el año de las fechas
    Cuando abro el formulario de nuevo viaje
    Y indico el destino "Roma" con las fechas del "2027-05-12" al "2027-05-15"
    Y indico el presupuesto "850"
    Entonces el campo del nombre del viaje está vacío
    Cuando pulso el botón "Crear viaje"
    Entonces estoy en el inicio del viaje
    Y veo el texto "Roma 2027"

  Escenario: Un viaje de diciembre a enero lleva los dos años
    Cuando abro el formulario de nuevo viaje
    Y indico el destino "Praga" con las fechas del "2027-12-28" al "2028-01-03"
    Y indico el presupuesto "600"
    Y pulso el botón "Crear viaje"
    Entonces estoy en el inicio del viaje
    Y veo el texto "Praga 2027-2028"
