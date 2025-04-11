document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".nav-link");
    const sections = document.querySelectorAll(".content > div");

    // Smooth scrolling for all links
    links.forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault(); // Prevent default anchor behavior
            const sectionId = link.getAttribute("data-section");

            if (sectionId === "AboutMe") {
                // Special case for "About" to scroll to the top of the page
                window.scrollTo({
                    top: 0,
                    behavior: "smooth", // Smooth scrolling
                });
            } else {
                const targetSection = document.getElementById(sectionId);

                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: "smooth", // Smooth scrolling
                        block: "start", // Align to the top of the section
                    });
                }
            }
        });
    });

    const handleScroll = () => {
        let scrollPosition = window.scrollY + 100; // Offset for better snapping

        sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute("id");

            const link = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
            const divider = link.previousElementSibling;

            if (sectionId === "AboutMe" && scrollPosition < sectionTop + sectionHeight) {
                // Special case for "About" to make it active from the top of the page
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
    handleScroll(); // Run on page load to set the initial state
});