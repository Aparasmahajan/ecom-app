package com.shop.app.catalog;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A landing-page banner shown on the storefront Home. Admin picks a template
 * (hero / sale / split / minimal), then fills image + copy (and an optional
 * featured price). Mirrors the web demo's Banner shape.
 */
@Entity
@Table(name = "banners")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Banner {

    @Id @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    @Builder.Default
    private String template = "hero";

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    @Builder.Default
    private String subtitle = "";

    @Column(name = "image_url", nullable = false)
    @Builder.Default
    private String imageUrl = "";

    @Column(nullable = false)
    @Builder.Default
    private String price = "";

    @Column(name = "cta_text", nullable = false)
    @Builder.Default
    private String ctaText = "Shop Now";

    @Column(name = "cta_href", nullable = false)
    @Builder.Default
    private String ctaHref = "/products";

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(nullable = false)
    @Builder.Default
    private int position = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();
}
