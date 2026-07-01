package com.grupo3.tp.service;

import com.grupo3.tp.models.Intercambio;
import com.grupo3.tp.models.Role;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.IntercambioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
    @Mock IntercambioRepository intercambioRepo;
    @Mock CalificacionService calificacionService;
    @InjectMocks DemoSeedService service;

    @Test
    void resetDropeaLas16ColeccionesIncluyendoPublicadas() {
        service.reset();
        for (String c : DemoSeedService.COLECCIONES) {
            verify(mongoTemplate).dropCollection(c);
        }
        assertEquals(16, DemoSeedService.COLECCIONES.length);
        assertTrue(java.util.Arrays.asList(DemoSeedService.COLECCIONES).contains("figuritas_publicadas"));
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

    @Test
    void seedCalificacionesMarcaElIntercambioComoCalificadoPorAmbasPartes() {
        Usuario a = Usuario.builder().id("u-a").username("a").build();
        Usuario b = Usuario.builder().id("u-b").username("b").build();
        Intercambio it = Intercambio.builder()
                .id("it-1").usuarioGenerador(a).usuarioIntercambiador(b).build();
        when(intercambioRepo.findAll()).thenReturn(java.util.List.of(it));

        service.seedCalificaciones();

        // El seed setea los puntajes embebidos para que el intercambio NO se vea "sin calificar"
        // en el front y no se pueda volver a calificar (evita doble conteo en reputación).
        ArgumentCaptor<Intercambio> captor = ArgumentCaptor.forClass(Intercambio.class);
        verify(intercambioRepo).save(captor.capture());
        assertEquals(5, captor.getValue().getPuntajeIntercambiador()); // b (intercambiador) recibió 5
        assertEquals(4, captor.getValue().getPuntajeGenerador());      // a (generador) recibió 4
    }
}
