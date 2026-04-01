/* ================================================================
   MANOR RC — script.js
   ================================================================ */

/* ================================================================
   ██████╗  █████╗ ████████╗ █████╗     ✏️  À MODIFIER
   ██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗
   ██║  ██║███████║   ██║   ███████║
   ██║  ██║██╔══██║   ██║   ██╔══██║
   ██████╔╝██║  ██║   ██║   ██║  ██║

   TABLEAU DES JOUEURS — ÉDITE ICI L'EFFECTIF COMPLET
   ─────────────────────────────────────────────────────
   Champs disponibles :
     num    → numéro de maillot (nombre)
     name   → prénom + nom du joueur
     pos    → intitulé du poste affiché
     group  → "GK" | "DEF" | "MID" | "ATT"  (pour les filtres)
     photo  → chemin de l'image, ex: "assets/prenom_nom.jpg"
              Si absent → silhouette placeholder
     bio    → texte de biographie (affiché dans la modale)
              Si absent → message par défaut
     stats  → { matchs, buts, passes }  (affiché dans la modale)
   ================================================================ */
const PLAYERS = [

  /* ── GARDIEN ── */
  {
    num: 1,
    name: "Grosthéo", 
    pos: "Gardien de but",
    group: "GK",
    photo: "",         // ex: "assets/gardien.jpg"
    bio: "Joueur d'exception, qui depuis toujours avec le soutien de son club et de Emma, garde les buts.",           // ex: "Rempart indéboulonnable depuis la fondation du club..."
    stats: { matchs: 74, buts: 60, passes: 40 }
  },

  /* ── DÉFENSEURS ── */
  {
    num: 2,
    name: "RNboi",
    pos: "Défenseur Droit",
    group: "DEF",
    photo: "./assets/Rnboi.jpg",
    bio: "Grand défenseur, et aussi fort pour les contres que au casino.",
    stats: { matchs: 268, buts: 198, passes: 121 }
  },
  {
    num: 5,
    name: "Kamil",
    pos: "Défenseur Central",
    group: "DEF",
    photo: "",
    bio: "Peu présent mais à jamais dans nos coeurs.",
    stats: { matchs: 6, buts: 0, passes: 1 }
  },
  {
    num: 6,
    name: "Léo",
    pos: "Défenseur Central",
    group: "DEF",
    photo: "",
    bio: "Grands pilier de la défense central.",
    stats: { matchs: 6, buts: 1, passes: 2 }
  },
  {
    num: 3,
    name: "Adam",
    pos: "Défenseur Gauche",
    group: "DEF",
    photo: "",
    bio: "Plus que Michael Olise en défense.",
    stats: { matchs: 87, buts: 44, passes: 33 }
  },

  /* ── MILIEUX ── */
  {
    num: 67,
    name: "Fiché-s",
    pos: "Milieu Défensif Central",
    group: "MID",
    photo: "",
    bio: "Plus de photo chez interpol que avec sa famille, adepte des teitures colorées.",
    stats: { matchs: 82, buts: 54, passes: 47 }
  },
  {
    num: 36,
    name: "Meurtrier",
    pos: "Milieu Défensif Central",
    group: "MID",
    photo: "./assets/Volkov_Zotine.jpg",
    bio: "La défense, le montage vidéo, les tacles cette homme c'est tous faire sauf rester un défense.",
    stats: { matchs: 177, buts: 34, passes: 33 }
  },
  {
    num: 7,
    name: "Noah",
    pos: "Milieu Droit",
    group: "MOD",
    photo: "",
    bio: "Un milieux buteur, qui drible plus que fait de passes, essaie de protéger Emma de Mathéo (plus que les buts de MANOR RC).",
    stats: { matchs: 172, buts: 218, passes: 173 }
  },
  {
    num: 11,
    name: "Gabinho",
    pos: "Milieu Gauche",
    group: "MOD",
    photo: "",
    bio: "Le président/plus gros pirates de la Ciotat.",
    stats: { matchs: 313, buts: 312, passes: 302 }
  },

  /* ── ATTAQUANTS ── */
  {
    num: 9,
    name: "Tom",
    pos: "Buteur",
    group: "ATT",
    photo: "",
    bio: "Le meilleur au BBQ du club, vend les meilleurs 'tasty crousty'",
    stats: { matchs: 81, buts: 89, passes: 71 }
  },
  {
    num: 10,
    name: "Jeffrey",
    pos: "Buteur",
    group: "ATT",
    photo: "",
    bio: "Il est trop fort (il m'a pas encore insulté).",
    stats: { matchs: 82, buts: 54, passes: 47 }
  },

  /* ── REMPLAÇANTS (apparaissent dans la grille joueurs, pas sur le terrain) ── */
  {
    num: 99,
    name: "Bagayoko",
    pos: "Milieu",
    group: "MDC/MOD",
    photo: "",
    bio: "Technicien du groupe (si il était aussi bon sur le terrain...).",
    stats: { matchs: 91, buts: 13, passes: 19 }
  },
  {
    num: 13,
    name: "NOM Remplaçant",
    pos: "Attaquant",
    group: "ATT",
    photo: "",
    bio: "",
    stats: { matchs: 0, buts: 0, passes: 0 }
  },
  {
    num: 14,
    name: "NOM Remplaçant",
    pos: "Défenseur",
    group: "DEF",
    photo: "",
    bio: "",
    stats: { matchs: 0, buts: 0, passes: 0 }
  },
];


