/* =========================
   PDF Generator (Offer + Catalog)
   Uses window.open + print
   ========================= */

function openPrintWindow(html, title="AutoGlow - PDF"){
  const w = window.open("", "_blank");
  if(!w) return alert("Pop-up blocat. Permite pop-up pentru site și încearcă din nou.");
  w.document.open();
  w.document.write(html);
  w.document.close();
  // set title for print job
  try{ w.document.title = title; }catch(e){}
}

function absUrl(path){
  // ensure correct URL on GitHub Pages
  return new URL(path, window.location.href).href;
}

/* --------- Offer PDF --------- */
window.generateOfferPDF = function(db, offerTotals){
  const logo = absUrl("assets/Logo.png");
  const t = offerTotals; // {mult,pkg,extras,clientTotal,costTotal,profit}

  const car = db.carTypes.find(x=>x.id===document.getElementById("o_carType").value) || db.carTypes[0];
  const dirt= db.dirtLevels.find(x=>x.id===document.getElementById("o_dirt").value) || db.dirtLevels[0];
  const pkg = t.pkg;
  const packName = pkg ? pkg.name : "PERSONALIZAT";

  const includedServices = (pkg ? [`Pachet ${pkg.name}`] : ["—"]);
  const extras = t.extras.map(x=>x.name);
  const showExtras = extras.length ? extras : [];
  const servicesList = [...includedServices, ...showExtras];

  // economy: difference between selecting extras separately vs package (very simple)
  // If package chosen: economy = (sum of package points not known) -> we approximate using (pkg price - extras price?) not valid.
  // We do a safe value: 0 when unknown; you can later wire to your Excel logic.
  const economy = 0;

  const packBlockTitle = pkg?.blockTitle || "PERSONALIZAT — Exact ce ai nevoie";
  const packPoints = (pkg?.points && pkg.points.length ? pkg.points : [
    "Curățare adaptată nevoilor dumneavoastră reale",
    "Soluție rapidă pentru nevoi punctuale",
    "Control total asupra rezultatului și bugetului"
  ]).slice(0,3);

  const whyPoints = [
    "Produse profesionale premium",
    "Curățare sigură, fără demontare",
    "Atenție la detalii și finisaj",
    "Rezultat vizibil de la prima intervenție"
  ];

  const contactRows = buildContactHTML(db.contact);

  const styles = offerStyles();
  const html = `
  <!doctype html>
  <html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Oferta client</title>
    <style>${styles}</style>
  </head>
  <body>
    <div class="page">
      <div class="watermark">AUTO GLOW</div>

      <header class="hdr">
        <div class="logo left"><img src="${logo}" alt="AutoGlow"></div>
        <div class="hdrTitle">
          <div class="hdrMain">OFERTĂ DETAILING</div>
          <div class="hdrSub">INTERIOR</div>
        </div>
        <div class="logo right"><img src="${logo}" alt="AutoGlow"></div>
      </header>

      <div class="metaRow">
        <div></div>
        <div class="date">Data ofertă: <b>${fmtRODate(new Date())}</b></div>
      </div>

      <section class="block">
        <div class="blockTitle">Detalii comandă</div>

        <div class="details">
          <div class="dRow"><div class="dLabel">Tip mașină:</div><div class="dVal">${esc(car.name)}</div></div>
          <div class="dRow"><div class="dLabel">Pachet ales:</div><div class="dVal">${esc(packName)}</div></div>
          <div class="dRow"><div class="dLabel">Nivel murdărie:</div><div class="dVal">${esc(dirt.name)}</div></div>
        </div>

        <div class="blockTitle" style="margin-top:14px">Servicii incluse</div>
        <ul class="listCenter">
          ${servicesList.map(x=>`<li>${esc(x)}</li>`).join("")}
        </ul>
      </section>

      <section class="priceWrap">
        <div class="priceBox">
          <div class="priceLbl">Preț final</div>
          <div class="priceVal">${(t.clientTotal).replace(" lei","")} lei</div>
        </div>

        <div class="ecoBox">
          <div class="ecoLbl">Economia dvs. față de servicii separate</div>
          <div class="ecoVal">${(economy).replace(" lei","")} lei</div>
        </div>
      </section>

      <section class="packBlock">
        <div class="packTitle">${esc(packBlockTitle)}</div>
        <div class="packInner">
          <ul class="listCenter italic">
            ${packPoints.map(x=>`<li>${esc(x)}</li>`).join("")}
          </ul>
        </div>
      </section>

      <section class="why">
        <div class="whyTitle">De ce AutoGlow?</div>
        <ul class="listCenter">
          ${whyPoints.map(x=>`<li>${esc(x)}</li>`).join("")}
        </ul>
      </section>

      <section class="foot">
        <div class="note">${esc(db.transport?.note || "Deplasarea este inclusă în limita pachetului ales.")}</div>

        <div class="contact">
          <div class="cTitle">Contact</div>
          <div class="cGrid">
            ${contactRows}
          </div>
        </div>
      </section>
    </div>

    <script>
      // auto-print after paint
      window.onload = () => setTimeout(()=> window.print(), 350);
    </script>
  </body>
  </html>
  `;

  openPrintWindow(html, "AutoGlow - Oferta");
};

