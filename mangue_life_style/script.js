const WHATSAPP = "240222725152";

const products = [
  {id:1,name:"DIVA 022",cat:"Perfumes",price:20000,old:37777,img:"assets/product-1.jpg",offer:true,desc:"Perfume de equivalencia · Unisex"},
  {id:2,name:"DIVA LIBRE",cat:"Perfumes",price:18000,old:37777,img:"assets/product-2.jpg",offer:true,desc:"Perfume de equivalencia · Femenino"},
  {id:3,name:"DIVA 767",cat:"Perfumes",price:18000,old:37777,img:"assets/product-3.jpg",offer:true,desc:"Perfume de equivalencia · Femenino"},
  {id:4,name:"DIVA 883",cat:"Perfumes",price:18000,old:37777,img:"assets/product-4.jpg",offer:true,desc:"Perfume de equivalencia · Unisex"},
  {id:5,name:"DIVA 743",cat:"Perfumes",price:18000,old:37777,img:"assets/product-5.jpg",offer:true,desc:"Perfume de equivalencia · Femenino"},
  {id:6,name:"Elegance",cat:"Ropa",price:null,img:"assets/banner-moda.jpg",desc:"Selección de moda y estilo"},
  {id:7,name:"Glow Beauty",cat:"Cosméticos",price:null,img:"assets/banner-belleza.jpg",desc:"Cosméticos para tu rutina"},
  {id:8,name:"Premium Wave",cat:"Pelucas",price:null,img:"assets/banner-pelucas.jpg",desc:"Peluca de acabado elegante"},
  {id:9,name:"Classic Heel",cat:"Zapatos",price:null,img:"assets/banner-moda.jpg",desc:"Calzado para cada ocasión"}
];

let cart = JSON.parse(localStorage.getItem("mangue_cart") || "[]");
let currentFilter = "all";

const money = n => n == null ? "Consultar precio" : new Intl.NumberFormat("es-GQ").format(n) + " FCFA";
const $ = s => document.querySelector(s);
const grid = $("#productGrid");

function renderProducts(){
  const q = $("#searchInput").value.trim().toLowerCase();
  let list = products.filter(p =>
    (currentFilter==="all" || (currentFilter==="Oferta" ? p.offer : p.cat===currentFilter)) &&
    (!q || `${p.name} ${p.cat} ${p.desc}`.toLowerCase().includes(q))
  );
  const sort = $("#sortSelect").value;
  if(sort==="low") list.sort((a,b)=>(a.price ?? Infinity)-(b.price ?? Infinity));
  if(sort==="high") list.sort((a,b)=>(b.price ?? -Infinity)-(a.price ?? -Infinity));
  $("#resultText").textContent = `${list.length} producto${list.length!==1?"s":""}`;

  grid.innerHTML = list.map(p => `
    <article class="product-card">
      ${p.offer ? '<span class="badge">OFERTA</span>' : ''}
      <div class="pic"><img src="${p.img}" alt="${p.name}" loading="lazy"></div>
      <div class="product-info">
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <div><span class="price">${money(p.price)}</span>${p.old ? `<span class="old">${money(p.old)}</span>` : ""}</div>
        <button class="add" type="button" onclick="addToCart(${p.id})">🛒 Añadir al carrito</button>
      </div>
    </article>`).join("") ||
    `<div style="grid-column:1/-1;text-align:center;padding:50px">No encontramos productos con esa búsqueda.</div>`;
}

function saveCart(){
  localStorage.setItem("mangue_cart", JSON.stringify(cart));
  updateCart();
}

function addToCart(id){
  const item = cart.find(x=>x.id===id);
  if(item) item.qty++;
  else cart.push({id,qty:1});
  saveCart();
  openCart();
}

function changeQty(id,n){
  const item = cart.find(x=>x.id===id);
  if(!item) return;
  item.qty += n;
  if(item.qty<=0) cart = cart.filter(x=>x.id!==id);
  saveCart();
}

