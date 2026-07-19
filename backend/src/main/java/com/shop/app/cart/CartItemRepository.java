package com.shop.app.cart;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {
    List<CartItem> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    @Modifying
    @Query("delete from CartItem c where c.userId = :userId")
    void deleteAllForUser(@Param("userId") UUID userId);
}
