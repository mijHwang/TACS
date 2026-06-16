package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FiguritaResponseDTO {
    private String id;
    private int numero;
    private String jugadorNombre;
    private String seleccionNombre;
    private String equipoNombre;
    private String categoriaNombre;
}