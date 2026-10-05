import { io } from 'socket.io-client';

// Conectarse específicamente al namespace de chat
const chatSocket = io('http://localhost:3000/chat');

// Escuchar mensajes nuevos
chatSocket.on('nuevo_mensaje', (mensaje) => {
  console.log('He recibido un mensaje:', mensaje);
});

// Enviar un mensaje
const enviarMensaje = (texto: string) => {
  chatSocket.emit('enviar_mensaje', { texto: texto, usuario: 'Berta' });
};