/* --------- Catalog PDF --------- */
window.generateCatalogPDF = function(db){
  const logo = absUrl("assets/logo.png");
  const priceKm = Number(db.transport?.priceKm || 0);

  const pkgRows = db.packages.map(p=>{
    return `
      <tr>
        <td><b>${esc(p.name)}</b><div class="muted small">${esc(p.blockTitle || "")}</div></td>
        <td class="r">${Number(p.kmIncluded||0)}</td>
        <td class="r">${(p.price).replace(" lei","")} lei</td>
      </tr>
    `;
  }).join("");

  const srvRows = db.services.map(s=>{
    return `
      <tr>
        <td>${esc(s.name)}</td>
        <td class="r">${(s.price).replace(" lei","")} lei</td>
      </tr>
    `;
  }).join("");

  const styles = catalogStyles();
  const html = `
  <!doctype html>
  <html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Catalog</title>
    <style>${styles}</style>
  </head>
  <body>
    <div class="page">
      <header class="hdr">
        <img class="logo" src="${logo}" alt="AutoGlow">
        <div>
          <div class="h1">Catalog servicii & pachete</div>
          <div class="sub">AutoGlow • Detailing interior</div>
        </div>
      </header>

      <div class="note">
        Preț/km extra (peste km incluși în pachet): <b>${(priceKm).replace(" lei","")} lei</b>
      </div>

      <section class="card">
        <div class="title">Pachete</div>
        <table>
          <thead><tr><th>Pachet</th><th class="r">KM incluși</th><th class="r">Preț</th></tr></thead>
          <tbody>${pkgRows || `<tr><td colspan="3">—</td></tr>`}</tbody>
        </table>
      </section>

      <section class="card">
        <div class="title">Servicii</div>
        <table>
          <thead><tr><th>Serviciu</th><th class="r">Preț</th></tr></thead>
          <tbody>${srvRows || `<tr><td colspan="2">—</td></tr>`}</tbody>
        </table>
      </section>

      <footer class="footer">
        ${buildContactInline(db.contact)}
      </footer>
    </div>

    <script>
      window.onload = () => setTimeout(()=> window.print(), 350);
    </script>
  </body>
  </html>
  `;

  openPrintWindow(html, "AutoGlow - Catalog");
};

/* =========================
   Styles & helpers
========================= */

function offerStyles(){
  // NOTE: preserve background colors in print
  return `
  @page { size: A4; margin: 14mm; }
  *{ box-sizing:border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body{ margin:0; font-family: Arial, Helvetica, sans-serif; color:#0b0b0b; background:#fff; }
  .page{ position:relative; width: 100%; }
  .watermark{
    position:absolute; inset: 0;
    display:flex; align-items:center; justify-content:center;
    font-weight:900; letter-spacing: 10px;
    font-size: 96px;
    color: rgba(6,42,51,0.06);
    transform: rotate(-22deg);
    pointer-events:none;
    user-select:none;
  }

  .hdr{
    background:#062a33;
    border-radius:10px;
    padding:14px 18px;
    display:grid;
    grid-template-columns: 170px 1fr 170px;
    align-items:center;
    gap:10px;
  }
  .logo{ display:flex; align-items:center; justify-content:center; }
  .logo img{
    height: 64px;
    width: auto;
    display:block;
  }
  .hdrTitle{ text-align:center; color:#fff; }
  .hdrMain{ font-weight:900; font-size:26px; letter-spacing:1px; }
  .hdrSub{ font-weight:900; font-size:26px; letter-spacing:1px; margin-top:2px; }

  .metaRow{ display:flex; justify-content:space-between; margin-top:10px; }
  .date{ font-size:12px; color:#222; }

  .block{ margin-top:14px; }
  .blockTitle{ font-weight:900; font-size:14px; margin:10px 0 6px; }
  .details{ border-bottom: 2px solid #111; padding-bottom:8px; }
  .dRow{
    display:grid;
    grid-template-columns: 170px 1fr;
    border-top: 1px solid #111;
    padding:6px 0;
    font-size:13px;
  }
  .dRow:first-child{ border-top:none; }
  .dLabel{ font-weight:900; }
  .dVal{ font-weight:900; }

  /* Lists centered but bullet-aligned */
  .listCenter{
    margin: 8px auto 0;
    width: fit-content;
    text-align: left;
    padding-left: 18px;
  }
  .listCenter li{ margin: 4px 0; font-size:13px; line-height:1.25; }
  .italic li{ font-style: italic; }

  .priceWrap{ margin-top:14px; }
  .priceBox{
    background:#dbeaf5;
    border:1px solid #c3d9ec;
    padding:18px 10px;
    text-align:center;
  }
  .priceLbl{ font-weight:900; font-size:18px; }
  .priceVal{ font-weight:900; font-size:44px; margin-top:6px; }

  .ecoBox{
    margin-top:10px;
    background:#b7e07d;
    border:1px solid #9fd468;
    padding:10px;
    text-align:center;
  }
  .ecoLbl{ font-size:12px; font-weight:900; }
  .ecoVal{ font-size:18px; font-weight:900; margin-top:4px; }

  .packBlock{ margin-top:10px; }
  .packTitle{ text-align:center; font-weight:900; font-size:18px; margin:10px 0 6px; }
  .packInner{
    background:#efefef;
    padding:10px 12px;
  }

  .why{ margin-top:14px; text-align:center; }
  .whyTitle{ font-weight:900; font-size:18px; margin-bottom:6px; }
  .why ul{ margin-top:8px; }

  .foot{ margin-top:12px; }
  .note{
    text-align:center;
    font-size:11px;
    color:#2a2a2a;
    font-weight:900;
  }

  .contact{
    margin-top:12px;
    border-top: 1px solid #e0e0e0;
    padding-top:10px;
  }
  .cTitle{ font-weight:900; font-size:13px; margin-bottom:6px; }
  .cGrid{
    display:grid;
    grid-template-columns: 1fr 1fr;
    gap:6px 18px;
    font-size:12px;
  }
  .cRow b{ font-weight:900; }
  a{ color:#0b3b46; text-decoration:none; font-weight:900; }
  a:hover{ text-decoration:underline; }
  `;
}

