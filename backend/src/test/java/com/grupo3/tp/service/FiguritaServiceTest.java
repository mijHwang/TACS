package com.grupo3.tp.service;

import com.grupo3.tp.dtos.FiguritaBaseDTO;
import com.grupo3.tp.dtos.FiguritaResponseDTO;
import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.FiguritaBaseRepository;
import com.grupo3.tp.repository.FiguritaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FiguritaServiceTest {

    @Mock private FiguritaRepository repository;
    @Mock private FiguritaBaseRepository figuritaBaseRepository;
    @InjectMocks private FiguritaService service;

    private Usuario owner;
    private FiguritaBase base1;
    private FiguritaBase base2;
    private Figurita figurita;

    @BeforeEach
    public void setUp() {
        owner = Usuario.builder().id("user-1").username("pepe").build();
        Jugador jugador = Jugador.builder().nombre("Messi").build();
        Seleccion seleccion = Seleccion.builder().nombre("Argentina").build();
        Equipo equipo = Equipo.builder().nombre("Inter Miami").build();
        CategoriaFigurita categoria = CategoriaFigurita.builder().nombre("Oro").build();

        base1 = FiguritaBase.builder()
                .id("base-1")
                .numero(10)
                .jugador(jugador)
                .seleccion(seleccion)
                .equipo(equipo)
                .categoria(categoria)
                .build();
        base2 = FiguritaBase.builder()
                .id("base-2")
                .numero(11)
                .jugador(jugador)
                .seleccion(seleccion)
                .equipo(equipo)
                .categoria(categoria)
                .build();

        figurita = Figurita.builder()
                .id("fig-1")
                .figuritaBase(base1)
                .owner(owner)
                .build();
    }

    @Test
    public void testObtenerPorUserIdAgrupaCorrectamente() {
        Figurita figuritaRepetida = Figurita.builder()
                .id("fig-2")
                .figuritaBase(base1)
                .owner(owner)
                .build();
        when(repository.findByFiguritaOwnerId("user-1")).thenReturn(List.of(figurita, figuritaRepetida));

        List<FiguritaResponseDTO> result = service.obtenerPorUserId("user-1");

        assertEquals(1, result.size(), "Should group duplicates into a single DTO");
        assertEquals(2, result.get(0).getCount(), "Count should be 2 for the grouped sticker");
        // DTO usa getJugadorNombre(), no getJugador()
        assertEquals("Messi", result.get(0).getJugadorNombre());
    }

    @Test
    public void testObtenerFaltantes() {
        when(figuritaBaseRepository.findAll()).thenReturn(List.of(base1, base2));
        when(repository.findByFiguritaOwnerId("user-1")).thenReturn(List.of(figurita));

        List<FiguritaBaseDTO> result = service.obtenerFaltantes("user-1");

        assertEquals(1, result.size());
        assertEquals("base-2", result.get(0).getId(), "Should only return base2 as missing");
    }

    @Test
    public void testTransferirExito() {
        Usuario newOwner = Usuario.builder().id("user-2").build();
        when(repository.existsById("fig-1")).thenReturn(true);
        when(repository.findById("fig-1")).thenReturn(Optional.of(figurita));
        when(repository.save(any(Figurita.class))).thenAnswer(i -> i.getArgument(0));

        Optional<Figurita> result = service.transferir("fig-1", newOwner);

        assertTrue(result.isPresent());
        assertEquals("user-2", result.get().getOwner().getId());
    }
}