(function () {
    var navbar = document.querySelector('.navbar');
    if (navbar) {
        var onScroll = function () {
            navbar.classList.toggle('is-scrolled', window.scrollY > 8);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    var reveals = document.querySelectorAll('.reveal');
    if (reveals.length && 'IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

        reveals.forEach(function (el) {
            observer.observe(el);
        });
    } else {
        reveals.forEach(function (el) {
            el.classList.add('is-visible');
        });
    }

    // Cursor-tracking spotlight + 3D tilt — desktop only.
    // Touch devices get their own CSS-driven treatment (see @media (hover: none)).
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover || reduceMotion) return;

    var cards = document.querySelectorAll('.app-card');
    cards.forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
            var rect = card.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;
            var px = (x / rect.width) * 100;
            var py = (y / rect.height) * 100;
            var rotateX = ((y / rect.height) - 0.5) * -10;
            var rotateY = ((x / rect.width) - 0.5) * 10;

            card.style.setProperty('--x', px + '%');
            card.style.setProperty('--y', py + '%');
            card.style.transform =
                'perspective(800px) rotateX(' + rotateX.toFixed(2) + 'deg) ' +
                'rotateY(' + rotateY.toFixed(2) + 'deg) ' +
                'translateY(-10px) scale(1.02)';
        });

        card.addEventListener('mouseleave', function () {
            card.style.transform = '';
            card.style.removeProperty('--x');
            card.style.removeProperty('--y');
        });
    });
})();
