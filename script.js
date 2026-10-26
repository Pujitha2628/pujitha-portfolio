/**
 * Pujitha Saikam - Senior QA Automation Engineer & SDET Portfolio
 * Live Medium Feed Integration for @pujitha-sdet
 * Dynamic Rendering, Filter Engine, Modal Reader, Bookmarks & Design System
 */

// --------------------------------------------------------------------------
// Configuration & State
// --------------------------------------------------------------------------
const DEFAULT_MEDIUM_HANDLE = "pujitha-sdet";
let currentMediumHandle = DEFAULT_MEDIUM_HANDLE;

let articlesData = [];
let availableCategories = new Set();
let activeCategory = "all";
let searchQuery = "";
let bookmarkedArticleGuids = JSON.parse(localStorage.getItem("ps_bookmarks") || "[]");
let currentOpenArticle = null;

// Curated Gradient Palettes for Image-Free Editorial Articles
const GRADIENT_THEMES = [
  { bg: "linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)", icon: "fa-solid fa-code", label: "Software Engineering" },
  { bg: "linear-gradient(135deg, #064e3b 0%, #059669 100%)", icon: "fa-solid fa-vial-circle-check", label: "Quality Assurance" },
  { bg: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)", icon: "fa-solid fa-gears", label: "Automation & CI/CD" },
  { bg: "linear-gradient(135deg, #831843 0%, #db2777 100%)", icon: "fa-solid fa-wand-magic-sparkles", label: "AI & Innovation" },
  { bg: "linear-gradient(135deg, #0f172a 0%, #334155 100%)", icon: "fa-solid fa-network-wired", label: "API & Protocols" },
  { bg: "linear-gradient(135deg, #78350f 0%, #d97706 100%)", icon: "fa-solid fa-bug-slash", label: "Root Cause Triage" }
];

// --------------------------------------------------------------------------
// DOM Elements
// --------------------------------------------------------------------------
const articlesGrid = document.getElementById("articlesGrid");
const loadingSkeletonGrid = document.getElementById("loadingSkeletonGrid");
const noResultsState = document.getElementById("noResultsState");
const emptyStateIcon = document.getElementById("emptyStateIcon");
const emptyStateTitle = document.getElementById("emptyStateTitle");
const emptyStateDesc = document.getElementById("emptyStateDesc");
const searchInput = document.getElementById("articleSearchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const resetSearchBtn = document.getElementById("resetSearchBtn");
const syncFeedEmptyBtn = document.getElementById("syncFeedEmptyBtn");
const categoryFilterBar = document.getElementById("categoryFilterBar");
const refreshFeedBtn = document.getElementById("refreshFeedBtn");
const syncStatusText = document.getElementById("syncStatusText");
const articleCountStatus = document.getElementById("articleCountStatus");
const mediumHandleBadge = document.getElementById("mediumHandleBadge");

// Article Reader / Preview Modal
const articleModal = document.getElementById("articleReaderModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalCategory = document.getElementById("modalArticleCategory");
const modalReadTime = document.getElementById("modalArticleReadTime");
const modalTitle = document.getElementById("modalArticleTitle");
const modalDate = document.getElementById("modalArticleDate");
const modalTags = document.getElementById("modalArticleTags");
const modalBody = document.getElementById("modalArticleBody");
const modalAuthorName = document.getElementById("modalAuthorName");
const modalExternalLink = document.getElementById("modalExternalLink");
const modalBottomMediumBtn = document.getElementById("modalBottomMediumBtn");
const modalBookmarkBtn = document.getElementById("modalBookmarkBtn");

// Bookmarks Drawer
const bookmarkDrawerBtn = document.getElementById("bookmarkDrawerBtn");
const bookmarkCountBadge = document.getElementById("bookmarkCountBadge");
const bookmarksDrawer = document.getElementById("bookmarksDrawer");
const closeBookmarksBtn = document.getElementById("closeBookmarksBtn");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const bookmarksList = document.getElementById("bookmarksList");

// Theme Toggle
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");

// Progress & Utility
const readingProgressBar = document.getElementById("readingProgressBar");
const currentYearSpan = document.getElementById("currentYear");
const mobileMenuToggle = document.getElementById("mobileMenuToggle");
const navMenu = document.getElementById("navMenu");
const contactForm = document.getElementById("contactForm");
const newsletterForm = document.getElementById("newsletterForm");

// --------------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  initTheme();
  updateBookmarkBadge();
  setupEventListeners();

  // Fetch live articles strictly from @pujitha-sdet
  fetchMediumFeed();
});

