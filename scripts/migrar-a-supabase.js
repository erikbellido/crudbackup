// ============================================================================
// Migración de datos al esquema nuevo (snake_case) que espera el backend.
//
//   node scripts/migrar-a-supabase.js "postgresql://usuario:password@host:5432/postgres"
//
// Qué hace:
//   1. Crea las 18 tablas nuevas en snake_case (CREATE TABLE IF NOT EXISTS,
//      NO borra ni toca las tablas antiguas en PascalCase).
//   2. Copia los datos de las tablas antiguas transformándolos al esquema
//      nuevo (Tallas/Colores se resuelven a texto, Comprobantes se integra
//      en ventas, etc.). Solo llena tablas que están vacías.
//   3. Crea las 3 tablas que no existían (compras, detalle_compras,
//      devoluciones), vacías.
//   4. Reajusta todas las secuencias (SERIAL) al máximo id migrado.
// ============================================================================
'use strict';
const { Client } = require('pg');

const cadena = process.argv[2] || process.env.DATABASE_URL;
if (!cadena) {
  console.error('Uso: node scripts/migrar-a-supabase.js "<cadena de conexión URI>"');
  process.exit(1);
}

// ── 1. DDL de las 18 tablas nuevas (no destructivo) ─────────────────────────
const DDL = `
CREATE TABLE IF NOT EXISTS roles (
    id_rol       SERIAL PRIMARY KEY,
    nombre_rol   VARCHAR(50)  NOT NULL,
    descripcion  VARCHAR(200) NULL,
    estado       BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario     SERIAL PRIMARY KEY,
    id_rol         INTEGER      NOT NULL REFERENCES roles (id_rol),
    nombre_usuario VARCHAR(50)  NOT NULL,
    clave_hash     VARCHAR(200) NOT NULL,
    correo         VARCHAR(100) NOT NULL,
    estado         BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT NOW(),
    ultimo_acceso  TIMESTAMP    NULL
);
CREATE TABLE IF NOT EXISTS empleados (
    id_empleado    SERIAL PRIMARY KEY,
    id_usuario     INTEGER      NULL REFERENCES usuarios (id_usuario),
    nombres        VARCHAR(50)  NOT NULL,
    apellidos      VARCHAR(50)  NOT NULL,
    dni            VARCHAR(8)   NOT NULL,
    telefono       VARCHAR(15)  NULL,
    cargo          VARCHAR(50)  NOT NULL,
    fecha_contrato TIMESTAMP    NOT NULL DEFAULT NOW(),
    estado         BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS clientes (
    id_cliente       SERIAL PRIMARY KEY,
    tipo_documento   VARCHAR(10)  NOT NULL DEFAULT 'DNI',
    numero_documento VARCHAR(15)  NOT NULL,
    nombres          VARCHAR(50)  NOT NULL,
    apellidos        VARCHAR(50)  NULL,
    telefono         VARCHAR(15)  NULL,
    correo           VARCHAR(100) NULL,
    direccion        VARCHAR(200) NULL,
    fecha_registro   TIMESTAMP    NOT NULL DEFAULT NOW(),
    estado           BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS categorias (
    id_categoria     SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(50)  NOT NULL,
    descripcion      VARCHAR(200) NULL,
    estado           BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS marcas (
    id_marca     SERIAL PRIMARY KEY,
    nombre_marca VARCHAR(50) NOT NULL,
    estado       BOOLEAN     NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor SERIAL PRIMARY KEY,
    razon_social VARCHAR(100) NOT NULL,
    ruc          VARCHAR(11)  NOT NULL,
    telefono     VARCHAR(15)  NULL,
    correo       VARCHAR(100) NULL,
    direccion    VARCHAR(200) NULL,
    estado       BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS productos (
    id_producto     SERIAL PRIMARY KEY,
    id_categoria    INTEGER       NOT NULL REFERENCES categorias (id_categoria),
    id_marca        INTEGER       NOT NULL REFERENCES marcas (id_marca),
    codigo_producto VARCHAR(20)   NOT NULL,
    nombre_producto VARCHAR(100)  NOT NULL,
    descripcion     VARCHAR(300)  NULL,
    precio_compra   NUMERIC(12,2) NOT NULL DEFAULT 0,
    precio_venta    NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado          BOOLEAN       NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS producto_variantes (
    id_variante SERIAL PRIMARY KEY,
    id_producto INTEGER     NOT NULL REFERENCES productos (id_producto),
    talla       VARCHAR(10) NOT NULL,
    color       VARCHAR(30) NOT NULL,
    sku         VARCHAR(30) NOT NULL,
    estado      BOOLEAN     NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS almacenes (
    id_almacen     SERIAL PRIMARY KEY,
    nombre_almacen VARCHAR(50)  NOT NULL,
    direccion      VARCHAR(200) NULL,
    estado         BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS inventario (
    id_inventario     SERIAL PRIMARY KEY,
    id_variante       INTEGER   NOT NULL REFERENCES producto_variantes (id_variante),
    id_almacen        INTEGER   NOT NULL REFERENCES almacenes (id_almacen),
    stock             INTEGER   NOT NULL DEFAULT 0,
    stock_minimo      INTEGER   NOT NULL DEFAULT 5,
    fecha_actualizado TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS compras (
    id_compra      SERIAL PRIMARY KEY,
    id_proveedor   INTEGER       NOT NULL REFERENCES proveedores (id_proveedor),
    id_empleado    INTEGER       NOT NULL REFERENCES empleados (id_empleado),
    fecha_compra   TIMESTAMP     NOT NULL DEFAULT NOW(),
    numero_factura VARCHAR(20)   NOT NULL,
    total          NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado         VARCHAR(20)   NOT NULL DEFAULT 'REGISTRADA'
);
CREATE TABLE IF NOT EXISTS detalle_compras (
    id_detalle_compra SERIAL PRIMARY KEY,
    id_compra         INTEGER       NOT NULL REFERENCES compras (id_compra),
    id_variante       INTEGER       NOT NULL REFERENCES producto_variantes (id_variante),
    cantidad          INTEGER       NOT NULL,
    precio_unitario   NUMERIC(12,2) NOT NULL,
    subtotal          NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);
CREATE TABLE IF NOT EXISTS ventas (
    id_venta           SERIAL PRIMARY KEY,
    id_cliente         INTEGER       NOT NULL REFERENCES clientes (id_cliente),
    id_empleado        INTEGER       NOT NULL REFERENCES empleados (id_empleado),
    id_almacen         INTEGER       NOT NULL REFERENCES almacenes (id_almacen),
    fecha_venta        TIMESTAMP     NOT NULL DEFAULT NOW(),
    tipo_comprobante   VARCHAR(10)   NOT NULL DEFAULT 'BOLETA',
    serie              VARCHAR(5)    NULL,
    numero_correlativo VARCHAR(10)   NULL,
    total              NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado             VARCHAR(20)   NOT NULL DEFAULT 'COMPLETADA'
);
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id_detalle_venta SERIAL PRIMARY KEY,
    id_venta         INTEGER       NOT NULL REFERENCES ventas (id_venta),
    id_variante      INTEGER       NOT NULL REFERENCES producto_variantes (id_variante),
    cantidad         INTEGER       NOT NULL,
    precio_unitario  NUMERIC(12,2) NOT NULL,
    descuento        NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal         NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario - descuento) STORED
);
CREATE TABLE IF NOT EXISTS metodos_pago (
    id_metodo_pago SERIAL PRIMARY KEY,
    nombre_metodo  VARCHAR(50) NOT NULL,
    estado         BOOLEAN     NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS pagos (
    id_pago        SERIAL PRIMARY KEY,
    id_venta       INTEGER       NOT NULL REFERENCES ventas (id_venta),
    id_metodo_pago INTEGER       NOT NULL REFERENCES metodos_pago (id_metodo_pago),
    monto          NUMERIC(12,2) NOT NULL,
    fecha_pago     TIMESTAMP     NOT NULL DEFAULT NOW(),
    referencia     VARCHAR(50)   NULL
);
CREATE TABLE IF NOT EXISTS devoluciones (
    id_devolucion     SERIAL PRIMARY KEY,
    id_detalle_venta  INTEGER      NOT NULL REFERENCES detalle_ventas (id_detalle_venta),
    motivo            VARCHAR(200) NOT NULL,
    cantidad_devuelta INTEGER      NOT NULL,
    fecha_devolucion  TIMESTAMP    NOT NULL DEFAULT NOW(),
    estado            VARCHAR(20)  NOT NULL DEFAULT 'PROCESADA'
);
`;

