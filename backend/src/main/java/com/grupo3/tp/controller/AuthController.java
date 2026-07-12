package com.grupo3.tp.controller;

import com.grupo3.tp.dtos.LoginRequestDTO;
import com.grupo3.tp.dtos.UsuarioDTO;
import com.grupo3.tp.models.Role;
import com.grupo3.tp.models.Usuario;
import com.grupo3.tp.service.UsuarioService;
import com.grupo3.tp.utils.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UsuarioService usuarioService;
    private final PasswordEncoder passwordEncoder;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService,
                          UsuarioService usuarioService, PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.usuarioService = usuarioService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody LoginRequestDTO request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );
        Usuario usuario = usuarioService.loadUserByUsername(request.getUsername());
        return ResponseEntity.ok(jwtService.generateToken(usuario));
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@RequestBody UsuarioDTO usuariodto) {
        Usuario usuario = Usuario.builder()
                .username(usuariodto.getUsername())
                .password(passwordEncoder.encode(usuariodto.getPassword()))
                .email(usuariodto.getEmail())
                .role(Role.USER)
                .build();
        usuarioService.crear(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
