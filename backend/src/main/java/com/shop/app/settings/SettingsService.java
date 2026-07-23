package com.shop.app.settings;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Typed accessors over the app_settings key/value table.
 */
@Service
@RequiredArgsConstructor
public class SettingsService {

    public static final String HOME_BANNER_COUNT = "home_banner_count";
    private static final int DEFAULT_HOME_BANNER_COUNT = 3;

    private final AppSettingRepository repo;

    public int homeBannerCount() {
        return repo.findById(HOME_BANNER_COUNT)
                .map(s -> {
                    try { return Integer.parseInt(s.getValue()); }
                    catch (NumberFormatException e) { return DEFAULT_HOME_BANNER_COUNT; }
                })
                .orElse(DEFAULT_HOME_BANNER_COUNT);
    }

    public void setHomeBannerCount(int count) {
        int safe = Math.max(0, count);
        repo.save(new AppSetting(HOME_BANNER_COUNT, String.valueOf(safe)));
    }
}
