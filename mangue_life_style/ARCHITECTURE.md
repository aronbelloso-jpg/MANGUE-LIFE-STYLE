# Mangue Life Style — arquitectura

Cliente → Tienda web → API segura → Base de datos → Panel de administración

## Backend
- Node.js + Express
- SQLite para desarrollo / pequeña instalación
- JWT para sesiones de administración
- bcrypt para contraseñas
- CORS configurable

## Datos
- admins
- products
- orders
- order_items

## Producción
Para una tienda real, recomiendo PostgreSQL gestionado en lugar de SQLite y almacenamiento de imágenes en un servicio de objetos. Las claves deben existir como variables de entorno del servidor, nunca dentro del HTML/JS.

## Importante
El archivo `.env.example` NO contiene credenciales reales. Antes de publicar:
1. crear `.env`
2. definir `JWT_SECRET` largo y aleatorio
3. definir `ADMIN_USER`
4. definir `ADMIN_PASSWORD`
5. configurar `CORS_ORIGIN` con el dominio real de la tienda
6. usar HTTPS
