// Orden importante: primero se instala la API falsa y después se carga la pantalla,
// porque la pantalla pide la bandeja apenas se carga.
import './instalar-api.js';
import '../../public/app.js';
