-- ============================================================================
-- Zapatería Joselito — Script de base de datos para PostgreSQL
-- ----------------------------------------------------------------------------
-- Crea las 18 tablas (con claves foráneas y columnas calculadas) y carga
-- datos de prueba.
--
-- Los nombres de tablas y columnas están en snake_case (roles, id_producto,
-- precio_unitario, ...) porque el backend aplica UseSnakeCaseNamingConvention()
-- de EFCore.NamingConventions.
--
-- CÓMO USARLO:
--   Opción manual:
--     1. Crea el usuario y la base (si no existen):
--          CREATE USER joselito WITH PASSWORD 'joselito123';
--          CREATE DATABASE zapateria_joselito OWNER joselito;
--     2. Ejecuta este script conectado a esa base:
--          psql -U joselito -d zapateria_joselito -f ZapateriaJoselito_BD_postgres.sql
--
--   Opción con Docker (recomendada):
--     docker compose up -d   (desde la raíz del proyecto)
--     El docker-compose monta este script en /docker-entrypoint-initdb.d y lo
--     ejecuta automáticamente la primera vez que se crea el contenedor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Limpieza (permite re-ejecutar el script)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS devoluciones CASCADE;
DROP TABLE IF EXISTS pagos CASCADE;
DROP TABLE IF EXISTS metodos_pago CASCADE;
DROP TABLE IF EXISTS detalle_ventas CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS detalle_compras CASCADE;
DROP TABLE IF EXISTS compras CASCADE;
DROP TABLE IF EXISTS inventario CASCADE;
DROP TABLE IF EXISTS almacenes CASCADE;
DROP TABLE IF EXISTS producto_variantes CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS marcas CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS empleados CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ----------------------------------------------------------------------------
-- 1) roles
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
    id_rol       SERIAL PRIMARY KEY,
    nombre_rol   VARCHAR(50)  NOT NULL,
    descripcion  VARCHAR(200) NULL,
    estado       BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 2) usuarios
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
    id_usuario     SERIAL PRIMARY KEY,
    id_rol         INTEGER      NOT NULL REFERENCES roles (id_rol),
    nombre_usuario VARCHAR(50)  NOT NULL,
    clave_hash     VARCHAR(200) NOT NULL,
    correo         VARCHAR(100) NOT NULL,
    estado         BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT NOW(),
    ultimo_acceso  TIMESTAMP    NULL
);

-- ----------------------------------------------------------------------------
-- 3) empleados
-- ----------------------------------------------------------------------------
CREATE TABLE empleados (
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

-- ----------------------------------------------------------------------------
-- 4) clientes
-- ----------------------------------------------------------------------------
CREATE TABLE clientes (
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

-- ----------------------------------------------------------------------------
-- 5) categorias
-- ----------------------------------------------------------------------------
CREATE TABLE categorias (
    id_categoria     SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(50)  NOT NULL,
    descripcion      VARCHAR(200) NULL,
    estado           BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 6) marcas
-- ----------------------------------------------------------------------------
CREATE TABLE marcas (
    id_marca     SERIAL PRIMARY KEY,
    nombre_marca VARCHAR(50) NOT NULL,
    estado       BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 7) proveedores
-- ----------------------------------------------------------------------------
CREATE TABLE proveedores (
    id_proveedor SERIAL PRIMARY KEY,
    razon_social VARCHAR(100) NOT NULL,
    ruc          VARCHAR(11)  NOT NULL,
    telefono     VARCHAR(15)  NULL,
    correo       VARCHAR(100) NULL,
    direccion    VARCHAR(200) NULL,
    estado       BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 8) productos
-- ----------------------------------------------------------------------------
CREATE TABLE productos (
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

-- ----------------------------------------------------------------------------
-- 9) producto_variantes
-- ----------------------------------------------------------------------------
CREATE TABLE producto_variantes (
    id_variante SERIAL PRIMARY KEY,
    id_producto INTEGER     NOT NULL REFERENCES productos (id_producto),
    talla       VARCHAR(10) NOT NULL,
    color       VARCHAR(30) NOT NULL,
    sku         VARCHAR(30) NOT NULL,
    estado      BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 10) almacenes
