using Microsoft.EntityFrameworkCore;
using ZapateriaJoselito.Api.Models;

namespace ZapateriaJoselito.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // Los nombres de las propiedades DbSet coinciden con los nombres de tabla reales.
    public DbSet<Rol> Roles => Set<Rol>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Empleado> Empleados => Set<Empleado>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Marca> Marcas => Set<Marca>();
    public DbSet<Proveedor> Proveedores => Set<Proveedor>();
    public DbSet<Producto> Productos => Set<Producto>();
    public DbSet<ProductoVariante> ProductoVariantes => Set<ProductoVariante>();
    public DbSet<Almacen> Almacenes => Set<Almacen>();
    public DbSet<Inventario> Inventario => Set<Inventario>();
    public DbSet<Compra> Compras => Set<Compra>();
    public DbSet<DetalleCompra> DetalleCompras => Set<DetalleCompra>();
    public DbSet<Venta> Ventas => Set<Venta>();
    public DbSet<DetalleVenta> DetalleVentas => Set<DetalleVenta>();
    public DbSet<MetodoPago> MetodosPago => Set<MetodoPago>();
    public DbSet<Pago> Pagos => Set<Pago>();
    public DbSet<Devolucion> Devoluciones => Set<Devolucion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // No se declaran relaciones de navegación a propósito: el objetivo es un
        // mapeo simple 1 a 1 contra las tablas ya creadas por el script .sql,
        // sin que EF intente generar ni exigir claves foráneas de navegación.
        modelBuilder.Entity<DetalleCompra>()
            .Property(d => d.Subtotal)
            .HasComputedColumnSql("([Cantidad]*[PrecioUnitario])", stored: true);

        modelBuilder.Entity<DetalleVenta>()
            .Property(d => d.Subtotal)
            .HasComputedColumnSql("([Cantidad]*[PrecioUnitario]-[Descuento])", stored: true);
    }
}
