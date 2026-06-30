package com.grupo3.tp.service;

import com.grupo3.tp.models.Role;
import com.grupo3.tp.models.Usuario;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class DemoSeedServiceTest {

    @Mock MongoTemplate mongoTemplate;
    @Mock PasswordEncoder passwordEncoder;
    @Mock com.grupo3.tp.repository.FiguritaBaseRepository figuritaBaseRepo;
    @Mock CatalogoService catalogoService;
    @InjectMocks DemoSeedService service;

    @Test
    void resetDropeaLas15Colecciones() {
        service.reset();
        for (String c : DemoSeedService.COLECCIONES) {
            verify(mongoTemplate).dropCollection(c);
        }
        assertEquals(15, DemoSeedService.COLECCIONES.length);
    }

    @Test
    void buildUserEncodeaPasswordYSeteaRol() {
        when(passwordEncoder.encode("demo1234")).thenReturn("HASH");
        Usuario u = service.buildUser("juanca", "demo1234", Role.USER);
        assertEquals("juanca", u.getUsername());
        assertEquals("HASH", u.getPassword());
        assertEquals(Role.USER, u.getRole());
        verify(passwordEncoder).encode("demo1234");
    }

    @Test
    void primerasBasesPorNumeroTomaElSubsetUnoAN() {
        var b1   = com.grupo3.tp.models.FiguritaBase.builder().id("b1").numero(1).build();
        var b48  = com.grupo3.tp.models.FiguritaBase.builder().id("b48").numero(48).build();
        var b49  = com.grupo3.tp.models.FiguritaBase.builder().id("b49").numero(49).build();
        when(figuritaBaseRepo.findAll()).thenReturn(java.util.List.of(b1, b48, b49));

        var sub = service.primerasBasesPorNumero(48);

        assertEquals(2, sub.size());
        assertTrue(sub.containsKey(1));
        assertTrue(sub.containsKey(48));
        assertFalse(sub.containsKey(49));
    }
}
