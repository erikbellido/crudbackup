using Microsoft.EntityFrameworkCore;
using Npgsql;
using ZapateriaJoselito.Api.Data;
using ZapateriaJoselito.Api.Extensions;
using ZapateriaJoselito.Api.Models;

// Npgsql: tratar DateTime como 'timestamp without time zone' (comportamiento previo a Npgsql 6),
// compatible con los valores DateTime.Now que asignan las entidades.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// ── Cadena de conexión ─────────────────────────────────────────────────────
// Prioridad: ConnectionStrings:Default (appsettings.json o variable de entorno
// ConnectionStrings__Default) y luego DATABASE_URL.
// Se aceptan dos formatos:
//   1) Npgsql:      Host=...;Port=5432;Database=...;Username=...;Password=...
//   2) URI Supabase: postgresql://usuario:password@host:5432/postgres
//      (Npgsql no parsea URIs directamente, se convierten abajo)
var cadenaOriginal = builder.Configuration.GetConnectionString("Default")
                  ?? Environment.GetEnvironmentVariable("DATABASE_URL");

if (string.IsNullOrWhiteSpace(cadenaOriginal))
    throw new InvalidOperationException(
        "No hay cadena de conexión configurada. Define ConnectionStrings:Default en " +
        "appsettings.json, o la variable de entorno ConnectionStrings__Default o DATABASE_URL " +
        "(acepta el formato URI de Supabase)." );

var cadenaConexion = NormalizarCadenaPostgres(cadenaOriginal);

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(cadenaConexion)
       .UseSnakeCaseNamingConvention()); // tablas/columnas en snake_case (roles, id_producto, ...)

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.ConfigureHttpJsonOptions(options => {
    options.SerializerOptions.PropertyNamingPolicy = null;
});

var app = builder.Build();

app.Logger.LogInformation("Conectando a PostgreSQL: {Destino}", ResumenConexion(cadenaOriginal));

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("AllowFrontend");

// Tablas disponibles, usado por el sidebar del frontend (clave = ruta de la API, valor = etiqueta visible)
var tablas = new (string ruta, string etiqueta)[]
{
    ("roles", "Roles"),
    ("usuarios", "Usuarios"),
    ("empleados", "Empleados"),
    ("clientes", "Clientes"),
    ("categorias", "Categorías"),
    ("marcas", "Marcas"),
    ("proveedores", "Proveedores"),
    ("productos", "Productos"),
    ("variantes", "Variantes de producto"),
    ("almacenes", "Almacenes"),
    ("inventario", "Inventario"),
    ("compras", "Compras"),
    ("detalle-compras", "Detalle de compras"),
    ("ventas", "Ventas"),
    ("detalle-ventas", "Detalle de ventas"),
    ("metodos-pago", "Métodos de pago"),
    ("pagos", "Pagos"),
    ("devoluciones", "Devoluciones"),
};

app.MapGet("/api/entities", () => Results.Ok(
    tablas.Select(t => new { route = t.ruta, label = t.etiqueta })));

app.MapCrudEndpoints<Rol>("roles");
app.MapCrudEndpoints<Usuario>("usuarios");
app.MapCrudEndpoints<Empleado>("empleados");
app.MapCrudEndpoints<Cliente>("clientes");
app.MapCrudEndpoints<Categoria>("categorias");
app.MapCrudEndpoints<Marca>("marcas");
app.MapCrudEndpoints<Proveedor>("proveedores");
app.MapCrudEndpoints<Producto>("productos");
app.MapCrudEndpoints<ProductoVariante>("variantes");
app.MapCrudEndpoints<Almacen>("almacenes");
app.MapCrudEndpoints<Inventario>("inventario");
app.MapCrudEndpoints<Compra>("compras");
app.MapCrudEndpoints<DetalleCompra>("detalle-compras");
app.MapCrudEndpoints<Venta>("ventas");
app.MapCrudEndpoints<DetalleVenta>("detalle-ventas");
app.MapCrudEndpoints<MetodoPago>("metodos-pago");
app.MapCrudEndpoints<Pago>("pagos");
app.MapCrudEndpoints<Devolucion>("devoluciones");

app.Run();

// Convierte una URI postgresql:// de Supabase al formato Npgsql (Host=...;Port=...;)
// y fuerza SSL, que Supabase exige. Si ya viene en formato Npgsql, la devuelve tal cual.
static string NormalizarCadenaPostgres(string cadena)
{
    if (!cadena.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
        !cadena.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        return cadena.Trim();

    var uri = new Uri(cadena);
    var partes = uri.UserInfo.Split(':', 2);
    var csb = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.Trim('/'),
        Username = Uri.UnescapeDataString(partes[0]),
        Password = partes.Length > 1 ? Uri.UnescapeDataString(partes[1]) : null,
        // Supabase exige SSL y su certificado no trae CA local:
        SslMode = SslMode.Require,
        TrustServerCertificate = true,
    };
    return csb.ConnectionString;
}

// Resumen seguro para el log (sin contraseña)
static string ResumenConexion(string cadena)
{
    try
    {
        if (cadena.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
        {
            var u = new Uri(cadena);
            return $"{u.Host}:{(u.Port > 0 ? u.Port : 5432)}/{u.AbsolutePath.Trim('/')}";
        }
        var b = new NpgsqlConnectionStringBuilder(cadena);
        return $"{b.Host}:{b.Port}/{b.Database}";
    }
    catch
    {
        return "(cadena no parseable)";
    }
}
