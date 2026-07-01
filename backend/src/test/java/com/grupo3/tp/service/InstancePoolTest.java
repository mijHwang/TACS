// backend/src/test/java/com/grupo3/tp/service/InstancePoolTest.java
package com.grupo3.tp.service;

import com.grupo3.tp.models.Figurita;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class InstancePoolTest {

    @Test
    void tomarConsumeInstanciasDistintasYLanzaAlAgotarse() {
        InstancePool pool = new InstancePool();
        Figurita f1 = Figurita.builder().id("f1").build();
        Figurita f2 = Figurita.builder().id("f2").build();
        pool.add("juanca", 1, f1);
        pool.add("juanca", 1, f2);

        assertEquals(2, pool.disponibles("juanca", 1));
        Figurita a = pool.tomar("juanca", 1);
        Figurita b = pool.tomar("juanca", 1);
        assertNotEquals(a.getId(), b.getId());
        assertEquals(0, pool.disponibles("juanca", 1));
        assertThrows(IllegalStateException.class, () -> pool.tomar("juanca", 1));
    }

    @Test
    void tomarSobreClaveInexistenteLanza() {
        InstancePool pool = new InstancePool();
        assertEquals(0, pool.disponibles("sofia", 99));
        assertThrows(IllegalStateException.class, () -> pool.tomar("sofia", 99));
    }
}
