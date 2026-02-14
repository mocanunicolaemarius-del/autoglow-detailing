/* =========================
   AutoGlow Detailing - App
   Local-only data (localStorage)
   ========================= */

const STORE_KEY = "autoglow_detailing_v1";

const $ = (id) => document.getElementById(id);
const fmtLei = (n) => (Number(n || 0)).toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " lei";
const todayISO = () => new Date().toISOString().slice(0,10);
const monthISO = () => new Date().toISOString().slice(0,7);
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

function defaultDB(){
  return {
    version: 1,
    contact: { phone:"", ig:"", fb:"", tt:"" },
    transport: { priceKm: 2.5, consumption: 7.0, fuelCost: 7.4, note: "Deplasarea este inclusă în limita pachetului ales." },
    carTypes: [
      { id: uid(), name:"Mic", mult: 1.0 },
      { id: uid(), name:"Mediu", mult: 1.1 },
      { id: uid(), name:"Mare", mult: 1.2 },
      { id: uid(), name:"SUV", mult: 1.25 }
    ],
    dirtLevels: [
      { id: uid(), name:"Ușor", mult: 1.0 },
      { id: uid(), name:"Normal", mult: 1.1 },
      { id: uid(), name:"Mediu", mult: 1.2 },
      { id: uid(), name:"Greu", mult: 1.35 }
    ],
    packages: [
      { id: uid(), name:"STANDARD", kmIncluded: 5, price: 390, cost: 150,
        blockTitle:"STANDARD — Curat și îngrijit",
        points:[
          "Aspirare completă",
          "Curățare plastice & geamuri",
          "Aspect curat, fără intervenții agresive"
        ]
      },
      { id: uid(), name:"PREMIUM", kmIncluded: 8, price: 520, cost: 210,
        blockTitle:"PREMIUM — Diferența se vede",
        points:[
          "Curățare & împrospătare textile",
          "Igienizare ventilații & abur",
          "Protecție interior în timpul lucrării"
        ]
      },
      { id: uid(), name:"VIP", kmIncluded: 10, price: 630, cost: 250,
        blockTitle:"VIP — Interior ca nou",
        points:[
          "Curățare profundă textile & pete",
          "Detailing fin, timp dedicat exclusiv",
          "Finisaj premium + odorizare inclusă"
        ]
      }
    ],
    services: [
      { id: uid(), name:"Curățare plafon", price: 120, cost: 35 },
      { id: uid(), name:"Curățare tapițerie scaune", price: 200, cost: 70 },
      { id: uid(), name:"Curățare covorașe", price: 60, cost: 15 },
      { id: uid(), name:"Odorizare premium", price: 50, cost: 12 }
    ],
    offer: {
      carTypeId: null,
      dirtId: null,
      km: 0,
      packageId: null,
      fixPrice: false,
      fixPriceValue: 0,
      discountType: "none",
      discountValue: 0,
      extras: [] // {id, serviceId}
    },
    history: [] // {id, date, month, carTypeName, jobName, clientTotal, costTotal, profitTotal}
  };
}

function loadDB(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return defaultDB();
    const db = JSON.parse(raw);
    return db && db.version ? db : defaultDB();
  }catch(e){
    return defaultDB();
  }
}
function saveDB(){
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}

let db = loadDB();

/* =========================
   Tabs
========================= */
function setTab(name){
  document.querySelectorAll(".tab").forEach(b=>{
    b.classList.toggle("active", b.dataset.tab === name);
  });
  document.querySelectorAll(".panel").forEach(p=>{
    p.classList.toggle("active", p.id === `tab-${name}`);
  });
}

document.querySelectorAll(".tab").forEach(btn=>{
  btn.addEventListener("click", ()=> setTab(btn.dataset.tab));
});

