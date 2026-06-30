package com.grupo3.tp.service;

import com.grupo3.tp.dtos.OfertaDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.OfertaRepository;
import com.grupo3.tp.repository.SubastaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class OfertaServiceTest {

    @Mock private OfertaRepository repository;
    @Mock private SubastaRepository subastaRepository;
    @Mock private NotificacionService notificacionService;
    @Mock private UsuarioService usuarioService;
    @Mock private FiguritaService figuritaService;

    @InjectMocks private OfertaService service;

    private Usuario ofertante;
    private Subasta subasta;
    private Figurita figuritaOfrecida;

    @BeforeEach
    public void setUp() {
        ofertante = Usuario.builder().id("user-1").username("ofertante").build();
        Usuario creador = Usuario.builder().id("user-2").build();

        subasta = Subasta.builder().id("sub-1").usuario(creador).ofertas(new ArrayList<>()).build();
        figuritaOfrecida = Figurita.builder().id("fig-1").owner(ofertante).build();
    }

    @Test
    public void testCrearOfertaExito() {
        OfertaDTO dto = new OfertaDTO();
        dto.setSubastaId("sub-1");
        dto.setUsuarioId("user-1");
        dto.setFiguritaIds(List.of("fig-1"));

        when(subastaRepository.findById("sub-1")).thenReturn(Optional.of(subasta));
        when(usuarioService.obtenerPorId("user-1")).thenReturn(Optional.of(ofertante));
        when(figuritaService.obtenerPorId("fig-1")).thenReturn(Optional.of(figuritaOfrecida));
        when(repository.save(any(Oferta.class))).thenAnswer(i -> i.getArgument(0));

        Oferta result = service.crear(dto);

        assertNotNull(result);
        assertEquals(Estado.PENDIENTE, result.getEstado());
        assertEquals("user-1", result.getUsuario().getId());

        verify(subastaRepository, times(1)).save(subasta);
        verify(notificacionService, times(1)).crear(any(Notificacion.class));
        assertTrue(subasta.getOfertas().contains(result));
    }

    @Test
    public void testCrearOfertaReemplazaExistente() {
        Oferta ofertaVieja = Oferta.builder().id("old-1").usuario(ofertante).build();
        subasta.getOfertas().add(ofertaVieja);

        OfertaDTO dto = new OfertaDTO();
        dto.setSubastaId("sub-1");
        dto.setUsuarioId("user-1");
        dto.setFiguritaIds(List.of("fig-1"));

        when(subastaRepository.findById("sub-1")).thenReturn(Optional.of(subasta));
        when(usuarioService.obtenerPorId("user-1")).thenReturn(Optional.of(ofertante));
        when(figuritaService.obtenerPorId("fig-1")).thenReturn(Optional.of(figuritaOfrecida));
        when(repository.findAll()).thenReturn(List.of(ofertaVieja));
        when(repository.save(any(Oferta.class))).thenAnswer(i -> i.getArgument(0));

        service.crear(dto);

        // Verifica que la oferta vieja fue borrada
        verify(repository, times(1)).delete(ofertaVieja);
        assertFalse(subasta.getOfertas().contains(ofertaVieja));
    }
}