// ── 2. Copia de datos (esquema viejo PascalCase → nuevo snake_case) ─────────
const MIGRACIONES = [
  ['roles', `INSERT INTO roles (id_rol, nombre_rol, descripcion, estado)
             SELECT "IdRol","NombreRol","Descripcion","Estado" FROM public."Roles"`],
  ['usuarios', `INSERT INTO usuarios (id_usuario, id_rol, nombre_usuario, clave_hash, correo, estado, fecha_creacion, ultimo_acceso)
                SELECT "IdUsuario","IdRol","NombreUsuario","ClaveHash","Correo","Estado","FechaCreacion","UltimoAcceso" FROM public."Usuarios"`],
  ['empleados', `INSERT INTO empleados (id_empleado, id_usuario, nombres, apellidos, dni, telefono, cargo, fecha_contrato, estado)
                 SELECT "IdEmpleado","IdUsuario","Nombres","Apellidos","DNI","Telefono","Cargo","FechaIngreso"::timestamp,"Estado" FROM public."Empleados"`],
  ['clientes', `INSERT INTO clientes (id_cliente, tipo_documento, numero_documento, nombres, apellidos, telefono, correo, direccion, fecha_registro, estado)
                SELECT "IdCliente","TipoDocumento","NumeroDocumento","Nombres","Apellidos","Telefono","Correo","Direccion","FechaRegistro","Estado" FROM public."Clientes"`],
  ['categorias', `INSERT INTO categorias (id_categoria, nombre_categoria, descripcion, estado)
                  SELECT "IdCategoria","NombreCategoria","Descripcion","Estado" FROM public."Categorias"`],
  ['marcas', `INSERT INTO marcas (id_marca, nombre_marca, estado)
              SELECT "IdMarca","NombreMarca","Estado" FROM public."Marcas"`],
  ['proveedores', `INSERT INTO proveedores (id_proveedor, razon_social, ruc, telefono, correo, direccion, estado)
                   SELECT "IdProveedor","RazonSocial","RUC","Telefono","Correo","Direccion","Estado" FROM public."Proveedores"`],
  ['productos', `INSERT INTO productos (id_producto, id_categoria, id_marca, codigo_producto, nombre_producto, descripcion, precio_compra, precio_venta, estado)
                 SELECT "IdProducto","IdCategoria","IdMarca","CodigoProducto","NombreProducto","Descripcion","PrecioCompra","PrecioVenta","Estado" FROM public."Productos"`],
  ['producto_variantes', `INSERT INTO producto_variantes (id_variante, id_producto, talla, color, sku, estado)
                          SELECT v."IdVariante", v."IdProducto",
                                 COALESCE(t."NumeroTalla", '?'), COALESCE(c."NombreColor", '?'),
                                 v."SKU", v."Estado"
                          FROM public."ProductoVariantes" v
                          LEFT JOIN public."Tallas"  t ON t."IdTalla"  = v."IdTalla"
                          LEFT JOIN public."Colores" c ON c."IdColor" = v."IdColor"`],
  ['almacenes', `INSERT INTO almacenes (id_almacen, nombre_almacen, direccion, estado)
                 SELECT "IdAlmacen","NombreAlmacen","Ubicacion","Estado" FROM public."Almacenes"`],
  ['inventario', `INSERT INTO inventario (id_inventario, id_variante, id_almacen, stock, stock_minimo, fecha_actualizado)
                  SELECT "IdInventario","IdVariante","IdAlmacen","Stock","StockMinimo","FechaActualizacion" FROM public."Inventario"`],
  ['ventas', `INSERT INTO ventas (id_venta, id_cliente, id_empleado, id_almacen, fecha_venta, tipo_comprobante, serie, numero_correlativo, total, estado)
              SELECT v."IdVenta", v."IdCliente", v."IdEmpleado", 1, v."FechaVenta",
                     COALESCE(cb."TipoComprobante", 'BOLETA'), cb."Serie", cb."Numero", v."Total", v."Estado"
              FROM public."Ventas" v
              LEFT JOIN public."Comprobantes" cb ON cb."IdComprobante" = v."IdComprobante"`],
  ['detalle_ventas', `INSERT INTO detalle_ventas (id_detalle_venta, id_venta, id_variante, cantidad, precio_unitario, descuento)
                      SELECT "IdDetalleVenta","IdVenta","IdVariante","Cantidad","PrecioUnitario",0 FROM public."DetalleVenta"`],
  ['metodos_pago', `INSERT INTO metodos_pago (id_metodo_pago, nombre_metodo, estado)
                    SELECT "IdMetodoPago","NombreMetodo","Estado" FROM public."MetodosPago"`],
  ['pagos', `INSERT INTO pagos (id_pago, id_venta, id_metodo_pago, monto, fecha_pago, referencia)
             SELECT "IdPago","IdVenta","IdMetodoPago","Monto","FechaPago","Referencia" FROM public."Pagos"`],
];

