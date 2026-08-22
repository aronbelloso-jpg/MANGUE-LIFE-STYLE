const WHATSAPP = "240222725152";

const SUPABASE_URL =
  "https://ebhqsmxrrbcekfyiqhmo.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_N4xC25_5dW0O4LCKHERCDA_fBFNNfnZ";

let products = [];
let variants = [];
let cart = JSON.parse(
  localStorage.getItem("mangue_cart") || "[]"
);

let currentFilter = "all";

const money = n =>
  n == null
    ? "Consultar precio"
    : new Intl.NumberFormat("es-GQ").format(
        Number(n)
      ) + " FCFA";

const $ = s => document.querySelector(s);

const grid = $("#productGrid");

/* =========================================================
   SEGURIDAD
========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function firstValue(obj, keys) {
  for (const key of keys) {
    if (
      obj &&
      obj[key] !== undefined &&
      obj[key] !== null &&
      String(obj[key]).trim() !== ""
    ) {
      return obj[key];
    }
  }

  return "";
}

/* =========================================================
   CATEGORÍAS
========================================================= */

const CATEGORY_ALIASES = {
  zapatos: [
    "zapatos",
    "zapato",
    "calzado",
    "shoes"
  ],

  perfumes: [
    "perfumes",
    "perfume",
    "fragancias",
    "fragancia",
    "fragrance"
  ],

  ropa: [
    "ropa",
    "ropas",
    "clothing",
    "vestidos",
    "vestido",
    "camisas",
    "camisa",
    "pantalones",
    "pantalon",
    "faldas",
    "falda"
  ],

  gala: [
    "gala",
    "ropa de gala",
    "ropas de gala"
  ],

  casual: [
    "casual",
    "ropa casual",
    "ropas casual"
  ],

  pelucas: [
    "pelucas",
    "peluca",
    "wigs"
  ],

  cosmeticos: [
    "cosmeticos",
    "cosmetico",
    "cosmetica",
    "cosmética",
    "maquillaje",
    "makeup"
  ],

  bolsos: [
    "bolsos",
    "bolso",
    "accesorios",
    "bolsos y accesorios",
    "bolso y accesorios",
    "bags",
    "accessories"
  ]
};

function categoryIs(value, type) {
  const normalized = normalize(value);

  return (CATEGORY_ALIASES[type] || [])
    .some(alias => {
      const a = normalize(alias);

      return (
        normalized === a ||
        normalized.includes(a)
      );
    });
}

function getSection(product) {

  const category =
    product.category ||
    product.cat ||
    "";

  const style =
    product.estilo ||
    product.style ||
    "";

  if (categoryIs(category, "zapatos")) {
    return "zapatos";
  }

  if (categoryIs(category, "perfumes")) {
    return "perfumes";
  }

  if (categoryIs(category, "pelucas")) {
    return "pelucas";
  }

  if (categoryIs(category, "cosmeticos")) {
    return "cosmeticos";
  }

  if (categoryIs(category, "bolsos")) {
    return "bolsos";
  }

  if (
    categoryIs(category, "gala") ||
    categoryIs(style, "gala")
  ) {
    return "gala";
  }

  if (
    categoryIs(category, "casual") ||
    categoryIs(style, "casual")
  ) {
    return "casual";
  }

  if (categoryIs(category, "ropa")) {
    return "ropa";
  }

  return "otros";
}

/* =========================================================
   CONVERTIR PRODUCTOS
========================================================= */

function mapProduct(p) {

  const oldPrice =
    firstValue(p, [
      "old_price",
      "old-price",
      "oldPrice",
      "precio_anterior"
    ]);

  const stock =
    firstValue(p, [
      "stock",
      "cantidad_stock",
      "cantidad",
      "inventory"
    ]);

  return {

    id: p.id,

    name:
      firstValue(p, [
        "name",
        "nombre"
      ]) || "",

    cat:
      firstValue(p, [
        "category",
        "categoria",
        "cat"
      ]) || "Otros",

    category:
      firstValue(p, [
        "category",
        "categoria",
        "cat"
      ]) || "Otros",

    price:
      p.price == null
        ? null
        : Number(p.price),

    old:
      oldPrice === ""
        ? null
        : Number(oldPrice),

    img:
      firstValue(p, [
        "image_url",
        "image-url",
        "imageUrl",
        "img",
        "imagen"
      ]) ||
      "assets/product-1.jpg",

    offer:
      Boolean(
        p.offer ??
        p.oferta ??
        false
      ),

    desc:
      firstValue(p, [
        "description",
        "descripcion",
        "desc"
      ]),

    talla:
      firstValue(p, [
        "talla",
        "size"
      ]),

    color:
      firstValue(p, [
        "color",
        "colour"
      ]),

    modelo:
      firstValue(p, [
        "modelo",
        "model"
      ]),

    genero:
      firstValue(p, [
        "genero",
        "gender"
      ]),

    ml:
      firstValue(p, [
        "ml",
        "millilitros",
        "mililitros",
        "volume",
        "volumen"
      ]),

    tipo:
      firstValue(p, [
        "tipo",
        "type",
        "tipo_perfume",
        "perfume_type"
      ]),

    intensidad:
      firstValue(p, [
        "intensidad",
        "intensity"
      ]),

    largo:
      firstValue(p, [
        "largo",
        "length",
        "longitud"
      ]),

    tono:
      firstValue(p, [
        "tono",
        "tone",
        "shade"
      ]),

    tamaño:
      firstValue(p, [
        "tamaño",
        "tamano",
        "size"
      ]),

    presentacion:
      firstValue(p, [
        "presentacion",
        "presentation"
      ]),

    material:
      firstValue(p, [
        "material"
      ]),

    estilo:
      firstValue(p, [
        "estilo",
        "style",
        "tipo_ropa",
        "ropa_tipo"
      ]),

    stock:
      stock === ""
        ? 0
        : Number(stock)
  };
}

