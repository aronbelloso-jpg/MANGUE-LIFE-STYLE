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

      id:p.id,
      name:p.name || "",
      cat:p.category || "Otros",
      price:p.price == null ? null : Number(p.price),
      old:p.old_price == null ? null : Number(p.old_price),
      img:p.image_url || "assets/product-1.jpg",
      offer:Boolean(p.offer),
      desc:p.description || "",
      stock:p.stock == null ? 0 : Number(p.stock)

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

function renderProducts(){

  const q =
    $("#searchInput").value
      .trim()
      .toLowerCase();

  let list =
    products.filter(p =>

      (
        currentFilter === "all" ||

        (
          currentFilter === "Oferta"
          ? p.offer
          : p.cat === currentFilter
        )
      )

      &&

      (
        !q ||
        `${p.name} ${p.cat} ${p.desc}`
          .toLowerCase()
          .includes(q)
      )

    );


  const sort =
    $("#sortSelect").value;


  if(sort === "low"){

    list.sort(
      (a,b)=>
        (a.price ?? Infinity) -
        (b.price ?? Infinity)
    );

  }


  if(sort === "high"){

    list.sort(
      (a,b)=>
        (b.price ?? -Infinity) -
        (a.price ?? -Infinity)
    );

  }


  $("#resultText").textContent =
    `${list.length} producto${list.length !== 1 ? "s" : ""}`;


  grid.innerHTML =
    list.map(p => `

      <article class="product-card">

        ${
          p.offer
          ? '<span class="badge">OFERTA</span>'
          : ''
        }

        <div class="pic">

          <img
            src="${p.img}"
            alt="${escapeHtml(p.name)}"
            loading="lazy"
          >

        </div>

        <div class="product-info">

          <h3>
            ${escapeHtml(p.name)}
          </h3>

          <p>
            ${escapeHtml(p.desc)}
          </p>

          <div>

            <span class="price">
              ${money(p.price)}
            </span>

            ${
              p.old
              ?
              `<span class="old">
                ${money(p.old)}
              </span>`
              :
              ""
            }

          </div>

          <button
            class="add"
            type="button"
            onclick="addToCart(${p.id})"
          >
            🛒 Añadir al carrito
          </button>

        </div>

      </article>

    `).join("")

    ||

    `
      <div
        style="
          grid-column:1/-1;
          text-align:center;
          padding:50px
        "
      >
        No encontramos productos con esa búsqueda.
      </div>
    `;

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


/* =========================
   ACTUALIZAR CARRITO
========================= */

function updateCart(){

  const count =
    cart.reduce(
      (s,x) => s + x.qty,
      0
    );


  $("#cartCount").textContent =
    count;


  const items =
    cart
      .map(x => {

        const product =
          products.find(
            p => p.id === x.id
          );

        if(!product) return null;

        return {
          ...product,
          qty:x.qty
        };

      })
      .filter(Boolean);


  $("#cartItems").innerHTML =
    items.length

    ?

    items.map(p => `

      <div class="cart-row">

        <img
          src="${p.img}"
          alt="${escapeHtml(p.name)}"
        >

        <div>

          <h4>
            ${escapeHtml(p.name)}
          </h4>

          <small>
            ${money(p.price)}
          </small>

          <div class="qty">

            <button
              type="button"
              onclick="changeQty(${p.id},-1)"
            >
              −
            </button>

            <b>
              ${p.qty}
            </b>

            <button
              type="button"
              onclick="changeQty(${p.id},1)"
            >
              +
            </button>

          </div>

        </div>

        <b>
          ${
            p.price == null
            ? "Consultar"
            : money(p.price * p.qty)
          }
        </b>

      </div>

    `).join("")

    :

    `
      <p
        style="
          text-align:center;
          color:#777;
          padding:40px 0
        "
      >
        Tu carrito está vacío.
      </p>
    `;


  const total =
    items.reduce(
      (s,p) =>
        s +
        (
          p.price == null
          ? 0
          : p.price * p.qty
        ),
      0
    );


  $("#cartTotal").textContent =
    money(total);

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


/* =========================
   INICIAR TIENDA
========================= */

loadProducts();