-- ----------------------------------------------------------------------------
CREATE TABLE almacenes (
    id_almacen     SERIAL PRIMARY KEY,
    nombre_almacen VARCHAR(50)  NOT NULL,
    direccion      VARCHAR(200) NULL,
    estado         BOOLEAN      NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 11) inventario
-- ----------------------------------------------------------------------------
CREATE TABLE inventario (
    id_inventario     SERIAL PRIMARY KEY,
    id_variante       INTEGER   NOT NULL REFERENCES producto_variantes (id_variante),
    id_almacen        INTEGER   NOT NULL REFERENCES almacenes (id_almacen),
    stock             INTEGER   NOT NULL DEFAULT 0,
    stock_minimo      INTEGER   NOT NULL DEFAULT 5,
    fecha_actualizado TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 12) compras
-- ----------------------------------------------------------------------------
CREATE TABLE compras (
    id_compra      SERIAL PRIMARY KEY,
    id_proveedor   INTEGER       NOT NULL REFERENCES proveedores (id_proveedor),
    id_empleado    INTEGER       NOT NULL REFERENCES empleados (id_empleado),
    fecha_compra   TIMESTAMP     NOT NULL DEFAULT NOW(),
    numero_factura VARCHAR(20)   NOT NULL,
    total          NUMERIC(12,2) NOT NULL DEFAULT 0,
    estado         VARCHAR(20)   NOT NULL DEFAULT 'REGISTRADA'
);

-- ----------------------------------------------------------------------------
-- 13) detalle_compras  (subtotal es columna generada)
-- ----------------------------------------------------------------------------
CREATE TABLE detalle_compras (
    id_detalle_compra SERIAL PRIMARY KEY,
    id_compra         INTEGER       NOT NULL REFERENCES compras (id_compra),
    id_variante       INTEGER       NOT NULL REFERENCES producto_variantes (id_variante),
    cantidad          INTEGER       NOT NULL,
    precio_unitario   NUMERIC(12,2) NOT NULL,
    subtotal          NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED
);

-- ----------------------------------------------------------------------------
-- 14) ventas
-- ----------------------------------------------------------------------------
CREATE TABLE ventas (
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

-- ----------------------------------------------------------------------------
-- 15) detalle_ventas  (subtotal es columna generada)
-- ----------------------------------------------------------------------------
CREATE TABLE detalle_ventas (
    id_detalle_venta SERIAL PRIMARY KEY,
    id_venta         INTEGER       NOT NULL REFERENCES ventas (id_venta),
    id_variante      INTEGER       NOT NULL REFERENCES producto_variantes (id_variante),
    cantidad         INTEGER       NOT NULL,
    precio_unitario  NUMERIC(12,2) NOT NULL,
    descuento        NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal         NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario - descuento) STORED
);

-- ----------------------------------------------------------------------------
-- 16) metodos_pago
-- ----------------------------------------------------------------------------
CREATE TABLE metodos_pago (
    id_metodo_pago SERIAL PRIMARY KEY,
    nombre_metodo  VARCHAR(50) NOT NULL,
    estado         BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 17) pagos
-- ----------------------------------------------------------------------------
CREATE TABLE pagos (
    id_pago        SERIAL PRIMARY KEY,
    id_venta       INTEGER       NOT NULL REFERENCES ventas (id_venta),
    id_metodo_pago INTEGER       NOT NULL REFERENCES metodos_pago (id_metodo_pago),
    monto          NUMERIC(12,2) NOT NULL,
    fecha_pago     TIMESTAMP     NOT NULL DEFAULT NOW(),
    referencia     VARCHAR(50)   NULL
);

-- ----------------------------------------------------------------------------
-- 18) devoluciones
-- ----------------------------------------------------------------------------
CREATE TABLE devoluciones (
    id_devolucion     SERIAL PRIMARY KEY,
    id_detalle_venta  INTEGER      NOT NULL REFERENCES detalle_ventas (id_detalle_venta),
    motivo            VARCHAR(200) NOT NULL,
    cantidad_devuelta INTEGER      NOT NULL,
    fecha_devolucion  TIMESTAMP    NOT NULL DEFAULT NOW(),
    estado            VARCHAR(20)  NOT NULL DEFAULT 'PROCESADA'
);

-- ============================================================================
-- DATOS DE PRUEBA
-- ============================================================================

