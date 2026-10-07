// =====================================================================
//  MANOR RC — script.js
//  Sert aux DEUX pages : index.html (site vitrine) et jeu.html (jeu).
//  Chaque partie vérifie que ses éléments existent avant de s'activer.
// =====================================================================

const SUPABASE_URL = 'https://weolphofgqltwazxeshm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_BrJ9UhFgxWemyWrAEW4CYQ_54YeCIr4';

// ---------------------------------------------------------------------
//  RÉGLAGES DU JEU : change ces valeurs pour équilibrer les packs
// ---------------------------------------------------------------------
const PACK_COOLDOWN_MS = 5 * 60 * 1000;   // temps entre deux packs gratuits
const CARDS_PER_PACK = 3;                 // cartes par pack
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
//  DÉMARRAGE DE L'ÉCOUTEUR PRINCIPAL
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
  //  PARTIE 2 — COMPTE UTILISATEUR (jeu.html)
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
    const code = (error && error.code) || '';
    if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.';
    if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return "Ton email n'est pas encore confirmé : clique sur le lien reçu par mail.";
    if (code === 'user_already_exists' || msg.includes('already registered')) return 'Un compte existe déjà avec cet email. Essaie de te connecter.';
    if (code === 'weak_password' || msg.includes('password should be at least')) return 'Le mot de passe doit faire au moins 6 caractères.';
    if (code === 'over_email_send_rate_limit' || msg.includes('rate limit') || msg.includes('too many')) return 'Trop de tentatives. Patiente un peu avant de réessayer.';
    if (msg.includes('failed to fetch') || msg.includes('network')) return 'Connexion impossible. Vérifie ta connexion internet.';
    if (msg.includes('invalid email') || msg.includes('unable to validate email')) return "L'adresse email n'est pas valide.";
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
      tabLogin.setAttribute('aria-selected', String(login));
      tabSignup.setAttribute('aria-selected', String(!login));
    }
    if (authTitle) authTitle.textContent = login ? 'Connexion au Club' : 'Rejoindre le Club';
    if (authSubtitle) authSubtitle.textContent = login ? 'Retrouve ton profil et tes packs.' : 'Crée ton compte pour collectionner les cartes du club.';
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
    if (error && error.code !== '23505') {
      console.error('Profil non créé dans la table profiles :', error);
      return false;
    }
    return true;
  }

  async function handleLogin(email, password) {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    authForm.reset();
    showToast('Connexion réussie. Bienvenue au club !', 'success');
  }

  async function handleSignup(email, password, username) {
    if (username.length < 3) throw new Error('Le pseudo doit faire au moins 3 caractères.');

    const { data, error } = await supabaseClient.auth.signUp({
      email, password, options: { data: { username } }
    });
    if (error) throw error;

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      const err = new Error('User already registered');
      err.code = 'user_already_exists';
      throw err;
    }

    if (data.session) {
      await createProfile(data.user.id, username);
      authForm.reset();
      showToast('Compte créé ! Bienvenue ' + username + ' !', 'success');
    } else {
      authForm.reset();
      setMode(true);
      inputEmail.value = email;
      showFormMessage("Compte créé ! Un email de confirmation vient d'être envoyé : clique sur le lien dedans, puis connecte-toi.", 'success');
      showToast('Compte créé ! Vérifie ta boîte mail.', 'success');
    }
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormMessage();

      if (!supabaseClient) {
        const msg = "Le système de connexion n'a pas pu se charger. Recharge la page.";
        showFormMessage(msg, 'error');
        showToast(msg, 'error');
        return;
      }

      const email = inputEmail.value.trim();
      const password = inputPassword.value;
      const username = inputUsername.value.trim();

      setLoading(true);
      try {
        if (isLoginMode) await handleLogin(email, password);
        else await handleSignup(email, password, username);
      } catch (err) {
        console.error('Erreur de compte :', err);
        const msg = translateError(err);
        showFormMessage(msg, 'error');
        showToast(msg, 'error');
      } finally {
        setLoading(false);
      }
    });
  }

  // ===================================================================
  //  PARTIE 3 — ESPACE JEU
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

  function renderUserHeader(name, email) {
    if (displayUsername) displayUsername.textContent = name;
    if (displayEmail) displayEmail.textContent = email || '';
    if (userAvatar) userAvatar.textContent = (name || '?').charAt(0).toUpperCase();
  }

  const tabButtons = document.querySelectorAll('.game-tab-btn');
  const tabContents = document.querySelectorAll('.game-tab-content');

  let showTab = function(tabId) {
    tabButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabId));
    tabContents.forEach(c => { c.style.display = c.id === tabId ? 'block' : 'none'; });
    if (tabId === 'tab-collection' && currentUser) loadUserCollection(currentUser.id);
  }
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.getAttribute('data-tab')));
  });

  async function loadPlayerData(user) {
    const metaName = (user.user_metadata && user.user_metadata.username) || '';
    renderUserHeader(metaName || (user.email ? user.email.split('@')[0] : 'Joueur'), user.email);

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('username, last_pack_opened_at, is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!currentUser || currentUser.id !== user.id) return;

    let profile = data;
    if (error) {
      console.error('Lecture du profil impossible :', error);
      if (packTimerText) packTimerText.textContent = 'Impossible de charger ton profil. Recharge la page.';
      showToast('Impossible de charger ton profil.', 'error');
      return;
    }
    if (!profile) {
      const username = metaName || (user.email ? user.email.split('@')[0] : 'Joueur');
      await createProfile(user.id, username);
      profile = { username, last_pack_opened_at: null, is_admin: false };
    }

    if (profile.username) renderUserHeader(profile.username, user.email);
    isAdmin = !!profile.is_admin;
    nextPackAt = profile.last_pack_opened_at ? new Date(profile.last_pack_opened_at).getTime() + PACK_COOLDOWN_MS : 0;

    if (roleBadge) {
      if (isAdmin) {
        roleBadge.textContent = '⚡ ADMIN MANOR RC (Packs Illimités)';
        roleBadge.style.color = '#FFD700';
      } else {
        roleBadge.textContent = defaultRoleText;
        roleBadge.style.color = '';
      }
    }
    refreshPackUI();
  }

  function refreshPackUI() {
    if (!btnOpenPack || !packTimerText) return;
    if (packTimerInterval) clearInterval(packTimerInterval);

    if (btnForceGold) btnForceGold.style.display = isAdmin ? '' : 'none';

    if (isAdmin) {
      packTimerText.textContent = '⚡ Mode Admin : packs illimités et instantanés !';
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
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        packTimerText.textContent = `Prochain pack dans : ${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
        btnOpenPack.disabled = true;
      }
    };
    tick();
    packTimerInterval = setInterval(tick, 1000);
  }

  async function saveCardToCollection(userId, card) {
    const { data: existing, error: readError } = await supabaseClient
      .from('user_cards').select('id, quantity')
      .eq('user_id', userId).eq('card_id', card.id).maybeSingle();
    if (readError) return readError;

    if (existing) {
      const { error } = await supabaseClient.from('user_cards')
        .update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
      return error;
    }
    const { error } = await supabaseClient.from('user_cards')
      .insert([{ user_id: userId, card_id: card.id, quantity: 1 }]);
    return error;
  }

  async function openPack(forceGold) {
    if (!currentUser || !supabaseClient || isOpeningPack) return;
    if (!isAdmin && Date.now() < nextPackAt) return;

    const user = currentUser;
    isOpeningPack = true;
    if (btnOpenPack) btnOpenPack.disabled = true;
    if (btnForceGold) btnForceGold.disabled = true;

    try {
      const { data: allCards, error: cardErr } = await supabaseClient.from('cards_definition').select('*');
      if (cardErr || !allCards || !allCards.length) {
        console.error('Chargement des cartes impossible :', cardErr);
        showToast('Erreur lors du chargement des cartes.', 'error');
        return;
      }
      if (forceGold && !allCards.some(c => rarityKey(c) === 'or')) {
        showToast("Aucune carte Or dans la base : tirage normal.", 'info');
      }

      const drawn = drawPack(allCards, forceGold);
      for (const card of drawn) {
        const saveError = await saveCardToCollection(user.id, card);
        if (saveError) {
          console.error("Carte non enregistrée :", saveError);
          showToast("Impossible d'enregistrer tes cartes.", 'error');
          return;
        }
      }

      if (!isAdmin) {
        const now = new Date();
        const { error: timerError } = await supabaseClient
          .from('profiles').update({ last_pack_opened_at: now.toISOString() }).eq('id', user.id);
        if (timerError) console.error("Timer du pack non enregistré :", timerError);
        nextPackAt = now.getTime() + PACK_COOLDOWN_MS;
      }

      await playPackAnimation(drawn);
      showToast('Cartes ajoutées à ta collection !', 'success');
    } catch (err) {
      console.error("Erreur pendant l'ouverture du pack :", err);
      showToast("Une erreur est survenue pendant l'ouverture du pack.", 'error');
    } finally {
      isOpeningPack = false;
      if (currentUser) refreshPackUI();
    }
  }

  if (btnOpenPack) btnOpenPack.addEventListener('click', () => openPack(false));
  if (btnForceGold) btnForceGold.addEventListener('click', () => openPack(true));

  const overlay = document.getElementById('fullscreen-reveal');
  const boosterContainer = document.getElementById('booster-pack-container');
  const cardsContainer = document.getElementById('revealed-cards-container');
  const textCloseReveal = document.getElementById('text-close-reveal');
  const godRays = document.getElementById('god-rays');
  const goldSparkles = document.getElementById('gold-sparkles');
  const boosterHint = document.querySelector('.booster-hint');

  function closeOverlayNow() {
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function playPackAnimation(cards) {
    return new Promise((resolve) => {
      if (!overlay || !boosterContainer || !cardsContainer) { resolve(); return; }

      const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const speed = reduceMotion ? 0.3 : 1;
      const hasEpicCard = cards.some(c => rarityLevel(c) >= 3);
      let canClose = false;
      let opened = false;

      boosterContainer.className = 'booster-wrapper';
      cardsContainer.innerHTML = '';
      cardsContainer.classList.add('hidden');
      if (textCloseReveal) textCloseReveal.classList.add('hidden');
      if (godRays) godRays.classList.add('hidden');
      if (goldSparkles) goldSparkles.classList.add('hidden');
      if (boosterHint) boosterHint.style.opacity = '1';

      document.body.style.overflow = 'hidden';
      overlay.classList.remove('hidden');
      boosterContainer.focus();

      const finish = () => {
        overlay.removeEventListener('click', onOverlayClick);
        document.removeEventListener('keydown', onKeyDown);
        closeOverlayNow();
        resolve();
      };
      function onOverlayClick() { if (canClose) finish(); }
      function onKeyDown(e) {
        if (!opened && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openBooster(); }
        else if (canClose && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); finish(); }
      }

      async function openBooster() {
        if (opened) return;
        opened = true;
        if (boosterHint) boosterHint.style.opacity = '0';

        if (hasEpicCard) {
          if (goldSparkles) goldSparkles.classList.remove('hidden');
          boosterContainer.classList.add('gold-anticipation');
          await wait(2500 * speed);
        } else {
          boosterContainer.classList.add('opening-shake');
          await wait(600 * speed);
        }

        boosterContainer.classList.remove('opening-shake', 'gold-anticipation');
        boosterContainer.classList.add('is-tearing');
        if (hasEpicCard && godRays) godRays.classList.remove('hidden');
        await wait(500 * speed);
        boosterContainer.classList.add('hidden');

        cards.forEach((card, index) => {
          const el = createCardElement(card);
          el.classList.add('card-reveal-anim');
          if (rarityLevel(card) >= 3) el.classList.add('epic-card-ready');
          el.style.animationDelay = (index * 0.4 * speed) + 's';
          cardsContainer.appendChild(el);
        });
        cardsContainer.classList.remove('hidden');

        await wait((cards.length * 400 + 1000) * speed);
        cardsContainer.querySelectorAll('.epic-card-ready').forEach(el => {
          el.style.animationDelay = '0s';
          el.classList.add('gold-epic-reveal');
        });
        if (textCloseReveal) textCloseReveal.classList.remove('hidden');
        canClose = true;
      }

      boosterContainer.addEventListener('click', (e) => { e.stopPropagation(); openBooster(); }, { once: true });
      overlay.addEventListener('click', onOverlayClick);
      document.addEventListener('keydown', onKeyDown);
    });
  }

  // ===================================================================
  //  PARTIE 4 — COLLECTION & FILTRES
  // ===================================================================
  let cachedAllCards = [];
  let cachedUserCards = [];
  let currentRaritySort = 'asc';
  let currentOwnershipFilter = 'all';

  async function loadUserCollection(userId) {
    const grid = document.getElementById('collection-grid');
    if (!grid || !supabaseClient) return;
    grid.innerHTML = '<p class="grid-message">Chargement de ta collection...</p>';

    const [cardsRes, ownedRes] = await Promise.all([
      supabaseClient.from('cards_definition').select('*'),
      supabaseClient.from('user_cards').select('*').eq('user_id', userId)
    ]);
    if (!currentUser || currentUser.id !== userId) return;

    if (cardsRes.error || ownedRes.error) {
      console.error('Chargement de la collection impossible :', cardsRes.error || ownedRes.error);
      grid.innerHTML = '<p class="grid-message">Impossible de charger ta collection.</p>';
      return;
    }
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

    filtered.sort((a, b) => currentRaritySort === 'asc'
      ? rarityLevel(a) - rarityLevel(b)
      : rarityLevel(b) - rarityLevel(a));

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="grid-message">Aucune carte ne correspond à ce filtre.</p>';
      return;
    }

    filtered.forEach(card => {
      const userCard = ownedByCard.get(card.id);
      const isOwned = !!userCard;
      grid.appendChild(createCardElement(card, {
        locked: !isOwned,
        qty: userCard ? userCard.quantity : 0,
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
        btnFilterStatus.classList.add('active-filter');
      } else if (currentOwnershipFilter === 'owned') {
        currentOwnershipFilter = 'locked';
        btnFilterStatus.textContent = 'Affichage : Non possédées';
      } else {
        currentOwnershipFilter = 'all';
        btnFilterStatus.textContent = 'Affichage : Toutes';
        btnFilterStatus.classList.remove('active-filter');
      }
      renderFilteredCollection();
    });
  }

  // ===================================================================
  //  PARTIE 5 — LISTE DES JOUEURS
  // ===================================================================
  async function loadPlayersList() {
    const listEl = document.getElementById('online-players-list');
    if (!listEl || !supabaseClient) return;

    const { data: profiles, error } = await supabaseClient
      .from('profiles').select('id, username, created_at').order('created_at', { ascending: false });

    listEl.innerHTML = '';
    if (error || !profiles) {
      console.error('Liste des joueurs impossible :', error);
      const li = document.createElement('li');
      li.textContent = 'Impossible de charger la liste.';
      listEl.appendChild(li);
      return;
    }

    profiles.forEach(p => {
      const name = p.username || '?';
      const li = document.createElement('li');
      li.className = 'player-row-item';

      const avatar = document.createElement('div');
      avatar.className = 'player-mini-avatar';
      avatar.textContent = name.charAt(0).toUpperCase();

      const label = document.createElement('span');
      label.textContent = name;

      li.append(avatar, label);
      if (currentUser && p.id === currentUser.id) {
        const you = document.createElement('em');
        you.className = 'player-you';
        you.textContent = 'toi';
        li.appendChild(you);
      }
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
    currentUser = null;
    loadedUserId = null;
    isAdmin = false;
    nextPackAt = 0;
    isOpeningPack = false;
    if (packTimerInterval) clearInterval(packTimerInterval);
    cachedAllCards = [];
    cachedUserCards = [];

    closeOverlayNow();
    if (roleBadge) { roleBadge.textContent = defaultRoleText; roleBadge.style.color = ''; }
    if (btnForceGold) { btnForceGold.style.display = 'none'; btnForceGold.disabled = false; }
    if (btnOpenPack) btnOpenPack.disabled = true;
    if (packTimerText) packTimerText.textContent = 'Vérification du timer...';
    const grid = document.getElementById('collection-grid');
    if (grid) grid.innerHTML = '';
    const listEl = document.getElementById('online-players-list');
    if (listEl) listEl.innerHTML = '<li>Chargement...</li>';
    showTab('tab-packs');

    if (authContainer) authContainer.style.display = 'block';
    if (gameDashboard) gameDashboard.style.display = 'none';
    document.body.classList.remove('game-logged-in');
    setMode(true);
  }

  if (supabaseClient && (authContainer || gameDashboard)) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session && session.user) handleSignedIn(session.user);
      else handleSignedOut();
    });

    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        const { error } = await supabaseClient.auth.signOut();
        if (error) showToast(translateError(error), 'error');
        else showToast('Tu es déconnecté. À bientôt !', 'info');
      });
    }
  }

  // ===================================================================
  //  PARTIE 7 — SYSTÈME D'ÉCHANGES (TEMPS RÉEL & ANTI-TRICHE)
  // ===================================================================
  let currentTrade = null;
  let tradeRealtimeChannel = null;
  let selectedTradeCardId = null;

  // 1. Éléments HTML des échanges
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
  const btnPickTradeCard = document.getElementById('btn-pick-trade-card');
  const btnLockMyTrade = document.getElementById('btn-lock-my-trade');
  const myLockStatus = document.getElementById('my-lock-status');
  const opponentLockStatus = document.getElementById('opponent-lock-status');
  const btnCancelTrade = document.getElementById('btn-cancel-trade');
  const pickerCollectionGrid = document.getElementById('picker-collection-grid');
  const closePickerModal = document.querySelector('.close-picker-modal');

  // 2. Charger la liste des joueurs disponibles pour échanger
  async function loadExchangePlayers() {
    if (!exchangePlayersGrid || !supabaseClient || !currentUser) return;

    const { data: profiles, error } = await supabaseClient
      .from('profiles')
      .select('id, username')
      .neq('id', currentUser.id);

    exchangePlayersGrid.innerHTML = '';
    if (error || !profiles || profiles.length === 0) {
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

  // 3. Envoyer une invitation
  async function sendTradeInvite(receiverId, receiverName) {
    if (!currentUser || !supabaseClient) return;

    const { data, error } = await supabaseClient
      .from('trades')
      .insert([{ sender_id: currentUser.id, receiver_id: receiverId, status: 'pending' }])
      .select()
      .single();

    if (error) {
      showToast("Impossible d'envoyer la demande d'échange.", 'error');
      console.error(error);
      return;
    }

    currentTrade = data;
    showToast(`Invitation envoyée à ${receiverName} !`, 'info');
  }

  // 4. Écoute en Temps Réel (Supabase Realtime)
  function initTradeRealtime() {
    if (!supabaseClient || !currentUser) return;

    if (tradeRealtimeChannel) supabaseClient.removeChannel(tradeRealtimeChannel);

    tradeRealtimeChannel = supabaseClient
      .channel('public:trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, payload => {
        const trade = payload.new;
        if (!trade) return;

        // Si l'échange concerne le joueur connecté
        if (trade.sender_id === currentUser.id || trade.receiver_id === currentUser.id) {
          handleTradeUpdate(trade);
        }
      })
      .subscribe();
  }

  // 5. Gestion des mises à jour d'échange
  async function handleTradeUpdate(trade) {
    currentTrade = trade;

    // A. Réception d'une nouvelle invitation
    if (trade.status === 'pending' && trade.receiver_id === currentUser.id) {
      const { data: senderProfile } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('id', trade.sender_id)
        .single();

      if (inviteSenderName) inviteSenderName.textContent = senderProfile ? senderProfile.username : 'Un joueur';
      if (tradeInviteModal) tradeInviteModal.style.display = 'flex';
      return;
    }

    // B. Invitation refusée ou annulée
    if (trade.status === 'declined' || trade.status === 'canceled') {
      closeTradeRoom();
      if (tradeInviteModal) tradeInviteModal.style.display = 'none';
      showToast("L'échange a été annulé ou refusé.", 'info');
      return;
    }

    // C. Échange actif : ouverture ou mise à jour de l'arène
    if (trade.status === 'active') {
      if (tradeInviteModal) tradeInviteModal.style.display = 'none';
      renderTradeRoom(trade);
      return;
    }

    // D. Échange terminé avec succès
    if (trade.status === 'completed') {
      closeTradeRoom();
      showToast('🎉 Échange réussi ! Les cartes ont été transférées dans ton album.', 'success');
      loadUserCollection(currentUser.id);
    }
  }

  // 6. Accepter / Refuser une invitation
  if (btnAcceptInvite) {
    btnAcceptInvite.addEventListener('click', async () => {
      if (!currentTrade) return;
      await supabaseClient.from('trades').update({ status: 'active' }).eq('id', currentTrade.id);
    });
  }

  if (btnDeclineInvite) {
    btnDeclineInvite.addEventListener('click', async () => {
      if (!currentTrade) return;
      await supabaseClient.from('trades').update({ status: 'declined' }).eq('id', currentTrade.id);
      if (tradeInviteModal) tradeInviteModal.style.display = 'none';
    });
  }

  // 7. Rendu de la salle d'échange
  async function renderTradeRoom(trade) {
    if (exchangeLobby) exchangeLobby.style.display = 'none';
    if (exchangeRoom) exchangeRoom.style.display = 'block';

    const isSender = trade.sender_id === currentUser.id;
    const opponentId = isSender ? trade.receiver_id : trade.sender_id;

    // Profil de l'adversaire
    const { data: oppProfile } = await supabaseClient.from('profiles').select('username').eq('id', opponentId).single();
    const oppName = oppProfile ? oppProfile.username : 'Adversaire';

    if (tradeOpponentName) tradeOpponentName.textContent = oppName;
    if (tradeOpponentAvatar) tradeOpponentAvatar.textContent = oppName.charAt(0).toUpperCase();
    if (tradeMyAvatar && currentUser) {
      const myName = displayUsername ? displayUsername.textContent : 'M';
      tradeMyAvatar.textContent = myName.charAt(0).toUpperCase();
    }

    // Cartes posées
    const myCardId = isSender ? trade.sender_card_id : trade.receiver_card_id;
    const oppCardId = isSender ? trade.receiver_card_id : trade.sender_card_id;

    const myLocked = isSender ? trade.sender_locked : trade.receiver_locked;
    const oppLocked = isSender ? trade.receiver_locked : trade.sender_locked;

    // Mise à jour de mon emplacement
    if (myCardId) {
      const cardDef = cachedAllCards.find(c => c.id === myCardId);
      if (cardDef) {
        myTradeSlot.innerHTML = '';
        myTradeSlot.classList.add('has-card');
        myTradeSlot.appendChild(createCardElement(cardDef));
      }
    } else {
      myTradeSlot.classList.remove('has-card');
      myTradeSlot.innerHTML = '<button class="btn-add-trade-card" id="btn-pick-trade-card">+</button>';
      document.getElementById('btn-pick-trade-card').addEventListener('click', openCardPicker);
    }

    // Mise à jour de l'emplacement adverse
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

    // États des verrous
    if (btnLockMyTrade) {
      btnLockMyTrade.disabled = !myCardId || myLocked;
      btnLockMyTrade.textContent = myLocked ? '🔒 Carte validée' : 'Valider ma carte';
    }
    if (myLockStatus) myLockStatus.textContent = myLocked ? 'Prêt pour l\'échange !' : 'Sélectionne et valide ta carte.';
    if (opponentLockStatus) opponentLockStatus.textContent = oppLocked ? '🔒 Adversaire prêt !' : 'En train de choisir...';

    // Déclenchement automatique de la transaction SQL si les deux joueurs ont verrouillé
    if (myLocked && oppLocked && isSender) {
      executeTradeTransaction(trade.id);
    }
  }

  // 8. Transaction sécurisée côté serveur
  async function executeTradeTransaction(tradeId) {
    if (tradeStatusIndicator) tradeStatusIndicator.textContent = 'Échange en cours de finalisation...';
    
    const { data, error } = await supabaseClient.rpc('execute_trade', { trade_uuid: tradeId });

    if (error || !data) {
      console.error('Erreur transaction :', error);
      showToast("Erreur lors de l'échange. Vérifiez que vous avez bien les cartes.", 'error');
    }
  }

  // 9. Modale de sélection de carte
  function openCardPicker() {
    if (!pickerCollectionGrid || !cardPickerModal) return;

    pickerCollectionGrid.innerHTML = '';
    const ownedCards = cachedUserCards.filter(uc => uc.quantity > 0);

    if (ownedCards.length === 0) {
      pickerCollectionGrid.innerHTML = '<p class="grid-message">Tu n\'as aucune carte disponible à échanger.</p>';
      cardPickerModal.style.display = 'flex';
      return;
    }

    ownedCards.forEach(uc => {
      const cardDef = cachedAllCards.find(c => c.id === uc.card_id);
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

    cardPickerModal.style.display = 'flex';
  }

  if (closePickerModal) closePickerModal.addEventListener('click', () => cardPickerModal.style.display = 'none');

  // 10. Bouton "Valider ma carte"
  if (btnLockMyTrade) {
    btnLockMyTrade.addEventListener('click', async () => {
      if (!currentTrade) return;
      const isSender = currentTrade.sender_id === currentUser.id;
      const updateData = isSender ? { sender_locked: true } : { receiver_locked: true };
      await supabaseClient.from('trades').update(updateData).eq('id', currentTrade.id);
    });
  }

  // 11. Annuler l'échange
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

  // Lancer le chargement des échanges lors de l'ouverture de l'onglet
  const oldShowTab = showTab;
  showTab = function(tabId) {
    oldShowTab(tabId);
    if (tabId === 'tab-exchange' && currentUser) {
      loadExchangePlayers();
      initTradeRealtime();
    }
  };

})