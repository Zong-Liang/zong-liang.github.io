(() => {
  const storageKey = 'wobble.sidebar-collapsed';
  const root = document.documentElement;
  const attribute = 'data-sidebar-collapsed';

  try {
    root.toggleAttribute(attribute, localStorage.getItem(storageKey) === 'true');
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('desktop-sidebar-toggle');

    function updateButton() {
      const collapsed = root.hasAttribute(attribute);
      const label = collapsed ? toggle.dataset.expandLabel : toggle.dataset.collapseLabel;
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }

    toggle.addEventListener('click', () => {
      const collapsed = root.toggleAttribute(attribute);
      updateButton();

      try {
        localStorage.setItem(storageKey, String(collapsed));
      } catch {
        // The toggle still works for the current page.
      }
    });

    updateButton();
    toggle.hidden = false;

    const mobileToggle = document.getElementById('sidebar-trigger');
    const mask = document.getElementById('mask');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main-wrapper');

    function updateDrawer() {
      const expanded = document.body.hasAttribute('sidebar-display');
      mobileToggle.setAttribute('aria-expanded', String(expanded));
      main.inert = expanded;
      if (expanded) {
        sidebar.querySelector('nav a')?.focus({ preventScroll: true });
      } else {
        (mobileToggle.getClientRects().length ? mobileToggle : toggle).focus({ preventScroll: true });
      }
    }

    mobileToggle.addEventListener('click', updateDrawer);
    mask.addEventListener('click', updateDrawer);
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]') || !document.body.hasAttribute('sidebar-display')) return;
      event.preventDefault();
      mask.click();
    });
    window.addEventListener('resize', () => {
      if (document.body.hasAttribute('sidebar-display') && !mobileToggle.getClientRects().length) mask.click();
    });
  });
})();
