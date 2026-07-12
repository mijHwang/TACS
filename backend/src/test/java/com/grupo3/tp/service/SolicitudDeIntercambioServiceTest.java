package com.grupo3.tp.service;

import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.SolicitudDeIntercambio;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.SolicitudDeIntercambioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;  // NEW

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SolicitudDeIntercambioServiceTest {

    @Mock private SolicitudDeIntercambioRepository repository;
    @Mock private NotificacionService notificacionService;
    @Mock private FiguritaService figuritaService;
    @Mock private IntercambioService intercambioService;
    @Mock private FiguritaPublicadaService figuritaPublicadaService;
    @Mock private MongoTemplate mongoTemplate;  // NEW

    private SolicitudDeIntercambioService service;

    private Usuario owner;
    private Usuario generador;
    private Figurita figuritaDeseada;
    private SolicitudDeIntercambio solicitud;

    @BeforeEach
    public void setUp() {
        service = new SolicitudDeIntercambioService(repository, notificacionService, figuritaService, intercambioService, figuritaPublicadaService, mongoTemplate);  // NEW: added mongoTemplate

        owner = Usuario.builder().id("user-owner").username("owner").build();
        generador = Usuario.builder().id("user-gen").username("gen").build();
        figuritaDeseada = Figurita.builder().id("fig-1").owner(owner).build();

        solicitud = SolicitudDeIntercambio.builder()
                .id("sol-1")
                .usuario(generador)
                .figurita(figuritaDeseada)
                .estado(SolicitudDeIntercambio.EstadoSolicitud.PENDIENTE)
                .build();
    }

    @Test
    public void testObtenerRecibidasPaginadoDevuelvePageConTotales() {
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "id"));
        Page<SolicitudDeIntercambio> repoPage =
                new PageImpl<>(List.of(solicitud), PageRequest.of(0, 10), 1);
        when(repository.findByFiguritaOwnerId("user-owner", pageable)).thenReturn(repoPage);

        Page<SolicitudDeIntercambio> result = service.obtenerRecibidas("user-owner", pageable);

        assertEquals(1, result.getContent().size());
        assertEquals("sol-1", result.getContent().get(0).getId());
        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getTotalPages());
        assertEquals(0, result.getNumber());
        assertTrue(result.isLast());

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findByFiguritaOwnerId(eq("user-owner"), captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(10, captor.getValue().getPageSize());
    }

    @Test
    public void testObtenerEnviadasPaginadoDevuelvePageConTotales() {
        Pageable pageable = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "id"));
        Page<SolicitudDeIntercambio> repoPage =
                new PageImpl<>(List.of(solicitud), PageRequest.of(0, 10), 1);
        when(repository.findByUsuarioId("user-gen", pageable)).thenReturn(repoPage);

        Page<SolicitudDeIntercambio> result = service.obtenerEnviadas("user-gen", pageable);

        assertEquals(1, result.getContent().size());
        assertEquals("sol-1", result.getContent().get(0).getId());
        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getTotalPages());
        assertEquals(0, result.getNumber());
        assertTrue(result.isLast());

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findByUsuarioId(eq("user-gen"), captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(10, captor.getValue().getPageSize());
    }
}