// backend/src/main/java/com/grupo3/tp/service/InstancePool.java
package com.grupo3.tp.service;

import com.grupo3.tp.models.Figurita;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

/**
 * Pool de instancias de figurita por (usuario, base). Cada {@code tomar} consume una
 * instancia libre, evitando que la misma figurita física quede asignada a dos
 * actividades del seed (publicar / subastar / ofrecer / comerciar). Código de demo.
 */
class InstancePool {

    private final Map<String, Deque<Figurita>> pool = new HashMap<>();

    private String key(String username, int base) { return username + "#" + base; }

    void add(String username, int base, Figurita f) {
        pool.computeIfAbsent(key(username, base), k -> new ArrayDeque<>()).add(f);
    }

    /** Saca una instancia libre; lanza si (usuario, base) no tiene más. */
    Figurita tomar(String username, int base) {
        Deque<Figurita> d = pool.get(key(username, base));
        if (d == null || d.isEmpty()) {
            throw new IllegalStateException(
                    "Sin instancias libres de la base " + base + " para " + username);
        }
        return d.poll();
    }

    int disponibles(String username, int base) {
        Deque<Figurita> d = pool.get(key(username, base));
        return d == null ? 0 : d.size();
    }
}
