# language: es
Característica: Colección de sellos en Mi Perfil (PB-44)
  Como viajero
  Quiero ver en mi perfil cuántos sellos tengo y abrir mi pasaporte de viajes
  Para recordar los viajes que he terminado

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Ve cuántos sellos tiene y abre el pasaporte de viajes
    Dado que el servidor guarda mis sellos
    Y que tengo el sello "mapa" de "Roma" 2027
    Y que tengo el sello "avion" de "Lisboa" 2026
    Cuando abro mi perfil
    Entonces veo el texto "2 sellos conseguidos"
    Cuando pulso el botón "Mi colección de sellos"
    Entonces veo el texto "Pasaporte de viajes"
    Y veo el sello de "Roma 2027"
    Y veo el sello de "Lisboa 2026"
    Cuando cierro el pasaporte de viajes
    Entonces ya no veo el diálogo de confirmación

  Escenario: Si no se pueden cargar los sellos puede reintentarlo
    Dado que el servidor guarda mis sellos
    Y que el servidor no puede devolver mis sellos
    Cuando abro mi perfil
    Entonces veo el texto "No se han podido cargar los sellos"
    Y veo el botón "Reintentar"
