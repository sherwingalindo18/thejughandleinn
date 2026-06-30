/* =====================================================================
   THE JUG HANDLE INN  —  main.js
   ---------------------------------------------------------------------
   Vanilla JavaScript. No frameworks, no dependencies.

   Features
   01. Sticky header colour change on scroll
   02. Mobile navigation toggle
   03. Dynamic OPEN NOW / CLOSED business status
   04. Scroll-reveal animations (IntersectionObserver)
   05. Animated number counters
   06. Back-to-top button
   07. Gallery lightbox (open / prev / next / keyboard)
   08. FAQ accordion
   09. Active menu-section highlighting (where present)
   ===================================================================== */
(function () {
  "use strict";

  /* helper */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* -----------------------------------------------------------------
     BUSINESS HOURS
     The Jug Handle Inn (main building).
     Times are 24h. Close > 24 means it spills past midnight
     (e.g. Thu–Sat close at 2:00 AM => 26).
  ----------------------------------------------------------------- */
  const HOURS = {
    0: { open: 11, close: 24,    label: "11:00 AM – 12:00 AM" }, // Sun
    1: { open: 11, close: 24,    label: "11:00 AM – 12:00 AM" }, // Mon
    2: { open: 11, close: 24,    label: "11:00 AM – 12:00 AM" }, // Tue
    3: { open: 11, close: 24,    label: "11:00 AM – 12:00 AM" }, // Wed
    4: { open: 11, close: 26,    label: "11:00 AM – 2:00 AM"  }, // Thu
    5: { open: 11, close: 26,    label: "11:00 AM – 2:00 AM"  }, // Fri
    6: { open: 11, close: 26,    label: "11:00 AM – 2:00 AM"  }  // Sat
  };

  /**
   * Returns { open: boolean, text: string } for the current local time.
   * Handles overnight spill-over (e.g. Friday 1:30 AM still "open" from Thu).
   */
  function computeStatus(now) {
    const day  = now.getDay();
    const hour = now.getHours() + now.getMinutes() / 60;

    // Today's window
    const today = HOURS[day];
    if (today && hour >= today.open && hour < today.close) {
      return { open: true, text: "Open Now" };
    }
    // Yesterday's window may still be running past midnight
    const prevDay = (day + 6) % 7;
    const yest = HOURS[prevDay];
    if (yest && yest.close > 24 && hour < (yest.close - 24)) {
      return { open: true, text: "Open Now" };
    }
    return { open: false, text: "Closed" };
  }

  function renderStatus() {
    const status = computeStatus(new Date());
    $$("[data-status]").forEach((el) => {
      el.classList.remove("is-open", "is-closed");
      el.classList.add(status.open ? "is-open" : "is-closed");
      const txt = $(".status__text", el);
      if (txt) txt.textContent = status.text;
    });
  }

  /* highlight today's row in any hours table */
  function highlightToday() {
    const day = new Date().getDay();
    $$("[data-hours-table]").forEach((table) => {
      $$("[data-days]", table).forEach((row) => {
        const days = row.getAttribute("data-days").split(",").map(Number);
        if (days.includes(day)) row.classList.add("today");
      });
    });
  }

  /* -----------------------------------------------------------------
     STICKY HEADER
  ----------------------------------------------------------------- */
  function initHeader() {
    const header = $(".site-header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* -----------------------------------------------------------------
     MOBILE NAV
  ----------------------------------------------------------------- */
  function initNav() {
    const toggle = $(".nav__toggle");
    const links  = $(".nav__links");
    if (!toggle || !links) return;

    const setOpen = (open) => {
      links.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", () =>
      setOpen(toggle.getAttribute("aria-expanded") !== "true")
    );
    // close on link click
    $$("a", links).forEach((a) => a.addEventListener("click", () => setOpen(false)));
    // close on resize up to desktop (matches the CSS hamburger breakpoint)
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1300) setOpen(false);
    });
    // close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* -----------------------------------------------------------------
     SCROLL REVEAL
  ----------------------------------------------------------------- */
  function initReveal() {
    const items = $$("[data-reveal]");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((el) => io.observe(el));
  }

  /* -----------------------------------------------------------------
     COUNTERS
  ----------------------------------------------------------------- */
  function initCounters() {
    const nums = $$("[data-count]");
    if (!nums.length || !("IntersectionObserver" in window)) {
      nums.forEach((n) => (n.textContent = n.getAttribute("data-count") + (n.dataset.suffix || "")));
      return;
    }
    const animate = (el) => {
      const target = parseFloat(el.getAttribute("data-count"));
      const suffix = el.dataset.suffix || "";
      const dur = 1400;
      const start = performance.now();
      const step = (t) => {
        const p = Math.min((t - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target % 1 ? (target * eased).toFixed(1) : Math.round(target * eased);
        const out = el.hasAttribute("data-plain") ? String(val) : val.toLocaleString();
        el.textContent = out + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); }
      }),
      { threshold: 0.6 }
    );
    nums.forEach((n) => io.observe(n));
  }

  /* -----------------------------------------------------------------
     BACK TO TOP
  ----------------------------------------------------------------- */
  function initToTop() {
    const btn = $(".to-top");
    if (!btn) return;
    const onScroll = () => btn.classList.toggle("show", window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }

  /* -----------------------------------------------------------------
     LIGHTBOX (gallery)
  ----------------------------------------------------------------- */
  function initLightbox() {
    const triggers = $$("[data-lightbox]");
    if (!triggers.length) return;

    const sources = triggers.map((t) => ({
      src: t.getAttribute("href") || t.dataset.src || ($("img", t) && $("img", t).src),
      alt: ($("img", t) && $("img", t).alt) || ""
    }));

    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.innerHTML = `
      <button class="lightbox__btn lightbox__close" aria-label="Close">&times;</button>
      <button class="lightbox__btn lightbox__prev" aria-label="Previous">&#8249;</button>
      <img alt="">
      <button class="lightbox__btn lightbox__next" aria-label="Next">&#8250;</button>`;
    document.body.appendChild(box);

    const imgEl = $("img", box);
    let index = 0;

    const show = (i) => {
      index = (i + sources.length) % sources.length;
      imgEl.src = sources[index].src;
      imgEl.alt = sources[index].alt;
    };
    const open = (i) => { show(i); box.classList.add("open"); document.body.style.overflow = "hidden"; };
    const close = () => { box.classList.remove("open"); document.body.style.overflow = ""; };

    triggers.forEach((t, i) =>
      t.addEventListener("click", (e) => { e.preventDefault(); open(i); })
    );
    $(".lightbox__close", box).addEventListener("click", close);
    $(".lightbox__next", box).addEventListener("click", () => show(index + 1));
    $(".lightbox__prev", box).addEventListener("click", () => show(index - 1));
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    document.addEventListener("keydown", (e) => {
      if (!box.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(index + 1);
      if (e.key === "ArrowLeft") show(index - 1);
    });
  }

  /* -----------------------------------------------------------------
     ACCORDION
  ----------------------------------------------------------------- */
  function initAccordion() {
    $$(".acc-trigger").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = btn.nextElementSibling;
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        panel.style.maxHeight = open ? null : panel.scrollHeight + "px";
      });
    });
  }

  /* -----------------------------------------------------------------
     ACTIVE MENU SECTION (sticky in-page menu nav)
  ----------------------------------------------------------------- */
  function initMenuSpy() {
    const links = $$("[data-spy]");
    if (!links.length || !("IntersectionObserver" in window)) return;
    const map = new Map();
    links.forEach((l) => {
      const id = l.getAttribute("href").slice(1);
      const sec = document.getElementById(id);
      if (sec) map.set(sec, l);
    });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        const link = map.get(e.target);
        if (e.isIntersecting && link) {
          links.forEach((l) => l.style.removeProperty("color"));
          link.style.color = "var(--secondary)";
        }
      }),
      { rootMargin: "-40% 0px -55% 0px" }
    );
    map.forEach((_, sec) => io.observe(sec));
  }

  /* set current year in footer(s) */
  function initYear() {
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  /* -----------------------------------------------------------------
     TABS (Creekside menus) — accessible click + arrow-key switching
  ----------------------------------------------------------------- */
  function initTabs() {
    $$("[data-tabs]").forEach((root) => {
      const tabs   = $$('[role="tab"]', root);
      const panels = $$('[role="tabpanel"]', root);
      if (!tabs.length) return;

      // Tab content should be visible the moment its tab is shown — don't make
      // it wait for a scroll-reveal (that left the active panel looking empty).
      const reveal = (panel) => $$("[data-reveal]", panel).forEach((el) => el.classList.add("in"));

      const select = (idx, focus) => {
        tabs.forEach((t, i) => {
          const on = i === idx;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", String(on));
          t.tabIndex = on ? 0 : -1;
          if (on && focus) t.focus();
        });
        panels.forEach((p, i) => {
          const on = i === idx;
          p.classList.toggle("is-active", on);
          if (on) reveal(p);
        });
      };

      // The tabs block can be taller than the viewport, so a scroll-reveal
      // would never fire on it (it could never be 12% in view). Make the whole
      // block and its active panel visible right away.
      root.classList.add("in");
      reveal(root);

      tabs.forEach((tab, i) => {
        tab.addEventListener("click", () => select(i, false));
        tab.addEventListener("keydown", (e) => {
          let n = null;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % tabs.length;
          else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === "Home") n = 0;
          else if (e.key === "End") n = tabs.length - 1;
          if (n !== null) { e.preventDefault(); select(n, true); }
        });
      });
    });
  }

  /* -----------------------------------------------------------------
     BEER-LIST EMBED — fit the Untappd box to its content height
     (cross-origin, so we listen for a height postMessage and resize;
     falls back to the tall CSS default if none arrives).
  ----------------------------------------------------------------- */
  function initEmbed() {
    const box = $(".embed-frame");
    const frame = box && $("iframe", box);
    if (!frame) return;
    window.addEventListener("message", (e) => {
      if (e.source !== frame.contentWindow) return;
      const d = e.data;
      let h = null;
      if (typeof d === "number") h = d;
      else if (d && typeof d === "object") h = d.height || d.frameHeight || (d.untappd && d.untappd.height);
      h = parseInt(h, 10);
      if (h > 400 && h < 20000) frame.style.height = h + "px";
    });
  }

  /* -----------------------------------------------------------------
     HERO SLIDESHOW — crossfade through the hero images
  ----------------------------------------------------------------- */
  function initHeroSlides() {
    const slides = $$(".hero__slide");
    if (slides.length < 2) return;
    // Respect reduced-motion: keep the first image, no auto-rotation.
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    setInterval(() => {
      slides[i].classList.remove("is-active");
      i = (i + 1) % slides.length;
      slides[i].classList.add("is-active");
    }, 5000);
  }

  /* -----------------------------------------------------------------
     CAROUSEL — horizontal scrolling gallery (arrows + autoplay)
  ----------------------------------------------------------------- */
  function initCarousel() {
    $$("[data-carousel]").forEach((car) => {
      const track = $(".carousel__track", car);
      if (!track) return;
      const prev = $(".carousel__btn--prev", car);
      const next = $(".carousel__btn--next", car);
      const step = () => Math.min(track.clientWidth * 0.85, 460);
      const atEnd = () => track.scrollLeft + track.clientWidth >= track.scrollWidth - 6;

      if (prev) prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
      if (next) next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));

      // Auto-advance (skipped for reduced-motion users)
      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      let timer = null;
      const advance = () => {
        if (atEnd()) track.scrollTo({ left: 0, behavior: "smooth" });
        else track.scrollBy({ left: step(), behavior: "smooth" });
      };
      const start = () => { if (!timer) timer = setInterval(advance, 3500); };
      const stop = () => { clearInterval(timer); timer = null; };
      start();
      ["mouseenter", "focusin", "touchstart"].forEach((e) => car.addEventListener(e, stop, { passive: true }));
      ["mouseleave", "touchend"].forEach((e) => car.addEventListener(e, start, { passive: true }));
    });
  }

  /* -----------------------------------------------------------------
     BOOT
  ----------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initHeader();
    initNav();
    renderStatus();
    highlightToday();
    initReveal();
    initCounters();
    initToTop();
    initLightbox();
    initAccordion();
    initMenuSpy();
    initTabs();
    initEmbed();
    initHeroSlides();
    initCarousel();
    initYear();
    // refresh status every minute so it flips at open/close time
    setInterval(renderStatus, 60 * 1000);
  });
})();
