const WHATSAPP = "240222725152";

const SUPABASE_URL =
  "https://ebhqsmxrrbcekfyiqhmo.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_N4xC25_5dW0O4LCKHERCDA_fBFNNfnZ";

let products = [];
let cart = JSON.parse(localStorage.getItem("mangue_cart") || "[]");
let currentFilter = "all";

const money = n =>
  n == null
    ? "Consultar precio"
    : new Intl.NumberFormat("es-GQ").format(n) + " FCFA";

const $ = s => document.querySelector(s);
const grid = $("#productGrid");


/* =========================
   SUPABASE
========================= */

async function loadProducts(){

  try{

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=*`,
      {
        headers:{
          apikey:SUPABASE_KEY,
          Authorization:`Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if(!response.ok){

      throw new Error(
        `Supabase respondió ${response.status}`
      );

    }

    const data = await response.json();

    products = data.map(p => ({
      id: p.id,
      name: p.name || "",
      cat: p.category || "Otros",
      price: p.price == null ? null : Number(p.price),
      old: p.old_price == null ? null : Number(p.old_price),
      img: p.image_url || "assets/product-1.jpg",
      offer: Boolean(p.offer),
      desc: p.description || "",
      talla: p.talla || p.size || "",
      color: p.color || "",
      genero: p.genero || p.gender || "",
      stock: p.stock == null ? 0 : Number(p.stock)
    }));
    renderProducts();
    updateCart();

  }catch(error){

    console.error(
      "Error cargando productos desde Supabase:",
      error
    );

    grid.innerHTML = `
      <div style="
        grid-column:1/-1;
        text-align:center;
        padding:50px;
      ">
        <h3>No se pudieron cargar los productos</h3>
        <p style="color:#777">
          Inténtalo de nuevo en unos segundos.
        </p>
      </div>
    `;

  }

}


/* =========================
   PRODUCTOS
========================= */

