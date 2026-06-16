/* Qwota v2 — interaction layer (Aceternity-inspired, restrained).
   Loaded only by index.html, after qwota-v2.js. Progressive enhancement:
   selects existing elements, injects its own layers, no-ops under reduced
   motion / coarse pointers, and never hides content unless it can animate it. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduce;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  function raf(fn) {
    var queued = false, lastArgs, lastThis;
    return function () {
      lastArgs = arguments; lastThis = this;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; fn.apply(lastThis, lastArgs); });
    };
  }

  // Gate: only now is it safe for CSS to hide things for animation.
  if (!reduce) document.documentElement.classList.add("fx-ready");

  // ---- 1. Hero line cascade ----------------------------------------
  function heroCascade() {
    if (reduce) return;
    var h1 = document.querySelector(".hero__title");
    if (!h1) return;
    var lines = [], cur = document.createElement("span");
    cur.className = "fx-line";
    Array.prototype.slice.call(h1.childNodes).forEach(function (node) {
      if (node.nodeType === 1 && node.tagName === "BR") {
        lines.push(cur);
        cur = document.createElement("span");
        cur.className = "fx-line";
      } else {
        cur.appendChild(node.cloneNode(true));
      }
    });
    lines.push(cur);
    h1.textContent = "";
    lines.forEach(function (l, i) { l.style.setProperty("--i", i); h1.appendChild(l); });
    h1.style.setProperty("--n", lines.length);
    h1.classList.add("fx-cascade");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { h1.classList.add("is-in"); });
    });
  }

  // ---- 2. Word reveals ---------------------------------------------
  function wrapWords(el) {
    var words = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (p === "") return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement("span");
            s.className = "fx-w"; s.textContent = p;
            frag.appendChild(s); words.push(s);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== "BR") {
          walk(c);
        }
      });
    })(el);
    return words;
  }
  function wordReveals() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var els = document.querySelectorAll(".manifesto p, .feature__copy h2");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.25, rootMargin: "0px 0px -10% 0px" });
    Array.prototype.forEach.call(els, function (el) {
      var ws = wrapWords(el);
      ws.forEach(function (w, i) { w.style.setProperty("--i", i); });
      el.classList.add("fx-words");
      io.observe(el);
    });
  }

  // ---- 3. Floating hero annotations --------------------------------
  function annots() {
    if (reduce) return;
    var stage = document.querySelector(".hero__stage");
    if (!stage || !stage.querySelector(".annot")) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { stage.classList.add("fx-annots-in"); });
    });
  }

  // ---- 4. Tracing beam down 01–04 ----------------------------------
  function tracingBeam() {
    if (reduce) return;
    var first = document.getElementById("coach"), last = document.getElementById("watch");
    if (!first || !last) return;
    var beam = document.createElement("div");
    beam.className = "fx-beam"; beam.setAttribute("aria-hidden", "true");
    beam.innerHTML = '<div class="fx-beam__fill"></div><div class="fx-beam__dot"></div>';
    document.body.appendChild(beam);
    var sections = ["coach", "train", "fuel", "watch"]
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    function place() {
      var contentLeft = Math.max(16, (window.innerWidth - 1180) / 2);
      beam.style.left = Math.max(12, contentLeft - 22) + "px";
    }
    var update = raf(function () {
      var a = first.getBoundingClientRect(), b = last.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var active = b.bottom > 0 && a.top < vh;
      beam.classList.toggle("is-active", active);
      if (!active) return;
      var total = b.bottom - a.top;
      var p = clamp((vh * 0.5 - a.top) / total, 0, 1);
      beam.style.setProperty("--p", (p * 100).toFixed(1) + "%");
      sections.forEach(function (sec) {
        var r = sec.getBoundingClientRect();
        sec.classList.toggle("fx-lit", r.top < vh * 0.55 && r.bottom > vh * 0.2);
      });
    });
    place(); update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", raf(function () { place(); update(); }), { passive: true });
  }

  // ---- 5. Device micro-tilt ----------------------------------------
  function deviceTilt() {
    if (!canHover) return;
    Array.prototype.forEach.call(document.querySelectorAll(".device"), function (d) {
      d.classList.add("fx-tilt");
      d.addEventListener("mouseenter", function () { d.classList.remove("is-resetting"); });
      d.addEventListener("mousemove", raf(function (e) {
        var r = d.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        d.style.transform = "perspective(1100px) rotateX(" + (-py * 3).toFixed(2) +
                            "deg) rotateY(" + (px * 3).toFixed(2) + "deg)";
      }), { passive: true });
      d.addEventListener("mouseleave", function () {
        d.classList.add("is-resetting"); d.style.transform = "";
      });
    });
  }

  // ---- 6. Magnetic CTAs --------------------------------------------
  function magnetic() {
    if (!canHover) return;
    Array.prototype.forEach.call(document.querySelectorAll(".btn--pill, .appstore"), function (btn) {
      btn.classList.add("fx-magnetic");
      btn.addEventListener("mousemove", raf(function (e) {
        var r = btn.getBoundingClientRect();
        var dx = clamp((e.clientX - (r.left + r.width / 2)) * 0.3, -7, 7);
        var dy = clamp((e.clientY - (r.top + r.height / 2)) * 0.3, -7, 7);
        btn.classList.add("is-pulling");
        btn.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
      }), { passive: true });
      btn.addEventListener("mouseleave", function () {
        btn.classList.remove("is-pulling"); btn.style.transform = "";
      });
    });
  }

  function init() {
    heroCascade();
    wordReveals();
    annots();
    tracingBeam();
    deviceTilt();
    magnetic();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
