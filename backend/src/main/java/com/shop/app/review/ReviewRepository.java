package com.shop.app.review;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    List<Review> findAllByProductIdOrderByCreatedAtDesc(UUID productId);
    Optional<Review> findByUserIdAndProductId(UUID userId, UUID productId);

    @Query("select avg(cast(r.stars as double)) from Review r where r.productId = :pid")
    Double averageStarsForProduct(@Param("pid") UUID productId);
}
