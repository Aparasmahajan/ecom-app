'use client';

export default function OffersPage() {
  const bank = [
    { title: '10% Instant Discount', sub: 'on ICICI Bank Cards. Min. order ₹1999', logo: 'ICICI Bank' },
    { title: '10% Instant Discount', sub: 'on HDFC Bank Cards. Min. order ₹1999', logo: 'HDFC BANK' },
    { title: '5% Instant Discount',  sub: 'on SBI Bank Cards. Min. order ₹1499', logo: 'SBI' }
  ];

  return (
    <>
      <h2 style={{ marginBottom: 16, letterSpacing: 1 }}>OFFERS</h2>

      <div className="offer-banner">
        <div>FLAT</div>
        <h2>20% OFF</h2>
        <div className="off-sub">ON ALL ORDERS</div>
        <div className="promo-code">USE CODE: URBAN20</div>
      </div>

      <div className="offer-icons">
        <div className="offer-icon-item">
          <div className="oi-emoji">⏱</div>
          <div className="oi-title">Easy Returns</div>
          <div className="oi-sub">7 days return</div>
        </div>
        <div className="offer-icon-item">
          <div className="oi-emoji">🚚</div>
          <div className="oi-title">Free Delivery</div>
          <div className="oi-sub">On all orders</div>
        </div>
        <div className="offer-icon-item">
          <div className="oi-emoji">🔒</div>
          <div className="oi-title">Secure Payment</div>
          <div className="oi-sub">100% secure</div>
        </div>
      </div>

      <div className="bank-offers">
        <h3>Bank Offers</h3>
        {bank.map(b => (
          <div className="bank-offer" key={b.logo}>
            <div className="bo-info">
              <div className="bo-title">{b.title}</div>
              <div className="bo-sub">{b.sub}</div>
            </div>
            <div className="bo-logo">{b.logo}</div>
          </div>
        ))}
      </div>
    </>
  );
}
