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

@Document(collection = "subastas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subasta {
    @Id
    private String id;
    @DocumentReference(lazy = true)
    private Usuario usuario;
    @DocumentReference(lazy = true)
    private List<Oferta> ofertas;
    @DocumentReference(lazy = true)
    private Figurita figurita;
    private Integer duracion;
    @DocumentReference(lazy = true)
    private List<CondicionImpl> condiciones;
    private EstadoSubasta estado;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime horaInicio;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime horaFin;
}