function updateCart(){
  const count = cart.reduce((s,x)=>s+x.qty,0);
  $("#cartCount").textContent = count;

  const items = cart.map(x => ({...products.find(p=>p.id===x.id), qty:x.qty}));
  $("#cartItems").innerHTML = items.length ? items.map(p=>`
    <div class="cart-row">
      <img src="${p.img}" alt="${p.name}">
      <div>
        <h4>${p.name}</h4>
        <small>${money(p.price)}</small>
        <div class="qty">
          <button type="button" onclick="changeQty(${p.id},-1)">−</button>
          <b>${p.qty}</b>
          <button type="button" onclick="changeQty(${p.id},1)">+</button>
        </div>
      </div>
      <b>${money(p.price*p.qty)}</b>
    </div>`).join("")
    : "<p style='text-align:center;color:#777;padding:40px 0'>Tu carrito está vacío.</p>";

  const total = items.reduce((s,p)=>s+(p.price == null ? 0 : p.price*p.qty),0);
  $("#cartTotal").textContent = money(total);
}

function openCart(){
  $("#cartDrawer").classList.add("open");
  $("#drawerBackdrop").classList.add("open");
}
function closeCart(){
  $("#cartDrawer").classList.remove("open");
  $("#drawerBackdrop").classList.remove("open");
}

function setFilter(filter){
  currentFilter = filter || "all";
  document.querySelectorAll(".nav a").forEach(a =>
    a.classList.toggle("active", a.dataset.filter===currentFilter || (!a.dataset.filter && currentFilter==="all"))
  );
  renderProducts();
  $("#catalogo").scrollIntoView({behavior:"smooth"});
}

function openCheckout(){
  if(!cart.length){
    alert("Tu carrito está vacío.");
    return;
  }
  closeCart();
  $("#checkoutModal").classList.add("open");
}

function closeCheckout(){
  $("#checkoutModal").classList.remove("open");
}

function submitOrder(e){
  e.preventDefault();
  if(!cart.length) return;

  const name = $("#customerName").value.trim();
  const phone = $("#customerPhone").value.trim();
  const address = $("#customerAddress").value.trim();
  const delivery = $("#deliveryMethod").value;
  const notes = $("#customerNotes").value.trim();

  if(!name || !phone || !address){
    alert("Completa nombre, teléfono y dirección.");
    return;
  }

  const lines = cart.map(x=>{
    const p = products.find(y=>y.id===x.id);
    return `• ${p.name} x${x.qty} — ${p.price == null ? "Consultar precio" : money(p.price*x.qty)}`;
  }).join("\n");

  const total = cart.reduce((s,x)=>{
    const p = products.find(y=>y.id===x.id);
    return s + (p.price == null ? 0 : p.price*x.qty);
  },0);

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

  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
}

document.querySelectorAll("[data-filter]").forEach(el =>
  el.addEventListener("click", e => {
    e.preventDefault();
    setFilter(el.dataset.filter);
  })
);

$("#searchInput").addEventListener("input", renderProducts);
$("#searchBtn").addEventListener("click", ()=>{
  setFilter("all");
  $("#catalogo").scrollIntoView({behavior:"smooth"});
});
$("#sortSelect").addEventListener("change", renderProducts);
$("#cartBtn").addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);
$("#drawerBackdrop").addEventListener("click", closeCart);
$("#checkoutBtn").addEventListener("click", openCheckout);
$("#closeCheckout").addEventListener("click", closeCheckout);
$("#checkoutForm").addEventListener("submit", submitOrder);
$("#checkoutModal").addEventListener("click", e=>{
  if(e.target.id==="checkoutModal") closeCheckout();
});

$("#accountBtn").addEventListener("click", ()=>$("#accountModal").classList.add("open"));
$("#closeAccount").addEventListener("click", ()=>$("#accountModal").classList.remove("open"));
$("#accountModal").addEventListener("click", e=>{
  if(e.target.id==="accountModal") e.currentTarget.classList.remove("open");
});

$("#heroPrev").onclick = ()=> window.scrollBy({top:-450,behavior:"smooth"});
$("#heroNext").onclick = ()=> window.scrollBy({top:450,behavior:"smooth"});

renderProducts();
updateCart();