// --------------------------------------------------------------------------
// Toast Notification Utility
// --------------------------------------------------------------------------
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type === "success" ? "toast-success" : ""}`;
  toast.innerHTML = `
    <i class="${type === "success" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-info"}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 0.25s ease forwards";
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

// --------------------------------------------------------------------------
// Theme Toggle & Persistence
// --------------------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem("ps_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  if (!themeIcon) return;
  if (theme === "light") {
    themeIcon.classList.remove("fa-moon");
    themeIcon.classList.add("fa-sun");
    if (themeToggleBtn) themeToggleBtn.setAttribute("title", "Switch to Dark Theme");
  } else {
    themeIcon.classList.remove("fa-sun");
    themeIcon.classList.add("fa-moon");
    if (themeToggleBtn) themeToggleBtn.setAttribute("title", "Switch to Light Theme");
  }
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("ps_theme", nextTheme);
    updateThemeIcon(nextTheme);

    showToast(nextTheme === "dark" ? "Midnight Navy Theme activated 🌙" : "Crisp Slate Theme activated ☀️");
  });
}

// --------------------------------------------------------------------------
// Medium RSS XML Parser
// --------------------------------------------------------------------------
function parseMediumRssXml(xmlText) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const items = Array.from(xmlDoc.querySelectorAll("item"));

    return items.map((el, i) => {
      const title = el.querySelector("title")?.textContent || "";
      const link = el.querySelector("link")?.textContent || "";
      const guid = el.querySelector("guid")?.textContent || link || `post-${i}`;
      const pubDate = el.querySelector("pubDate")?.textContent || "";
      const creator = el.getElementsByTagNameNS("*", "creator")[0]?.textContent || el.querySelector("creator")?.textContent || "Pujitha Saikam";
      const content = el.getElementsByTagNameNS("*", "encoded")[0]?.textContent || el.querySelector("description")?.textContent || "";
      const categoryEls = Array.from(el.querySelectorAll("category"));
      const categories = categoryEls.map(c => c.textContent.trim()).filter(Boolean);

      return {
        title,
        link,
        guid,
        pubDate,
        author: creator,
        content: content,
        description: content,
        categories: categories.length > 0 ? categories : ["QA Automation", "Test Engineering"],
        thumbnail: ""
      };
    });
  } catch (e) {
    console.error("XML Parse Error:", e);
    return [];
  }
}

