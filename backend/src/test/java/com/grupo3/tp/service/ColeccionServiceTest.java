package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.FaltanteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ColeccionServiceTest {

    @Mock private FiguritaService figuritaService;
    @Mock private FiguritaBaseService figuritaBaseService;
    @Mock private UsuarioService usuarioService;
    @Mock private FaltanteRepository faltanteRepository;

    private ColeccionService service;

    private Usuario juan;
    private FiguritaBase base1;

    private Figurita fig(String id, FiguritaBase base, Usuario owner) {
        return Figurita.builder().id(id).figuritaBase(base).owner(owner).build();
    }

    @BeforeEach
    public void setUp() {
        service = new ColeccionService(figuritaService, figuritaBaseService, usuarioService, faltanteRepository);
        juan = Usuario.builder().id("user-1").username("juan").build();
        base1 = FiguritaBase.builder().id("base-1").numero(1)
                .seleccion(new Seleccion("sel-1", "Argentina", "ARG"))
                .equipo(new Equipo("eq-1", "Equipo"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-1", "Messi")).build();
    }

    @Test
    public void setCantidadCreaLasCopiasFaltantes() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1"))
                .thenReturn(List.of(fig("f1", base1, juan))); // ya tiene 1
        when(figuritaService.crear(any(Figurita.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        FiguritaResponseDTO dto = service.setCantidad("juan", "base-1", 3);

        // de 1 a 3 => crea 2
        verify(figuritaService, times(2)).crear(any(Figurita.class));
        assertEquals(3, dto.getCount());
        assertEquals("base-1", dto.getFiguritaBaseId());
        assertEquals("Messi", dto.getJugadorNombre());
    }

    @Test
    public void setCantidadIgualEsNoOp() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1"))
                .thenReturn(List.of(fig("f1", base1, juan), fig("f2", base1, juan)));

        FiguritaResponseDTO dto = service.setCantidad("juan", "base-1", 2);

        verify(figuritaService, never()).crear(any());
        verify(figuritaService, never()).eliminar(any());
        assertEquals(2, dto.getCount());
    }

    @Test
    public void setCantidadMenorLanza409EnFaseA() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1"))
                .thenReturn(List.of(fig("f1", base1, juan), fig("f2", base1, juan)));

        assertThrows(ResponseStatusException.class,
                () -> service.setCantidad("juan", "base-1", 1));
    }

    @Test
    public void agregarFaltanteGuardaSiNoLaPoseeNiExiste() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1")).thenReturn(List.of());
        when(faltanteRepository.existsByUsuarioIdAndFiguritaBaseId("user-1", "base-1")).thenReturn(false);

        service.agregarFaltante("juan", "base-1");

        verify(faltanteRepository).save(argThat(f ->
                f.getUsuarioId().equals("user-1") && f.getFiguritaBaseId().equals("base-1")));
    }

    @Test
    public void agregarFaltanteEsIdempotente() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1")).thenReturn(List.of());
        when(faltanteRepository.existsByUsuarioIdAndFiguritaBaseId("user-1", "base-1")).thenReturn(true);

        service.agregarFaltante("juan", "base-1");

        verify(faltanteRepository, never()).save(any());
    }

    @Test
    public void agregarFaltanteRechazaSiYaLaPosee() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(figuritaBaseService.obtenerPorId("base-1")).thenReturn(Optional.of(base1));
        when(figuritaService.obtenerTodasInternaPorUserId("user-1"))
                .thenReturn(List.of(fig("f1", base1, juan)));

        assertThrows(ResponseStatusException.class,
                () -> service.agregarFaltante("juan", "base-1"));
        verify(faltanteRepository, never()).save(any());
    }

    @Test
    public void quitarFaltante404SiNoEstaba() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        when(faltanteRepository.deleteByUsuarioIdAndFiguritaBaseId("user-1", "base-1")).thenReturn(0L);

        assertThrows(ResponseStatusException.class,
                () -> service.quitarFaltante("juan", "base-1"));
    }

    @Test
    public void listarFaltantesMapeaABaseDTO() {
        when(usuarioService.loadUserByUsername("juan")).thenReturn(juan);
        Faltante f = Faltante.builder().id("falt-1").usuarioId("user-1")
                .figuritaBaseId("base-1").figuritaBase(base1).build();
        Pageable pageable = PageRequest.of(0, 10);
        when(faltanteRepository.findByUsuarioId("user-1", pageable))
                .thenReturn(new PageImpl<>(List.of(f), pageable, 1));

        Page<FiguritaBaseDTO> page = service.listarFaltantes("juan", pageable);

        assertEquals(1, page.getTotalElements());
        assertEquals("base-1", page.getContent().get(0).getId());
        assertEquals("Messi", page.getContent().get(0).getJugadorNombre());
    }
}