/* =========================
   Helpers calc
========================= */
function getCarMult(){
  const id = $("o_carType").value;
  const c = db.carTypes.find(x=>x.id===id) || db.carTypes[0];
  return Number(c?.mult || 1);
}
function getDirtMult(){
  const id = $("o_dirt").value;
  const d = db.dirtLevels.find(x=>x.id===id) || db.dirtLevels[0];
  return Number(d?.mult || 1);
}
function selectedPackage(){
  const id = $("o_package").value;
  if(id === "__none__") return null;
  return db.packages.find(p=>p.id===id) || null;
}
function calcBaseTotals(){
  const mult = getCarMult() * getDirtMult();

  const pkg = selectedPackage();
  const extras = db.offer.extras.map(x => db.services.find(s=>s.id===x.serviceId)).filter(Boolean);

  const extrasPrice = extras.reduce((a,s)=> a + Number(s.price||0), 0) * mult;
  const extrasCost  = extras.reduce((a,s)=> a + Number(s.cost||0), 0);

  const pkgPrice = pkg ? Number(pkg.price||0) * mult : 0;
  const pkgCost  = pkg ? Number(pkg.cost||0) : 0;

  let clientTotal = pkgPrice + extrasPrice;
  let costTotal = pkgCost + extrasCost;

  // fix price overrides clientTotal only
  const fixOn = $("o_fixPrice").checked;
  const fixVal = Number($("o_fixPriceValue").value || 0);
  if(fixOn && fixVal > 0){
    clientTotal = fixVal;
  }

  // discount
  const dt = $("o_discountType").value;
  const dv = Number($("o_discountValue").value || 0);

  if(dt === "percent" && dv > 0){
    clientTotal = clientTotal * (1 - dv/100);
  }else if(dt === "fixed" && dv > 0){
    clientTotal = Math.max(0, clientTotal - dv);
  }

  const profit = clientTotal - costTotal;

  return { mult, pkg, extras, clientTotal, costTotal, profit };
}

/* =========================
   Render selects & lists
========================= */
function fillSelect(select, items, toLabel){
  select.innerHTML = "";
  items.forEach(it=>{
    const opt = document.createElement("option");
    opt.value = it.id;
    opt.textContent = toLabel(it);
    select.appendChild(opt);
  });
}

function renderOffer(){
  // selects
  fillSelect($("o_carType"), db.carTypes, x => x.name);
  fillSelect($("o_dirt"), db.dirtLevels, x => x.name);

  // packages: include "personalizat"
  $("o_package").innerHTML = "";
  const none = document.createElement("option");
  none.value = "__none__";
  none.textContent = "PERSONALIZAT (fără pachet)";
  $("o_package").appendChild(none);
  db.packages.forEach(p=>{
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name;
    $("o_package").appendChild(opt);
  });

  fillSelect($("o_servicePick"), db.services, s => `${s.name} — ${fmtLei(s.price)}`);

  // restore offer state best-effort
  if(db.offer.carTypeId && db.carTypes.some(x=>x.id===db.offer.carTypeId)) $("o_carType").value = db.offer.carTypeId;
  if(db.offer.dirtId && db.dirtLevels.some(x=>x.id===db.offer.dirtId)) $("o_dirt").value = db.offer.dirtId;
  $("o_km").value = db.offer.km ?? 0;

  $("o_fixPrice").checked = !!db.offer.fixPrice;
  $("o_fixPriceValue").value = db.offer.fixPriceValue ?? 0;
  $("o_discountType").value = db.offer.discountType || "none";
  $("o_discountValue").value = db.offer.discountValue ?? 0;

  if(db.offer.packageId && db.packages.some(x=>x.id===db.offer.packageId)) $("o_package").value = db.offer.packageId;
  else $("o_package").value = "__none__";

  // extras list
  const { extras, pkg } = calcBaseTotals();
  $("o_packName").textContent = pkg ? pkg.name : "PERSONALIZAT";
  $("o_packKm").textContent = pkg ? Number(pkg.kmIncluded||0) : 0;

  const body = $("o_servicesList");
  body.innerHTML = "";
  db.offer.extras.forEach(x=>{
    const s = db.services.find(z=>z.id===x.serviceId);
    if(!s) return;
    const row = document.createElement("div");
    row.className = "tRow";
    row.style.gridTemplateColumns = "1fr 110px 110px 70px";
    row.innerHTML = `
      <div>${escapeHtml(s.name)}</div>
      <div class="right">${escapeHtml(fmtLei(s.price))}</div>
      <div class="right">${escapeHtml(fmtLei(s.cost))}</div>
      <div class="right"><button class="btn ghost" data-del="${x.id}">X</button></div>
    `;
    body.appendChild(row);
  });

  // totals
  const t = calcBaseTotals();
  $("o_totalClient").textContent = fmtLei(t.clientTotal);
  $("o_totalCost").textContent   = fmtLei(t.costTotal);
  $("o_totalProfit").textContent = fmtLei(t.profit);
  $("o_totalProfit").classList.toggle("good", t.profit >= 0);
  $("o_totalProfit").classList.toggle("dangerTxt", t.profit < 0);
}

