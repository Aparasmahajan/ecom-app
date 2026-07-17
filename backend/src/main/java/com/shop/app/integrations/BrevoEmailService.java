package com.shop.app.integrations;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Sends transactional email via Brevo (Sendinblue) — used for OTP delivery.
 *
 * <p>In development, when {@code app.brevo.api-key} is empty, we log the OTP
 * to the backend console so the flow can be exercised without a real Brevo
 * account. See CLAUDE.md §7.</p>
 */
@Service
@Slf4j
public class BrevoEmailService {

    private final String apiKey;
    private final String from;
    private final RestClient http;

    public BrevoEmailService(
            @Value("${app.brevo.api-key:}") String apiKey,
            @Value("${app.brevo.mail-from:no-reply@urban.local}") String from
    ) {
        this.apiKey = apiKey;
        this.from = from;
        this.http = RestClient.builder()
                .baseUrl("https://api.brevo.com/v3")
                .build();
    }

    public boolean isConfigured() { return !apiKey.isBlank(); }

    public void sendOtp(String toEmail, String otp) {
        if (!isConfigured()) {
            // DEV convenience: log the OTP so devs can verify without a Brevo key.
            log.warn(">>> DEV OTP for {} = {} (Brevo not configured — copy this to /auth/otp/verify)", toEmail, otp);
            return;
        }
        var subject = "Your URBAN verification code";
        var html = """
                <div style="font-family:system-ui,sans-serif;padding:24px;background:#0a0a0a;color:#fff">
                  <h2 style="color:#f5c842;letter-spacing:2px">URBAN</h2>
                  <p>Your verification code is:</p>
                  <p style="font-size:32px;font-weight:900;letter-spacing:6px;color:#f5c842">%s</p>
                  <p style="color:#9ca3af;font-size:13px">Expires in 10 minutes.</p>
                </div>
                """.formatted(otp);
        send(toEmail, subject, html);
    }

    public void send(String toEmail, String subject, String htmlBody) {
        if (!isConfigured()) {
            log.warn("[Brevo not configured] OTP/email to {} → subject={} — body suppressed. " +
                    "In DEV you can copy the OTP from the AuthService log line above.", toEmail, subject);
            return;
        }
        try {
            http.post()
                .uri("/smtp/email")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .header("api-key", apiKey)
                .body(Map.of(
                    "sender", Map.of("email", from, "name", "URBAN Clothing Co"),
                    "to", List.of(Map.of("email", toEmail)),
                    "subject", subject,
                    "htmlContent", htmlBody
                ))
                .retrieve()
                .toBodilessEntity();
            log.info("Brevo email sent to {}", toEmail);
        } catch (Exception ex) {
            log.error("Failed to send Brevo email to {}: {}", toEmail, ex.getMessage());
        }
    }
}
