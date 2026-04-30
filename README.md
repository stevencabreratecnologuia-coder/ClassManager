# ClassManager

Aplicacion Node/Express con frontend estatico y MongoDB Atlas.

## Despliegue en Render

1. Sube este repositorio a GitHub.
2. En Render crea un **Web Service** desde el repositorio.
3. Usa estos comandos:
   - Build Command: `npm ci`
   - Start Command: `npm start`
4. Configura las variables de entorno:
   - `MONGO_URI`: conexion de MongoDB Atlas.
   - `JWT_SECRET`: secreto largo para firmar tokens.
   - `ADMIN_NAME`: nombre visible del administrador.
   - `ADMIN_EMAIL`: correo con el que vas a iniciar sesion como admin.
   - `ADMIN_PASSWORD`: contrasena del administrador.
   - `OPENAI_API_KEY`: opcional, solo si vas a usar IA.
   - `OPENAI_MODEL`: opcional, por defecto `gpt-4o-mini`.

Al arrancar, el servidor crea o actualiza automaticamente la cuenta admin con
`ADMIN_EMAIL` y `ADMIN_PASSWORD`. Si cambias esas variables en Render y reinicias
el servicio, la cuenta admin queda sincronizada.

## Local

```bash
npm install
npm start
```

Para crear o sincronizar el admin manualmente:

```bash
npm run seed:admin
```
