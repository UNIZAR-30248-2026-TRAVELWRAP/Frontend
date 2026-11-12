# language: es
Característica: Desarchivar un viaje (PB-51)
  Como creador de un viaje archivado
  Quiero desarchivarlo, confirmándolo antes
  Para recuperarlo como viaje activo y poder editarlo de nuevo

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"

  Escenario: Desarchivar un viaje tras confirmarlo
    Dado que tengo el viaje archivado "París 2024"
    Y que tengo el viaje archivado "Lisboa 2023"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Cuando abro mi perfil
    Y pulso el botón "Viajes archivados"
    Y pulso el botón "Desarchivar París 2024"
    Entonces veo el diálogo de confirmación "¿Desarchivar este viaje?"
    Cuando confirmo en el diálogo "Desarchivar viaje"
    Entonces estoy en la pantalla de viajes archivados
    Y ya no veo el viaje archivado "París 2024"
    Y veo el viaje archivado "Lisboa 2023"
    Y el servidor ha desarchivado 1 viaje

  Escenario: El viaje desarchivado vuelve a Mis viajes y se puede editar
    Dado que tengo el viaje archivado "París 2024"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Cuando abro mi perfil
    Y pulso el botón "Viajes archivados"
    Y pulso el botón "Desarchivar París 2024"
    Y confirmo en el diálogo "Desarchivar viaje"
    Y abro mis viajes
    Entonces veo el viaje activo "París 2024" en mis viajes
    Cuando abro el inicio del viaje "París 2024"
    Entonces veo el botón "Editar viaje"

  Escenario: Cancelar el desarchivado
    Dado que tengo el viaje archivado "París 2024"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Cuando abro mi perfil
    Y pulso el botón "Viajes archivados"
    Y pulso el botón "Desarchivar París 2024"
    Y confirmo en el diálogo "Cancelar"
    Entonces ya no veo el diálogo de confirmación
    Y veo el viaje archivado "París 2024"
    Y el servidor ha desarchivado 0 viaje

  Escenario: Un miembro que no es el creador no ve el botón
    Dado que soy miembro, pero no creador, del viaje archivado "Lisboa 2023"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Cuando abro mi perfil
    Y pulso el botón "Viajes archivados"
    Entonces veo el viaje archivado "Lisboa 2023"
    Y no veo el botón "Desarchivar Lisboa 2023"

  Escenario: El servidor no puede desarchivar el viaje
    Dado que tengo el viaje archivado "París 2024"
    Y que el servidor no puede desarchivar viajes
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Cuando abro mi perfil
    Y pulso el botón "Viajes archivados"
    Y pulso el botón "Desarchivar París 2024"
    Y confirmo en el diálogo "Desarchivar viaje"
    Entonces veo el mensaje de error "No se ha podido desarchivar el viaje"
    Y veo el viaje archivado "París 2024"