// ── 3. Secuencias a reajustar ────────────────────────────────────────────────
const SECUENCIAS = [
  ['roles', 'id_rol'], ['usuarios', 'id_usuario'], ['empleados', 'id_empleado'],
  ['clientes', 'id_cliente'], ['categorias', 'id_categoria'], ['marcas', 'id_marca'],
  ['proveedores', 'id_proveedor'], ['productos', 'id_producto'],
  ['producto_variantes', 'id_variante'], ['almacenes', 'id_almacen'],
  ['inventario', 'id_inventario'], ['compras', 'id_compra'],
  ['detalle_compras', 'id_detalle_compra'], ['ventas', 'id_venta'],
  ['detalle_ventas', 'id_detalle_venta'], ['metodos_pago', 'id_metodo_pago'],
  ['pagos', 'id_pago'], ['devoluciones', 'id_devolucion'],
];

(async () => {
  const u = new URL(cadena);
  const c = new Client({
    host: u.hostname,
    port: +u.port || 5432,
    database: u.pathname.slice(1),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  console.log('Conectado a', u.hostname + '/' + u.pathname.slice(1));

  console.log('\n— Creando tablas nuevas (si no existen) —');
  await c.query(DDL);
  console.log('OK: 18 tablas listas');

  console.log('\n— Copiando datos del esquema antiguo —');
  for (const [tabla, sql] of MIGRACIONES) {
    const { rows } = await c.query(`SELECT COUNT(*)::int AS n FROM ${tabla}`);
    if (rows[0].n > 0) {
      console.log(`  ${tabla}: ya tiene ${rows[0].n} filas, se omite`);
      continue;
    }
    try {
      const r = await c.query(sql);
      console.log(`  ${tabla}: ${r.rowCount} filas migradas`);
    } catch (e) {
      console.error(`  ${tabla}: ERROR — ${e.message.split('\n')[0]}`);
    }
  }
  console.log('  compras, detalle_compras, devoluciones: creadas vacías (no existían en el esquema antiguo)');

  console.log('\n— Reajustando secuencias —');
  for (const [tabla, col] of SECUENCIAS) {
    await c.query(
      `SELECT setval(pg_get_serial_sequence('${tabla}', '${col}'),
              COALESCE((SELECT MAX(${col}) FROM ${tabla}), 0) + 1, false)`
    );
  }
  console.log('OK: 18 secuencias');

  console.log('\n— Resumen final —');
  let total = 0;
  for (const [tabla] of SECUENCIAS) {
    const { rows } = await c.query(`SELECT COUNT(*)::int AS n FROM ${tabla}`);
    total += rows[0].n;
    console.log(`  ${tabla.padEnd(20)} ${rows[0].n}`);
  }
  console.log(`\nTOTAL: ${total} filas en el esquema nuevo`);
  await c.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
