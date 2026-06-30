package com.grupo3.tp.dtos;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Envoltura de paginado expuesta por la API. No serializamos {@link Page} directamente
 * porque en Spring moderno su forma JSON es inestable y emite warning.
 */
public record PagedResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean last
) {
    public static <T> PagedResponse<T> from(Page<T> p) {
        return new PagedResponse<>(
                p.getContent(),
                p.getNumber(),
                p.getSize(),
                p.getTotalElements(),
                p.getTotalPages(),
                p.isLast());
    }
}
