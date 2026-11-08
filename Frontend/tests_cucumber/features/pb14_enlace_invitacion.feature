# language: es
Característica: Generar el enlace de invitación (PB-14)
  Como miembro de un viaje
  Quiero obtener el enlace de invitación del viaje
  Para que el resto del grupo se una con él o con su código QR

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que estoy en el viaje en curso "Roma 2027" con destino "Roma"

  Escenario: Al pulsar «Invitar» se ve el enlace del viaje
    Cuando abro la invitación del viaje "Roma 2027" desde su inicio
    Entonces veo el texto "Invitar Viajeros"
    Y veo el enlace de invitación del viaje "Roma 2027"

  Escenario: El enlace se copia al portapapeles y el botón lo confirma
    Dado que el navegador me deja usar el portapapeles
    Cuando abro la invitación del viaje "Roma 2027" desde su inicio
    Y pulso el botón "Copiar enlace"
    Entonces el enlace de invitación del viaje "Roma 2027" está en el portapapeles
    Y el botón confirma que el enlace se ha copiado

  Escenario: El enlace también se muestra como código QR, que se puede ampliar
    Cuando abro la invitación del viaje "Roma 2027" desde su inicio
    Y amplío el código QR
    Entonces veo el código QR ampliado del viaje

  Escenario: Cada viaje tiene su propio enlace de invitación
    Dado que estoy en el viaje en curso "Lisboa 2027" con destino "Lisboa"
    Cuando abro la invitación del viaje "Lisboa 2027" desde su inicio
    Entonces veo el enlace de invitación del viaje "Lisboa 2027"
    Cuando abro la invitación del viaje "Roma 2027" desde su inicio
    Entonces veo el enlace de invitación del viaje "Roma 2027"
