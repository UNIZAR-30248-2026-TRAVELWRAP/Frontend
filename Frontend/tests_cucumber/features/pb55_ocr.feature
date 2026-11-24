# language: es
Característica: Escanear documentos con OCR (PB-55)
  Como miembro de un viaje
  Quiero escanear un ticket, una reserva o cualquier documento desde la cartera
  Para registrarlo sin escribir los datos a mano

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que soy miembro, pero no creador, del viaje activo "Roma 2027"

  Escenario: Un ticket abre el gasto con los datos leídos para revisarlos
    Dado que el escáner lee un ticket con el concepto "RESTAURANTE EL FARO" y el importe "11,5"
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y escaneo una foto con el botón «Escanear con OCR»
    Entonces estoy en la pantalla para añadir un gasto
    Y veo en el formulario el importe "11,5" y el concepto "RESTAURANTE EL FARO"

  Escenario: Cualquier otro documento se guarda como resumen en la cartera
    Dado que el escáner no reconoce el tipo del documento y lee el texto "Póliza de seguro"
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y escaneo una foto con el botón «Escanear con OCR»
    Entonces se ha guardado el resumen "Póliza de seguro" en la cartera
