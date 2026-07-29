/* ================================
   MUNICIPAL REPORTER LANDING PAGE SCRIPTS
   Interactive functionality and animations
   ================================ */

// DOM ELEMENTS
const navbar = document.getElementById('navbar');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');
const timelineItems = document.querySelectorAll('.timeline-item');
const statNumbers = document.querySelectorAll('.stat-number');
const ctaButton = document.querySelector('.cta-button');

// Text animation elements
const animatedElements = document.querySelectorAll('.section-title, .section-description, .timeline__content, .stat-card, .manual-card, .contact-item');

// Navbar scroll behavior
let lastScrollY = window.scrollY;
let ticking = false;

function updateNavbar() {
    const currentScrollY = window.scrollY;
    
    // Add/remove scrolled class for background change
    if (currentScrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    // Hide/show navbar based on scroll direction
    if (currentScrollY > 100) {
        if (currentScrollY > lastScrollY) {
            // Scrolling down
            navbar.classList.add('hidden');
        } else {
            // Scrolling up
            navbar.classList.remove('hidden');
        }
    }
    
    lastScrollY = currentScrollY;
    ticking = false;
}

function requestTick() {
    if (!ticking) {
        requestAnimationFrame(updateNavbar);
        ticking = true;
    }
}

window.addEventListener('scroll', requestTick);

// Mobile menu toggle
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
    
    // Animate hamburger bars
    const bars = hamburger.querySelectorAll('.bar');
    bars.forEach(bar => bar.classList.toggle('active'));
});

// Close mobile menu when clicking on nav links
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Smooth scrolling for navigation links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            const offsetTop = targetSection.offsetTop - 70; // Account for navbar height
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// CTA button smooth scroll to timeline
ctaButton.addEventListener('click', () => {
    const timelineSection = document.getElementById('timeline');
    const offsetTop = timelineSection.offsetTop - 70;
    window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
    });
});

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

// Enhanced timeline animation with scroll direction
let timelineScrollDirection = 'down';
let timelineLastScrollY = window.scrollY;
let timelineAnimationTimeout;

// Track scroll direction specifically for timeline
function updateTimelineScrollDirection() {
    const currentScrollY = window.scrollY;
    if (currentScrollY > timelineLastScrollY) {
        timelineScrollDirection = 'down';
    } else if (currentScrollY < timelineLastScrollY) {
        timelineScrollDirection = 'up';
    }
    timelineLastScrollY = currentScrollY;
}

// Throttled scroll direction tracking
window.addEventListener('scroll', throttle(updateTimelineScrollDirection, 50));

const timelineObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const item = entry.target;
        const itemIndex = Array.from(timelineItems).indexOf(item);
        
        if (entry.isIntersecting) {
            if (timelineScrollDirection === 'down') {
                // Scrolling down - reveal with staggered delay
                clearTimeout(timelineAnimationTimeout);
                timelineAnimationTimeout = setTimeout(() => {
                    item.classList.add('animate');
                }, itemIndex * 150);
            } else {
                // Scrolling up but item is visible - keep it animated
                item.classList.add('animate');
            }
        } else {
            if (timelineScrollDirection === 'up') {
                // Scrolling up and item is out of view - hide it
                item.classList.remove('animate');
            }
        }
    });
}, {
    threshold: 0.3,
    rootMargin: '0px 0px -20% 0px'
});

// Advanced timeline animation with progress tracking
function animateTimelineOnScroll() {
    const timelineSection = document.getElementById('timeline');
    if (!timelineSection) return;
    
    const sectionTop = timelineSection.offsetTop;
    const sectionHeight = timelineSection.clientHeight;
    const scrollProgress = (window.scrollY - sectionTop) / sectionHeight;
    
    timelineItems.forEach((item, index) => {
        const itemProgress = (index + 1) / timelineItems.length;
        
        if (timelineScrollDirection === 'down') {
            // Progressive reveal when scrolling down
            if (scrollProgress >= itemProgress * 0.5) {
                setTimeout(() => {
                    item.classList.add('animate');
                }, index * 100);
            }
        } else {
            // Progressive hide when scrolling up past the section
            if (scrollProgress < itemProgress * 0.3) {
                item.classList.remove('animate');
            }
        }
    });
}

// Combine both approaches
window.addEventListener('scroll', throttle(animateTimelineOnScroll, 100));

timelineItems.forEach(item => {
    timelineObserver.observe(item);
});

// General section animation observer
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const animatableElements = entry.target.querySelectorAll('.section-title, .section-subtitle, .about-text, .about-visual, .stat-card, .manual-content');
            animatableElements.forEach((element, index) => {
                setTimeout(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }, index * 100);
            });
        }
    });
}, observerOptions);

// Add initial styles for animation
document.addEventListener('DOMContentLoaded', () => {
    const animatableElements = document.querySelectorAll('.section-title, .section-subtitle, .about-text, .about-visual, .stat-card, .manual-content');
    animatableElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        element.style.transition = 'all 0.6s ease';
    });
});

sections.forEach(section => {
    sectionObserver.observe(section);
});

