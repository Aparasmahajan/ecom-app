package com.shop.app.integrations;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.shop.app.common.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * Uploads product images to Cloudinary.
 *
 * <p>In development, when Cloudinary credentials are missing, this returns a
 * placeholder Unsplash URL keyed on the file name, so the flow still works
 * end-to-end without a Cloudinary account. See CLAUDE.md §7.</p>
 */
@Service
@Slf4j
public class CloudinaryService {

    private final Cloudinary client;
    private final boolean configured;

    public CloudinaryService(
            @Value("${app.cloudinary.cloud-name:}") String cloudName,
            @Value("${app.cloudinary.api-key:}")    String apiKey,
            @Value("${app.cloudinary.api-secret:}") String apiSecret
    ) {
        this.configured = !cloudName.isBlank() && !apiKey.isBlank() && !apiSecret.isBlank();
        this.client = configured
                ? new Cloudinary(ObjectUtils.asMap(
                        "cloud_name", cloudName,
                        "api_key",    apiKey,
                        "api_secret", apiSecret,
                        "secure",     true))
                : null;
    }

    public String upload(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BadRequestException("empty file");
        if (!configured) {
            var placeholder = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80";
            log.warn("[Cloudinary not configured] Skipping upload — returning placeholder {}", placeholder);
            return placeholder;
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = client.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap("folder", "urban/products"));
            return (String) result.get("secure_url");
        } catch (IOException ex) {
            throw new BadRequestException("upload failed: " + ex.getMessage());
        }
    }
}
