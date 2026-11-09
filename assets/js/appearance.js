var Theme = (() => {
  const root = document.documentElement;
  const key = 'wobble.appearance';
  const palettes = new Map(JSON.parse(root.dataset.themes).map(preset => [preset.id, preset]));
  const modes = ['system', 'light', 'dark'];
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const fonts = root.dataset.fonts.split(' ');
  const fontAliases = new Map([['wobble', 'sans'], ['fangsong', 'marker'], ['system', 'wenkai']]);
  const fontStylesheets = JSON.parse(root.dataset.fontStylesheets ?? '[]');
  const fontLoads = new Map();
  const warmedFonts = new Set();
  const defaults = { theme: root.dataset.appearanceTheme, mode: root.dataset.appearanceMode, font: root.dataset.font };
  const preferences = { ...defaults };

  function save() {
    try {
      const stored = {};
      for (const name of Object.keys(defaults)) {
        if (preferences[name] !== defaults[name]) stored[name] = preferences[name];
      }
      if (Object.keys(stored).length) localStorage.setItem(key, JSON.stringify(stored));
      else localStorage.removeItem(key);
    } catch {
      // The current page can still use the chosen appearance.
    }
  }

  function migrate(stored, sessionMode) {
    if (stored?.background) {
      for (const preset of palettes.values()) {
        for (const mode of ['light', 'dark']) {
          const { id, legacy_id } = preset[mode];
          if (stored.background === id || stored.background === legacy_id) {
            return { theme: preset.id, mode, font: stored.font };
          }
        }
      }
      return { font: stored.font };
    }

    const previous = {
      wobble: { theme: 'neutral', font: 'sans' },
      paper: { theme: 'tea', font: 'serif' },
      forest: { theme: 'moss', font: 'wenkai' }
    };
    const palette = Object.hasOwn(previous, stored?.palette) ? stored.palette : 'wobble';
    const preset = previous[palette];
    return {
      theme: preset.theme,
      mode: stored?.mode ?? sessionMode ?? 'system',
      font: stored?.fonts?.[palette] ?? stored?.font ?? preset.font
    };
  }

  try {
    let stored = JSON.parse(localStorage.getItem(key));
    const sessionMode = sessionStorage.getItem('mode');
    const legacy = stored?.background || stored?.palette || stored?.fonts
      || (!stored && ['light', 'dark'].includes(sessionMode));

    if (legacy) stored = migrate(stored, sessionMode);
    const font = fontAliases.get(stored?.font) ?? stored?.font;
    if (palettes.has(stored?.theme)) preferences.theme = stored.theme;
    if (modes.includes(stored?.mode)) preferences.mode = stored.mode;
    if (fonts.includes(font)) preferences.font = font;
    if (legacy || font !== stored?.font) save();
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

  function nextValue(options, current) {
    return options[(options.indexOf(current) + 1) % options.length];
  }

  async function warmNextFont() {
    const connection = navigator.connection;
    if (document.hidden || connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType)) return;

    const font = nextValue(fonts, preferences.font);
    if (!fontStylesheets[fonts.indexOf(font)]?.length || warmedFonts.has(font)) return;
    warmedFonts.add(font);
    await fontStylesReady(font);
    if (nextValue(fonts, preferences.font) !== font) {
      warmedFonts.delete(font);
      return;
    }

    const probe = document.createElement('span');
    probe.hidden = true;
    probe.dataset.font = font;
    document.body.append(probe);
    // The first two families are the preset's Latin and CJK faces.
    const families = getComputedStyle(probe).getPropertyValue('--wobble-font').split(',').slice(0, 2).join(',').trim();
    probe.remove();
    if (!families) return;

    const title = (document.querySelector('main h1')?.textContent.trim() || document.title).slice(0, 48);
    const intro = document.querySelector('main .content p')?.textContent.trim().slice(0, 32) ?? '';
    const results = await Promise.allSettled([
      document.fonts.load(`400 16px ${families}`, `${title} ${intro}`),
      document.fonts.load(`600 16px ${families}`, title)
    ]);
    if (results.some(result => result.status === 'rejected')) warmedFonts.delete(font);
  }

  function scheduleFontWarmup() {
    const font = preferences.font;
    const warmWhenReady = async () => {
      await fontStylesReady(font);
      await document.fonts.ready;
      if (preferences.font === font) warmNextFont();
    };
    if (window.requestIdleCallback) window.requestIdleCallback(warmWhenReady, { timeout: 1000 });
    else window.setTimeout(warmWhenReady, 250);
  }

  function apply() {
    const { theme: paletteId, mode, font } = preferences;
    const scheme = mode === 'system' ? (systemDark.matches ? 'dark' : 'light') : mode;
    const background = palettes.get(paletteId)[scheme];
    const previousScheme = root.dataset.colorScheme;
    root.dataset.appearanceTheme = paletteId;
    root.dataset.appearanceMode = mode;
    root.dataset.background = background.id;
    root.dataset.colorScheme = scheme;
    root.dataset.font = font;
    document.querySelector('meta[name="theme-color"]').content = background.color;

    fontStylesReady(font);

    if (document.readyState !== 'loading' && previousScheme !== scheme) {
      window.postMessage({ id: theme.ID }, '*');
    }
  }

  apply();
  systemDark.addEventListener('change', () => {
    if (preferences.mode === 'system') apply();
  });

  document.addEventListener('DOMContentLoaded', () => {
    for (const [name, options] of Object.entries({ mode: modes, theme: [...palettes.keys()], font: fonts })) {
      const button = document.getElementById(`${name}-switch`);

      function updateLabel() {
        const label = button.getAttribute(`data-label-${preferences[name]}`);
        button.dataset.tooltip = label;
        button.setAttribute('aria-label', `${button.dataset.label} · ${label}`);
      }

      button.addEventListener('click', () => {
        preferences[name] = nextValue(options, preferences[name]);
        apply();
        updateLabel();
        save();
        if (name === 'font') scheduleFontWarmup();
      });

      if (name === 'font') {
        button.addEventListener('pointerenter', warmNextFont);
        button.addEventListener('focus', warmNextFont);
      }
      updateLabel();
      button.hidden = false;
    }
    scheduleFontWarmup();
  });

  return theme;
})();
