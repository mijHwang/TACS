package com.grupo3.tp.dtos;

import lombok.*;
import java.util.List;


@Data
@NoArgsConstructor
@AllArgsConstructor
public class SolicitudDeIntercambioDTO {
    private String usuarioId;
    private String figuritaId;
    private List<String> figuritasOfrecidas;
    private String estado;
 
}
