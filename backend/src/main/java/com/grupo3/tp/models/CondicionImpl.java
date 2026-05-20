package com.grupo3.tp.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "condiciones")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CondicionImpl implements Condicion {
    @Id
    private String id;
    private String nombre;
    private String descripcion;
    private String tipo;
    private String valor;

    @Override
    public Boolean cumpleCondicion(Oferta oferta) {
        return true;
    }
}
