package com.grupo3.tp.repository;

import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.models.Figurita;


import java.util.List;



public interface FiguritaRepositoryCustom {

    List<Figurita>findByFiguritaOwnerId(String usuarioId);
    List<FiguritaResponseDTO> findRepetidas(String usuarioId);
}
