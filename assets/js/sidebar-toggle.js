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
  });
})();
