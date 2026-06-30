package com.grupo3.tp.service;

import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserDetailsServiceImplTest {

    @Mock private UsuarioRepository repository;
    @InjectMocks private UserDetailsServiceImpl service;

    @Test
    public void testLoadUserByUsernameExito() {
        Usuario u = Usuario.builder().username("admin").password("pass").build();
        when(repository.findByUsername("admin")).thenReturn(Optional.of(u));

        UserDetails result = service.loadUserByUsername("admin");

        assertEquals("admin", result.getUsername());
        verify(repository, times(1)).findByUsername("admin");
    }

    @Test
    public void testLoadUserByUsernameNoEncontrado() {
        when(repository.findByUsername("admin")).thenReturn(Optional.empty());
        assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername("admin"));
    }
}