# Historias de usuario en formato Gherkin

# language: es
Característica: Gestión de viajes (RF8)
  Como usuario de TravelWrap
  Quiero crear un nuevo viaje
  Para poder organizar el itinerario y los gastos con mi grupo

  Escenario: Crear un viaje correctamente
    Dado que el usuario accede a la pantalla principal de TravelWrap
    Cuando rellena el formulario con título "Escapada a París" y destino "Francia"
    Y pulsa el botón "Crear viaje"
    Entonces el viaje "Escapada a París" debe aparecer en la lista de viajes activos