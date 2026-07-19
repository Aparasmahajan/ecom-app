package com.shop.app.auth;

import java.util.UUID;

/**
 * Lightweight principal placed into SecurityContext by JwtAuthFilter.
 * Controllers grab it via {@code @AuthenticationPrincipal UserPrincipal me}.
 */
public record UserPrincipal(UUID id, String email, String role) { }
