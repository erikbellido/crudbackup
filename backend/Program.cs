using Microsoft.EntityFrameworkCore;
using ZapateriaJoselito.Api.Data;
using ZapateriaJoselito.Api.Extensions;
using ZapateriaJoselito.Api.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

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
