# language: es
Característica: Nombre sugerido al crear un viaje (RF8)
  Como usuario de TravelWrap
  Quiero que el nombre del viaje se rellene con el destino y el año
  Para no tener que escribirlo cada vez

  Antecedentes:
    Dado que existe un usuario registrado con email "daniel@travelwrap.app" y contraseña "secreta123"
    Y que el servidor guarda los viajes que creo
    Y que he iniciado sesión con el email "daniel@travelwrap.app" y la contraseña "secreta123"

  Escenario: El nombre se rellena con el destino y el año de las fechas
    Cuando abro el formulario de nuevo viaje
    Y indico el destino "Roma" con las fechas del "2027-05-12" al "2027-05-15"
    Entonces el nombre del viaje es "Roma 2027"

  Escenario: Un viaje de diciembre a enero lleva los dos años
    Cuando abro el formulario de nuevo viaje
    Y indico el destino "Praga" con las fechas del "2027-12-28" al "2028-01-03"
    Entonces el nombre del viaje es "Praga 2027-2028"

  Escenario: Un viaje creado con el nombre sugerido aparece en Mis viajes
    Cuando abro el formulario de nuevo viaje
    Y indico el destino "Roma" con las fechas del "2027-05-12" al "2027-05-15"
    Y indico el presupuesto "850"
    Y pulso el botón "Crear viaje"
    Entonces vuelvo a la pantalla de mis viajes
    Y veo el viaje "Roma 2027" en curso con presupuesto "850 €"
