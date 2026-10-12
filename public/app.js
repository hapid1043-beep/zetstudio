const grid = document.getElementById('grid');
const empty = document.getElementById('empty');
const search = document.getElementById('search');
const form = document.getElementById('form');
const kindSel = document.getElementById('kind');
const fileField = document.getElementById('fileField');
const idField = document.getElementById('idField');
const fileInput = document.getElementById('file');
const idInput = document.getElementById('assetId');
const msg = document.getElementById('msg');

let items = [];
let filter = 'all';

const LABELS = { rbxm: 'File .rbxm', toolbox: 'Toolbox ID', upload: 'Upload ID' };

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

const fmtSize = (b) => {
  if (!b) return '';
  return b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(2) + ' MB' : (b / 1024).toFixed(1) + ' KB';
};

const fullLink = (link) => (link.startsWith('http') ? link : location.origin + link);

function card(i) {
  const isFile = i.kind === 'rbxm';
  const meta = isFile ? `${fmtSize(i.fileSize)} · ${esc(i.fileName)}` : `ID: ${esc(i.assetId)}`;
  const primary = isFile
    ? `<a class="btn" href="${esc(i.link)}" download>Unduh</a>`
    : `<a class="btn" href="${esc(i.link)}" target="_blank" rel="noopener">Buka di Roblox</a>`;
  const copyValue = isFile ? fullLink(i.link) : i.link;

  return `
    <article class="card">
      <span class="badge">${LABELS[i.kind]}</span>
      <h3>${esc(i.title)}</h3>
      <p class="desc">${esc(i.description)}</p>
      <p class="meta">${meta}</p>
      <div class="actions">
        ${primary}
        <button class="btn ghost" data-copy="${esc(copyValue)}">Salin link</button>
      </div>
    </article>`;
}

function render() {
  const q = search.value.trim().toLowerCase();
  const list = items.filter(
    (i) =>
      (filter === 'all' || i.kind === filter) &&
      (!q || `${i.title} ${i.description}`.toLowerCase().includes(q))
  );
  empty.classList.toggle('hidden', list.length > 0);
  grid.innerHTML = list.map(card).join('');
}

grid.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    btn.textContent = 'Tersalin ✓';
  } catch {
    btn.textContent = 'Gagal salin';
  }
  setTimeout(() => (btn.textContent = 'Salin link'), 1500);
});

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    filter = tab.dataset.filter;
    render();
  });
});

search.addEventListener('input', render);

function toggleFields() {
  const isFile = kindSel.value === 'rbxm';
  fileField.classList.toggle('hidden', !isFile);
  idField.classList.toggle('hidden', isFile);
  // Input yang disembunyikan di-disable agar tidak ikut terkirim
  fileInput.disabled = !isFile;
  idInput.disabled = isFile;
}

kindSel.addEventListener('change', toggleFields);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.className = 'msg';
  msg.textContent = 'Menyimpan...';

  const fd = new FormData(form);
  try {
    const res = await fetch('/api/items', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Gagal menyimpan');

    msg.classList.add('ok');
    msg.textContent = 'Tersimpan.';
    form.reset();
    toggleFields();
    await load();
  } catch (err) {
    msg.classList.add('err');
    msg.textContent = err.message;
  }
});

async function load() {
  try {
    const res = await fetch('/api/items');
    items = await res.json();
    render();
  } catch {
    empty.textContent = 'Gagal memuat data.';
    empty.classList.remove('hidden');
  }
}

toggleFields();
load();
