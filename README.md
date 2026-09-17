# Zapatería Joselito — CRUD simple (.NET 8 + React)

CRUD genérico que se conecta a la base de datos `ZapateriaJoselitoDB` (script incluido:
`ZapateriaJoselito_BD.sql`) y muestra/edita los datos de las 18 tablas sin escribir
un controlador por cada una: un solo endpoint genérico (`CrudEndpointExtensions.cs`)
sirve listar, crear, editar y eliminar para cualquier tabla, y el frontend arma la
tabla y el formulario automáticamente leyendo la metadata de cada entidad.

## 1. Base de datos

1. Abre SQL Server Management Studio (o Azure Data Studio).
2. Ejecuta `ZapateriaJoselito_BD.sql`. Esto crea la base `ZapateriaJoselitoDB`, las
   18 tablas y los datos de prueba.

## 2. Backend (`/backend`, .NET 8 Web API)

```bash
cd backend
dotnet restore
dotnet run
```

- Antes de correrlo, ajusta la cadena de conexión en `appsettings.json`
  (`ConnectionStrings:Default`) con tu servidor/usuario de SQL Server.
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
  calculadas por SQL Server; el formulario no las muestra porque las genera la
  base de datos.