/* =========================================================
   SUPABASE
========================================================= */

async function supabaseGet(table) {

  const response =
    await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization:
            `Bearer ${SUPABASE_KEY}`
        }
      }
    );

  if (!response.ok) {
    throw new Error(
      `${table}: HTTP ${response.status}`
    );
  }

  return response.json();
}

/* =========================================================
   CARGAR PRODUCTOS Y VARIANTES
========================================================= */

async function loadProducts() {

  try {

    const data =
      await supabaseGet("products");

    products =
      data.map(mapProduct);

    await loadVariants();

    renderProducts();

    updateCart();

  } catch (error) {

    console.error(
      "Error cargando productos:",
      error
    );

    if (grid) {

      grid.innerHTML = `
        <div
          style="
            grid-column:1/-1;
            text-align:center;
            padding:50px;
          "
        >
          <h3>
            No se pudieron cargar los productos
          </h3>

          <p style="color:#777">
            Inténtalo de nuevo en unos segundos.
          </p>
        </div>
      `;
    }
  }
}

/* =========================================================
   CARGAR TODAS LAS VARIANTES
========================================================= */

async function loadVariants() {

  variants = [];

  try {

    const [
      variantRows,
      relationRows,
      optionValueRows,
      optionRows
    ] = await Promise.all([
      supabaseGet("product_variant"),
      supabaseGet(
        "product_variant_option_value"
      ),
      supabaseGet(
        "product_option_values"
      ),
      supabaseGet(
        "product_options"
      )
    ]);

    const optionsById = {};

    optionRows.forEach(option => {

      optionsById[String(option.id)] =
        firstValue(option, [
          "name",
          "nombre",
          "label",
          "titulo"
        ]) || "Opción";
    });

    const valuesById = {};

    optionValueRows.forEach(value => {

      valuesById[String(value.id)] = {

        id: value.id,

        name:
          firstValue(value, [
            "value",
            "valor",
            "name",
            "nombre",
            "label"
          ]) || "",

        optionId:
          firstValue(value, [
            "option_id",
            "product_option_id",
            "opcion_id"
          ])
      };
    });

    const relationsByVariant = {};

    relationRows.forEach(relation => {

      const variantId =
        firstValue(relation, [
          "variant_id",
          "product_variant_id"
        ]);

      const valueId =
        firstValue(relation, [
          "option_value_id",
          "product_option_value_id",
          "valor_id"
        ]);

      if (
        variantId === "" ||
        valueId === ""
      ) {
        return;
      }

      const key =
        String(variantId);

      if (!relationsByVariant[key]) {
        relationsByVariant[key] = [];
      }

      relationsByVariant[key]
        .push(
          valuesById[String(valueId)]
        );
    });

    variants =
      variantRows.map(variant => {

        const productId =
          firstValue(variant, [
            "product_id",
            "producto_id"
          ]);

        const stockValue =
          firstValue(variant, [
            "stock",
            "quantity",
            "cantidad",
            "inventory"
          ]);

        const priceValue =
          firstValue(variant, [
            "price",
            "precio"
          ]);

        const variantOptions =
          (
            relationsByVariant[
              String(variant.id)
            ] || []
          )
          .filter(Boolean)
          .map(value => {

            const optionName =
              optionsById[
                String(
                  value.optionId
                )
              ] || "Opción";

            return {
              name: optionName,
              value: value.name
            };
          });

        return {

          id: variant.id,

          productId,

          stock:
            stockValue === ""
              ? 0
              : Number(stockValue),

          price:
            priceValue === ""
              ? null
              : Number(priceValue),

          options:
            variantOptions
        };
      });

  } catch (error) {

    /*
      Si las tablas de variantes no están
      accesibles públicamente, no rompemos
      la tienda. El producto seguirá funcionando
      normalmente usando su stock principal.
    */

    console.warn(
      "No se pudieron cargar las variantes:",
      error
    );

    variants = [];
  }
}

/* =========================================================
   VARIANTES DE UN PRODUCTO
========================================================= */

function getProductVariants(productId) {

  return variants.filter(
    variant =>
      String(variant.productId) ===
      String(productId)
  );
}

/* =========================================================
   INFORMACIÓN DE VARIANTE
========================================================= */

function getVariantOption(
  variant,
  possibleNames
) {

  const names =
    possibleNames.map(normalize);

  const found =
    variant.options.find(
      option =>
        names.includes(
          normalize(option.name)
        )
    );

  return found
    ? found.value
    : "";
}

/* =========================================================
   DETALLES DE UNA VARIANTE
========================================================= */

