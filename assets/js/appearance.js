var Theme = (() => {
  const root = document.documentElement;
  const key = 'wobble.appearance';
  const backgrounds = root.dataset.backgrounds.split(' ');
  const darkBackgrounds = root.dataset.darkBackgrounds.split(' ');
  const backgroundAliases = new Map((root.dataset.backgroundAliases ?? 'wobble:neutral').split(',').map(pair => pair.split(':')));
  const fonts = root.dataset.fonts.split(' ');
  const fontAliases = new Map([['wobble', 'sans'], ['fangsong', 'marker']]);
  const fontStylesheets = JSON.parse(root.dataset.fontStylesheets ?? '[]');
  const fontLoads = new Map();
  const defaults = { background: root.dataset.background, font: root.dataset.font };
  const preferences = { ...defaults };

  function save() {
    try {
      const { background, font } = preferences;
      const stored = {};
      if (background !== defaults.background) stored.background = background;
      if (font !== defaults.font) stored.font = font;
      if (Object.keys(stored).length) localStorage.setItem(key, JSON.stringify(stored));
      else localStorage.removeItem(key);
    } catch {
      // The current page can still use the chosen appearance.
    }
  }

  function migrate(stored, sessionMode) {
    const previous = {
      wobble: { bright: 'neutral', soft: 'mist', font: 'sans' },
      paper: { bright: 'paper', soft: 'wheat', font: 'serif' },
      forest: { bright: 'forest', soft: 'moss', font: 'wenkai' }
    };
    const palette = Object.hasOwn(previous, stored?.palette) ? stored.palette : 'wobble';
    const preset = previous[palette];
    const mode = stored?.mode ?? sessionMode;
    const soft = mode === 'dark' || (mode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    const font = stored?.fonts?.[palette] ?? stored?.font ?? preset.font;
    return { background: soft ? preset.soft : preset.bright, font: font === 'system' ? 'wenkai' : font };
  }

  try {
    let stored = JSON.parse(localStorage.getItem(key));
    const sessionMode = sessionStorage.getItem('mode');
    const legacy = stored?.palette || stored?.mode || stored?.fonts || stored?.font === 'system'
      || (!stored && ['light', 'dark'].includes(sessionMode));

    if (legacy) stored = migrate(stored, sessionMode);
    const background = backgroundAliases.get(stored?.background) ?? stored?.background;
    const font = fontAliases.get(stored?.font) ?? stored?.font;
    if (backgrounds.includes(background)) preferences.background = background;
    if (fonts.includes(font)) preferences.font = font;
    if (legacy || background !== stored?.background || font !== stored?.font) save();
    if (sessionMode) sessionStorage.removeItem('mode');
  } catch {
    // Use the site defaults when storage is unavailable or malformed.
  }

  const theme = {
    LIGHT: 'light',
    DARK: 'dark',
    ID: 'theme-mode',
    switchable: true,
    get visualState() { return root.dataset.colorScheme; },
    getThemeMapper(light, dark) { return { light, dark }; },
    fontStylesReady
  };

  function fontStylesReady(font) {
    const urls = fontStylesheets[fonts.indexOf(font)] ?? [];
    return Promise.all(urls.map(url => {
      if (!fontLoads.has(url)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        // FontsAPI rejects local preview referrers.
        link.referrerPolicy = 'no-referrer';
        const loaded = new Promise(resolve => {
          link.addEventListener('load', resolve, { once: true });
          link.addEventListener('error', () => {
            fontLoads.delete(url);
            link.remove();
            resolve();
          }, { once: true });
        });
        fontLoads.set(url, loaded);
        document.head.append(link);
      }
      return fontLoads.get(url);
    }));
  }

  function updateThemeColor() {
    const background = getComputedStyle(root).getPropertyValue('--main-bg').trim();
    if (background) document.querySelector('meta[name="theme-color"]').content = background;
  }

  function apply() {
    const previousScheme = root.dataset.colorScheme;
    root.dataset.background = preferences.background;
    root.dataset.colorScheme = darkBackgrounds.includes(preferences.background) ? theme.DARK : theme.LIGHT;
    root.dataset.font = preferences.font;

    fontStylesReady(preferences.font);

    if (document.readyState !== 'loading') {
      updateThemeColor();
      if (previousScheme !== theme.visualState) window.postMessage({ id: theme.ID }, '*');
    }
  }

  apply();

  document.addEventListener('DOMContentLoaded', () => {
    updateThemeColor();

    for (const [name, options] of Object.entries({ background: backgrounds, font: fonts })) {
      const button = document.getElementById(`${name}-switch`);

      function updateLabel() {
        const label = button.getAttribute(`data-label-${preferences[name]}`);
        button.dataset.tooltip = label;
        button.setAttribute('aria-label', `${button.dataset.label} · ${label}`);
      }

      button.addEventListener('click', () => {
        preferences[name] = options[(options.indexOf(preferences[name]) + 1) % options.length];
        apply();
        updateLabel();
        save();
      });

      updateLabel();
      button.hidden = false;
    }
  });

  return theme;
})();
