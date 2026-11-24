# language: es
Característica: Eliminar la cuenta (PB-47)
  Como usuario de TravelWrap
  Quiero eliminar mi cuenta desde mi perfil, confirmándolo antes
  Para que mis datos personales dejen de estar disponibles

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Eliminar la cuenta tras confirmarlo
    Dado que el servidor elimina correctamente las cuentas
    Cuando abro mi perfil
    Y pulso el botón "Eliminar cuenta"
    Entonces veo el diálogo de confirmación "¿Eliminar tu cuenta?"
    Y veo el texto "Esta acción no se puede deshacer."
    Cuando confirmo en el diálogo "Eliminar cuenta"
    Entonces sigo en la pantalla de inicio de sesión
    Y el servidor ha recibido 1 petición de eliminar la cuenta
    Y mi sesión ya no está guardada en el navegador

  Escenario: Si no se puede eliminar, se muestra el error y la cuenta sigue como estaba
    Dado que el servidor no puede eliminar las cuentas
    Cuando abro mi perfil
    Y pulso el botón "Eliminar cuenta"
    Y confirmo en el diálogo "Eliminar cuenta"
    Entonces veo un error que contiene "No se ha podido eliminar la cuenta"
    Y mi sesión sigue guardada en el navegador
