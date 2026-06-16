package com.grupo3.tp.dtos;

import lombok.Data;

import java.util.List;


@Data
public class SubastaDTO {

    private String subastaId;
    private String usuarioId;
    private String figuritaId;
    private List<String> figuritasEnSubasta;
    private List<String> ofertas;
    private String estado;

}
