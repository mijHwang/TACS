package com.grupo3.tp.dtos;

import com.grupo3.tp.models.EstadoSubasta;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubastaResponseDTO {
    private String id;

    // Usuario
    private String usuarioId;
    private String usuarioUsername;

    // Figurita (flattened)
    private String figuritaId;
    private Integer figuritaNumero;
    private String figuritaJugadorNombre;
    private String figuritaSeleccionNombre;
    private String figuritaEquipoNombre;
    private String figuritaCategoriaNombre;

    // Subasta fields
    private EstadoSubasta estado;
    private Integer duracion;
    private LocalDateTime horaInicio;
    private LocalDateTime horaFin;
    private int ofertasCount;

    private String liderId;
    private String liderUsername;
    private List<String> liderFiguritasNombres;
}