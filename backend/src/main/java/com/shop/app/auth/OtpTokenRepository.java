package com.shop.app.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OtpTokenRepository extends JpaRepository<OtpToken, UUID> {
    Optional<OtpToken> findFirstByEmailIgnoreCaseOrderByCreatedAtDesc(String email);
}
