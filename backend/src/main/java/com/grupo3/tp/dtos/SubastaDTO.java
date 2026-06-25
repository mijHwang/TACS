package com.grupo3.tp.dtos;

import com.grupo3.tp.models.CondicionImpl;
import lombok.Data;

import java.util.List;


@Data
public class SubastaDTO {


    private String usuarioId;
    private String figuritaId;
    private Integer duracion;
    private List<CondicionImpl> condiciones;

}
