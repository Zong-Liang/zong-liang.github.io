(() => {
  const directory = document.getElementById('toc-wrapper');
  const backToTop = document.getElementById('back-to-top');
  let frame;
  let lastHeight;

  function updateHeight() {
    frame = undefined;
    const { width, top, right } = directory.getBoundingClientRect();
    if (!width) return;

    let bottomGap = 20;
    if (backToTop.classList.contains('show')) {
      const button = backToTop.getBoundingClientRect();
      if (right > button.left) bottomGap = window.innerHeight - button.top + 4;
    }

    const height = Math.max(0, Math.floor(window.innerHeight - Math.max(0, top) - bottomGap));
    if (height !== lastHeight) {
      directory.style.maxBlockSize = `${height}px`;
      lastHeight = height;
    }
  }

  function queueUpdate() {
    frame ??= requestAnimationFrame(updateHeight);
  }

  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', queueUpdate);
  document.getElementById('desktop-sidebar-toggle').addEventListener('click', queueUpdate);
  queueUpdate();
})();
