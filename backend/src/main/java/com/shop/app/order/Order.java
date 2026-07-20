package com.shop.app.order;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Order {

    @Id @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "address_id")
    private UUID addressId;

    @Builder.Default
    @Column(nullable = false)
    private String status = "CREATED";

    @Builder.Default
    @Column(name = "payment_status", nullable = false)
    private String paymentStatus = "PENDING";

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "razorpay_order_id")   private String razorpayOrderId;
    @Column(name = "razorpay_payment_id") private String razorpayPaymentId;
    @Column(name = "razorpay_signature")  private String razorpaySignature;

    /** Courier tracking id — set once the order is SHIPPED. */
    @Column(name = "tracking_number") private String trackingNumber;

    /** Private notes visible only to admins (never returned to customers). */
    @Builder.Default
    @Column(name = "admin_notes", nullable = false)
    private String adminNotes = "";

    /** Short customer-visible reason when status is CANCELLED / REFUNDED. */
    @Column(name = "cancel_reason") private String cancelReason;

    // Flattened address snapshot
    @Column(name = "ship_full_name") private String shipFullName;
    @Column(name = "ship_phone")     private String shipPhone;
    @Column(name = "ship_line1")     private String shipLine1;
    @Column(name = "ship_line2")     private String shipLine2;
    @Column(name = "ship_city")      private String shipCity;
    @Column(name = "ship_state")     private String shipState;
    @Column(name = "ship_pincode")   private String shipPincode;

    @Builder.Default
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Builder.Default
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (updatedAt == null) updatedAt = OffsetDateTime.now();
        if (status == null) status = "CREATED";
        if (paymentStatus == null) paymentStatus = "PENDING";
        if (adminNotes == null) adminNotes = "";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
