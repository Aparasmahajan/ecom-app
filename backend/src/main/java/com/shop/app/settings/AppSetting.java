package com.shop.app.settings;

import jakarta.persistence.*;
import lombok.*;

/**
 * Simple key/value store for storefront-wide settings the admin controls
 * (e.g. home_banner_count). Backed by the app_settings table (V6).
 */
@Entity
@Table(name = "app_settings")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class AppSetting {

    @Id
    @Column(name = "key", nullable = false, updatable = false)
    private String key;

    @Column(name = "value", nullable = false)
    private String value;
}
