package com.shop.app.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class OrderDtos {
    private OrderDtos() {}

    /** Compact customer view surfaced only to admins. */
    public record CustomerSummary(java.util.UUID id, String name, String email, String phone) {}

    /** Rich admin-only view of an order. */
    public record AdminOrderDto(
            UUID id,
            String status,
            String paymentStatus,
            BigDecimal subtotal,
            BigDecimal total,
            String razorpayOrderId,
            String razorpayPaymentId,
            String trackingNumber,
            String adminNotes,
            String cancelReason,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt,
            ShippingSnapshot shipping,
            CustomerSummary customer,
            List<OrderItemDto> items
    ) {
        public static AdminOrderDto of(Order o, com.shop.app.user.User user) {
            var ship = new ShippingSnapshot(
                    o.getShipFullName(), o.getShipPhone(),
                    o.getShipLine1(), o.getShipLine2(),
                    o.getShipCity(), o.getShipState(), o.getShipPincode()
            );
            var cust = user == null ? null
                    : new CustomerSummary(user.getId(), user.getName(), user.getEmail(), user.getPhone());
            return new AdminOrderDto(
                    o.getId(), o.getStatus(), o.getPaymentStatus(),
                    o.getSubtotal(), o.getTotal(),
                    o.getRazorpayOrderId(), o.getRazorpayPaymentId(),
                    o.getTrackingNumber(), o.getAdminNotes(), o.getCancelReason(),
                    o.getCreatedAt(), o.getUpdatedAt(),
                    ship, cust,
                    o.getItems().stream().map(OrderItemDto::of).toList()
            );
        }
    }

    public record TrackingBody(String trackingNumber) {}
    public record NotesBody(String notes) {}
    public record CancelBody(String reason) {}

    public record OrderItemDto(
            UUID productId, UUID variantId, String productNameSnapshot, String size,
            int quantity, BigDecimal unitPrice, String note, String image
    ) {
        static OrderItemDto of(OrderItem it) {
            return new OrderItemDto(
                    it.getProductId(), it.getVariantId(), it.getProductNameSnapshot(), it.getSize(),
                    it.getQuantity(), it.getUnitPrice(), it.getNote(), it.getImage()
            );
        }
    }

    public record ShippingSnapshot(String fullName, String phone, String line1, String line2,
                                   String city, String state, String pincode) {}

    public record OrderDto(
            UUID id,
            String status,
            String paymentStatus,
            BigDecimal subtotal,
            BigDecimal total,
            String razorpayOrderId,
            String razorpayPaymentId,
            OffsetDateTime createdAt,
            ShippingSnapshot shipping,
            List<OrderItemDto> items
    ) {
        public static OrderDto of(Order o) {
            var ship = new ShippingSnapshot(o.getShipFullName(), o.getShipPhone(),
                    o.getShipLine1(), o.getShipLine2(), o.getShipCity(), o.getShipState(), o.getShipPincode());
            return new OrderDto(
                    o.getId(), o.getStatus(), o.getPaymentStatus(),
                    o.getSubtotal(), o.getTotal(),
                    o.getRazorpayOrderId(), o.getRazorpayPaymentId(),
                    o.getCreatedAt(),
                    ship,
                    o.getItems().stream().map(OrderItemDto::of).toList()
            );
        }
    }

    /** Line the client wants to buy directly (bypasses the server cart). */
    public record CheckoutLine(@NotNull UUID variantId, @Min(1) int quantity, String note) {}

    /**
     * Either fromCart=true (use every CartItem for the user) OR items=[...] (buy-now flow).
     */
    public record CreateOrderBody(
            @NotNull UUID addressId,
            Boolean fromCart,
            List<@Valid CheckoutLine> items
    ) {}

    /** Client-side result of Razorpay Checkout — sent back to /payment/verify. */
    public record PaymentVerifyBody(
            @NotNull String razorpayOrderId,
            @NotNull String razorpayPaymentId,
            @NotNull String signature
    ) {}

    public record UpdateStatusBody(@NotNull String status) {}
}
