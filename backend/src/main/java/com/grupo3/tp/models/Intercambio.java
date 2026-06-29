package com.grupo3.tp.models;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "intercambios")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Intercambio {
    @Id
    private String id;
    @DocumentReference(lazy = true)
    private Usuario usuarioGenerador;
    @DocumentReference(lazy = true)
    private Figurita figurita;
    @DocumentReference(lazy = true)
    private List<Figurita> figuritaIntercambiada;
    @DocumentReference(lazy = true)
    private Usuario usuarioIntercambiador;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime fecha;
    @DocumentReference(lazy = true)
    private SolicitudDeIntercambio solicitud;

    private Integer puntajeGenerador;      // rating given TO usuarioGenerador
    private Integer puntajeIntercambiador; // rating given TO usuarioIntercambiador

    
}