/* ================================================================
   FORMATION 4-2-2-2
   ─────────────────────────────────────────────────────
   Positions exprimées en % : left = horizontal, top = vertical
   0% = haut du terrain (but adverse), 100% = bas (notre but)
   Le gardien est en bas, les attaquants en haut.

   Pour repositionner un joueur :
     Modifie le { left: X, top: Y } correspondant.
     X = gauche→droite (0–100), Y = haut→bas (0–100)

   Ordre : correspond à l'ordre du tableau PLAYERS (11 premiers)
   ================================================================ */
const FORMATION = {
  title: "4 — 2 — 2 — 2",

  positions: [
    /* 0 — GK  */  { left: 50, top: 91 },
    /* 1 — DD  */  { left: 82, top: 77 },
    /* 2 — DC  */  { left: 63, top: 73 },
    /* 3 — DC  */  { left: 37, top: 73 },
    /* 4 — DG  */  { left: 18, top: 77 },
    /* 5 — MDC */  { left: 63, top: 57 },
    /* 6 — MDC */  { left: 37, top: 57 },
    /* 7 — MD  */  { left: 76, top: 37 },
    /* 8 — MG  */  { left: 24, top: 37 },
    /* 9 — BU  */  { left: 62, top: 18 },
    /* 10 — BU */  { left: 38, top: 18 },
  ]
};


/* ================================================================
   CONSTRUCTION DU TERRAIN
   Injecte les .pitch-player dans #pitchContainer
   ================================================================ */
function buildPitch() {
  const container = document.getElementById('pitchContainer');
  const formTitle  = document.getElementById('formationTitle');
  if (!container) return;

  // Titre de formation
  if (formTitle) formTitle.textContent = 'Formation ' + FORMATION.title;

  // Les 11 premiers joueurs = titulaires
  const starters = PLAYERS.slice(0, 11);

  FORMATION.positions.forEach((pos, i) => {
    const player = starters[i];
    if (!player) return;

    const el = document.createElement('div');
    el.className = 'pitch-player';
    el.style.left = pos.left + '%';
    el.style.top  = pos.top  + '%';

    // Nom court (prénom ou dernier mot)
    const shortName = player.name.split(' ').slice(-1)[0];

    el.innerHTML = `
      <div class="dot">${player.num}</div>
      <div class="pname">${shortName}</div>
    `;

    // Clic → ouvre la modale bio
    el.addEventListener('click', () => openPlayerModal(i));

    container.appendChild(el);
  });
}


/* ================================================================
   LISTE DE COMPOSITION (panneau droit)
   ================================================================ */
function buildCompoList() {
  const list = document.getElementById('compoList');
  if (!list) return;

  const starters = PLAYERS.slice(0, 11);

  list.innerHTML = starters.map(p => `
    <div class="compo-player-row">
      <div class="compo-num">${p.num}</div>
      <div class="compo-name">${p.name}</div>
      <div class="compo-pos">${p.group}</div>
    </div>
  `).join('');
}


/* ================================================================
   GRILLE JOUEURS — avec filtre par poste
   ================================================================ */
function buildPlayersGrid(filter = 'all') {
  const grid = document.getElementById('playersGrid');
  if (!grid) return;

  const list = filter === 'all' ? PLAYERS : PLAYERS.filter(p => p.group === filter);

  grid.innerHTML = list.map((p, i) => {

    // Index réel dans PLAYERS (pour la modale)
    const realIndex = PLAYERS.indexOf(p);

    // Photo ou placeholder SVG
    const photoHTML = p.photo
      ? `<img src="${p.photo}" alt="${p.name}" loading="lazy" />`
      : `<div class="player-photo-placeholder">
           <svg class="player-silhouette" viewBox="0 0 60 90" xmlns="http://www.w3.org/2000/svg">
             <circle cx="30" cy="18" r="12" fill="currentColor"/>
             <path d="M8 90 C8 55 15 48 30 48 C45 48 52 55 52 90Z" fill="currentColor"/>
           </svg>
         </div>`;

    return `
      <div class="player-card reveal visible" data-index="${realIndex}" onclick="openPlayerModal(${realIndex})">
        <div class="player-photo">
          ${photoHTML}
          <div class="player-overlay"></div>
          <div class="player-number-bg">${p.num}</div>
        </div>
        <div class="player-info">
          <div class="player-name">${p.name}</div>
          <div class="player-pos">${p.pos}</div>
        </div>
        <div class="player-bio-hint">Voir bio →</div>
      </div>
    `;
  }).join('');
}

/* Filtre — appelé par les boutons */
function filterPlayers(group) {
  buildPlayersGrid(group);

  // Mise à jour visuelle des boutons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const active = btn.dataset.filter === group;
    btn.className = active ? 'btn btn-gold filter-btn active' : 'btn btn-outline filter-btn';
  });
}


