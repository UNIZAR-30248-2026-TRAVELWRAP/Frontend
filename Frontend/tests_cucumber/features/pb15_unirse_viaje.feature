# language: es
Característica: Unirse a un viaje con enlace o QR (PB-15)
  Como persona invitada a un viaje
  Quiero unirme abriendo el enlace de invitación o escaneando su código QR
  Para ver el viaje en mi lista y organizarlo con el grupo

  # El código QR de «Invitar viajeros» contiene el mismo enlace, así que estos escenarios cubren también el QR

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"

  Escenario: Con sesión iniciada, el enlace me une al viaje y aparece en mis viajes
    Dado que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que Berta me ha invitado a su viaje activo "Lisboa 2027" con destino "Lisboa"
    Cuando abro el enlace de invitación del viaje "Lisboa 2027"
    Entonces veo el título "¡Bienvenido a Lisboa 2027!"
    Y veo el texto "Te has unido al viaje a Lisboa."
    Cuando pulso el botón "Entrar al viaje"
    Entonces veo el viaje "Lisboa 2027" entre mis viajes activos
    Y el servidor ha recibido 1 petición para unirse

  Escenario: Sin sesión, paso por el login y al terminar me uno al viaje
    Dado que Berta me ha invitado a su viaje activo "Lisboa 2027" con destino "Lisboa"
    Cuando abro el enlace de invitación del viaje "Lisboa 2027"
    Entonces sigo en la pantalla de inicio de sesión
    Y el servidor ha recibido 0 peticiones para unirse
    Cuando inicio sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Entonces veo el título "¡Bienvenido a Lisboa 2027!"
    Cuando pulso el botón "Entrar al viaje"
    Entonces veo el viaje "Lisboa 2027" entre mis viajes activos

  Escenario: Si ya era miembro, simplemente se abre el viaje
    Dado que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que ya soy miembro del viaje "Lisboa 2027" al que me invita Berta
    Cuando abro el enlace de invitación del viaje "Lisboa 2027"
    Entonces veo el título "Ya formas parte de Lisboa 2027"
    Y veo el texto "Ya eras miembro de este viaje a Lisboa."
    Cuando pulso el botón "Entrar al viaje"
    Entonces veo el viaje "Lisboa 2027" entre mis viajes activos

  Escenario: Un enlace no válido muestra un error
    Dado que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que nadie ha creado ninguna invitación con el código "codigo-inventado"
    Cuando abro el enlace de invitación con el código "codigo-inventado"
    Entonces veo el título "No has podido unirte al viaje"
    Y veo el texto "Este enlace de invitación no es válido"
    Cuando pulso el botón "Ir al inicio"
    Entonces no veo el viaje "codigo-inventado" entre mis viajes

  Escenario: El enlace de un viaje que ya ha terminado muestra un error
    Dado que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que Berta me ha invitado a su viaje "Oporto 2026", que ya ha terminado
    Cuando abro el enlace de invitación del viaje "Oporto 2026"
    Entonces veo el título "No has podido unirte al viaje"
    Y veo el texto "Este viaje ya ha terminado y no admite nuevos miembros"
    Cuando pulso el botón "Ir al inicio"
    Entonces no veo el viaje "Oporto 2026" entre mis viajes
