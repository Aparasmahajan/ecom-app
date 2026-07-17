package com.shop.app.address;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AddressRepository extends JpaRepository<Address, UUID> {
    List<Address> findAllByUserIdOrderByIsDefaultDescCreatedAtDesc(UUID userId);

    @Modifying
    @Query("update Address a set a.isDefault = false where a.userId = :userId")
    void clearDefaults(@Param("userId") UUID userId);
}
