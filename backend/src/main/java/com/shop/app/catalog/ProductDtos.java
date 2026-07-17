package com.shop.app.catalog;

import com.shop.app.review.ReviewRepository;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * DTOs and mappers for the catalog module. Kept in one file to reduce
 * per-record file count — they're all tightly related.
 */
public final class ProductDtos {

    private ProductDtos() {}

    public record VariantDto(UUID id, String size, String color, int stock, BigDecimal priceModifier) {
        public static VariantDto of(ProductVariant v) {
            return new VariantDto(v.getId(), v.getSize(), v.getColor(), v.getStock(), v.getPriceModifier());
        }
    }

    public record CategoryDto(String id, String name, String gender, String ageGroup, String emoji, String imageUrl) {
        public static CategoryDto of(Category c) {
            return new CategoryDto(c.getId(), c.getName(), c.getGender(), c.getAgeGroup(), c.getEmoji(), c.getImageUrl());
        }
    }

    public record ProductDto(
            UUID id,
            String name,
            String description,
            String categoryId,
            String gender,
            String ageGroup,
            BigDecimal basePrice,
            List<String> images,
            boolean hotSeller,
            BigDecimal adminRatingOverride,
            BigDecimal effectiveRating,
            List<VariantDto> variants
    ) {
        public static ProductDto of(Product p, BigDecimal effectiveRating) {
            return new ProductDto(
                    p.getId(), p.getName(), p.getDescription(),
                    p.getCategoryId(), p.getGender(), p.getAgeGroup(),
                    p.getBasePrice(),
                    List.of(p.getImages()),
                    p.isHotSeller(),
                    p.getAdminRatingOverride(),
                    effectiveRating,
                    p.getVariants().stream().map(VariantDto::of).toList()
            );
        }
    }

    public record ProductCreateBody(
            @NotBlank String name,
            String description,
            @NotBlank String categoryId,
            String gender,
            String ageGroup,
            @NotNull @DecimalMin("0.0") BigDecimal basePrice,
            List<String> images,
            Boolean hotSeller
    ) {}

    public record ProductUpdateBody(
            String name,
            String description,
            String categoryId,
            @DecimalMin("0.0") BigDecimal basePrice,
            List<String> images,
            Boolean hotSeller
    ) {}

    public record VariantBody(
            @NotBlank String size,
            String color,
            @Min(0) int stock,
            BigDecimal priceModifier
    ) {}

    public record HotSellerBody(boolean isHotSeller) {}
    public record RatingOverrideBody(
            @DecimalMin("0.0") @DecimalMax("5.0") BigDecimal stars
    ) {}

    /** Compute effective rating (admin override wins, else avg of user reviews). */
    public static BigDecimal effectiveRating(Product p, ReviewRepository reviews) {
        if (p.getAdminRatingOverride() != null) return p.getAdminRatingOverride();
        var avg = reviews.averageStarsForProduct(p.getId());
        return avg == null
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(avg).setScale(1, java.math.RoundingMode.HALF_UP);
    }
}
