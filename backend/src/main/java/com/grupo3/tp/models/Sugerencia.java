package com.grupo3.tp.models;

import com.grupo3.tp.dtos.FiguritaResponseDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Sugerencia de intercambio bidireccional persistida (US4). Hay un documento por cada
 * contraparte viable de un usuario. Las figuritas se guardan como snapshots denormalizados
 * ({@link FiguritaResponseDTO}) para lectura de un solo documento; la obsolescencia se acota
 * con la regeneración diaria del job.
 */
@Document(collection = "sugerencias")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sugerencia {
    @Id
    private String id;
    /** Usuario al que se le sugiere el intercambio. */
    private String usuarioId;
    private String contraparteId;
    private String contraparteNombre;
    /** Repetidas de la contraparte que al usuario le faltan. */
    private List<FiguritaResponseDTO> figuritasARecibir;
    /** Repetidas del usuario que a la contraparte le faltan. */
    private List<FiguritaResponseDTO> figuritasAOfrecer;
    private LocalDateTime generadaEn;
}