/* ================================================================
   MODALE BIOGRAPHIE JOUEUR
   ================================================================ */

// Ouvre la modale pour le joueur à l'index donné
function openPlayerModal(index) {
  const player  = PLAYERS[index];
  if (!player) return;

  const overlay = document.getElementById('playerModal');
  const content = document.getElementById('modalContent');
  if (!overlay || !content) return;

  // Photo ou placeholder
  const photoHTML = player.photo
    ? `<img src="${player.photo}" alt="${player.name}" />`
    : `<div class="modal-photo-placeholder">
         <svg viewBox="0 0 60 90" xmlns="http://www.w3.org/2000/svg">
           <circle cx="30" cy="18" r="12" fill="currentColor"/>
           <path d="M8 90 C8 55 15 48 30 48 C45 48 52 55 52 90Z" fill="currentColor"/>
         </svg>
       </div>`;

  // Biographie
  const bioText = player.bio
    ? `<p class="modal-bio">${player.bio}</p>`
    : `<p class="modal-bio-placeholder">Biographie à venir… ✏️<br/>
         <small>Ajoute le champ <code>bio: "..."</code> dans script.js pour ce joueur.</small>
       </p>`;

  // Stats si elles existent
  let statsHTML = '';
  if (player.stats) {
    statsHTML = `
      <div class="modal-stats">
        <div class="modal-stat">
          <div class="modal-stat-val">${player.stats.matchs}</div>
          <div class="modal-stat-label">Matchs</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-val">${player.stats.buts}</div>
          <div class="modal-stat-label">Buts</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-val">${player.stats.passes}</div>
          <div class="modal-stat-label">Passes D.</div>
        </div>
      </div>
    `;
  }

  // Injection du contenu
  content.innerHTML = `
    <div class="modal-photo">${photoHTML}</div>
    <div class="modal-body">
      <div class="modal-number">${player.num}</div>
      <div class="modal-name">${player.name}</div>
      <div class="modal-pos">${player.pos}</div>
      <div class="modal-separator"></div>
      ${bioText}
      ${statsHTML}
    </div>
  `;

  // Affichage
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden'; // empêche le scroll fond
}

// Ferme la modale
function closePlayerModal(event, force = false) {
  if (!force && event && event.target !== document.getElementById('playerModal')) return;
  const overlay = document.getElementById('playerModal');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// Fermer avec Échap
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePlayerModal(null, true);
});


/* ================================================================
   ÉVÉNEMENTS — ACCORDÉON (clic pour déplier)
   Appelé depuis onclick="toggleEvent(this)" dans le HTML
   ================================================================ */
function toggleEvent(mainEl) {
  const row = mainEl.closest('.event-row');
  if (!row) return;

  const isOpen = row.classList.contains('open');

  // Ferme tous les autres avant d'ouvrir
  document.querySelectorAll('.event-row.open').forEach(r => {
    if (r !== row) r.classList.remove('open');
  });

  row.classList.toggle('open', !isOpen);
}


/* ================================================================
   NAVIGATION — scroll & menu mobile
   ================================================================ */
const navbar    = document.getElementById('navbar');
const navMenu   = document.getElementById('navMenu');
const navToggle = document.getElementById('navToggle');

// Scroll → navbar devient opaque + lien actif
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);

  // Mise en surbrillance du lien correspondant à la section visible
  const sections = document.querySelectorAll('section[id]');
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 120) current = s.id;
  });
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}, { passive: true });

// Menu hamburger mobile
navToggle.addEventListener('click', () => {
  navMenu.classList.toggle('open');
  navToggle.classList.toggle('open');
});

// Ferme le menu au clic sur un lien (mobile)
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('open');
    navToggle.classList.remove('open');
  });
});


/* ================================================================
   ANIMATION AU SCROLL — Intersection Observer
   ================================================================ */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target); // une seule fois
    }
  });
}, { threshold: 0.1 });

function observeRevealElements() {
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}


/* ================================================================
   COMPTEURS ANIMÉS (chiffres clés stats)
   ================================================================ */
const countObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el     = e.target;
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target)) return;

    let count  = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const timer = setInterval(() => {
      count = Math.min(count + step, target);
      el.textContent = count;
      if (count >= target) clearInterval(timer);
    }, 38);

    countObserver.unobserve(el);
  });
}, { threshold: 0.5 });

function observeCounters() {
  document.querySelectorAll('.stat-number[data-target]').forEach(el => countObserver.observe(el));
}


/* ================================================================
   BOUTONS DE FILTRE — délégation d'événement
   ================================================================ */
function initFilterButtons() {
  const container = document.getElementById('filterBtns');
  if (!container) return;

  container.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filterPlayers(btn.dataset.filter);
  });
}


/* ================================================================
   INITIALISATION — lance tout au chargement du DOM
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  buildPitch();
  buildCompoList();
  buildPlayersGrid();
  initFilterButtons();
  observeRevealElements();
  observeCounters();
});
