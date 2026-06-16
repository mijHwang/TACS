package com.grupo3.tp.models;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

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
    private List<Filtro> filtros;    // Multiple tipo-valor pairs

    @Override
    public Boolean cumpleCondicion(Oferta oferta) {
        if (oferta == null || oferta.getFiguritas() == null || oferta.getFiguritas().isEmpty()) {
            return false;
        }

        if (filtros == null || filtros.isEmpty()) {
            return true;  // No filters = all bids valid
        }

        // ALL filters must match at least one figurita
        return filtros.stream().allMatch(filtro ->
                oferta.getFiguritas().stream().anyMatch(figurita ->
                        matchFiltro(figurita, filtro)
                )
        );
    }

    private boolean matchFiltro(Figurita figurita, Filtro filtro) {
        if (figurita.getFiguritaBase() == null) {
            return false;
        }

        switch (filtro.getTipo().toLowerCase()) {
            case "seleccion":
                return figurita.getFiguritaBase().getSeleccion() != null
                        && figurita.getFiguritaBase().getSeleccion().getNombre().equals(filtro.getValor());

            case "equipo":
                return figurita.getFiguritaBase().getEquipo() != null
                        && figurita.getFiguritaBase().getEquipo().getNombre().equals(filtro.getValor());

            case "categoria":
                return figurita.getFiguritaBase().getCategoria() != null
                        && figurita.getFiguritaBase().getCategoria().getNombre().equals(filtro.getValor());

            case "jugador":
                return figurita.getFiguritaBase().getJugador() != null
                        && figurita.getFiguritaBase().getJugador().getNombre().equals(filtro.getValor());

            default:
                return false;
        }
    }
}