function renderAdminLists(){
  // packages list
  const pBody = $("packagesList");
  pBody.innerHTML = "";
  db.packages.forEach(p=>{
    const row = document.createElement("div");
    row.className = "tRow";
    row.style.gridTemplateColumns = "1fr 110px 70px 70px";
    row.innerHTML = `
      <div><b>${escapeHtml(p.name)}</b><div class="hint" style="margin:4px 0 0">Cost: ${escapeHtml(fmtLei(p.cost))}</div></div>
      <div class="right">${escapeHtml(fmtLei(p.price))}</div>
      <div class="right">${escapeHtml(String(p.kmIncluded||0))}</div>
      <div class="right"><button class="btn ghost" data-delpkg="${p.id}">X</button></div>
    `;
    pBody.appendChild(row);
  });

  // services list
  const sBody = $("servicesList");
  sBody.innerHTML = "";
  db.services.forEach(s=>{
    const row = document.createElement("div");
    row.className = "tRow";
    row.style.gridTemplateColumns = "1fr 110px 110px 70px";
    row.innerHTML = `
      <div>${escapeHtml(s.name)}</div>
      <div class="right">${escapeHtml(fmtLei(s.price))}</div>
      <div class="right">${escapeHtml(fmtLei(s.cost))}</div>
      <div class="right"><button class="btn ghost" data-delsrv="${s.id}">X</button></div>
    `;
    sBody.appendChild(row);
  });

  // settings tables
  renderSettingsTables();
}

function renderSettingsTables(){
  const ct = $("carTypesList");
  ct.innerHTML = "";
  db.carTypes.forEach(x=>{
    const row = document.createElement("div");
    row.className = "tRow";
    row.style.gridTemplateColumns = "1fr 110px 70px";
    row.innerHTML = `
      <div>${escapeHtml(x.name)}</div>
      <div class="right">${escapeHtml(String(x.mult))}</div>
      <div class="right"><button class="btn ghost" data-delct="${x.id}">X</button></div>
    `;
    ct.appendChild(row);
  });

  const dl = $("dirtList");
  dl.innerHTML = "";
  db.dirtLevels.forEach(x=>{
    const row = document.createElement("div");
    row.className = "tRow";
    row.style.gridTemplateColumns = "1fr 110px 70px";
    row.innerHTML = `
      <div>${escapeHtml(x.name)}</div>
      <div class="right">${escapeHtml(String(x.mult))}</div>
      <div class="right"><button class="btn ghost" data-deld="${x.id}">X</button></div>
    `;
    dl.appendChild(row);
  });
}

