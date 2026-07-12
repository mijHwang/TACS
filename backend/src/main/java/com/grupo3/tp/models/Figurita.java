package com.grupo3.tp.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

@Document(collection = "figuritas")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Figurita {
    @Id
    private String id;
    @Version
    private Long version;
    @DocumentReference(lazy = true)
    private FiguritaBase figuritaBase;
    @DocumentReference(lazy = true)
    private Usuario owner;
}
