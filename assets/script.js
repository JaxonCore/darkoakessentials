// Simple markdown docs renderer with sidebar + search
// Requirements: marked.js and highlight.js loaded in index.html

const SIDEBAR_JSON = 'sidebar.json';
const DOCS_PATH = 'docs/';
const DEFAULT_PAGE = 'index.md';

const navEl = document.getElementById('nav');
const contentEl = document.getElementById('content');
const searchInput = document.getElementById('search');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');

menuToggle?.addEventListener('click', ()=> sidebar.classList.toggle('open'));

// load sidebar file
let pages = []; // {id, title, file}

async function loadSidebar(){
  try{
    const res = await fetch(SIDEBAR_JSON);
    if(!res.ok) throw new Error('sidebar.json not found');
    pages = await res.json();
    buildNav(pages);
    const first = pages[0] || {file: DEFAULT_PAGE};
    const hashFile = decodeURIComponent(location.hash?.slice(1));
    const toLoad = hashFile ? hashFile : first.file;
    await loadDoc(toLoad);
  }catch(e){
    contentEl.innerHTML = `<h2>Error</h2><p>${e.message}</p>`;
  }
}

function buildNav(list){
  navEl.innerHTML = '';
  list.forEach(p=>{
    const a = document.createElement('a');
    a.className = 'nav-link';
    a.href = '#'+p.file;
    a.dataset.file = p.file;
    a.textContent = p.title;
    a.addEventListener('click', (ev)=>{
      ev.preventDefault();
      loadDoc(p.file);
      if(window.innerWidth < 900) sidebar.classList.remove('open');
    });
    navEl.appendChild(a);
  });
  updateActiveLink();
}

async function loadDoc(file){
  try{
    const res = await fetch(DOCS_PATH + file);
    if(!res.ok) throw new Error('Document not found: '+file);
    const md = await res.text();
    renderMarkdown(md);
    location.hash = encodeURIComponent(file);

    updateActive(file);
  }catch(e){
    contentEl.innerHTML = `<h2>Error</h2><p>${e.message}</p>`;
  }
}

function renderMarkdown(md){
  // Allow basic config
  marked.setOptions({
    breaks: true,
    smartypants: true
  });
  const html = marked.parse(md);
  contentEl.innerHTML = html;
  // highlight code blocks
  document.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
  // attach link behavior
  contentEl.querySelectorAll('a').forEach(a=>{
    if(a.getAttribute('href')?.startsWith('http')) a.setAttribute('target','_blank');
  });
  buildSearchIndex(); // refresh index for search
}

// active link highlight
function updateActive(file){
  document.querySelectorAll('.nav-link').forEach(a=>{
    a.classList.toggle('active', a.dataset.file === file);
  });
  updateActiveLink();
}

function updateActiveLink(){
  const cur = decodeURIComponent(location.hash?.slice(1) || '');
  document.querySelectorAll('.nav-link').forEach(a=>{
    a.classList.toggle('active', a.dataset.file === cur || (!cur && a.dataset.file === pages[0]?.file));
  });
}

// --- Simple client-side search
let searchIndex = []; // {file,title,content}

function buildSearchIndex(){
  searchIndex = [];
  pages.forEach(async p=>{
    try{
      const res = await fetch(DOCS_PATH + p.file);
      if(!res.ok) return;
      const md = await res.text();
      const text = md.replace(/[#_*`>!-]/g,' ').replace(/\s+/g,' ').trim();
      searchIndex.push({file:p.file, title:p.title, content:text});
    }catch(e){}
  });
}

searchInput?.addEventListener('input', (e)=>{
  const q = e.target.value.trim().toLowerCase();
  if(!q){
    // restore sidebar
    document.querySelectorAll('.nav-link').forEach(el=>el.style.display = 'block');
    return;
  }
  document.querySelectorAll('.nav-link').forEach(el=>{
    const p = searchIndex.find(x=>x.file === el.dataset.file);
    const hay = (p?.title + ' ' + p?.content).toLowerCase();
    const show = hay.includes(q);
    el.style.display = show ? 'block' : 'none';
  });
});

// handle direct hash navigation
window.addEventListener('hashchange', () => {
  const file = decodeURIComponent(location.hash.slice(1));
  if(file) loadDoc(file);
});

// initially load
loadSidebar();
