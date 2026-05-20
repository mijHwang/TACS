package com.grupo3.tp.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

@Document(collection = "figuritas_base")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FiguritaBase {
    @Id
    private String id;
    private Integer numero;
    @DocumentReference(lazy = true)
    private Seleccion seleccion;
    @DocumentReference(lazy = true)
    private Equipo equipo;
    @DocumentReference(lazy = true)
    private CategoriaFigurita categoria;
    @DocumentReference(lazy = true)
    private Jugador jugador;
}
