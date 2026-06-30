package com.grupo3.tp.dtos;

/**
 * Filtros opcionales para las consultas paginadas de figuritas (catálogo, colección y faltantes).
 * Todos los campos son nullable/vacíos = sin filtrar.
 *
 * <ul>
 *   <li>{@code usuarioId}: en el catálogo es el caller a EXCLUIR (no mostrar lo propio);
 *       en la colección es el dueño a INCLUIR. El significado lo decide el repositorio según el método.</li>
 *   <li>{@code search}: contains case-insensitive sobre el nombre del jugador.</li>
 *   <li>{@code seleccion}/{@code equipo}/{@code categoria}: contains ci sobre el nombre resuelto.</li>
 *   <li>{@code numero}: match exacto del número de figurita.</li>
 *   <li>{@code figuritaBaseId}: acota a una figurita-base puntual (usado al venir desde "faltantes").</li>
 * </ul>
 */
public record CatalogoFiltro(
        String usuarioId,
        String figuritaBaseId,
        Integer numero,
        String search,
        String seleccion,
        String equipo,
        String categoria
) {
    public static CatalogoFiltro empty() {
        return new CatalogoFiltro(null, null, null, null, null, null, null);
    }
}
