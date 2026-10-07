document.addEventListener('DOMContentLoaded', () => {

  // 1. LES PRODUITS (modifie ici les noms et les prix)
  const PRODUCTS = [
    { id: 'maillot-domicile',  name: 'Maillot Domicile',  price: 79.99, image: 'asset/maillot-domicile.jpg', imageWorn: 'asset/maillot-domicile-porte.jpg' },
    { id: 'maillot-exterieur', name: 'Maillot Extérieur', price: 79.99, image: 'asset/maillot-exterieur.jpg', imageWorn: 'asset/maillot-exterieur-porte.jpg' },
    { id: 'survetement',       name: 'Survêtement Pro',   price: 109.99, image: 'asset/survetement.jpg', imageWorn: 'asset/survetement-porte.jpg' },
    { id: 'ballon',            name: 'Ballon Manor RC',   price: 34.99, image: 'asset/ballon.jpg', imageWorn: 'asset/ballon-porte.jpg' }
  ];

  // 2. LES BLAGUES (une est choisie au hasard à chaque paiement)
  // title = le gros message, text = la phrase en dessous
  const PRANKS = [
    {
      title: 'T\'as vraiment cru ?!',
      text: 'Le club n\'a absolument pas les moyens de produire des maillots. Les fonds sont tous passés dans les packs FC 27.'
    },
    {
      title: 'Attention, tu viens de te faire voler tes données !',
      text: 'Merci pour les sous, le Manor RC va pouvoir recruter un gardien.'
    },
    {
      title: 'Bien joué, je viens de t\'installer un virus.',
      text: 'Enfin non, ça n\'existe que dans ma tête. Mais ton cœur a battu plus vite, avoue.'
    },
    {
      title: 'Attention, la prochaine fois, ce ne sera pas un faux site !',
      text: 'Avant de payer, demande-toi toujours qui tient la boutique. Là, c\'était juste le Manor RC.'
    },
    {
      title: 'Fais mieux attention !',
      text: 'Pas de mentions légales, pas d\'avis, des prix bizarres : tout était là pour te mettre la puce à l\'oreille.'
    },
    {
      title: 'Tu viens de donner ta carte à un club de foot virtuel.',
      text: 'Vérifie toujours l\'adresse du site, le cadenas et les avis avant de sortir ta carte bancaire.'
    },
    {
      title: 'Ceci était un exercice de sensibilisation.',
      text: 'Un vrai site frauduleux ne t\'aurait pas prévenu. Ne donne jamais ton code CVV à un site que tu ne connais pas.'
    }
  ];

  // 3. LES ÉLÉMENTS DE LA PAGE
  const grid = document.getElementById('product-grid');
  const cartList = document.getElementById('cart-list');
  const cartEmpty = document.getElementById('cart-empty');
  const cartTotal = document.getElementById('cart-total');
  const cartCount = document.getElementById('cart-count');
  const btnCheckout = document.getElementById('btn-checkout');
  const checkoutModal = document.getElementById('checkoutModal');
  const closeCheckout = document.getElementById('close-checkout');
  const checkoutForm = document.getElementById('checkout-form');
  const prankScreen = document.getElementById('prankScreen');
  const prankLoader = document.getElementById('prankLoader');
  const prankReveal = document.getElementById('prankReveal');
  const prankTitle = document.getElementById('prankTitle');
  const prankText = document.getElementById('prankText');
  const prankClose = document.getElementById('prankClose');

  // Le panier : { 'ballon': 2, 'survetement': 1 }
  // Il est gardé dans sessionStorage : on le retrouve en rechargeant la page ou en revenant de l'accueil.
  const CART_KEY = 'manor_rc_panier';
  let cart = loadCart();

  function loadCart() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CART_KEY) || '{}');
      const clean = {};
      PRODUCTS.forEach(p => {
        const qty = Math.floor(Number(saved[p.id]));
        if (qty > 0) clean[p.id] = Math.min(qty, 99);
      });
      return clean;
    } catch (err) {
      return {};
    }
  }
  function saveCart() {
    try { sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (err) { /* stockage indisponible : pas grave */ }
  }

  const formatPrice = (n) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  // 4. AFFICHER LES PRODUITS
  PRODUCTS.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-media">
        <img class="img-main" src="${product.image}" alt="${product.name}">
        <img class="img-hover" src="${product.imageWorn}" alt="" loading="lazy">
      </div>
      <div class="shop-info">
        <h3>${product.name}</h3>
        <span class="price">${formatPrice(product.price)}</span>
        <button class="btn-add" data-id="${product.id}">Ajouter au panier</button>
      </div>`;
    grid.appendChild(card);
  });

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-add');
    if (btn) { changeQty(btn.dataset.id, 1); return; }
    // Sur téléphone (pas de survol) : toucher la carte affiche la photo portée
    const card = e.target.closest('.product-card');
    if (card) card.classList.toggle('show-worn');
  });

  // 5. LE PANIER
  function changeQty(id, delta) {
    cart[id] = Math.min((cart[id] || 0) + delta, 99);
    if (cart[id] <= 0) delete cart[id];
    saveCart();
    renderCart();
  }

  function renderCart() {
    cartList.innerHTML = '';
    let total = 0;
    let count = 0;

    PRODUCTS.forEach(product => {
      const qty = cart[product.id];
      if (!qty) return;
      total += product.price * qty;
      count += qty;

      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <img class="cart-item-img" src="${product.image}" alt="">
        <span class="cart-item-name">${product.name}</span>
        <div class="qty">
          <button data-id="${product.id}" data-delta="-1" aria-label="Retirer un">&minus;</button>
          <span>${qty}</span>
          <button data-id="${product.id}" data-delta="1" aria-label="Ajouter un">+</button>
        </div>
        <span class="cart-item-price">${formatPrice(product.price * qty)}</span>`;
      cartList.appendChild(li);
    });

    cartTotal.textContent = formatPrice(total);
    cartCount.textContent = count;
    cartEmpty.style.display = count === 0 ? 'block' : 'none';
    btnCheckout.disabled = count === 0;
  }

  cartList.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (btn) changeQty(btn.dataset.id, +btn.dataset.delta);
  });

  // Si on arrive depuis la page d'accueil (shop.html?produit=ballon), on l'ajoute direct
  // Si on arrive depuis la page d'accueil (shop.html?produit=ballon), on l'ajoute direct
  const wanted = new URLSearchParams(window.location.search).get('produit');
  if (wanted && PRODUCTS.some(p => p.id === wanted)) {
    changeQty(wanted, 1);
    // On retire "?produit=..." de l'adresse : un rechargement n'ajoutera pas l'article une 2e fois
    try { window.history.replaceState(null, '', window.location.pathname); } catch (err) { /* ouvert depuis un fichier : pas grave */ }
    
    // Défilement fluide vers le panier
    const panierSection = document.getElementById('panier');
    if (panierSection) {
      setTimeout(() => panierSection.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }
  renderCart();
  
  // 6. LA FENÊTRE DE PAIEMENT
  function openCheckout() { checkoutModal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
  function closeCheckoutModal() { checkoutModal.style.display = 'none'; document.body.style.overflow = ''; }
  btnCheckout.addEventListener('click', openCheckout);
  closeCheckout.addEventListener('click', closeCheckoutModal);
  window.addEventListener('click', (e) => { if (e.target === checkoutModal) closeCheckoutModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && checkoutModal.style.display === 'flex') closeCheckoutModal();
  });

  // 7. LA BLAGUE
  // Important : on ne lit JAMAIS les champs du formulaire, rien n'est stocké ni envoyé.
  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    checkoutForm.reset();
    closeCheckoutModal();
    playPrank();
  });

  function playPrank() {
    const prank = PRANKS[Math.floor(Math.random() * PRANKS.length)];
    prankReveal.hidden = true;
    prankLoader.hidden = false;
    prankScreen.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Faux chargement de 2,8 secondes, puis la révélation
    setTimeout(() => {
      prankTitle.textContent = prank.title;
      prankText.textContent = prank.text;
      prankLoader.hidden = true;
      prankReveal.hidden = false;
    }, 2800);
  }

  prankClose.addEventListener('click', () => {
    prankScreen.classList.remove('show');
    document.body.style.overflow = '';
    cart = {};
    saveCart();
    renderCart();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

});
