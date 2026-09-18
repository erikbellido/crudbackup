# Zapatería Joselito — CRUD simple (.NET 8 + React + PostgreSQL)

CRUD genérico que se conecta a la base de datos PostgreSQL `zapateria_joselito`
(script incluido: `ZapateriaJoselito_BD_postgres.sql`) y muestra/edita los datos de
las 18 tablas sin escribir un controlador por cada una: un solo endpoint genérico
(`CrudEndpointExtensions.cs`) sirve listar, crear, editar y eliminar para cualquier
tabla, y el frontend arma la tabla y el formulario automáticamente leyendo la
metadata de cada entidad.

## 1. Base de datos (PostgreSQL)

### Opción A — Docker (recomendada)

Desde la raíz del proyecto:

```bash
docker compose up -d
```

Esto levanta PostgreSQL 16 en el puerto `5432` y ejecuta automáticamente
`ZapateriaJoselito_BD_postgres.sql` (crea las 18 tablas y los datos de prueba).

### Opción B — Instalación manual

1. Crea el usuario y la base de datos:

   ```sql
   CREATE USER joselito WITH PASSWORD 'joselito123';
   CREATE DATABASE zapateria_joselito OWNER joselito;
   ```

2. Ejecuta el script conectado a esa base:

   ```bash
   psql -U joselito -d zapateria_joselito -f ZapateriaJoselito_BD_postgres.sql
   ```

> **Nota:** las tablas y columnas usan `snake_case` (`id_producto`,
> `precio_unitario`, ...) porque el backend aplica
> `UseSnakeCaseNamingConvention()` de EF Core.

### Opción C — Supabase (u otro Postgres gestionado)

El backend acepta la cadena en dos formatos, en la variable de entorno
`ConnectionStrings__Default` (Render) o `DATABASE_URL`:

1. Formato Npgsql — copia la pestaña **.NET** del panel de Supabase
   (Connect → Connection string):

   ```
   Host=aws-0-xx-xxxx.pooler.supabase.com;Database=postgres;Username=postgres.TUPROYECTO;Password=TU_PASSWORD
   ```

2. Formato URI (el backend lo convierte automáticamente y fuerza SSL):

   ```
   postgresql://postgres.TUPROYECTO:TU_PASSWORD@aws-0-xx-xxxx.pooler.supabase.com:5432/postgres
   ```

> Usa el host del **pooler** de Supabase (puerto 5432 sesión / 6543
> transacciones); la conexión directa al puerto 5432 del host principal
> requiere IPv6. Al usar URI se aplica `SslMode=Require` automáticamente.

## 2. Backend (`/backend`, .NET 8 Web API)

```bash
cd backend
dotnet restore
dotnet run
```

- Antes de correrlo, ajusta la cadena de conexión en `appsettings.json`
  (`ConnectionStrings:Default`) con tu host/usuario/contraseña de PostgreSQL.
- Al iniciar, Swagger queda disponible en `https://localhost:7000/swagger`
  (el puerto exacto lo indica la consola).
- Endpoints disponibles por cada tabla, por ejemplo para `productos`:
  - `GET /api/productos` — listar
  - `GET /api/productos/{id}` — obtener uno
  - `GET /api/productos/_meta` — columnas (usado por el frontend)
  - `POST /api/productos` — crear
  - `PUT /api/productos/{id}` — actualizar
  - `DELETE /api/productos/{id}` — eliminar
  - `GET /api/entities` — lista de todas las tablas disponibles (para el menú)

## 3. Frontend (`/frontend`, React + Vite)

```bash
cd frontend
npm install
npm run dev
```

- Ajusta `VITE_API_URL` en `frontend/.env` para que apunte a la URL real del
  backend (la que muestra la consola de `dotnet run`).
- Abre `http://localhost:5173`. El menú lateral lista las 18 tablas; al elegir
  una se muestra la tabla con los datos reales y los botones Nuevo / Editar /
  Eliminar.

## Notas

- No se modelaron relaciones de navegación en Entity Framework (a propósito,
  para mantenerlo simple): los campos `Id...` de cada tabla se editan como
  números sueltos, no como selects con nombres. Es fácil de mejorar tabla por
  tabla más adelante si se necesita.
- Las columnas `Subtotal` (en `DetalleCompras` y `DetalleVentas`) son columnas
  generadas (`GENERATED ALWAYS AS ... STORED`, soportado desde PostgreSQL 12);
  el formulario no las muestra porque las genera la base de datos.
- Los backups automáticos corren en GitHub Actions: `pg_dump` 17 de Supabase
  y subida a **Google Drive** vía rclone (carpetas `cada-5min`, `por-hora` y
  `diario`). Requiere los secrets `DATABASE_URL`, `GDRIVE_CLIENT_ID`,
  `GDRIVE_CLIENT_SECRET` y `GDRIVE_TOKEN`. Guía completa de configuración y
  restauración: [`docs/BACKUPS.md`](docs/BACKUPS.md).