function renderProducts() {
  const q = $("#searchInput").value.trim().toLowerCase();

  let list = products.filter(p =>
    (currentFilter === "all" || (currentFilter === "Oferta" ? p.offer : p.cat === currentFilter)) &&
    (!q || `${p.name} ${p.cat} ${p.desc}`.toLowerCase().includes(q))
  );

  const sort = $("#sortSelect") ? $("#sortSelect").value : "";
  if (sort === "low") {
    list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  }
  if (sort === "high") {
    list.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
  }

  if ($("#resultText")) {
    $("#resultText").textContent = `${list.length} producto${list.length !== 1 ? "s" : ""}`;
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:50px;">
        No encontramos productos con esa búsqueda.
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map(p => {
    // Generar línea de detalles (talla, color, género)
    const detalles = [
      p.talla ? `Talla: ${p.talla}` : '',
      p.color ? `Color: ${p.color}` : '',
      p.genero
    ].filter(Boolean).join(' • ');

    return `
      <article class="product-card">
        ${p.offer ? '<span class="badge">OFERTA</span>' : ''}
        
        <div class="pic">
          <img
            src="${p.img}"
            alt="${escapeHtml(p.name)}"
            loading="lazy"
            class="product-image"
            data-product-image="${p.id}"
            title="Tocar para ampliar"
          >
        </div>

        <div class="product-info">
          <h3>${escapeHtml(p.name)}</h3>
          
          <span class="category-tag">${p.cat}</span>
          
          ${detalles ? `<p class="product-details" style="font-size:0.85rem; color:#666; margin:4px 0;">${detalles}</p>` : ''}
          
          ${p.desc ? `<p class="description" style="font-size:0.9rem; color:#444;">${escapeHtml(p.desc)}</p>` : ''}
          
          <div>
            <span class="price">${money(p.price)}</span>
            ${p.old ? `<span class="old">${money(p.old)}</span>` : ''}
          </div>

          <button
            class="add"
            type="button"
            onclick="addToCart('${p.id}')"
            ${p.stock === 0 ? 'disabled' : ''}
          >
            ${p.stock > 0 ? '🛒 Añadir al carrito' : 'Agotado'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

/* ========================= VISOR DE IMÁGENES Y DETALLES ========================= */

function createImageViewer() {
  if (document.getElementById("mangueImageViewer")) return;

  const viewer = document.createElement("div");
  viewer.id = "mangueImageViewer";
  viewer.innerHTML = `
    <div class="mangue-image-overlay" aria-label="Cerrar vista">
      <div class="mangue-modal-card">
        <button type="button" class="mangue-image-close" aria-label="Cerrar">×</button>
        <div class="mangue-modal-img-box">
          <img class="mangue-image-large" src="" alt="">
        </div>
        <div class="mangue-modal-details">
          <span class="category-tag modal-cat"></span>
          <h2 class="modal-title" style="margin:8px 0 6px; font-size:1.3rem; color:#111;"></h2>
          <div class="modal-specs" style="margin:10px 0; font-size:0.9rem; color:#444; background:#f4f4f4; padding:8px 12px; border-radius:6px;"></div>
          <div class="modal-price-box" style="margin:12px 0;"></div>
          <p class="modal-desc" style="font-size:0.9rem; color:#555; line-height:1.4; margin-bottom:18px;"></p>
          <div class="modal-action"></div>
        </div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #mangueImageViewer { position: fixed; inset: 0; z-index: 99999; display: none; }
    #mangueImageViewer.open { display: block; }
    .mangue-image-overlay {
      position: absolute; inset: 0; background: rgba(0, 0, 0, 0.82);
      display: flex; align-items: center; justify-content: center; padding: 15px; box-sizing: border-box;
    }
    .mangue-modal-card {
      position: relative; background: #fff; border-radius: 14px; max-width: 750px; width: 100%;
      max-height: 90vh; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
      padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.4); box-sizing: border-box; text-align: left;
    }
    @media (max-width: 650px) {
      .mangue-modal-card { grid-template-columns: 1fr; padding: 18px; max-height: 85vh; }
    }
    .mangue-modal-img-box { display: flex; align-items: center; justify-content: center; background: #fafafa; border-radius: 10px; overflow: hidden; padding: 10px; }
    .mangue-image-large { max-width: 100%; max-height: 320px; object-fit: contain; border-radius: 8px; }
    .mangue-image-close {
      position: absolute; top: 12px; right: 12px; width: 34px; height: 34px; border: 0;
      border-radius: 50%; background: #eee; color: #111; font-size: 22px; line-height: 34px;
      cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center;
    }
    .mangue-image-close:hover { background: #ddd; }
    body.mangue-image-open { overflow: hidden; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(viewer);

  const overlay = viewer.querySelector(".mangue-image-overlay");
  const closeButton = viewer.querySelector(".mangue-image-close");
  const modalCard = viewer.querySelector(".mangue-modal-card");

  function closeViewer() {
    viewer.classList.remove("open");
    document.body.classList.remove("mangue-image-open");
  }

  closeButton.addEventListener("click", closeViewer);
  overlay.addEventListener("click", e => { if (e.target === overlay) closeViewer(); });
  modalCard.addEventListener("click", e => e.stopPropagation());
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && viewer.classList.contains("open")) closeViewer();
  });

  window.mangueOpenProduct = function(p) {
    if (!p) return;
    
    viewer.querySelector(".mangue-image-large").src = p.img;
    viewer.querySelector(".mangue-image-large").alt = p.name;
    viewer.querySelector(".modal-cat").textContent = p.cat;
    viewer.querySelector(".modal-title").textContent = p.name;
    
    const detalles = [
      p.talla ? `<b>Talla:</b> ${escapeHtml(p.talla)}` : '',
      p.color ? `<b>Color:</b> ${escapeHtml(p.color)}` : '',
      p.genero ? `<b>Género:</b> ${escapeHtml(p.genero)}` : ''
    ].filter(Boolean).join(' • ');
    
    viewer.querySelector(".modal-specs").innerHTML = detalles || 'Sin especificaciones adicionales';
    
    viewer.querySelector(".modal-price-box").innerHTML = `
      <span style="font-size:1.3rem; font-weight:bold; color:#111;">${money(p.price)}</span>
      ${p.old ? `<span style="text-decoration:line-through; color:#888; margin-left:8px;">${money(p.old)}</span>` : ''}
    `;
    
    viewer.querySelector(".modal-desc").textContent = p.desc || "Sin descripción disponible.";
    
    viewer.querySelector(".modal-action").innerHTML = `
      <button class="add" type="button" style="width:100%; padding:12px; font-size:1rem; cursor:pointer;" onclick="addToCart('${p.id}'); document.querySelector('#mangueImageViewer').classList.remove('open'); document.body.classList.remove('mangue-image-open');" ${p.stock === 0 ? 'disabled' : ''}>
        ${p.stock > 0 ? '🛒 Añadir al carrito' : 'Agotado'}
      </button>
    `;

    viewer.classList.add("open");
    document.body.classList.add("mangue-image-open");
  };
}

/* =========================
   SEGURIDAD HTML
========================= */

function escapeHtml(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


/* =========================
   CARRITO
========================= */

function saveCart(){

  localStorage.setItem(
    "mangue_cart",
    JSON.stringify(cart)
  );

  updateCart();

}


function addToCart(id){

  const product =
    products.find(p => p.id === id);

  if(!product){

    alert("Producto no disponible.");

    return;

  }


  if(
    product.stock !== undefined &&
    product.stock <= 0
  ){

    alert(
      "Este producto no está disponible actualmente."
    );

    return;

  }


  const item =
    cart.find(x => x.id === id);


  if(item){

    item.qty++;

  }else{

    cart.push({
      id,
      qty:1
    });

  }


  saveCart();

  openCart();

}


function changeQty(id,n){

  const item =
    cart.find(x => x.id === id);

  if(!item) return;


  item.qty += n;


  if(item.qty <= 0){

    cart =
      cart.filter(x => x.id !== id);

  }


  saveCart();

}
/* ========================= PEDIDO WHATSAPP ========================= */

function submitOrder(e) {
  e.preventDefault();
  if (!cart.length) return;

  const name = $("#customerName").value.trim();
  const phone = $("#customerPhone").value.trim();
  const address = $("#customerAddress").value.trim();
  const delivery = $("#deliveryMethod").value;
  const notes = $("#customerNotes").value.trim();

  if (!name || !phone || !address) {
    alert("Completa nombre, teléfono y dirección.");
    return;
  }

  const lines = cart.map(x => {
    const p = products.find(y => y.id === x.id);
    if (!p) return "";
    
    const specs = [
      p.talla ? `Talla: ${p.talla}` : '',
      p.color ? `Color: ${p.color}` : '',
      p.genero
    ].filter(Boolean).join(', ');
    
    const specText = specs ? ` (${specs})` : '';
    
    return `• ${p.name}${specText} x${x.qty} — ${p.price == null ? "Consultar precio" : money(p.price * x.qty)}`;
  })
  .filter(Boolean)
  .join("\n");

  const total = cart.reduce((s, x) => {
    const p = products.find(y => y.id === x.id);
    return s + (!p || p.price == null ? 0 : p.price * x.qty);
  }, 0);

  const message = `Hola Mangue Life Style. Quiero realizar este pedido:\n\n${lines}\n\nTOTAL: ${money(total)}\n\nDATOS DEL CLIENTE\nNombre: ${name}\nTeléfono: ${phone}\nDirección: ${address}\nEntrega: ${delivery}\nObservaciones: ${notes || "Ninguna"}\n\nPor favor, confirmen disponibilidad y forma de pago.`;

  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
}




/* =========================
   CARRITO ABRIR/CERRAR
========================= */

function openCart(){

  $("#cartDrawer")
    .classList.add("open");

  $("#drawerBackdrop")
    .classList.add("open");

}


function closeCart(){

  $("#cartDrawer")
    .classList.remove("open");

  $("#drawerBackdrop")
    .classList.remove("open");

}


/* =========================
   FILTROS
========================= */

function setFilter(filter){

  currentFilter =
    filter || "all";


  document
    .querySelectorAll(".nav a")
    .forEach(a =>

      a.classList.toggle(
        "active",

        a.dataset.filter === currentFilter
        ||

        (
          !a.dataset.filter &&
          currentFilter === "all"
        )
      )

    );


  renderProducts();


  $("#catalogo")
    .scrollIntoView({
      behavior:"smooth"
    });

}


/* =========================
   CHECKOUT
========================= */

function openCheckout(){

  if(!cart.length){

    alert(
      "Tu carrito está vacío."
    );

    return;

  }


  closeCart();

  $("#checkoutModal")
    .classList.add("open");

}


function closeCheckout(){

  $("#checkoutModal")
    .classList.remove("open");

}


/* =========================
   PEDIDO WHATSAPP
========================= */

function submitOrder(e){

  e.preventDefault();


  if(!cart.length) return;


  const name =
    $("#customerName")
      .value.trim();

  const phone =
    $("#customerPhone")
      .value.trim();

  const address =
    $("#customerAddress")
      .value.trim();

  const delivery =
    $("#deliveryMethod")
      .value;

  const notes =
    $("#customerNotes")
      .value.trim();


  if(
    !name ||
    !phone ||
    !address
  ){

    alert(
      "Completa nombre, teléfono y dirección."
    );

    return;

  }


  const lines =
    cart.map(x => {

      const p =
        products.find(
          y => y.id === x.id
        );


      if(!p) return "";


      return `• ${p.name} x${x.qty} — ${
        p.price == null
        ? "Consultar precio"
        : money(p.price * x.qty)
      }`;

    })
    .filter(Boolean)
    .join("\n");


  const total =
    cart.reduce(
      (s,x) => {

        const p =
          products.find(
            y => y.id === x.id
          );

        return s +
          (
            !p ||
            p.price == null
            ? 0
            : p.price * x.qty
          );

      },
      0
    );


  const message =
`Hola Mangue Life Style. Quiero realizar este pedido:

${lines}

TOTAL: ${money(total)}

DATOS DEL CLIENTE
Nombre: ${name}
Teléfono: ${phone}
Dirección: ${address}
Entrega: ${delivery}
Observaciones: ${notes || "Ninguna"}

Por favor, confirmen disponibilidad y forma de pago.`;


  window.open(
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`,
    "_blank"
  );

}


/* =========================
   EVENTOS
========================= */

document
  .querySelectorAll("[data-filter]")
  .forEach(el =>

    el.addEventListener(
      "click",
      e => {

        e.preventDefault();

        setFilter(
          el.dataset.filter
        );

      }
    )

  );


$("#searchInput")
  .addEventListener(
    "input",
    renderProducts
  );


$("#searchBtn")
  .addEventListener(
    "click",
    () => {

      setFilter("all");

      $("#catalogo")
        .scrollIntoView({
          behavior:"smooth"
        });

    }
  );


$("#sortSelect")
  .addEventListener(
    "change",
    renderProducts
  );


$("#cartBtn")
  .addEventListener(
    "click",
    openCart
  );


$("#closeCart")
  .addEventListener(
    "click",
    closeCart
  );


$("#drawerBackdrop")
  .addEventListener(
    "click",
    closeCart
  );


$("#checkoutBtn")
  .addEventListener(
    "click",
    openCheckout
  );


$("#closeCheckout")
  .addEventListener(
    "click",
    closeCheckout
  );


$("#checkoutForm")
  .addEventListener(
    "submit",
    submitOrder
  );


$("#checkoutModal")
  .addEventListener(
    "click",
    e => {

      if(
        e.target.id ===
        "checkoutModal"
      ){

        closeCheckout();

      }

    }
  );


$("#accountBtn")
  .addEventListener(
    "click",
    () =>
      $("#accountModal")
        .classList.add("open")
  );


$("#closeAccount")
  .addEventListener(
    "click",
    () =>
      $("#accountModal")
        .classList.remove("open")
  );


$("#accountModal")
  .addEventListener(
    "click",
    e => {

      if(
        e.target.id ===
        "accountModal"
      ){

        e.currentTarget
          .classList
          .remove("open");

      }

    }
  );


$("#heroPrev").onclick =
  () =>
    window.scrollBy({
      top:-450,
      behavior:"smooth"
    });


$("#heroNext").onclick =
  () =>
    window.scrollBy({
      top:450,
      behavior:"smooth"
    });
/* ========================= VISOR DE IMÁGENES EVENTO DELEGADO ========================= */
createImageViewer();

grid.addEventListener("click", e => {
  const image = e.target.closest(".product-image");
  if (!image) return;
  e.preventDefault();
  
  const productId = image.dataset.productImage;
  const product = products.find(p => String(p.id) === String(productId));
  if (!product) return;

  if (typeof window.mangueOpenProduct === "function") {
    window.mangueOpenProduct(product);
  }
});


/* =========================
   INICIAR TIENDA
========================= */

loadProducts();
