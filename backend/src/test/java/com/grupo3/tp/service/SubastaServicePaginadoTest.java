package com.grupo3.tp.service;

import com.grupo3.tp.models.EstadoSubasta;
import com.grupo3.tp.models.Subasta;
import com.grupo3.tp.repository.SubastaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubastaServicePaginadoTest {

    @Mock
    private SubastaRepository repository;
    @Mock
    private FiguritaService figuritaService;
    @Mock
    private NotificacionService notificacionService;
    @Mock
    private UsuarioService usuarioService;
    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private SubastaService service;

    @Test
    public void obtenerTodasPaginadoForwardsEstadoFilterAndPageable() {
        Subasta subasta = Subasta.builder()
                .id("sub-1")
                .estado(EstadoSubasta.EN_CURSO)
                .build();
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "horaFin"));
        Page<Subasta> repoPage = new PageImpl<>(List.of(subasta), pageable, 1);
        when(repository.findAllPaged(eq(EstadoSubasta.EN_CURSO), any(Pageable.class)))
                .thenReturn(repoPage);

        Page<Subasta> result = service.obtenerTodasPaginado(EstadoSubasta.EN_CURSO, pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getContent().size());
        assertEquals("sub-1", result.getContent().get(0).getId());

        // estado filter and pageable (page 0, size 10) are forwarded to the repo
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findAllPaged(eq(EstadoSubasta.EN_CURSO), pageableCaptor.capture());
        assertEquals(0, pageableCaptor.getValue().getPageNumber());
        assertEquals(10, pageableCaptor.getValue().getPageSize());
    }

    @Test
    public void obtenerTodasPaginadoForwardsNullEstadoWhenNoFilter() {
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.ASC, "horaFin"));
        when(repository.findAllPaged(eq(null), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        service.obtenerTodasPaginado(null, pageable);

        verify(repository).findAllPaged(eq(null), any(Pageable.class));
    }

    @Test
    public void obtenerPorUsuarioPaginadoForwardsUsuarioIdAndPageable() {
        Subasta subasta = Subasta.builder()
                .id("sub-9")
                .estado(EstadoSubasta.FINALIZADA)
                .build();
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "horaFin"));
        Page<Subasta> repoPage = new PageImpl<>(List.of(subasta), pageable, 1);
        when(repository.findByUsuarioIdPaged(eq("user-1"), any(Pageable.class)))
                .thenReturn(repoPage);

        Page<Subasta> result = service.obtenerPorUsuarioPaginado("user-1", pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals("sub-9", result.getContent().get(0).getId());

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findByUsuarioIdPaged(eq("user-1"), pageableCaptor.capture());
        assertEquals(0, pageableCaptor.getValue().getPageNumber());
        assertEquals(10, pageableCaptor.getValue().getPageSize());
    }
}
