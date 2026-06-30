package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.models.Figurita;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.models.Seleccion;
import com.grupo3.tp.models.Equipo;
import com.grupo3.tp.models.CategoriaFigurita;
import com.grupo3.tp.models.Jugador;
import com.grupo3.tp.repository.FiguritaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
public class FiguritaServiceTest {

    @Mock
    private FiguritaRepository repo;

    @InjectMocks
    private FiguritaService service;

    private Usuario usuario1;
    private Usuario usuario2;
    private FiguritaBase figuritaBase1;
    private FiguritaBase figuritaBase2;
    private Figurita figurita1;
    private Figurita figurita2;
    private Figurita figurita3;

    @BeforeEach
    public void setUp() {
        usuario1 = Usuario.builder()
                .id("user-1")
                .username("juan")
                .email("juan@example.com")
                .build();

        usuario2 = Usuario.builder()
                .id("user-2")
                .username("maria")
                .email("maria@example.com")
                .build();

        figuritaBase1 = FiguritaBase.builder()
                .id("fig-base-1")
                .numero(1)
                .seleccion(new Seleccion("sel-1", "Argentina", "A"))
                .equipo(new Equipo("eq-1", "River"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-1", "Messi"))
                .build();

        figuritaBase2 = FiguritaBase.builder()
                .id("fig-base-2")
                .numero(2)
                .seleccion(new Seleccion("sel-1", "Argentina", "A"))
                .equipo(new Equipo("eq-1", "River"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-2", "Di Maria"))
                .build();

        figurita1 = Figurita.builder()
                .id("fig-1")
                .figuritaBase(figuritaBase1)
                .owner(usuario1)
                .build();

        figurita2 = Figurita.builder()
                .id("fig-2")
                .figuritaBase(figuritaBase2)
                .owner(usuario2)
                .build();

        figurita3 = Figurita.builder()
                .id("fig-3")
                .figuritaBase(figuritaBase1)
                .owner(usuario1)
                .build();
    }

    // ============= CREAR TESTS =============
    @Test
    public void testCrearFigurita() {
        when(repo.save(any(Figurita.class))).thenReturn(figurita1);

        Figurita result = service.crear(figurita1);

        assertNotNull(result);
        assertEquals("fig-1", result.getId());
        assertEquals("juan", result.getOwner().getUsername());
        assertEquals("Messi", result.getFiguritaBase().getJugador().getNombre());

        ArgumentCaptor<Figurita> captor = ArgumentCaptor.forClass(Figurita.class);
        verify(repo).save(captor.capture());
        assertEquals("fig-1", captor.getValue().getId());
    }

    @Test
    public void testCrearFiguritaThrowsException() {
        when(repo.save(any(Figurita.class)))
                .thenThrow(new RuntimeException("Database error"));

        assertThrows(RuntimeException.class, () -> service.crear(figurita1));
        verify(repo, times(1)).save(any(Figurita.class));
    }

    // ============= OBTENER POR ID TESTS =============
    @Test
    public void testObtenerPorIdExistente() {
        when(repo.findById("fig-1")).thenReturn(Optional.of(figurita1));

        Optional<Figurita> result = service.obtenerPorId("fig-1");

        assertTrue(result.isPresent());
        assertEquals("fig-1", result.get().getId());
        assertEquals("juan", result.get().getOwner().getUsername());
        verify(repo, times(1)).findById("fig-1");
    }

    @Test
    public void testObtenerPorIdNoExistente() {
        when(repo.findById("fig-999")).thenReturn(Optional.empty());

        Optional<Figurita> result = service.obtenerPorId("fig-999");

        assertFalse(result.isPresent());
        verify(repo, times(1)).findById("fig-999");
    }
/*

    // ============= OBTENER TODAS TESTS =============
    @Test
    public void testObtenerTodas() {
        List<Figurita> testList = new ArrayList<>();
        testList.add(figurita1);
        testList.add(figurita2);
        testList.add(figurita3);

        when(repo.findAll()).thenReturn(testList);

        List<FiguritaResponseDTO> result = service.obtenerTodas(usuario1.getId());

        assertTrue(result.containsAll(testList));
        assertEquals(3, result.size());
        verify(repo, times(1)).findAll();
    }
*/

    /*@Test
    public void testObtenerTodasListaVacia() {
        List<Figurita> testList = new ArrayList<>();

        when(repo.findAll()).thenReturn(testList);

        List<Figurita> result = service.obtenerTodas();

        assertTrue(result.isEmpty());
        verify(repo, times(1)).findAll();
    }
*/
    // ============= ACTUALIZAR TESTS =============
    @Test
    public void testActualizarFiguritaExistente() {
        Figurita figuritaActualizada = Figurita.builder()
                .id("fig-1")
                .figuritaBase(figuritaBase2)  // Changed figuritaBase
                .owner(usuario2)              // Changed owner
                .build();

        when(repo.existsById("fig-1")).thenReturn(true);
        when(repo.save(any(Figurita.class))).thenAnswer(i -> i.getArgument(0));

        Optional<Figurita> result = service.actualizar("fig-1", figuritaActualizada);

        assertTrue(result.isPresent());
        assertEquals("fig-1", result.get().getId());

        ArgumentCaptor<Figurita> captor = ArgumentCaptor.forClass(Figurita.class);
        verify(repo).save(captor.capture());
        assertEquals("fig-1", captor.getValue().getId());
        assertEquals("maria", captor.getValue().getOwner().getUsername());
        assertEquals("Di Maria", captor.getValue().getFiguritaBase().getJugador().getNombre());
    }

    @Test
    public void testActualizarFiguritaNoExistente() {
        when(repo.existsById("fig-999")).thenReturn(false);

        Optional<Figurita> result = service.actualizar("fig-999", figurita1);

        assertFalse(result.isPresent());
        verify(repo, never()).save(any());
    }

    // ============= ELIMINAR TESTS =============
    @Test
    public void testEliminarFiguritaExistente() {
        when(repo.existsById("fig-1")).thenReturn(true);

        boolean result = service.eliminar("fig-1");

        assertTrue(result);
        verify(repo).deleteById("fig-1");
    }

    @Test
    public void testEliminarFiguritaNoExistente() {
        when(repo.existsById("fig-999")).thenReturn(false);

        boolean result = service.eliminar("fig-999");

        assertFalse(result);
        verify(repo, never()).deleteById(any());
    }

    // ============= TRANSFERIR TESTS =============
    @Test
    public void testTransferirFiguritaExistente() {
        Figurita figuritaTransferida = Figurita.builder()
                .id("fig-1")
                .figuritaBase(figuritaBase1)
                .owner(usuario2)  // Changed owner
                .build();

        when(repo.existsById("fig-1")).thenReturn(true);
        when(repo.findById("fig-1")).thenReturn(Optional.of(figurita1));
        when(repo.save(any(Figurita.class))).thenAnswer(i -> i.getArgument(0));

        Optional<Figurita> result = service.transferir("fig-1", usuario2);

        assertTrue(result.isPresent());
        assertEquals("fig-1", result.get().getId());

        ArgumentCaptor<Figurita> captor = ArgumentCaptor.forClass(Figurita.class);
        verify(repo).save(captor.capture());
        assertEquals("user-2", captor.getValue().getOwner().getId());
        assertEquals("maria", captor.getValue().getOwner().getUsername());
    }

    @Test
    public void testTransferirFiguritaNoExistente() {
        when(repo.existsById("fig-999")).thenReturn(false);

        Optional<Figurita> result = service.transferir("fig-999", usuario2);

        assertFalse(result.isPresent());
        verify(repo, never()).findById(any());
        verify(repo, never()).save(any());
    }

    @Test
    public void testTransferirCambiaOwnerCorrectamente() {
        when(repo.existsById("fig-1")).thenReturn(true);
        when(repo.findById("fig-1")).thenReturn(Optional.of(figurita1));
        when(repo.save(any(Figurita.class))).thenAnswer(i -> i.getArgument(0));

        Optional<Figurita> result = service.transferir("fig-1", usuario2);

        assertTrue(result.isPresent());
        assertEquals("user-2", result.get().getOwner().getId());
        assertEquals("maria", result.get().getOwner().getUsername());

        // Verify save was called with correct owner
        ArgumentCaptor<Figurita> captor = ArgumentCaptor.forClass(Figurita.class);
        verify(repo).save(captor.capture());
        assertEquals("user-2", captor.getValue().getOwner().getId());
    }

    @Test
    public void testObtenerPorUserIdIncluyeImagenUrl() {
        FiguritaBase baseConFoto = FiguritaBase.builder()
                .id("fig-base-9").numero(9)
                .seleccion(new Seleccion("sel-1", "Argentina", "CONMEBOL"))
                .equipo(new Equipo("eq-9", "Inter Miami"))
                .categoria(new CategoriaFigurita("cat-1", "Oro"))
                .jugador(new Jugador("jug-9", "Lionel Messi"))
                .imagenUrl("https://img.test/messi.png")
                .build();
        Figurita fig = Figurita.builder().id("fig-9").figuritaBase(baseConFoto).owner(usuario1).build();
        when(repo.findByFiguritaOwnerId("user-1")).thenReturn(List.of(fig));

        List<FiguritaResponseDTO> result = service.obtenerPorUserId("user-1");

        assertEquals(1, result.size());
        assertEquals("https://img.test/messi.png", result.get(0).getImagenUrl());
    }
}