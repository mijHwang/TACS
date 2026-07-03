package com.grupo3.tp.service;

import com.grupo3.tp.dtos.CatalogoFiltro;
import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.repository.FiguritaBaseRepository;
import com.grupo3.tp.repository.FiguritaRepository;
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

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cada método paginado del service reenvía el {@link CatalogoFiltro} y el {@link Pageable}
 * al repositorio (mockeado, devolviendo un {@link PageImpl}) y mapea bien contenido/totales.
 * La lógica de agregación en sí se valida en vivo (no hay Mongo embebido en el proyecto).
 */
@ExtendWith(MockitoExtension.class)
public class FiguritaServicePaginadoTest {

    @Mock
    private FiguritaRepository repository;
    @Mock
    private FiguritaBaseRepository figuritaBaseRepository;

    @InjectMocks
    private FiguritaService service;

    private static FiguritaResponseDTO sampleFigurita() {
        return new FiguritaResponseDTO("f1", 1, "b1", 2, "Messi", "ARG", "x", "y", "u9", "sofi", null);
    }

    private static FiguritaBaseDTO sampleBase() {
        return new FiguritaBaseDTO("b1", 5, "Messi", "ARG", "x", "y", null);
    }

    @Test
    public void catalogoForwardsFiltroYPageable() {
        Pageable pageable = PageRequest.of(0, 10);
        when(repository.findCatalogoPaged(any(CatalogoFiltro.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleFigurita()), pageable, 1));
        CatalogoFiltro filtro = new CatalogoFiltro("me", null, null, "mes", null, null, null);

        Page<FiguritaResponseDTO> res = service.obtenerCatalogoPaginado(filtro, pageable);

        assertEquals(1, res.getTotalElements());
        assertEquals("f1", res.getContent().get(0).getId());

        ArgumentCaptor<CatalogoFiltro> fc = ArgumentCaptor.forClass(CatalogoFiltro.class);
        verify(repository).findCatalogoPaged(fc.capture(), eq(pageable));
        assertEquals("me", fc.getValue().usuarioId());
        assertEquals("mes", fc.getValue().search());
    }

    @Test
    public void coleccionForwardsOwnerYPageable() {
        Pageable pageable = PageRequest.of(0, 10);
        when(repository.findByOwnerPaged(any(CatalogoFiltro.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleFigurita()), pageable, 1));
        CatalogoFiltro filtro = new CatalogoFiltro("owner-1", null, null, null, "AR", null, null);

        Page<FiguritaResponseDTO> res = service.obtenerPorUserIdPaginado(filtro, pageable);

        assertEquals(1, res.getTotalElements());
        ArgumentCaptor<CatalogoFiltro> fc = ArgumentCaptor.forClass(CatalogoFiltro.class);
        verify(repository).findByOwnerPaged(fc.capture(), eq(pageable));
        assertEquals("owner-1", fc.getValue().usuarioId());
        assertEquals("AR", fc.getValue().seleccion());
    }

    @Test
    public void repetidasForwardsFiltroYPageable() {
        Pageable pageable = PageRequest.of(1, 10);
        when(repository.findRepetidasPaged(any(CatalogoFiltro.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleFigurita()), pageable, 11));
        CatalogoFiltro filtro = new CatalogoFiltro("owner-1", null, null, null, null, null, null);

        Page<FiguritaResponseDTO> res = service.obtenerRepetidasPaginado(filtro, pageable);

        assertEquals(11, res.getTotalElements());
        ArgumentCaptor<Pageable> pc = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findRepetidasPaged(any(CatalogoFiltro.class), pc.capture());
        assertEquals(1, pc.getValue().getPageNumber());
        assertEquals(10, pc.getValue().getPageSize());
    }

    @Test
    public void faltantesForwardsFiltroYPageable() {
        Pageable pageable = PageRequest.of(0, 10);
        when(figuritaBaseRepository.findFaltantesPaged(any(CatalogoFiltro.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleBase()), pageable, 1));
        CatalogoFiltro filtro = new CatalogoFiltro("owner-1", null, null, "mes", null, null, null);

        Page<FiguritaBaseDTO> res = service.obtenerFaltantesPaginado(filtro, pageable);

        assertEquals(1, res.getTotalElements());
        assertEquals("b1", res.getContent().get(0).getId());
        ArgumentCaptor<CatalogoFiltro> fc = ArgumentCaptor.forClass(CatalogoFiltro.class);
        verify(figuritaBaseRepository).findFaltantesPaged(fc.capture(), eq(pageable));
        assertEquals("owner-1", fc.getValue().usuarioId());
    }

    @Test
    public void searchBasesForwardsTextoYPageable() {
        Pageable pageable = PageRequest.of(0, 10);
        when(figuritaBaseRepository.searchPaged(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleBase()), pageable, 1));

        Page<FiguritaBaseDTO> res = service.buscarBasesPaginado("messi", pageable);

        assertEquals(1, res.getTotalElements());
        ArgumentCaptor<String> sc = ArgumentCaptor.forClass(String.class);
        verify(figuritaBaseRepository).searchPaged(sc.capture(), eq(pageable));
        assertEquals("messi", sc.getValue());
    }

    @Test
    public void maestroSinExcludeUsaSearchPaged() {
        Pageable pageable = PageRequest.of(0, 10);
        when(figuritaBaseRepository.searchPaged(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleBase()), pageable, 1));

        Page<FiguritaBaseDTO> res = service.buscarMaestroPaginado("messi", null, pageable);

        assertEquals(1, res.getTotalElements());
        ArgumentCaptor<String> sc = ArgumentCaptor.forClass(String.class);
        verify(figuritaBaseRepository).searchPaged(sc.capture(), eq(pageable));
        assertEquals("messi", sc.getValue());
    }

    @Test
    public void maestroConExcludeUsaFaltantesPagedConSearch() {
        Pageable pageable = PageRequest.of(0, 10);
        when(figuritaBaseRepository.findFaltantesPaged(any(CatalogoFiltro.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleBase()), pageable, 1));

        Page<FiguritaBaseDTO> res = service.buscarMaestroPaginado("mes", "owner-1", pageable);

        assertEquals(1, res.getTotalElements());
        ArgumentCaptor<CatalogoFiltro> fc = ArgumentCaptor.forClass(CatalogoFiltro.class);
        verify(figuritaBaseRepository).findFaltantesPaged(fc.capture(), eq(pageable));
        assertEquals("owner-1", fc.getValue().usuarioId());
        assertEquals("mes", fc.getValue().search());
    }
}
