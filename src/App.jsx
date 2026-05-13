import React, { useEffect, useState } from 'react';

function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  useEffect(() => {
    // Add specific class to body for landing page scoping
    document.body.classList.add('landing-shell');
    return () => {
      document.body.classList.remove('landing-shell');
    };
  }, []);

  return (
    <div className="landing-shell">
      {/* --- Navigation --- */}
      <nav className="landing-nav">
        <div className="landing-logo stagger-item" style={{ animationDelay: '0.1s' }}>
          <div className="landing-logo-icon">💪</div>
          <span>FitLink</span>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <section className="hero-section">
        <div className="hero-glow"></div>
        
        <div className="hero-content">
          <div className="hero-badge stagger-item" style={{ animationDelay: '0.2s' }}>
            <div className="hero-badge-dot"></div>
            Now Available for iOS & Android
          </div>
          
          <h1 className="hero-title stagger-item" style={{ animationDelay: '0.3s' }}>
            The Ultimate Command Center for <span className="text-accent">Personal Trainers</span>
          </h1>
          
          <p className="hero-subtitle stagger-item" style={{ animationDelay: '0.4s' }}>
            Manage your fitness business, assign workouts, and engage clients with a premium native experience built for scale.
          </p>
          
          <div className="hero-cta-group stagger-item" style={{ animationDelay: '0.5s' }}>
            <button className="btn-store" onClick={() => alert('App Store link coming soon!')}>
              <span className="btn-store-icon">🍎</span>
              <div className="btn-store-text">
                <span className="btn-store-sub">Download on the</span>
                <span className="btn-store-main">App Store</span>
              </div>
            </button>
            <button className="btn-store" onClick={() => alert('Play Store link coming soon!')}>
              <span className="btn-store-icon">▶️</span>
              <div className="btn-store-text">
                <span className="btn-store-sub">GET IT ON</span>
                <span className="btn-store-main">Google Play</span>
              </div>
            </button>
          </div>
        </div>

        <div className="hero-image-wrapper stagger-item" style={{ animationDelay: '0.6s' }}>
          <img src="/hero-mockup.png" alt="FitLink Mobile App Dashboard" className="hero-mockup" />
        </div>
      </section>

      {/* --- Trusted By Band --- */}
      <section className="trusted-by">
        <span className="trusted-logo">GOLD'S GYM</span>
        <span className="trusted-logo">ANYTIME FITNESS</span>
        <span className="trusted-logo">EQUINOX</span>
        <span className="trusted-logo">CRUNCH</span>
        <span className="trusted-logo">PLANET FITNESS</span>
      </section>

      {/* --- Z-Pattern Features Section --- */}
      <section className="z-pattern-section">
        {/* Feature 1: Trainer Dash */}
        <div className="z-pattern-row">
          <div className="z-pattern-content stagger-item">
            <h2 className="z-pattern-title">Mission Control <span className="text-accent">Dashboard</span></h2>
            <p className="z-pattern-desc">
              Get a bird's-eye view of your entire coaching business. Track active clients, calculate monthly recurring revenue, and monitor workout completion rates in real-time.
            </p>
            <div className="z-pattern-list">
              <div className="z-pattern-list-item">
                <span className="z-pattern-list-icon">✅</span>
                <span>Track client progress & compliance</span>
              </div>
              <div className="z-pattern-list-item">
                <span className="z-pattern-list-icon">✅</span>
                <span>Manage subscriptions & revenue</span>
              </div>
              <div className="z-pattern-list-item">
                <span className="z-pattern-list-icon">✅</span>
                <span>Built-in analytics & insights</span>
              </div>
            </div>
          </div>
          <div className="z-pattern-image-wrapper stagger-item">
            <div className="z-pattern-blob"></div>
            <img src="/feature-trainer-dash.png" alt="Trainer Dashboard" className="z-pattern-image" />
          </div>
        </div>

        {/* Feature 2: Client Portal */}
        <div className="z-pattern-row z-pattern-reverse">
          <div className="z-pattern-content stagger-item">
            <h2 className="z-pattern-title">Smart <span className="text-accent">Client Portal</span></h2>
            <p className="z-pattern-desc">
              Your clients receive a dedicated, premium tracking experience. They can log workouts, track diet plans, and view their progress seamlessly.
            </p>
            <div className="z-pattern-list">
              <div className="z-pattern-list-item">
                <span className="z-pattern-list-icon" style={{color: 'var(--blue)'}}>🏋️</span>
                <span>Interactive workout logging</span>
              </div>
              <div className="z-pattern-list-item">
                <span className="z-pattern-list-icon" style={{color: 'var(--blue)'}}>🥗</span>
                <span>Nutrition & macro tracking</span>
              </div>
              <div className="z-pattern-list-item">
                <span className="z-pattern-list-icon" style={{color: 'var(--blue)'}}>📸</span>
                <span>Progress photo gallery</span>
              </div>
            </div>
          </div>
          <div className="z-pattern-image-wrapper stagger-item">
            <div className="z-pattern-blob" style={{background: 'rgba(91,141,239,0.1)'}}></div>
            <img src="/feature-client-portal.png" alt="Client Portal" className="z-pattern-image" />
          </div>
        </div>

        {/* Feature 3: Messaging */}
        <div className="z-pattern-row">
          <div className="z-pattern-content stagger-item">
            <h2 className="z-pattern-title">Real-time <span className="text-accent">Messaging</span></h2>
            <p className="z-pattern-desc">
              Keep clients accountable with instant messaging. No more relying on scattered texts or emails. Everything stays organized in one place.
            </p>
            <div className="z-pattern-list">
              <div className="z-pattern-list-item">
                <span className="z-pattern-list-icon" style={{color: 'var(--purple)'}}>💬</span>
                <span>Direct 1-on-1 chat</span>
              </div>
              <div className="z-pattern-list-item">
                <span className="z-pattern-list-icon" style={{color: 'var(--purple)'}}>🔔</span>
                <span>Push notifications</span>
              </div>
              <div className="z-pattern-list-item">
                <span className="z-pattern-list-icon" style={{color: 'var(--purple)'}}>📁</span>
                <span>Share files & videos easily</span>
              </div>
            </div>
          </div>
          <div className="z-pattern-image-wrapper stagger-item">
            <div className="z-pattern-blob" style={{background: 'rgba(191,90,242,0.1)'}}></div>
            <img src="/feature-messaging.png" alt="Real-time Messaging" className="z-pattern-image" />
          </div>
        </div>
      </section>

      {/* --- Testimonials Section --- */}
      <section className="testimonials-section">
        <h2 className="section-title-center">Loved by <span className="text-accent">Trainers</span></h2>
        <p className="section-subtitle-center">Don't just take our word for it. See what top coaches are saying.</p>
        
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <p className="testimonial-quote">"FitLink completely changed how I manage my online clients. It saves me at least 10 hours a week compared to spreadsheets."</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">S</div>
              <div>
                <div className="testimonial-name">Sarah Jenkins</div>
                <div className="testimonial-role">Elite Performance Coach</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">"The client app is gorgeous. My retention rates skyrocketed because my clients actually enjoy logging their workouts now."</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">M</div>
              <div>
                <div className="testimonial-name">Mike Reynolds</div>
                <div className="testimonial-role">Strength & Conditioning</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card">
            <p className="testimonial-quote">"Finally, a platform that doesn't feel clunky. The automated subscriptions and built-in chat are game-changers."</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">J</div>
              <div>
                <div className="testimonial-name">Jessica Alba</div>
                <div className="testimonial-role">Personal Trainer</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ Section --- */}
      <section className="faq-section">
        <h2 className="section-title-center">Frequently Asked <span className="text-accent">Questions</span></h2>
        
        <div className="faq-list">
          {[
            { q: "Is there a limit to how many clients I can have?", a: "No! FitLink scales with your business. You can manage unlimited clients on our Pro plan." },
            { q: "Do my clients need to pay for the app?", a: "The client app is 100% free for your clients to download and use. They only pay you for your coaching services." },
            { q: "Can I migrate my data from another platform?", a: "Yes, our support team can help you bulk import your client list and workout templates via CSV." },
            { q: "Is FitLink available internationally?", a: "Yes, FitLink is available globally. You can bill your clients in over 135 different currencies via our Stripe integration." }
          ].map((faq, index) => (
            <div key={index} className={`faq-item ${openFaq === index ? 'open' : ''}`}>
              <button className="faq-header" onClick={() => toggleFaq(index)}>
                <span className="faq-question">{faq.q}</span>
                <span className="faq-icon">+</span>
              </button>
              <div className="faq-content">
                <p className="faq-answer">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="cta-section">
        <div className="cta-box">
          <h2 className="cta-title">Ready to level up your fitness business?</h2>
          <div className="hero-cta-group" style={{ justifyContent: 'center' }}>
            <button className="btn-store" onClick={() => alert('App Store link coming soon!')}>
              <span className="btn-store-icon">🍎</span>
              <div className="btn-store-text">
                <span className="btn-store-sub">Download on the</span>
                <span className="btn-store-main">App Store</span>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="landing-footer">
        <div className="landing-logo">
          <div className="landing-logo-icon">💪</div>
          <span>FitLink</span>
        </div>
        <p className="text-small">© {new Date().getFullYear()} FitLink Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default LandingPage;
