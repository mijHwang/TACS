package com.grupo3.tp.repository;


import com.grupo3.tp.models.EstadoSubasta;
import com.grupo3.tp.models.Subasta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface SubastaRepositoryCustom {

    List<Subasta> findByUsuarioId(String usuarioId);
    List<Subasta> findByParticipating(String usuarioId);
    public List<Subasta> findByEstadoAndHoraFinBefore(EstadoSubasta estado, LocalDateTime ahora);

    /** Subastas activas (PENDIENTE/EN_CURSO) cuya figurita es la dada. Para la cascada de liberación. */
    List<Subasta> findByFiguritaId(String figuritaId);

    // Paginated variants. `estado` is optional: when null no estado filter is applied.
    Page<Subasta> findAllPaged(EstadoSubasta estado, Pageable pageable);
    Page<Subasta> findByUsuarioIdPaged(String usuarioId, Pageable pageable);
    Page<Subasta> findByParticipatingPaged(String usuarioId, Pageable pageable);

}
