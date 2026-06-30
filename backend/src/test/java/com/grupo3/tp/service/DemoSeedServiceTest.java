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
}
