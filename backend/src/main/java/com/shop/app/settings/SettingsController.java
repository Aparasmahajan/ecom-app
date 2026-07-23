package com.shop.app.settings;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Public read + admin update of storefront settings.
 *
 * Public: GET /settings           -> { homeBannerCount }
 * Admin:  PUT /admin/settings     { homeBannerCount }
 */
@RestController
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settings;

    public record SettingsDto(int homeBannerCount) {}
    public record SettingsBody(@NotNull @Min(0) Integer homeBannerCount) {}

    @GetMapping("/settings")
    public SettingsDto get() {
        return new SettingsDto(settings.homeBannerCount());
    }

    @PutMapping("/admin/settings")
    @PreAuthorize("@sec.isAdmin(authentication)")
    public SettingsDto update(@RequestBody SettingsBody body) {
        if (body.homeBannerCount() != null) settings.setHomeBannerCount(body.homeBannerCount());
        return new SettingsDto(settings.homeBannerCount());
    }
}
