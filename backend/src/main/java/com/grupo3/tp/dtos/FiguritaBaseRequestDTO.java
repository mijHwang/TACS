package com.grupo3.tp.dtos;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FiguritaBaseRequestDTO
{
    private Integer numero;
    private String seleccionId;
    private String equipoId;
    private String categoriaId;
    private String jugadorId;
}
