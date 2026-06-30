package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaPublicadaRequestDTO;
import com.grupo3.tp.dtos.FiguritaPublicadaResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.FiguritaPublicadaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
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
public class FiguritaPublicadaServiceTest {

    @Mock private FiguritaPublicadaRepository repository;
    @Mock private FiguritaService figuritaService;
    @Mock private UsuarioService usuarioService;
    @Mock private NotificacionService notificacionService;
    @Mock private UsuarioRepository usuarioRepository;

    @InjectMocks private FiguritaPublicadaService service;

    private Usuario usuario;
    private Figurita figurita;
    private FiguritaBase base;

    @BeforeEach
    public void setUp() {
        usuario = Usuario.builder().id("user-1").username("pepe").build();
        Jugador jugador = Jugador.builder().nombre("Messi").build();
        base = FiguritaBase.builder().id("base-1").numero(10).jugador(jugador)
                .seleccion(Seleccion.builder().nombre("Arg").build())
                .equipo(Equipo.builder().nombre("Miami").build())
                .categoria(CategoriaFigurita.builder().nombre("Oro").build())
                .build();
        figurita = Figurita.builder().id("fig-1").figuritaBase(base).owner(usuario).build();
    }

    @Test
    public void testPublicarFallaPorFaltaDeStock() {
        FiguritaPublicadaRequestDTO request = new FiguritaPublicadaRequestDTO();
        request.setUsuarioId("user-1");
        request.setFiguritaBaseId("base-1");
        request.setCantidad(2); // Solicita publicar 2

        // El usuario solo tiene 1 figurita
        when(figuritaService.obtenerTodasInternaPorUserId("user-1")).thenReturn(List.of(figurita));
        when(repository.findByUsuarioId("user-1")).thenReturn(List.of());

        Exception exception = assertThrows(IllegalArgumentException.class, () -> service.publicar(request));
        assertTrue(exception.getMessage().contains("Solo tenés 1 figuritas disponibles"));
    }

    @Test
    public void testPublicarExitoYNotifica() {
        FiguritaPublicadaRequestDTO request = new FiguritaPublicadaRequestDTO();
        request.setUsuarioId("user-1");
        request.setFiguritaBaseId("base-1");
        request.setCantidad(1);

        when(figuritaService.obtenerTodasInternaPorUserId("user-1")).thenReturn(List.of(figurita));
        when(repository.findByUsuarioId("user-1")).thenReturn(List.of());
        when(usuarioService.obtenerPorId("user-1")).thenReturn(Optional.of(usuario));

        FiguritaPublicada publicacionGuardada = FiguritaPublicada.builder()
                .id("pub-1").usuario(usuario).figuritas(List.of(figurita)).estado(EstadoPublicacion.DISPONIBLE)
                .build();

        when(repository.save(any())).thenReturn(publicacionGuardada);
        when(usuarioRepository.findUsuariosQueLesFaltaFigurita("base-1")).thenReturn(List.of(new Usuario()));

        FiguritaPublicadaResponseDTO result = service.publicar(request);

        assertNotNull(result);
        assertEquals("pub-1", result.getId());
        verify(notificacionService, times(1)).notificarUsuariosFaltantes(anyList(), eq("Messi"), eq("user-1"));
    }

    @Test
    public void testRemoveFiguritaFromPublications() {
        List<Figurita> list = new ArrayList<>();
        list.add(figurita);
        FiguritaPublicada pub = FiguritaPublicada.builder().id("pub-1").figuritas(list).estado(EstadoPublicacion.DISPONIBLE).build();

        when(repository.findByFiguritaId("fig-1")).thenReturn(List.of(pub));

        service.removeFiguritaFromPublications("fig-1");

        assertTrue(pub.getFiguritas().isEmpty());
        assertEquals(EstadoPublicacion.RETIRADA, pub.getEstado());
        verify(repository, times(1)).save(pub);
    }
}