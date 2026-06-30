package com.grupo3.tp.service;

import com.grupo3.tp.dtos.catalogo.CatalogoJson;
import com.grupo3.tp.dtos.catalogo.JugadorJson;
import com.grupo3.tp.dtos.catalogo.SeleccionJson;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class CatalogoDatasetTest {

    @Test
    void datasetRealEsValido() throws Exception {
        ObjectMapper om = new ObjectMapper();
        CatalogoJson cat;
        try (InputStream is = new ClassPathResource("data/figuritas-mundial-2026.json").getInputStream()) {
            cat = om.readValue(is, CatalogoJson.class);
        }

        assertEquals(48, cat.selecciones().size(), "deben ser 48 selecciones");
        assertEquals("Argentina", cat.selecciones().get(0).nombre(), "Argentina debe ir primera");

        Set<String> categoriasValidas = Set.of("Oro", "Plata", "Bronce");
        int totalJugadores = 0;
        for (SeleccionJson s : cat.selecciones()) {
            assertNotNull(s.confederacion());
            assertFalse(s.confederacion().isBlank(), "confederación vacía en " + s.nombre());
            assertFalse(s.jugadores().isEmpty(), "selección sin jugadores: " + s.nombre());
            for (JugadorJson j : s.jugadores()) {
                assertFalse(j.nombre().isBlank(), "jugador sin nombre en " + s.nombre());
                assertFalse(j.club().isBlank(), "jugador sin club: " + j.nombre());
                assertTrue(categoriasValidas.contains(j.categoria()),
                        "categoria inválida (" + j.categoria() + ") en " + j.nombre());
                totalJugadores++;
            }
        }
        assertTrue(totalJugadores >= 700, "se esperaban ~850 jugadores; hubo " + totalJugadores);
    }
}
