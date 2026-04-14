import React, { useEffect } from 'react';

// FontAwesome CDN for icons
const loadFontAwesome = () => {
  if (!document.getElementById('fa-cdn')) {
    const link = document.createElement('link');
    link.id = 'fa-cdn';
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(link);
  }
};

// The HTML structure is adapted from NewLandingPage/index.html
// Most interactive logic will be added in the next step

const LandingPage = () => {
  useEffect(() => {
    document.body.classList.add('landing-page');
    loadFontAwesome();

    // Navbar scroll behavior
    let lastScrollY = window.scrollY;
    const navbar = document.getElementById('navbar');
    const updateNavbar = () => {
      const currentScrollY = window.scrollY;
      if (navbar) {
        if (currentScrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
        if (currentScrollY > 100) {
          if (currentScrollY > lastScrollY) {
            navbar.classList.add('hidden');
          } else {
            navbar.classList.remove('hidden');
          }
        }
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', updateNavbar);

    // Hamburger menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
      });
    }

    // Smooth scroll for nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
          const offsetTop = targetSection.offsetTop - 70;
          window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
      });
    });

    // CTA button scroll
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
      ctaButton.addEventListener('click', () => {
        const timelineSection = document.getElementById('timeline');
        if (timelineSection) {
          const offsetTop = timelineSection.offsetTop - 70;
          window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
      });
    }

    // Login button redirect
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
        window.location.href = '/login';
      });
    }

    return () => {
      document.body.classList.remove('landing-page');
      window.removeEventListener('scroll', updateNavbar);
    };
  }, []);

  return (
    <>
      {/* Navigation Bar */}
      <nav className="navbar" id="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <i className="fas fa-clipboard-check"></i>
            <span>Reportly</span>
          </div>
          <ul className="nav-menu">
            <li className="nav-item"><a href="#home" className="nav-link">Home</a></li>
            <li className="nav-item"><a href="#about" className="nav-link">About</a></li>
            <li className="nav-item"><a href="#timeline" className="nav-link">Timeline</a></li>
            <li className="nav-item"><a href="#manual" className="nav-link">User Manual</a></li>
            <li className="nav-item"><button className="login-btn">Login</button></li>
          </ul>
          <div className="hamburger">
            <span className="bar"></span>
            <span className="bar"></span>
            <span className="bar"></span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="floating-elements">
          {/* Floating cards, icons, etc. - replicate as needed */}
          {/* ...existing code... */}
        </div>
        <div className="hero-content">
          <p className="hero-subtitle fade-in">Simplify Your Municipal Reporting.</p>
          <h1 className="hero-title fade-in">Accelerate Your Community Improvements.</h1>
          <p className="hero-description fade-in">At Reportly, we transform the complex world of municipal issue reporting into a streamlined, stress-free process, ensuring issues get resolved faster and with minimal hassle.</p>
          <button className="cta-button fade-in">Let's Connect</button>
        </div>
        <div className="scroll-indicator">
          <i className="fas fa-chevron-down"></i>
        </div>
      </section>

      {/* Timeline Section */}
      <section id="timeline" className="timeline-section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Simple steps to report and track issues</p>
          <div className="timeline">
            {/* Timeline items - replicate as needed */}
            <article className="timeline-item" data-step="1">
              <div className="timeline__content">
                <h1>Upload Photo</h1>
                <time dateTime="2024">Step 1</time>
                <hr />
                <p>Capture and upload a photo of the issue you want to report. Our advanced image processing helps identify the type of problem automatically for faster routing to the right department.</p>
              </div>
              <div className="timeline-image">
                <i className="fas fa-camera"></i>
              </div>
            </article>
            {/* ...other timeline items... */}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h2 className="section-title">About Reportly</h2>
              <p className="about-description">
                Reportly bridges the gap between citizens and municipal authorities by providing a transparent, efficient platform for reporting and tracking civic issues. Our mission is to create smarter, more responsive communities through technology.
              </p>
              <div className="features-list">
                <div className="feature-item"><i className="fas fa-check-circle"></i><span>Real-time issue tracking</span></div>
                <div className="feature-item"><i className="fas fa-check-circle"></i><span>Department accountability</span></div>
                <div className="feature-item"><i className="fas fa-check-circle"></i><span>Community engagement</span></div>
                <div className="feature-item"><i className="fas fa-check-circle"></i><span>Data-driven insights</span></div>
              </div>
            </div>
            <div className="about-visual">
              <div className="about-image"><i className="fas fa-city"></i></div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="analytics-section">
        <div className="container">
          <h2 className="section-title">Analytics & Transparency</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><i className="fas fa-check-double"></i></div>
              <div className="stat-number" data-target="1250">0</div>
              <div className="stat-label">Reports Resolved</div>
            </div>
            {/* ...other stat cards... */}
          </div>
        </div>
      </section>

      {/* User Manual Section */}
      <section id="manual" className="manual-section">
        <div className="container">
          <div className="manual-content">
            <h2 className="section-title">User Manual</h2>
            <p className="section-description">Get started with our comprehensive user guide that walks you through every feature of Reportly.</p>
            <div className="manual-features">
              <div className="manual-item"><i className="fas fa-book-open"></i><span>Step-by-step tutorials</span></div>
              <div className="manual-item"><i className="fas fa-video"></i><span>Video demonstrations</span></div>
              <div className="manual-item"><i className="fas fa-question-circle"></i><span>Frequently asked questions</span></div>
            </div>
            <button className="download-btn"><i className="fas fa-download"></i>Download User Manual</button>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="contact-section">
        <div className="container">
          <div className="contact-content">
            <div className="contact-info">
              <h3>Get in Touch</h3>
              <div className="contact-item"><i className="fas fa-building"></i><span>Municipal Office: +1 (555) 123-4567</span></div>
              <div className="contact-item"><i className="fas fa-phone-alt"></i><span>Emergency Helpline: +1 (555) 911-0000</span></div>
              <div className="contact-item"><i className="fas fa-envelope"></i><span>contact@reportly.gov</span></div>
            </div>
            <div className="social-links">
              <h3>Follow Us</h3>
              <div className="social-icons">
                <a href="#" className="social-link"><i className="fab fa-facebook-f"></i></a>
                <a href="#" className="social-link"><i className="fab fa-twitter"></i></a>
                <a href="#" className="social-link"><i className="fab fa-linkedin-in"></i></a>
                <a href="#" className="social-link"><i className="fab fa-instagram"></i></a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Reportly. All rights reserved. | Built for better communities.</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
