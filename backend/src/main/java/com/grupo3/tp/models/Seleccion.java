package com.grupo3.tp.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "selecciones")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Seleccion {
    @Id
    private String id;
    private String nombre;
    private String grupo;
}
