package com.grupo3.tp.repository;

import com.grupo3.tp.models.Intercambio;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface IntercambioRepositoryCustom {
    List<Intercambio> findByUsuarioGeneradorId(String usuarioId);
    List<Intercambio> findByUsuarioIntercambiadorId(String usuarioId);
    List<Intercambio> findByUsuarioId(String usuarioId);
    Page<Intercambio> findByUsuarioId(String usuarioId, Pageable pageable);
}
