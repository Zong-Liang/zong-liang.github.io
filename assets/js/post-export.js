(() => {
  const button = document.getElementById('post-export');
  const status = document.getElementById('post-export-status');
  const article = button.closest('article');
  let dismissStatus;

  function makeSheet() {
    const frame = document.createElement('main');
    frame.className = 'post-export-frame';
    frame.dataset.font = document.documentElement.dataset.font;
    frame.inert = true;
    frame.setAttribute('aria-hidden', 'true');

    const sheet = article.cloneNode(false);
    sheet.append(
      article.querySelector(':scope > header').cloneNode(true),
      article.querySelector(':scope > .content').cloneNode(true)
    );
    sheet.querySelector('#pageviews')?.closest('span')?.remove();
    for (const element of sheet.querySelectorAll('.post-export-control, .code-header button, script')) {
      element.remove();
    }
    frame.append(sheet);
    return frame;
  }

  async function prepareMedia(sheet) {
    function markUnavailable(element) {
      const placeholder = document.createElement('span');
      placeholder.className = 'post-export-missing';
      const label = element.getAttribute('alt') || element.getAttribute('title');
      placeholder.textContent = label ? `${button.dataset.unavailable} · ${label}` : button.dataset.unavailable;
      element.replaceWith(placeholder);
      return false;
    }

    const embedded = sheet.querySelectorAll('iframe, video, audio');
    embedded.forEach(markUnavailable);
    const results = await Promise.all([...sheet.querySelectorAll('img')].map(async (image) => {
      const source = image.dataset.src || image.getAttribute('src');
      image.closest('.popup')?.classList.remove('blur', 'shimmer');
      image.removeAttribute('srcset');
      image.removeAttribute('data-lqip');
      image.closest('picture')?.querySelectorAll('source').forEach((element) => element.remove());
      image.loading = 'eager';

      try {
        if (!source) return markUnavailable(image);
        const response = await fetch(source, { signal: AbortSignal.timeout(12000) });
        if (!response.ok) return markUnavailable(image);
        const blob = await response.blob();
        image.src = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        await image.decode();
        return true;
      } catch {
        return markUnavailable(image);
      }
    }));
    return embedded.length > 0 || results.includes(false);
  }

  async function renderImage(render, sheet) {
    const width = Math.ceil(sheet.getBoundingClientRect().width);
    const height = Math.ceil(sheet.getBoundingClientRect().height);
    const preferredArea = 24_000_000;
    const fallbackArea = 4_000_000;
    const scale = Math.min(2, 100_000 / height, Math.sqrt(160_000_000 / (width * height)));
    const pixelWidth = Math.floor(width * scale);
    const pixelHeight = Math.floor(height * scale);
    const fitsOnCanvas = pixelHeight <= 30_000 && pixelWidth * pixelHeight <= preferredArea;
    const { background, colorScheme } = document.documentElement.dataset;
    const renderOptions = {
      backgroundColor: getComputedStyle(document.body).backgroundColor,
      logging: false,
      width,
      async onclone(clone) {
        Object.assign(clone.documentElement.dataset, { background, colorScheme });
        await clone.fonts.ready;
      }
    };

    async function capture(imageScale) {
      const canvas = await render(sheet, { ...renderOptions, height, scale: imageScale });
      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG encoding failed');
        return blob;
      } finally {
        canvas.width = canvas.height = 0;
      }
    }

    if (fitsOnCanvas) {
      try {
        return await capture(scale);
      } catch (error) {
        if (pixelWidth * pixelHeight <= fallbackArea) throw error;
      }
    }

    if (typeof CompressionStream === 'function') {
      const { encodeTallPng } = await import('./post-export-png.js');

      function captureTiles(maxArea) {
        const tileHeight = Math.min(16_000, Math.floor(maxArea / pixelWidth));
        return encodeTallPng(pixelWidth, pixelHeight, tileHeight, async (top, rows) => {
          const canvas = document.createElement('canvas');
          canvas.width = pixelWidth;
          canvas.height = rows;
          try {
            await render(sheet, { ...renderOptions, canvas, y: top / scale, height: rows / scale, scale });
            const pixels = canvas.getContext('2d').getImageData(0, 0, pixelWidth, rows).data;
            if (pixels[3] !== 255) throw new Error('Canvas allocation failed');
            return pixels;
          } finally {
            canvas.width = canvas.height = 0;
          }
        });
      }

      if (!fitsOnCanvas) {
        try {
          return await captureTiles(preferredArea);
        } catch {
          // Retry with smaller canvases on devices with a lower allocation limit.
        }
      }
      return captureTiles(fallbackArea);
    }

    return capture(Math.min(scale, 30_000 / height, Math.sqrt(fallbackArea / (width * height))));
  }

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    clearTimeout(dismissStatus);
    status.textContent = button.dataset.busy;

    const frame = makeSheet();
    try {
      const sheet = frame.firstElementChild;
      const [{ default: render }, partial] = await Promise.all([
        import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm'),
        prepareMedia(sheet),
        Theme.fontStylesReady(frame.dataset.font)
      ]);
      document.body.append(frame);
      sheet.getBoundingClientRect();
      await document.fonts.ready;

      const png = await renderImage(render, sheet);
      const url = URL.createObjectURL(png);
      const title = article.querySelector('h1').textContent.trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 100);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'article'}.png`;
      status.textContent = partial ? button.dataset.partial : button.dataset.done;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error('Article image export failed', error);
      status.textContent = button.dataset.error;
    } finally {
      frame.remove();
      button.disabled = false;
      dismissStatus = setTimeout(() => {
        status.textContent = '';
      }, 4000);
    }
  });

  button.hidden = false;
})();
