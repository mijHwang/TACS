package com.grupo3.tp.service;

import com.grupo3.tp.dtos.SugerenciaResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.FaltanteRepository;
import com.grupo3.tp.repository.FiguritaRepository;
import com.grupo3.tp.repository.SugerenciaRepository;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SugerenciaServiceTest {

    @Mock private SugerenciaRepository sugerenciaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private FiguritaRepository figuritaRepository;
    @Mock private FaltanteRepository faltanteRepository;
    @InjectMocks private SugerenciaService service;

    private Usuario juan;
    private Usuario maria;
    private FiguritaBase base1;
    private FiguritaBase base2;

    private Figurita fig(String id, FiguritaBase base, Usuario owner) {
        return Figurita.builder().id(id).figuritaBase(base).owner(owner).build();
    }

    @BeforeEach
    public void setUp() {
        juan = Usuario.builder().id("user-1").username("juan").build();
        maria = Usuario.builder().id("user-2").username("maria").build();
        base1 = FiguritaBase.builder().id("base-1").numero(1)
                .seleccion(new Seleccion("sel-1", "Argentina", "ARG"))
                .equipo(new Equipo("eq-1", "Equipo"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-1", "Messi")).build();
        base2 = FiguritaBase.builder().id("base-2").numero(2)
                .seleccion(new Seleccion("sel-1", "Argentina", "ARG"))
                .equipo(new Equipo("eq-1", "Equipo"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-2", "Di Maria")).build();
    }

    @Test
    public void generaSugerenciaBidireccional() {
        // juan: 2x base1 (repetida), no base2. maria: 2x base2 (repetida), no base1.
        when(usuarioRepository.findAll()).thenReturn(List.of(juan, maria));
        when(figuritaRepository.findAll()).thenReturn(List.of(
                fig("f1", base1, juan), fig("f2", base1, juan),
                fig("f3", base2, maria), fig("f4", base2, maria)
        ));
        // wishlist declarada: juan quiere base-2, maria quiere base-1 (habilita el match bidireccional)
        when(faltanteRepository.findAll()).thenReturn(List.of(
                Faltante.builder().usuarioId("user-1").figuritaBaseId("base-2").build(),
                Faltante.builder().usuarioId("user-2").figuritaBaseId("base-1").build()
        ));

        service.regenerarTodas();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Sugerencia>> captor = ArgumentCaptor.forClass(List.class);
        // un saveAll por usuario con candidatos (juan y maria)
        verify(sugerenciaRepository, times(2)).saveAll(captor.capture());
        verify(sugerenciaRepository).deleteByUsuarioId("user-1");
        verify(sugerenciaRepository).deleteByUsuarioId("user-2");

        List<Sugerencia> guardadasJuan = captor.getAllValues().stream()
                .flatMap(List::stream).filter(s -> s.getUsuarioId().equals("user-1")).toList();
        assertEquals(1, guardadasJuan.size());
        Sugerencia s = guardadasJuan.get(0);
        assertEquals("user-2", s.getContraparteId());
        assertEquals("maria", s.getContraparteNombre());
        assertEquals(1, s.getFiguritasARecibir().size());
        assertEquals("base-2", s.getFiguritasARecibir().get(0).getFiguritaBaseId());
        assertEquals(1, s.getFiguritasAOfrecer().size());
        assertEquals("base-1", s.getFiguritasAOfrecer().get(0).getFiguritaBaseId());
    }

    @Test
    public void noGeneraSiUnLadoEstaVacio() {
        // juan: 2x base1. maria: 1x base1 (sin repetida y ya tiene base1 -> juan no le ofrece nada).
        when(usuarioRepository.findAll()).thenReturn(List.of(juan, maria));
        when(figuritaRepository.findAll()).thenReturn(List.of(
                fig("f1", base1, juan), fig("f2", base1, juan),
                fig("f3", base1, maria)
        ));
        when(faltanteRepository.findAll()).thenReturn(List.of());

        service.regenerarTodas();

        verify(sugerenciaRepository, never()).saveAll(any());
        verify(sugerenciaRepository).deleteByUsuarioId("user-1");
        verify(sugerenciaRepository).deleteByUsuarioId("user-2");
    }

    @Test
    public void obtenerPorUsuarioMapeaADTO() {
        Sugerencia s = Sugerencia.builder()
                .usuarioId("user-1").contraparteId("user-2").contraparteNombre("maria")
                .figuritasARecibir(List.of()).figuritasAOfrecer(List.of()).build();
        when(sugerenciaRepository.findByUsuarioId("user-1")).thenReturn(List.of(s));

        List<SugerenciaResponseDTO> dtos = service.obtenerPorUsuario("user-1");

        assertEquals(1, dtos.size());
        assertEquals("maria", dtos.get(0).getContraparteNombre());
        verify(sugerenciaRepository).findByUsuarioId("user-1");
    }

    @Test
    public void obtenerPorUsuarioPaginadoMapeaADTOYConservaTotales() {
        Sugerencia s = Sugerencia.builder()
                .usuarioId("user-1").contraparteId("user-2").contraparteNombre("maria")
                .figuritasARecibir(List.of()).figuritasAOfrecer(List.of()).build();
        Pageable pageable = PageRequest.of(0, 10);
        when(sugerenciaRepository.findByUsuarioId(eq("user-1"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(s), pageable, 1));

        Page<SugerenciaResponseDTO> page = service.obtenerPorUsuario("user-1", pageable);

        assertEquals(1, page.getContent().size());
        assertEquals("maria", page.getContent().get(0).getContraparteNombre());
        assertEquals("user-2", page.getContent().get(0).getContraparteId());
        assertEquals(1, page.getTotalElements());
        assertEquals(1, page.getTotalPages());
        assertEquals(0, page.getNumber());
        assertTrue(page.isLast());

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(sugerenciaRepository).findByUsuarioId(eq("user-1"), pageableCaptor.capture());
        assertEquals(0, pageableCaptor.getValue().getPageNumber());
        assertEquals(10, pageableCaptor.getValue().getPageSize());
    }
}
