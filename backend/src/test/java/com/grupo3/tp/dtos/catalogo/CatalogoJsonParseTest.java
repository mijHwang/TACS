package com.grupo3.tp.dtos.catalogo;

import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;

class CatalogoJsonParseTest {

    @Test
    void parseaElFixture() throws Exception {
        ObjectMapper om = new ObjectMapper();
        CatalogoJson cat;
        try (InputStream is = new ClassPathResource("data/figuritas-test.json").getInputStream()) {
            cat = om.readValue(is, CatalogoJson.class);
        }
        assertEquals(1, cat.selecciones().size());
        SeleccionJson arg = cat.selecciones().get(0);
        assertEquals("Argentina", arg.nombre());
        assertEquals("CONMEBOL", arg.confederacion());
        assertEquals(2, arg.jugadores().size());
        assertEquals("Lionel Messi", arg.jugadores().get(0).nombre());
        assertEquals("https://img/messi.png", arg.jugadores().get(0).imagenUrl());
        assertNull(arg.jugadores().get(1).imagenUrl());
    }
}
