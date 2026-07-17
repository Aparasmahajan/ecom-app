package com.shop.app.wishlist;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WishlistRepository extends JpaRepository<WishlistItem, UUID> {
    List<WishlistItem> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<WishlistItem> findByUserIdAndProductId(UUID userId, UUID productId);
}
