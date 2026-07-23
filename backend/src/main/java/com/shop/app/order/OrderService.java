package com.shop.app.order;

import com.shop.app.address.Address;
import com.shop.app.address.AddressRepository;
import com.shop.app.cart.CartItem;
import com.shop.app.cart.CartItemRepository;
import com.shop.app.catalog.ProductVariant;
import com.shop.app.catalog.ProductVariantRepository;
import com.shop.app.common.BadRequestException;
import com.shop.app.common.NotFoundException;
import com.shop.app.order.OrderDtos.CheckoutLine;
import com.shop.app.order.OrderDtos.CreateOrderBody;
import com.shop.app.payment.RazorpayService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orders;
    private final CartItemRepository cart;
    private final ProductVariantRepository variants;
    private final AddressRepository addresses;
    private final RazorpayService razorpay;

    /**
     * Create an order from cart or explicit lines. Reserves stock, snapshots
     * product/address, creates a Razorpay order id, but does NOT mark PAID
     * until /payment/verify succeeds.
     */
    @Transactional
    public Order create(UUID userId, CreateOrderBody body) {
        var address = addresses.findById(body.addressId())
                .filter(a -> a.getUserId().equals(userId))
                .orElseThrow(() -> new NotFoundException("address"));

        List<CheckoutLine> lines;
        List<CartItem> cartItems = new ArrayList<>();
        if (Boolean.TRUE.equals(body.fromCart())) {
            cartItems = cart.findAllByUserIdOrderByCreatedAtDesc(userId);
            if (cartItems.isEmpty()) throw new BadRequestException("cart is empty");
            lines = cartItems.stream()
                    .map(c -> new CheckoutLine(c.getVariant().getId(), c.getQuantity(), c.getNote()))
                    .toList();
        } else {
            if (body.items() == null || body.items().isEmpty())
                throw new BadRequestException("no items");
            lines = body.items();
        }

        var order = Order.builder()
                .userId(userId)
                .addressId(address.getId())
                .status("CREATED")
                .paymentStatus("PENDING")
                .subtotal(BigDecimal.ZERO)
                .total(BigDecimal.ZERO)
                .shipFullName(address.getFullName())
                .shipPhone(address.getPhone())
                .shipLine1(address.getLine1())
                .shipLine2(address.getLine2())
                .shipCity(address.getCity())
                .shipState(address.getState())
                .shipPincode(address.getPincode())
                .build();
        order = orders.save(order);

        var subtotal = BigDecimal.ZERO;
        for (CheckoutLine line : lines) {
            var v = variants.findById(line.variantId())
                    .orElseThrow(() -> new NotFoundException("variant " + line.variantId()));
            if (v.getStock() < line.quantity()) {
                throw new BadRequestException("not enough stock for " + v.getProduct().getName());
            }
            v.setStock(v.getStock() - line.quantity());
            variants.save(v);

            var unit = v.getProduct().getBasePrice().add(v.getPriceModifier());
            var img = v.getProduct().getImages().length > 0 ? v.getProduct().getImages()[0] : null;
            var item = OrderItem.builder()
                    .order(order)
                    .productId(v.getProduct().getId())
                    .variantId(v.getId())
                    .productNameSnapshot(v.getProduct().getName())
                    .size(v.getSize())
                    .quantity(line.quantity())
                    .unitPrice(unit)
                    .note(line.note() == null ? "" : line.note())
                    .image(img)
                    .build();
            order.getItems().add(item);
            subtotal = subtotal.add(unit.multiply(BigDecimal.valueOf(line.quantity())));
        }
        order.setSubtotal(subtotal);
        order.setTotal(subtotal); // shipping = 0, no tax logic

        var rzpOrderId = razorpay.createOrder(order.getTotal());
        order.setRazorpayOrderId(rzpOrderId);
        order = orders.save(order);

        if (Boolean.TRUE.equals(body.fromCart()) && !cartItems.isEmpty()) {
            cart.deleteAll(cartItems);
        }
        return order;
    }

    @Transactional
    public Order markPaid(String razorpayOrderId, String razorpayPaymentId, String signature) {
        razorpay.verifySignature(razorpayOrderId, razorpayPaymentId, signature);
        var order = orders.findByRazorpayOrderId(razorpayOrderId)
                .orElseThrow(() -> new NotFoundException("order"));
        order.setRazorpayPaymentId(razorpayPaymentId);
        order.setRazorpaySignature(signature);
        order.setPaymentStatus("PAID");
        order.setStatus("PAID");
        return orders.save(order);
    }
}
