package com.grupo3.tp.repository;

import com.grupo3.tp.models.Intercambio;
import java.util.List;

public interface IntercambioRepositoryCustom {
    List<Intercambio> findByUsuarioGeneradorId(String usuarioId);
    List<Intercambio> findByUsuarioIntercambiadorId(String usuarioId);
    List<Intercambio> findByUsuarioId(String usuarioId);
}
