package com.grupo3.tp.dtos;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Credencial de un protagonista de la demo, para mostrar en la UI. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProtagonistaDTO {
    private String username;
    private String password;
}