// --------------------------------------------------------------------------
// Fetch Live Medium RSS Feed (Multi-Tier Strictly from @pujitha-sdet)
// --------------------------------------------------------------------------
async function fetchMediumFeed(isManualRefresh = false) {
  const cleanHandle = currentMediumHandle.replace(/^@/, "").trim();
  const plainRssUrl = `https://medium.com/feed/@${cleanHandle}`;

  // Show loading skeleton
  if (loadingSkeletonGrid) loadingSkeletonGrid.classList.remove("hidden");
  if (articlesGrid) articlesGrid.classList.add("hidden");
  if (noResultsState) noResultsState.classList.add("hidden");
  if (syncStatusText) syncStatusText.textContent = `Syncing with @${cleanHandle}...`;
  if (articleCountStatus) articleCountStatus.textContent = "Connecting to Medium...";

  let fetchedItems = [];
  let feedTitle = "Pujitha Saikam";
  let isLiveSync = false;

  // Tier 1: Local dev server proxy (if running locally, guarantees fast response & bypasses CORS)
  try {
    const localProxyUrl = `/api/medium-feed?handle=${encodeURIComponent(cleanHandle)}&_t=${Date.now()}`;
    const localRes = await fetch(localProxyUrl);
    if (localRes.ok) {
      const text = await localRes.text();
      // Can be XML or JSON
      try {
        const json = JSON.parse(text);
        if (json.items && Array.isArray(json.items)) {
          fetchedItems = json.items;
          isLiveSync = true;
        }
      } catch {
        const parsed = parseMediumRssXml(text);
        if (parsed) {
          fetchedItems = parsed;
          isLiveSync = true;
        }
      }
    }
  } catch (e) {
    // Not running on local server with proxy or offline, fall through to Tier 2
  }

  // Tier 2: Public rss2json API
  if (fetchedItems.length === 0) {
    try {
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(plainRssUrl)}&_t=${Date.now()}`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "ok" && Array.isArray(data.items)) {
          fetchedItems = data.items;
          if (data.feed?.title) feedTitle = data.feed.title;
          isLiveSync = true;
        }
      }
    } catch (e) {
      console.warn("Tier 2 rss2json notice:", e);
    }
  }

  // Tier 3: Public CORS Proxies
  if (fetchedItems.length === 0) {
    const proxyList = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(plainRssUrl)}`,
      `https://api.cors.lol/?url=${encodeURIComponent(plainRssUrl)}`
    ];

    for (const proxyUrl of proxyList) {
      try {
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const xmlText = await response.text();
          const parsed = parseMediumRssXml(xmlText);
          if (parsed) {
            fetchedItems = parsed;
            isLiveSync = true;
            break;
          }
        }
      } catch (e) {
        // try next proxy
      }
    }
  }

  // Hide loading skeleton
  if (loadingSkeletonGrid) loadingSkeletonGrid.classList.add("hidden");

  // STRICT REQUIREMENT: Only show articles posted on @pujitha-sdet.
  // No fallback/dummy articles are loaded.
  if (fetchedItems.length > 0) {
    processMediumArticles(fetchedItems, { title: feedTitle });
    if (syncStatusText) syncStatusText.textContent = isLiveSync ? "Live Connected to Medium" : "Connected to @pujitha-sdet";
    if (articleCountStatus) articleCountStatus.textContent = `${fetchedItems.length} ${fetchedItems.length === 1 ? 'story' : 'stories'} published`;
    if (isManualRefresh) showToast("Technical publication feed synced with Medium! ✨", "success");
  } else {
    handleEmptyFeed();
    if (isManualRefresh) showToast(`Synced with @${cleanHandle}: 0 published stories found.`, "info");
  }
}

// --------------------------------------------------------------------------
// Process & Sanitize Medium Articles
// --------------------------------------------------------------------------
function processMediumArticles(rawItems) {
  availableCategories.clear();
  availableCategories.add("all");

  articlesData = rawItems.map((item, index) => {
    // Extract thumbnail, ignoring Medium tracking pixels
    let thumbnail = item.thumbnail || "";
    if (thumbnail && (thumbnail.includes("/_/stat") || thumbnail.includes("stat?event="))) {
      thumbnail = "";
    }

    const htmlContent = item.content || item.description || "";
    if (!thumbnail && htmlContent) {
      const imgMatch = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1] && !imgMatch[1].includes("/_/stat")) {
        thumbnail = imgMatch[1];
      }
    }

    // Clean plain-text excerpt
    let excerpt = (item.description || item.content || "")
      .replace(/<[^>]*>?/gm, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (excerpt.length > 175) {
      excerpt = excerpt.substring(0, 172) + "...";
    }

    // Process categories
    let cats = [];
    if (Array.isArray(item.categories)) {
      cats = item.categories.map(c => c.toLowerCase().trim()).filter(Boolean);
    }
    if (cats.length === 0) cats = ["qa-automation"];
    cats.forEach(c => availableCategories.add(c));

    // Calculate Read Time
    const wordCount = (htmlContent.replace(/<[^>]*>?/gm, "").match(/\S+/g) || []).length;
    const readMinutes = Math.max(1, Math.ceil(wordCount / 220));

    // Format publication date
    let formattedDate = "Recently Published";
    if (item.pubDate) {
      try {
        const d = new Date(item.pubDate);
        formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      } catch (e) {
        formattedDate = item.pubDate;
      }
    }

    // Deterministic gradient theme
    const themeIndex = index % GRADIENT_THEMES.length;
    const gradientTheme = GRADIENT_THEMES[themeIndex];

    return {
      guid: item.guid || item.link || `medium-post-${index}`,
      title: item.title || "Untitled Technical Story",
      link: item.link || `https://medium.com/@${currentMediumHandle}`,
      pubDate: formattedDate,
      author: item.author || "Pujitha Saikam",
      categories: cats,
      primaryCategory: cats[0] || "qa-automation",
      readTime: `${readMinutes} min read`,
      excerpt: excerpt || "Click to read the complete technical breakdown.",
      content: htmlContent || `<p>${excerpt}</p>`,
      thumbnail: thumbnail,
      gradientTheme: gradientTheme
    };
  });

  renderCategoryPills();
  renderArticles();
}

