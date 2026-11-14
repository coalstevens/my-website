document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const links = document.querySelectorAll(".nav-link");
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;


    // Smooth scrolling for navigation links
    links.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const sectionId = link.parentElement.getAttribute("data-section");

            if (sectionId === "AboutMe") {
                window.scrollTo({
                    behavior: reducedMotion() ? "instant" : "smooth",
                    top: 0,
                });
            } else {
                const targetSection = document.getElementById(sectionId);

                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: reducedMotion() ? "instant" : "smooth",
                        block: "start",
                    });
                }
            }
        });
    });


    // Handle active state for links and dividers based on scroll position
    const resumeSection = document.getElementById("Resume");
    const projectsSection = document.getElementById("Projects");

    const aboutDiv = document.querySelector('.table-of-contents-link[data-section="AboutMe"]');
    const resumeDiv = document.querySelector('.table-of-contents-link[data-section="Resume"]');
    const projectsDiv = document.querySelector('.table-of-contents-link[data-section="Projects"]');

    const handleScroll = () => {
        const scrollPosition = window.scrollY;
        const aboutEnd = resumeSection.offsetTop - 36;
        const resumeEnd = projectsSection.offsetTop - 36;

        [aboutDiv, resumeDiv, projectsDiv].forEach((div) => {
            div.classList.remove("active");
            div.querySelector(".nav-line").classList.remove("active");
            div.querySelector(".nav-link").classList.remove("active");
        });

        const atBottom = window.innerHeight + scrollPosition >= body.offsetHeight - 2; // 2px fudge factor

        if (atBottom) {
            projectsDiv.querySelector(".nav-line").classList.add("active");
            projectsDiv.querySelector(".nav-link").classList.add("active");
        } else if (scrollPosition < aboutEnd) {
            aboutDiv.querySelector(".nav-line").classList.add("active");
            aboutDiv.querySelector(".nav-link").classList.add("active");
        } else if (scrollPosition >= aboutEnd && scrollPosition < resumeEnd) {
            resumeDiv.querySelector(".nav-line").classList.add("active");
            resumeDiv.querySelector(".nav-link").classList.add("active");
        } else if (scrollPosition >= resumeEnd) {
            projectsDiv.querySelector(".nav-line").classList.add("active");
            projectsDiv.querySelector(".nav-link").classList.add("active");
        }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    handleScroll();


    // Highlight experience wrapper when centered in viewport
    const experienceWrappers = document.querySelectorAll('.experience-wrapper');
    let ticking = false;

    const updateActiveExperience = () => {
        const viewportCenter = window.innerHeight / 2;

        let closest = null;
        let closestDist = Infinity;

        experienceWrappers.forEach((wrapper) => {
            const rect = wrapper.getBoundingClientRect();
            const wrapperCenter = rect.top + rect.height / 2;
            const dist = Math.abs(wrapperCenter - viewportCenter);

            if (dist < closestDist) {
                closestDist = dist;
                closest = wrapper;
            }
        });

        experienceWrappers.forEach((wrapper) => {
            if (wrapper === closest) {
                wrapper.classList.add('active');
            } else {
                wrapper.classList.remove('active');
            }
        });
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateActiveExperience();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    updateActiveExperience();


    // Ripple effect
    const rippleSize = 15;
    const rippleDuration = 1;

    const createRipple = (x, y) => {
        if (reducedMotion()) return;
        const ripple = document.createElement("div");
        ripple.style.position = "fixed";
        ripple.style.left = `${x - rippleSize / 2}px`;
        ripple.style.top = `${y - rippleSize / 2}px`;
        ripple.style.borderRadius = "50%";
        ripple.style.width = `${rippleSize}px`;
        ripple.style.height = `${rippleSize}px`;
        ripple.style.border = `1px solid var(--ripple)`;
        ripple.style.backgroundColor = "transparent";
        ripple.style.opacity = "0.5";
        ripple.style.animation = `ripple ${rippleDuration}s ease-out`;
        ripple.style.pointerEvents = "none";
        body.appendChild(ripple);

        setTimeout(() => {
            body.removeChild(ripple);
        }, rippleDuration * 1000);
    };

    window.addEventListener("mouseup", (e) => createRipple(e.clientX, e.clientY), { passive: true });

    window.addEventListener("touchend", (e) => {
        for (const touch of e.changedTouches) {
            createRipple(touch.clientX, touch.clientY);
        }
    }, { passive: true });



    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const video = document.getElementById('lightbox-video');
    const image = document.getElementById('lightbox-image');
    const closeBtn = document.getElementById('lightbox-close');
    const projectWrappers = document.querySelectorAll('.project-wrapper');
    let previewTrigger = null;

    projectWrappers.forEach(item => {
        const hasLink = !!item.dataset.linkSrc;
        item.tabIndex = 0;
        item.setAttribute('role', hasLink ? 'link' : 'button');
        item.setAttribute('aria-label', item.querySelector('.project-title').textContent.trim());
        if (!hasLink) item.setAttribute('aria-haspopup', 'dialog');
        item.addEventListener('keydown', event => {
            if (event.target !== item || (event.key !== 'Enter' && (hasLink || event.key !== ' '))) return;
            event.preventDefault();
            item.click();
        });
        item.addEventListener('click', event => {
            // Nested links keep their native behavior and page transitions.
            if (event.target.closest('a')) return;
            const videoSrc = item.dataset.videoSrc;
            const imgSrc = item.dataset.imgSrc;
            const linkSrc = item.dataset.linkSrc;

            if (linkSrc) {
                const target = new URL(linkSrc, location.href);
                if (target.origin === location.origin) {
                    const link = item.querySelector('a[data-zoom]');
                    if (link) link.click();
                    else location.assign(target.href);
                } else window.open(target.href, '_blank', 'noopener,noreferrer');
                return;
            }

            if (videoSrc) {
                video.src = videoSrc;
                video.classList.remove('hidden');
                image.classList.add('hidden');
                video.play().catch(error => {
                    // Closing immediately can interrupt playback; controls remain
                    // available if the browser disallows automatic playback.
                    if (!['AbortError', 'NotAllowedError'].includes(error.name)) {
                        console.error('Project video could not play', error);
                    }
                });
            } else if (imgSrc) {
                image.src = imgSrc;
                image.classList.remove('hidden');
                video.classList.add('hidden');
                video.pause();
                video.currentTime = 0;
                video.src = '';
            }

            previewTrigger = item;
            lightbox.classList.add('show');
            body.classList.add('preview-open');
            closeBtn.focus();
        });
    });

    document.addEventListener('keydown', (event) => {
        if (!lightbox.classList.contains('show')) return;
        if (event.key === 'Escape') closeLightBox();
        if (event.key === 'Tab') {
            const last = video.classList.contains('hidden') ? closeBtn : video;
            if (event.shiftKey && document.activeElement === closeBtn) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                closeBtn.focus();
            }
        }
    });

    closeBtn.addEventListener('click', () => {
        closeLightBox();
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightBox();
        }
    });

    function closeLightBox() {
        lightbox.classList.remove('show');
        body.classList.remove('preview-open');
        previewTrigger?.focus({ preventScroll: true });
        video.pause();
        video.currentTime = 0;
        video.src = '';
        image.src = '';
        video.classList.add('hidden');
        image.classList.add('hidden');
    }

    const banner = document.getElementById('bottom-banner');
    const gif = document.getElementById('cookie-gif');
    const text = document.getElementById('cookie-text');
    const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
    async function showCookieBanner() {
        await wait(6000);
        banner.classList.add('visible');
        if (!reducedMotion()) {
            await wait(550);
            // This non-looping GIF has 47 frames at 100ms each. Assign its
            // source only now so it cannot finish while the banner is hidden.
            const loaded = await new Promise(resolve => {
                gif.onload = () => resolve(true);
                gif.onerror = () => resolve(false);
                gif.src = gif.dataset.src;
            });
            gif.onload = gif.onerror = null;
            if (loaded) {
                gif.classList.remove('hidden');
                await wait(4700);
            }
        }
        text.classList.remove('hidden');
        banner.classList.add('show-message');
        await wait(3400);
        banner.classList.add('fade-out');
        await wait(reducedMotion() ? 0 : 400);
        banner.remove();
    }
    showCookieBanner();
});
