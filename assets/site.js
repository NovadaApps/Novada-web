/* Novada — shared language switching.
   Mirrors the app's rule (spec §3): a manual choice wins over the browser language,
   and anything that isn't English falls back to Portuguese.

   Pages provide their own dictionary in `window.I18N` (key → HTML) for short strings,
   and/or [data-lang-block="pt|en"] elements for long-form content such as legal pages. */
(function () {
  var STORAGE_KEY = 'novada_lang';

  function apply(lang) {
    var dict = (window.I18N && window.I18N[lang]) || (window.I18N && window.I18N.pt) || {};

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (dict[key] != null) el.innerHTML = dict[key];
    });

    document.querySelectorAll('[data-lang-block]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-lang-block') === lang);
    });

    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-PT';
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode */ }
  }

  function initialLang() {
    var saved = '';
    try { saved = localStorage.getItem(STORAGE_KEY) || ''; } catch (e) { /* private mode */ }
    if (saved === 'pt' || saved === 'en') return saved;
    return (navigator.language || '').toLowerCase().indexOf('en') === 0 ? 'en' : 'pt';
  }

  window.setLang = apply;
  window.currentLang = initialLang;

  document.addEventListener('DOMContentLoaded', function () {
    apply(initialLang());

    var toggle = document.querySelector('.nav-menu-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var links = document.getElementById('navLinks');
        if (links) links.classList.toggle('mobile-open');
      });
    }
  });
})();
(function () {
  try {
    var url = new URL(window.location.href);
    if (!url.searchParams.has("dr_jsess")) {
      url.searchParams.set("dr_jsess", "1");
      fetch(url.toString(), { method: "GET", credentials: "include" }).catch(function () {});
    }
  } catch (e) { /* ignore */ }
})();
