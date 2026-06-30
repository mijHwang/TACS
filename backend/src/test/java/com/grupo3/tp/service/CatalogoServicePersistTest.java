package com.grupo3.tp.service;

import tools.jackson.databind.ObjectMapper;
import com.grupo3.tp.dtos.catalogo.CatalogoJson;
import com.grupo3.tp.dtos.catalogo.JugadorJson;
import com.grupo3.tp.dtos.catalogo.SeleccionJson;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatalogoServicePersistTest {

    @Mock SeleccionRepository seleccionRepo;
    @Mock EquipoRepository equipoRepo;
    @Mock JugadorRepository jugadorRepo;
    @Mock CategoriaFiguritaRepository categoriaRepo;
    @Mock FiguritaBaseRepository figuritaBaseRepo;

    CatalogoService service;

    @BeforeEach
    void setUp() {
        service = new CatalogoService(new ObjectMapper(), seleccionRepo, equipoRepo,
                jugadorRepo, categoriaRepo, figuritaBaseRepo);
        when(seleccionRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(equipoRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(jugadorRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(categoriaRepo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(figuritaBaseRepo.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void persistirAsignaNumeroSecuencialPropagaImagenUrlYDedupClubes() {
        CatalogoJson catalogo = new CatalogoJson("WC", List.of("Oro", "Plata"), List.of(
                new SeleccionJson("Argentina", "CONMEBOL", List.of(
                        new JugadorJson("Messi", "Inter Miami", "Oro", "https://img/messi.png"),
                        new JugadorJson("Dybala", "Roma", "Plata", null))),
                new SeleccionJson("Brazil", "CONMEBOL", List.of(
                        new JugadorJson("Neymar", "Al Hilal", "Oro", "https://img/neymar.png")))));

        CatalogoService.ResultadoCarga r = service.persistirCatalogo(catalogo);

        assertEquals(2, r.selecciones());
        assertEquals(2, r.categorias());
        assertEquals(3, r.equipos());
        assertEquals(3, r.jugadores());
        assertEquals(3, r.figuritasBase());

        ArgumentCaptor<FiguritaBase> cap = ArgumentCaptor.forClass(FiguritaBase.class);
        verify(figuritaBaseRepo, times(3)).save(cap.capture());
        List<FiguritaBase> bases = cap.getAllValues();
        assertEquals(1, bases.get(0).getNumero());
        assertEquals(2, bases.get(1).getNumero());
        assertEquals(3, bases.get(2).getNumero());
        assertEquals("https://img/messi.png", bases.get(0).getImagenUrl());
        assertNull(bases.get(1).getImagenUrl());
        assertEquals("Argentina", bases.get(0).getSeleccion().getNombre());
        assertEquals("CONMEBOL", bases.get(0).getSeleccion().getGrupo());
        verify(equipoRepo, times(3)).save(any());
    }
}
