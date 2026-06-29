package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class IntercambioResponseDTO {
    private String id;

    // usuarioGenerador
    private String usuarioGeneradorId;
    private String usuarioGeneradorUsername;

    // usuarioIntercambiador
    private String usuarioIntercambiadorId;
    private String usuarioIntercambiadorUsername;

    // figuritas
    private String figuritaId;
    private String figuritaNombre;
    private List<String> figuritasIntercambiadasNombres;

    private LocalDateTime fecha;

    // ratings
    private Integer puntajeGenerador;
    private Integer puntajeIntercambiador;
}