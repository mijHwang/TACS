package com.grupo3.tp.repository;

import com.grupo3.tp.models.FiguritaPublicada;

import java.util.List;

public interface FiguritaPublicadaRepositoryCustom {
    List<FiguritaPublicada> findDisponibles();
    List<FiguritaPublicada> findByUsuarioId(String usuarioId);
    List<FiguritaPublicada> findByFiguritaBaseId(String figuritaBaseId);
    List<FiguritaPublicada> findByFiguritaId(String figuritaId); // New method
}