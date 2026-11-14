# language: es
Característica: Eliminar un viaje archivado (PB-13 y MEJ-12)
  Como viajero, sea o no el creador
  Quiero eliminar para mí un viaje archivado, confirmándolo antes
  Para que deje de aparecer en mi cuenta sin que cambie lo que ven los demás viajeros

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que tengo el viaje archivado "París 2024"
    Y que tengo el viaje archivado "Lisboa 2023"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Eliminar un viaje tras confirmarlo
    Cuando abro mi perfil
    Y pulso el botón "Viajes archivados"
    Y pulso el botón "Eliminar París 2024"
    Entonces veo el diálogo de confirmación "¿Eliminar este viaje para ti?"
    Cuando confirmo en el diálogo "Eliminar viaje"
    Entonces ya no veo el viaje archivado "París 2024"
    Y veo el viaje archivado "Lisboa 2023"
    Y el servidor ha eliminado el viaje "París 2024"

  Escenario: Un miembro que no es el creador también puede eliminar el viaje para sí mismo
    Dado que soy miembro, pero no creador, del viaje archivado "Oporto 2022"
    Cuando abro mi perfil
    Y pulso el botón "Viajes archivados"
    Y pulso el botón "Eliminar Oporto 2022"
    Y confirmo en el diálogo "Eliminar viaje"
    Entonces ya no veo el viaje archivado "Oporto 2022"
    Y el servidor ha eliminado el viaje "Oporto 2022"

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
