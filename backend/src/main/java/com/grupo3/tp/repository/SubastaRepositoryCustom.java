package com.grupo3.tp.repository;


import com.grupo3.tp.models.EstadoSubasta;
import com.grupo3.tp.models.Subasta;

import java.time.LocalDateTime;
import java.util.List;

public interface SubastaRepositoryCustom {

    List<Subasta> findByUsuarioId(String usuarioId);
    List<Subasta> findByParticipating(String usuarioId);
    public List<Subasta> findByEstadoAndHoraFinBefore(EstadoSubasta estado, LocalDateTime ahora);

}
