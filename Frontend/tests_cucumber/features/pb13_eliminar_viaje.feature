# language: es
Característica: Eliminar un viaje archivado (PB-13)
  Como creador de un viaje
  Quiero eliminar un viaje archivado, confirmándolo antes
  Para borrar todos sus datos para todos los viajeros

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que tengo el viaje archivado "París 2024"
    Y que tengo el viaje archivado "Lisboa 2023"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Eliminar un viaje tras confirmarlo
    Cuando abro mi perfil
    Y pulso el botón "Viajes archivados"
    Y pulso el botón "Eliminar París 2024"
    Entonces veo el diálogo de confirmación "¿Eliminar este viaje?"
    Cuando confirmo en el diálogo "Eliminar viaje"
    Entonces ya no veo el viaje archivado "París 2024"
    Y veo el viaje archivado "Lisboa 2023"
    Y el servidor ha eliminado el viaje "París 2024"

  Escenario: Cancelar la eliminación
    Cuando abro mi perfil
    Y pulso el botón "Viajes archivados"
    Y pulso el botón "Eliminar París 2024"
    Y confirmo en el diálogo "Cancelar"
    Entonces ya no veo el diálogo de confirmación
    Y veo el viaje archivado "París 2024"

  Escenario: El servidor no puede eliminar el viaje
    Dado que el servidor no puede eliminar viajes
    Cuando abro mi perfil
    Y pulso el botón "Viajes archivados"
    Y pulso el botón "Eliminar París 2024"
    Y confirmo en el diálogo "Eliminar viaje"
    Entonces veo el mensaje de error "No se ha podido eliminar el viaje"
    Y veo el viaje archivado "París 2024"
