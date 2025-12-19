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

// Initialize Supabase client
let supabase = null;

// Email form submission handling with Supabase
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Supabase client if config is available
    if (typeof SUPABASE_CONFIG !== 'undefined' &&
        SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' &&
        SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY') {

        const { createClient } = supabase;
        supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('✅ Supabase client initialisé');
    } else {
        console.warn('⚠️ Configuration Supabase manquante. Veuillez mettre à jour supabase-config.js');
    }

    const emailForm = document.getElementById('emailForm');

    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Get submit button to show loading state
            const submitButton = emailForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;

            // Check if Supabase is configured
            if (!supabase) {
                console.error('❌ Supabase non configuré. Veuillez mettre à jour supabase-config.js');
                showErrorMessage('Configuration manquante. Veuillez contacter l\'administrateur.');
                return;
            }

            // Get email value
            const emailInput = emailForm.querySelector('input[name="email"]');
            const email = emailInput.value.trim();

            // Validate email
            if (!email || !isValidEmail(email)) {
                showErrorMessage('Veuillez entrer une adresse email valide.');
                return;
            }

            // Show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '⏳ Inscription en cours...';

            try {
                // Insert email into Supabase waitlist table
                const { data, error } = await supabase
                    .from('waitlist')
                    .insert([
                        { email: email }
                    ])
                    .select();

                if (error) {
                    // Check if email already exists
                    if (error.code === '23505') {
                        showErrorMessage('Cette adresse email est déjà inscrite ! 🎉');
                    } else {
                        console.error('Erreur Supabase:', error);
                        showErrorMessage('Une erreur s\'est produite. Veuillez réessayer.');
                    }
                } else {
                    console.log('✅ Email ajouté à la liste d\'attente:', email);
                    showSuccessMessage();
                    emailForm.reset();
                }
            } catch (error) {
                console.error('Erreur lors de l\'inscription:', error);
                showErrorMessage('Une erreur s\'est produite. Veuillez réessayer.');
            } finally {
                // Restore button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        });
    }
});

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

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
function showErrorMessage(customMessage = null) {
    const formGroup = document.querySelector('.form-group');

    const message = customMessage || '⚠ Une erreur s\'est produite. Veuillez réessayer.';

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
            ${message}
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