package com.grupo3.tp.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

@Document(collection = "calificaciones")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Calificacion {
    @Id
    private String id;
    @DocumentReference(lazy = true)
    private Usuario usuarioCalificador;
    @DocumentReference(lazy = true)
    private Usuario usuarioCalificado;
    @DocumentReference(lazy = true)
    private Intercambio intercambio;
    private Integer calificacion;
}
