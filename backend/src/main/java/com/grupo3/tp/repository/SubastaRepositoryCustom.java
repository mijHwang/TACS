package com.grupo3.tp.repository;


import com.grupo3.tp.models.Subasta;
import java.util.List;

public interface SubastaRepositoryCustom {

    List<Subasta> findByUsuarioId(String usuarioId);
    List<Subasta> findByParticipating(String usuarioId);
    

}
