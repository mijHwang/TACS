package com.grupo3.tp.models;

/**
 * Estado de disponibilidad de una figurita física individual.
 * Controla si puede ser comprometida en una nueva operación (subasta, oferta, publicación)
 * o si ya está reservada en una operación existente.
 */
public enum EstadoFigurita {
    LIBRE,
    EN_SUBASTA,
    OFERTADA,
    PUBLICADA
}