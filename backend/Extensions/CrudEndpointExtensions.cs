using Microsoft.EntityFrameworkCore;
using ZapateriaJoselito.Api.Data;

namespace ZapateriaJoselito.Api.Extensions;

/// <summary>
/// Genera automáticamente los endpoints GET/POST/PUT/DELETE + metadata
/// para cualquier entidad, sin necesidad de escribir un controlador por tabla.
/// </summary>
public static class CrudEndpointExtensions
{
    public static void MapCrudEndpoints<TEntity>(this WebApplication app, string routeName) where TEntity : class
    {
        var group = app.MapGroup($"/api/{routeName}").WithTags(routeName);

        // Listar todos los registros
        group.MapGet("/", async (AppDbContext db) =>
            Results.Ok(await db.Set<TEntity>().AsNoTracking().ToListAsync()));

        // Obtener uno por id
        group.MapGet("/{id:int}", async (int id, AppDbContext db) =>
        {
            var entity = await FindByIdAsync<TEntity>(db, id);
            return entity is not null ? Results.Ok(entity) : Results.NotFound();
        });

        // Metadata de columnas, usada por el frontend para construir el formulario
        group.MapGet("/_meta", (AppDbContext db) =>
        {
            var entityType = db.Model.FindEntityType(typeof(TEntity))!;
            var pkName = entityType.FindPrimaryKey()!.Properties[0].Name;
            var computed = entityType.GetProperties()
                .Where(p => p.ValueGenerated == Microsoft.EntityFrameworkCore.Metadata.ValueGenerated.OnAddOrUpdate)
                .Select(p => p.Name)
                .ToHashSet();

            var columns = typeof(TEntity).GetProperties().Select(p => new
            {
                name = p.Name,
                type = (Nullable.GetUnderlyingType(p.PropertyType) ?? p.PropertyType).Name,
                isKey = p.Name == pkName,
                isComputed = computed.Contains(p.Name),
                nullable = Nullable.GetUnderlyingType(p.PropertyType) != null || p.PropertyType == typeof(string)
            });

            return Results.Ok(new { table = routeName, key = pkName, columns });
        });

        // Crear
        group.MapPost("/", async (TEntity input, AppDbContext db) =>
        {
            db.Set<TEntity>().Add(input);
            await db.SaveChangesAsync();
            return Results.Created($"/api/{routeName}", input);
        });

        // Actualizar
        group.MapPut("/{id:int}", async (int id, TEntity input, AppDbContext db) =>
        {
            var entity = await FindByIdAsync<TEntity>(db, id);
            if (entity is null) return Results.NotFound();
            db.Entry(entity).CurrentValues.SetValues(input);
            await db.SaveChangesAsync();
            return Results.Ok(entity);
        });

        // Eliminar
        group.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
        {
            var entity = await FindByIdAsync<TEntity>(db, id);
            if (entity is null) return Results.NotFound();
            db.Set<TEntity>().Remove(entity);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static async Task<TEntity?> FindByIdAsync<TEntity>(AppDbContext db, int id) where TEntity : class
    {
        var entityType = db.Model.FindEntityType(typeof(TEntity))!;
        var pkName = entityType.FindPrimaryKey()!.Properties[0].Name;
        return await db.Set<TEntity>().FirstOrDefaultAsync(e => EF.Property<int>(e, pkName) == id);
    }
}
