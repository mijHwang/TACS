package com.grupo3.tp.service;

import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UsuarioServiceTest {

    @Mock
    private UsuarioRepository repo;

    @InjectMocks
    private UsuarioService service;

    private Usuario usuario1;
    private Usuario usuario2;
    private Usuario usuario3;

    @BeforeEach
    public void setUp() {
        usuario1 = Usuario.builder()
                .id("user-1")
                .username("juan")
                .email("juan@example.com")
                .password("password123")
                .build();

        usuario2 = Usuario.builder()
                .id("user-2")
                .username("maria")
                .email("maria@example.com")
                .password("password456")
                .build();

        usuario3 = Usuario.builder()
                .id("user-3")
                .username("carlos")
                .email("carlos@example.com")
                .password("password789")
                .build();
    }

    // ============= LOAD USER BY USERNAME TESTS =============
    @Test
    public void testLoadUserByUsernameExistente() {
        when(repo.findByUsername("juan")).thenReturn(Optional.of(usuario1));

        Usuario result = service.loadUserByUsername("juan");

        assertNotNull(result);
        assertEquals("user-1", result.getId());
        assertEquals("juan", result.getUsername());
        assertEquals("juan@example.com", result.getEmail());
        verify(repo, times(1)).findByUsername("juan");
    }

    @Test
    public void testLoadUserByUsernameNoExistente() {
        when(repo.findByUsername("noexiste")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername("noexiste"));
        verify(repo, times(1)).findByUsername("noexiste");
    }

    // ============= CREAR TESTS =============
    @Test
    public void testCrearUsuario() {
        when(repo.save(any(Usuario.class))).thenReturn(usuario1);

        Usuario result = service.crear(usuario1);

        assertNotNull(result);
        assertEquals("user-1", result.getId());
        assertEquals("juan", result.getUsername());

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(repo).save(captor.capture());
        assertEquals("juan", captor.getValue().getUsername());
    }

    @Test
    public void testCrearUsuarioThrowsException() {
        when(repo.save(any(Usuario.class)))
                .thenThrow(new RuntimeException("Database error"));

        assertThrows(RuntimeException.class, () -> service.crear(usuario1));
        verify(repo, times(1)).save(any(Usuario.class));
    }

    // ============= OBTENER POR ID TESTS =============
    @Test
    public void testObtenerPorIdExistente() {
        when(repo.findById("user-1")).thenReturn(Optional.of(usuario1));

        Optional<Usuario> result = service.obtenerPorId("user-1");

        assertTrue(result.isPresent());
        assertEquals("user-1", result.get().getId());
        assertEquals("juan", result.get().getUsername());
        verify(repo, times(1)).findById("user-1");
    }

    @Test
    public void testObtenerPorIdNoExistente() {
        when(repo.findById("user-999")).thenReturn(Optional.empty());

        Optional<Usuario> result = service.obtenerPorId("user-999");

        assertFalse(result.isPresent());
        verify(repo, times(1)).findById("user-999");
    }

    // ============= OBTENER TODOS TESTS =============
    @Test
    public void testObtenerTodos() {
        List<Usuario> testList = new ArrayList<>();
        testList.add(usuario1);
        testList.add(usuario2);
        testList.add(usuario3);

        when(repo.findAll()).thenReturn(testList);

        List<Usuario> result = service.obtenerTodos();

        assertTrue(result.containsAll(testList));
        assertEquals(3, result.size());
        verify(repo, times(1)).findAll();
    }

    @Test
    public void testObtenerTodosListaVacia() {
        List<Usuario> testList = new ArrayList<>();

        when(repo.findAll()).thenReturn(testList);

        List<Usuario> result = service.obtenerTodos();

        assertTrue(result.isEmpty());
        verify(repo, times(1)).findAll();
    }

    // ============= ACTUALIZAR TESTS =============
    @Test
    public void testActualizarUsuarioExistente() {
        Usuario usuarioActualizado = Usuario.builder()
                .id("user-1")
                .username("juan_updated")
                .email("juan_new@example.com")
                .password("newpassword")
                .build();

        when(repo.findById("user-1")).thenReturn(Optional.of(usuario1));
        when(repo.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        Optional<Usuario> result = service.actualizar("user-1", usuarioActualizado);

        assertTrue(result.isPresent());
        assertEquals("user-1", result.get().getId());
        assertEquals("juan_updated", result.get().getUsername());
        assertEquals("juan_new@example.com", result.get().getEmail());
    }

    @Test
    public void testActualizarUsuarioNoExistente() {
        when(repo.findById("user-999")).thenReturn(Optional.empty());

        Optional<Usuario> result = service.actualizar("user-999", usuario1);

        assertFalse(result.isPresent());
        verify(repo, never()).save(any());
    }

    // ============= ELIMINAR TESTS =============
    @Test
    public void testEliminarUsuarioExistente() {
        when(repo.existsById("user-1")).thenReturn(true);

        boolean result = service.eliminar("user-1");

        assertTrue(result);
        verify(repo).deleteById("user-1");
    }

    @Test
    public void testEliminarUsuarioNoExistente() {
        when(repo.existsById("user-999")).thenReturn(false);

        boolean result = service.eliminar("user-999");

        assertFalse(result);
        verify(repo, never()).deleteById(any());
    }
}