function buildVariantDetails(
  variant,
  product
) {

  const result = [];

  const section =
    getSection(product);

  function add(
    label,
    names
  ) {

    const value =
      getVariantOption(
        variant,
        names
      );

    if (value) {

      result.push({
        label,
        value
      });
    }
  }

  if (
    section === "zapatos" ||
    section === "ropa" ||
    section === "gala" ||
    section === "casual"
  ) {

    add("Talla", [
      "talla",
      "size"
    ]);

    add("Color", [
      "color"
    ]);

    add("Modelo", [
      "modelo",
      "model"
    ]);

    add("Estilo", [
      "estilo",
      "style"
    ]);
  }

  else if (
    section === "perfumes"
  ) {

    add("ML", [
      "ml",
      "mililitros",
      "millilitros",
      "volume",
      "volumen"
    ]);

    add("Tipo", [
      "tipo",
      "type",
      "tipo de perfume",
      "perfume type"
    ]);

    add("Intensidad", [
      "intensidad",
      "intensity"
    ]);
  }

  else if (
    section === "pelucas"
  ) {

    add("Color", [
      "color"
    ]);

    add("Talla", [
      "talla",
      "size"
    ]);

    add("Modelo", [
      "modelo",
      "model"
    ]);

    add("Largo", [
      "largo",
      "length",
      "longitud"
    ]);

    add("Tipo", [
      "tipo",
      "type"
    ]);
  }

  else if (
    section === "cosmeticos"
  ) {

    add("Tono", [
      "tono",
      "tone",
      "shade"
    ]);

    add("Tamaño", [
      "tamaño",
      "tamano",
      "size"
    ]);

    add("Presentación", [
      "presentacion",
      "presentation"
    ]);
  }

  else if (
    section === "bolsos"
  ) {

    add("Tipo", [
      "tipo",
      "type"
    ]);

    add("Color", [
      "color"
    ]);

    add("Modelo", [
      "modelo",
      "model"
    ]);

    add("Tamaño", [
      "tamaño",
      "tamano",
      "size"
    ]);

    add("Material", [
      "material"
    ]);
  }

  /*
    Para cualquier categoría que tenga
    opciones adicionales, también mostramos
    automáticamente las opciones restantes.
  */

  if (variant.options) {

    variant.options.forEach(option => {

      const alreadyShown =
        result.some(
          item =>
            normalize(item.label) ===
            normalize(option.name)
        );

      if (
        !alreadyShown &&
        option.value
      ) {

        result.push({
          label: option.name,
          value: option.value
        });
      }
    });
  }

  return result;
}

/* =========================================================
   DETALLES DEL PRODUCTO PRINCIPAL
========================================================= */

function getProductMainDetails(
  product
) {

  const result = [];

  const section =
    getSection(product);

  function add(
    label,
    value
  ) {

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {

      result.push({
        label,
        value
      });
    }
  }

  if (
    section === "zapatos" ||
    section === "ropa" ||
    section === "gala" ||
    section === "casual"
  ) {

    add("Talla", product.talla);
    add("Color", product.color);
    add("Modelo", product.modelo);
    add("Estilo", product.estilo);
  }

  else if (
    section === "perfumes"
  ) {

    add("ML", product.ml);
    add("Tipo", product.tipo);
    add(
      "Intensidad",
      product.intensidad
    );
  }

  else if (
    section === "pelucas"
  ) {

    add("Color", product.color);
    add("Talla", product.talla);
    add("Modelo", product.modelo);
    add("Largo", product.largo);
    add("Tipo", product.tipo);
  }

  else if (
    section === "cosmeticos"
  ) {

    add("Tono", product.tono);
    add("Tamaño", product.tamaño);
    add(
      "Presentación",
      product.presentacion
    );
  }

  else if (
    section === "bolsos"
  ) {

    add("Tipo", product.tipo);
    add("Color", product.color);
    add("Modelo", product.modelo);
    add("Tamaño", product.tamaño);
    add("Material", product.material);
  }

  return result;
}

/* =========================================================
   TEXTO CORTO PARA TARJETA
========================================================= */

function buildShortDetails(
  product
) {

  const details =
    getProductMainDetails(
      product
    );

  return details
    .map(
      item =>
        `${escapeHtml(
          item.label
        )}: ${escapeHtml(
          item.value
        )}`
    )
    .join(" • ");
}

/* =========================================================
   RENDER PRODUCTOS
========================================================= */

function renderProducts() {

  if (!grid) return;

  const search =
    $("#searchInput");

  const q =
    search
      ? normalize(
          search.value
        )
      : "";

  let list =
    products.filter(product => {

      if (
        currentFilter !== "all"
      ) {

        if (
          currentFilter ===
          "Oferta"
        ) {

          if (!product.offer) {
            return false;
          }

        } else {

          const section =
            getSection(product);

          const wanted =
            normalize(
              currentFilter
            );

          const category =
            normalize(
              product.cat
            );

          const valid =
            wanted === category ||
            (
              wanted ===
              "bolsos y accesorios" &&
              section === "bolsos"
            ) ||
            (
              wanted === "bolsos" &&
              section === "bolsos"
            ) ||
            (
              wanted ===
              "ropa de gala" &&
              section === "gala"
            ) ||
            (
              wanted === "gala" &&
              section === "gala"
            ) ||
            (
              wanted ===
              "ropa casual" &&
              section === "casual"
            ) ||
            (
              wanted === "casual" &&
              section === "casual"
            ) ||
            (
              wanted === "ropa" &&
              (
                section === "ropa" ||
                section === "gala" ||
                section === "casual"
              )
            );

          if (!valid) {
            return false;
          }
        }
      }

      if (!q) {
        return true;
      }

      const variantText =
        getProductVariants(
          product.id
        )
        .flatMap(
          variant =>
            variant.options
              .map(
                option =>
                  `${option.name} ${option.value}`
              )
        )
        .join(" ");

      const searchable = [
        product.name,
        product.cat,
        product.desc,
        product.talla,
        product.color,
        product.modelo,
        product.genero,
        product.ml,
        product.tipo,
        product.intensidad,
        product.largo,
        product.tono,
        product.tamaño,
        product.presentacion,
        product.material,
        product.estilo,
        variantText
      ]
        .filter(Boolean)
        .join(" ");

      return normalize(
        searchable
      ).includes(q);
    });

  const sort =
    $("#sortSelect")
      ? $("#sortSelect").value
      : "";

  if (sort === "low") {

    list.sort(
      (a, b) =>
        (a.price ?? Infinity) -
        (b.price ?? Infinity)
    );
  }

  if (sort === "high") {

    list.sort(
      (a, b) =>
        (b.price ?? -Infinity) -
        (a.price ?? -Infinity)
    );
  }

  if ($("#resultText")) {

    $("#resultText")
      .textContent =
        `${list.length} producto${
          list.length !== 1
            ? "s"
            : ""
        }`;
  }

  if (!list.length) {

    grid.innerHTML = `
      <div
        style="
          grid-column:1/-1;
          text-align:center;
          padding:50px;
        "
      >
        No encontramos productos
        con esa búsqueda.
      </div>
    `;

    return;
  }

  grid.innerHTML =
    list.map(product => {

      const details =
        buildShortDetails(
          product
        );

      return `
        <article
          class="product-card"
        >

          ${
            product.offer
              ? '<span class="badge">OFERTA</span>'
              : ""
          }

          <div class="pic">

            <img
              src="${escapeHtml(
                product.img
              )}"
              alt="${escapeHtml(
                product.name
              )}"
              loading="lazy"
              class="product-image"
              data-product-image="${escapeHtml(
                product.id
              )}"
              title="Tocar para ampliar"
            >

          </div>

          <div class="product-info">

            <h3>
              ${escapeHtml(
                product.name
              )}
            </h3>

            <span class="category-tag">
              ${escapeHtml(
                product.cat
              )}
            </span>

            ${
              details
                ? `
                  <p
                    class="product-details"
                    style="
                      font-size:.85rem;
                      color:#666;
                      margin:4px 0;
                    "
                  >
                    ${details}
                  </p>
                `
                : ""
            }

            ${
              product.desc
                ? `
                  <p
                    class="description"
                    style="
                      font-size:.9rem;
                      color:#444;
                    "
                  >
                    ${escapeHtml(
                      product.desc
                    )}
                  </p>
                `
                : ""
            }

            <div>

              <span class="price">
                ${money(
                  product.price
                )}
              </span>

              ${
                product.old != null &&
                product.old > 0
                  ? `
                    <span class="old">
                      ${money(
                        product.old
                      )}
                    </span>
                  `
                  : ""
              }

            </div>

            <button
              class="add"
              type="button"
              onclick="addToCart('${String(
                product.id
              ).replaceAll(
                "'",
                "\\'"
              )}')"
              ${
                product.stock <= 0
                  ? "disabled"
                  : ""
              }
            >
              ${
                product.stock > 0
                  ? "🛒 Añadir al carrito"
                  : "Agotado"
              }
            </button>

          </div>

        </article>
      `;
    }).join("");
}

