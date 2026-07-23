package com.shop.app.catalog;

import com.shop.app.catalog.ProductDtos.*;
import com.shop.app.common.NotFoundException;
import com.shop.app.integrations.CloudinaryService;
import com.shop.app.review.ReviewRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Admin-only mutations for the catalog. Protected by role check at {@code /admin/**}
 * in SecurityConfig.
 */
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("@sec.isAdmin(authentication)")   // DB-fresh admin check on every method
public class AdminCatalogController {

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final ReviewRepository reviews;
    private final CloudinaryService cloudinary;

    // ---------- Products ----------
    /** All products including unlisted ones (public /products hides those). */
    @GetMapping("/products")
    public List<ProductDto> listAll() {
        return products.findAll().stream()
                .map(p -> ProductDto.of(p, ProductDtos.effectiveRating(p, reviews)))
                .toList();
    }

    @PostMapping("/products")
    public ProductDto create(@Valid @RequestBody ProductCreateBody body) {
        var p = Product.builder()
                .name(body.name())
                .description(body.description() == null ? "" : body.description())
                .categoryId(body.categoryId())
                .gender(body.gender() == null ? "UNISEX" : body.gender())
                .ageGroup(body.ageGroup() == null ? "ADULT" : body.ageGroup())
                .basePrice(body.basePrice())
                .images(body.images() == null ? new String[0] : body.images().toArray(new String[0]))
                .hotSeller(Boolean.TRUE.equals(body.hotSeller()))
                .build();
        p = products.save(p);
        return ProductDto.of(p, ProductDtos.effectiveRating(p, reviews));
    }

    @PutMapping("/products/{id}")
    public ProductDto update(@PathVariable UUID id, @Valid @RequestBody ProductUpdateBody body) {
        var p = products.findById(id).orElseThrow(() -> new NotFoundException("product"));
        if (body.name() != null)        p.setName(body.name());
        if (body.description() != null) p.setDescription(body.description());
        if (body.categoryId() != null)  p.setCategoryId(body.categoryId());
        if (body.basePrice() != null)   p.setBasePrice(body.basePrice());
        if (body.images() != null)      p.setImages(body.images().toArray(new String[0]));
        if (body.hotSeller() != null)   p.setHotSeller(body.hotSeller());
        p.setUpdatedAt(OffsetDateTime.now());
        p = products.save(p);
        return ProductDto.of(p, ProductDtos.effectiveRating(p, reviews));
    }

    @DeleteMapping("/products/{id}")
    public void delete(@PathVariable UUID id) {
        products.deleteById(id);
    }

    @PutMapping("/products/{id}/hot-seller")
    public ProductDto setHotSeller(@PathVariable UUID id, @RequestBody HotSellerBody body) {
        var p = products.findById(id).orElseThrow(() -> new NotFoundException("product"));
        p.setHotSeller(body.isHotSeller());
        p = products.save(p);
        return ProductDto.of(p, ProductDtos.effectiveRating(p, reviews));
    }

    @PutMapping("/products/{id}/rating-override")
    public ProductDto setRatingOverride(@PathVariable UUID id, @RequestBody RatingOverrideBody body) {
        var p = products.findById(id).orElseThrow(() -> new NotFoundException("product"));
        p.setAdminRatingOverride(body.stars()); // null clears the override
        p = products.save(p);
        return ProductDto.of(p, ProductDtos.effectiveRating(p, reviews));
    }

    /** Listing tab — storefront visibility + advertised quantity (separate from stock). */
    @PutMapping("/products/{id}/listing")
    public ProductDto setListing(@PathVariable UUID id, @Valid @RequestBody ListingBody body) {
        var p = products.findById(id).orElseThrow(() -> new NotFoundException("product"));
        if (body.listed() != null)       p.setListed(body.listed());
        if (body.listQuantity() != null) p.setListQuantity(body.listQuantity());
        p = products.save(p);
        return ProductDto.of(p, ProductDtos.effectiveRating(p, reviews));
    }

    // ---------- Variants ----------
    @PostMapping("/products/{productId}/variants")
    public VariantDto addVariant(@PathVariable UUID productId, @Valid @RequestBody VariantBody body) {
        var p = products.findById(productId).orElseThrow(() -> new NotFoundException("product"));
        var v = ProductVariant.builder()
                .product(p)
                .size(body.size())
                .color(body.color() == null ? "Default" : body.color())
                .stock(body.stock())
                .priceModifier(body.priceModifier() == null ? BigDecimal.ZERO : body.priceModifier())
                .build();
        return VariantDto.of(variants.save(v));
    }

    @PutMapping("/variants/{id}")
    public VariantDto updateVariant(@PathVariable UUID id, @Valid @RequestBody VariantBody body) {
        var v = variants.findById(id).orElseThrow(() -> new NotFoundException("variant"));
        v.setSize(body.size());
        if (body.color() != null) v.setColor(body.color());
        v.setStock(body.stock());
        if (body.priceModifier() != null) v.setPriceModifier(body.priceModifier());
        return VariantDto.of(variants.save(v));
    }

    @DeleteMapping("/variants/{id}")
    public void deleteVariant(@PathVariable UUID id) {
        variants.deleteById(id);
    }

    // ---------- Image upload (Cloudinary) ----------
    @PostMapping("/uploads")
    public List<String> upload(@RequestParam("files") MultipartFile[] files) {
        return java.util.Arrays.stream(files).map(cloudinary::upload).toList();
    }
}
