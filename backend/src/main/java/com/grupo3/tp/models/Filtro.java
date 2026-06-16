package com.grupo3.tp.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Filtro {
    private String tipo;      // "seleccion", "equipo", "categoria", "jugador"
    private String valor;     // The value to match
}