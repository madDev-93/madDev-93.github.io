/* Qwota v2 — restrained, purposeful motion only. */
(function () {
  "use strict";

  // Sticky nav background after scrolling past the hero top.
  var nav = document.getElementById("nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("is-stuck", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Scroll reveals — short, one-shot, respects reduced motion.
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  }

  // Videos with data-src start loading only after the page has loaded, so the hero
  // video (the heaviest file) doesn't hold up the fonts and the first screen. The
  // poster shows meanwhile. Autoplay safety net: muted inline videos occasionally
  // need a kick.
  function startVideos() {
    document.querySelectorAll("video").forEach(function (v) {
      if (v.dataset.src && !v.getAttribute("src")) v.src = v.dataset.src;
      v.muted = true;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
  }
  if (document.readyState === "complete") startVideos();
  else window.addEventListener("load", startVideos);
})();