function catalogStyles(){
  return `
  @page { size: A4; margin: 14mm; }
  *{ box-sizing:border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body{ margin:0; font-family: Arial, Helvetica, sans-serif; color:#0b0b0b; background:#fff; }
  .page{ width:100%; }
  .hdr{
    display:flex; gap:12px; align-items:center;
    background:#062a33; color:#fff;
    padding:14px 16px; border-radius:10px;
  }
  .logo{ height:54px; width:auto; display:block; }
  .h1{ font-weight:900; font-size:20px; }
  .sub{ opacity:.9; font-size:12px; margin-top:2px; font-weight:700; }

  .note{
    margin:12px 0;
    padding:10px 12px;
    border:1px solid #e6eef3;
    background:#f4fbff;
    border-radius:10px;
    font-size:12px;
  }

  .card{
    border:1px solid #e2e2e2;
    border-radius:10px;
    padding:12px;
    margin-top:12px;
  }
  .title{ font-weight:900; margin-bottom:8px; }
  table{ width:100%; border-collapse:collapse; font-size:12px; }
  th, td{ padding:8px 6px; border-bottom:1px solid #ececec; vertical-align:top; }
  th{ text-align:left; font-weight:900; }
  .r{ text-align:right; white-space:nowrap; }
  .muted{ color:#666; }
  .small{ font-size:11px; margin-top:3px; }

  .footer{
    margin-top:14px;
    font-size:12px;
    text-align:center;
    color:#333;
  }
  a{ color:#0b3b46; text-decoration:none; font-weight:900; }
  `;
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}

// folosim formatter-ul din app.js (global)
const fmtLei = (n) => window.fmtLei ? window.fmtLei(n) : `${n} lei`;


function fmtRODate(d){
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  return `${dd}.${mm}.${yy}`;
}

function buildContactHTML(c){
  const rows = [];

  if(c?.phone){
    rows.push(`<div class="cRow"><b>Telefon:</b> <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></div>`);
  }else{
    rows.push(`<div class="cRow"><b>Telefon:</b> —</div>`);
  }

  rows.push(linkRow("Instagram", c?.ig));
  rows.push(linkRow("Facebook", c?.fb));
  rows.push(linkRow("TikTok", c?.tt));

  // Fill to even grid
  while(rows.length % 2 !== 0) rows.push(`<div class="cRow"></div>`);
  return rows.join("");
}

function linkRow(label, url){
  if(url && String(url).trim()){
    const safe = esc(url.trim());
    return `<div class="cRow"><b>${esc(label)}:</b> <a href="${safe}" target="_blank" rel="noopener">${safe}</a></div>`;
  }
  return `<div class="cRow"><b>${esc(label)}:</b> —</div>`;
}

function buildContactInline(c){
  const parts = [];
  if(c?.phone) parts.push(`Telefon: <a href="tel:${esc(c.phone)}">${esc(c.phone)}</a>`);
  if(c?.ig) parts.push(`<a href="${esc(c.ig)}" target="_blank" rel="noopener">Instagram</a>`);
  if(c?.fb) parts.push(`<a href="${esc(c.fb)}" target="_blank" rel="noopener">Facebook</a>`);
  if(c?.tt) parts.push(`<a href="${esc(c.tt)}" target="_blank" rel="noopener">TikTok</a>`);
  if(!parts.length) return "Contact: —";
  return parts.join(" • ");
}

