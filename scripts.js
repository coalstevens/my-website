document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".content > div");
    const themeToggleInput = document.getElementById("theme-toggle");
    const rootElement = document.documentElement;

    // Initialize theme based on localStorage or system preference
    let isDarkTheme = localStorage.getItem("theme") === "dark" || 
                      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);

    const applyTheme = () => {
        if (isDarkTheme) {
            rootElement.classList.remove("light");
            rootElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
            themeToggleInput.checked = false;
        } else {
            rootElement.classList.remove("dark");
            rootElement.classList.add("light");
            localStorage.setItem("theme", "light");
            themeToggleInput.checked = true;
        }
    };

    // Apply the initial theme
    applyTheme();

    // Toggle theme on slider change
    themeToggleInput.addEventListener("change", () => {
        isDarkTheme = !themeToggleInput.checked;
        applyTheme();
    });

    // Smooth scrolling for navigation links
    links.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute("data-section");

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
    const handleScroll = () => {
        let scrollPosition = window.scrollY + 100;

        sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute("id");

            const link = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
            const divider = link.previousElementSibling;

            if (sectionId === "AboutMe" && scrollPosition < sectionTop + sectionHeight) {
                link.classList.add("active");
                divider.classList.add("active");
            } else if (
                scrollPosition >= sectionTop &&
                scrollPosition < sectionTop + sectionHeight
            ) {
                link.classList.add("active");
                divider.classList.add("active");
            } else {
                link.classList.remove("active");
                divider.classList.remove("active");
            }
        });
    };

    window.addEventListener("scroll", handleScroll);
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
        ripple.style.border = `1px solid var(--ripple)`; // Use the ripple color from CSS variables
        ripple.style.backgroundColor = "transparent";
        ripple.style.opacity = "0.5";
        ripple.style.animation = `ripple ${rippleDuration}s ease-out`;
        ripple.style.pointerEvents = "none";
        document.body.appendChild(ripple);

        setTimeout(() => {
            document.body.removeChild(ripple);
        }, rippleDuration * 1000);
    };

    window.addEventListener("mouseup", (e) => {
        createRipple(e.clientX, e.clientY);
    });

    window.addEventListener("touchend", (e) => {
        for (const touch of e.changedTouches) {
            createRipple(touch.clientX, touch.clientY);
        }
    });
});