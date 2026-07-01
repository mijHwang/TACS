package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaPublicadaResponseDTO;
import com.grupo3.tp.models.CategoriaFigurita;
import com.grupo3.tp.models.Equipo;
import com.grupo3.tp.models.EstadoPublicacion;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.models.FiguritaPublicada;
import com.grupo3.tp.models.Jugador;
import com.grupo3.tp.models.Seleccion;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.FiguritaPublicadaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
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

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests del slice de paginado de "publicaciones disponibles".
 *
 * NOTA: la correctitud de la query de Mongo en {@code FiguritaPublicadaRepositoryImpl}
 * (Criteria estado == DISPONIBLE AND usuario != caller, sort fechaPublicacion DESC, paginado
 * vía PageableExecutionUtils) NO se cubre acá: requeriría un Mongo vivo. Esa parte queda
 * cubierta por el E2E (Puppeteer) contra la app corriendo. Acá mockeamos el repositorio y
 * verificamos que el service mapea la Page<FiguritaPublicada> a Page<DTO> conservando totales
 * y que delega en el repo con el Pageable recibido.
 */
@ExtendWith(MockitoExtension.class)
public class FiguritaPublicadaServiceTest {

    @Mock
    private FiguritaPublicadaRepository repository;

    @Mock
    private FiguritaService figuritaService;

    @Mock
    private UsuarioService usuarioService;

    @Mock
    private NotificacionService notificacionService;

    @Mock
    private UsuarioRepository usuarioRepository;

    private FiguritaPublicadaService service;

    private FiguritaPublicada publicacion;

    @BeforeEach
    public void setUp() {
        service = new FiguritaPublicadaService(repository, figuritaService, usuarioService, notificacionService, usuarioRepository);

        Usuario owner = Usuario.builder()
                .id("user-2")
                .username("maria")
                .email("maria@example.com")
                .build();

        FiguritaBase base = FiguritaBase.builder()
                .id("fig-base-1")
                .numero(1)
                .seleccion(new Seleccion("sel-1", "Argentina", "A"))
                .equipo(new Equipo("eq-1", "River"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-1", "Messi"))
                .build();

        Figurita figurita = Figurita.builder()
                .id("fig-1")
                .figuritaBase(base)
                .owner(owner)
                .build();

        publicacion = FiguritaPublicada.builder()
                .id("pub-1")
                .figuritas(List.of(figurita))
                .usuario(owner)
                .figuritaBaseId("fig-base-1")
                .fechaPublicacion(LocalDateTime.now())
                .estado(EstadoPublicacion.DISPONIBLE)
                .build();
    }

    @Test
    public void obtenerDisponiblesMapeaLaPaginaYConservaTotales() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<FiguritaPublicada> repoPage =
                new PageImpl<>(List.of(publicacion), pageable, 1);
        when(repository.findDisponibles(eq("user-1"), eq(pageable))).thenReturn(repoPage);

        Page<FiguritaPublicadaResponseDTO> result = service.obtenerDisponibles("user-1", pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getTotalPages());
        assertEquals(0, result.getNumber());
        assertEquals(10, result.getSize());
        assertTrue(result.isLast());
        assertEquals(1, result.getContent().size());

        FiguritaPublicadaResponseDTO dto = result.getContent().get(0);
        assertEquals("pub-1", dto.getId());
        assertEquals("fig-base-1", dto.getFiguritaBaseId());
        assertEquals("Messi", dto.getFiguritaJugadorNombre());
        assertEquals("user-2", dto.getUsuarioId());
        assertEquals("maria", dto.getUsuarioUsername());
        assertEquals(EstadoPublicacion.DISPONIBLE.name(), dto.getEstado());
        assertEquals(List.of("fig-1"), dto.getFiguritaIds());
        assertEquals(1, dto.getCantidad());
    }

    @Test
    public void obtenerDisponiblesDelegaConElPageable() {
        Pageable pageable = PageRequest.of(0, 10);
        when(repository.findDisponibles(eq("user-1"), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(publicacion), pageable, 1));

        service.obtenerDisponibles("user-1", pageable);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findDisponibles(eq("user-1"), captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(10, captor.getValue().getPageSize());
    }
}