/* =========================================================
   VISOR DE PRODUCTO
========================================================= */

function createImageViewer() {

  if (
    document.getElementById(
      "mangueImageViewer"
    )
  ) {
    return;
  }

  const viewer =
    document.createElement(
      "div"
    );

  viewer.id =
    "mangueImageViewer";

  viewer.innerHTML = `

    <div
      class="mangue-image-overlay"
    >

      <div
        class="mangue-modal-card"
      >

        <button
          type="button"
          class="mangue-image-close"
          aria-label="Cerrar"
        >
          ×
        </button>

        <div
          class="mangue-modal-img-box"
        >

          <img
            class="mangue-image-large"
            src=""
            alt=""
          >

        </div>

        <div
          class="mangue-modal-details"
        >

          <span
            class="category-tag modal-cat"
          ></span>

          <h2
            class="modal-title"
          ></h2>

          <div
            class="modal-specs"
          ></div>

          <div
            class="modal-variants"
          ></div>

          <div
            class="modal-price-box"
          ></div>

          <p
            class="modal-desc"
          ></p>

          <div
            class="modal-action"
          ></div>

        </div>

      </div>

    </div>
  `;

  const style =
    document.createElement(
      "style"
    );

  style.textContent = `

    #mangueImageViewer {
      position:fixed;
      inset:0;
      z-index:99999;
      display:none;
    }

    #mangueImageViewer.open {
      display:block;
    }

    .mangue-image-overlay {
      position:absolute;
      inset:0;
      background:rgba(0,0,0,.84);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:15px;
      box-sizing:border-box;
    }

    .mangue-modal-card {
      position:relative;
      background:#fff;
      border-radius:14px;
      width:100%;
      max-width:900px;
      max-height:92vh;
      overflow-y:auto;
      display:grid;
      grid-template-columns:minmax(280px,1fr) minmax(300px,1fr);
      gap:22px;
      padding:24px;
      box-sizing:border-box;
      box-shadow:0 10px 50px rgba(0,0,0,.5);
    }

    .mangue-modal-img-box {
      display:flex;
      align-items:center;
      justify-content:center;
      background:#fafafa;
      border-radius:10px;
      min-height:280px;
      padding:15px;
    }

    .mangue-image-large {
      max-width:100%;
      max-height:430px;
      object-fit:contain;
      border-radius:8px;
    }

    .mangue-image-close {
      position:absolute;
      top:10px;
      right:10px;
      width:36px;
      height:36px;
      border:0;
      border-radius:50%;
      background:#eee;
      color:#111;
      font-size:24px;
      cursor:pointer;
      z-index:5;
    }

    .mangue-image-close:hover {
      background:#ddd;
    }

    .mangue-modal-details {
      min-width:0;
    }

    .modal-title {
      margin:8px 0;
      font-size:1.45rem;
      color:#111;
    }

    .modal-specs {
      margin:10px 0;
      padding:10px 12px;
      background:#f5f5f5;
      border-radius:8px;
      font-size:.92rem;
      color:#444;
    }

    .modal-variants {
      margin:15px 0;
    }

    .variants-title {
      font-weight:700;
      margin-bottom:8px;
      color:#111;
    }

    .variant-table-wrap {
      width:100%;
      overflow-x:auto;
      border:1px solid #e5e5e5;
      border-radius:8px;
    }

    .variant-table {
      width:100%;
      border-collapse:collapse;
      font-size:.86rem;
      min-width:300px;
    }

    .variant-table th,
    .variant-table td {
      padding:8px;
      border-bottom:1px solid #eee;
      text-align:left;
      white-space:nowrap;
    }

    .variant-table th {
      background:#f7f7f7;
      font-weight:700;
    }

    .variant-stock {
      font-weight:700;
    }

    .stock-ok {
      color:#16833b;
    }

    .stock-zero {
      color:#c62828;
    }

    .stock-total {
      margin-top:8px;
      font-size:.9rem;
      font-weight:700;
      color:#333;
    }

    .modal-price-box {
      margin:15px 0;
    }

    .modal-desc {
      font-size:.9rem;
      color:#555;
      line-height:1.45;
      margin-bottom:18px;
    }

    body.mangue-image-open {
      overflow:hidden;
    }

    @media(max-width:700px) {

      .mangue-modal-card {
        grid-template-columns:1fr;
        padding:18px;
        max-height:88vh;
      }

      .mangue-modal-img-box {
        min-height:200px;
      }

      .mangue-image-large {
        max-height:300px;
      }
    }
  `;

  document.head.appendChild(
    style
  );

  document.body.appendChild(
    viewer
  );

  const overlay =
    viewer.querySelector(
      ".mangue-image-overlay"
    );

  const closeButton =
    viewer.querySelector(
      ".mangue-image-close"
    );

  const card =
    viewer.querySelector(
      ".mangue-modal-card"
    );

  function closeViewer() {

    viewer.classList.remove(
      "open"
    );

    document.body.classList.remove(
      "mangue-image-open"
    );
  }

  closeButton.addEventListener(
    "click",
    closeViewer
  );

  overlay.addEventListener(
    "click",
    e => {

      if (
        e.target === overlay
      ) {
        closeViewer();
      }
    }
  );

  card.addEventListener(
    "click",
    e =>
      e.stopPropagation()
  );

  document.addEventListener(
    "keydown",
    e => {

      if (
        e.key === "Escape" &&
        viewer.classList.contains(
          "open"
        )
      ) {
        closeViewer();
      }
    }
  );

  window.mangueOpenProduct =
    function(product) {

      if (!product) return;

      viewer.querySelector(
        ".mangue-image-large"
      ).src =
        product.img;

      viewer.querySelector(
        ".mangue-image-large"
      ).alt =
        product.name;

      viewer.querySelector(
        ".modal-cat"
      ).textContent =
        product.cat;

      viewer.querySelector(
        ".modal-title"
      ).textContent =
        product.name;

      /* -------------------------------------
         DETALLES PRINCIPALES
      ------------------------------------- */

      const mainDetails =
        getProductMainDetails(
          product
        );

      const mainDetailsHtml =
        mainDetails
          .map(
            item => `
              <div
                style="
                  margin:4px 0;
                "
              >
                <b>
                  ${escapeHtml(
                    item.label
                  )}:
                </b>
                ${escapeHtml(
                  item.value
                )}
              </div>
            `
          )
          .join("");

      viewer.querySelector(
        ".modal-specs"
      ).innerHTML =
        mainDetailsHtml ||
        "Sin especificaciones adicionales";

      /* -------------------------------------
         TODAS LAS VARIANTES
      ------------------------------------- */

      const productVariants =
        getProductVariants(
          product.id
        );

      const variantsBox =
        viewer.querySelector(
          ".modal-variants"
        );

      if (
        productVariants.length
      ) {

        const allLabels = [];

        productVariants.forEach(
          variant => {

            buildVariantDetails(
              variant,
              product
            ).forEach(
              detail => {

                if (
                  !allLabels.includes(
                    detail.label
                  )
                ) {
                  allLabels.push(
                    detail.label
                  );
                }
              }
            );
          }
        );

        const tableRows =
          productVariants
            .map(
              variant => {

                const details =
                  buildVariantDetails(
                    variant,
                    product
                  );

                const cells =
                  allLabels
                    .map(label => {

                      const found =
                        details.find(
                          detail =>
                            normalize(
                              detail.label
                            ) ===
                            normalize(
                              label
                            )
                        );

                      return `
                        <td>
                          ${
                            found
                              ? escapeHtml(
                                  found.value
                                )
                              : "—"
                          }
                        </td>
                      `;
                    })
                    .join("");

                const stock =
                  Number(
                    variant.stock || 0
                  );

                return `
                  <tr>

                    ${cells}

                    <td
                      class="
                        variant-stock
                        ${
                          stock > 0
                            ? "stock-ok"
                            : "stock-zero"
                        }
                      "
                    >
                      ${stock}
                    </td>

                  </tr>
                `;
              }
            )
            .join("");

        const headers =
          allLabels
            .map(
              label =>
                `<th>${escapeHtml(
                  label
                )}</th>`
            )
            .join("");

        const totalStock =
          productVariants.reduce(
            (
              total,
              variant
            ) =>
              total +
              Number(
                variant.stock || 0
              ),
            0
          );

        variantsBox.innerHTML = `

          <div
            class="variants-title"
          >
            Todas las variantes disponibles
          </div>

          <div
            class="variant-table-wrap"
          >

            <table
              class="variant-table"
            >

              <thead>

                <tr>

                  ${headers}

                  <th>
                    Stock
                  </th>

                </tr>

              </thead>

              <tbody>

                ${tableRows}

              </tbody>

            </table>

          </div>

          <div
            class="stock-total"
          >
            Stock total:
            ${totalStock}
            unidades
          </div>
        `;

      } else {

        /*
          Si el producto no tiene variantes,
          mostramos el stock principal.
        */

        const stock =
          Number(
            product.stock || 0
          );

        variantsBox.innerHTML = `

          <div
            class="variants-title"
          >
            Disponibilidad
          </div>

          <div
            style="
              padding:10px 12px;
              background:#f5f5f5;
              border-radius:8px;
            "
          >

            <span>
              Stock disponible:
            </span>

            <strong
              class="
                ${
                  stock > 0
                    ? "stock-ok"
                    : "stock-zero"
                }
              "
            >
              ${stock}
              unidades
            </strong>

          </div>
        `;
      }

      /* -------------------------------------
         PRECIO
      ------------------------------------- */

      viewer.querySelector(
        ".modal-price-box"
      ).innerHTML = `

        <span
          style="
            font-size:1.3rem;
            font-weight:bold;
            color:#111;
          "
        >
          ${money(
            product.price
          )}
        </span>

        ${
          product.old != null &&
          product.old > 0
            ? `
              <span
                style="
                  text-decoration:line-through;
                  color:#888;
                  margin-left:8px;
                "
              >
                ${money(
                  product.old
                )}
              </span>
            `
            : ""
        }
      `;

      /* -------------------------------------
         DESCRIPCIÓN
      ------------------------------------- */

      viewer.querySelector(
        ".modal-desc"
      ).textContent =
        product.desc ||
        "Sin descripción disponible.";

      /* -------------------------------------
         BOTÓN
      ------------------------------------- */

      viewer.querySelector(
        ".modal-action"
      ).innerHTML = `

        <button
          class="add"
          type="button"
          style="
            width:100%;
            padding:12px;
            font-size:1rem;
            cursor:pointer;
          "
          id="modalAddToCart"
          ${
            product.stock <= 0 &&
            productVariants.length === 0
              ? "disabled"
              : ""
          }
        >
          ${
            product.stock > 0 ||
            productVariants.some(
              variant =>
                Number(
                  variant.stock || 0
                ) > 0
            )
              ? "🛒 Añadir al carrito"
              : "Agotado"
          }
        </button>
      `;

      const button =
        viewer.querySelector(
          "#modalAddToCart"
        );

      if (button) {

        const hasStock =
          product.stock > 0 ||
          productVariants.some(
            variant =>
              Number(
                variant.stock || 0
              ) > 0
          );

        if (hasStock) {

          button.addEventListener(
            "click",
            () => {

              addToCart(
                product.id
              );

              closeViewer();
            }
          );
        }
      }

      viewer.classList.add(
        "open"
      );

      document.body.classList.add(
        "mangue-image-open"
      );
    };
}

