# Cómo ponerlo en uso

Esta entrega deja preparado el circuito de Tienda → Servidor → Base de datos → Panel.

## En tu ordenador
1. Instala Node.js LTS.
2. Abre una terminal dentro de `server`.
3. Ejecuta `npm install`.
4. Copia `.env.example` a `.env`.
5. Cambia `JWT_SECRET`, `ADMIN_USER` y `ADMIN_PASSWORD`.
6. Ejecuta `npm start`.
7. Comprueba `http://localhost:3000/api/health`.

## Producción
Necesitamos desplegar el backend en un servidor con variables de entorno y base de datos persistente. No se debe usar la contraseña de ejemplo en producción.

## Próximo paso
Conectar `script.js` y `admin.html` a `/api/products`, `/api/auth/login` y `/api/orders` y después desplegar frontend y backend.
