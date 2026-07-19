package com.shop.app.cart;

import com.shop.app.auth.UserPrincipal;
import com.shop.app.catalog.ProductVariantRepository;
import com.shop.app.common.BadRequestException;
import com.shop.app.common.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartItemRepository items;
    private final ProductVariantRepository variants;

    public record CartItemDto(
            UUID id, UUID variantId, UUID productId,
            String productName, String size, String color, String[] productImages,
            int quantity, String note, BigDecimal unitPrice
    ) {
        static CartItemDto of(CartItem c) {
            var v = c.getVariant();
            var p = v.getProduct();
            var unit = p.getBasePrice().add(v.getPriceModifier());
            return new CartItemDto(
                    c.getId(), v.getId(), p.getId(),
                    p.getName(), v.getSize(), v.getColor(), p.getImages(),
                    c.getQuantity(), c.getNote(), unit
            );
        }
    }

    public record AddBody(@NotNull UUID variantId, @Min(1) int quantity, String note) {}
    public record UpdateBody(@Min(1) int quantity, String note) {}

    @GetMapping
    public List<CartItemDto> list(@AuthenticationPrincipal UserPrincipal me) {
        return items.findAllByUserIdOrderByCreatedAtDesc(me.id())
                .stream().map(CartItemDto::of).toList();
    }

    @PostMapping
    public CartItemDto add(@AuthenticationPrincipal UserPrincipal me, @Valid @RequestBody AddBody body) {
        var v = variants.findById(body.variantId())
                .orElseThrow(() -> new NotFoundException("variant"));
        if (v.getStock() < body.quantity()) throw new BadRequestException("not enough stock");
        var it = CartItem.builder()
                .userId(me.id())
                .variant(v)
                .quantity(body.quantity())
                .note(body.note() == null ? "" : body.note())
                .build();
        return CartItemDto.of(items.save(it));
    }

    @PutMapping("/{itemId}")
    public CartItemDto update(@AuthenticationPrincipal UserPrincipal me,
                              @PathVariable UUID itemId,
                              @Valid @RequestBody UpdateBody body) {
        var it = ownedOrThrow(me, itemId);
        it.setQuantity(body.quantity());
        if (body.note() != null) it.setNote(body.note());
        return CartItemDto.of(items.save(it));
    }

    @DeleteMapping("/{itemId}")
    public void delete(@AuthenticationPrincipal UserPrincipal me, @PathVariable UUID itemId) {
        items.delete(ownedOrThrow(me, itemId));
    }

    private CartItem ownedOrThrow(UserPrincipal me, UUID id) {
        var it = items.findById(id).orElseThrow(() -> new NotFoundException("cart item"));
        if (!it.getUserId().equals(me.id())) throw new BadRequestException("not your cart item");
        return it;
    }
}
