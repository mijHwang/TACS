package com.grupo3.tp.service;

import tools.jackson.databind.ObjectMapper;
import com.grupo3.tp.dtos.catalogo.CatalogoJson;
import com.grupo3.tp.dtos.catalogo.JugadorJson;
import com.grupo3.tp.dtos.catalogo.SeleccionJson;
import com.grupo3.tp.models.CategoriaFigurita;
import com.grupo3.tp.models.Equipo;
import com.grupo3.tp.models.FiguritaBase;
import com.grupo3.tp.models.Jugador;
import com.grupo3.tp.models.Seleccion;
import com.grupo3.tp.repository.CategoriaFiguritaRepository;
import com.grupo3.tp.repository.EquipoRepository;
import com.grupo3.tp.repository.FiguritaBaseRepository;
import com.grupo3.tp.repository.JugadorRepository;
import com.grupo3.tp.repository.SeleccionRepository;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Carga el catálogo real de figuritas del Mundial 2026 desde un JSON commiteado.
 * Fuente única de verdad usada por el loader de arranque y por el seeder de demo.
 */
@Service
public class CatalogoService {

    static final String RESOURCE_PATH = "data/figuritas-mundial-2026.json";

    private final ObjectMapper objectMapper;
    private final SeleccionRepository seleccionRepo;
    private final EquipoRepository equipoRepo;
    private final JugadorRepository jugadorRepo;
    private final CategoriaFiguritaRepository categoriaRepo;
    private final FiguritaBaseRepository figuritaBaseRepo;

    public CatalogoService(ObjectMapper objectMapper,
                           SeleccionRepository seleccionRepo,
                           EquipoRepository equipoRepo,
                           JugadorRepository jugadorRepo,
                           CategoriaFiguritaRepository categoriaRepo,
                           FiguritaBaseRepository figuritaBaseRepo) {
        this.objectMapper = objectMapper;
        this.seleccionRepo = seleccionRepo;
        this.equipoRepo = equipoRepo;
        this.jugadorRepo = jugadorRepo;
        this.categoriaRepo = categoriaRepo;
        this.figuritaBaseRepo = figuritaBaseRepo;
    }

    /** True si todavía no se cargó el catálogo (no hay ninguna figurita base). */
    public boolean catalogoVacio() {
        return figuritaBaseRepo.count() == 0;
    }

    /** Lee el JSON real del classpath. */
    CatalogoJson leerCatalogo() {
        try (InputStream is = new ClassPathResource(RESOURCE_PATH).getInputStream()) {
            return objectMapper.readValue(is, CatalogoJson.class);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo leer " + RESOURCE_PATH, e);
        }
    }

    /** Lee el JSON real y persiste todo el catálogo. */
    public ResultadoCarga cargarDesdeJson() {
        return persistirCatalogo(leerCatalogo());
    }

    /**
     * Persiste el catálogo parseado: categorías, selecciones, clubes (dedup), jugadores y
     * figuritas_base con numero secuencial (1..N) e imagenUrl. La confederación va a Seleccion.grupo.
     */
    ResultadoCarga persistirCatalogo(CatalogoJson catalogo) {
        Map<String, CategoriaFigurita> categorias = new HashMap<>();
        for (String nombre : catalogo.categorias()) {
            categorias.put(nombre, categoriaRepo.save(new CategoriaFigurita(null, nombre)));
        }

        Map<String, Equipo> clubes = new HashMap<>();
        int numero = 1;
        int nSel = 0, nJug = 0, nBase = 0;

        for (SeleccionJson sj : catalogo.selecciones()) {
            Seleccion sel = seleccionRepo.save(new Seleccion(null, sj.nombre(), sj.confederacion()));
            nSel++;
            for (JugadorJson jj : sj.jugadores()) {
                Equipo club = clubes.computeIfAbsent(jj.club(),
                        nombre -> equipoRepo.save(new Equipo(null, nombre)));
                CategoriaFigurita cat = categorias.computeIfAbsent(jj.categoria(),
                        nombre -> categoriaRepo.save(new CategoriaFigurita(null, nombre)));
                Jugador jugador = jugadorRepo.save(new Jugador(null, jj.nombre()));
                nJug++;
                figuritaBaseRepo.save(FiguritaBase.builder()
                        .numero(numero++)
                        .seleccion(sel)
                        .equipo(club)
                        .categoria(cat)
                        .jugador(jugador)
                        .imagenUrl(jj.imagenUrl())
                        .build());
                nBase++;
            }
        }
        return new ResultadoCarga(nSel, categorias.size(), clubes.size(), nJug, nBase);
    }

    public record ResultadoCarga(int selecciones, int categorias, int equipos,
                                 int jugadores, int figuritasBase) {}
}
