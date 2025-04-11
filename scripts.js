document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".content > div");

    links.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute("data-section");

            if (sectionId === "AboutMe") {
                window.scrollTo({
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
            }
            else if (
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
});