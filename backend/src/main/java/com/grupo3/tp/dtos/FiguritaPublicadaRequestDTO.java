package com.grupo3.tp.dtos;

import lombok.Data;

@Data
public class FiguritaPublicadaRequestDTO {
    private String usuarioId;
    private String figuritaBaseId;
    private Integer cantidad;
}