package com.grupo3.tp.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

import java.util.List;

@Document(collection = "solicitudes_intercambio")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolicitudDeIntercambio {

    public enum EstadoSolicitud {
        PENDIENTE,
        ACEPTADO,
        RECHAZADO
    }

    @Id
    private String id;
    @DocumentReference(lazy = true)
    private Usuario usuario;
    @DocumentReference(lazy = true)
    private Figurita figurita;
    private Integer cantidadDisponible;
    @DocumentReference(lazy = true)
    private List<Figurita> figuritasOfrecidas;
    private EstadoSolicitud estado;
}
