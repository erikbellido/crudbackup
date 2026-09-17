using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ZapateriaJoselito.Api.Models;

public class Rol
{
    [Key] public int IdRol { get; set; }
    public string NombreRol { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool Estado { get; set; } = true;
}

public class Usuario
{
    [Key] public int IdUsuario { get; set; }
    public int IdRol { get; set; }
    public string NombreUsuario { get; set; } = string.Empty;
    public string ClaveHash { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public bool Estado { get; set; } = true;
    public DateTime FechaCreacion { get; set; } = DateTime.Now;
    public DateTime? UltimoAcceso { get; set; }
}

public class Empleado
{
    [Key] public int IdEmpleado { get; set; }
    public int? IdUsuario { get; set; }
    public string Nombres { get; set; } = string.Empty;
    public string Apellidos { get; set; } = string.Empty;
    public string DNI { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string Cargo { get; set; } = string.Empty;
    public DateTime FechaContrato { get; set; } = DateTime.Now;
    public bool Estado { get; set; } = true;
}

public class Cliente
{
    [Key] public int IdCliente { get; set; }
    public string TipoDocumento { get; set; } = "DNI";
    public string NumeroDocumento { get; set; } = string.Empty;
    public string Nombres { get; set; } = string.Empty;
    public string? Apellidos { get; set; }
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public string? Direccion { get; set; }
    public DateTime FechaRegistro { get; set; } = DateTime.Now;
    public bool Estado { get; set; } = true;
}

public class Categoria
{
    [Key] public int IdCategoria { get; set; }
    public string NombreCategoria { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool Estado { get; set; } = true;
}

public class Marca
{
    [Key] public int IdMarca { get; set; }
    public string NombreMarca { get; set; } = string.Empty;
    public bool Estado { get; set; } = true;
}

public class Proveedor
{
    [Key] public int IdProveedor { get; set; }
    public string RazonSocial { get; set; } = string.Empty;
    public string RUC { get; set; } = string.Empty;
    public string? Telefono { get; set; }
    public string? Correo { get; set; }
    public string? Direccion { get; set; }
    public bool Estado { get; set; } = true;
}

public class Producto
{
    [Key] public int IdProducto { get; set; }
    public int IdCategoria { get; set; }
    public int IdMarca { get; set; }
    public string CodigoProducto { get; set; } = string.Empty;
    public string NombreProducto { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public decimal PrecioCompra { get; set; }
    public decimal PrecioVenta { get; set; }
    public bool Estado { get; set; } = true;
}

public class ProductoVariante
{
    [Key] public int IdVariante { get; set; }
    public int IdProducto { get; set; }
    public string Talla { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string SKU { get; set; } = string.Empty;
    public bool Estado { get; set; } = true;
}

public class Almacen
{
    [Key] public int IdAlmacen { get; set; }
    public string NombreAlmacen { get; set; } = string.Empty;
    public string? Direccion { get; set; }
    public bool Estado { get; set; } = true;
}

public class Inventario
{
    [Key] public int IdInventario { get; set; }
    public int IdVariante { get; set; }
    public int IdAlmacen { get; set; }
    public int Stock { get; set; }
    public int StockMinimo { get; set; } = 5;
    public DateTime FechaActualizado { get; set; } = DateTime.Now;
}

public class Compra
{
    [Key] public int IdCompra { get; set; }
    public int IdProveedor { get; set; }
    public int IdEmpleado { get; set; }
    public DateTime FechaCompra { get; set; } = DateTime.Now;
    public string NumeroFactura { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public string Estado { get; set; } = "REGISTRADA";
}

public class DetalleCompra
{
    [Key] public int IdDetalleCompra { get; set; }
    public int IdCompra { get; set; }
    public int IdVariante { get; set; }
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    public decimal Subtotal { get; set; }
}

public class Venta
{
    [Key] public int IdVenta { get; set; }
    public int IdCliente { get; set; }
    public int IdEmpleado { get; set; }
    public int IdAlmacen { get; set; }
    public DateTime FechaVenta { get; set; } = DateTime.Now;
    public string TipoComprobante { get; set; } = "BOLETA";
    public string? Serie { get; set; }
    public string? NumeroCorrelativo { get; set; }
    public decimal Total { get; set; }
    public string Estado { get; set; } = "COMPLETADA";
}

public class DetalleVenta
{
    [Key] public int IdDetalleVenta { get; set; }
    public int IdVenta { get; set; }
    public int IdVariante { get; set; }
    public int Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }

    [DatabaseGenerated(DatabaseGeneratedOption.Computed)]
    public decimal Subtotal { get; set; }
}

public class MetodoPago
{
    [Key] public int IdMetodoPago { get; set; }
    public string NombreMetodo { get; set; } = string.Empty;
    public bool Estado { get; set; } = true;
}

public class Pago
{
    [Key] public int IdPago { get; set; }
    public int IdVenta { get; set; }
    public int IdMetodoPago { get; set; }
    public decimal Monto { get; set; }
    public DateTime FechaPago { get; set; } = DateTime.Now;
    public string? Referencia { get; set; }
}

public class Devolucion
{
    [Key] public int IdDevolucion { get; set; }
    public int IdDetalleVenta { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public int CantidadDevuelta { get; set; }
    public DateTime FechaDevolucion { get; set; } = DateTime.Now;
    public string Estado { get; set; } = "PROCESADA";
}
