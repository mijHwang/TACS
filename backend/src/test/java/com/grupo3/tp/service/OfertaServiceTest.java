package com.grupo3.tp.service;

import com.grupo3.tp.dtos.OfertaDTO;
import com.grupo3.tp.dtos.SubastaDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
public class OfertaServiceTest {

    @Autowired
    private OfertaRepository ofertaRepository;

    @Autowired
    private SubastaRepository subastaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private FiguritaRepository figuritaRepository;

    @MockitoBean
    private NotificacionService notificacionService;

    @MockitoBean
    private UsuarioService usuarioService;

    @MockitoBean
    private FiguritaService figuritaService;

    private OfertaService ofertaService;
    private Usuario usuario1;
    private Usuario usuario2;
    private Subasta subasta;
    private Figurita figurita1;

    @BeforeEach
    public void setup() {
        // Initialize service
        ofertaService = new OfertaService(
                ofertaRepository,
                subastaRepository,
                notificacionService,
                usuarioService,
                figuritaService
        );

        // Create test users
        usuario1 = Usuario.builder()
                .username("user1")
                .password("pass")
                .email("user1@test.com")
                .build();
        usuario1 = usuarioRepository.save(usuario1);

        usuario2 = Usuario.builder()
                .username("user2")
                .password("pass")
                .email("user2@test.com")
                .build();
        usuario2 = usuarioRepository.save(usuario2);

        // Create test figurita
        figurita1 = Figurita.builder()
                .owner(usuario2)
                .build();
        figurita1 = figuritaRepository.save(figurita1);

        // Create test auction
        subasta = Subasta.builder()
                .usuario(usuario2)
                .figurita(figurita1)
                .estado(EstadoSubasta.EN_CURSO)
                .duracion(60)
                .horaInicio(LocalDateTime.now())
                .ofertas(new ArrayList<>())
                .build();
        subasta = subastaRepository.save(subasta);
    }

    @Test
    public void testCrearOferta_Success() {
        // Setup mocks
        when(usuarioService.obtenerPorId(usuario1.getId()))
                .thenReturn(java.util.Optional.of(usuario1));

        Figurita ofrecida = Figurita.builder()
                .owner(usuario1)
                .build();
        ofrecida = figuritaRepository.save(ofrecida);

        when(figuritaService.obtenerPorId(ofrecida.getId()))
                .thenReturn(java.util.Optional.of(ofrecida));

        // Create DTO
        OfertaDTO ofertaDTO = new OfertaDTO();
        ofertaDTO.setUsuarioId(usuario1.getId());
        ofertaDTO.setFiguritaIds(List.of(ofrecida.getId()));

        SubastaDTO subastaDTO = new SubastaDTO();
        subastaDTO.setSubastaId(subasta.getId());

        // Call service
        Oferta result = ofertaService.crear(ofertaDTO, subastaDTO);

        // Assert
        assertNotNull(result.getId());
        assertEquals(usuario1.getId(), result.getUsuario().getId());
        assertEquals(1, result.getFiguritas().size());
        assertEquals(Estado.PENDIENTE, result.getEstado());
        assertNotNull(result.getFechaOferta());

        // Verify notification was sent
        verify(notificacionService, times(1)).crear(any());
    }
}