/* =========================================================
   CARRITO
========================================================= */

function saveCart() {

  localStorage.setItem(
    "mangue_cart",
    JSON.stringify(cart)
  );

  updateCart();
}

function addToCart(id) {

  const product =
    products.find(
      p =>
        String(p.id) ===
        String(id)
    );

  if (!product) {

    alert(
      "Producto no disponible."
    );

    return;
  }

  const productVariants =
    getProductVariants(
      product.id
    );

  const availableStock =
    productVariants.length
      ? productVariants.reduce(
          (
            total,
            variant
          ) =>
            total +
            Number(
              variant.stock || 0
            ),
          0
        )
      : Number(
          product.stock || 0
        );

  if (
    availableStock <= 0
  ) {

    alert(
      "Este producto no está disponible actualmente."
    );

    return;
  }

  const item =
    cart.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (item) {

    if (
      item.qty >=
      availableStock
    ) {

      alert(
        "No hay más unidades disponibles."
      );

      return;
    }

    item.qty++;

  } else {

    cart.push({
      id: product.id,
      qty: 1
    });
  }

  saveCart();

  openCart();
}

/* =========================================================
   ACTUALIZAR CARRITO
========================================================= */

function updateCart() {

  const cartItems =
    $("#cartItems") ||
    $("#cartList") ||
    $(".cart-items");

  const cartCount =
    $("#cartCount") ||
    $(".cart-count");

  const cartTotal =
    $("#cartTotal") ||
    $(".cart-total");

  let totalItems = 0;
  let totalPrice = 0;

  cart =
    cart.filter(item => {

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(item.id)
        );

      if (!product) {
        return false;
      }

      item.qty =
        Math.max(
          1,
          Number(
            item.qty
          ) || 1
        );

      totalItems +=
        item.qty;

      if (
        product.price != null
      ) {

        totalPrice +=
          product.price *
          item.qty;
      }

      return true;
    });

  if (cartCount) {
    cartCount.textContent =
      totalItems;
  }

  if (cartTotal) {
    cartTotal.textContent =
      money(totalPrice);
  }

  if (!cartItems) {
    return;
  }

  if (!cart.length) {

    cartItems.innerHTML = `
      <div
        style="
          text-align:center;
          padding:25px 10px;
          color:#777;
        "
      >
        Tu carrito está vacío.
      </div>
    `;

    return;
  }

  cartItems.innerHTML =
    cart.map(item => {

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(item.id)
        );

      if (!product) {
        return "";
      }

      const subtotal =
        product.price == null
          ? "Consultar precio"
          : money(
              product.price *
              item.qty
            );

      return `

        <div
          class="cart-item"
          style="
            display:flex;
            gap:10px;
            align-items:center;
            margin-bottom:15px;
          "
        >

          <img
            src="${escapeHtml(
              product.img
            )}"
            alt="${escapeHtml(
              product.name
            )}"
            style="
              width:65px;
              height:65px;
              object-fit:cover;
              border-radius:8px;
            "
          >

          <div
            style="flex:1;"
          >

            <strong>
              ${escapeHtml(
                product.name
              )}
            </strong>

            <div
              style="
                font-size:.85rem;
                color:#777;
                margin:3px 0;
              "
            >
              ${subtotal}
            </div>

            <div
              style="
                display:flex;
                align-items:center;
                gap:8px;
              "
            >

              <button
                type="button"
                onclick="changeQty('${String(
                  product.id
                ).replaceAll(
                  "'",
                  "\\'"
                )}', -1)"
              >
                −
              </button>

              <span>
                ${item.qty}
              </span>

              <button
                type="button"
                onclick="changeQty('${String(
                  product.id
                ).replaceAll(
                  "'",
                  "\\'"
                )}', 1)"
              >
                +
              </button>

            </div>

          </div>

        </div>
      `;
    }).join("");
}

