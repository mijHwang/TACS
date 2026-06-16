package com.grupo3.tp.dtos;

import lombok.Data;

import java.util.List;

@Data
public class OfertaDTO {
    private String subastaId;
    private String usuarioId;
    private List<String> figuritaIds;
}
