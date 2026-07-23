package com.shop.app.catalog;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "products")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Product {

    @Id @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, columnDefinition = "text")
    private String description = "";

    @Column(name = "category_id", nullable = false)
    private String categoryId;

    @Column(nullable = false)
    private String gender;

    @Column(name = "age_group", nullable = false)
    private String ageGroup;

    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    /** Postgres text[] holding Cloudinary/Unsplash URLs. */
    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(columnDefinition = "text[]", nullable = false)
    private String[] images = new String[0];

    @Column(name = "is_hot_seller", nullable = false)
    private boolean hotSeller;

    /** Whether the product is shown on the public storefront (V6). */
    @Builder.Default
    @Column(nullable = false)
    private boolean listed = true;

    /** Units the admin advertises on the site — independent of real stock (V6). */
    @Builder.Default
    @Column(name = "list_quantity", nullable = false)
    private int listQuantity = 0;

    @Column(name = "admin_rating_override", precision = 2, scale = 1)
    private BigDecimal adminRatingOverride;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<ProductVariant> variants = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