/* =========================================================
   CAMBIAR CANTIDAD
========================================================= */

function changeQty(
  id,
  amount
) {

  const item =
    cart.find(
      x =>
        String(x.id) ===
        String(id)
    );

  if (!item) {
    return;
  }

  const product =
    products.find(
      p =>
        String(p.id) ===
        String(id)
    );

  if (!product) {

    cart =
      cart.filter(
        x =>
          String(x.id) !==
          String(id)
      );

    saveCart();

    return;
  }

  const productVariants =
    getProductVariants(
      product.id
    );

  const availableStock =
    productVariants.length
      ? productVariants.reduce(
          (
            total,
            variant
          ) =>
            total +
            Number(
              variant.stock || 0
            ),
          0
        )
      : Number(
          product.stock || 0
        );

  if (
    amount > 0 &&
    item.qty >=
      availableStock
  ) {

    alert(
      "No hay más unidades disponibles."
    );

    return;
  }

  item.qty +=
    amount;

  if (
    item.qty <= 0
  ) {

    cart =
      cart.filter(
        x =>
          String(x.id) !==
          String(id)
      );
  }

  saveCart();
}

/* =========================================================
   ABRIR / CERRAR CARRITO
========================================================= */

function openCart() {

  if ($("#cartDrawer")) {

    $("#cartDrawer")
      .classList.add(
        "open"
      );
  }

  if ($("#drawerBackdrop")) {

    $("#drawerBackdrop")
      .classList.add(
        "open"
      );
  }
}