// --------------------------------------------------------------------------
// Handle Empty Feed for @pujitha-sdet
// --------------------------------------------------------------------------
function handleEmptyFeed() {
  articlesData = [];
  availableCategories.clear();

  if (syncStatusText) syncStatusText.textContent = "Live Connected to @pujitha-sdet";
  if (articleCountStatus) articleCountStatus.textContent = "0 stories published";

  if (emptyStateIcon) emptyStateIcon.className = "fa-brands fa-medium no-results-icon";
  if (emptyStateTitle) emptyStateTitle.textContent = "No Articles Published on @pujitha-sdet Yet";
  if (emptyStateDesc) {
    emptyStateDesc.innerHTML = `
      Only articles published by Pujitha Saikam under the official Medium handle <strong>@${currentMediumHandle}</strong> will be displayed here.<br><br>
      As soon as an article or case study is published on Medium, it will automatically sync and appear right here!
    `;
  }

  if (resetSearchBtn) resetSearchBtn.classList.add("hidden");
  if (syncFeedEmptyBtn) syncFeedEmptyBtn.classList.remove("hidden");

  if (articlesGrid) articlesGrid.classList.add("hidden");
  if (noResultsState) noResultsState.classList.remove("hidden");

  renderCategoryPills();
}

// --------------------------------------------------------------------------
// Render Dynamic Category Filter Pills
// --------------------------------------------------------------------------
function renderCategoryPills() {
  if (!categoryFilterBar) return;

  const currentActive = activeCategory;
  categoryFilterBar.innerHTML = `
    <button class="cat-pill ${currentActive === 'all' ? 'active' : ''}" data-category="all" role="tab" aria-selected="${currentActive === 'all'}">
      All Stories (${articlesData.length})
    </button>
  `;

  if (articlesData.length === 0) return;

  Array.from(availableCategories).forEach(cat => {
    if (cat === "all") return;
    const btn = document.createElement("button");
    const count = articlesData.filter(a => a.categories && a.categories.includes(cat)).length;
    btn.className = `cat-pill ${currentActive === cat ? 'active' : ''}`;
    btn.dataset.category = cat;
    btn.role = "tab";
    btn.setAttribute("aria-selected", String(currentActive === cat));
    btn.textContent = `${formatCategoryName(cat)} (${count})`;

    btn.addEventListener("click", () => {
      activeCategory = cat;
      document.querySelectorAll(".cat-pill").forEach(p => {
        p.classList.remove("active");
        p.setAttribute("aria-selected", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      renderArticles();
    });

    categoryFilterBar.appendChild(btn);
  });

  // Rebind the All Stories button
  const allBtn = categoryFilterBar.querySelector('[data-category="all"]');
  if (allBtn) {
    allBtn.addEventListener("click", () => {
      activeCategory = "all";
      document.querySelectorAll(".cat-pill").forEach(p => {
        p.classList.remove("active");
        p.setAttribute("aria-selected", "false");
      });
      allBtn.classList.add("active");
      allBtn.setAttribute("aria-selected", "true");
      renderArticles();
    });
  }
}

function formatCategoryName(cat) {
  return cat.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// --------------------------------------------------------------------------
// Render Articles Grid
// --------------------------------------------------------------------------
function renderArticles() {
  if (!articlesGrid) return;

  // If there are zero articles overall on @pujitha-sdet, show empty profile state
  if (articlesData.length === 0) {
    handleEmptyFeed();
    return;
  }

  // Filter by category and search query
  const filtered = articlesData.filter(article => {
    const matchesCat = activeCategory === "all" || (article.categories && article.categories.includes(activeCategory));
    if (!matchesCat) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (article.title || "").toLowerCase().includes(q);
    const excerptMatch = (article.excerpt || "").toLowerCase().includes(q);
    const catMatch = (article.categories || []).some(c => c.toLowerCase().includes(q));
    return titleMatch || excerptMatch || catMatch;
  });

  // Handle Search Empty State
  if (filtered.length === 0) {
    articlesGrid.classList.add("hidden");
    if (noResultsState) {
      noResultsState.classList.remove("hidden");
      if (emptyStateIcon) emptyStateIcon.className = "fa-solid fa-magnifying-glass no-results-icon";
      if (emptyStateTitle) emptyStateTitle.textContent = "No matching technical case studies found";
      if (emptyStateDesc) {
        emptyStateDesc.textContent = `No articles matched "${searchQuery}". Try different keywords or reset your category filter.`;
      }
      if (resetSearchBtn) resetSearchBtn.classList.remove("hidden");
      if (syncFeedEmptyBtn) syncFeedEmptyBtn.classList.add("hidden");
    }
    return;
  }

  if (noResultsState) noResultsState.classList.add("hidden");
  articlesGrid.classList.remove("hidden");
  articlesGrid.innerHTML = "";

  filtered.forEach(article => {
    const isBookmarked = bookmarkedArticleGuids.includes(article.guid);
    const card = document.createElement("article");
    card.className = "article-card glassmorphism";
    card.dataset.guid = article.guid;

    // Header Visual: Image or Curated Editorial Gradient
    let visualHtml = "";
    if (article.thumbnail) {
      visualHtml = `
        <div class="article-cover-wrapper">
          <img src="${article.thumbnail}" alt="${article.title}" class="article-cover-img" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'gradient-fallback\\' style=\\'background: ${article.gradientTheme.bg}\\'><span>${formatCategoryName(article.primaryCategory)}</span></div>'">
          <span class="cover-category-badge">${formatCategoryName(article.primaryCategory)}</span>
        </div>
      `;
    } else {
      visualHtml = `
        <div class="article-gradient-cover" style="background: ${article.gradientTheme.bg}">
          <div class="gradient-cover-content">
            <i class="${article.gradientTheme.icon} gradient-icon"></i>
            <span class="gradient-tag">${article.gradientTheme.label}</span>
          </div>
          <span class="cover-category-badge">${formatCategoryName(article.primaryCategory)}</span>
        </div>
      `;
    }

    card.innerHTML = `
      ${visualHtml}
      <div class="article-card-body">
        <div class="article-meta-row">
          <span class="article-date"><i class="fa-regular fa-calendar"></i> ${article.pubDate}</span>
          <span class="article-read-time"><i class="fa-regular fa-clock"></i> ${article.readTime}</span>
        </div>

        <h3 class="article-card-title">${article.title}</h3>
        <p class="article-card-excerpt">${article.excerpt}</p>

        <div class="article-card-footer">
          <button class="btn btn-primary btn-sm read-article-btn" data-guid="${article.guid}">
            <span>Read Case Study</span> <i class="fa-solid fa-arrow-right"></i>
          </button>
          <button class="icon-btn bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" data-guid="${article.guid}" title="${isBookmarked ? 'Remove Bookmark' : 'Save Story'}" aria-label="Bookmark Story">
            <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
          </button>
        </div>
      </div>
    `;

    // Bind Read Case Study
    const readBtn = card.querySelector(".read-article-btn");
    if (readBtn) {
      readBtn.addEventListener("click", () => openArticleModal(article));
    }

    // Bind Bookmark button
    const bmBtn = card.querySelector(".bookmark-btn");
    if (bmBtn) {
      bmBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleBookmark(article);
      });
    }

    articlesGrid.appendChild(card);
  });
}

// --------------------------------------------------------------------------
// Article Reader Modal
// --------------------------------------------------------------------------
function openArticleModal(article) {
  if (!articleModal) return;
  currentOpenArticle = article;

  if (modalCategory) modalCategory.textContent = formatCategoryName(article.primaryCategory);
  if (modalReadTime) modalReadTime.textContent = article.readTime;
  if (modalTitle) modalTitle.textContent = article.title;
  if (modalDate) modalDate.textContent = article.pubDate;
  if (modalAuthorName) modalAuthorName.textContent = article.author || "Pujitha Saikam";

  // Tags
  if (modalTags) {
    modalTags.innerHTML = (article.categories || []).map(c => `
      <span class="badge badge-secondary">#${c}</span>
    `).join("");
  }

  // Article Body
  if (modalBody) {
    modalBody.innerHTML = article.content || "<p>No content preview available.</p>";
  }

  // External link to Medium
  if (modalExternalLink && article.link) {
    modalExternalLink.href = article.link;
  }
  if (modalBottomMediumBtn && article.link) {
    modalBottomMediumBtn.href = article.link;
  }

  // Update modal bookmark button state
  updateModalBookmarkBtn();

  articleModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeArticleModal() {
  if (!articleModal) return;
  articleModal.classList.add("hidden");
  document.body.style.overflow = "";
  currentOpenArticle = null;
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", closeArticleModal);
}

if (articleModal) {
  articleModal.addEventListener("click", (e) => {
    if (e.target === articleModal) {
      closeArticleModal();
    }
  });
}

// --------------------------------------------------------------------------
// Bookmarks Management
// --------------------------------------------------------------------------
function toggleBookmark(article) {
  const idx = bookmarkedArticleGuids.indexOf(article.guid);
  if (idx > -1) {
    bookmarkedArticleGuids.splice(idx, 1);
    showToast("Story removed from bookmarks.");
  } else {
    bookmarkedArticleGuids.push(article.guid);
    showToast("Saved to your bookmarks! 🔖", "success");
  }

  localStorage.setItem("ps_bookmarks", JSON.stringify(bookmarkedArticleGuids));
  updateBookmarkBadge();
  renderArticles();
  renderBookmarksDrawer();
  updateModalBookmarkBtn();
}

function updateModalBookmarkBtn() {
  if (!modalBookmarkBtn || !currentOpenArticle) return;
  const isBookmarked = bookmarkedArticleGuids.includes(currentOpenArticle.guid);
  modalBookmarkBtn.innerHTML = `<i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>`;
  modalBookmarkBtn.setAttribute("title", isBookmarked ? "Remove Bookmark" : "Save Story");
}

if (modalBookmarkBtn) {
  modalBookmarkBtn.addEventListener("click", () => {
    if (currentOpenArticle) {
      toggleBookmark(currentOpenArticle);
    }
  });
}

function updateBookmarkBadge() {
  if (!bookmarkCountBadge) return;
  const count = bookmarkedArticleGuids.length;
  bookmarkCountBadge.textContent = String(count);
  if (count > 0) {
    bookmarkCountBadge.classList.remove("hidden");
  } else {
    bookmarkCountBadge.classList.add("hidden");
  }
}

function renderBookmarksDrawer() {
  if (!bookmarksList) return;

  const bookmarkedArticles = articlesData.filter(a => bookmarkedArticleGuids.includes(a.guid));

  if (bookmarkedArticles.length === 0) {
    bookmarksList.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--text-muted);">
        <i class="fa-regular fa-bookmark" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;"></i>
        <h4>No bookmarks yet</h4>
        <p style="font-size: 0.85rem; margin-top: 6px;">Click the bookmark icon on any published story to save it here.</p>
      </div>
    `;
    return;
  }

  bookmarksList.innerHTML = "";
  bookmarkedArticles.forEach(article => {
    const item = document.createElement("div");
    item.className = "bookmark-drawer-item glassmorphism";
    item.innerHTML = `
      <div class="bookmark-item-content">
        <span class="badge badge-accent" style="font-size: 0.7rem; margin-bottom: 4px;">${formatCategoryName(article.primaryCategory)}</span>
        <h4 style="font-size: 0.95rem; margin: 4px 0 8px; line-height: 1.3;">${article.title}</h4>
        <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 8px;">
          <span>${article.pubDate}</span>
          <span>&bull;</span>
          <span>${article.readTime}</span>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
        <button class="btn btn-primary btn-xs open-bookmarked-btn" title="Read story">
          <i class="fa-solid fa-book-open"></i>
        </button>
        <button class="icon-btn remove-bookmarked-btn" title="Remove" style="width: 28px; height: 28px; font-size: 0.75rem;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;

    item.querySelector(".open-bookmarked-btn").addEventListener("click", () => {
      closeBookmarksDrawer();
      openArticleModal(article);
    });

    item.querySelector(".remove-bookmarked-btn").addEventListener("click", () => {
      toggleBookmark(article);
    });

    bookmarksList.appendChild(item);
  });
}

function openBookmarksDrawer() {
  if (!bookmarksDrawer || !drawerBackdrop) return;
  renderBookmarksDrawer();
  bookmarksDrawer.classList.remove("hidden");
  drawerBackdrop.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeBookmarksDrawer() {
  if (!bookmarksDrawer || !drawerBackdrop) return;
  bookmarksDrawer.classList.add("hidden");
  drawerBackdrop.classList.add("hidden");
  document.body.style.overflow = "";
}

if (bookmarkDrawerBtn) {
  bookmarkDrawerBtn.addEventListener("click", openBookmarksDrawer);
}

if (closeBookmarksBtn) {
  closeBookmarksBtn.addEventListener("click", closeBookmarksDrawer);
}

if (drawerBackdrop) {
  drawerBackdrop.addEventListener("click", closeBookmarksDrawer);
}

// --------------------------------------------------------------------------
// Search & Filter Events
// --------------------------------------------------------------------------
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    searchQuery = (e.target.value || "").trim();
    if (clearSearchBtn) {
      if (searchQuery.length > 0) {
        clearSearchBtn.classList.remove("hidden");
      } else {
        clearSearchBtn.classList.add("hidden");
      }
    }
    renderArticles();
  });
}

