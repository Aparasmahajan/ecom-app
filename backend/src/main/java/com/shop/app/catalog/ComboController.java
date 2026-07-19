package com.shop.app.catalog;

import com.shop.app.common.BadRequestException;
import com.shop.app.common.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Public read + admin CRUD for combos.
 *
 * Public:  GET /combos              (only active combos)
 *          GET /combos/{id}
 * Admin:   GET/POST/PUT/DELETE /admin/combos[...]
 */
@RestController
@RequiredArgsConstructor
public class ComboController {

    private final ComboRepository combos;

    /* ---------- DTO ---------- */
    public record ComboDto(
            UUID id, String name, String description, String image,
            List<UUID> productIds, BigDecimal comboPrice, boolean isActive,
            OffsetDateTime createdAt
    ) {
        public static ComboDto of(Combo c) {
            return new ComboDto(
                c.getId(), c.getName(), c.getDescription(), c.getImage(),
                c.getProductIds(), c.getComboPrice(), c.isActive(),
                c.getCreatedAt()
            );
        }
    }

    public record ComboBody(
            @NotBlank String name,
            String description,
            @NotBlank String image,
            @NotNull List<UUID> productIds,
            @NotNull @DecimalMin("0.0") BigDecimal comboPrice,
            Boolean isActive
    ) {}

    /* ---------- Public ---------- */
    @GetMapping("/combos")
    public List<ComboDto> listActive() {
        return combos.findAllByActiveTrueOrderByCreatedAtDesc()
                .stream().map(ComboDto::of).toList();
    }

    @GetMapping("/combos/{id}")
    public ComboDto get(@PathVariable UUID id) {
        var c = combos.findById(id).orElseThrow(() -> new NotFoundException("combo"));
        return ComboDto.of(c);
    }

    /* ---------- Admin ---------- */
    @GetMapping("/admin/combos")
    @PreAuthorize("@sec.isAdmin(authentication)")
    public List<ComboDto> listAll() {
        return combos.findAllByOrderByCreatedAtDesc().stream().map(ComboDto::of).toList();
    }

    @PostMapping("/admin/combos")
    @PreAuthorize("@sec.isAdmin(authentication)")
    public ComboDto create(@Valid @RequestBody ComboBody body) {
        if (body.productIds().size() < 2) {
            throw new BadRequestException("a combo must contain at least 2 products");
        }
        var combo = Combo.builder()
                .name(body.name().trim())
                .description(body.description() == null ? "" : body.description())
                .image(body.image().trim())
                .productIds(body.productIds())
                .comboPrice(body.comboPrice())
                .active(body.isActive() == null ? true : body.isActive())
                .build();
        return ComboDto.of(combos.save(combo));
    }

    @PutMapping("/admin/combos/{id}")
    @PreAuthorize("@sec.isAdmin(authentication)")
    public ComboDto update(@PathVariable UUID id, @Valid @RequestBody ComboBody body) {
        var c = combos.findById(id).orElseThrow(() -> new NotFoundException("combo"));
        if (body.productIds().size() < 2) {
            throw new BadRequestException("a combo must contain at least 2 products");
        }
        c.setName(body.name().trim());
        c.setDescription(body.description() == null ? "" : body.description());
        c.setImage(body.image().trim());
        c.setProductIds(body.productIds());
        c.setComboPrice(body.comboPrice());
        if (body.isActive() != null) c.setActive(body.isActive());
        return ComboDto.of(combos.save(c));
    }

    @DeleteMapping("/admin/combos/{id}")
    @PreAuthorize("@sec.isAdmin(authentication)")
    public void delete(@PathVariable UUID id) {
        combos.deleteById(id);
    }
}
