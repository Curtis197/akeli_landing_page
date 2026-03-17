/* ========================================
   AKELI LANDING PAGE - JAVASCRIPT
   ======================================== */

// Smooth scroll to sections
function scrollToHow() {
    document.getElementById('how-it-works').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

function scrollToSignup() {
    document.getElementById('signup').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// Email form submission handling
document.addEventListener('DOMContentLoaded', function() {
    const emailForm = document.getElementById('emailForm');
    
    if (emailForm) {
        emailForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get email value
            const emailInput = emailForm.querySelector('input[name="email"]');
            const email = emailInput.value;
            
            // TODO: Replace this with your actual form submission
            // Options:
            // 1. Formspree: action="https://formspree.io/f/YOUR_FORM_ID"
            // 2. Mailto: action="mailto:your@email.com"
            // 3. Custom backend endpoint
            // 4. Supabase function
            
            console.log('Email submitted:', email);
            
            // Show success message
            showSuccessMessage();
            
            // Reset form
            emailForm.reset();
            
            // Example: If using Formspree, uncomment below:
            /*
            fetch('https://formspree.io/f/YOUR_FORM_ID', {
                method: 'POST',
                body: new FormData(emailForm),
                headers: {
                    'Accept': 'application/json'
                }
            }).then(response => {
                if (response.ok) {
                    showSuccessMessage();
                    emailForm.reset();
                } else {
                    showErrorMessage();
                }
            }).catch(error => {
                showErrorMessage();
            });
            */
        });
    }
});

// Show success message
function showSuccessMessage() {
    const formGroup = document.querySelector('.form-group');
    
    // Create success message
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    successMsg.innerHTML = `
        <p style="
            background: white;
            color: #3BB78F;
            padding: 1rem 2rem;
            border-radius: 50px;
            font-weight: 600;
            margin-top: 1rem;
            animation: fadeIn 0.5s ease-out;
        ">
            ✓ Merci ! Vous êtes inscrit à notre liste d'attente. 
            Nous vous contacterons bientôt ! 🎉
        </p>
    `;
    
    // Remove existing success message if any
    const existingMsg = document.querySelector('.success-message');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    // Add new success message
    formGroup.parentNode.insertBefore(successMsg, formGroup.nextSibling);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        successMsg.remove();
    }, 5000);
}

// Show error message
function showErrorMessage() {
    const formGroup = document.querySelector('.form-group');
    
    // Create error message
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    errorMsg.innerHTML = `
        <p style="
            background: white;
            color: #FF6B6B;
            padding: 1rem 2rem;
            border-radius: 50px;
            font-weight: 600;
            margin-top: 1rem;
            animation: fadeIn 0.5s ease-out;
        ">
            ⚠ Une erreur s'est produite. Veuillez réessayer.
        </p>
    `;
    
    // Remove existing error message if any
    const existingMsg = document.querySelector('.error-message');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    // Add new error message
    formGroup.parentNode.insertBefore(errorMsg, formGroup.nextSibling);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        errorMsg.remove();
    }, 5000);
}

// Add scroll effect to navbar
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }
    
    lastScroll = currentScroll;
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all sections for animation
document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        observer.observe(section);
    });
    
    // Observe feature rows and step cards
    const featureRows = document.querySelectorAll('.feature-row');
    featureRows.forEach(row => {
        observer.observe(row);
    });
    
    const stepCards = document.querySelectorAll('.step-card');
    stepCards.forEach(card => {
        observer.observe(card);
    });
    
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        observer.observe(item);
    });
});

// Console message
console.log('%c🌱 Akeli Landing Page', 'color: #3BB78F; font-size: 20px; font-weight: bold;');
console.log('%cBuilt with ❤️ for African nutrition', 'color: #FF9F1C; font-size: 14px;');
// ========================================
// MOBILE SIDEBAR NAVIGATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const mobileSidebar = document.getElementById('mobileSidebar');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    // Open sidebar
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            mobileSidebar.classList.add('active');
            hamburger.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scroll
        });
    }

    // Close sidebar
    function closeSidebarMenu() {
        mobileSidebar.classList.remove('active');
        hamburger.classList.remove('active');
        document.body.style.overflow = ''; // Restore scroll
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', closeSidebarMenu);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebarMenu);
    }

    // Close sidebar when clicking a link
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            closeSidebarMenu();
        });
    });

    // Close sidebar on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileSidebar.classList.contains('active')) {
            closeSidebarMenu();
        }
    });
});

// Smooth scroll to sections
function scrollToHow() {
    document.getElementById('how-it-works').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

function scrollToSignup() {
    document.getElementById('signup').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}