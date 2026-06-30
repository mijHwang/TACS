package com.grupo3.tp.repository;

import com.grupo3.tp.models.Usuario;
import java.util.List;

public interface UsuarioRepositoryCustom {
    // Finds users who do NOT have this figurita in their collection
    List<Usuario> findUsuariosQueLesFaltaFigurita(String figuritaId);
}