package com.shop.app.catalog;

import com.shop.app.common.NotFoundException;
import com.shop.app.settings.SettingsService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Public read + admin CRUD for landing-page banners.
 *
 * Public:  GET /banners            (active only, ordered by position, limited
 *                                    by the home_banner_count setting)
 *          GET /banners/{id}
 * Admin:   GET/POST/PUT/DELETE /admin/banners[...]
 */
@RestController
@RequiredArgsConstructor
public class BannerController {

    private final BannerRepository banners;
    private final SettingsService settings;

    /* ---------- DTO ---------- */
    public record BannerDto(
            UUID id, String template, String title, String subtitle,
            String imageUrl, String price, String ctaText, String ctaHref,
            boolean active, int position, OffsetDateTime createdAt
    ) {
        public static BannerDto of(Banner b) {
            return new BannerDto(
                b.getId(), b.getTemplate(), b.getTitle(), b.getSubtitle(),
                b.getImageUrl(), b.getPrice(), b.getCtaText(), b.getCtaHref(),
                b.isActive(), b.getPosition(), b.getCreatedAt()
            );
        }
    }

    public record BannerBody(
            String template,
            @NotBlank String title,
            String subtitle,
            String imageUrl,
            String price,
            String ctaText,
            String ctaHref,
            Boolean active,
            Integer position
    ) {}

    /* ---------- Public ---------- */
    @GetMapping("/banners")
    public List<BannerDto> listActive() {
        int limit = settings.homeBannerCount();
        return banners.findAllByActiveTrueOrderByPositionAsc()
                .stream().limit(Math.max(0, limit)).map(BannerDto::of).toList();
    }

    @GetMapping("/banners/{id}")
    public BannerDto get(@PathVariable UUID id) {
        var b = banners.findById(id).orElseThrow(() -> new NotFoundException("banner"));
        return BannerDto.of(b);
    }

    /* ---------- Admin ---------- */
    @GetMapping("/admin/banners")
    @PreAuthorize("@sec.isAdmin(authentication)")
    public List<BannerDto> listAll() {
        return banners.findAllByOrderByPositionAsc().stream().map(BannerDto::of).toList();
    }

    @PostMapping("/admin/banners")
    @PreAuthorize("@sec.isAdmin(authentication)")
    public BannerDto create(@Valid @RequestBody BannerBody body) {
        var b = Banner.builder()
                .template(orDefault(body.template(), "hero"))
                .title(body.title().trim())
                .subtitle(orDefault(body.subtitle(), ""))
                .imageUrl(orDefault(body.imageUrl(), ""))
                .price(orDefault(body.price(), ""))
                .ctaText(orDefault(body.ctaText(), "Shop Now"))
                .ctaHref(orDefault(body.ctaHref(), "/products"))
                .active(body.active() == null ? true : body.active())
                .position(body.position() == null ? (int) banners.count() : body.position())
                .build();
        return BannerDto.of(banners.save(b));
    }

    @PutMapping("/admin/banners/{id}")
    @PreAuthorize("@sec.isAdmin(authentication)")
    public BannerDto update(@PathVariable UUID id, @RequestBody BannerBody body) {
        var b = banners.findById(id).orElseThrow(() -> new NotFoundException("banner"));
        if (body.template() != null) b.setTemplate(body.template());
        if (body.title() != null)    b.setTitle(body.title().trim());
        if (body.subtitle() != null) b.setSubtitle(body.subtitle());
        if (body.imageUrl() != null) b.setImageUrl(body.imageUrl());
        if (body.price() != null)    b.setPrice(body.price());
        if (body.ctaText() != null)  b.setCtaText(body.ctaText());
        if (body.ctaHref() != null)  b.setCtaHref(body.ctaHref());
        if (body.active() != null)   b.setActive(body.active());
        if (body.position() != null) b.setPosition(body.position());
        return BannerDto.of(banners.save(b));
    }

    @DeleteMapping("/admin/banners/{id}")
    @PreAuthorize("@sec.isAdmin(authentication)")
    public void delete(@PathVariable UUID id) {
        banners.deleteById(id);
    }

    private static String orDefault(String v, String def) {
        return (v == null || v.isBlank()) ? def : v;
    }
}
