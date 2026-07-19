package com.shop.app.catalog;

import com.shop.app.catalog.ProductDtos.CategoryDto;
import com.shop.app.catalog.ProductDtos.ProductDto;
import com.shop.app.common.NotFoundException;
import com.shop.app.review.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Public read-only catalog endpoints. Writes live in AdminCatalogController.
 */
@RestController
@RequiredArgsConstructor
public class CatalogController {

    private final CategoryRepository categories;
    private final ProductRepository products;
    private final ReviewRepository reviews;

    @GetMapping("/categories")
    public List<CategoryDto> categories() {
        return categories.findAll().stream().map(CategoryDto::of).toList();
    }

    @GetMapping("/products")
    public List<ProductDto> products(
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String ageGroup,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) Boolean hotSeller,
            @RequestParam(required = false) String q
    ) {
        return products.search(
                nullIfBlank(gender),
                nullIfBlank(ageGroup),
                nullIfBlank(categoryId),
                hotSeller,
                nullIfBlank(q)
        ).stream()
        .map(p -> ProductDto.of(p, ProductDtos.effectiveRating(p, reviews)))
        .toList();
    }

    @GetMapping("/products/{id}")
    public ProductDto product(@PathVariable UUID id) {
        var p = products.findById(id).orElseThrow(() -> new NotFoundException("product"));
        return ProductDto.of(p, ProductDtos.effectiveRating(p, reviews));
    }

    private static String nullIfBlank(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
