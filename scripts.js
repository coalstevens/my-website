document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const links = document.querySelectorAll(".nav-link");
    const themeToggleInput = document.getElementById("theme-toggle");
    const rootElement = document.documentElement;


    // Theme
    let isDarkTheme = localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);

    const applyTheme = () => {
        rootElement.classList.toggle("light", !isDarkTheme);
        rootElement.classList.toggle("dark", isDarkTheme);
        localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
        themeToggleInput.checked = !isDarkTheme;
    };

    themeToggleInput.addEventListener("change", () => {
        isDarkTheme = !themeToggleInput.checked;
        applyTheme();
    });

    applyTheme();


    // Smooth scrolling for navigation links
    links.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const sectionId = link.parentElement.getAttribute("data-section");

            if (sectionId === "AboutMe") {
                window.scrollTo({
                    behavior: "smooth",
                    top: 0,
                });
            } else {
                const targetSection = document.getElementById(sectionId);

                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: "smooth",
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

    const aboutEnd = resumeSection.offsetTop;
    const resumeEnd = projectsSection.offsetTop;

    const handleScroll = () => {
        const scrollPosition = window.scrollY;

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

    let scrollTimeout;
    window.addEventListener("scroll", () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScroll, 100);
    });

    handleScroll();


    // Ripple effect
    const rippleSize = 15;
    const rippleDuration = 1;

    const createRipple = (x, y) => {
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



    // Wait to show page until stylesheet is applied
    const sheet = document.querySelector('link[rel="stylesheet"]');

    if (sheet) {
        sheet.addEventListener('load', () => {
            body.classList.remove('hidden');
        });
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            body.classList.remove('hidden');
        });
    }


    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const video = document.getElementById('lightbox-video');
    const image = document.getElementById('lightbox-image');
    const closeBtn = document.getElementById('lightbox-close');
    const projectAndExperienceWrappers = document.querySelectorAll('.project-wrapper, .experience-wrapper');

    projectAndExperienceWrappers.forEach(item => {
        item.addEventListener('click', () => {
            const videoSrc = item.dataset.videoSrc;
            const imgSrc = item.dataset.imgSrc;
            const linkSrc = item.dataset.linkSrc;

            if (linkSrc) {
                window.open(linkSrc, '_blank', 'noopener,noreferrer');
                return;
            }

            if (videoSrc) {
                video.src = videoSrc;
                video.classList.remove('hidden');
                image.classList.add('hidden');
                video.play();
            } else if (imgSrc) {
                image.src = imgSrc;
                image.classList.remove('hidden');
                video.classList.add('hidden');
                video.pause();
                video.currentTime = 0;
                video.src = '';
            }

            if (!lightbox.classList.contains('show')) {
                lightbox.classList.add('show');
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' || event.key === 'Esc') {
            closeLightBox();
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
        video.pause();
        video.currentTime = 0;
        video.src = '';
        image.src = '';
        video.classList.add('hidden');
        image.classList.add('hidden');
    }

    const inlineLinks = document.querySelectorAll('.inline-link');
    inlineLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.stopPropagation();
        });
    });
});

function openLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
}