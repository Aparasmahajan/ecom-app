package com.shop.app.catalog;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A curated bundle of products sold at a discounted total price.
 * Rendered on the storefront's Home + Categories pages ("Curated Combos"
 * section) — see ecom-app-web + mobile.
 */
@Entity
@Table(name = "combos")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Combo {

    @Id @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, columnDefinition = "text")
    @Builder.Default
    private String description = "";

    @Column(nullable = false)
    private String image;

    @Column(name = "combo_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal comboPrice;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    /**
     * Product ids this combo bundles. Backed by the `combo_products` join
     * table (V5 migration). Fetched eagerly since combos are always displayed
     * with their contents.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(
        name = "combo_products",
        joinColumns = @JoinColumn(name = "combo_id"),
        indexes = @Index(columnList = "combo_id")
    )
    @Column(name = "product_id", nullable = false)
    @OrderColumn(name = "position")
    @Builder.Default
    private List<UUID> productIds = new ArrayList<>();
}
