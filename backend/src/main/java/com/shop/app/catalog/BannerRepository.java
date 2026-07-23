package com.shop.app.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BannerRepository extends JpaRepository<Banner, UUID> {
    List<Banner> findAllByActiveTrueOrderByPositionAsc();
    List<Banner> findAllByOrderByPositionAsc();
}
