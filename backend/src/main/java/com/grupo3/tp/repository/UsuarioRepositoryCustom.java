package com.grupo3.tp.repository;

import com.grupo3.tp.models.Usuario;

import java.util.List;

public interface UsuarioRepositoryCustom {
    /**
     * Devuelve los usuarios a los que les falta la figurita base indicada,
     * es decir, los que NO poseen ninguna {@code Figurita} con esa
     * {@code figuritaBase} en su colección.
     */
    List<Usuario> findUsuariosQueLesFaltaFigurita(String figuritaBaseId);
}
