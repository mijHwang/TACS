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

@Document(collection = "notificaciones")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notificacion {
    @Id
    private String id;
    @DocumentReference(lazy = true)
    private Usuario usuario;
    private String tipo;
    private String titulo;
    private String mensaje;
    private Boolean leida;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime fecha;
    private String enlace;
}



////// REMEMBER TO PUT THIS IN WHICHEVER BACKEND THAT MUST TRIGGER A NOTIFICATION
/*
Notificacion notif = Notificacion.builder()
        .usuario(figuritaOwner)  // Who receives it
        .tipo(SSSSS)
        .titulo(SSSS)
        .mensaje(SSSSS)
        .enlace(FRONT END LINK)
        .leida(false)
        .fecha(LocalDateTime.now())
        .build();

    notificacionService.crear(notif);  // Save notificati*/
