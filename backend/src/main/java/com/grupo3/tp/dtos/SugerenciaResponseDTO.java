package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Sugerencia de intercambio agrupada por contraparte, lista para el frontend. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SugerenciaResponseDTO {
    private String contraparteId;
    private String contraparteNombre;
    private List<FiguritaResponseDTO> figuritasARecibir;
    private List<FiguritaResponseDTO> figuritasAOfrecer;
}
