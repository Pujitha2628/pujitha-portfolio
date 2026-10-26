const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const themeToggle = document.querySelector(".theme-toggle");
const bookmarkToggle = document.querySelector(".bookmark-toggle");
const root = document.documentElement;

const savedTheme = localStorage.getItem("portfolio-theme");
if (savedTheme === "light") {
  root.dataset.theme = "light";
}

const updateThemeControl = (isLight) => {
  if (!themeToggle) return;
  const label = isLight ? "Switch to dark theme" : "Switch to light theme";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("title", label);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", isLight ? "#f5f7fb" : "#0b1020");
};

updateThemeControl(root.dataset.theme === "light");

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isLight = root.dataset.theme === "light";
    if (isLight) {
      delete root.dataset.theme;
    } else {
      root.dataset.theme = "light";
    }
    localStorage.setItem("portfolio-theme", isLight ? "dark" : "light");
    updateThemeControl(!isLight);
  });
}

if (bookmarkToggle) {
  const isSaved = localStorage.getItem("portfolio-saved") === "true";
  bookmarkToggle.setAttribute("aria-pressed", String(isSaved));
  bookmarkToggle.setAttribute(
    "aria-label",
    isSaved ? "Remove saved portfolio" : "Save this portfolio",
  );

  bookmarkToggle.addEventListener("click", () => {
    const nextSaved = bookmarkToggle.getAttribute("aria-pressed") !== "true";
    bookmarkToggle.setAttribute("aria-pressed", String(nextSaved));
    bookmarkToggle.setAttribute(
      "aria-label",
      nextSaved ? "Remove saved portfolio" : "Save this portfolio",
    );
    localStorage.setItem("portfolio-saved", String(nextSaved));
  });
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isExpanded));
    menuToggle.setAttribute(
      "aria-label",
      isExpanded ? "Open navigation menu" : "Close navigation menu",
    );
    navLinks.classList.toggle("is-open", !isExpanded);
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open navigation menu");
      navLinks.classList.remove("is-open");
    }
  });
}
