(() => {
  const MIN_COLUMN_WIDTH = 48;

  // Widths are frozen into a colgroup on first drag; until then the browser's auto layout applies.
  function freeze(table) {
    let columns = table.querySelector(':scope > colgroup.table-resize-cols');
    if (columns) return columns;

    const widths = [...table.tHead.rows[0].cells].map((cell) => cell.getBoundingClientRect().width);
    columns = document.createElement('colgroup');
    columns.className = 'table-resize-cols';
    for (const width of widths) {
      const column = document.createElement('col');
      column.style.width = `${width}px`;
      columns.append(column);
    }
    table.prepend(columns);
    Object.assign(table.style, { tableLayout: 'fixed', minWidth: '0' });
    updateTableWidth(table, columns);
    return columns;
  }

  function updateTableWidth(table, columns) {
    const total = [...columns.children].reduce((sum, column) => sum + parseFloat(column.style.width), 0);
    table.style.width = `${total}px`;
  }

  function reset(table) {
    table.querySelector(':scope > colgroup.table-resize-cols')?.remove();
    table.removeAttribute('style');
  }

  function attach(table, cell, index) {
    const handle = document.createElement('span');
    handle.className = 'table-resizer';
    handle.setAttribute('aria-hidden', 'true');
    cell.append(handle);

    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const columns = freeze(table);
      const column = columns.children[index];
      const startX = event.clientX;
      const startWidth = parseFloat(column.style.width);
      handle.setPointerCapture(event.pointerId);
      handle.classList.add('is-active');

      const move = (moveEvent) => {
        column.style.width = `${Math.max(MIN_COLUMN_WIDTH, startWidth + moveEvent.clientX - startX)}px`;
        updateTableWidth(table, columns);
      };
      const stop = () => {
        handle.classList.remove('is-active');
        handle.removeEventListener('pointermove', move);
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('lostpointercapture', stop, { once: true });
    });

    handle.addEventListener('dblclick', () => reset(table));
  }

  for (const table of document.querySelectorAll('article .content .table-wrapper > table')) {
    const cells = table.tHead?.rows[0]?.cells;
    if (!cells) continue;
    [...cells].forEach((cell, index) => attach(table, cell, index));
  }
})();
