import express from "express";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();
const app=express();
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PORT=process.env.PORT||3000;
const SECRET=process.env.JWT_SECRET||"GotiTech_Node24_Secret_Change_Me";
const DATA_DIR=path.join(__dirname,"data");
const DB_FILE=path.join(DATA_DIR,"gotitech.json");
fs.mkdirSync(DATA_DIR,{recursive:true});

const products=[
{id:1,name:"S10 MAX Smart Watch",category:"Smart Watch",price:700,oldPrice:990,stock:20,badge:"30% OFF"},
{id:2,name:"BW9 Pro Global",category:"Smart Watch",price:1050,oldPrice:1450,stock:15,badge:"NEW"},
{id:3,name:"T900 Ultra",category:"Smart Watch",price:850,oldPrice:1200,stock:25,badge:"HOT DEAL"},
{id:4,name:"AirBass Pro Earbuds",category:"Audio",price:850,oldPrice:1200,stock:30,badge:"TRENDING"},
{id:5,name:"Power Mini 10000mAh",category:"Accessories",price:990,oldPrice:1300,stock:18,badge:"POPULAR"},
{id:6,name:"Flex Mini Speaker",category:"Audio",price:650,oldPrice:850,stock:22,badge:"LIMITED"}
];

function seed(){
 const adminPass=bcrypt.hashSync(process.env.ADMIN_PASSWORD||"rafin1730####",10);
 return {nextUserId:2,nextOrderNumber:1001,users:[{id:1,name:"GotiTech Admin",phone:"01849194982",password_hash:adminPass,role:"admin"}],products,orders:[]};
}
function readDB(){
 if(!fs.existsSync(DB_FILE)){const d=seed();fs.writeFileSync(DB_FILE,JSON.stringify(d,null,2));return d;}
 try{return JSON.parse(fs.readFileSync(DB_FILE,"utf8"));}catch{const d=seed();fs.writeFileSync(DB_FILE,JSON.stringify(d,null,2));return d;}
}
function saveDB(d){fs.writeFileSync(DB_FILE,JSON.stringify(d,null,2));}
function makeToken(u){return jwt.sign({id:u.id,name:u.name,role:u.role},SECRET,{expiresIn:"7d"});}
function auth(req,res,next){try{req.user=jwt.verify((req.headers.authorization||"").replace("Bearer ",""),SECRET);next();}catch{res.status(401).json({message:"Please sign in first"});}}
function adminOnly(req,res,next){if(req.user.role==="admin")return next();res.status(403).json({message:"Admin access only"});}

app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

app.get("/api/products",(req,res)=>res.json(readDB().products));
app.post("/api/signup",async(req,res)=>{
 const {name,phone,password}=req.body;
 if(!name||!phone||!password||password.length<6)return res.status(400).json({message:"Fill all fields. Password must be 6+ characters."});
 const d=readDB();
 if(d.users.some(u=>u.phone===phone))return res.status(400).json({message:"This phone already has an account."});
 const u={id:d.nextUserId++,name,phone,password_hash:await bcrypt.hash(password,10),role:"customer"};
 d.users.push(u);saveDB(d);res.json({token:makeToken(u),user:{id:u.id,name:u.name,phone:u.phone,role:u.role}});
});
async function login(role,req,res){
 const d=readDB(),{phone,password}=req.body;
 const u=d.users.find(x=>x.phone===phone&&x.role===role);
 if(!u||!await bcrypt.compare(password||"",u.password_hash))return res.status(401).json({message:"Wrong phone number or password."});
 res.json({token:makeToken(u),user:{id:u.id,name:u.name,phone:u.phone,role:u.role}});
}
app.post("/api/customer-login",(req,res)=>login("customer",req,res));
app.post("/api/admin-login",(req,res)=>login("admin",req,res));

app.post("/api/orders",(req,res)=>{
 const {customer_name,phone,district,address,items,user_id=null}=req.body;
 if(!customer_name||!phone||!district||!address||!Array.isArray(items)||!items.length)return res.status(400).json({message:"Please complete all order information."});
 const d=readDB();let total=0;
 const clean=items.map(i=>{const p=d.products.find(x=>x.id===i.id);if(!p)throw new Error("Product not found");const qty=Math.max(1,+i.qty||1);if(p.stock<qty)throw new Error(`${p.name} has insufficient stock`);p.stock-=qty;total+=p.price*qty;return {id:p.id,name:p.name,price:p.price,qty};});
 const order={id:"GT-"+d.nextOrderNumber++,customer_name,phone,district,address,user_id,items:clean,total,status:"Pending",created_at:new Date().toISOString()};
 d.orders.push(order);saveDB(d);res.json({message:"Order placed successfully",orderId:order.id});
});
app.get("/api/orders/track",(req,res)=>{
 const {orderId,phone}=req.query;const o=readDB().orders.find(x=>x.id===orderId&&x.phone===phone);
 if(!o)return res.status(404).json({message:"Order not found."});res.json(o);
});
app.get("/api/my-orders",auth,(req,res)=>res.json(readDB().orders.filter(o=>String(o.user_id)===String(req.user.id)).reverse()));

app.get("/api/admin/stats",auth,adminOnly,(req,res)=>{
 const d=readDB(),del=d.orders.filter(o=>o.status==="Delivered");
 res.json({customers:d.users.filter(u=>u.role==="customer").length,orders:d.orders.length,products:d.products.length,sales:del.reduce((a,o)=>a+o.total,0)});
});
app.get("/api/admin/orders",auth,adminOnly,(req,res)=>res.json(readDB().orders.slice().reverse()));
app.patch("/api/admin/orders/:id",auth,adminOnly,(req,res)=>{
 const d=readDB(),o=d.orders.find(x=>x.id===req.params.id);
 if(!o)return res.status(404).json({message:"Order not found"});o.status=req.body.status||o.status;saveDB(d);res.json({message:"Updated"});
});
app.get("/api/admin/users",auth,adminOnly,(req,res)=>res.json(readDB().users.filter(u=>u.role==="customer").map(({password_hash,...u})=>u)));


app.post("/api/admin/change-password",auth,adminOnly,async(req,res)=>{
 const {currentPassword,newPassword}=req.body;
 if(!currentPassword||!newPassword||newPassword.length<6)
   return res.status(400).json({message:"New password must be at least 6 characters."});
 const d=readDB();
 const u=d.users.find(x=>x.id===req.user.id&&x.role==="admin");
 if(!u||!await bcrypt.compare(currentPassword,u.password_hash))
   return res.status(401).json({message:"Current password is incorrect."});
 u.password_hash=await bcrypt.hash(newPassword,10);
 saveDB(d);
 res.json({message:"Admin password changed successfully."});
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`GotiTech running: http://localhost:${PORT}`));
