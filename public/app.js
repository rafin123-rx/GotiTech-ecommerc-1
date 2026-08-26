const $=x=>document.getElementById(x);let cart=JSON.parse(localStorage.getItem("gtcart")||"[]"),token=localStorage.getItem("gttoken")||"",user=JSON.parse(localStorage.getItem("gtuser")||"null"),products=[];
async function api(u,o={}){o.headers={"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})};let r=await fetch(u,o),d=await r.json();if(!r.ok)throw Error(d.message);return d}
function toast(m){$("toast").textContent=m;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2500)}
function show(id){["home","shop","cart","checkout","track","account","dashboard","changePassword"].forEach(x=>$(x).hidden=x!==id);if(id==="shop")render();if(id==="cart")cartView();if(id==="account")account();if(id==="dashboard")dash();scrollTo(0,0)}
function save(){localStorage.setItem("gtcart",JSON.stringify(cart));$("count").textContent=cart.reduce((a,x)=>a+x.qty,0)}
function icon(p){return p.category==="Audio"?"🎧":p.category==="Accessories"?"🔋":"⌚"}
function card(p){return `<div class="card"><div class="pic">${icon(p)}</div><span class="badge">${p.badge}</span><h3>${p.name}</h3><b>৳${p.price}</b> <span class="old">৳${p.oldPrice}</span><p>${p.stock} in stock</p><button class="primary" onclick="add(${p.id})">Add to Cart</button></div>`}
async function load(){products=await api("/api/products");$("featured").innerHTML=products.slice(0,3).map(card).join("");render();save()}
function render(){$("shopGrid").innerHTML=products.map(card).join("")}
function add(id){let p=products.find(x=>x.id===id),x=cart.find(x=>x.id===id);if(x)x.qty++;else cart.push({...p,qty:1});save();toast("Added to cart ✓")}
function cartView(){$("cartBox").innerHTML=cart.length?cart.map(x=>`<div class="item"><b>${x.name}</b> — ৳${x.price*x.qty}<div class="qty"><button onclick="qty(${x.id},-1)">−</button>${x.qty}<button onclick="qty(${x.id},1)">+</button></div></div>`).join(""):"<p>Your cart is empty.</p>"}
function qty(id,n){let x=cart.find(x=>x.id===id);x.qty+=n;if(x.qty<1)cart=cart.filter(x=>x.id!==id);save();cartView()}
async function order(){try{let d=await api("/api/orders",{method:"POST",body:JSON.stringify({customer_name:$("oname").value,phone:$("ophone").value,district:$("odistrict").value,address:$("oaddress").value,items:cart,user_id:user?.id||null})});cart=[];save();$("tid").value=d.orderId;$("tphone").value=$("ophone").value;toast("Order placed!");show("track")}catch(e){toast(e.message)}}
async function track(){try{let o=await api(`/api/orders/track?orderId=${$("tid").value}&phone=${$("tphone").value}`);$("trackResult").innerHTML=`<div class="item"><b>${o.id}</b><p>Status: <b>${o.status}</b></p><p>Total: ৳${o.total}</p></div>`}catch(e){toast(e.message)}}
function tab(x){["login","signup","admin"].forEach(y=>$(y).hidden=y!==x)}
function toggle(id){let x=$(id);x.type=x.type==="password"?"text":"password"}
function setAuth(d){token=d.token;user=d.user;localStorage.setItem("gttoken",token);localStorage.setItem("gtuser",JSON.stringify(user))}
async function signup(){try{let d=await api("/api/signup",{method:"POST",body:JSON.stringify({name:$("sname").value,phone:$("sphone").value,password:$("spass").value})});setAuth(d);toast("Account created ✓");account()}catch(e){toast(e.message)}}
async function customerLogin(){try{let d=await api("/api/customer-login",{method:"POST",body:JSON.stringify({phone:$("lphone").value,password:$("lpass").value})});setAuth(d);toast("Sign in successful ✓");account()}catch(e){toast(e.message)}}
async function adminLogin(){try{let d=await api("/api/admin-login",{method:"POST",body:JSON.stringify({phone:$("aphone").value,password:$("apass").value})});setAuth(d);show("dashboard")}catch(e){toast(e.message)}}
async function account(){if(!user||user.role==="admin"){$("auth").hidden=false;$("profile").hidden=true;return}$("auth").hidden=true;$("profile").hidden=false;try{let orders=await api("/api/my-orders");$("profile").innerHTML=`<h2>Welcome, ${user.name} 👋</h2><p>${user.phone}</p><h3>My Orders</h3>${orders.length?orders.map(o=>`<div class="item"><b>${o.id}</b> — ${o.status}<br>৳${o.total}</div>`).join(""):"No orders yet."}<button class="primary" onclick="logout()">Sign Out</button>`}catch(e){toast(e.message)}}
function logout(){token="";user=null;localStorage.removeItem("gttoken");localStorage.removeItem("gtuser");toast("Signed out");account()}
async function dash(){if(user?.role!=="admin"){show("account");return}try{let [s,o]=await Promise.all([api("/api/admin/stats"),api("/api/admin/orders")]);$("stats").innerHTML=`<div class="stat">Customers<br><b>${s.customers}</b></div><div class="stat">Orders<br><b>${s.orders}</b></div><div class="stat">Products<br><b>${s.products}</b></div><div class="stat">Sales<br><b>৳${s.sales}</b></div>`;$("orders").innerHTML=o.map(x=>`<div class="item"><b>${x.id}</b> — ${x.customer_name} — ${x.status}<br>৳${x.total}</div>`).join("")||"No orders yet."}catch(e){toast(e.message)}}
load();
function openChangePassword(){if(user?.role!=="admin"){toast("Admin sign in required");return}show("changePassword")}
function closeChangePassword(){show("dashboard")}
async function changeAdminPassword(){
 const currentPassword=$("currentAdminPass").value,newPassword=$("newAdminPass").value,confirmPassword=$("confirmAdminPass").value;
 if(newPassword!==confirmPassword){toast("New passwords do not match.");return}
 try{const d=await api("/api/admin/change-password",{method:"POST",body:JSON.stringify({currentPassword,newPassword})});
 $("currentAdminPass").value="";$("newAdminPass").value="";$("confirmAdminPass").value="";toast(d.message);show("dashboard")}catch(e){toast(e.message)}
}