function closeCart() {

  if ($("#cartDrawer")) {

    $("#cartDrawer")
      .classList.remove(
        "open"
      );
  }

  if ($("#drawerBackdrop")) {

    $("#drawerBackdrop")
      .classList.remove(
        "open"
      );
  }
}

/* =========================================================
   FILTROS
========================================================= */

function setFilter(
  filter
) {

  currentFilter =
    filter || "all";

  document
    .querySelectorAll(
      ".nav a"
    )
    .forEach(
      a => {

        a.classList.toggle(
          "active",
          a.dataset.filter ===
            currentFilter ||
          (
            !a.dataset.filter &&
            currentFilter ===
              "all"
          )
        );
      }
    );

  renderProducts();

  const catalog =
    $("#catalogo");

  if (catalog) {

    catalog.scrollIntoView({
      behavior:
        "smooth"
    });
  }
}

/* =========================================================
   AÑADIR NUEVOS FILTROS AL MENÚ
========================================================= */

function addNewCategoryFilters() {

  const nav =
    document.querySelector(
      ".nav"
    );

  if (!nav) {
    return;
  }

  const existing =
    Array.from(
      nav.querySelectorAll(
        "[data-filter]"
      )
    )
    .map(
      el =>
        normalize(
          el.dataset.filter
        )
    );

  const newFilters = [
    {
      filter:
        "Bolsos y accesorios",
      text:
        "Bolsos y accesorios"
    },
    {
      filter:
        "Ropa de Gala",
      text:
        "Ropa de Gala"
    },
    {
      filter:
        "Ropa Casual",
      text:
        "Ropa Casual"
    }
  ];

  newFilters.forEach(
    item => {

      if (
        existing.includes(
          normalize(
            item.filter
          )
        )
      ) {
        return;
      }

      const link =
        document.createElement(
          "a"
        );

      link.href =
        "#catalogo";

      link.textContent =
        item.text;

      link.dataset.filter =
        item.filter;

      link.addEventListener(
        "click",
        e => {

          e.preventDefault();

          setFilter(
            item.filter
          );
        }
      );

      nav.appendChild(
        link
      );
    }
  );
}

/* =========================================================
   CHECKOUT
========================================================= */

function openCheckout() {

  if (!cart.length) {

    alert(
      "Tu carrito está vacío."
    );

    return;
  }

  closeCart();

  if (
    $("#checkoutModal")
  ) {

    $("#checkoutModal")
      .classList.add(
        "open"
      );
  }
}

function closeCheckout() {

  if (
    $("#checkoutModal")
  ) {

    $("#checkoutModal")
      .classList.remove(
        "open"
      );
  }
}

/* =========================================================
   PEDIDO WHATSAPP
========================================================= */