INSERT INTO roles (nombre_rol, descripcion) VALUES
    ('Administrador', 'Acceso total al sistema'),
    ('Vendedor',      'Registra ventas y consulta stock'),
    ('Almacenero',    'Gestiona inventario y compras');

INSERT INTO usuarios (id_rol, nombre_usuario, clave_hash, correo) VALUES
    (1, 'admin',     '$2a$11$PLACEHOLDER_HASH_CAMBIAR_EN_PRODUCCION', 'admin@joselito.com'),
    (2, 'vendedor1', '$2a$11$PLACEHOLDER_HASH_CAMBIAR_EN_PRODUCCION', 'vendedor1@joselito.com');

INSERT INTO empleados (id_usuario, nombres, apellidos, dni, telefono, cargo) VALUES
    (1, 'José',   'Ramírez', '12345678', '987654321', 'Administrador'),
    (2, 'María',  'Torres',  '87654321', '912345678', 'Vendedora'),
    (NULL, 'Carlos', 'Rojas', '45678912', '998877665', 'Almacenero');

INSERT INTO clientes (tipo_documento, numero_documento, nombres, apellidos, telefono, correo, direccion) VALUES
    ('DNI', '11223344', 'Luis', 'Gonzales', '987111222', 'luis.gonzales@mail.com', 'Av. Los Próceres 123'),
    ('DNI', '55667788', 'Ana',  'Flores',   '987333444', 'ana.flores@mail.com',    'Jr. Unión 456'),
    ('RUC', '20123456789', 'Corporación Calzado EIRL', NULL, '987555666', 'ventas@calzadoeirl.com', 'Av. Industrial 789');

INSERT INTO categorias (nombre_categoria, descripcion) VALUES
    ('Zapatillas deportivas', 'Zapatillas para running y entrenamiento'),
    ('Zapatos formales',      'Zapatos de vestir para hombre y mujer'),
    ('Botas',                 'Botas de cuero y trabajo'),
    ('Sandalias',             'Calzado ligero para verano');

INSERT INTO marcas (nombre_marca) VALUES
    ('Nike'), ('Adidas'), ('Skechers'), ('Bata');

INSERT INTO proveedores (razon_social, ruc, telefono, correo, direccion) VALUES
    ('Importadora del Calzado SAC',   '20512345678', '014567890', 'ventas@importacalzado.com', 'Av. Argentina 1234, Callao'),
    ('Distribuidora ZapPart Perú SA', '20987654321', '014555666', 'pedidos@distribzap.com',    'Av. Aviación 3456, San Borja');

INSERT INTO productos (id_categoria, id_marca, codigo_producto, nombre_producto, descripcion, precio_compra, precio_venta) VALUES
    (1, 1, 'ZAP-DEP-001', 'Zapatilla Running Pro',    'Zapatilla de running con amortiguación de aire', 180.00, 299.90),
    (1, 2, 'ZAP-DEP-002', 'Zapatilla Training Flex',  'Zapatilla flexible para entrenamiento en gimnasio', 150.00, 249.90),
    (2, 4, 'ZAP-FOR-001', 'Zapato Formal Cuero',      'Zapato de vestir de cuero genuino', 120.00, 199.90),
    (3, 3, 'ZAP-BOT-001', 'Bota de Trabajo SafeFoot', 'Bota con puntera de acero', 140.00, 229.90);

INSERT INTO producto_variantes (id_producto, talla, color, sku) VALUES
    (1, '40', 'Negro',  'ZAP-DEP-001-40-NEG'),
    (1, '42', 'Negro',  'ZAP-DEP-001-42-NEG'),
    (2, '41', 'Blanco', 'ZAP-DEP-002-41-BLA'),
    (3, '42', 'Marrón', 'ZAP-FOR-001-42-MAR'),
    (4, '43', 'Café',   'ZAP-BOT-001-43-CAF');

INSERT INTO almacenes (nombre_almacen, direccion) VALUES
    ('Tienda Principal', 'Av. La Molina 123, La Molina'),
    ('Almacén Central',  'Av. Industrial 456, Ate');

INSERT INTO inventario (id_variante, id_almacen, stock, stock_minimo) VALUES
    (1, 1, 25, 5),
    (2, 1, 12, 5),
    (2, 2, 30, 10),
    (3, 1, 8,  5),
    (4, 1, 15, 5),
    (5, 2, 20, 10);

