package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class FiguritaPublicadaResponseDTO {
    private String id;

    // FiguritaBase info
    private String figuritaBaseId;
    private Integer figuritaNumero;
    private String figuritaJugadorNombre;
    private String figuritaSeleccionNombre;
    private String figuritaEquipoNombre;
    private String figuritaCategoriaNombre;

    // Specific figurita IDs being offered
    private List<String> figuritaIds;
    private Integer cantidad;

    // Usuario
    private String usuarioId;
    private String usuarioUsername;

    private LocalDateTime fechaPublicacion;
    private String estado;
}