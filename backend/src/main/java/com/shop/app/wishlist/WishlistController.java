package com.shop.app.wishlist;

import com.shop.app.auth.UserPrincipal;
import com.shop.app.catalog.ProductDtos.ProductDto;
import com.shop.app.catalog.ProductDtos;
import com.shop.app.catalog.ProductRepository;
import com.shop.app.common.NotFoundException;
import com.shop.app.review.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistRepository wishlist;
    private final ProductRepository products;
    private final ReviewRepository reviews;

    @GetMapping
    public List<ProductDto> list(@AuthenticationPrincipal UserPrincipal me) {
        var ids = wishlist.findAllByUserIdOrderByCreatedAtDesc(me.id())
                .stream().map(WishlistItem::getProductId).toList();
        return products.findAllById(ids).stream()
                .map(p -> ProductDto.of(p, ProductDtos.effectiveRating(p, reviews)))
                .toList();
    }

    @PostMapping("/{productId}")
    public void add(@AuthenticationPrincipal UserPrincipal me, @PathVariable UUID productId) {
        if (!products.existsById(productId)) throw new NotFoundException("product");
        if (wishlist.findByUserIdAndProductId(me.id(), productId).isPresent()) return;
        wishlist.save(WishlistItem.builder()
                .userId(me.id())
                .productId(productId)
                .build());
    }

    @DeleteMapping("/{productId}")
    public void remove(@AuthenticationPrincipal UserPrincipal me, @PathVariable UUID productId) {
        wishlist.findByUserIdAndProductId(me.id(), productId).ifPresent(wishlist::delete);
    }
}
