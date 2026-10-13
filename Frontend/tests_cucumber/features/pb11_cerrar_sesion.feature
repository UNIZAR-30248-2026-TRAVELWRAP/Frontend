# language: es
Característica: Cerrar sesión (PB-11)
  Como usuario de TravelWrap
  Quiero cerrar mi sesión desde mi perfil, confirmándolo antes
  Para que nadie más pueda usar mi cuenta en este dispositivo

  Antecedentes:
    Dado que existe un usuario registrado con email "daniel@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "daniel@travelwrap.app" y la contraseña "secreta123"

  Escenario: Cerrar sesión tras confirmarlo
    Dado que el servidor cierra correctamente las sesiones
    Cuando abro mi perfil
    Y pulso el botón "Cerrar sesión"
    Entonces veo el diálogo de confirmación "¿Cerrar sesión?"
    Cuando confirmo en el diálogo "Cerrar sesión"
    Entonces sigo en la pantalla de inicio de sesión
    Y el servidor ha recibido 1 petición de cerrar sesión
    Y mi sesión ya no está guardada en el navegador

  Escenario: Cancelar el cierre de sesión
    Dado que el servidor cierra correctamente las sesiones
    Cuando abro mi perfil
    Y pulso el botón "Cerrar sesión"
    Y confirmo en el diálogo "Cancelar"
    Entonces ya no veo el diálogo de confirmación
    Y el servidor ha recibido 0 petición de cerrar sesión
    Y mi sesión sigue guardada en el navegador

  Escenario: Después de cerrar sesión no se puede entrar a las pantallas privadas
    Dado que el servidor cierra correctamente las sesiones
    Cuando abro mi perfil
    Y pulso el botón "Cerrar sesión"
    Y confirmo en el diálogo "Cerrar sesión"
    Entonces al abrir la pantalla de mi perfil vuelvo al inicio de sesión

  Escenario: Cerrar sesión aunque el servidor no responda
    Dado que el servidor no responde al cerrar la sesión
    Cuando abro mi perfil
    Y pulso el botón "Cerrar sesión"
    Y confirmo en el diálogo "Cerrar sesión"
    Entonces sigo en la pantalla de inicio de sesión
    Y mi sesión ya no está guardada en el navegador