// Counter animation for statistics
function animateCounter(element, target) {
    let count = 0;
    const increment = target / 100;
    const timer = setInterval(() => {
        count += increment;
        if (count >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.ceil(count);
        }
    }, 20);
}

// Observe statistics section for counter animation
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target'));
                animateCounter(stat, target);
            });
            statsObserver.unobserve(entry.target); // Only animate once
        }
    });
}, { threshold: 0.5 });

const analyticsSection = document.querySelector('.analytics-section');
if (analyticsSection) {
    statsObserver.observe(analyticsSection);
}

// Parallax effect for hero background
function parallaxEffect() {
    const scrolled = window.pageYOffset;
    const parallaxElements = document.querySelectorAll('.grid-overlay');
    
    parallaxElements.forEach(element => {
        const speed = 0.5;
        element.style.transform = `translateY(${scrolled * speed}px)`;
    });
}

window.addEventListener('scroll', parallaxEffect);

// Add hover effects for interactive elements
document.addEventListener('DOMContentLoaded', () => {
    // Login button functionality
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            // Redirect directly to React app login page
            window.location.href = '/login';
        });
    }
    
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.cta-button, .login-btn, .download-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Skip ripple effect for login button since it redirects
            if (this.classList.contains('login-btn')) {
                return;
            }
            
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // Add CSS for ripple effect
    const rippleCSS = `
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    
    const style = document.createElement('style');
    style.textContent = rippleCSS;
    document.head.appendChild(style);
});

// Active navigation link highlighting
function highlightActiveSection() {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.clientHeight;
        
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', highlightActiveSection);

// Enhanced scroll indicator behavior
const scrollIndicator = document.querySelector('.scroll-indicator');
if (scrollIndicator) {
    scrollIndicator.addEventListener('click', () => {
        const timelineSection = document.getElementById('timeline');
        const offsetTop = timelineSection.offsetTop - 70;
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    });
}

// Smooth fade-out for scroll indicator
window.addEventListener('scroll', () => {
    if (scrollIndicator) {
        const scrolled = window.scrollY;
        const opacity = Math.max(0, 1 - scrolled / 300);
        scrollIndicator.style.opacity = opacity;
    }
});

// Performance optimization: throttle scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Apply throttling to scroll-heavy functions
window.addEventListener('scroll', throttle(highlightActiveSection, 100));

// Loading animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    
    // Trigger hero animations
    const heroElements = document.querySelectorAll('.hero-content .fade-in');
    heroElements.forEach((element, index) => {
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 200);
    });
});

// Add loading styles
document.addEventListener('DOMContentLoaded', () => {
    const loadingCSS = `
        body:not(.loaded) .hero-content .fade-in {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.8s ease;
        }
        
        .nav-link.active {
            color: #00d4ff !important;
        }
        
        .nav-link.active::after {
            width: 100% !important;
        }
        
        .hamburger.active .bar:nth-child(2) {
            opacity: 0;
        }
        
        .hamburger.active .bar:nth-child(1) {
            transform: translateY(8px) rotate(45deg);
        }
        
        .hamburger.active .bar:nth-child(3) {
            transform: translateY(-8px) rotate(-45deg);
        }
    `;
    
    const style = document.createElement('style');
    style.textContent = loadingCSS;
    document.head.appendChild(style);
});

// Error handling for missing elements
function safeAddEventListener(element, event, handler) {
    if (element) {
        element.addEventListener(event, handler);
    }
}

// Keyboard navigation support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close mobile menu on escape
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }
});

// Focus management for accessibility
navLinks.forEach(link => {
    link.addEventListener('focus', () => {
        link.classList.add('focused');
    });
    
    link.addEventListener('blur', () => {
        link.classList.remove('focused');
    });
});

// Handle responsive title behavior - CSS-first approach
function handleResponsiveTitle() {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        // Remove any inline styles to let CSS handle responsiveness
        heroTitle.style.whiteSpace = '';
        heroTitle.style.borderRight = '';
        heroTitle.style.overflow = '';
        heroTitle.style.width = '';
        heroTitle.style.animation = '';
        
        // Add responsive class instead of inline styles
        if (window.innerWidth <= 768) {
            heroTitle.classList.add('mobile-responsive');
        } else {
            heroTitle.classList.remove('mobile-responsive');
        }
    }
}

// Text Animation Observer
const textObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            
            // Special handling for section titles
            if (entry.target.classList.contains('section-title')) {
                const words = entry.target.textContent.split(' ');
                entry.target.innerHTML = words.map((word, index) => 
                    `<span class="word-animate" style="animation-delay: ${index * 0.1}s">${word}</span>`
                ).join(' ');
            }
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

// Observe all animated elements
animatedElements.forEach(element => {
    textObserver.observe(element);
});

// Initialize responsive title handling
handleResponsiveTitle();

// Resize handler for responsive adjustments
window.addEventListener('resize', throttle(() => {
    // Close mobile menu on resize to desktop
    if (window.innerWidth > 768) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }
    
    // Let CSS handle all responsive behavior
    handleResponsiveTitle();
}, 250));

console.log('Municipal Reporter landing page loaded successfully! 🚀');