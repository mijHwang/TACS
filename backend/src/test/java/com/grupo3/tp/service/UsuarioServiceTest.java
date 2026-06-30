package com.grupo3.tp.service;

import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UsuarioServiceTest {

    @Mock private UsuarioRepository repository;
    @InjectMocks private UsuarioService service;

    private Usuario usuario;

    @BeforeEach
    public void setUp() {
        usuario = Usuario.builder().id("user-1").username("juan").build();
    }

    @Test
    public void testLoadUserByUsernameExito() {
        when(repository.findByUsername("juan")).thenReturn(Optional.of(usuario));
        Usuario result = service.loadUserByUsername("juan");
        assertEquals("juan", result.getUsername());
    }

    @Test
    public void testLoadUserByUsernameFalla() {
        when(repository.findByUsername(anyString())).thenReturn(Optional.empty());
        assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername("invalido"));
    }

    @Test
    public void testSearchByUsername() {
        when(repository.findByUsernameContainingIgnoreCase("ju")).thenReturn(List.of(usuario));
        List<Usuario> result = service.searchByUsername("ju");
        assertEquals(1, result.size());
        assertEquals("juan", result.get(0).getUsername());
    }
}