package com.shop.app.order;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<Order> findByRazorpayOrderId(String razorpayOrderId);
    List<Order> findAllByOrderByCreatedAtDesc();
}