if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    searchQuery = "";
    clearSearchBtn.classList.add("hidden");
    renderArticles();
  });
}

if (resetSearchBtn) {
  resetSearchBtn.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    searchQuery = "";
    activeCategory = "all";
    if (clearSearchBtn) clearSearchBtn.classList.add("hidden");
    document.querySelectorAll(".cat-pill").forEach(p => {
      p.classList.remove("active");
      if (p.dataset.category === "all") p.classList.add("active");
    });
    renderArticles();
  });
}

if (syncFeedEmptyBtn) {
  syncFeedEmptyBtn.addEventListener("click", () => {
    syncFeedEmptyBtn.classList.add("fa-spin");
    fetchMediumFeed(true).finally(() => {
      syncFeedEmptyBtn.classList.remove("fa-spin");
    });
  });
}

if (refreshFeedBtn) {
  refreshFeedBtn.addEventListener("click", () => {
    refreshFeedBtn.classList.add("fa-spin");
    fetchMediumFeed(true).finally(() => {
      refreshFeedBtn.classList.remove("fa-spin");
    });
  });
}

// --------------------------------------------------------------------------
// Navigation & Window Event Listeners
// --------------------------------------------------------------------------
function setupEventListeners() {
  // Mobile Hamburger Toggle
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener("click", () => {
      const isExpanded = mobileMenuToggle.getAttribute("aria-expanded") === "true";
      mobileMenuToggle.setAttribute("aria-expanded", String(!isExpanded));
      navMenu.classList.toggle("is-open", !isExpanded);
    });

    navMenu.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", () => {
        mobileMenuToggle.setAttribute("aria-expanded", "false");
        navMenu.classList.remove("is-open");
      });
    });
  }

  // Reading Progress Bar
  window.addEventListener("scroll", () => {
    if (readingProgressBar) {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      readingProgressBar.style.width = scrolled + "%";
    }
  }, { passive: true });

  // Escape key closes modals and drawers
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (articleModal && !articleModal.classList.contains("hidden")) {
        closeArticleModal();
      }
      if (bookmarksDrawer && !bookmarksDrawer.classList.contains("hidden")) {
        closeBookmarksDrawer();
      }
    }
  });

  // Newsletter Form
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const emailInput = document.getElementById("newsletterEmail");
      if (emailInput && emailInput.value) {
        showToast(`Subscribed ${emailInput.value} to technical updates! 📬`, "success");
        emailInput.value = "";
      }
    });
  }

  // Contact Form
  if (contactForm) {
    contactForm.addEventListener("submit", () => {
      showToast("Preparing your message draft in your default email client... ✉️", "success");
    });
  }
}
