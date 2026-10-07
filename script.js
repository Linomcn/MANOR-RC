// =====================================================================
//  MANOR RC — script.js
//  Sert aux DEUX pages : index.html (site vitrine) et jeu.html (jeu).
// =====================================================================

const SUPABASE_URL = 'https://weolphofgqltwazxeshm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BrJ9UhFgxWemyWrAEW4CYQ_54YeCIr4';

const PACK_COOLDOWN_MS = 5 * 60 * 1000;
const CARDS_PER_PACK = 3;
const PACK_ODDS = { bronze: 70, argent: 25, or: 5 };
const RARITY_ORDER = { bronze: 1, argent: 2, or: 3 };

let supabaseClient = null;

// ---------------------------------------------------------------------
//  FONCTIONS UTILITAIRES
// ---------------------------------------------------------------------
function rarityKey(card) {
  return String((card && card.rarity) || '').trim().toLowerCase();
}

function rarityLevel(card) {
  return RARITY_ORDER[rarityKey(card)] || 1;
}

function pickWeighted(cards) {
  const weights = cards.map(c => {
    const w = Number(c.drop_rate);
    return Number.isFinite(w) && w > 0 ? w : 1;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < cards.length; i++) {
    if (r < weights[i]) return cards[i];
    r -= weights[i];
  }
  return cards[cards.length - 1];
}

function drawRandomCard(allCards) {
  const tiers = {};
  allCards.forEach(c => {
    const key = rarityKey(c);
    if (!tiers[key]) tiers[key] = [];
    tiers[key].push(c);
  });
  const keys = Object.keys(tiers);
  const oddsOf = (k) => (PACK_ODDS[k] !== undefined ? PACK_ODDS[k] : 1);
  const total = keys.reduce((sum, k) => sum + oddsOf(k), 0);
  if (!(total > 0)) return pickWeighted(allCards);

  let r = Math.random() * total;
  for (const k of keys) {
    if (r < oddsOf(k)) return pickWeighted(tiers[k]);
    r -= oddsOf(k);
  }
  return pickWeighted(tiers[keys[keys.length - 1]]);
}

function drawPack(allCards, forceGold) {
  const pack = [];
  if (forceGold) {
    const golds = allCards.filter(c => rarityKey(c) === 'or');
    if (golds.length) pack.push(golds[Math.floor(Math.random() * golds.length)]);
  }
  while (pack.length < CARDS_PER_PACK) pack.push(drawRandomCard(allCards));
  pack.sort((a, b) => rarityLevel(a) - rarityLevel(b));
  return pack;
}

function createCardElement(card, options = {}) {
  const el = document.createElement('div');
  el.className = 'tcg-card ' + rarityKey(card) + (options.locked ? ' locked' : '');

  if (options.qty > 1) {
    const qty = document.createElement('div');
    qty.className = 'card-qty';
    qty.textContent = 'x' + options.qty;
    el.appendChild(qty);
  }

  const imgBox = document.createElement('div');
  imgBox.className = 'tcg-card-img';
  if (card.pixel_art_url) {
    const img = document.createElement('img');
    img.src = card.pixel_art_url;
    img.alt = card.player_name || '';
    img.loading = 'lazy';
    img.addEventListener('error', () => { imgBox.textContent = 'IMAGE'; });
    imgBox.appendChild(img);
  } else {
    imgBox.textContent = 'IMAGE';
  }
  el.appendChild(imgBox);

  const badge = document.createElement('span');
  badge.className = 'rarity-badge';
  badge.textContent = card.rarity || '';
  el.appendChild(badge);

  const name = document.createElement('h4');
  name.textContent = card.player_name || '';
  el.appendChild(name);

  if (options.status) {
    const status = document.createElement('p');
    status.className = 'card-status' + (options.locked ? ' is-locked' : '');
    status.textContent = options.status;
    el.appendChild(status);
  }
  return el;
}

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =====================================================================
//  DÉMARRAGE PRINCIPAL (LE BLOC QUI ENGLOBE TOUT)
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {

  const toastContainer = document.getElementById('toast-container');

  function showToast(message, type = 'info') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = type === 'success' ? '✓' : (type === 'error' ? '!' : 'i');

    const text = document.createElement('span');
    text.textContent = message;

    toast.append(icon, text);
    toastContainer.appendChild(toast);

    const remove = () => {
      toast.classList.add('toast-hide');
      setTimeout(() => toast.remove(), 300);
    };
    toast.addEventListener('click', remove);
    setTimeout(remove, 4500);
  }

  try {
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else if (document.getElementById('auth-container')) {
      console.error('La librairie Supabase est introuvable.');
    }
  } catch (err) {
    console.error('Erreur au démarrage de Supabase :', err);
  }

  // ===================================================================
  //  PARTIE 1 — SITE VITRINE (index.html)
  // ===================================================================

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      const target = id.length > 1 ? document.querySelector(id) : null;
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => navMenu.classList.toggle('active'));
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => navMenu.classList.remove('active'));
    });
  }

  function runCounter(el) {
    const target = Number(el.getAttribute('data-target')) || 0;
    const duration = 1800;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString('fr-FR');
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const statsSection = document.getElementById('statistiques');
  if (statsSection) {
    let statsStarted = false;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !statsStarted) {
          statsStarted = true;
          statsSection.querySelectorAll('.stat-number').forEach(runCounter);
          observer.disconnect();
        }
      });
    }, { threshold: 0.4 });
    observer.observe(statsSection);
  }

  const shopTrack = document.getElementById('shop-track');
  if (shopTrack) {
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    if (prevBtn && nextBtn) {
      prevBtn.addEventListener('click', () => shopTrack.scrollBy({ left: -320, behavior: 'smooth' }));
      nextBtn.addEventListener('click', () => shopTrack.scrollBy({ left: 320, behavior: 'smooth' }));
    }
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    shopTrack.addEventListener('mousedown', (e) => {
      isDown = true;
      shopTrack.classList.add('is-dragging');
      startX = e.pageX - shopTrack.offsetLeft;
      startScroll = shopTrack.scrollLeft;
    });
    const stopDrag = () => { isDown = false; shopTrack.classList.remove('is-dragging'); };
    shopTrack.addEventListener('mouseleave', stopDrag);
    shopTrack.addEventListener('mouseup', stopDrag);
    shopTrack.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      shopTrack.scrollLeft = startScroll - (e.pageX - shopTrack.offsetLeft - startX) * 2;
    });
  }

  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = btn.dataset.product;
      window.location.href = 'shop.html' + (product ? '?produit=' + encodeURIComponent(product) : '');
    });
  });

  document.querySelectorAll('.btn-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const fullText = btn.previousElementSibling;
      if (fullText && fullText.classList.contains('news-full-text')) {
        fullText.classList.toggle('open');
        btn.textContent = fullText.classList.contains('open') ? 'Réduire' : "Lire l'article";
      }
    });
  });

  const eventModal = document.getElementById('eventModal');
  if (eventModal) {
    const eDate = document.getElementById('modal-event-date');
    const eTitle = document.getElementById('modal-event-title');
    const ePlace = document.getElementById('modal-event-place');
    const eDesc = document.getElementById('modal-event-desc');
    const eLink = document.getElementById('modal-event-link');
    const closeEventModal = document.querySelector('.close-event-modal');
    const closeEvent = () => { eventModal.style.display = 'none'; };

    document.querySelectorAll('.btn-event').forEach(btn => {
      btn.addEventListener('click', () => {
        if (eDate) eDate.textContent = btn.dataset.date || '';
        if (eTitle) eTitle.textContent = btn.dataset.title || '';
        if (ePlace) ePlace.textContent = btn.dataset.place || '';
        if (eDesc) eDesc.textContent = btn.dataset.desc || '';
        if (eLink) {
          if (btn.dataset.link) {
            eLink.setAttribute('href', btn.dataset.link);
            eLink.textContent = btn.dataset.linkText || 'En savoir plus';
            eLink.style.display = 'inline-block';
          } else {
            eLink.style.display = 'none';
          }
        }
        eventModal.style.display = 'flex';
      });
    });
    if (closeEventModal) closeEventModal.addEventListener('click', closeEvent);
    if (eLink) eLink.addEventListener('click', closeEvent);
    window.addEventListener('click', (e) => { if (e.target === eventModal) closeEvent(); });
  }

  // ===================================================================
  //  PARTIE 2 — COMPTE UTILISATEUR
  // ===================================================================
  const authContainer = document.getElementById('auth-container');
  const gameDashboard = document.getElementById('game-dashboard');
  const authForm = document.getElementById('auth-form');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');
  const authMessage = document.getElementById('auth-message');
  const groupUsername = document.getElementById('group-username');
  const inputUsername = document.getElementById('auth-username');
  const inputEmail = document.getElementById('auth-email');
  const inputPassword = document.getElementById('auth-password');
  const btnAuthSubmit = document.getElementById('btn-auth-submit');
  const btnLabel = btnAuthSubmit ? btnAuthSubmit.querySelector('.btn-label') : null;
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const btnTogglePassword = document.getElementById('btn-toggle-password');

  let isLoginMode = true;

  function showFormMessage(message, type) {
    if (!authMessage) return;
    authMessage.textContent = message;
    authMessage.className = 'auth-message ' + type;
    authMessage.hidden = false;
  }
  function clearFormMessage() {
    if (!authMessage) return;
    authMessage.hidden = true;
    authMessage.textContent = '';
  }

  function translateError(error) {
    const msg = ((error && error.message) || '').toLowerCase();
    if (msg.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
    if (msg.includes('email not confirmed')) return "Ton email n'est pas confirmé : clique sur le lien reçu.";
    if (msg.includes('already registered')) return 'Un compte existe déjà avec cet email.';
    if (msg.includes('password should be at least')) return 'Le mot de passe doit faire au moins 6 caractères.';
    if (msg.includes('rate limit')) return 'Trop de tentatives. Patiente un peu.';
    return (error && error.message) || 'Une erreur est survenue. Réessaie.';
  }

  function setLoading(isLoading) {
    if (!btnAuthSubmit) return;
    btnAuthSubmit.disabled = isLoading;
    btnAuthSubmit.classList.toggle('is-loading', isLoading);
    if (btnLabel) {
      btnLabel.textContent = isLoading
        ? (isLoginMode ? 'Connexion...' : 'Création...')
        : (isLoginMode ? 'Se connecter' : "S'inscrire");
    }
  }

  function setMode(login) {
    isLoginMode = login;
    clearFormMessage();
    if (tabLogin && tabSignup) {
      tabLogin.classList.toggle('active', login);
      tabSignup.classList.toggle('active', !login);
    }
    if (authTitle) authTitle.textContent = login ? 'Connexion au Club' : 'Rejoindre le Club';
    if (authSubtitle) authSubtitle.textContent = login ? 'Retrouve ton profil et tes packs.' : 'Crée ton compte pour collectionner.';
    if (groupUsername) groupUsername.style.display = login ? 'none' : 'block';
    if (inputUsername) inputUsername.required = !login;
    if (inputPassword) {
      inputPassword.autocomplete = login ? 'current-password' : 'new-password';
      if (login) inputPassword.removeAttribute('minlength');
      else inputPassword.setAttribute('minlength', '6');
    }
    if (btnLabel) btnLabel.textContent = login ? 'Se connecter' : "S'inscrire";
  }

  if (tabLogin) tabLogin.addEventListener('click', () => setMode(true));
  if (tabSignup) tabSignup.addEventListener('click', () => setMode(false));

  if (btnTogglePassword && inputPassword) {
    btnTogglePassword.addEventListener('click', () => {
      const show = inputPassword.type === 'password';
      inputPassword.type = show ? 'text' : 'password';
      btnTogglePassword.textContent = show ? 'Masquer' : 'Afficher';
    });
  }

  async function createProfile(userId, username) {
    if (!supabaseClient) return false;
    const { error } = await supabaseClient.from('profiles').insert([{ id: userId, username: username, is_admin: false }]);
    return !error || error.code === '23505';
  }

  async function handleLogin(email, password) {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    authForm.reset();
    showToast('Connexion réussie. Bienvenue au club !', 'success');
  }

  async function handleSignup(email, password, username) {
    if (username.length < 3) throw new Error('Le pseudo doit faire au moins 3 caractères.');
    const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { username } } });
    if (error) throw error;

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('User already registered');
    }

    if (data.session) {
      await createProfile(data.user.id, username);
      authForm.reset();
      showToast('Compte créé ! Bienvenue ' + username + ' !', 'success');
    } else {
      authForm.reset();
      setMode(true);
      inputEmail.value = email;
      showFormMessage("Compte créé ! Un email de confirmation vient d'être envoyé.", 'success');
    }
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormMessage();
      if (!supabaseClient) return;

      setLoading(true);
      try {
        if (isLoginMode) await handleLogin(inputEmail.value.trim(), inputPassword.value);
        else await handleSignup(inputEmail.value.trim(), inputPassword.value, inputUsername.value.trim());
      } catch (err) {
        showFormMessage(translateError(err), 'error');
      } finally {
        setLoading(false);
      }
    });
  }

  // ===================================================================
  //  PARTIE 3 & 4 — ESPACE JEU ET COLLECTION
  // ===================================================================
  const displayUsername = document.getElementById('display-username');
  const displayEmail = document.getElementById('display-email');
  const userAvatar = document.getElementById('user-avatar');
  const roleBadge = document.getElementById('user-role-badge');
  const btnLogout = document.getElementById('btn-logout');
  const btnOpenPack = document.getElementById('btn-open-pack');
  const btnForceGold = document.getElementById('btn-force-gold');
  const packTimerText = document.getElementById('pack-timer-text');
  const defaultRoleText = roleBadge ? roleBadge.textContent : '';

  let currentUser = null;
  let loadedUserId = null;
  let isAdmin = false;
  let nextPackAt = 0;
  let packTimerInterval = null;
  let isOpeningPack = false;

  let cachedAllCards = [];
  let cachedUserCards = [];
  let currentRaritySort = 'asc';
  let currentOwnershipFilter = 'all';

  function renderUserHeader(name, email) {
    if (displayUsername) displayUsername.textContent = name;
    if (displayEmail) displayEmail.textContent = email || '';
    if (userAvatar) userAvatar.textContent = (name || '?').charAt(0).toUpperCase();
  }

  const tabButtons = document.querySelectorAll('.game-tab-btn');
  const tabContents = document.querySelectorAll('.game-tab-content');

  // GESTION CENTRALE DES ONGLETS
  // GESTION CENTRALE DES ONGLETS
  function showTab(tabId) {
    tabButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
    tabContents.forEach(c => { c.style.display = c.id === tabId ? 'block' : 'none'; });
    
    if (currentUser) {
      if (tabId === 'tab-collection') {
        loadUserCollection(currentUser.id);
      }
      if (tabId === 'tab-exchange') {
        loadExchangePlayers();
        initTradeRealtime();
        // FORCE le chargement pour éviter le bug des cartes fantômes
        loadUserCollection(currentUser.id); 
      }
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.getAttribute('data-tab')));
  });

  async function loadPlayerData(user) {
    const metaName = (user.user_metadata && user.user_metadata.username) || '';
    renderUserHeader(metaName || (user.email ? user.email.split('@')[0] : 'Joueur'), user.email);

    const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (!currentUser || currentUser.id !== user.id) return;

    let profile = data;
    if (!profile) {
      const username = metaName || (user.email ? user.email.split('@')[0] : 'Joueur');
      await createProfile(user.id, username);
      profile = { username, last_pack_opened_at: null, is_admin: false };
    }

    renderUserHeader(profile.username, user.email);
    isAdmin = !!profile.is_admin;
    nextPackAt = profile.last_pack_opened_at ? new Date(profile.last_pack_opened_at).getTime() + PACK_COOLDOWN_MS : 0;

    if (roleBadge) {
      roleBadge.textContent = isAdmin ? '⚡ ADMIN MANOR RC' : defaultRoleText;
      roleBadge.style.color = isAdmin ? '#FFD700' : '';
    }
    refreshPackUI();
  }

  function refreshPackUI() {
    if (!btnOpenPack || !packTimerText) return;
    if (packTimerInterval) clearInterval(packTimerInterval);
    if (btnForceGold) btnForceGold.style.display = isAdmin ? '' : 'none';

    if (isAdmin) {
      packTimerText.textContent = '⚡ Mode Admin : packs illimités !';
      btnOpenPack.disabled = isOpeningPack;
      if (btnForceGold) btnForceGold.disabled = isOpeningPack;
      return;
    }

    const tick = () => {
      const remaining = nextPackAt - Date.now();
      if (remaining <= 0) {
        packTimerText.textContent = '🎁 Ton pack gratuit est disponible !';
        btnOpenPack.disabled = isOpeningPack;
        clearInterval(packTimerInterval);
      } else {
        const min = Math.floor(remaining / 60000);
        const sec = Math.floor((remaining % 60000) / 1000);
        packTimerText.textContent = `Prochain pack dans : ${min}m ${sec < 10 ? '0' : ''}${sec}s`;
        btnOpenPack.disabled = true;
      }
    };
    tick();
    packTimerInterval = setInterval(tick, 1000);
  }

  async function openPack(forceGold) {
    if (!currentUser || !supabaseClient || isOpeningPack) return;
    if (!isAdmin && Date.now() < nextPackAt) return;

    const user = currentUser;
    isOpeningPack = true;
    if (btnOpenPack) btnOpenPack.disabled = true;
    if (btnForceGold) btnForceGold.disabled = true;

    try {
      const { data: allCards } = await supabaseClient.from('cards_definition').select('*');
      if (!allCards || !allCards.length) throw new Error('Erreur chargement cartes');

      const drawn = drawPack(allCards, forceGold);
      for (const card of drawn) {
        const { data: existing } = await supabaseClient.from('user_cards').select('id, quantity').eq('user_id', user.id).eq('card_id', card.id).maybeSingle();
        if (existing) {
          await supabaseClient.from('user_cards').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
        } else {
          await supabaseClient.from('user_cards').insert([{ user_id: user.id, card_id: card.id, quantity: 1 }]);
        }
      }

      if (!isAdmin) {
        const now = new Date();
        await supabaseClient.from('profiles').update({ last_pack_opened_at: now.toISOString() }).eq('id', user.id);
        nextPackAt = now.getTime() + PACK_COOLDOWN_MS;
      }

      await playPackAnimation(drawn);
      showToast('Cartes ajoutées à ta collection !', 'success');
    } catch (err) {
      showToast("Erreur pendant l'ouverture du pack.", 'error');
    } finally {
      isOpeningPack = false;
      if (currentUser) refreshPackUI();
    }
  }

  if (btnOpenPack) btnOpenPack.addEventListener('click', () => openPack(false));
  if (btnForceGold) btnForceGold.addEventListener('click', () => openPack(true));

  async function loadUserCollection(userId) {
    const grid = document.getElementById('collection-grid');
    if (grid) grid.innerHTML = '<p class="grid-message">Chargement...</p>';

    const [cardsRes, ownedRes] = await Promise.all([
      supabaseClient.from('cards_definition').select('*'),
      supabaseClient.from('user_cards').select('*').eq('user_id', userId)
    ]);
    if (!currentUser || currentUser.id !== userId) return;

    cachedAllCards = cardsRes.data || [];
    cachedUserCards = ownedRes.data || [];
    renderFilteredCollection();
  }

  function renderFilteredCollection() {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const ownedByCard = new Map(cachedUserCards.map(uc => [uc.card_id, uc]));
    const filtered = cachedAllCards.filter(card => {
      const isOwned = ownedByCard.has(card.id);
      if (currentOwnershipFilter === 'owned') return isOwned;
      if (currentOwnershipFilter === 'locked') return !isOwned;
      return true;
    });

    filtered.sort((a, b) => currentRaritySort === 'asc' ? rarityLevel(a) - rarityLevel(b) : rarityLevel(b) - rarityLevel(a));

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="grid-message">Aucune carte trouvée.</p>';
      return;
    }

    filtered.forEach(card => {
      const isOwned = !!ownedByCard.get(card.id);
      grid.appendChild(createCardElement(card, {
        locked: !isOwned,
        qty: isOwned ? ownedByCard.get(card.id).quantity : 0,
        status: isOwned ? 'Débloquée' : '🔒 Verrouillée'
      }));
    });
  }

  const btnFilterRarity = document.getElementById('btn-filter-rarity');
  const btnFilterStatus = document.getElementById('btn-filter-status');

  if (btnFilterRarity) {
    btnFilterRarity.addEventListener('click', () => {
      currentRaritySort = currentRaritySort === 'asc' ? 'desc' : 'asc';
      btnFilterRarity.textContent = currentRaritySort === 'asc' ? 'Rareté : Bronze ➔ Or' : 'Rareté : Or ➔ Bronze';
      renderFilteredCollection();
    });
  }
  if (btnFilterStatus) {
    btnFilterStatus.addEventListener('click', () => {
      if (currentOwnershipFilter === 'all') {
        currentOwnershipFilter = 'owned';
        btnFilterStatus.textContent = 'Affichage : Possédées';
      } else if (currentOwnershipFilter === 'owned') {
        currentOwnershipFilter = 'locked';
        btnFilterStatus.textContent = 'Affichage : Non possédées';
      } else {
        currentOwnershipFilter = 'all';
        btnFilterStatus.textContent = 'Affichage : Toutes';
      }
      renderFilteredCollection();
    });
  }

  // Animation Pack
  const overlay = document.getElementById('fullscreen-reveal');
  const boosterContainer = document.getElementById('booster-pack-container');
  const cardsContainer = document.getElementById('revealed-cards-container');

  function closeOverlayNow() {
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function playPackAnimation(cards) {
    return new Promise((resolve) => {
      if (!overlay || !boosterContainer) { resolve(); return; }

      boosterContainer.className = 'booster-wrapper';
      cardsContainer.innerHTML = '';
      cardsContainer.classList.add('hidden');
      document.body.style.overflow = 'hidden';
      overlay.classList.remove('hidden');
      boosterContainer.focus();

      const finish = () => { closeOverlayNow(); resolve(); };
      
      async function openBooster() {
        boosterContainer.classList.add('opening-shake');
        await wait(600);
        boosterContainer.classList.remove('opening-shake');
        boosterContainer.classList.add('is-tearing');
        await wait(500);
        boosterContainer.classList.add('hidden');

        cards.forEach((card, index) => {
          const el = createCardElement(card);
          el.classList.add('card-reveal-anim');
          el.style.animationDelay = (index * 0.4) + 's';
          cardsContainer.appendChild(el);
        });
        cardsContainer.classList.remove('hidden');

        setTimeout(finish, cards.length * 400 + 2000); // Ferme auto après visionnage
      }

      boosterContainer.addEventListener('click', openBooster, { once: true });
      overlay.addEventListener('click', finish);
    });
  }

  // ===================================================================
  //  PARTIE 5 — LISTE DES JOUEURS
  // ===================================================================
  async function loadPlayersList() {
    const listEl = document.getElementById('online-players-list');
    if (!listEl || !supabaseClient) return;

    const { data: profiles } = await supabaseClient.from('profiles').select('id, username').order('created_at', { ascending: false });
    listEl.innerHTML = '';

    (profiles || []).forEach(p => {
      const li = document.createElement('li');
      li.className = 'player-row-item';
      li.innerHTML = `<div class="player-mini-avatar">${(p.username || '?').charAt(0).toUpperCase()}</div><span>${p.username}</span>`;
      if (currentUser && p.id === currentUser.id) li.innerHTML += `<em class="player-you">toi</em>`;
      listEl.appendChild(li);
    });
  }

  // ===================================================================
  //  PARTIE 6 — SESSION
  // ===================================================================
  function handleSignedIn(user) {
    currentUser = user;
    if (authContainer) authContainer.style.display = 'none';
    if (gameDashboard) gameDashboard.style.display = 'block';
    document.body.classList.add('game-logged-in');

    if (loadedUserId !== user.id) {
      loadedUserId = user.id;
      setTimeout(() => { loadPlayerData(user); loadPlayersList(); }, 0);
    }
  }

  function handleSignedOut() {
    currentUser = null; loadedUserId = null; isAdmin = false; nextPackAt = 0;
    if (packTimerInterval) clearInterval(packTimerInterval);
    cachedAllCards = []; cachedUserCards = [];
    closeOverlayNow(); closeTradeRoom();
    
    if (authContainer) authContainer.style.display = 'block';
    if (gameDashboard) gameDashboard.style.display = 'none';
    document.body.classList.remove('game-logged-in');
    setMode(true);
  }

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session && session.user) handleSignedIn(session.user);
      else handleSignedOut();
    });

    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        showToast('Tu es déconnecté. À bientôt !', 'info');
      });
    }
  }

  // ===================================================================
  //  PARTIE 7 — SYSTÈME D'ÉCHANGES (TEMPS RÉEL & ANTI-TRICHE)
  // ===================================================================
  let currentTrade = null;
  let tradeRealtimeChannel = null;
  let selectedTradeCardId = null;

  const exchangeLobby = document.getElementById('exchange-lobby');
  const exchangeRoom = document.getElementById('exchange-room');
  const exchangePlayersGrid = document.getElementById('exchange-players-grid');
  const tradeInviteModal = document.getElementById('tradeInviteModal');
  const cardPickerModal = document.getElementById('cardPickerModal');

  const inviteSenderName = document.getElementById('invite-sender-name');
  const btnAcceptInvite = document.getElementById('btn-accept-invite');
  const btnDeclineInvite = document.getElementById('btn-decline-invite');

  const tradeOpponentName = document.getElementById('trade-opponent-name');
  const tradeOpponentAvatar = document.getElementById('trade-opponent-avatar');
  const tradeMyAvatar = document.getElementById('trade-my-avatar');
  const tradeStatusIndicator = document.getElementById('trade-status-indicator');

  const myTradeSlot = document.getElementById('my-trade-slot');
  const opponentTradeSlot = document.getElementById('opponent-trade-slot');
  const btnLockMyTrade = document.getElementById('btn-lock-my-trade');
  const myLockStatus = document.getElementById('my-lock-status');
  const opponentLockStatus = document.getElementById('opponent-lock-status');
  const opponentLockShield = document.getElementById('opponent-lock-shield');
  const btnCancelTrade = document.getElementById('btn-cancel-trade');
  const pickerCollectionGrid = document.getElementById('picker-collection-grid');
  const closePickerModal = document.querySelector('.close-picker-modal');

  async function loadExchangePlayers() {
    if (!exchangePlayersGrid || !supabaseClient || !currentUser) return;

    const { data: profiles } = await supabaseClient.from('profiles').select('id, username').neq('id', currentUser.id);

    exchangePlayersGrid.innerHTML = '';
    if (!profiles || profiles.length === 0) {
      exchangePlayersGrid.innerHTML = '<p class="grid-message">Aucun autre joueur disponible pour le moment.</p>';
      return;
    }

    profiles.forEach(p => {
      const card = document.createElement('div');
      card.className = 'exchange-player-card';
      const avatar = document.createElement('div');
      avatar.className = 'player-mini-avatar';
      avatar.textContent = (p.username || '?').charAt(0).toUpperCase();
      const info = document.createElement('div');
      info.className = 'exchange-player-info';
      info.innerHTML = `<h4>${p.username || 'Joueur'}</h4>`;
      const btn = document.createElement('button');
      btn.className = 'btn-invite';
      btn.textContent = 'Proposer un échange';
      btn.addEventListener('click', () => sendTradeInvite(p.id, p.username));

      card.append(avatar, info, btn);
      exchangePlayersGrid.appendChild(card);
    });
  }

  async function sendTradeInvite(receiverId, receiverName) {
    if (!currentUser || !supabaseClient) return;
    const { data, error } = await supabaseClient.from('trades').insert([{ sender_id: currentUser.id, receiver_id: receiverId, status: 'pending' }]).select().single();
    
    if (error) {
      showToast("Impossible d'envoyer la demande.", 'error');
      return;
    }
    currentTrade = data;
    showToast(`Invitation envoyée à ${receiverName} !`, 'info');
  }

  function initTradeRealtime() {
    if (!supabaseClient || !currentUser) return;
    if (tradeRealtimeChannel) supabaseClient.removeChannel(tradeRealtimeChannel);

    tradeRealtimeChannel = supabaseClient
      .channel('public:trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, payload => {
        const trade = payload.new;
        if (trade && (trade.sender_id === currentUser.id || trade.receiver_id === currentUser.id)) {
          handleTradeUpdate(trade);
        }
      }).subscribe();
  }

  async function handleTradeUpdate(trade) {
    currentTrade = trade;

    if (trade.status === 'pending' && trade.receiver_id === currentUser.id) {
      const { data: senderProfile } = await supabaseClient.from('profiles').select('username').eq('id', trade.sender_id).single();
      if (inviteSenderName) inviteSenderName.textContent = senderProfile ? senderProfile.username : 'Un joueur';
      if (tradeInviteModal) tradeInviteModal.style.display = 'flex';
      return;
    }

    if (trade.status === 'declined' || trade.status === 'canceled') {
      closeTradeRoom();
      if (tradeInviteModal) tradeInviteModal.style.display = 'none';
      showToast("L'échange a été annulé ou refusé.", 'info');
      return;
    }

    if (trade.status === 'active') {
      if (tradeInviteModal) tradeInviteModal.style.display = 'none';
      renderTradeRoom(trade);
      return;
    }

    if (trade.status === 'completed') {
      closeTradeRoom();
      showToast('🎉 Échange réussi !', 'success');
      loadUserCollection(currentUser.id);
    }
  }

  if (btnAcceptInvite) {
    btnAcceptInvite.addEventListener('click', async () => {
      if (currentTrade) await supabaseClient.from('trades').update({ status: 'active' }).eq('id', currentTrade.id);
    });
  }

  if (btnDeclineInvite) {
    btnDeclineInvite.addEventListener('click', async () => {
      if (currentTrade) await supabaseClient.from('trades').update({ status: 'declined' }).eq('id', currentTrade.id);
      if (tradeInviteModal) tradeInviteModal.style.display = 'none';
    });
  }

  async function renderTradeRoom(trade) {
    if (exchangeLobby) exchangeLobby.style.display = 'none';
    if (exchangeRoom) exchangeRoom.style.display = 'block';

    const isSender = trade.sender_id === currentUser.id;
    const opponentId = isSender ? trade.receiver_id : trade.sender_id;

    const { data: oppProfile } = await supabaseClient.from('profiles').select('username').eq('id', opponentId).single();
    const oppName = oppProfile ? oppProfile.username : 'Adversaire';

    if (tradeOpponentName) tradeOpponentName.textContent = oppName;
    if (tradeOpponentAvatar) tradeOpponentAvatar.textContent = oppName.charAt(0).toUpperCase();
    if (tradeMyAvatar && currentUser) {
      const myName = displayUsername ? displayUsername.textContent : 'M';
      tradeMyAvatar.textContent = myName.charAt(0).toUpperCase();
    }

    const myCardId = isSender ? trade.sender_card_id : trade.receiver_card_id;
    const oppCardId = isSender ? trade.receiver_card_id : trade.sender_card_id;
    const myLocked = isSender ? trade.sender_locked : trade.receiver_locked;
    const oppLocked = isSender ? trade.receiver_locked : trade.sender_locked;

    if (myCardId) {
      const cardDef = cachedAllCards.find(c => c.id === myCardId);
      if (cardDef) {
        myTradeSlot.innerHTML = '';
        myTradeSlot.classList.add('has-card');
        const cardEl = createCardElement(cardDef);
        
        // Permet de cliquer sur la carte pour la changer (si non validée)
        if (!myLocked) {
          cardEl.style.cursor = 'pointer';
          cardEl.title = "Clique pour changer de carte";
          cardEl.addEventListener('click', openCardPicker);
        }
        myTradeSlot.appendChild(cardEl);
      }
    } else {
      myTradeSlot.classList.remove('has-card');
      myTradeSlot.innerHTML = '<button class="btn-add-trade-card" id="btn-pick-trade-card">+</button>';
      document.getElementById('btn-pick-trade-card').addEventListener('click', openCardPicker);
    }

    if (oppCardId) {
      const cardDef = cachedAllCards.find(c => c.id === oppCardId);
      if (cardDef) {
        opponentTradeSlot.innerHTML = '';
        opponentTradeSlot.classList.add('has-card');
        opponentTradeSlot.appendChild(createCardElement(cardDef));
      }
    } else {
      opponentTradeSlot.classList.remove('has-card');
      opponentTradeSlot.innerHTML = '<div class="empty-slot-text">Choisit une carte...</div>';
    }

    if (btnLockMyTrade) {
      btnLockMyTrade.disabled = !myCardId || myLocked;
      btnLockMyTrade.textContent = myLocked ? '🔒 Carte validée' : 'Valider ma carte';
    }
    if (myLockStatus) myLockStatus.textContent = myLocked ? 'Prêt pour l\'échange !' : 'Sélectionne et valide ta carte.';
    if (opponentLockStatus) opponentLockStatus.textContent = oppLocked ? '🔒 Adversaire prêt !' : 'En train de choisir...';
    if (opponentLockShield) opponentLockShield.style.display = oppLocked ? 'block' : 'none';

    // Seul l'expéditeur initialise la requête SQL pour éviter les conflits
    if (myLocked && oppLocked && isSender) {
      executeTradeTransaction(trade.id);
    }
  }

  async function executeTradeTransaction(tradeId) {
    if (tradeStatusIndicator) tradeStatusIndicator.textContent = 'Échange en cours de finalisation...';
    const { data, error } = await supabaseClient.rpc('execute_trade', { trade_uuid: tradeId });
    if (error || !data) {
      showToast("Erreur lors de l'échange.", 'error');
    }
  }

  // 9. Modale de sélection de carte
  async function openCardPicker() {
    if (!pickerCollectionGrid || !cardPickerModal) return;

    // Affiche un écran de chargement pour rassurer le joueur
    pickerCollectionGrid.innerHTML = '<p class="grid-message">Chargement de ton classeur...</p>';
    cardPickerModal.style.display = 'flex';

    // FORCE la récupération des dernières cartes packées
    await loadUserCollection(currentUser.id);

    pickerCollectionGrid.innerHTML = '';
    const ownedCards = cachedUserCards.filter(uc => uc.quantity > 0);

    if (ownedCards.length === 0) {
      pickerCollectionGrid.innerHTML = '<p class="grid-message">Tu n\'as aucune carte disponible à échanger.</p>';
      return;
    }

    ownedCards.forEach(uc => {
      // On sécurise la recherche en convertissant les ID en texte
      const cardDef = cachedAllCards.find(c => String(c.id) === String(uc.card_id));
      if (!cardDef) return;
      
      const el = createCardElement(cardDef, { qty: uc.quantity });
      el.addEventListener('click', async () => {
        selectedTradeCardId = cardDef.id;
        cardPickerModal.style.display = 'none';
        
        const isSender = currentTrade.sender_id === currentUser.id;
        const updateData = isSender ? { sender_card_id: selectedTradeCardId } : { receiver_card_id: selectedTradeCardId };
        
        await supabaseClient.from('trades').update(updateData).eq('id', currentTrade.id);
      });
      pickerCollectionGrid.appendChild(el);
    });
  }

  if (closePickerModal) closePickerModal.addEventListener('click', () => cardPickerModal.style.display = 'none');

  if (btnLockMyTrade) {
    btnLockMyTrade.addEventListener('click', async () => {
      if (!currentTrade) return;
      const isSender = currentTrade.sender_id === currentUser.id;
      const updateData = isSender ? { sender_locked: true } : { receiver_locked: true };
      await supabaseClient.from('trades').update(updateData).eq('id', currentTrade.id);
    });
  }

  if (btnCancelTrade) {
    btnCancelTrade.addEventListener('click', async () => {
      if (!currentTrade) return;
      await supabaseClient.from('trades').update({ status: 'canceled' }).eq('id', currentTrade.id);
      closeTradeRoom();
    });
  }

  function closeTradeRoom() {
    currentTrade = null;
    selectedTradeCardId = null;
    if (exchangeRoom) exchangeRoom.style.display = 'none';
    if (exchangeLobby) exchangeLobby.style.display = 'block';
    loadExchangePlayers();
  }

});