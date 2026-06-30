package com.grupo3.tp.service;

import com.grupo3.tp.dtos.SubastaDTO;
import com.grupo3.tp.dtos.SubastaResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.SubastaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubastaServiceTest {

    @Mock private SubastaRepository repository;
    @Mock private FiguritaService figuritaService;
    @Mock private NotificacionService notificacionService;
    @Mock private UsuarioService usuarioService;
    @Mock private UsuarioRepository usuarioRepository;

    @InjectMocks
    private SubastaService service;

    private Usuario creador;
    private Usuario ofertante;
    private Figurita figurita;
    private Subasta subasta;

    @BeforeEach
    public void setUp() {
        creador = Usuario.builder().id("user-1").username("creador").build();
        ofertante = Usuario.builder().id("user-2").username("ofertante").build();

        FiguritaBase base = FiguritaBase.builder()
                .id("base-1")
                .numero(10)
                .jugador(new Jugador("jug-1", "Messi"))
                .seleccion(new Seleccion("sel-1", "Argentina", "ARG"))
                .equipo(new Equipo("eq-1", "Inter Miami"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .build();

        figurita = Figurita.builder()
                .id("fig-1")
                .owner(creador)
                .figuritaBase(base)
                .build();

        subasta = Subasta.builder()
                .id("sub-1")
                .usuario(creador)
                .figurita(figurita)
                .estado(EstadoSubasta.EN_CURSO)
                .ofertas(new ArrayList<>())
                .build();
    }

    // ============= CREAR TESTS =============
    @Test
    public void testCrearSubasta() {
        SubastaDTO dto = new SubastaDTO();
        dto.setUsuarioId("user-1");
        dto.setFiguritaId("fig-1");
        dto.setDuracion(24);

        when(usuarioService.obtenerPorId("user-1")).thenReturn(Optional.of(creador));
        when(figuritaService.obtenerPorId("fig-1")).thenReturn(Optional.of(figurita));
        when(repository.save(any(Subasta.class))).thenAnswer(i -> {
            Subasta s = i.getArgument(0);
            s.setId("sub-nueva");
            return s;
        });
        when(repository.findById("sub-nueva")).thenReturn(Optional.of(subasta));
        when(usuarioRepository.findUsuariosQueLesFaltaFigurita("base-1")).thenReturn(List.of(ofertante));

        Subasta result = service.crear(dto);

        assertNotNull(result);
        verify(repository, times(1)).save(any(Subasta.class));
        verify(notificacionService, times(1)).notificarUsuariosFaltantesSubasta(
                anyList(), eq("Messi"), eq("user-1"), eq("sub-nueva")
        );
    }

    // ============= FINALIZAR TESTS =============
    @Test
    public void testFinalizarSubastaSinOfertas() {
        when(repository.findById("sub-1")).thenReturn(Optional.of(subasta));

        service.finalizar("sub-1");

        assertEquals(EstadoSubasta.FINALIZADA, subasta.getEstado());
        verify(repository, times(1)).save(subasta);
        verify(figuritaService, never()).transferir(any(), any());
    }

    @Test
    public void testFinalizarSubastaConGanador() {
        Figurita figOfrecida = Figurita.builder()
                .id("fig-o-1")
                .owner(ofertante)
                .build();
        Oferta oferta = Oferta.builder()
                .id("of-1")
                .usuario(ofertante)
                .figuritas(List.of(figOfrecida))
                .fechaOferta(LocalDateTime.now())
                .build();

        subasta.getOfertas().add(oferta);
        when(repository.findById("sub-1")).thenReturn(Optional.of(subasta));

        service.finalizar("sub-1");

        assertEquals(EstadoSubasta.FINALIZADA, subasta.getEstado());
        verify(figuritaService, times(1)).transferir("fig-1", ofertante);
        verify(figuritaService, times(1)).transferir("fig-o-1", creador);

        ArgumentCaptor<Notificacion> notifCaptor = ArgumentCaptor.forClass(Notificacion.class);
        verify(notificacionService, times(2)).crear(notifCaptor.capture());
    }

    // ============= DTO MAPPER TESTS =============
    @Test
    public void testMapToDTO() {
        SubastaResponseDTO dto = service.mapToDTO(subasta);

        assertNotNull(dto);
        assertEquals("sub-1", dto.getId());
        // DTO usa usuarioUsername, no usuarioNombre
        assertEquals("creador", dto.getUsuarioUsername());
        // DTO usa figuritaJugadorNombre, no figuritaJugador
        assertEquals("Messi", dto.getFiguritaJugadorNombre());
        assertEquals(0, dto.getOfertasCount());
        assertEquals("Nadie", dto.getLiderUsername());
    }
}