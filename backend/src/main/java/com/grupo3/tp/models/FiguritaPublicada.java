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

@Document(collection = "figuritas_publicadas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FiguritaPublicada {
    @Id
    private String id;

    @DocumentReference(lazy = true)
    private List<Figurita> figuritas;

    @DocumentReference(lazy = true)
    private Usuario usuario;

    private String figuritaBaseId;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime fechaPublicacion;

    private EstadoPublicacion estado;
}