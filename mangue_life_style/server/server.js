import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "mangue.db"));

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

db.exec(`
CREATE TABLE IF NOT EXISTS admins(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  old_price INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  image TEXT,
  description TEXT,
  offer INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  delivery TEXT,
  notes TEXT,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'nuevo',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);
`);

if (!db.prepare("SELECT id FROM admins LIMIT 1").get()) {
  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASSWORD || "CAMBIA_ESTA_CONTRASENA";
  const hash = bcrypt.hashSync(pass, 12);
  db.prepare("INSERT INTO admins(username,password_hash) VALUES(?,?)").run(user, hash);
}

function auth(req,res,next){
  const token=(req.headers.authorization||"").replace(/^Bearer\s+/,"");
  try {
    const payload=jwt.verify(token, process.env.JWT_SECRET);
    req.admin=payload; next();
  } catch { res.status(401).json({error:"No autorizado"}); }
}

app.get("/api/health",(req,res)=>res.json({ok:true,service:"Mangue Life Style"}));

app.post("/api/auth/login",(req,res)=>{
  const {username,password}=req.body||{};
  const admin=db.prepare("SELECT * FROM admins WHERE username=?").get(username);
  if(!admin || !bcrypt.compareSync(password||"",admin.password_hash))
    return res.status(401).json({error:"Usuario o contraseña incorrectos"});
  const secret=process.env.JWT_SECRET;
  if(!secret || secret.includes("CAMBIA_")) return res.status(500).json({error:"Configura JWT_SECRET en .env"});
  const token=jwt.sign({id:admin.id,username:admin.username},secret,{expiresIn:"8h"});
  res.json({token});
});

app.get("/api/products",(req,res)=>{
  res.json(db.prepare("SELECT * FROM products ORDER BY id DESC").all());
});

app.post("/api/products",auth,(req,res)=>{
  const p=req.body;
  if(!p.name || !p.category || !Number.isInteger(Number(p.price)))
    return res.status(400).json({error:"Nombre, categoría y precio son obligatorios"});
  const r=db.prepare(`INSERT INTO products(name,category,price,old_price,stock,image,description,offer)
  VALUES(?,?,?,?,?,?,?,?)`).run(p.name,p.category,Number(p.price),Number(p.old_price||0),Number(p.stock||0),p.image||"",p.description||"",p.offer?1:0);
  res.status(201).json({id:r.lastInsertRowid});
});

app.put("/api/products/:id",auth,(req,res)=>{
  const p=req.body;
  const r=db.prepare(`UPDATE products SET name=?,category=?,price=?,old_price=?,stock=?,image=?,description=?,offer=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(p.name,p.category,Number(p.price),Number(p.old_price||0),Number(p.stock||0),p.image||"",p.description||"",p.offer?1:0,req.params.id);
  res.json({updated:r.changes});
});

app.delete("/api/products/:id",auth,(req,res)=>{
  res.json({deleted:db.prepare("DELETE FROM products WHERE id=?").run(req.params.id).changes});
});

app.post("/api/orders",(req,res)=>{
  const {customer_name,phone,address,delivery,notes,items}=req.body||{};
  if(!customer_name||!phone||!address||!Array.isArray(items)||!items.length)
    return res.status(400).json({error:"Datos del pedido incompletos"});
  const get=db.prepare("SELECT id,name,price,stock FROM products WHERE id=?");
  let total=0, checked=[];
  for(const item of items){
    const p=get.get(item.product_id);
    const q=Number(item.quantity);
    if(!p || !Number.isInteger(q) || q<1 || p.stock<q)
      return res.status(400).json({error:`Producto sin stock suficiente: ${p?.name||item.product_id}`});
    total += p.price*q; checked.push({p,q});
  }
  const tx=db.transaction(()=>{
    const order=db.prepare(`INSERT INTO orders(customer_name,phone,address,delivery,notes,total) VALUES(?,?,?,?,?,?)`)
      .run(customer_name,phone,address,delivery||"",notes||"",total);
    const add=db.prepare("INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES(?,?,?,?)");
    const dec=db.prepare("UPDATE products SET stock=stock-? WHERE id=?");
    for(const x of checked){add.run(order.lastInsertRowid,x.p.id,x.q,x.p.price);dec.run(x.q,x.p.id)}
    return order.lastInsertRowid;
  });
  res.status(201).json({order_id:tx,total});
});

app.get("/api/orders",auth,(req,res)=>{
  const orders=db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
  res.json(orders);
});

app.patch("/api/orders/:id/status",auth,(req,res)=>{
  const allowed=["nuevo","confirmado","preparando","enviado","entregado","cancelado"];
  if(!allowed.includes(req.body.status)) return res.status(400).json({error:"Estado inválido"});
  res.json({updated:db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status,req.params.id).changes});
});

app.listen(Number(process.env.PORT||3000),()=>console.log(`Mangue Life Style API: http://localhost:${process.env.PORT||3000}`));