INSERT INTO compras (id_proveedor, id_empleado, numero_factura, total, estado) VALUES
    (1, 3, 'F001-000123', 5400.00, 'RECIBIDA');

INSERT INTO detalle_compras (id_compra, id_variante, cantidad, precio_unitario) VALUES
    (1, 2, 20, 180.00),
    (1, 5, 10, 180.00);

INSERT INTO ventas (id_cliente, id_empleado, id_almacen, tipo_comprobante, serie, numero_correlativo, total, estado) VALUES
    (1, 2, 1, 'BOLETA',  'B001', '00001234', 549.80, 'COMPLETADA'),
    (3, 2, 1, 'FACTURA', 'F001', '00000567', 199.90, 'COMPLETADA');

INSERT INTO detalle_ventas (id_venta, id_variante, cantidad, precio_unitario, descuento) VALUES
    (1, 1, 1, 299.90, 50.00),
    (1, 3, 1, 299.90, 0.00),
    (2, 4, 1, 199.90, 0.00);

INSERT INTO metodos_pago (nombre_metodo) VALUES
    ('Efectivo'), ('Tarjeta de crédito/débito'), ('Yape / Plin'), ('Transferencia');

INSERT INTO pagos (id_venta, id_metodo_pago, monto, referencia) VALUES
    (1, 3, 549.80, 'YAPE-88123'),
    (2, 1, 199.90, NULL);

INSERT INTO devoluciones (id_detalle_venta, motivo, cantidad_devuelta) VALUES
    (1, 'Talla muy pequeña', 1);

-- ----------------------------------------------------------------------------
-- Reajustar las secuencias de los SERIAL tras los inserts
-- ----------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('roles',              'id_rol'),            (SELECT MAX(id_rol)            FROM roles));
SELECT setval(pg_get_serial_sequence('usuarios',           'id_usuario'),        (SELECT MAX(id_usuario)        FROM usuarios));
SELECT setval(pg_get_serial_sequence('empleados',          'id_empleado'),       (SELECT MAX(id_empleado)       FROM empleados));
SELECT setval(pg_get_serial_sequence('clientes',           'id_cliente'),        (SELECT MAX(id_cliente)        FROM clientes));
SELECT setval(pg_get_serial_sequence('categorias',         'id_categoria'),      (SELECT MAX(id_categoria)      FROM categorias));
SELECT setval(pg_get_serial_sequence('marcas',             'id_marca'),          (SELECT MAX(id_marca)          FROM marcas));
SELECT setval(pg_get_serial_sequence('proveedores',        'id_proveedor'),      (SELECT MAX(id_proveedor)      FROM proveedores));
SELECT setval(pg_get_serial_sequence('productos',          'id_producto'),       (SELECT MAX(id_producto)       FROM productos));
SELECT setval(pg_get_serial_sequence('producto_variantes', 'id_variante'),       (SELECT MAX(id_variante)       FROM producto_variantes));
SELECT setval(pg_get_serial_sequence('almacenes',          'id_almacen'),        (SELECT MAX(id_almacen)        FROM almacenes));
SELECT setval(pg_get_serial_sequence('inventario',         'id_inventario'),     (SELECT MAX(id_inventario)     FROM inventario));
SELECT setval(pg_get_serial_sequence('compras',            'id_compra'),         (SELECT MAX(id_compra)         FROM compras));
SELECT setval(pg_get_serial_sequence('detalle_compras',    'id_detalle_compra'), (SELECT MAX(id_detalle_compra) FROM detalle_compras));
SELECT setval(pg_get_serial_sequence('ventas',             'id_venta'),          (SELECT MAX(id_venta)          FROM ventas));
SELECT setval(pg_get_serial_sequence('detalle_ventas',     'id_detalle_venta'),  (SELECT MAX(id_detalle_venta)  FROM detalle_ventas));
SELECT setval(pg_get_serial_sequence('metodos_pago',       'id_metodo_pago'),    (SELECT MAX(id_metodo_pago)    FROM metodos_pago));
SELECT setval(pg_get_serial_sequence('pagos',              'id_pago'),           (SELECT MAX(id_pago)           FROM pagos));
SELECT setval(pg_get_serial_sequence('devoluciones',       'id_devolucion'),     (SELECT MAX(id_devolucion)     FROM devoluciones));