function renderHistory(month){
  const m = month || $("h_month").value || monthISO();
  $("h_month").value = m;

  const rows = db.history.filter(x=>x.month===m);
  const sumClient = rows.reduce((a,r)=>a+Number(r.clientTotal||0),0);
  const sumCost = rows.reduce((a,r)=>a+Number(r.costTotal||0),0);
  const sumProfit = rows.reduce((a,r)=>a+Number(r.profitTotal||0),0);

  $("h_totalClient").textContent = fmtLei(sumClient);
  $("h_totalCost").textContent   = fmtLei(sumCost);
  $("h_totalProfit").textContent = fmtLei(sumProfit);

  const body = $("h_rows");
  body.innerHTML = "";
  rows.forEach(r=>{
    const tr = document.createElement("div");
    tr.className = "tRow";
    tr.style.gridTemplateColumns = "110px 110px 1fr 110px 110px 110px 70px";
    tr.innerHTML = `
      <div>${escapeHtml(r.date)}</div>
      <div>${escapeHtml(r.carTypeName)}</div>
      <div>${escapeHtml(r.jobName)}</div>
      <div class="right">${escapeHtml(fmtLei(r.clientTotal))}</div>
      <div class="right">${escapeHtml(fmtLei(r.costTotal))}</div>
      <div class="right">${escapeHtml(fmtLei(r.profitTotal))}</div>
      <div class="right"><button class="btn ghost" data-delhist="${r.id}">X</button></div>
    `;
    body.appendChild(tr);
  });
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}

/* =========================
   Events - Offer
========================= */
function bindOfferEvents(){
  ["o_carType","o_dirt","o_package","o_discountType"].forEach(id=>{
    $(id).addEventListener("change", ()=>{
      persistOffer();
      renderOffer();
    });
  });

  ["o_km","o_fixPriceValue","o_discountValue"].forEach(id=>{
    $(id).addEventListener("input", ()=>{
      persistOffer();
      renderOffer();
    });
  });

  $("o_fixPrice").addEventListener("change", ()=>{
    persistOffer();
    renderOffer();
  });

  $("btnAddService").addEventListener("click", ()=>{
    const serviceId = $("o_servicePick").value;
    if(!serviceId) return;
    db.offer.extras.push({ id: uid(), serviceId });
    persistOffer();
    renderOffer();
    saveDB();
  });

  $("o_servicesList").addEventListener("click", (e)=>{
    const id = e.target?.dataset?.del;
    if(!id) return;
    db.offer.extras = db.offer.extras.filter(x=>x.id!==id);
    persistOffer();
    renderOffer();
    saveDB();
  });

  $("btnAddToHistory").addEventListener("click", ()=>{
    const t = calcBaseTotals();
    const pkg = t.pkg;
    const extras = t.extras;

    const car = db.carTypes.find(x=>x.id===$("o_carType").value) || db.carTypes[0];
    const dirt= db.dirtLevels.find(x=>x.id===$("o_dirt").value) || db.dirtLevels[0];

    const jobName = buildJobName(pkg, extras);
    const rec = {
      id: uid(),
      date: todayISO(),
      month: monthISO(),
      carTypeName: car.name,
      jobName,
      clientTotal: round2(t.clientTotal),
      costTotal: round2(t.costTotal),
      profitTotal: round2(t.profit)
    };
    db.history.unshift(rec);
    saveDB();
    renderHistory(monthISO());
    setTab("history");
  });

  $("btnOfferPDF").addEventListener("click", ()=>{
    // pdf-offer.js defines window.generateOfferPDF
    if(window.generateOfferPDF) window.generateOfferPDF(db, calcBaseTotals());
    else alert("PDF module lipsă (pdf-offer.js).");
  });

  $("btnCatalogPDF").addEventListener("click", ()=>{
    if(window.generateCatalogPDF) window.generateCatalogPDF(db);
    else alert("PDF module lipsă (pdf-offer.js).");
  });
}

function buildJobName(pkg, extras){
  const extraNames = extras.map(x=>x.name);
  if(pkg && extraNames.length===0) return pkg.name;
  if(pkg && extraNames.length>0) return `${pkg.name} + ${extraNames.join(", ")}`;
  if(!pkg && extraNames.length>0) return `PERSONALIZAT: ${extraNames.join(", ")}`;
  return "PERSONALIZAT";
}

function round2(n){ return Math.round(Number(n||0)*100)/100; }

