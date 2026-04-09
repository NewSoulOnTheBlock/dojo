// HomeGrow - Main JavaScript
document.addEventListener('DOMContentLoaded', function() {
  initMobileNav();
  initTestimonialCarousel();
  initGalleryFilter();
  initFormValidation();
});

function initMobileNav() {
  var hamburger = document.querySelector('.hamburger');
  var navLinks = document.querySelector('.nav-links');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', function() {
    navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');
  });

  navLinks.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() {
      navLinks.classList.remove('active');
      hamburger.classList.remove('active');
    });
  });
}

function initTestimonialCarousel() {
  var slides = document.querySelectorAll('.testimonial-slide');
  var dots = document.querySelectorAll('.carousel-dot');
  if (slides.length === 0) return;

  var current = 0;

  function showSlide(index) {
    slides.forEach(function(s) { s.classList.remove('active'); });
    dots.forEach(function(d) { d.classList.remove('active'); });
    slides[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
    current = index;
  }

  dots.forEach(function(dot, i) {
    dot.addEventListener('click', function() { showSlide(i); });
  });

  setInterval(function() {
    showSlide((current + 1) % slides.length);
  }, 5000);
}

function initGalleryFilter() {
  var filterBtns = document.querySelectorAll('.filter-btn');
  var items = document.querySelectorAll('.gallery-item');
  if (filterBtns.length === 0) return;

  filterBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var filter = this.getAttribute('data-filter');

      filterBtns.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');

      items.forEach(function(item) {
        if (filter === 'all' || item.getAttribute('data-category') === filter) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });
}

function initFormValidation() {
  var form = document.querySelector('.contact-form');
  if (!form) return;

  form.addEventListener('submit', function(e) {
    var valid = true;
    var requiredFields = form.querySelectorAll('[required]');

    requiredFields.forEach(function(field) {
      field.style.borderColor = '';
      if (!field.value.trim()) {
        field.style.borderColor = '#e74c3c';
        valid = false;
      }
      if (field.type === 'email' && field.value) {
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(field.value)) {
          field.style.borderColor = '#e74c3c';
          valid = false;
        }
      }
    });

    if (!valid) {
      e.preventDefault();
    }
  });
}
