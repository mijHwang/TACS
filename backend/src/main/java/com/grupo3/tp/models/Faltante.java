package com.grupo3.tp.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

import java.time.LocalDateTime;

/**
 * Wishlist declarada (US4/US11): una base que un usuario dice que le falta.
 * Se denormaliza {@code figuritaBaseId} (String) para las queries de matching/US11
 * y se guarda la ref {@code figuritaBase} para armar el DTO de la pantalla de faltantes.
 */
@Document(collection = "faltantes")
@CompoundIndex(name = "usuario_base_unico", def = "{'usuarioId': 1, 'figuritaBaseId': 1}", unique = true)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Faltante {
    @Id
    private String id;
    private String usuarioId;
    private String figuritaBaseId;
    @DocumentReference(lazy = true)
    private FiguritaBase figuritaBase;
    private LocalDateTime fecha;
}
