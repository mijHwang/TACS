package com.grupo3.tp.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "jugadores")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Jugador {
    @Id
    private String id;
    private String nombre;
}
