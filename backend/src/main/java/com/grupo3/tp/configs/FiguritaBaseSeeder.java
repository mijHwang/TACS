/*
package com.grupo3.tp.configs;

import com.grupo3.tp.models.*;
import com.grupo3.tp.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.Arrays;
import java.util.List;

@Component
public class FiguritaBaseSeeder implements CommandLineRunner {

    private final FiguritaBaseRepository figRepository;
    private final SeleccionRepository selRepository;
    private final EquipoRepository equipoRepository;
    private final CategoriaFiguritaRepository catRepository;
    private final JugadorRepository jugRepository;

    public FiguritaBaseSeeder(FiguritaBaseRepository figRepository,
                              SeleccionRepository selRepository,
                              EquipoRepository equipoRepository,
                              CategoriaFiguritaRepository catRepository,
                              JugadorRepository jugRepository) {
        this.figRepository = figRepository;
        this.selRepository = selRepository;
        this.equipoRepository = equipoRepository;
        this.catRepository = catRepository;
        this.jugRepository = jugRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // Save Selecciones
        Seleccion arg = selRepository.save(new Seleccion(null, "Argentina", "CONMEBOL"));
        Seleccion bra = selRepository.save(new Seleccion(null, "Brazil", "CONMEBOL"));

        // Save Categorias
        CategoriaFigurita oro = catRepository.save(new CategoriaFigurita(null, "Oro"));
        CategoriaFigurita plata = catRepository.save(new CategoriaFigurita(null, "Plata"));
        CategoriaFigurita bronce = catRepository.save(new CategoriaFigurita(null, "Bronce"));
        List<CategoriaFigurita> categorias = Arrays.asList(oro, plata, bronce);

        // Save Argentina Equipos
        Equipo boca = equipoRepository.save(new Equipo(null, "Boca Juniors"));
        Equipo river = equipoRepository.save(new Equipo(null, "River Plate"));
        Equipo racing = equipoRepository.save(new Equipo(null, "Racing Club"));
        Equipo sanLorenzo = equipoRepository.save(new Equipo(null, "San Lorenzo"));
        Equipo independiente = equipoRepository.save(new Equipo(null, "Independiente"));

        // Save Brazil Equipos
        Equipo santos = equipoRepository.save(new Equipo(null, "Santos"));
        Equipo flamengo = equipoRepository.save(new Equipo(null, "Flamengo"));
        Equipo corinthians = equipoRepository.save(new Equipo(null, "Corinthians"));
        Equipo palmeiras = equipoRepository.save(new Equipo(null, "Palmeiras"));
        Equipo vasco = equipoRepository.save(new Equipo(null, "Vasco da Gama"));

        // Save European Equipos
        Equipo barcelona = equipoRepository.save(new Equipo(null, "Barcelona"));
        Equipo realMadrid = equipoRepository.save(new Equipo(null, "Real Madrid"));
        Equipo juventus = equipoRepository.save(new Equipo(null, "Juventus"));
        Equipo liverpool = equipoRepository.save(new Equipo(null, "Liverpool"));
        Equipo psg = equipoRepository.save(new Equipo(null, "Paris Saint-Germain"));
        Equipo acMilan = equipoRepository.save(new Equipo(null, "AC Milan"));
        Equipo manchesterCity = equipoRepository.save(new Equipo(null, "Manchester City"));

        // Save Argentina Jugadores
        Jugador maradona = jugRepository.save(new Jugador(null, "Diego Maradona"));
        Jugador aguero = jugRepository.save(new Jugador(null, "Sergio Aguero"));
        Jugador diMaria = jugRepository.save(new Jugador(null, "Angel Di Maria"));
        Jugador mascherano = jugRepository.save(new Jugador(null, "Javier Mascherano"));
        Jugador higuain = jugRepository.save(new Jugador(null, "Gonzalo Higuain"));
        Jugador banega = jugRepository.save(new Jugador(null, "Ever Banega"));
        Jugador otamendi = jugRepository.save(new Jugador(null, "Nicolas Otamendi"));
        Jugador tevez = jugRepository.save(new Jugador(null, "Carlos Tevez"));

        // Save Brazil Jugadores
        Jugador ronaldo = jugRepository.save(new Jugador(null, "Ronaldo"));
        Jugador ronaldinho = jugRepository.save(new Jugador(null, "Ronaldinho"));
        Jugador neymar = jugRepository.save(new Jugador(null, "Neymar"));
        Jugador kaka = jugRepository.save(new Jugador(null, "Kaka"));
        Jugador robinho = jugRepository.save(new Jugador(null, "Robinho"));
        Jugador thiagoSilva = jugRepository.save(new Jugador(null, "Thiago Silva"));
        Jugador coutinho = jugRepository.save(new Jugador(null, "Philippe Coutinho"));
        Jugador marcelo = jugRepository.save(new Jugador(null, "Marcelo"));

        // Create Argentina figuritas
        int numero = 1;

        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(maradona)
                    .seleccion(arg)
                    .equipo(boca)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(aguero)
                    .seleccion(arg)
                    .equipo(manchesterCity)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(diMaria)
                    .seleccion(arg)
                    .equipo(realMadrid)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(mascherano)
                    .seleccion(arg)
                    .equipo(barcelona)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(higuain)
                    .seleccion(arg)
                    .equipo(juventus)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(banega)
                    .seleccion(arg)
                    .equipo(sanLorenzo)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(otamendi)
                    .seleccion(arg)
                    .equipo(juventus)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(tevez)
                    .seleccion(arg)
                    .equipo(manchesterCity)
                    .categoria(cat)
                    .build());
        }

        // Create Brazil figuritas
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(ronaldo)
                    .seleccion(bra)
                    .equipo(realMadrid)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(ronaldinho)
                    .seleccion(bra)
                    .equipo(barcelona)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(neymar)
                    .seleccion(bra)
                    .equipo(psg)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(kaka)
                    .seleccion(bra)
                    .equipo(acMilan)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(robinho)
                    .seleccion(bra)
                    .equipo(manchesterCity)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(thiagoSilva)
                    .seleccion(bra)
                    .equipo(psg)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(coutinho)
                    .seleccion(bra)
                    .equipo(liverpool)
                    .categoria(cat)
                    .build());
        }
        for (CategoriaFigurita cat : categorias) {
            figRepository.save(FiguritaBase.builder()
                    .numero(numero++)
                    .jugador(marcelo)
                    .seleccion(bra)
                    .equipo(realMadrid)
                    .categoria(cat)
                    .build());
        }

        System.out.println("✓ FiguritaBase seeded with " + (numero - 1) + " figuritas");
    }
}*/
