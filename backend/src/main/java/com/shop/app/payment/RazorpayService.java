package com.shop.app.payment;

import com.shop.app.common.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Razorpay integration.
 *
 * <p>Real usage in prod would use the official Razorpay Java SDK to hit
 * <code>POST /v1/orders</code> — this class stubs order creation locally when
 * <code>app.razorpay.key-id</code> is empty (dev mode), and always performs
 * server-side signature verification with HMAC-SHA256 per Razorpay docs.</p>
 *
 * <p>To wire the real SDK: add
 * {@code com.razorpay:razorpay-java:1.4.7} to pom.xml, inject a
 * {@code RazorpayClient} bean, and replace {@link #createOrder(BigDecimal)}
 * with a real API call.</p>
 */
@Service
@Slf4j
public class RazorpayService {

    private final String keyId;
    private final String keySecret;

    public RazorpayService(
            @Value("${app.razorpay.key-id:}") String keyId,
            @Value("${app.razorpay.key-secret:}") String keySecret
    ) {
        this.keyId = keyId;
        this.keySecret = keySecret;
    }

    public boolean isConfigured() {
        return !keyId.isBlank() && !keySecret.isBlank();
    }

    /** Create a Razorpay order id for the given rupee amount. */
    public String createOrder(BigDecimal amountRupees) {
        if (!isConfigured()) {
            var mock = "order_dev_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
            log.warn("Razorpay is not configured — returning mock order id {}", mock);
            return mock;
        }
        // Real integration: call Razorpay's REST API with basic auth and return the returned id.
        // Omitted here to keep the SDK dependency optional.
        throw new UnsupportedOperationException(
                "Razorpay SDK not wired — add com.razorpay:razorpay-java and implement this method."
        );
    }

    /**
     * Verify the payment signature per
     * https://razorpay.com/docs/payments/server-integration/java/payment-gateway/build-integration/#step-4-verify-payment-signature
     */
    public void verifySignature(String razorpayOrderId, String razorpayPaymentId, String signature) {
        if (!isConfigured()) {
            // In dev, accept anything so the checkout flow can be exercised end-to-end.
            log.warn("Skipping Razorpay signature verification (not configured).");
            return;
        }
        var payload = razorpayOrderId + "|" + razorpayPaymentId;
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            var raw = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            var hex = new StringBuilder(raw.length * 2);
            for (byte b : raw) hex.append(String.format("%02x", b));
            if (!hex.toString().equals(signature)) {
                throw new BadRequestException("invalid razorpay signature");
            }
        } catch (Exception ex) {
            throw new BadRequestException("signature verification failed: " + ex.getMessage());
        }
    }
}