function submitOrder(e) {

  e.preventDefault();

  if (!cart.length) {

    alert(
      "Tu carrito está vacío."
    );

    return;
  }

  const name =
    $("#customerName")
      ? $("#customerName")
          .value
          .trim()
      : "";

  const phone =
    $("#customerPhone")
      ? $("#customerPhone")
          .value
          .trim()
      : "";

  const address =
    $("#customerAddress")
      ? $("#customerAddress")
          .value
          .trim()
      : "";

  const delivery =
    $("#deliveryMethod")
      ? $("#deliveryMethod")
          .value
      : "";

  const notes =
    $("#customerNotes")
      ? $("#customerNotes")
          .value
          .trim()
      : "";

  if (
    !name ||
    !phone ||
    !address
  ) {

    alert(
      "Completa nombre, teléfono y dirección."
    );

    return;
  }

  const lines =
    cart.map(item => {

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(item.id)
        );

      if (!product) {
        return "";
      }

      const details =
        getProductMainDetails(
          product
        );

      const specs =
        details
          .map(
            detail =>
              `${detail.label}: ${detail.value}`
          )
          .join(", ");

      const specText =
        specs
          ? ` (${specs})`
          : "";

      return `
• ${product.name}${specText}
  Cantidad: ${item.qty}
  Precio: ${
    product.price == null
      ? "Consultar precio"
      : money(
          product.price *
          item.qty
        )
  }`;
    })
    .filter(Boolean)
    .join("\n");

  const total =
    cart.reduce(
      (
        sum,
        item
      ) => {

        const product =
          products.find(
            p =>
              String(p.id) ===
              String(item.id)
          );

        if (
          !product ||
          product.price == null
        ) {
          return sum;
        }

        return (
          sum +
          product.price *
          item.qty
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
Observaciones: ${
  notes || "Ninguna"
}

Por favor, confirmen disponibilidad y forma de pago.`;

  window.open(
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
      message
    )}`,
    "_blank"
  );
}

/* =========================================================
   EVENTOS
========================================================= */

document
  .querySelectorAll(
    "[data-filter]"
  )
  .forEach(
    element => {

      element.addEventListener(
        "click",
        e => {

          e.preventDefault();

          setFilter(
            element.dataset.filter
          );
        }
      );
    }
  );

if ($("#searchInput")) {

  $("#searchInput")
    .addEventListener(
      "input",
      renderProducts
    );
}

if ($("#searchBtn")) {

  $("#searchBtn")
    .addEventListener(
      "click",
      () => {

        setFilter(
          "all"
        );

        const catalog =
          $("#catalogo");

        if (catalog) {

          catalog.scrollIntoView({
            behavior:
              "smooth"
          });
        }
      }
    );
}

if ($("#sortSelect")) {

  $("#sortSelect")
    .addEventListener(
      "change",
      renderProducts
    );
}

if ($("#cartBtn")) {

  $("#cartBtn")
    .addEventListener(
      "click",
      openCart
    );
}

if ($("#closeCart")) {

  $("#closeCart")
    .addEventListener(
      "click",
      closeCart
    );
}

if ($("#drawerBackdrop")) {

  $("#drawerBackdrop")
    .addEventListener(
      "click",
      closeCart
    );
}

if ($("#checkoutBtn")) {

  $("#checkoutBtn")
    .addEventListener(
      "click",
      openCheckout
    );
}

if ($("#closeCheckout")) {

  $("#closeCheckout")
    .addEventListener(
      "click",
      closeCheckout
    );
}

if ($("#checkoutForm")) {

  $("#checkoutForm")
    .addEventListener(
      "submit",
      submitOrder
    );
}

if ($("#checkoutModal")) {

  $("#checkoutModal")
    .addEventListener(
      "click",
      e => {

        if (
          e.target.id ===
          "checkoutModal"
        ) {

          closeCheckout();
        }
      }
    );
}

if ($("#accountBtn")) {

  $("#accountBtn")
    .addEventListener(
      "click",
      () => {

        if (
          $("#accountModal")
        ) {

          $("#accountModal")
            .classList.add(
              "open"
            );
        }
      }
    );
}

if ($("#closeAccount")) {

  $("#closeAccount")
    .addEventListener(
      "click",
      () => {

        if (
          $("#accountModal")
        ) {

          $("#accountModal")
            .classList.remove(
              "open"
            );
        }
      }
    );
}

if ($("#accountModal")) {

  $("#accountModal")
    .addEventListener(
      "click",
      e => {

        if (
          e.target.id ===
          "accountModal"
        ) {

          e.currentTarget
            .classList
            .remove(
              "open"
            );
        }
      }
    );
}

/* =========================================================
   HERO
========================================================= */

if ($("#heroPrev")) {

  $("#heroPrev").onclick =
    () =>
      window.scrollBy({
        top: -450,
        behavior:
          "smooth"
      });
}

if ($("#heroNext")) {

  $("#heroNext").onclick =
    () =>
      window.scrollBy({
        top: 450,
        behavior:
          "smooth"
      });
}

/* =========================================================
   VISOR: CLIC EN IMAGEN
========================================================= */

createImageViewer();

if (grid) {

  grid.addEventListener(
    "click",
    e => {

      const image =
        e.target.closest(
          ".product-image"
        );

      if (!image) {
        return;
      }

      e.preventDefault();

      const productId =
        image.dataset
          .productImage;

      const product =
        products.find(
          p =>
            String(p.id) ===
            String(productId)
        );

      if (!product) {
        return;
      }

      if (
        typeof window
          .mangueOpenProduct ===
        "function"
      ) {

        window
          .mangueOpenProduct(
            product
          );
      }
    }
  );
}

/* =========================================================
   INICIAR
========================================================= */

addNewCategoryFilters();
/* =========================================================
   SISTEMA DE CARRITO Y PEDIDOS POR WHATSAPP
========================================================= */

let cart = JSON.parse(localStorage.getItem('mangue_cart')) || [];
const WHATSAPP_PHONE = "240XXXXXXXXX"; // <-- Cambia esto por tu número de Guinea Ecuatorial

window.addToCart = function(product, selectedOptions = {}) {
  const item = {
    id: product.id,
    name: product.name,
    price: Number(product.price || 0),
    options: selectedOptions,
    quantity: 1
  };
  
  cart.push(item);
  localStorage.setItem('mangue_cart', JSON.stringify(cart));
  alert(`"${product.name}" añadido al carrito.`);
};

window.sendOrderToWhatsApp = function() {
  if (cart.length === 0) {
    alert("El carrito está vacío.");
    return;
  }

  let text = "¡Hola *Mangue Life Style*! Deseo realizar el siguiente pedido:\n\n";
  let total = 0;

  cart.forEach((item, index) => {
    const subtotal = item.price * item.quantity;
    total += subtotal;

    const optionsText = Object.entries(item.options || {})
      .map(([key, val]) => `${key}: ${val}`)
      .join(', ');

    text += `*${index + 1}. ${item.name}*\n`;
    if (optionsText) text += `   Opciones: ${optionsText}\n`;
    text += `   Cantidad: ${item.quantity}\n`;
    text += `   Precio: ${subtotal} FCFA\n\n`;
  });

  text += `*TOTAL DEL PEDIDO: ${total} FCFA*`;

  const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');
};
loadProducts();