function persistOffer(){
  db.offer.carTypeId = $("o_carType").value;
  db.offer.dirtId = $("o_dirt").value;
  db.offer.km = Number($("o_km").value || 0);

  const pkgVal = $("o_package").value;
  db.offer.packageId = (pkgVal === "__none__") ? null : pkgVal;

  db.offer.fixPrice = $("o_fixPrice").checked;
  db.offer.fixPriceValue = Number($("o_fixPriceValue").value || 0);
  db.offer.discountType = $("o_discountType").value;
  db.offer.discountValue = Number($("o_discountValue").value || 0);

  saveDB();
}

/* =========================
   Events - Catalog admin
========================= */
function bindCatalogEvents(){
  $("btnAddPackage").addEventListener("click", ()=>{
    const name = $("p_name").value.trim();
    const km = Number($("p_km").value || 0);
    const price = Number($("p_price").value || 0);
    const cost = Number($("p_cost").value || 0);
    const blockTitle = $("p_blockTitle").value.trim() || `${name} —`;
    const pointsRaw = $("p_points").value.split("\n").map(x=>x.replace(/^•\s*/,"").trim()).filter(Boolean);
    const points = pointsRaw.slice(0,3);

    if(!name) return alert("Completează numele pachetului.");
    db.packages.push({ id: uid(), name, kmIncluded: km, price, cost, blockTitle, points });
    $("p_name").value=""; $("p_km").value=""; $("p_price").value=""; $("p_cost").value="";
    $("p_blockTitle").value=""; $("p_points").value="";
    saveDB();
    renderOffer();
    renderAdminLists();
  });

  $("btnAddServiceAdmin").addEventListener("click", ()=>{
    const name = $("s_name").value.trim();
    const price = Number($("s_price").value || 0);
    const cost  = Number($("s_cost").value || 0);
    if(!name) return alert("Completează denumirea serviciului.");
    db.services.push({ id: uid(), name, price, cost });
    $("s_name").value=""; $("s_price").value=""; $("s_cost").value="";
    saveDB();
    renderOffer();
    renderAdminLists();
  });

  $("packagesList").addEventListener("click", (e)=>{
    const id = e.target?.dataset?.delpkg;
    if(!id) return;
    db.packages = db.packages.filter(p=>p.id!==id);
    // if selected deleted package, revert to personalizat
    if(db.offer.packageId === id) db.offer.packageId = null;
    saveDB();
    renderOffer();
    renderAdminLists();
  });

  $("servicesList").addEventListener("click", (e)=>{
    const id = e.target?.dataset?.delsrv;
    if(!id) return;
    db.services = db.services.filter(s=>s.id!==id);
    // remove extras referencing deleted service
    db.offer.extras = db.offer.extras.filter(x=>{
      return db.services.some(s=>s.id===x.serviceId);
    });
    saveDB();
    renderOffer();
    renderAdminLists();
  });

  $("btnResetDemo").addEventListener("click", ()=>{
    if(!confirm("Reset la setările demo? (șterge datele actuale)")) return;
    db = defaultDB();
    saveDB();
    boot();
  });

  $("btnExportData").addEventListener("click", ()=>{
    const blob = new Blob([JSON.stringify(db, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `autoglow-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("importFile").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      const obj = JSON.parse(text);
      if(!obj || !obj.version) throw new Error("invalid");
      db = obj;
      saveDB();
      boot();
      alert("Import reușit.");
    }catch(err){
      alert("Import eșuat. Fișier invalid.");
    }finally{
      e.target.value = "";
    }
  });
}

/* =========================
   Events - Settings & History
========================= */
function bindSettingsHistoryEvents(){
  // contact
  $("btnSaveContact").addEventListener("click", ()=>{
    db.contact.phone = $("c_phone").value.trim();
    db.contact.ig = $("c_ig").value.trim();
    db.contact.fb = $("c_fb").value.trim();
    db.contact.tt = $("c_tt").value.trim();
    saveDB();
    alert("Contact salvat.");
  });

  // settings transport
  $("btnSaveSettings").addEventListener("click", ()=>{
    db.transport.priceKm = Number($("t_priceKm").value || 0);
    db.transport.consumption = Number($("t_consumption").value || 0);
    db.transport.fuelCost = Number($("t_fuelCost").value || 0);
    db.transport.note = $("t_note").value.trim() || "Deplasarea este inclusă în limita pachetului ales.";
    saveDB();
    alert("Setări salvate.");
  });

  // car types add/del
  $("btnAddCarType").addEventListener("click", ()=>{
    const name = $("ct_name").value.trim();
    const mult = Number($("ct_mult").value || 1);
    if(!name) return alert("Completează tipul auto.");
    db.carTypes.push({ id: uid(), name, mult });
    $("ct_name").value=""; $("ct_mult").value="";
    saveDB();
    renderOffer();
    renderAdminLists();
  });

  $("carTypesList").addEventListener("click", (e)=>{
    const id = e.target?.dataset?.delct;
    if(!id) return;
    db.carTypes = db.carTypes.filter(x=>x.id!==id);
    saveDB();
    renderOffer();
    renderAdminLists();
  });

  // dirt add/del
  $("btnAddDirt").addEventListener("click", ()=>{
    const name = $("d_name").value.trim();
    const mult = Number($("d_mult").value || 1);
    if(!name) return alert("Completează nivelul.");
    db.dirtLevels.push({ id: uid(), name, mult });
    $("d_name").value=""; $("d_mult").value="";
    saveDB();
    renderOffer();
    renderAdminLists();
  });

  $("dirtList").addEventListener("click", (e)=>{
    const id = e.target?.dataset?.deld;
    if(!id) return;
    db.dirtLevels = db.dirtLevels.filter(x=>x.id!==id);
    saveDB();
    renderOffer();
    renderAdminLists();
  });

  // history
  $("btnViewMonth").addEventListener("click", ()=> renderHistory($("h_month").value));
  $("btnTotalsAll").addEventListener("click", ()=>{
    const rows = db.history;
    const sumClient = rows.reduce((a,r)=>a+Number(r.clientTotal||0),0);
    const sumCost = rows.reduce((a,r)=>a+Number(r.costTotal||0),0);
    const sumProfit = rows.reduce((a,r)=>a+Number(r.profitTotal||0),0);
    alert(`TOTAL GENERAL\n\nClient: ${fmtLei(sumClient)}\nCost: ${fmtLei(sumCost)}\nProfit: ${fmtLei(sumProfit)}`);
  });

  $("btnClearHistory").addEventListener("click", ()=>{
    if(!confirm("Sigur vrei să ștergi istoricul?")) return;
    db.history = [];
    saveDB();
    renderHistory(monthISO());
  });

  $("h_rows").addEventListener("click", (e)=>{
    const id = e.target?.dataset?.delhist;
    if(!id) return;
    db.history = db.history.filter(x=>x.id!==id);
    saveDB();
    renderHistory($("h_month").value);
  });
}

/* =========================
   Boot
========================= */
function boot(){
  // load contact/settings into inputs
  $("c_phone").value = db.contact.phone || "";
  $("c_ig").value = db.contact.ig || "";
  $("c_fb").value = db.contact.fb || "";
  $("c_tt").value = db.contact.tt || "";

  $("t_priceKm").value = db.transport.priceKm ?? 0;
  $("t_consumption").value = db.transport.consumption ?? 0;
  $("t_fuelCost").value = db.transport.fuelCost ?? 0;
  $("t_note").value = db.transport.note || "Deplasarea este inclusă în limita pachetului ales.";

  // offer initial ids
  if(!db.offer.carTypeId) db.offer.carTypeId = db.carTypes[0]?.id || null;
  if(!db.offer.dirtId) db.offer.dirtId = db.dirtLevels[0]?.id || null;

  // set selects values by state (renderOffer sets selects and restores)
  renderOffer();
  renderAdminLists();
  renderHistory(monthISO());
}

bindOfferEvents();
bindCatalogEvents();
bindSettingsHistoryEvents();
boot();

