
// Restaurar MUNICIPIOS_DB al cargar
(function() {
  try {
    var saved = localStorage.getItem('MUNICIPIOS_DB');
    if(saved) window.MUNICIPIOS_DB = JSON.parse(saved);
    else window.MUNICIPIOS_DB = {};
  } catch(e) { window.MUNICIPIOS_DB = {}; }
})();

// ── NAVEGACIÓN PRINCIPAL ─────────────────────────────────
function showPage(id) {
  // Ocultar todas las páginas
  var pages = document.querySelectorAll('.page');
  for(var i=0;i<pages.length;i++) {
    pages[i].style.display = 'none';
    pages[i].classList.remove('active');
  }
  // Mostrar la página seleccionada
  var target = document.getElementById('page-' + id);
  if(target) {
    target.style.display = 'block';
    target.classList.add('active');
  }
  // Actualizar sidebar
  var items = document.querySelectorAll('.sidebar-item');
  for(var j=0;j<items.length;j++) {
    items[j].classList.remove('active');
    var oc = items[j].getAttribute('onclick') || '';
    if(oc.indexOf("'"+id+"'") !== -1 || oc.indexOf('"'+id+'"') !== -1) {
      items[j].classList.add('active');
    }
  }
  // Iniciar mapa si es geo
  if(id === 'geo-pro' && typeof geoInitMap === 'function') {
    setTimeout(geoInitMap, 150);
  }
}

setInterval(updateClock, 1000);
updateClock();
const postesData = [];
document.addEventListener('DOMContentLoaded', () => {
  const mapa = document.getElementById('mapa-principal');
  if(mapa) {
  mapa.addEventListener('mousemove', e => {
  const rect = mapa.getBoundingClientRect();
  const relX = (e.clientX - rect.left)/rect.width;
  const relY = (e.clientY - rect.top)/rect.height;
  const lat = (9.3414 + (0.5 - relY)*0.02).toFixed(5);
  const lon = (-75.2917 + (relX - 0.5)*0.03).toFixed(5);
  const coordEl = document.getElementById('mapa-coords');
  if(coordEl) coordEl.textContent = `Lat: ${lat}° N · Lon: ${lon}° W`;
  });
  }
  renderPosotes();
  renderCharts();
  calcularSimulacion();
  calcularCostos();
  calcularTarifa();
});
let costos = {csee:0, cinv:0, caom:0, cotros:0};
const tarifasBase = {
  '1':{pct:0.025, tope:4200},
  '2':{pct:0.030, tope:6800},
  '3':{pct:0.045, tope:12500},
  '4':{pct:0.060, tope:22000},
  '5':{pct:0.080, tope:38000},
  '6':{pct:0.100, tope:55000},
  'com':{kwh:85, tope:null},
  'ind':{kwh:95, tope:null},
  'of':{kwh:0, tope:0},
};
const retilapReqs = {
  M1: {emMin:150, uo:0.40, ul:0.70, ti:10, fhs:0, irc:65},
  M2: {emMin:75, uo:0.40, ul:0.70, ti:10, fhs:0, irc:65},
  M3: {emMin:30, uo:0.40, ul:0.60, ti:15, fhs:1, irc:65},
  M4: {emMin:15, uo:0.40, ul:null, ti:15, fhs:5, irc:60},
  P1: {emMin:15, uo:0.35, ul:null, ti:null, fhs:5, irc:80},
  P2: {emMin:8, uo:0.25, ul:null, ti:null, fhs:10, irc:70},
  E:  {emMin:50, uo:0.40, ul:null, ti:null, fhs:5, irc:70},
};
document.addEventListener("DOMContentLoaded", function(){
  setTimeout(calcularFinanciero, 600);
  setTimeout(verificarRetilap, 700);
  setTimeout(calcularIndicadores, 800);
  setTimeout(calcularURE, 900);
}, false);
let ETR_D = {};
document.addEventListener('DOMContentLoaded',function(){ setTimeout(calcETR,400); });
let geoMap = null;
let geoMarkers = {};
let geoLayer = null;
let geoSatLayer = null;
let geoAddModeActive = false;
let geoCurrentId = null;
let geoFotoData = null;
let geoFoto2Data = null;
let SIAP_DB = {};
const CREG_UCAP = {
  'LED': { cr_base: 850000, vida: 25, faomL: 0.074, eficaciaMin: 100 },
  'HID': { cr_base: 520000, vida: 15, faomL: 0.074, eficaciaMin: 70 },
  'Mercurio': { cr_base: 380000, vida: 15, faomL: 0.074, eficaciaMin: 40 },
  'Haluro': { cr_base: 600000, vida: 15, faomL: 0.074, eficaciaMin: 75 },
  'Induccion': { cr_base: 700000, vida: 20, faomL: 0.074, eficaciaMin: 90 },
};
const RETILAP_REQS = {
  M1:{emMin:150,uo:0.40,ul:0.70,ti:10,fhs:0,irc:65},
  M2:{emMin:75,uo:0.40,ul:0.70,ti:10,fhs:0,irc:65},
  M3:{emMin:30,uo:0.40,ul:0.60,ti:15,fhs:1,irc:65},
  M4:{emMin:15,uo:0.40,ul:null,ti:15,fhs:5,irc:60},
  P1:{emMin:15,uo:0.35,ul:null,ti:null,fhs:5,irc:80},
  P2:{emMin:8,uo:0.25,ul:null,ti:null,fhs:10,irc:70},
  E:{emMin:50,uo:0.40,ul:null,ti:null,fhs:5,irc:70},
};
const ESTADO_COLORS = {
  operativa:'#2ECC71', falla:'#E74C3C', mantenimiento:'#F39C12',
  reemplazar:'#E74C3C', apagada:'#7F8C8D'
};
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && geoAddModeActive) {
  geoAddModeActive = false;
  const banner = document.getElementById('geo-add-banner');
  if (banner) banner.style.display = 'none';
  if (geoMap) geoMap.getContainer().style.cursor = '';
  }
});


let MUNICIPIOS_DB = JSON.parse(localStorage.getItem('MUNICIPIOS_DB') || '{}');
const _origCalcETR = calcETR;
calcETR = function() {
  _origCalcETR.apply(this, arguments);
  setTimeout(() => {
  if(window.ETR_D && ETR_D.flujo) {
  window._flujoData = ETR_D.flujo;
  window._costosData = { csee:ETR_D.cseeMes||0, cinv:ETR_D.cinvMes||0, caom:ETR_D.caomMes||0, cotr:ETR_D.cotrMes||0 };
  window._waccData = { tir:ETR_D.tir||0, inversion:ETR_D.crTot*0.03||0, flujo:ETR_D.flujo.map(f=>f.saldo) };
  }
  renderGraficasFinancieras();
  }, 300);
};
const _origCalcFin = typeof calcularFinanciero==='function' ? calcularFinanciero : null;
if(_origCalcFin) {
  calcularFinanciero = function() {
  _origCalcFin.apply(this, arguments);
  setTimeout(renderGraficasFinancieras, 400);
  };
}
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
  muni_renderLista();
  muni_renderComparativo();
  }, 500);
});
let EXPANSION_DB = JSON.parse(localStorage.getItem('EXPANSION_DB')||'[]');
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
  expansionActualizarTabla();
  if(typeof calcFV === 'function') calcFV();
  if(typeof calcTribBase === 'function') calcTribBase();
  }, 600);
});


document.addEventListener('DOMContentLoaded', function() {
  setTimeout(actualizarDashboard, 500);
});
document.addEventListener('DOMContentLoaded', function(){
  const fechaHoy = new Date().toISOString().split('T')[0];
  const fin = document.getElementById('mora-fecha-fin');
  const fechaHoy2 = new Date().toISOString().split('T')[0];
  if(fin) fin.value = fechaHoy2;
  const ccFecha = document.getElementById('cc-fecha-mp');
  if(ccFecha) ccFecha.value = hoy;
});
let TARIFAS_DB = JSON.parse(localStorage.getItem('TARIFAS_DB')||'[]');
window.addEventListener('load', function(){
  setTimeout(tarifaRenderTabla, 200);
});
const DB = {
  get: (key) => { try { return JSON.parse(localStorage.getItem('SIEAP_'+key)||'[]'); } catch(e){ return []; } },
  set: (key, val) => { try { localStorage.setItem('SIEAP_'+key, JSON.stringify(val)); } catch(e){} },
  add: (key, item) => { const arr = DB.get(key); arr.push({...item, id: Date.now(), ts: new Date().toISOString()}); DB.set(key, arr); return arr; },
  del: (key, id) => { const arr = DB.get(key).filter(i=>i.id!==id); DB.set(key, arr); return arr; },
  update: (key, id, item) => { const arr = DB.get(key).map(i=>i.id===id?{...i,...item}:i); DB.set(key, arr); return arr; }
};
let COBERTURA_DB = [];
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(inicializarModulos, 50);
});

function _agregarBotonesGuardar() {
  
  const btnGroupSim = document.querySelector('#page-simulacion .btn-group');
  if(btnGroupSim && !btnGroupSim.querySelector('[onclick*="guardarSimulacion"]')) {
  const btn = document.createElement('button');
  btn.className = 'btn btn-success';
  btn.onclick = guardarSimulacion;
  btn.innerHTML = '💾 Guardar simulación';
  btnGroupSim.appendChild(btn);
  }
  const totalTab = document.getElementById('tab-total');
  if(totalTab && !totalTab.querySelector('[onclick*="guardarResultadosETR"]')) {
  const btnGroup = document.createElement('div');
  btnGroup.className = 'btn-group';
  btnGroup.style.marginTop = '12px';
  btnGroup.innerHTML = '<button class="btn btn-success" onclick="guardarResultadosETR()">💾 Guardar resultados ETR</button>';
  totalTab.appendChild(btnGroup);
  }
  const tabReg = document.getElementById('tab-registro');
  if(tabReg) {
  const inputs = tabReg.querySelectorAll('input[type="text"], input[type="number"], select');
  const ids = ['lum-reg-codigo','lum-reg-tec','lum-reg-pot','lum-reg-flujo','lum-reg-irc','lum-reg-ip','lum-reg-anio','lum-reg-vida','lum-reg-zona','lum-reg-valor'];
  inputs.forEach((inp, i) => { if(!inp.id && ids[i]) inp.id = ids[i]; });
  
  const btnReg = tabReg.querySelector('.btn-primary');
  if(btnReg) btnReg.onclick = lumRegistrar;
  const btnLimp = tabReg.querySelector('.btn-outline');
  if(btnLimp) btnLimp.onclick = lumLimpiar;
  
  const selTec = tabReg.querySelector('select');
  if(selTec && !selTec.id) selTec.id = 'lum-reg-tec';
  }
}

function _agregarHistorialSimulacion() {
  const simPage = document.getElementById('page-simulacion');
  if(simPage && !document.getElementById('sim-historial')) {
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `<div class="card-title">📋 Historial de Simulaciones Guardadas</div>
  <div id="sim-historial" style="display:flex;flex-direction:column;gap:6px;">
  <div style="color:#aaa;font-size:0.8rem;text-align:center;padding:10px;">Sin simulaciones guardadas aún.</div>
  </div>`;
  simPage.appendChild(div);
  
  const sims = DB.get('simulaciones');
  if(sims.length > 0) {
  const h = document.getElementById('sim-historial');
  h.innerHTML = sims.slice(-5).reverse().map(s=>`
  <div style="padding:6px 10px;background:#F0F4F8;border-radius:5px;font-size:0.78rem;display:flex;justify-content:space-between;">
  <span>${s.via} | Ancho:${s.ancho}m | Esp:${s.espaciado}m | ${s.fecha}</span>
  <span><strong>${s.em} lux</strong> ${s.cumple}</span>
  </div>`).join('');
  }
  }
}

function abrirArchivo(accept, callback) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = accept;
  input.onchange = e => { if(e.target.files[0]) callback(e.target.files[0]); };
  input.click();
}

function actualizarDashboard() {
  
  const lumTotal = Object.keys(window.SIAP_DB||{}).length;
  safeSet('dash-total-lum', lumTotal || '0');
  const incAbiertas = document.querySelectorAll('.incidencia-card').length;
  safeSet('dash-incidencias', incAbiertas || '0');
  if(window.ETR_D && ETR_D.ctmaxA) {
  safeSet('dash-costo-etr', formatCOPM(ETR_D.ctmaxA));
  }
  const kmTot = parseFloat(document.getElementById('etr-km-tot')?.value)||0;
  const kmIlum = parseFloat(document.getElementById('etr-km-ilum')?.value)||0;
  if(kmTot > 0) {
  const pct = ((kmIlum/kmTot)*100).toFixed(1)+'%';
  safeSet('dash-cobertura', pct);
  safeSet('disp-urb', pct);
  }
  const enMant = document.querySelectorAll('.badge-amarillo').length;
  safeSet('mant-mant', enMant || '0');
}

function actualizarTablaPostes() {
  const tbody = document.getElementById('tabla-postes');
  tbody.innerHTML = '';
  postesData.forEach(p => {
  const badgeMap = {operativo:'badge-verde', falla:'badge-rojo', mantenimiento:'badge-amarillo', apagado:'badge-gris'};
  tbody.innerHTML += `<tr>
  <td><strong>${p.id}</strong></td>
  <td>${p.tipo}</td>
  <td>${p.altura}m</td>
  <td><span class="badge ${badgeMap[p.estado] || 'badge-gris'}">${p.estado}</span></td>
  <td><button class="btn btn-sm btn-outline">🗑️</button></td>
  </tr>`;
  });
}

function agregarPoste() {
  
  showPage('geo-pro');
  setTimeout(()=>{
  const lat = document.getElementById('in-lat')?.value;
  const lon = document.getElementById('in-lon')?.value;
  if(lat && lon) {
  const ftLat = document.getElementById('ft-lat');
  const ftLon = document.getElementById('ft-lon');
  if(ftLat) ftLat.value = lat;
  if(ftLon) ftLon.value = lon;
  }
  if(typeof geoModalOpen === 'function') geoModalOpen();
  }, 300);
  showToast('📍 Usa el módulo SIAP Georreferenciación para agregar postes con mapa real', 'info');
}

function alertBox(tipo, texto) {
  const colors = {success:'#D4EDDA:#1a7a2a', warning:'#FFF3CD:#856404', danger:'#F8D7DA:#721c24', info:'#CCE5FF:#004085'};
  const [bg, color] = (colors[tipo]||'#F0F4F8:#333').split(':');
  return `<div style="background:${bg};border-radius:8px;padding:12px 16px;font-size:0.82rem;color:${color};border-left:4px solid ${color};">${texto}</div>`;
}

function boxAzul(titulo, items) {
  return `<div style="background:linear-gradient(135deg,#003366,#0055A5);color:white;border-radius:10px;padding:16px;margin-bottom:10px;">
  <div style="font-weight:700;color:#FFD700;margin-bottom:10px;font-size:0.9rem;">${titulo}</div>
  <div style="display:flex;flex-direction:column;gap:6px;">
  ${items.map(([k,v,color])=>`<div style="display:flex;justify-content:space-between;padding:5px 8px;background:rgba(255,255,255,0.08);border-radius:5px;">
  <span style="color:#A8C4E0;font-size:0.8rem;">${k}</span>
  <strong style="color:${color||'#FFD700'};font-size:0.82rem;">${v}</strong>
  </div>`).join('')}
  </div></div>`;
}

function calcActualizacion() {
  const anioBase = gV('idx-anio-base') || 2024;
  const anioAct = gV('idx-anio-act') || 2026;
  const n = anioAct - anioBase;
  if(n <= 0) return;

  const csee = gV('idx-csee');
  const cinv = gV('idx-cinv');
  const caom = gV('idx-caom');
  const cotr = gV('idx-cotr');
  const ipc = gV('idx-ipc')/100 || 0.062;
  const ipp = gV('idx-ipp')/100 || 0.085;
  const faom = gV('idx-faom') || 0.074;

  const cseeAct = csee * Math.pow(1+ipp, n);
  const cinvAct = cinv * Math.pow(1+ipc*0.5, n);
  const caomAct = caom * Math.pow(1+ipc*0.7, n);
  const cotrAct = cotr * Math.pow(1+ipc, n);
  const totalBase = csee+cinv+caom+cotr;
  const totalAct = cseeAct+cinvAct+caomAct+cotrAct;
  const variacion = totalBase > 0 ? ((totalAct/totalBase)-1)*100 : 0;

  setRes('res-actualizacion', boxAzul('📈 ETR ACTUALIZADO — '+anioBase+' → '+anioAct, [
  ['CSEE actualizado (×IPP^'+n+')', fmtCOP(cseeAct), 'white'],
  ['CINV actualizado', fmtCOP(cinvAct), 'white'],
  ['CAOM actualizado (FAOML='+faom+')', fmtCOP(caomAct), 'white'],
  ['COTR actualizado (×IPC^'+n+')', fmtCOP(cotrAct), 'white'],
  ['CTMAX base', fmtCOP(totalBase), '#A8C4E0'],
  ['CTMAX ACTUALIZADO', fmtCOP(totalAct), '#FFD700'],
  ['Variación total', variacion.toFixed(1)+'%', variacion>15?'#E74C3C':'#2ECC71'],
  ]) + alertBox('info','Res. CREG 101013/2022: CSEE se actualiza con IPP (energía). CINV con IPC parcial. CAOM con FAOML de la senda anual.'));
}

function calcCobroCoactivo() {
  const capital = gV('cc-capital');
  const intereses = gV('cc-intereses');
  const sanciones = gV('cc-sanciones');
  const gastos = gV('cc-gastos');
  const cuotas = gV('cc-cuotas');
  const total = capital + intereses + sanciones + gastos;
  const cuota = cuotas > 0 ? total/cuotas : 0;

  setRes('res-cobro-coactivo', boxAzul('📋 LIQUIDACIÓN COBRO COACTIVO — Arts. 823-843 ET', [
  ['Capital IAP', fmtCOP(capital), 'white'],
  ['Intereses de mora (Art.634 ET)', fmtCOP(intereses), '#A8C4E0'],
  ['Sanciones', fmtCOP(sanciones), '#A8C4E0'],
  ['Gastos de cobro', fmtCOP(gastos), '#A8C4E0'],
  ['TOTAL DEUDA', fmtCOP(total), '#FFD700'],
  cuotas > 0 ? ['Cuota mensual acuerdo ('+cuotas+')', fmtCOP(cuota), '#2ECC71'] : ['Pago de contado', 'Sí', '#2ECC71'],
  ]) + alertBox('info','Arts. 823-843 ET: Proceso administrativo de cobro coactivo. Mandamiento de pago, excepciones, embargo y remate de bienes.'));
}

function calcCostoUnitario() {
  const n = gV('cu-lum');
  const csee = gV('cu-csee');
  const cinv = gV('cu-cinv');
  const caom = gV('cu-caom');
  const cotr = gV('cu-cotr');
  const activo = gV('cu-activo');
  const vida = gV('cu-vida') || 25;
  if(!n) { setRes('res-costo-unitario','<div style="padding:20px;color:#aaa;text-align:center;">Ingresa el número de luminarias</div>'); return; }

  const ctmaxMes = csee+cinv+caom+cotr;
  const costoUnit = n > 0 ? ctmaxMes/n : 0;
  const depAnual = activo > 0 ? activo/vida : 0;
  const cpm = n > 0 ? caom/n : 0;

  setRes('res-costo-unitario', boxAzul('📊 COSTO UNITARIO POR PUNTO DE LUZ', [
  ['N° luminarias SALP', n.toLocaleString('es-CO'), 'white'],
  ['CTMAX mensual total', fmtCOP(ctmaxMes), 'white'],
  ['Costo unit. mensual total', fmtCOP(costoUnit), '#FFD700'],
  ['  → CSEE/luminaria/mes', fmtCOP(n>0?csee/n:0), '#A8C4E0'],
  ['  → CINV/luminaria/mes', fmtCOP(n>0?cinv/n:0), '#A8C4E0'],
  ['  → CAOM/luminaria/mes', fmtCOP(cpm), '#A8C4E0'],
  ['  → COTR/luminaria/mes', fmtCOP(n>0?cotr/n:0), '#A8C4E0'],
  activo>0 ? ['Depreciación anual/lum.', fmtCOP(depAnual), '#A8D8A8'] : ['','',''],
  ['Costo unit. anual', fmtCOP(costoUnit*12), '#2ECC71'],
  ].filter(r=>r[0])) + alertBox('info','Base: Res. CREG 101013/2022. El costo unitario permite verificar la proporcionalidad de las tarifas IAP por contribuyente.'));
}

function calcETR() {
  
  const crL = etrG('i-crL'), crTA = etrG('i-crTA');
  const crTot = crL + crTA;
  const lLed=etrG('i-led'),pLed=etrG('i-pled');
  const lHid=etrG('i-hid'),pHid=etrG('i-phid');
  const lMerc=etrG('i-merc'),pMerc=etrG('i-pmerc');
  const totLum = lLed+lHid+lMerc;
  const el1=document.getElementById('i-total'); if(el1) el1.value=totLum.toLocaleString('es-CO');
  const el2=document.getElementById('i-crTot'); if(el2) el2.value=formatCOP(Math.round(crTot));
  const tKwh=etrG('p-tkwh'), hd=etrG('p-hd');
  const wacc=etrG('p-wacc')/100, vu=etrG('p-vu'), idP=etrG('p-id')/100;
  const faoML=etrG('p-faomL'), faoMS=0.040;
  const ipp=etrG('p-ipp')/100, ipc=etrG('p-ipc')/100;
  const cInt=etrG('p-int'), cSga=etrG('p-sga');
  const ambPct=etrG('p-amb')/100, polPct=etrG('p-pol')/100;
  const estPct=etrG('p-est')/100, icaPct=etrG('p-ica')/100;
  const crecP=etrG('p-crec')/100;
  const potKw = (lLed*pLed + lHid*pHid + lMerc*pMerc)/1000;
  const ceeMes = potKw * hd * 30.4;
  const cseeMes = ceeMes * tKwh;
  const caanA = crTot>0 ? crTot*(wacc/(1-Math.pow(1+wacc,-vu))) : 0;
  const caanMes = caanA/12;
  const cinvMes = caanMes*idP;
  const caomMes = (crTA*faoMS + crL*faoML)*idP/12;
  const cAmb = caomMes*ambPct;
  const base = cinvMes+caomMes+cAmb+cSga;
  const cPol=base*polPct, cEst=base*estPct, cIca=base*icaPct;
  const cotrMes = cInt+cAmb+cSga+cPol+cEst+cIca;
  const expM=etrG('p-exp')/12, ornM=etrG('p-orn')/12;
  const ctmaxMes = cseeMes+cinvMes+caomMes+cotrMes+expM+ornM;
  const ctmaxA = ctmaxMes*12;
  const secs=[{id:'e1',t:'pct'},{id:'e2',t:'pct'},{id:'e3',t:'pct'},
  {id:'e4',t:'pct'},{id:'e5',t:'pct'},{id:'e6',t:'pct'},
  {id:'com',t:'kwh'},{id:'ind',t:'kwh'}];
  let recMes=0; const det={};
  secs.forEach(s=>{
  const cnt=etrG('cnt-'+s.id), kwh=etrG('kwh-'+s.id), tar=etrG('tar-'+s.id);
  const iap = s.t==='pct' ? kwh*tKwh*(tar/100) : kwh*tar;
  det[s.id]={cnt,kwh,iap,total:iap*cnt};
  recMes+=iap*cnt;
  });
  const cumple = recMes<=ctmaxMes;
  const supMes = recMes-ctmaxMes;
  const senda={2024:0.086,2025:0.080,2026:0.074,2027:0.069,2028:0.063};
  const flujo=[];
  for(let i=1;i<=4;i++){
  const anio=2023+i;
  const fL=senda[anio]||0.063;
  const csA=cseeMes*12*Math.pow(1+ipp,i);
  const caanAnio=crTot*(wacc/(1-Math.pow(1+wacc,-vu)));
  const ciA=caanAnio*idP;
  const caA=(crTA*faoMS+crL*fL)*idP;
  const cAmbA=caA*ambPct, basA=(ciA+caA+cAmbA+cSga*12);
  const cotA=cInt*12+cAmbA+cSga*12+basA*polPct+basA*estPct+basA*icaPct;
  const capA=csA+ciA+caA+cotA+etrG('p-exp')+etrG('p-orn');
  const recA=recMes*12*Math.pow(1+crecP,i);
  flujo.push({anio,csA,ciA,caA,cotA,capA,recA,saldo:recA-capA});
  }
  const invT=crTot*0.03;
  let tirL=-0.9,tirH=5;
  for(let it=0;it<100;it++){
  const tm=(tirL+tirH)/2; let npv=-invT;
  flujo.forEach((f,i)=>{npv+=f.saldo/Math.pow(1+tm,i+1);});
  if(npv>0) tirL=tm; else tirH=tm;
  if(tirH-tirL<0.0001) break;
  }
  const tir=(tirL+tirH)/2;
  let vpn=-invT; flujo.forEach((f,i)=>{vpn+=f.saldo/Math.pow(1+wacc,i+1);});
  const bc = recMes*12*4/(ctmaxA*4);
  ['er-csee','er-cinv','er-caom','er-cotr'].forEach((id,i)=>{
  safeSet(id, formatCOPM([cseeMes,cinvMes,caomMes,cotrMes][i]));
  });
  safeSet('er-ctmax', formatCOP(Math.round(ctmaxMes)));
  safeSet('er-ctmax-a','Anual: '+formatCOP(Math.round(ctmaxA)));
  safeSet('er-caan', formatCOPM(caanA));
  safeSet('er-tir', (tir*100).toFixed(2)+'%');
  safeSet('er-vpn', formatCOPM(vpn));
  safeSet('er-rec', formatCOP(Math.round(recMes)));
  safeSet('er-bc', bc.toFixed(3));

  const a351 = document.getElementById('er-art351');
  if(a351) a351.innerHTML=`<div style="background:${cumple?'#D4EDDA':'#F8D7DA'};border-radius:8px;padding:14px;text-align:center;">
  <div style="font-size:1.8rem;">${cumple?'✅':'⚠️'}</div>
  <div style="font-weight:700;color:${cumple?'#1a7a2a':'#721c24'};font-size:0.9rem;">Art. 351 Ley 1819/2016</div>
  <div style="font-size:0.78rem;color:#555;margin-top:5px;">
  Recaudo: <strong>${formatCOP(Math.round(recMes))}</strong><br>
  CTMAX: <strong>${formatCOP(Math.round(ctmaxMes))}</strong><br>
  ${(recMes/ctmaxMes*100).toFixed(1)}% del tope legal
  </div>
  <div style="margin-top:8px;font-weight:700;font-size:0.85rem;color:${cumple?'#1a7a2a':'#721c24'};">
  ${cumple?'✅ CUMPLE — Tarifas válidas':'⚠️ EXCEDE — Revisar tarifas'}
  </div>
  </div>`;
  const fb = document.getElementById('er-flujo');
  if(fb) fb.innerHTML = flujo.map(f=>`<tr>
  <td><strong>${f.anio}</strong></td>
  <td>${formatCOPM(f.csA)}</td><td>${formatCOPM(f.ciA)}</td>
  <td>${formatCOPM(f.caA)}</td><td>${formatCOPM(f.cotA)}</td>
  <td><strong>${formatCOPM(f.capA)}</strong></td>
  <td>${formatCOPM(f.recA)}</td>
  <td style="color:${f.saldo>=0?'#CC2200':'#2E8B34'};font-weight:700;">${f.saldo>=0?'+':''}${formatCOPM(f.saldo)}</td>
  <td>${f.recA<=f.capA?'<span class="badge badge-verde">OK</span>':'<span class="badge badge-rojo">Exc.</span>'}</td>
  </tr>`).join('');
  const iapDiv=document.getElementById('iap-live');
  if(iapDiv){
  const rows=Object.entries(det).map(([k,v])=>`<tr>
  <td>${{e1:'E1',e2:'E2',e3:'E3',e4:'E4',e5:'E5',e6:'E6',com:'Comercial',ind:'Industrial'}[k]}</td>
  <td style="text-align:right;">${v.cnt.toLocaleString('es-CO')}</td>
  <td style="text-align:right;">${formatCOP(Math.round(v.iap))}</td>
  <td style="text-align:right;"><strong>${formatCOP(Math.round(v.total))}</strong></td>
  </tr>`).join('');
  iapDiv.innerHTML=`<table style="width:100%;font-size:0.8rem;border-collapse:collapse;">
  <thead><tr style="background:#003366;color:white;"><th style="padding:5px;text-align:left;">Sector</th><th style="padding:5px;text-align:right;">Contrib.</th><th style="padding:5px;text-align:right;">IAP/usuario</th><th style="padding:5px;text-align:right;">Recaudo</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr style="background:#003366;color:white;font-weight:700;"><td style="padding:5px;" colspan="3">TOTAL RECAUDO IAP</td><td style="padding:5px;text-align:right;">${formatCOP(Math.round(recMes))}</td></tr></tfoot>
  </table>`;
  }
  ETR_D={mun:etrS('etr-municipio'),dpto:etrS('etr-dpto'),vig:etrS('etr-vigencia'),sec:etrS('etr-secretario'),
  totLum,lLed,lHid,lMerc,potKw,crTot,crL,crTA,wacc,vu,idP,faoML,faoMS,tKwh,hd,ceeMes,
  cseeMes,caanA,caanMes,cinvMes,caomMes,cAmb,cSga,cPol,cEst,cIca,cotrMes,expM,ornM,ctmaxMes,ctmaxA,
  recMes,supMes,cumple,tir,vpn,bc,flujo,det,
  kmTot:etrG('etr-km-tot'),kmIlum:etrG('etr-km-ilum'),parques:etrG('etr-parques')};
}

function calcFV() {
  const lum=parseFloat(document.getElementById('fv-lum')?.value)||50;
  const pot=parseFloat(document.getElementById('fv-pot')?.value)||100;
  const horas=parseFloat(document.getElementById('fv-horas')?.value)||12;
  const diasAut=parseFloat(document.getElementById('fv-dias-aut')?.value)||2;
  const hsp=parseFloat(document.getElementById('fv-hsp')?.value)||5.2;
  const efic=parseFloat(document.getElementById('fv-efic')?.value)/100||0.85;
  const volt=parseFloat(document.getElementById('fv-volt')?.value)||24;
  const dod=parseFloat(document.getElementById('fv-dod')?.value)/100||0.70;
  const panelWp=parseFloat(document.getElementById('fv-panel-wp')?.value)||400;
  const batAh=parseFloat(document.getElementById('fv-bat-ah')?.value)||200;
  const precPanel=parseFloat(document.getElementById('fv-precio-panel')?.value)||1200000;
  const precBat=parseFloat(document.getElementById('fv-precio-bat')?.value)||800000;
  const tarifaEv=parseFloat(document.getElementById('fv-tarifa-ev')?.value)||890;
  const vida=parseFloat(document.getElementById('fv-vida')?.value)||25;
  const omPct=parseFloat(document.getElementById('fv-om')?.value)/100||0.015;
  const cargaDia = lum*pot*horas/1000; 
  
  const capBatTotal = (cargaDia*diasAut*1000)/(volt*dod); 
  
  const numBat = Math.ceil(capBatTotal/batAh);
  
  const potFVkWp = cargaDia/(hsp*efic);
  
  const numPaneles = Math.ceil(potFVkWp*1000/panelWp);
  
  const invPaneles = numPaneles*precPanel;
  const invBaterias = numBat*precBat;
  const invOtros = (invPaneles+invBaterias)*0.25; 
  const invTotal = invPaneles+invBaterias+invOtros;
  
  const kwhAnual = cargaDia*365;
  const ahorroAnual = kwhAnual*tarifaEv;
  const omAnual = invTotal*omPct;
  const flujoNeto = ahorroAnual-omAnual;
  const payback = invTotal/flujoNeto;
  
  const wacc=0.1136;
  let vpn=-invTotal;
  for(let i=1;i<=vida;i++) vpn+=flujoNeto/Math.pow(1+wacc,i);
  
  const desc_iva = invTotal*0.19;
  const desc_renta = invTotal*0.50*0.33; 
  const invNeta = invTotal-desc_iva-desc_renta;
  const paybackNeto = invNeta/flujoNeto;
  
  const co2Anual = kwhAnual*0.000132;

  const res = document.getElementById('fv-resultados');
  if(res) res.innerHTML = `
  <div style="background:linear-gradient(135deg,#7a4a00,#E87722);color:white;border-radius:8px;padding:14px;margin-bottom:10px;">
  <div style="font-size:0.75rem;color:#FFE0A0;margin-bottom:6px;">DIMENSIONAMIENTO SISTEMA FV — SALP</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.8rem;">
  <div><div style="color:#FFE0A0;">Carga diaria</div><strong>${cargaDia.toFixed(1)} kWh/día</strong></div>
  <div><div style="color:#FFE0A0;">Potencia FV requerida</div><strong>${(potFVkWp).toFixed(2)} kWp</strong></div>
  <div><div style="color:#FFE0A0;">N° Paneles (${panelWp}Wp)</div><strong>${numPaneles} paneles</strong></div>
  <div><div style="color:#FFE0A0;">N° Baterías (${batAh}Ah/${volt}V)</div><strong>${numBat} baterías</strong></div>
  <div><div style="color:#FFE0A0;">Cap. batería requerida</div><strong>${capBatTotal.toFixed(0)} Ah</strong></div>
  <div><div style="color:#FFE0A0;">kWh generados/año</div><strong>${kwhAnual.toFixed(0).toLocaleString('es-CO')}</strong></div>
  </div>
  </div>
  ${[
  ['Paneles FV',formatCOP(Math.round(invPaneles)),''],
  ['Baterías',formatCOP(Math.round(invBaterias)),''],
  ['Controladores + Cableado + Inst.',formatCOP(Math.round(invOtros)),'25%'],
  ['INVERSIÓN TOTAL',formatCOP(Math.round(invTotal)),''],
  ['Ahorro energía/año',formatCOP(Math.round(ahorroAnual)),''],
  ['O&M anual',formatCOP(Math.round(omAnual)),''],
  ['Flujo neto anual',formatCOP(Math.round(flujoNeto)),''],
  ['Payback simple',payback.toFixed(1)+' años',''],
  ['CO₂ evitado/año',co2Anual.toFixed(1)+' ton',''],
  ].map(([k,v,sub])=>`
  <div style="display:flex;justify-content:space-between;padding:5px 8px;background:#F0F4F8;border-radius:5px;">
  <span style="color:#888;font-size:0.78rem;">${k}</span><strong style="font-size:0.8rem;">${v}</strong>
  </div>`).join('')}`;

  const finDiv = document.getElementById('fv-financiero');
  if(finDiv) finDiv.innerHTML = `
  <div style="background:linear-gradient(135deg,#1a4a1a,#2E8B34);color:white;border-radius:8px;padding:14px;">
  <div style="font-size:0.75rem;color:#A8D8A8;margin-bottom:8px;">ANÁLISIS FINANCIERO — LEY 1715/2014</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.79rem;">
  <div><div style="color:#A8D8A8;">Inversión bruta</div><strong>${formatCOP(Math.round(invTotal))}</strong></div>
  <div><div style="color:#A8D8A8;">Descuento IVA (Art.14)</div><strong style="color:#FFD700;">-${formatCOP(Math.round(desc_iva))}</strong></div>
  <div><div style="color:#A8D8A8;">Deducción renta (Art.11)</div><strong style="color:#FFD700;">-${formatCOP(Math.round(desc_renta))}</strong></div>
  <div><div style="color:#A8D8A8;">Inversión NETA</div><strong>${formatCOP(Math.round(invNeta))}</strong></div>
  <div><div style="color:#A8D8A8;">Payback con incentivos</div><strong>${paybackNeto.toFixed(1)} años</strong></div>
  <div><div style="color:#A8D8A8;">VPN al WACC 11.36%</div><strong style="color:${vpn>0?'#2ECC71':'#E74C3C'}">${formatCOPM(vpn)}</strong></div>
  </div>
  </div>`;
}

function calcFotometria() {
  const clase = gS('foto-clase');
  const flujo = gV('foto-flujo');
  const fu = gV('foto-fu') || 0.72;
  const fm = gV('foto-fm') || 0.80;
  const ancho = gV('foto-ancho');
  const espaciado = gV('foto-espaciado');
  const emin = gV('foto-emin');
  const emax = gV('foto-emax');
  const pot = gV('foto-potencia');

  const reqs = {M1:{em:150,uo:0.40,ul:0.70},M2:{em:75,uo:0.40,ul:0.70},M3:{em:30,uo:0.40,ul:0.60},M4:{em:15,uo:0.40,ul:null},P1:{em:15,uo:0.35,ul:null},P2:{em:8,uo:0.25,ul:null}};
  const req = reqs[clase] || reqs['M3'];

  let resultados = [];

  if(flujo && ancho && espaciado) {
  const emCalc = (flujo * fu * fm) / (espaciado * ancho);
  const okEm = emCalc >= req.em;
  resultados.push(['Em calculada (método lúmenes)', emCalc.toFixed(1)+' lux (req.≥'+req.em+')', okEm?'#2ECC71':'#E74C3C']);
  resultados.push(['Eficiencia energética', pot?(emCalc*ancho*espaciado/(pot*1000)).toFixed(2)+' lux·m²/W':'—', 'white']);
  }

  if(emin && emax) {
  const emMed = (emin+emax)/2;
  const uo = emin/emMed;
  const okUo = uo >= req.uo;
  resultados.push(['Uo = Emin/Eprom medido', uo.toFixed(3)+' (req.≥'+req.uo+')', okUo?'#2ECC71':'#E74C3C']);
  resultados.push(['Em medida (prom.)', emMed.toFixed(1)+' lux', 'white']);
  }

  if(resultados.length === 0) { setRes('res-fotometria','<div style="text-align:center;padding:20px;color:#aaa;">Ingresa al menos flujo+ancho+espaciado</div>'); return; }

  setRes('res-fotometria', boxAzul('🔆 VERIFICACIÓN RETILAP §560 — Clase '+clase, resultados) +
  alertBox('info','Requisito Em mínima clase '+clase+': '+req.em+' lux | Uo mín.: '+req.uo+(req.ul?' | Ul mín.: '+req.ul:''))
  );
}

function calcLiqIAP() {
  const sector = gS('liap-sector');
  const kwh = gV('liap-kwh');
  const tarifaE = gV('liap-tarifa-e');
  const tasa = gV('liap-tasa');
  const metodo = gS('liap-metodo');
  const periodos = gV('liap-periodos') || 1;

  if(!kwh && !tarifaE) { setRes('res-liap','<div style="text-align:center;padding:20px;color:#aaa;">Ingresa consumo y tarifa</div>'); return; }
  if(sector === 'of') {
  setRes('res-liap', alertBox('info','⚖️ Sector Oficial — Exento de IAP según Acuerdo Municipal.<br>Base: Art. 294 CP + MME Concepto 1-2019-014567.'));
  return;
  }

  const factura = kwh * tarifaE;
  let iap;
  if(metodo === 'pct') iap = factura * (tasa/100);
  else if(metodo === 'kwh') iap = kwh * tasa;
  else iap = tasa;

  const totalPeriodos = iap * periodos;
  const anual = iap * 12;

  setRes('res-liap', boxAzul('💰 LIQUIDACIÓN IAP', [
  ['Consumo energía', kwh.toLocaleString('es-CO')+' kWh', 'white'],
  ['Factura energía', fmtCOP(factura), 'white'],
  ['Tarifa IAP aplicada', tasa+(metodo==='pct'?'%':metodo==='kwh'?' $/kWh':' $ fijo'), '#A8C4E0'],
  ['IAP mensual', fmtCOP(iap), '#FFD700'],
  ['Total '+periodos+' período(s)', fmtCOP(totalPeriodos), '#2ECC71'],
  ['Proyección anual', fmtCOP(anual), '#A8C4E0'],
  ]) + alertBox('info','Base: Art. 338 CP + CE Sent. Unif. 22161/2019 + Art. 351 Ley 1819/2016'));
}

function calcMora() {
  const capital = gV('mora-capital');
  const fechaIni = gS('mora-fecha-ini');
  const fechaFin = gS('mora-fecha-fin');
  const tasa = gV('mora-tasa');
  if(!capital || !fechaIni || !fechaFin || !tasa) return;

  const d1 = new Date(fechaIni);
  const d2 = new Date(fechaFin);
  const dias = Math.max(0, Math.floor((d2-d1)/(1000*60*60*24)));
  const tasaDiaria = Math.pow(1+tasa/100, 1/365) - 1;
  const intereses = capital * (Math.pow(1+tasaDiaria, dias) - 1);
  const total = capital + intereses;

  setRes('res-mora', boxAzul('⚖️ INTERESES DE MORA — Art. 634 ET', [
  ['Capital en mora', fmtCOP(capital), 'white'],
  ['Días en mora', dias.toLocaleString('es-CO'), '#A8C4E0'],
  ['Tasa usura SFC (EA)', tasa.toFixed(2)+'%', '#A8C4E0'],
  ['Tasa diaria equivalente', (tasaDiaria*100).toFixed(6)+'%', '#A8C4E0'],
  ['Intereses de mora', fmtCOP(intereses), '#FFD700'],
  ['TOTAL A PAGAR', fmtCOP(total), '#2ECC71'],
  ]) + alertBox('warning','Art. 634 ET: Intereses = tasa de usura certificada por SFC, liquidada diariamente desde el vencimiento.'));
}

function calcPrescripcion() {
  const fechaCaus = gS('presc-fecha');
  const interrumpida = gS('presc-interrupcion');
  const fechaInt = gS('presc-fecha-int');
  if(!fechaCaus) return;

  const hoy = new Date();
  const d1 = new Date(fechaCaus);
  const prescripcion5 = new Date(d1);
  prescripcion5.setFullYear(prescripcion5.getFullYear()+5);

  let prescripcionFinal = prescripcion5;
  let analisis = '';

  if(interrumpida === 'si' && fechaInt) {
  const dInt = new Date(fechaInt);
  const prescripcion5Int = new Date(dInt);
  prescripcion5Int.setFullYear(prescripcion5Int.getFullYear()+5);
  prescripcionFinal = prescripcion5Int;
  analisis = 'El término se interrumpió con el mandamiento de pago y empezó a correr nuevamente desde esa fecha.';
  }

  const prescrita = hoy > prescripcionFinal;
  const diasRestantes = Math.floor((prescripcionFinal - hoy)/(1000*60*60*24));

  setRes('res-prescripcion', boxAzul('⏰ PRESCRIPCIÓN — Art. 817 ET', [
  ['Fecha causación IAP', d1.toLocaleDateString('es-CO'), 'white'],
  ['Prescripción (5 años)', prescripcionFinal.toLocaleDateString('es-CO'), '#FFD700'],
  ['Estado hoy', prescrita?'⚠️ PRESCRITA':'✅ NO PRESCRITA', prescrita?'#E74C3C':'#2ECC71'],
  [prescrita?'Días vencidos':'Días restantes', Math.abs(diasRestantes).toLocaleString('es-CO'), prescrita?'#E74C3C':'#2ECC71'],
  ]) + alertBox(prescrita?'danger':'success',
  prescrita
  ? '⚠️ La acción de cobro está PRESCRITA. El contribuyente puede alegar la prescripción como excepción (Art. 830 ET).'
  : '✅ La acción de cobro está VIGENTE. Plazo: '+Math.abs(diasRestantes)+' días para ejercer el cobro coactivo.'
  ) + (analisis ? alertBox('info',analisis) : ''));
}

function calcProyeccionRecaudo() {
  const ctmax = parseFloat(document.getElementById('tar-ctmax-ref')?.value)||0;
  const nContrib = parseFloat(document.getElementById('tar-n-contrib')?.value)||0;
  if(!nContrib || TARIFAS_DB.length===0) return;
  const nSectores = TARIFAS_DB.filter(t=>t.tarifa>0).length||1;
  const contribPorSector = Math.floor(nContrib/nSectores);
  let recaudoMes = 0;
  const tarE = parseFloat(document.getElementById('tar-tarifa-energia')?.value)||890;
  const consumoProm = parseFloat(document.getElementById('tar-consumo')?.value)||180;
  
  TARIFAS_DB.forEach(t => {
  if(t.tarifa <= 0) return;
  let iap = 0;
  const factura = consumoProm * tarE;
  if(t.metodo==='pct') iap = factura*(t.tarifa/100);
  else if(t.metodo==='kwh') iap = consumoProm*t.tarifa;
  else iap = parseFloat(t.tarifa)||0;
  if(t.tope && parseFloat(t.tope)>0 && iap>parseFloat(t.tope)) iap=parseFloat(t.tope);
  recaudoMes += iap * contribPorSector;
  });
  
  const cumple = ctmax > 0 ? recaudoMes <= ctmax : null;
  const el1=document.getElementById('tar-total-contrib');
  const el2=document.getElementById('tar-recaudo-mes');
  const el3=document.getElementById('tar-recaudo-anual');
  if(el1) el1.textContent = nContrib.toLocaleString('es-CO');
  if(el2) el2.textContent = '$'+Math.round(recaudoMes).toLocaleString('es-CO');
  if(el3) el3.textContent = '$'+Math.round(recaudoMes*12).toLocaleString('es-CO');
  
  const resDiv = document.getElementById('tar-art351-result');
  if(resDiv && ctmax > 0) {
  resDiv.innerHTML = `<div class="alert ${cumple?'alert-success':'alert-danger'}">
  ${cumple?'✅':'⚠️'} <strong>Art. 351 Ley 1819/2016:</strong> 
  Recaudo proyectado ${cumple?'CUMPLE':'EXCEDE'} el límite del CTMAX.<br>
  Recaudo: $${Math.round(recaudoMes).toLocaleString('es-CO')}/mes vs CTMAX: $${ctmax.toLocaleString('es-CO')}/mes 
  (${(recaudoMes/ctmax*100).toFixed(1)}%)
  </div>`;
  }
}

function calcROI() {
  const n = gV('roi-cant');
  const potAct = gV('roi-pot-act');
  const potLed = gV('roi-pot-led');
  const horas = gV('roi-horas');
  const tarifa = gV('roi-tarifa');
  const costoLed = gV('roi-costo-led');
  const inst = gV('roi-inst');
  const vida = gV('roi-vida') || 25;
  const wacc = gV('roi-wacc')/100 || 0.1136;
  const crecE = gV('roi-crec-e')/100 || 0.085;
  if(!n || !potAct || !potLed) { setRes('res-roi','<div style="padding:20px;color:#aaa;text-align:center;">Ingresa los datos</div>'); return; }

  const kwhAct = n*potAct/1000*horas*365;
  const kwhLed = n*potLed/1000*horas*365;
  const ahorroKwh = kwhAct - kwhLed;
  const pctAhorro = kwhAct > 0 ? (ahorroKwh/kwhAct*100) : 0;
  const invTotal = n*(costoLed+inst);
  const om = invTotal*0.01;
  const co2 = ahorroKwh*0.000132;
  let vpn = -invTotal;
  let payback = 0;
  let acum = -invTotal;
  for(let i=1;i<=vida;i++){
  const ahorroCOP = ahorroKwh * tarifa * Math.pow(1+crecE,i) - om;
  vpn += ahorroCOP/Math.pow(1+wacc,i);
  if(acum < 0) { acum += ahorroCOP; if(acum >= 0) payback = i; }
  }
  let tirL=-0.9,tirH=5;
  for(let it=0;it<100;it++){
  const tm=(tirL+tirH)/2; let npv=-invTotal;
  for(let i=1;i<=vida;i++) npv+=(ahorroKwh*tarifa*Math.pow(1+crecE,i)-om)/Math.pow(1+tm,i);
  if(npv>0) tirL=tm; else tirH=tm;
  if(tirH-tirL<0.0001) break;
  }
  const tir=(tirL+tirH)/2;

  setRes('res-roi', boxAzul('💡 ROI MODERNIZACIÓN LED — RETILAP §210.3.3', [
  ['Inversión total', fmtCOP(invTotal), 'white'],
  ['Ahorro energía/año', ahorroKwh.toFixed(0).toLocaleString('es-CO')+' kWh ('+pctAhorro.toFixed(1)+'%)', '#FFD700'],
  ['Ahorro económico año 1', fmtCOP(ahorroKwh*tarifa), '#FFD700'],
  ['Reducción CO₂/año', co2.toFixed(1)+' ton', '#2ECC71'],
  ['Payback simple', payback ? payback+' años' : '>'+vida, '#A8C4E0'],
  ['TIR', (tir*100).toFixed(2)+'% vs WACC '+(wacc*100).toFixed(2)+'%', tir>wacc?'#2ECC71':'#E74C3C'],
  ['VPN ('+vida+' años)', fmtCOP(vpn), vpn>0?'#2ECC71':'#E74C3C'],
  ]) + alertBox(tir>wacc?'success':'warning',
  tir>wacc ? '✅ Proyecto RENTABLE: TIR('+( tir*100).toFixed(2)+'%) > WACC('+(wacc*100).toFixed(2)+'%). VPN positivo confirma viabilidad financiera.'
  : '⚠️ TIR < WACC. Evaluar ajuste de inversión o subsidio Ley 1715/2014.'
  ));
}

function calcRed() {
  const P = gV('red-potencia');
  const V = gV('red-tension');
  const fp = gV('red-fp') || 0.95;
  const L = gV('red-longitud');
  const caidaMax = gV('red-caida-max') || 3;
  const material = gS('red-material');
  const temp = gV('red-temp') || 35;
  const fases = parseInt(gS('red-fases'))||1;
  if(!P || !V || !L) return;

  const rho = material === 'cu' ? 0.01724 : 0.0282; 
  const alpha = material === 'cu' ? 0.00393 : 0.00403;
  const rhoT = rho * (1 + alpha*(temp-20));

  const I = fases === 1 ? P/(V*fp) : P/(Math.sqrt(3)*V*fp);
  const deltaV = (caidaMax/100)*V;
  const sMin = (fases === 1 ? 2 : Math.sqrt(3)) * rhoT * L * I / deltaV;

  const calibres = [1.5,2.5,4,6,10,16,25,35,50,70,95,120];
  const calibreRec = calibres.find(c=>c>=sMin) || 120;

  const R = rhoT * L / calibreRec;
  const caidaReal = (fases===1?2:Math.sqrt(3)) * R * I / V * 100;

  const capacidades = {1.5:15,2.5:21,4:27,6:34,10:46,16:61,25:80,35:99,50:119,70:149,95:179,120:206};
  const Imax = capacidades[calibreRec] || 0;
  const factorTemp = temp > 30 ? 1 - 0.004*(temp-30) : 1;
  const ImaxCorr = Imax * factorTemp;
  const ok = I <= ImaxCorr;

  setRes('res-red', boxAzul('⚡ DIMENSIONAMIENTO RED ELÉCTRICA SALP', [
  ['Corriente calculada (I)', I.toFixed(2)+' A', 'white'],
  ['Sección mínima requerida', sMin.toFixed(2)+' mm²', '#A8C4E0'],
  ['Calibre recomendado', calibreRec+' mm² (AWG '+{1.5:'16',2.5:'14',4:'12',6:'10',10:'8',16:'6',25:'4',35:'2',50:'1/0',70:'2/0',95:'3/0',120:'4/0'}[calibreRec]+')', '#FFD700'],
  ['Caída de tensión real', caidaReal.toFixed(2)+'% '+(caidaReal<=caidaMax?'✅':'❌'), caidaReal<=caidaMax?'#2ECC71':'#E74C3C'],
  ['Capacidad corriente corregida', ImaxCorr.toFixed(1)+' A '+(ok?'✅':'❌ SOBREDIMENSIONAR'), ok?'#2ECC71':'#E74C3C'],
  ['Pérdidas en el conductor', fmtCOP(I*I*R*P/1000)+'/año est.', '#A8C4E0'],
  ]) + alertBox(ok&&caidaReal<=caidaMax?'success':'danger',
  ok&&caidaReal<=caidaMax?'✅ Calibre adecuado. Cumple caída de tensión y capacidad de corriente.':'⚠️ Revisar: '+(caidaReal>caidaMax?'Caída tensión supera el '+caidaMax+'%. ':'')+(!ok?'Corriente supera la capacidad. Usar calibre mayor.':'')
  ));
}

function calcSancion() {
  const tipo = gS('sanc-tipo');
  const base = gV('sanc-base');
  const meses = gV('sanc-meses');
  if(!base && tipo !== 'nodecl') return;

  let sancion = 0, articulo = '', formula = '';

  if(tipo === 'nodecl') {
  sancion = base * 0.10;
  articulo = 'Art. 643 ET';
  formula = '10% de los ingresos brutos del período';
  const minSancion = 1141000; 
  if(sancion < minSancion) { sancion = minSancion; formula += ' (mínimo sancionatorio)'; }
  } else if(tipo === 'inexact') {
  sancion = base * 1.00;
  articulo = 'Art. 647 ET';
  formula = '100% de la diferencia';
  } else if(tipo === 'extemp') {
  const pct = Math.min(meses * 0.05, 1.0);
  sancion = base * pct;
  articulo = 'Art. 641 ET';
  formula = '5% por mes o fracción de retardo (máx. 100%)';
  } else if(tipo === 'nocobro') {
  sancion = base * 0.50;
  articulo = 'Art. 668 ET';
  formula = '50% del impuesto no cobrado';
  }

  const reducida50 = sancion * 0.50;
  const reducida25 = sancion * 0.75;

  setRes('res-sancion', boxAzul('⚖️ SANCIÓN TRIBUTARIA — '+articulo, [
  ['Base de la sanción', fmtCOP(base), 'white'],
  ['Fórmula aplicada', formula, '#A8C4E0'],
  ['Sanción calculada', fmtCOP(sancion), '#FFD700'],
  ['Con reducción 50% (Art.640)', fmtCOP(reducida50), '#2ECC71'],
  ['Con reducción 25% (Art.640)', fmtCOP(reducida25), '#A8D8A8'],
  ]) + alertBox('warning','Art. 640 ET: Reducción del 50% si corrige antes del auto de inspección tributaria. Del 25% si corrige después.'));
}

function calcTribBase() {
  const metodo=document.getElementById('trib-metodo')?.value||'pct';
  const kwh=parseFloat(document.getElementById('trib-kwh')?.value)||180;
  const tarE=parseFloat(document.getElementById('trib-tarifa-e')?.value)||890;
  const pct=parseFloat(document.getElementById('trib-pct')?.value)||5.5;
  const factura=kwh*tarE;
  let iap,concepto;
  if(metodo==='pct'){iap=factura*(pct/100);concepto=`${pct}% × $${factura.toLocaleString('es-CO')} (factura)`;}
  else if(metodo==='kwh'){iap=kwh*pct;concepto=`$${pct}/kWh × ${kwh} kWh`;}
  else{iap=pct;concepto=`Valor fijo mensual`;}
  const div=document.getElementById('trib-base-result');
  if(div) div.innerHTML=`
  <div style="background:linear-gradient(135deg,#4a1a7a,#7a2daa);color:white;border-radius:8px;padding:14px;text-align:center;">
  <div style="font-size:0.75rem;color:#D0A0FF;margin-bottom:4px;">IAP mensual a cobrar</div>
  <div style="font-size:1.8rem;font-weight:900;color:#FFD700;">${formatCOP(Math.round(iap))}</div>
  <div style="font-size:0.75rem;color:#D0A0FF;margin-top:4px;">${concepto}</div>
  </div>`;
}

function calcularCostos() {
  
  const pot = parseFloat(document.getElementById('csee-potencia')?.value);
  const hrs = parseFloat(document.getElementById('csee-horas')?.value);
  const tarE = parseFloat(document.getElementById('csee-tarifa')?.value);
  if(!pot || !hrs || !tarE) {
  ['monto-csee','monto-cinv','monto-caom','monto-cotros','monto-ctmax',
  'total-csee-show','total-cinv-show','total-caom-show','total-cotros-show'].forEach(id => safeSet(id, '$0'));
  return;
  }
  
  const cargos = parseFloat(document.getElementById('csee-cargos')?.value)||0;
  const valAct = parseFloat(document.getElementById('cinv-valor')?.value)||0;
  const vida = parseFloat(document.getElementById('cinv-vidautil')?.value)||20;
  const wacc = parseFloat(document.getElementById('cinv-wacc')?.value)/100||0.1136;
  const exp = parseFloat(document.getElementById('cinv-expansion')?.value)||0;
  const pers = parseFloat(document.getElementById('caom-personal')?.value)||0;
  const mat = parseFloat(document.getElementById('caom-materiales')?.value)||0;
  const eq = parseFloat(document.getElementById('caom-equipos')?.value)||0;
  const adminPct = parseFloat(document.getElementById('caom-admin-pct')?.value)/100||0.15;

  const csee = pot * hrs * 365 * (tarE + cargos);
  safeSet('monto-csee', formatCOP(Math.round(csee)));

  const caan = valAct > 0 ? valAct*(wacc*Math.pow(1+wacc,vida))/(Math.pow(1+wacc,vida)-1) : 0;
  const cinv = caan + exp;
  safeSet('monto-cinv', formatCOP(Math.round(cinv)));

  const subtotal = pers+mat+eq;
  const caom = subtotal*(1+adminPct);
  safeSet('monto-caom', formatCOP(Math.round(caom)));

  const cot = ['cot-int','cot-amb','cot-sga','cot-pol','cot-fac','cot-ter'].reduce((s,id) => {
  const el = document.getElementById(id);
  return s + (el ? parseFloat(el.value)||0 : 0);
  }, 0);
  safeSet('monto-cotros', formatCOP(Math.round(cot)));

  const total = csee + cinv + caom + cot;
  safeSet('monto-ctmax', formatCOP(Math.round(total)));
  safeSet('total-csee-show', formatCOP(Math.round(csee)));
  safeSet('total-cinv-show', formatCOP(Math.round(cinv)));
  safeSet('total-caom-show', formatCOP(Math.round(caom)));
  safeSet('total-cotros-show', formatCOP(Math.round(cot)));
}

function calcularFinanciero() {
  const activos = parseFloat(document.getElementById('fin-activos')?.value);
  if(!activos || activos === 0) {
  ['fin-caan','fin-cinv-calc','fin-tir','fin-vpn','fin-payback','fin-bcr'].forEach(id=>safeSet(id,'—'));
  const tb=document.getElementById('tabla-flujo'); if(tb) tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:20px;color:#aaa;">Ingresa el valor de activos SALP para calcular</td></tr>';
  return;
  }
  activos = parseFloat(document.getElementById('fin-activos').value)||107186810506;
  const waccPct = parseFloat(document.getElementById('fin-wacc').value)||11.36;
  const wacc = waccPct/100;
  const vida = parseFloat(document.getElementById('fin-vida').value)||20;
  const id = parseFloat(document.getElementById('fin-id').value)/100||0.99;
  const inversion = parseFloat(document.getElementById('fin-inversion').value)||4200000000;
  const horizonte = parseInt(document.getElementById('fin-horizonte').value)||10;
  const ipp = parseFloat(document.getElementById('fin-ipp').value)/100||0.085;
  const ipc = parseFloat(document.getElementById('fin-ipc').value)/100||0.062;
  const caom1 = parseFloat(document.getElementById('fin-caom1').value)||555487684;
  const crecContrib = parseFloat(document.getElementById('fin-crec').value)/100||0.025;
  const recaudo = parseFloat(document.getElementById('fin-recaudo').value)||1313544797;
  const faom = parseFloat(document.getElementById('fin-faom').value)||0.074;
  const caan = activos * (wacc / (1 - Math.pow(1+wacc, -vida)));
  const cinvCalc = caan * id;
  const sendaFAOML = {2021:0.093,2022:0.097,2023:0.092,2024:0.086,2025:0.080,2026:0.074,2027:0.069,2028:0.063};
  const sendaDiv = document.getElementById('caom-senda');
  if(sendaDiv) {
  sendaDiv.innerHTML = Object.entries(sendaFAOML).map(([y,f]) =>
  `<span style="background:${y==='2026'?'#0055A5':'#E0E0E0'};color:${y==='2026'?'white':'#333'};padding:3px 8px;border-radius:12px;font-size:0.72rem;"><strong>${y}</strong>: ${f}</span>`
  ).join('');
  }
  let flujos = [], inversion_neg = -inversion;
  let vpn = inversion_neg;
  let paybackAnio = null;
  let acumRecaudo = inversion_neg;
  const cseeBase = parseFloat(document.getElementById('ctmax-csee') ? document.getElementById('ctmax-csee').value : 353147039)||353147039;
  const cotrBase = parseFloat(document.getElementById('ctmax-cotr') ? document.getElementById('ctmax-cotr').value : 356488744)||356488744;

  let tablaHTML = '';
  for(let i=1; i<=horizonte; i++) {
  const anio = 2026 + i - 1;
  const cseeAnio = cseeBase * Math.pow(1+ipp, i);
  const cinvAnio = cinvCalc * Math.pow(1+ipc*0.5, i);
  const caomAnio = caom1 * (sendaFAOML[anio] || 0.063) / 0.074 * Math.pow(1+ipc*0.7, i);
  const cotrAnio = cotrBase * Math.pow(1+ipc, i);
  const ctmaxAnio = cseeAnio + cinvAnio + caomAnio + cotrAnio;
  const recAnio = recaudo * Math.pow(1+crecContrib+ipc*0.5, i);
  const saldo = recAnio - ctmaxAnio;
  
  acumRecaudo += saldo;
  if(paybackAnio === null && acumRecaudo >= 0) paybackAnio = i;

  const pv = saldo / Math.pow(1+wacc, i);
  vpn += pv;
  flujos.push(saldo);

  const cumple = recAnio <= ctmaxAnio;
  const cumpleIcon = cumple ? '<span class="badge badge-verde">✅ Cumple</span>' : '<span class="badge badge-rojo">⚠️ Excede</span>';
  tablaHTML += `<tr>
  <td><strong>${anio}</strong></td>
  <td>${formatCOPM(cseeAnio)}</td>
  <td>${formatCOPM(cinvAnio)}</td>
  <td>${formatCOPM(caomAnio)}</td>
  <td>${formatCOPM(cotrAnio)}</td>
  <td><strong>${formatCOPM(ctmaxAnio)}</strong></td>
  <td>${formatCOPM(recAnio)}</td>
  <td style="color:${saldo>=0?'#CC2200':'#2E8B34'};font-weight:700;">${saldo>=0?'+':''}${formatCOPM(saldo)}</td>
  <td>${cumpleIcon}</td>
  </tr>`;
  }

  const tablaFlujo = document.getElementById('tabla-flujo');
  if(tablaFlujo) tablaFlujo.innerHTML = tablaHTML;
  let tirLow = -0.5, tirHigh = 5.0;
  for(let it=0; it<100; it++) {
  const tirMid = (tirLow+tirHigh)/2;
  let npv = inversion_neg;
  flujos.forEach((f,i) => { npv += f/Math.pow(1+tirMid,i+1); });
  if(npv > 0) tirLow = tirMid; else tirHigh = tirMid;
  if(tirHigh-tirLow < 0.0001) break;
  }
  const tir = (tirLow+tirHigh)/2;
  let pvBeneficios = 0, pvCostos = inversion;
  for(let i=1; i<=horizonte; i++) {
  const anio = 2026 + i - 1;
  const caomAnio = caom1 * (sendaFAOML[anio]||0.063)/0.074;
  const recAnio = recaudo * Math.pow(1+crecContrib, i);
  pvBeneficios += recAnio/Math.pow(1+wacc,i);
  pvCostos += caomAnio/Math.pow(1+wacc,i);
  }
  const bcr = pvBeneficios/pvCostos;

  safeSet('fin-caan', formatCOPM(caan*12));
  safeSet('fin-cinv-calc', formatCOPM(cinvCalc*12));
  safeSet('fin-tir', (tir*100).toFixed(2)+'%');
  safeSet('fin-vpn', formatCOPM(vpn));
  safeSet('fin-payback', paybackAnio ? paybackAnio+' años' : '>'+horizonte);
  safeSet('fin-bcr', bcr.toFixed(3));

  const semaforo = document.getElementById('fin-semaforo');
  if(semaforo) {
  const viable = tir > wacc;
  semaforo.innerHTML = `<div class="alert ${viable?'alert-success':'alert-danger'}">
  ${viable?'✅':'❌'} <strong>Viabilidad financiera:</strong> TIR(${(tir*100).toFixed(2)}%) ${viable?'>':'<'} WACC(${waccPct}%) — Proyecto ${viable?'VIABLE':'NO VIABLE'} según criterio CREG.<br>
  VPN ${vpn>0?'positivo (creación de valor)':'negativo (destrucción de valor)'}. B/C = ${bcr.toFixed(3)} ${bcr>1?'(proyecto rentable)':'(proyecto no rentable)'}.
  </div>`;
  }
}

function calcularIndicadores() {
  const total = parseFloat(document.getElementById('ind-total').value)||720;
  const serv = parseFloat(document.getElementById('ind-servicio').value)||712;
  const fallas = parseFloat(document.getElementById('ind-fallas').value)||14;
  const indisp = parseFloat(document.getElementById('ind-indisp').value)||8;

  const id = (serv/total*100).toFixed(2);
  const tmpr = fallas > 0 ? (indisp/fallas).toFixed(1) : '—';
  const mttf = fallas > 0 ? ((serv-indisp)/fallas).toFixed(1) : '—';
  const okID = parseFloat(id) >= 98;
  const okTMPR = parseFloat(tmpr) <= 48;

  const div = document.getElementById('res-indicadores');
  if(!div) return;
  div.innerHTML = `
  <div style="display:flex;flex-direction:column;gap:7px;">
  <div style="padding:8px 12px;border-radius:7px;background:${okID?'#D4EDDA':'#F8D7DA'};display:flex;justify-content:space-between;">
  <span style="font-size:0.82rem;font-weight:700;">ID — Disponibilidad</span>
  <strong style="color:${okID?'#1a7a2a':'#721c24'};">${id}% ${okID?'✅ ≥98%':'❌ <98%'}</strong>
  </div>
  <div style="padding:8px 12px;border-radius:7px;background:${okTMPR?'#D4EDDA':'#FFF3CD'};display:flex;justify-content:space-between;">
  <span style="font-size:0.82rem;font-weight:700;">TMPR — Tiempo Med. Reparación</span>
  <strong>${tmpr} horas ${okTMPR?'✅':'⚠️'}</strong>
  </div>
  <div style="padding:8px 12px;border-radius:7px;background:#F0F4F8;display:flex;justify-content:space-between;">
  <span style="font-size:0.82rem;font-weight:700;">MTTF — Tiempo Med. Entre Fallas</span>
  <strong>${mttf} horas</strong>
  </div>
  </div>`;
}

function calcularSimulacion() {
  const flujo = parseFloat(document.getElementById('sim-flujo')?.value);
  const ancho = parseFloat(document.getElementById('sim-ancho')?.value);
  if(!flujo || !ancho) {
  ['res-iluminancia','res-cumple','res-uniformidad','res-consumo'].forEach(id=>safeSet(id,'—'));
  const alertSim=document.getElementById('alert-sim'); if(alertSim) alertSim.innerHTML='';
  return;
  }
  try {
  const via = document.getElementById('sim-via').value;
  const ancho = parseFloat(document.getElementById('sim-ancho').value) || 7;
  const flujo = parseFloat(document.getElementById('sim-flujo').value) || 14500;
  const altura = parseFloat(document.getElementById('sim-altura').value) || 9;
  const espaciado = parseFloat(document.getElementById('sim-espaciado').value) || 32;
  const fm = parseFloat(document.getElementById('sim-fm').value) || 0.80;
  const fu = parseFloat(document.getElementById('sim-fu').value) || 0.72;
  const potencia = parseFloat(document.getElementById('sim-potencia').value) || 100;
  const Em = (flujo * fu * fm) / (espaciado * ancho);
  const uniformidad = 0.35 + Math.random()*0.15; 
  const consumoM2 = potencia / (espaciado * ancho);

  document.getElementById('res-iluminancia').textContent = Em.toFixed(1);
  document.getElementById('res-uniformidad').textContent = uniformidad.toFixed(2);
  document.getElementById('res-consumo').textContent = consumoM2.toFixed(3);

  const req = retilap[via].luxMin;
  document.getElementById('sim-req').textContent = req + ' lux req.';
  const cumple = Em >= req;
  const kpiCumple = document.getElementById('kpi-cumple');
  kpiCumple.className = 'kpi ' + (cumple ? 'verde' : 'rojo');
  document.getElementById('res-cumple').textContent = cumple ? '✅ Cumple' : '❌ No cumple';

  const pct = Math.min(100, (Em / 200)*100);
  document.getElementById('bar-iluminancia').style.width = pct + '%';
  document.getElementById('bar-iluminancia').className = 'progress-bar ' + (cumple ? 'verde' : 'rojo');

  const alertSim = document.getElementById('alert-sim');
  alertSim.innerHTML = cumple
  ? `<div class="alert alert-success">✅ Diseño cumple RETILAP Clase ${via} — Em=${Em.toFixed(1)} lux ≥ ${req} lux requeridos. Uo=${uniformidad.toFixed(2)} ≥ ${retilap[via].uo}.</div>`
  : `<div class="alert alert-danger">❌ INCUMPLIMIENTO: Em=${Em.toFixed(1)} lux < ${req} lux requerido por RETILAP Clase ${via}. Aumentar flujo, reducir espaciado o aumentar altura.</div>`;

  dibujarIsolux(Em, via);
  } catch(e) {}
}

function calcularTarifa() {
  var consumo = parseFloat(document.getElementById('tar-consumo')?.value);
  if(!consumo) { safeSet('monto-iap','$0'); safeSet('concepto-tarifa','Ingresa el consumo'); return; }
  const estrato = document.getElementById('tar-estrato').value;
  consumo = parseFloat(document.getElementById('tar-consumo').value)||0;
  const tarifaE = parseFloat(document.getElementById('tar-tarifa-energia').value)||890;
  const metodo = document.getElementById('tar-metodo').value;
  const pct = parseFloat(document.getElementById('tar-pct').value)||4.5;

  let iap = 0, concepto = '';
  const base = tarifasBase[estrato];
  const valorFactura = consumo * tarifaE;

  if(estrato === 'of') {
  iap = 0; concepto = 'Sector oficial — Exento de IAP por acuerdo municipal';
  } else if(['com','ind'].includes(estrato)) {
  iap = consumo * (base.kwh||0);
  concepto = `${base.kwh||0}/kWh × ${consumo} kWh`;
  } else {
  if(metodo === 'consumo') {
  iap = valorFactura * (pct/100);
  if(base.tope && iap > base.tope) iap = base.tope;
  concepto = `${pct}% × ${valorFactura.toLocaleString('es-CO')} (factura energía) ${base.tope?'| Tope: '+formatCOP(base.tope):''}`;
  } else if(metodo === 'fijo') {
  iap = base.tope * (pct/4.5);
  concepto = `Valor fijo estrato ${estrato}`;
  } else {
  iap = consumo * pct;
  concepto = `${pct} $/kWh × ${consumo} kWh`;
  }
  }

  safeSet('monto-iap', formatCOP(iap));
  safeSet('concepto-tarifa', concepto);
}

function calcularURE() {
  const cant = parseFloat(document.getElementById('ure-cant').value)||500;
  const potActual = parseFloat(document.getElementById('ure-pot-actual').value)||250;
  const potLed = parseFloat(document.getElementById('ure-pot-led').value)||100;
  const horas = parseFloat(document.getElementById('ure-horas').value)||12;
  const tarifa = parseFloat(document.getElementById('ure-tarifa').value)||890;
  const costoLed = parseFloat(document.getElementById('ure-costo-led').value)||850000;

  const kwhActual = cant * potActual/1000 * horas * 365;
  const kwhLed = cant * potLed/1000 * horas * 365;
  const ahorroKwh = kwhActual - kwhLed;
  const ahorroPct = (ahorroKwh/kwhActual*100).toFixed(1);
  const ahorroCOP = ahorroKwh * tarifa;
  const inversionTotal = cant * costoLed;
  const payback = inversionTotal / ahorroCOP;
  const ahorroTon = (ahorroKwh * 0.000132).toFixed(1); 

  const div = document.getElementById('res-ure');
  if(!div) return;
  div.innerHTML = `
  <div style="background:linear-gradient(135deg,#1a4a1a,#2E8B34);color:white;border-radius:10px;padding:14px;">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
  <div><div style="font-size:0.7rem;color:#A8D8A8;">Ahorro anual kWh</div><div style="font-size:1.3rem;font-weight:800;">${ahorroKwh.toLocaleString('es-CO')} kWh</div></div>
  <div><div style="font-size:0.7rem;color:#A8D8A8;">Reducción energía</div><div style="font-size:1.3rem;font-weight:800;">${ahorroPct}%</div></div>
  <div><div style="font-size:0.7rem;color:#A8D8A8;">Ahorro anual COP</div><div style="font-size:1.3rem;font-weight:800;">${formatCOP(ahorroCOP)}</div></div>
  <div><div style="font-size:0.7rem;color:#A8D8A8;">Payback</div><div style="font-size:1.3rem;font-weight:800;">${payback.toFixed(1)} años</div></div>
  <div><div style="font-size:0.7rem;color:#A8D8A8;">Inversión total</div><div style="font-size:1.1rem;font-weight:700;">${formatCOP(inversionTotal)}</div></div>
  <div><div style="font-size:0.7rem;color:#A8D8A8;">Reducción CO₂/año</div><div style="font-size:1.1rem;font-weight:700;">${ahorroTon} ton</div></div>
  </div>
  </div>`;
}

function cerrarModal(e) {
  if(e.target.id === 'modal-overlay') document.getElementById('modal-overlay').classList.remove('show');
}

function clearFields(ids) { ids.forEach(id=>setVal(id,'')); }

function coberturaActualizarTabla() {
  const datos = DB.get('cobertura');
  const tbody = document.querySelector('#page-cobertura table tbody');
  if(!tbody) return;
  if(datos.length === 0) {
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#aaa;">Sin diagnóstico. Complete el formulario y guarde.</td></tr>';
  return;
  }
  const badgeMap={'Óptimo':'badge-verde','Bueno':'badge-azul','Aceptable':'badge-amarillo','Deficiente':'badge-rojo','Sin iluminar':'badge-rojo'};
  tbody.innerHTML = datos.map(d=>`<tr>
  <td>${d.zona}</td>
  <td>${d.longKm} km</td>
  <td>${d.lumExist}</td>
  <td>${d.lumReq>0?((d.lumExist/d.lumReq*100).toFixed(1)+'%'):'—'}</td>
  <td><span class="badge ${badgeMap[d.estado]||'badge-gris'}">${d.estado}</span></td>
  </tr>`).join('');
}

function coberturaExportar() {
  const muni=getMuni();
  const txt='INFORME COBERTURA SALP\nMunicipio: '+muni+'\nFecha: '+getFecha()+'\nFUCDESCOC — NIT 900.517.521-0\n';
  descargarArchivo(txt,'Informe_Cobertura_'+muni+'.doc','application/msword');
  alert('✅ Informe de cobertura descargado.');
}

function coberturaGenerarETR() {
  if(typeof calcETR==='function') calcETR();
  showPage('datos-etr');
  setTimeout(()=>{ const t5=document.getElementById('etr-t5'); if(t5){ const btn=document.querySelector('[onclick*="etr-t5"]'); if(btn) showTab(btn,'etr-t5'); } },300);
}

function coberturaGuardar() {
  
  const inputs = document.querySelectorAll('#page-cobertura .form-group input, #page-cobertura .form-group select');
  if(!inputs.length) { showToast('Completa el formulario de diagnóstico', 'warning'); return; }

  const zona    = inputs[0]?.value || '';
  const tipoVia = inputs[1]?.value || '';
  const clase   = inputs[2]?.value || '';
  const longKm  = parseFloat(inputs[3]?.value)||0;
  const lumExist= parseInt(inputs[4]?.value)||0;
  const lumReq  = parseInt(inputs[5]?.value)||0;
  const emCampo = parseFloat(inputs[6]?.value)||0;
  const estado  = inputs[7]?.value || 'Aceptable';

  if(!zona) { showToast('⚠️ Ingresa la zona o barrio', 'warning'); return; }

  const item = { zona, tipoVia, clase, longKm, lumExist, lumReq, emCampo, estado };
  COBERTURA_DB.push(item);
  DB.add('cobertura', item);
  coberturaActualizarTabla();
  showToast('✅ Diagnóstico de '+zona+' guardado');
}

function conectarFormLuminarias() {
  
  const mapeo = {
  'lum-reg-codigo': null, 
  'lum-reg-tec': null,
  'lum-reg-pot': null,
  'lum-reg-flujo': null,
  'lum-reg-zona': null,
  'lum-reg-anio': null,
  'lum-reg-estado': null,
  };
  
  const tabReg = document.getElementById('tab-registro');
  if(tabReg) {
  const inputs = tabReg.querySelectorAll('input, select');
  const campos = ['lum-reg-codigo','lum-reg-tec','lum-reg-pot','lum-reg-flujo','lum-reg-irc','lum-reg-ip','lum-reg-anio','lum-reg-vida','lum-reg-zona','lum-reg-valor'];
  inputs.forEach((inp, i) => { if(campos[i] && !inp.id) inp.id = campos[i]; });
  
  const estadoSelect = tabReg.querySelector('select');
  if(estadoSelect && !document.getElementById('lum-reg-estado')) {
  
  }
  }
}

function confirmar(msg) { return confirm(msg); }

function descargarArchivo(contenido, nombre, tipo) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function descargarLiqIAP() {
  calcLiqIAP();
  const nombre = gS('liap-nombre') || 'Contribuyente';
  const nit = gS('liap-nit') || '—';
  const kwh = gV('liap-kwh');
  const tarifaE = gV('liap-tarifa-e');
  const tasa = gV('liap-tasa');
  const metodo = gS('liap-metodo');
  const periodos = gV('liap-periodos') || 1;
  const factura = kwh * tarifaE;
  let iap = metodo==='pct' ? factura*(tasa/100) : metodo==='kwh' ? kwh*tasa : tasa;
  const muni = document.getElementById('etr-municipio')?.value || 'Municipio';
  const txt = `LIQUIDACIÓN IMPUESTO DE ALUMBRADO PÚBLICO\nMunicipio: ${muni} | FUCDESCOC — NIT 900.517.521-0\nFecha: ${new Date().toLocaleDateString('es-CO')}\n\nCONTRIBUYENTE: ${nombre}\nNIT/CC: ${nit}\nConsumo: ${kwh} kWh/mes | Tarifa energía: $${tarifaE}/kWh\nTarifa IAP: ${tasa}${metodo==='pct'?'%':' $/kWh'}\n\nIAP MENSUAL: ${fmtCOP(iap)}\nTOTAL ${periodos} PERÍODO(S): ${fmtCOP(iap*periodos)}\n\nBase legal: Art. 338 CP, Ley 97/1913, Ley 1819/2016 Art.349-353, CE Sent. 22161/2019`;
  if(window.descargarArchivo) descargarArchivo(txt, 'Liquidacion_IAP_'+nombre+'.txt', 'text/plain;charset=utf-8');
  else alert(txt);
}

function descargarModeloAcuerdo() {
  const muni=getMuni(); const fecha=getFecha();
  const ctmax=window.ETR_D?.ctmaxMes||0;
  let txt='ACUERDO N. ___ DE '+new Date().getFullYear()+'\n';
  txt+='"POR EL CUAL SE ESTABLECE EL IMPUESTO DE ALUMBRADO PUBLICO"\n\n';
  txt+='EL CONCEJO MUNICIPAL DE '+muni.toUpperCase()+'\n\n';
  txt+='CONSIDERANDO:\n';
  txt+='- Ley 97/1913 y Ley 84/1915: habilitacion legal IAP\n';
  txt+='- Ley 1819/2016 Arts. 349-353: regimen tributario\n';
  txt+='- Res. CREG 101013/2022: metodologia CTMAX\n';
  txt+='- CE Sent. Unif. 22161/2019: elementos tributarios (vinculante)\n';
  txt+='- CE Sent. 23103/2020: ETR como requisito previo\n';
  txt+='- CC C-272/2022: autogeneracion excluida de base gravable\n';
  txt+='- CE Sent. 27841/2023: obligatoriedad CREG 101013/2022\n\n';
  txt+='ARTICULO 1. HECHO GENERADOR: Consumo de energia electrica.\n';
  txt+='ARTICULO 2. SUJETO ACTIVO: Municipio de '+muni+'.\n';
  txt+='ARTICULO 3. SUJETO PASIVO: Usuarios energia electrica. AGPE solo por consumo de red.\n';
  txt+='ARTICULO 4. BASE GRAVABLE: Factura energia (E1-E6) o kWh (Comercial/Industrial).\n';
  txt+='ARTICULO 5. TARIFAS: [Ver ETR vigente. CTMAX ref.: $'+(ctmax?Math.round(ctmax).toLocaleString('es-CO'):'___')+'/mes]\n';
  txt+='ARTICULO 6. DESTINACION: 100% al SALP (Art. 350 Ley 1819/2016).\n';
  txt+='ARTICULO 7. ETR: Soporte en ETR CREG 101013/2022. Vigencia 4 anos.\n';
  txt+='ARTICULO 8. VIGENCIA: Desde sancion y publicacion.\n\n';
  txt+='Municipio de '+muni+' | '+fecha+'\nFUCDESCOC — NIT 900.517.521-0';
  descargarArchivo(txt,'Modelo_Acuerdo_IAP_'+muni+'.doc','application/msword');
  alert('✅ Modelo de Acuerdo descargado.');
}

function dibujarIsolux(Em, via) {
  const canvas = document.getElementById('canvas-iso');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  
  ctx.fillStyle = '#0d1b2a';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for(let x=0;x<canvas.width;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
  for(let y=0;y<canvas.height;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
  
  const colors = ['#FFD700','#FFA500','#FF6B35','#3399CC','#0055A5'];
  const radii = [0.4,0.5,0.6,0.75,0.9];
  const cx = canvas.width/2, cy = canvas.height/2;
  radii.forEach((r,i) => {
  ctx.beginPath();
  ctx.ellipse(cx, cy, r*220, r*60, 0, 0, Math.PI*2);
  ctx.strokeStyle = colors[i];
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4,4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = colors[i];
  ctx.font = '10px monospace';
  ctx.fillText((Em*(1-r*0.7)).toFixed(0)+' lx', cx+r*220+4, cy);
  });
  
  [cx-280, cx-140, cx, cx+140, cx+280].forEach(px => {
  ctx.beginPath(); ctx.arc(px, cy, 5, 0, Math.PI*2);
  ctx.fillStyle = '#FFD700'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(px,cy+5); ctx.lineTo(px,canvas.height);
  ctx.strokeStyle='rgba(255,215,0,0.3)'; ctx.lineWidth=1; ctx.stroke();
  });
  ctx.fillStyle = '#7AADCF'; ctx.font = '11px Segoe UI';
  ctx.fillText('← 140m espaciado →', 10, 20);
  ctx.fillText(`Em = ${Em.toFixed(1)} lux | Clase ${via} RETILAP`, 10, canvas.height-10);
}

function etrG(id) { const el=document.getElementById(id); return el?parseFloat(el.value)||0:0; }

function etrS(id) { const el=document.getElementById(id); return el?el.value:''; }

function expansionActualizarKPIs(proyectos) {
  const invTotal = proyectos.reduce((s,p)=>s+(p.inversion||0),0);
  const lumTotal = proyectos.reduce((s,p)=>s+(p.lums||0),0);
  const mercs = proyectos.filter(p=>p.tipo==='Reposición').reduce((s,p)=>s+(p.lums||0),0);
  const kpis = document.querySelectorAll('#page-expansiones .kpi .kpi-value');
  if(kpis[0]) kpis[0].textContent = proyectos.length;
  if(kpis[1]) kpis[1].textContent = lumTotal.toLocaleString('es-CO');
  if(kpis[2]) kpis[2].textContent = mercs;
  if(kpis[3]) kpis[3].textContent = invTotal>=1e9?'$'+(invTotal/1e9).toFixed(1)+'B':'$'+(invTotal/1e6).toFixed(0)+'M';
}

function expansionActualizarTabla() {
  const proyectos = DB.get('expansion');
  const tbody = document.querySelector('#page-expansiones table tbody') ||
  document.getElementById('exp-tabla-body');
  if(!tbody) return;
  if(proyectos.length === 0) {
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#aaa;">Sin proyectos. Use "➕ Nuevo proyecto".</td></tr>';
  expansionActualizarKPIs(proyectos);
  return;
  }
  const badgeMap={'Ejecutado':'badge-verde','En ejecución':'badge-azul','Programado':'badge-amarillo','Planeado':'badge-gris'};
  tbody.innerHTML = proyectos.map((p,i)=>`<tr>
  <td>${i+1}</td>
  <td><strong>${p.nombre}</strong></td>
  <td>${p.zona||'—'}</td>
  <td>${p.tipo}</td>
  <td>${p.lums||'—'}</td>
  <td>$${(p.inversion||0).toLocaleString('es-CO')}</td>
  <td>${p.anio}</td>
  <td><span class="badge ${badgeMap[p.estado]||'badge-gris'}">${p.estado}</span></td>
  </tr>`).join('');
  expansionActualizarKPIs(proyectos);
}

function expansionGantt() {
  const proyectos=window.EXPANSION_DB&&window.EXPANSION_DB.length>0?window.EXPANSION_DB:[{nombre:'Sin proyectos registrados',inicio:2024,dur:1,tipo:'Expansion'}];
  const colors={'Expansion':'#0055A5','Modernizacion':'#2E8B34','Reposicion':'#E87722','Tecnologico':'#CC2200','Ornamental':'#9B59B6'};
  const W=900, rowH=36, pad={left:200,top:50,right:20,bottom:40};
  const cW=W-pad.left-pad.right;
  const h=proyectos.length*rowH+pad.top+pad.bottom;
  let svg='<svg width="'+W+'" height="'+h+'" xmlns="http:
  svg+='<rect width="'+W+'" height="'+h+'" fill="#1a2d4a" rx="10"/>';
  svg+='<text x="'+W/2+'" y="28" text-anchor="middle" fill="#FFD700" font-size="14" font-weight="bold" font-family="Arial">CRONOGRAMA GANTT — PLAN SALP '+new Date().getFullYear()+'</text>';
  const anios=[2024,2025,2026,2027,2028];
  anios.forEach((y,i)=>{
  const x=pad.left+(i/4)*cW;
  svg+='<line x1="'+x+'" y1="'+pad.top+'" x2="'+x+'" y2="'+(h-pad.bottom)+'" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>';
  svg+='<text x="'+(x+cW/8)+'" y="'+(pad.top-5)+'" text-anchor="middle" fill="#7AADCF" font-size="11" font-family="Arial">'+y+'</text>';
  });
  proyectos.forEach((p,i)=>{
  const y=pad.top+i*rowH+rowH*0.15;
  const bH=rowH*0.7;
  const pInicio=p.inicio||2024;
  const pDur=p.dur||1;
  const x=pad.left+((pInicio-2024)/4)*cW;
  const w=(pDur/4)*cW;
  const tipo=p.tipo||'Expansion';
  const color=colors[tipo]||'#888';
  svg+='<text x="'+(pad.left-5)+'" y="'+(y+bH/2+4)+'" text-anchor="end" fill="white" font-size="10" font-family="Arial">'+p.nombre.substring(0,30)+'</text>';
  svg+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+bH+'" fill="'+color+'" rx="3" opacity="0.85"/>';
  if(w>50) svg+='<text x="'+(x+w/2)+'" y="'+(y+bH/2+4)+'" text-anchor="middle" fill="white" font-size="9" font-family="Arial">'+tipo+'</text>';
  });
  svg+='</svg>';
  const win=window.open('','_blank','width=950,height='+(h+80));
  win.document.write('<html><head><title>Gantt SALP</title><style>#sieap-loader{position:fixed;inset:0;background:#003366;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;transition:opacity 0.4s;}
#sieap-loader .spin{width:50px;height:50px;border:4px solid rgba(255,255,255,0.2);border-top-color:#FFD700;border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:16px;}
#sieap-loader p{color:white;font-family:Arial;font-size:1rem;font-weight:600;}
@keyframes spin{to{transform:rotate(360deg)}}</style><style>
.page{display:none!important}
#page-dashboard{display:block!important}
.sidebar-item.active{background:rgba(51,153,204,.18)!important;color:#fff!important;border-left-color:#3399CC!important;font-weight:600!important}
</style>
</head><body style="background:#0a1628;padding:20px;">'+svg+'<br><button onclick="window.print()" style="margin-top:10px;padding:8px 20px;background:#0055A5;color:white;border:none;border-radius:5px;cursor:pointer;">Imprimir / PDF</button></body></html>');
}

function expansionGenerarPlan() {
 const proyectos=window.EXPANSION_DB||[];
 const muni=getMuni(); const fecha=getFecha();
 const invTotal=proyectos.reduce((s,p)=>s+(p.inversion||0),0);
 const lumTotal=proyectos.reduce((s,p)=>s+(p.lums||0),0);
 let txt='PLAN ANUAL SALP — '+new Date().getFullYear()+'\n';
 txt+='Municipio: '+muni+'\nFUCDESCOC — NIT 900.517.521-0\nFecha: '+fecha+'\n';
 txt+='Base: Decreto 943/2018 Art.5 + Res. CREG 101013/2022\n\n';
 txt+='Total proyectos: '+proyectos.length+'\n';
 txt+='Total luminarias: '+lumTotal.toLocaleString('es-CO')+'\n';
 txt+='Inversion total: $'+invTotal.toLocaleString('es-CO')+'\n\n';
 if(proyectos.length===0) txt+='Sin proyectos registrados.\n';
 else proyectos.forEach((p,i)=>{
 txt+=(i+1)+'. '+p.nombre+'\n';
 txt+=' Zona: '+p.zona+' | Tipo: '+p.tipo+'\n';
 txt+=' Luminarias: '+p.lums+' | Inversion: $'+(p.inversion||0).toLocaleString('es-CO')+'\n';
 txt+=' Año: '+p.anio+' | Estado: '+p.estado+'\n\n';
 });
 descargarArchivo(txt,'Plan_Anual_SALP_'+muni+'_'+new Date().getFullYear()+'.doc','application/msword');
 alert('✅ Plan Anual SALP descargado.');
}

function expansionGuardar() {
 const nombre = gVal('exp-nombre');
 const zona = gVal('exp-zona');
 const tipo = document.getElementById('exp-tipo')?.value || 'Expansión';
 const lums = gNum('exp-lums');
 const inv = gNum('exp-inversion');
 const anio = gVal('exp-anio') || new Date().getFullYear();
 const estado = document.getElementById('exp-estado')?.value || 'Planeado';
 const fuente = document.getElementById('exp-fuente')?.value || 'Recaudo IAP';
 const resp = gVal('exp-responsable');
 const obs = gVal('exp-obs');

 if(!nombre) { showToast('⚠️ Ingresa el nombre del proyecto', 'error'); return; }

 const item = { nombre, zona, tipo, lums, inversion:inv, anio, estado, fuente, responsable:resp, obs, inicio:anio, dur:1 };
 if(typeof EXPANSION_DB === 'undefined') window.EXPANSION_DB = [];
 window.EXPANSION_DB.push(item);
 DB.add('expansion', item);
 expansionActualizarTabla();
 document.getElementById('modal-expansion').style.display = 'none';
 clearFields(['exp-nombre','exp-zona','exp-lums','exp-inversion','exp-anio','exp-responsable','exp-obs']);
 showToast('✅ Proyecto "'+nombre+'" agregado al plan de expansión');
}

function expansionNuevo() {
let modal = document.getElementById('modal-expansion');
 if(!modal) {
 modal = document.createElement('div');
 modal.id = 'modal-expansion';
 modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;align-items:center;justify-content:center;';
 modal.innerHTML = `
 <div style="background:white;border-radius:12px;width:580px;max-width:96vw;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
 <h3 style="color:#003366;font-size:1rem;">🏗️ Nuevo Proyecto de Expansión / Modernización</h3>
 <button onclick="document.getElementById('modal-expansion').style.display='none'" style="background:none;border:none;font-size:1.4rem;cursor:pointer;">✕</button>
 </div>
 <div class="form-row">
 <div class="form-group"><label>Nombre del proyecto</label><input type="text" id="exp-nombre" placeholder="Ej: Modernización LED Centro"></div>
 <div class="form-group"><label>Zona / Sector</label><input type="text" id="exp-zona" placeholder="Ej: Centro urbano"></div>
 <div class="form-group"><label>Tipo de proyecto</label>
 <select id="exp-tipo">
 <option>Modernización</option><option>Expansión</option><option>Reposición</option>
 <option>Tecnológico</option><option>Ornamental</option>
 </select>
 </div>
 <div class="form-group"><label>N° luminarias involucradas</label><input type="number" id="exp-lums" placeholder="0"></div>
 <div class="form-group"><label>Inversión estimada (COP)</label><input type="number" id="exp-inversion" placeholder="0"></div>
 <div class="form-group"><label>Año de ejecución</label><input type="number" id="exp-anio" placeholder="${new Date().getFullYear()}"></div>
 <div class="form-group"><label>Estado inicial</label>
 <select id="exp-estado">
 <option>Planeado</option><option>Programado</option><option>En ejecución</option><option>Ejecutado</option>
 </select>
 </div>
 <div class="form-group"><label>Fuente de financiación</label>
 <select id="exp-fuente">
 <option>Recaudo IAP</option><option>SGR</option><option>Crédito</option><option>Cofinanciación</option>
 </select>
 </div>
 <div class="form-group"><label>Responsable técnico</label><input type="text" id="exp-responsable" placeholder="Nombre"></div>
 <div class="form-group"><label>Observaciones</label><input type="text" id="exp-obs" placeholder="Descripción breve"></div>
 </div>
 <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px;">
 <button class="btn btn-outline" onclick="document.getElementById('modal-expansion').style.display='none'">Cancelar</button>
 <button class="btn btn-success" onclick="expansionGuardar()">💾 Guardar Proyecto</button>
 </div>
 </div>`;
 document.body.appendChild(modal);
 } else {
 modal.style.display = 'flex';
 }
}

function exportarActualizacion() {
 calcActualizacion();
 const muni = document.getElementById('etr-municipio')?.value||'Municipio';
 const txt = 'ACTUALIZACIÓN ETR — ÍNDICES IPC/IPP\nMunicipio: '+muni+'\nFUCDESCOC — NIT 900.517.521-0\nFecha: '+new Date().toLocaleDateString('es-CO')+'\nBase: Res. CREG 101013/2022';
 if(window.descargarArchivo) descargarArchivo(txt,'Actualizacion_ETR_'+muni+'.doc','application/msword');
}

function exportarCSV() {
 if(typeof calcETR==='function') calcETR();
 const d=window.ETR_D||{};
 const rows=[
 ['ETR — CREG 101013/2022','','',''],
 ['Municipio',d.mun||'','Dpto',d.dpto||''],
 ['Fecha',getFecha(),'',''],
 ['','','',''],
 ['COMPONENTE','FORMULA CREG','MENSUAL (COP)','ANUAL (COP)'],
 ['CSEE','Art.12-15',Math.round(d.cseeMes||0),Math.round((d.cseeMes||0)*12)],
 ['CINV','Art.22: CAAn x ID',Math.round(d.cinvMes||0),Math.round((d.cinvMes||0)*12)],
 ['CAOM','Art.35: FAOML',Math.round(d.caomMes||0),Math.round((d.caomMes||0)*12)],
 ['COTR','Arts.37-40',Math.round(d.cotrMes||0),Math.round((d.cotrMes||0)*12)],
 ['CTMAX','Art.7',Math.round(d.ctmaxMes||0),Math.round(d.ctmaxA||0)],
 ['','','',''],
 ['RECAUDO IAP','',Math.round(d.recMes||0),Math.round((d.recMes||0)*12)],
 ['Art.351',d.cumple?'CUMPLE':'EXCEDE','',''],
 ['TIR',((d.tir||0)*100).toFixed(2)+'%','VPN',Math.round(d.vpn||0)],
 ['','','',''],
 ['FLUJO DE CAJA','CTMAX ANUAL','RECAUDO IAP','SALDO'],
 ...(d.flujo||[]).map(f=>[f.anio,Math.round(f.capA),Math.round(f.recA),Math.round(f.saldo)])
 ];
 descargarArchivo('\uFEFF'+rows.map(r=>r.join(';')).join('\n'), 'ETR_'+(d.mun||'Municipio')+'.csv', 'text/csv;charset=utf-8');
 alert('✅ ETR exportado en CSV.');
}

function exportarROI() {
 calcROI();
 const muni = document.getElementById('etr-municipio')?.value||'Municipio';
 const txt = 'ANÁLISIS ROI MODERNIZACIÓN LED\nMunicipio: '+muni+'\nFUCDESCOC — NIT 900.517.521-0\nBase: RETILAP §210.3.3 + Ley 697/2001 + Ley 1715/2014\nFecha: '+new Date().toLocaleDateString('es-CO');
 if(window.descargarArchivo) descargarArchivo(txt,'ROI_Modernizacion_LED_'+muni+'.doc','application/msword');
}

function finGenerarWord() { generarWordETR(); }

function fmtCOP(n){ return '$'+Math.round(n).toLocaleString('es-CO'); }

function formatCOP(n) {
 return '$' + Math.round(n).toLocaleString('es-CO');
}

function formatCOPM(n) {
 if(Math.abs(n) >= 1e9) return '$'+(n/1e9).toFixed(2)+'B';
 if(Math.abs(n) >= 1e6) return '$'+(n/1e6).toFixed(1)+'M';
 return formatCOP(n);
}

function gNum(id) { const e=document.getElementById(id); return e ? parseFloat(e.value)||0 : 0; }

function gS(id){ const e=document.getElementById(id); return e?e.value:''; }

function gV(id){ const e=document.getElementById(id); return e?parseFloat(e.value)||0:0; }

function gVal(id) { const e=document.getElementById(id); return e ? e.value.trim() : ''; }

function generarAcuerdoPago() {
 const nombre = gS('cc-nombre') || '__________________';
 const total = gV('cc-capital')+gV('cc-intereses')+gV('cc-sanciones')+gV('cc-gastos');
 const cuotas = gV('cc-cuotas') || 12;
 const cuota = total/cuotas;
 const muni = document.getElementById('etr-municipio')?.value || 'Municipio';
 const txt = `ACUERDO DE PAGO — IAP\nMunicipio de ${muni} | Fecha: ${new Date().toLocaleDateString('es-CO')}\n\nContribuyente: ${nombre}\nDeuda total: ${fmtCOP(total)}\nCuotas: ${cuotas} mensual(es)\nValor cuota: ${fmtCOP(cuota)}\n\nFUCDESCOC — NIT 900.517.521-0`;
 if(window.descargarArchivo) descargarArchivo(txt,'Acuerdo_Pago_IAP_'+nombre+'.doc','application/msword');
}

function generarMandamientoPago() {
 calcCobroCoactivo();
 const nombre = gS('cc-nombre') || '__________________';
 const nit = gS('cc-nit') || '__________________';
 const capital = gV('cc-capital');
 const intereses = gV('cc-intereses');
 const sanciones = gV('cc-sanciones');
 const gastos = gV('cc-gastos');
 const total = capital+intereses+sanciones+gastos;
 const muni = document.getElementById('etr-municipio')?.value || 'Municipio';
 const fecha = new Date().toLocaleDateString('es-CO');

 const txt = `MANDAMIENTO DE PAGO\nImpuesto de Alumbrado Público\nMunicipio de ${muni}\nFUCDESCOC — NIT 900.517.521-0\nFecha: ${fecha}\n\nVISTO: El proceso de cobro coactivo iniciado contra:\nCONTRIBUYENTE: ${nombre}\nNIT/CC: ${nit}\n\nLIQUIDACIÓN:\nCapital IAP: ${fmtCOP(capital)}\nIntereses de mora (Art.634 ET): ${fmtCOP(intereses)}\nSanciones: ${fmtCOP(sanciones)}\nGastos de cobro: ${fmtCOP(gastos)}\nTOTAL DEUDA: ${fmtCOP(total)}\n\nSE ORDENA: Pagar dentro de los 15 días hábiles siguientes a la notificación.\nBase: Arts. 823-843 ET + Art. 817 ET + Ley 1819/2016\n\nSecretario/a de Hacienda\nMunicipio de ${muni}`;
 if(window.descargarArchivo) descargarArchivo(txt,'Mandamiento_Pago_IAP_'+nombre+'.doc','application/msword');
}

function generarWordETR() {
 if(typeof calcETR==='function') calcETR();
 const d = window.ETR_D||{};
 const muni = d.mun||getMuni();
 const fecha = getFecha();
 if(!muni||muni==='Municipio'){ alert('Primero ingresa el nombre del municipio en la pestana Municipio.'); showPage('datos-etr'); return; }
 let txt = 'ESTUDIO TECNICO DE REFERENCIA\n';
 txt += 'MUNICIPIO DE '+muni.toUpperCase()+' — '+(d.dpto||'').toUpperCase()+'\n';
 txt += 'Vigencia: '+(d.vig||'')+'\n';
 txt += 'Res. CREG 101013/2022 | Decreto 943/2018 | Ley 1819/2016\n';
 txt += 'FUCDESCOC — NIT 900.517.521-0\n';
 txt += 'Secretario/a: '+(d.sec||'')+'\nFecha: '+fecha+'\n\n';
 txt += '='.repeat(50)+'\nFORMULA CTMAX (Art.7 Res. CREG 101013/2022)\n\n';
 txt += 'CSEE MENSUAL: $'+Math.round(d.cseeMes||0).toLocaleString('es-CO')+'\n';
 txt += 'CINV MENSUAL: $'+Math.round(d.cinvMes||0).toLocaleString('es-CO')+' (CAAn x ID)\n';
 txt += 'CAOM MENSUAL: $'+Math.round(d.caomMes||0).toLocaleString('es-CO')+' (FAOML='+( d.faoML||0)+')\n';
 txt += 'COTR MENSUAL: $'+Math.round(d.cotrMes||0).toLocaleString('es-CO')+'\n';
 txt += '—'.repeat(40)+'\n';
 txt += 'CTMAX MENSUAL: $'+Math.round(d.ctmaxMes||0).toLocaleString('es-CO')+'\n';
 txt += 'CTMAX ANUAL: $'+Math.round(d.ctmaxA||0).toLocaleString('es-CO')+'\n\n';
 txt += 'RECAUDO IAP: $'+Math.round(d.recMes||0).toLocaleString('es-CO')+'/mes\n';
 txt += 'ART.351: '+(d.cumple?'CUMPLE':'EXCEDE — AJUSTAR TARIFAS')+'\n\n';
 txt += 'TIR: '+((d.tir||0)*100).toFixed(2)+'% | VPN: $'+Math.round(d.vpn||0).toLocaleString('es-CO')+'\n\n';
 txt += 'FLUJO DE CAJA:\n';
 (d.flujo||[]).forEach(f=>{
 txt += f.anio+': CTMAX=$'+Math.round(f.capA).toLocaleString('es-CO')+' | IAP=$'+Math.round(f.recA).toLocaleString('es-CO')+' | '+(f.recA<=f.capA?'CUMPLE':'EXCEDE')+'\n';
 });
 txt += '\nFUCDESCOC — NIT 900.517.521-0 | '+fecha;
 descargarArchivo(txt, 'ETR_'+muni+'_CREG_101013_2022.doc', 'application/msword');
 const st=document.getElementById('etr-status');
 if(st) st.innerHTML='<div class="alert alert-success">✅ ETR descargado exitosamente.</div>';
}

function geoAddMode() {
 if (!geoMap) { geoInitMap(); setTimeout(geoAddMode, 800); return; }
 geoAddModeActive = true;
 document.getElementById('geo-add-banner').style.display = 'block';
 document.getElementById('btn-add-mode').style.background = '#E87722';
 geoMap.getContainer().style.cursor = 'crosshair';
}

function geoCalcEficacia() {
 const flujo = parseFloat(document.getElementById('ft-flujo').value) || 0;
 const pot = parseFloat(document.getElementById('ft-potencia').value) || 1;
 document.getElementById('ft-eficacia').value = (flujo / pot).toFixed(1);
}

function geoCalcUCAP() {
 const tec = document.getElementById('ft-tecnologia')?.value || 'LED';
 const pot = parseFloat(document.getElementById('ft-potencia')?.value) || 100;
 const flujo = parseFloat(document.getElementById('ft-flujo')?.value) || 0;
 if (flujo && pot) document.getElementById('ft-eficacia').value = (flujo/pot).toFixed(1);

 const ucap = CREG_UCAP[tec] || CREG_UCAP['LED'];
 const crLum = ucap.cr_base * (pot / 100); 
 const wacc = 0.1136;
 const vida = ucap.vida;
 const caan = crLum * (wacc / (1 - Math.pow(1 + wacc, -vida)));
 const faomL = ucap.faomL;
 const caomUnit = crLum * faomL;

 const el1 = document.getElementById('ucap-cr-lum');
 const el2 = document.getElementById('ucap-vida');
 const el3 = document.getElementById('ucap-caan');
 const el4 = document.getElementById('ucap-cinv');
 const el5 = document.getElementById('ucap-caom');
 if (el1) el1.textContent = formatCOP(Math.round(crLum));
 if (el2) el2.textContent = vida + ' años (Anexo CREG 101013/2022)';
 if (el3) el3.textContent = formatCOP(Math.round(caan));
 if (el4) el4.textContent = formatCOP(Math.round(caan * 0.99));
 if (el5) el5.textContent = formatCOP(Math.round(caomUnit));
 document.getElementById('ft-vida').value = vida;
}

function geoCapturaGPS() { geoGPS(); }

function geoCargarDatos() {
 try {
 const saved = localStorage.getItem('SIAP_DB');
 if (!saved) { geoCargarDemoDatos(); return; }
 SIAP_DB = JSON.parse(saved);
Object.keys(SIAP_DB).forEach(k => {
 if (SIAP_DB[k].foto === '[foto]') SIAP_DB[k].foto = localStorage.getItem('SIAP_FOTO_'+k)||null;
 if (SIAP_DB[k].foto2 === '[foto2]') SIAP_DB[k].foto2 = localStorage.getItem('SIAP_FOTO2_'+k)||null;
 });
if (geoMap) { Object.values(SIAP_DB).forEach(l => geoRenderMarker(l)); }
 geoUpdateStats(); geoUpdateLista();
 } catch(e) { geoCargarDemoDatos(); }
}

function geoCargarDemoDatos() {
const demos = [];
 demos.forEach(d => SIAP_DB[d.id] = d);
 if (geoMap) demos.forEach(d => geoRenderMarker(d));
 geoUpdateStats(); geoUpdateLista();
}

function geoCheckFlujo() {
 const flujoAct = parseFloat(document.getElementById('ft-flujo-actual')?.value) || 100;
 const alerta = document.getElementById('flujo-alert');
 if (alerta) alerta.style.display = flujoAct < 70 ? 'flex' : 'none';
}

function geoCheckRetilap() {
 const claseVia = document.getElementById('ft-clase-via')?.value || 'M3';
 const emCampo = parseFloat(document.getElementById('ret-em-campo')?.value) || 0;
 const uoCampo = parseFloat(document.getElementById('ret-uo-campo')?.value) || 0;
 const req = RETILAP_REQS[claseVia];
 if (!req) return;
 const okEm = emCampo >= req.emMin;
 const okUo = uoCampo >= req.uo;
 const cumple = okEm && okUo;
 const div = document.getElementById('ret-resultado');
 if (!div) return;
 div.innerHTML = `
 <div style="padding:8px;border-radius:6px;background:${cumple?'#D4EDDA':'#F8D7DA'};font-size:0.76rem;border-left:3px solid ${cumple?'#2E8B34':'#CC2200'};">
 <strong>${cumple?'✅ CUMPLE':'❌ INCUMPLE'} RETILAP Clase ${claseVia}</strong><br>
 Em: ${emCampo} lux (req. ≥${req.emMin} lux) ${okEm?'✅':'❌'}<br>
 Uo: ${uoCampo} (req. ≥${req.uo}) ${okUo?'✅':'❌'}
 </div>`;
}

function geoDescargarPlantillaCSV() {
 const p = 'latitud;longitud;codigo;direccion;tecnologia;potencia_W;estado\n' +
 '9.3414;-75.2917;P-001;Calle 12 #4-20;LED;100;operativa\n' +
 '9.3420;-75.2910;P-002;Cra 5 #8-15;HID;150;operativa\n';
 descargarArchivo('\uFEFF'+p, 'Plantilla_GPS_SIAP.csv', 'text/csv;charset=utf-8');
}

function geoDropFoto(event) {
 event.preventDefault();
 event.currentTarget.style.background = '';
 const file = event.dataTransfer.files[0];
 if (file && file.type.startsWith('image/')) {
 const dt = new DataTransfer();
 dt.items.add(file);
 document.getElementById('ft-foto-input').files = dt.files;
 geoLoadFoto({ files: [file] });
 }
}

function geoEditarLuminaria(id) {
 const lum = SIAP_DB[id];
 if (!lum) return;
 geoCurrentId = id;
 geoFotoData = lum.foto || null;
 geoFoto2Data = lum.foto2 || null;
 const setVal = (id, v) => { const el=document.getElementById(id); if(el) el.value=v||''; };
 setVal('ft-codigo', lum.codigo); setVal('ft-lat', lum.lat); setVal('ft-lon', lum.lon);
 setVal('ft-direccion', lum.direccion); setVal('ft-zona', lum.zona); setVal('ft-sector', lum.sector);
 setVal('ft-fecha-inst', lum.fecha_inst); setVal('ft-anio-op', lum.anio_op);
 setVal('ft-tecnologia', lum.tecnologia); setVal('ft-potencia', lum.potencia);
 setVal('ft-flujo', lum.flujo); setVal('ft-eficacia', lum.eficacia); setVal('ft-cct', lum.cct);
 setVal('ft-irc', lum.irc); setVal('ft-ip', lum.ip); setVal('ft-vida', lum.vida_util);
 setVal('ft-clase-via', lum.clase_via); setVal('ft-fhs', lum.fhs);
 setVal('ft-tipo-poste', lum.tipo_poste); setVal('ft-altura', lum.altura);
 setVal('ft-brazo', lum.brazo); setVal('ft-nivel-tension', lum.nivel_tension);
 setVal('ft-red', lum.tipo_red); setVal('ft-fotocontrol', lum.fotocontrol);
 setVal('ft-marca', lum.marca); setVal('ft-modelo', lum.modelo); setVal('ft-serie', lum.serie);
 setVal('ft-estado', lum.estado); setVal('ft-tipo-falla', lum.tipo_falla);
 setVal('ft-riesgo', lum.riesgo); setVal('ft-prioridad', lum.prioridad);
 setVal('ft-ult-mant', lum.ult_mant); setVal('ft-prox-mant', lum.prox_mant);
 setVal('ft-horas-op', lum.horas_op); setVal('ft-flujo-actual', lum.flujo_actual);
 setVal('ft-obs', lum.obs); setVal('ft-tecnico', lum.tecnico);
 setVal('ft-fecha-foto', lum.fecha_foto); setVal('ft-altitud', lum.altitud);
 if (lum.foto) {
 document.getElementById('foto-img').src = lum.foto;
 document.getElementById('foto-preview').style.display = 'block';
 document.getElementById('foto-placeholder').style.display = 'none';
 }
 geoModalOpen();
}

function geoEliminar(id) {
 if (!confirm('¿Eliminar luminaria ' + (SIAP_DB[id]?.codigo||id) + ' del SIAP?')) return;
 if (geoMarkers[id]) { geoMap?.removeLayer(geoMarkers[id]); delete geoMarkers[id]; }
 delete SIAP_DB[id];
 geoPersistir();
 geoUpdateStats();
 geoUpdateLista();
 const fichaBody = document.getElementById('geo-ficha-body');
 if (fichaBody) fichaBody.innerHTML = '<p style="text-align:center;color:#aaa;margin-top:20px;">Selecciona una luminaria</p>';
}

function geoExport() {
 const lums = Object.values(window.SIAP_DB||{});
 if(lums.length===0){ alert('No hay luminarias en el SIAP.'); return; }
 const h = 'Latitud;Longitud;Codigo;Direccion;Zona;Tecnologia;Potencia_W;Flujo_lm;ClaseVia;TipoPoste;Altura_m;Marca;Modelo;Estado;RiesgoNPS;FechaInst;VidaUtil;CR_UCAP_COP;CAAn_COP\n';
 const rows = lums.map(l=>[l.lat,l.lon,l.codigo,l.direccion,l.zona,l.tecnologia,l.potencia,l.flujo,l.clase_via,l.tipo_poste,l.altura,l.marca,l.modelo,l.estado,l.riesgo,l.fecha_inst,l.vida_util,Math.round(l.cr_lum||0),Math.round(l.caan_unit||0)].join(';')).join('\n');
 descargarArchivo('\uFEFF'+h+rows, 'SIAP_Inventario_CREG_101013.csv', 'text/csv;charset=utf-8');
 alert('✅ ' + lums.length + ' luminarias exportadas.');
}

function geoExtractEXIF(file) {
 const reader = new FileReader();
 reader.onload = e => {
 try {
 const view = new DataView(e.target.result);
if (view.getUint16(0, false) !== 0xFFD8) return;
} catch(ex) { }
 };
 reader.readAsArrayBuffer(file.slice(0, 131072));
}

function geoFiltrar() {
 const q = (document.getElementById('geo-search-input')?.value||'').toLowerCase();
 const est = document.getElementById('geo-filter-estado')?.value || '';
 const tec = document.getElementById('geo-filter-tec')?.value || '';
 const items = document.querySelectorAll('.geo-lista-item');
 items.forEach((item, i) => {
 const lum = Object.values(SIAP_DB)[i];
 if (!lum) return;
 const match = (!q || lum.codigo?.toLowerCase().includes(q) || lum.direccion?.toLowerCase().includes(q) || lum.zona?.toLowerCase().includes(q))
 && (!est || lum.estado === est)
 && (!tec || lum.tecnologia === tec);
 item.style.display = match ? '' : 'none';
 const marker = geoMarkers[lum.id];
 if (marker) { match ? geoMap?.addLayer(marker) : geoMap?.removeLayer(marker); }
 });
}

function geoFlyTo(id) {
 const lum = SIAP_DB[id];
 if (!lum || !geoMap) return;
 geoMap.flyTo([lum.lat, lum.lon], 18, { duration: 1 });
 setTimeout(() => { const m = geoMarkers[id]; if(m) m.openPopup(); }, 1200);
 geoMostrarFicha(lum);
}

function geoGPS() {
 if (!navigator.geolocation) { alert('GPS no disponible en este dispositivo'); return; }
 navigator.geolocation.getCurrentPosition(pos => {
 const { latitude, longitude, accuracy } = pos.coords;
 if (geoMap) geoMap.setView([latitude, longitude], 17);
 document.getElementById('ft-lat').value = latitude.toFixed(6);
 document.getElementById('ft-lon').value = longitude.toFixed(6);
 document.getElementById('ft-gps-prec').value = accuracy.toFixed(1);
 document.getElementById('ft-coord-lat').textContent = latitude.toFixed(6);
 document.getElementById('ft-coord-lon').textContent = longitude.toFixed(6);
 document.getElementById('ft-coord-prec').textContent = accuracy.toFixed(1) + ' m';
 const fechaHoy = new Date().toISOString().split('T')[0];
 document.getElementById('ft-fecha-foto').value = fechaHoy;
 }, err => {
 alert('No se pudo obtener GPS: ' + err.message);
 }, { enableHighAccuracy: true, timeout: 10000 });
}

function geoGenerarInforme() {
 const lums = Object.values(window.SIAP_DB||{});
 const muni = getMuni(); const fecha = getFecha();
 const op = lums.filter(l=>l.estado==='operativa').length;
 const fa = lums.filter(l=>l.estado==='falla').length;
 const re = lums.filter(l=>l.estado==='reemplazar'||l.tecnologia==='Mercurio').length;
 const cr = lums.reduce((s,l)=>s+(l.cr_lum||0),0);
 const id = lums.length>0?(op/lums.length*100).toFixed(1):'0';
 let txt = 'INFORME SIAP — RETILAP §580.1 / CREG 101013/2022\n';
 txt += 'Municipio: '+muni+'\nFUCDESCOC — NIT 900.517.521-0\nFecha: '+fecha+'\n\n';
 txt += 'RESUMEN:\n';
 txt += 'Total luminarias: '+lums.length+'\nOperativas: '+op+'\nFallas: '+fa+'\nA reemplazar: '+re+'\n';
 txt += 'CR total SALP: $'+Math.round(cr).toLocaleString('es-CO')+'\n';
 txt += 'ID Disponibilidad: '+id+'% '+( parseFloat(id)>=98?'OK (>=98%)':'INCUMPLE (<98%)')+'\n\n';
 txt += 'LED: '+lums.filter(l=>l.tecnologia==='LED').length+' | HID: '+lums.filter(l=>l.tecnologia==='HID').length+' | Mercurio: '+lums.filter(l=>l.tecnologia==='Mercurio').length+'\n\n';
 txt += 'DETALLE:\nCodigo;Lat;Lon;Tecnologia;Potencia;Estado;CR_UCAP\n';
 txt += lums.slice(0,200).map(l=>l.codigo+';'+l.lat+';'+l.lon+';'+l.tecnologia+';'+l.potencia+'W;'+l.estado+';$'+Math.round(l.cr_lum||0).toLocaleString('es-CO')).join('\n');
 descargarArchivo(txt, 'Informe_SIAP_RETILAP_'+muni+'.txt', 'text/plain;charset=utf-8');
 alert('✅ Informe RETILAP generado con '+lums.length+' luminarias.');
}

function geoGuardarLuminaria() {
 const lat = parseFloat(document.getElementById('ft-lat').value);
 const lon = parseFloat(document.getElementById('ft-lon').value);
 if (isNaN(lat) || isNaN(lon)) {
 alert('⚠️ Debes ingresar coordenadas válidas. Usa el GPS o haz clic en el mapa.');
 return;
 }
 const codigo = document.getElementById('ft-codigo').value || ('LUM-' + Date.now().toString(36).toUpperCase());
 document.getElementById('ft-codigo').value = codigo;

 const tec = document.getElementById('ft-tecnologia').value;
 const pot = parseFloat(document.getElementById('ft-potencia').value) || 0;
 const ucap = CREG_UCAP[tec] || CREG_UCAP['LED'];
 const crLum = ucap.cr_base * (pot / 100);
 const wacc = 0.1136;
 const caan = crLum * (wacc / (1 - Math.pow(1 + wacc, -ucap.vida)));

 const lum = {
 id: geoCurrentId || codigo,
 codigo, lat, lon,
 direccion: document.getElementById('ft-direccion').value,
 zona: document.getElementById('ft-zona').value,
 sector: document.getElementById('ft-sector').value,
 fecha_inst: document.getElementById('ft-fecha-inst').value,
 anio_op: document.getElementById('ft-anio-op').value,
tecnologia: tec,
 potencia: pot,
 flujo: parseFloat(document.getElementById('ft-flujo').value) || 0,
 eficacia: parseFloat(document.getElementById('ft-eficacia').value) || 0,
 cct: document.getElementById('ft-cct').value,
 irc: document.getElementById('ft-irc').value,
 ip: document.getElementById('ft-ip').value,
 vida_util: ucap.vida,
 clase_via: document.getElementById('ft-clase-via').value,
 fhs: document.getElementById('ft-fhs').value,
 tipo_poste: document.getElementById('ft-tipo-poste').value,
 altura: document.getElementById('ft-altura').value,
 brazo: document.getElementById('ft-brazo').value,
 nivel_tension: document.getElementById('ft-nivel-tension').value,
 tipo_red: document.getElementById('ft-red').value,
 fotocontrol: document.getElementById('ft-fotocontrol').value,
 marca: document.getElementById('ft-marca').value,
 modelo: document.getElementById('ft-modelo').value,
 serie: document.getElementById('ft-serie').value,
estado: document.getElementById('ft-estado').value,
 tipo_falla: document.getElementById('ft-tipo-falla').value,
 riesgo: document.getElementById('ft-riesgo').value,
 prioridad: document.getElementById('ft-prioridad').value,
 ult_mant: document.getElementById('ft-ult-mant').value,
 prox_mant: document.getElementById('ft-prox-mant').value,
 horas_op: document.getElementById('ft-horas-op').value,
 flujo_actual: document.getElementById('ft-flujo-actual').value,
 obs: document.getElementById('ft-obs').value,
tecnico: document.getElementById('ft-tecnico').value,
 fecha_foto: document.getElementById('ft-fecha-foto').value,
 altitud: document.getElementById('ft-altitud').value,
 gps_prec: document.getElementById('ft-gps-prec').value,
foto: geoFotoData,
 foto2: geoFoto2Data,
cr_lum: crLum,
 caan_unit: caan,
 cinv_unit: caan * 0.99,
 caom_unit: crLum * ucap.faomL,
ts_creacion: new Date().toISOString(),
 ts_modificacion: new Date().toISOString(),
 };

 SIAP_DB[lum.id] = lum;
 geoPersistir();
 geoRenderMarker(lum);
 geoUpdateStats();
 geoUpdateLista();
 geoModalClose();
 geoLimpiarForm();
 setTimeout(() => geoMostrarFicha(lum), 200);
}

function geoImportCSV() {
 alert('Formato CSV:\nlatitud;longitud;codigo;direccion;tecnologia;potencia_W;estado\n\nClic OK para seleccionar archivo.');
 abrirArchivo('.csv,.txt', file => {
 leerTexto(file, texto => {
 const lineas = texto.trim().split('\n');
 let n = 0;
 for(let i=1;i<lineas.length;i++){
 const c = lineas[i].split(/[;,]/);
 if(c.length < 4) continue;
 const lat=parseFloat(c[0]), lon=parseFloat(c[1]);
 if(isNaN(lat)||isNaN(lon)) continue;
 const lum = {
 id: 'CSV-'+Date.now()+'-'+i,
 codigo:(c[2]||'LUM-'+i).trim(), lat, lon,
 direccion:(c[3]||'').trim(),
 tecnologia:(c[4]||'LED').trim(),
 potencia:parseFloat(c[5])||100,
 estado:(c[6]||'operativa').trim().toLowerCase(),
 ts_creacion: new Date().toISOString()
 };
 const ucap=(window.CREG_UCAP||{})[lum.tecnologia]||{cr_base:850000,vida:25};
 lum.cr_lum=ucap.cr_base*(lum.potencia/100);
 lum.vida_util=ucap.vida;
 lum.caan_unit=lum.cr_lum*(0.1136/(1-Math.pow(1.1136,-lum.vida_util)));
 if(window.SIAP_DB) window.SIAP_DB[lum.id]=lum;
 n++;
 }
 if(window.SIAP_DB) Object.values(window.SIAP_DB).forEach(l=>{if(window.geoRenderMarker)geoRenderMarker(l);});
 if(window.geoUpdateStats) geoUpdateStats();
 if(window.geoUpdateLista) geoUpdateLista();
 if(window.geoPersistir) geoPersistir();
 alert('✅ ' + n + ' postes importados al mapa SIAP.');
 });
 });
}

function geoInitMap() {
 if (geoMap) return;
 if (!document.getElementById('geo-map')) return;
 if (!window.L) {
const link = document.createElement('link');
 link.rel = 'stylesheet';
 link.href = 'https:
 document.head.appendChild(link);
const script = document.createElement('script');
 script.src = 'https:
 script.onload = () => geoInitMapCore();
 document.head.appendChild(script);
 } else {
 geoInitMapCore();
 }
}

function geoInitMapCore() {
 const L = window.L;
 geoMap = L.map('geo-map', {
 center: [9.3414, -75.2917],
 zoom: 14,
 zoomControl: false
 });
 geoLayer = L.tileLayer('https:
 attribution: '© OpenStreetMap · SIAP FUCDESCOC',
 maxZoom: 20
 }).addTo(geoMap);
 geoSatLayer = L.tileLayer('https:
 attribution: '© ESRI World Imagery'
 });
 geoMap.on('click', function(e) {
 if (!geoAddModeActive) return;
 document.getElementById('ft-lat').value = e.latlng.lat.toFixed(6);
 document.getElementById('ft-lon').value = e.latlng.lng.toFixed(6);
 document.getElementById('ft-coord-lat').textContent = e.latlng.lat.toFixed(6);
 document.getElementById('ft-coord-lon').textContent = e.latlng.lng.toFixed(6);
 geoAddModeActive = false;
 document.getElementById('geo-add-banner').style.display = 'none';
 document.getElementById('btn-add-mode').style.background = '';
 geoCurrentId = null;
 geoModalOpen();
 });
 geoCargarDatos();
 geoUpdateStats();
}

function geoLimpiarForm() {
 ['ft-codigo','ft-lat','ft-lon','ft-direccion','ft-zona','ft-fecha-inst','ft-anio-op',
 'ft-potencia','ft-flujo','ft-eficacia','ft-irc','ft-fhs','ft-altura','ft-marca',
 'ft-modelo','ft-serie','ft-ult-mant','ft-prox-mant','ft-horas-op','ft-flujo-actual',
 'ft-obs','ft-tecnico','ft-fecha-foto','ft-altitud','ft-gps-prec'].forEach(id => {
 const el = document.getElementById(id); if(el) el.value='';
 });
 document.getElementById('foto-preview').style.display = 'none';
 document.getElementById('foto-placeholder').style.display = 'block';
 document.getElementById('foto2-preview').style.display = 'none';
 document.getElementById('foto2-placeholder').style.display = 'block';
 geoFotoData = null; geoFoto2Data = null; geoCurrentId = null;
}

function geoLoadFoto(input) {
 const file = input.files[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = e => {
 geoFotoData = e.target.result;
 document.getElementById('foto-img').src = geoFotoData;
 document.getElementById('foto-preview').style.display = 'block';
 document.getElementById('foto-placeholder').style.display = 'none';
document.getElementById('ft-fecha-foto').value = new Date().toISOString().split('T')[0];
geoExtractEXIF(file);
 };
 reader.readAsDataURL(file);
}

function geoLoadFoto2(input) {
 const file = input.files[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = e => {
 geoFoto2Data = e.target.result;
 document.getElementById('foto2-img').src = geoFoto2Data;
 document.getElementById('foto2-preview').style.display = 'block';
 document.getElementById('foto2-placeholder').style.display = 'none';
 };
 reader.readAsDataURL(file);
}

function geoModalClose() {
 document.getElementById('geo-modal').style.display = 'none';
 geoCurrentId = null;
 geoFotoData = null;
 geoFoto2Data = null;
 geoAddModeActive = false;
 if (geoMap) geoMap.getContainer().style.cursor = '';
}

function geoModalOpen() {
 document.getElementById('geo-modal').style.display = 'flex';
const fechaHoy = new Date().toISOString().split('T')[0];
 if (!document.getElementById('ft-fecha-inst').value)
 document.getElementById('ft-fecha-inst').value = hoy;
 geoCalcUCAP();
}

function geoMostrarFicha(lum) {
 const titulo = document.getElementById('geo-ficha-titulo');
 const body = document.getElementById('geo-ficha-body');
 if (!titulo || !body) return;

 titulo.textContent = `${lum.codigo} — ${lum.tecnologia} ${lum.potencia}W`;
const fotoHtml = lum.foto
 ? `<img src="${lum.foto}" style="width:100%;border-radius:8px;margin-bottom:8px;max-height:140px;object-fit:cover;">`
 : '<div style="background:#F0F4F8;border-radius:8px;padding:20px;text-align:center;color:#aaa;margin-bottom:8px;">Sin fotografía</div>';

 const cumpleRetilap = lum.em_campo ? lum.em_campo >= (RETILAP_REQS[lum.clase_via]?.emMin||0) : null;

 body.innerHTML = `
 ${fotoHtml}
 <div style="display:flex;flex-direction:column;gap:4px;font-size:0.76rem;">
 <div style="display:flex;justify-content:space-between;padding:4px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">Código SIAP</span><strong>${lum.codigo}</strong>
 </div>
 <div style="display:flex;justify-content:space-between;padding:4px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">Estado</span>
 <strong style="color:${ESTADO_COLORS[lum.estado]||'#888'};">${(lum.estado||'').toUpperCase()}</strong>
 </div>
 <div style="display:flex;justify-content:space-between;padding:4px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">Tecnología</span><strong>${lum.tecnologia} ${lum.potencia}W</strong>
 </div>
 <div style="display:flex;justify-content:space-between;padding:4px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">Eficacia</span><strong>${lum.eficacia||'—'} lm/W</strong>
 </div>
 <div style="display:flex;justify-content:space-between;padding:4px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">Clase vía</span><strong>${lum.clase_via||'—'}</strong>
 </div>
 <div style="display:flex;justify-content:space-between;padding:4px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">Poste / Altura</span><strong>${lum.tipo_poste||'—'} / ${lum.altura||'—'}m</strong>
 </div>
 <div style="display:flex;justify-content:space-between;padding:4px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">Marca / Modelo</span><strong>${lum.marca||'—'} ${lum.modelo||''}</strong>
 </div>
 <div style="display:flex;justify-content:space-between;padding:4px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">CR UCAP (CREG)</span><strong>${formatCOP(Math.round(lum.cr_lum||0))}</strong>
 </div>
 <div style="display:flex;justify-content:space-between;padding:4px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">Coords.</span><strong style="font-size:0.7rem;">${Number(lum.lat).toFixed(5)}, ${Number(lum.lon).toFixed(5)}</strong>
 </div>
 <div style="display:flex;justify-content:space-between;padding:4px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">Riesgo NPS</span>
 <strong style="color:${lum.riesgo==='alto'?'#CC2200':lum.riesgo==='medio'?'#E87722':'#2E8B34'}">${(lum.riesgo||'bajo').toUpperCase()}</strong>
 </div>
 </div>
 <div style="display:flex;gap:6px;margin-top:10px;">
 <button class="btn btn-primary btn-sm" style="flex:1;font-size:0.72rem;" onclick="geoEditarLuminaria('${lum.id}')">✏️ Editar</button>
 <button class="btn btn-danger btn-sm" style="flex:1;font-size:0.72rem;" onclick="geoEliminar('${lum.id}')">🗑️</button>
 </div>`;
}

function geoPersistir() {
 try {
const dbSinFotos = {};
 Object.entries(SIAP_DB).forEach(([k,v]) => {
 dbSinFotos[k] = {...v, foto: v.foto ? '[foto]' : null, foto2: v.foto2 ? '[foto2]' : null};
 });
 localStorage.setItem('SIAP_DB', JSON.stringify(dbSinFotos));
Object.entries(SIAP_DB).forEach(([k,v]) => {
 if (v.foto) { try { localStorage.setItem('SIAP_FOTO_'+k, v.foto); } catch(e){} }
 if (v.foto2) { try { localStorage.setItem('SIAP_FOTO2_'+k, v.foto2); } catch(e){} }
 });
 } catch(e) { console.warn('localStorage: ' + e.message); }
}

function geoPopupContent(lum) {
 const fotoHtml = lum.foto
 ? `<img src="${lum.foto}" style="width:100%;border-radius:6px;margin:6px 0;max-height:100px;object-fit:cover;">`
 : '';
 return `<div class="geo-popup">
 <h4>📍 ${lum.codigo}</h4>
 ${fotoHtml}
 <table>
 <tr><td>Tecnología:</td><td>${lum.tecnologia} ${lum.potencia}W</td></tr>
 <tr><td>Estado:</td><td><strong style="color:${ESTADO_COLORS[lum.estado]||'#888'}">${lum.estado?.toUpperCase()}</strong></td></tr>
 <tr><td>Dirección:</td><td>${lum.direccion||'—'}</td></tr>
 <tr><td>Clase vía:</td><td>${lum.clase_via||'—'}</td></tr>
 <tr><td>Altura montaje:</td><td>${lum.altura||'—'} m</td></tr>
 <tr><td>Vida útil:</td><td>${lum.vida_util||'—'} años</td></tr>
 <tr><td>CR (CREG):</td><td>${formatCOP(Math.round(lum.cr_lum||0))}</td></tr>
 <tr><td>Coord.:</td><td style="font-size:0.7rem;">${Number(lum.lat).toFixed(5)}, ${Number(lum.lon).toFixed(5)}</td></tr>
 </table>
 <button class="popup-edit" onclick="geoEditarLuminaria('${lum.id}')">✏️ Editar / Ver ficha completa</button>
 </div>`;
}

function geoRenderMarker(lum) {
 if (!geoMap || !window.L) return;
 const L = window.L;
 if (geoMarkers[lum.id]) { geoMap.removeLayer(geoMarkers[lum.id]); }
const color = ESTADO_COLORS[lum.estado] || '#7F8C8D';
 const tecIcon = { LED:'💡', HID:'🔆', Mercurio:'⚠️', Haluro:'🔆', Induccion:'💡' }[lum.tecnologia] || '💡';
const icon = L.divIcon({
 className: '',
 html: `<div class="lum-marker lum-${lum.estado}" title="${lum.codigo} — ${lum.tecnologia} ${lum.potencia}W">${tecIcon.replace(/[^\x00-\x7F]/g,'')}</div>`,
 iconSize: [22, 22],
 iconAnchor: [11, 11],
 popupAnchor: [0, -14]
 });

 const marker = L.marker([lum.lat, lum.lon], { icon })
 .addTo(geoMap)
 .bindPopup(geoPopupContent(lum), { maxWidth: 280, className: 'geo-popup' });

 marker.on('click', () => geoMostrarFicha(lum));
 geoMarkers[lum.id] = marker;
}

function geoSetLayer(type) {
 if (!geoMap) return;
 if (type === 'sat') { geoMap.removeLayer(geoLayer); geoSatLayer.addTo(geoMap); }
 else { geoMap.removeLayer(geoSatLayer); geoLayer.addTo(geoMap); }
}

function geoTab(btn, panelId) {
 document.querySelectorAll('.geo-tab-btn').forEach(b => b.classList.remove('active'));
 document.querySelectorAll('.geo-tab-panel').forEach(p => p.style.display = 'none');
 btn.classList.add('active');
 const panel = document.getElementById(panelId);
 if (panel) panel.style.display = 'block';
 if (panelId === 'ft-creg') { geoCalcUCAP(); geoCheckRetilap(); }
}

function geoUpdateLista() {
 const lista = document.getElementById('geo-lista');
 if (!lista) return;
 const lums = Object.values(SIAP_DB);
 if (lums.length === 0) {
 lista.innerHTML = '<div style="padding:16px;text-align:center;color:#aaa;font-size:0.8rem;">Sin luminarias registradas.<br>Usa "Agregar luminaria" para comenzar.</div>';
 return;
 }
 lista.innerHTML = lums.map(l => `
 <div class="geo-lista-item" onclick="geoFlyTo('${l.id}')">
 <div class="geo-lista-dot" style="background:${ESTADO_COLORS[l.estado]||'#888'};"></div>
 <div style="flex:1;min-width:0;">
 <div style="font-weight:700;color:#003366;font-size:0.78rem;">${l.codigo}</div>
 <div style="color:#888;font-size:0.7rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.tecnologia} ${l.potencia}W · ${l.direccion||'Sin dirección'}</div>
 </div>
 <div style="font-size:0.68rem;color:#888;">${l.zona||''}</div>
 </div>`).join('');
}

function geoUpdateStats() {
 const lums = Object.values(SIAP_DB);
 const total = lums.length;
 const operativas = lums.filter(l => l.estado === 'operativa').length;
 const fallas = lums.filter(l => l.estado === 'falla').length;
 const leds = lums.filter(l => l.tecnologia === 'LED').length;
 const pctLed = total > 0 ? Math.round(leds/total*100) : 0;

 const setEl = (id, v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
 setEl('kpi-total', total);
 setEl('kpi-operativas', operativas);
 setEl('kpi-fallas', fallas);
 setEl('kpi-led-pct', pctLed+'%');
 setEl('geo-map-count', total + ' luminaria'+(total!==1?'s':''));
}

function geoZoomAll() {
 if (!geoMap) return;
 const markers = Object.values(geoMarkers);
 if (markers.length === 0) return;
 const group = window.L.featureGroup(markers);
 geoMap.fitBounds(group.getBounds().pad(0.1));
}

function getFecha() { return new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'}); }

function getMuni() { return gVal('etr-municipio')||'Municipio'; }

function guardarResultadosETR() {
 const csee = document.getElementById('monto-csee')?.textContent;
 const cinv = document.getElementById('monto-cinv')?.textContent;
 const caom = document.getElementById('monto-caom')?.textContent;
 const cotr = document.getElementById('monto-cotros')?.textContent;
 const ctmax = document.getElementById('monto-ctmax')?.textContent;
 if(!ctmax || ctmax==='$0') { showToast('Primero completa y calcula los costos ETR', 'warning'); return; }
 const item = { csee, cinv, caom, cotr, ctmax, fecha:hoy(), municipio:getMuni() };
 DB.add('etr_guardados', item);
safeSet('dash-costo-etr', ctmax);
 showToast('✅ Resultados ETR guardados — CTMAX: '+ctmax);
}

function guardarSimulacion() {
 const em = document.getElementById('res-iluminancia')?.textContent;
 const cumple = document.getElementById('res-cumple')?.textContent;
 const via = document.getElementById('sim-via')?.value;
 const ancho = gNum('sim-ancho');
 const espaciado = gNum('sim-espaciado');
 if(!em || em==='—') { showToast('Primero ejecuta la simulación', 'warning'); return; }
 const item = { via, ancho, espaciado, em, cumple, fecha: hoy() };
 DB.add('simulaciones', item);
 showToast('✅ Simulación guardada — Clase '+via+': '+em+' lux');
 const simHist = document.getElementById('sim-historial');
 if(simHist) {
 const sims = DB.get('simulaciones');
 simHist.innerHTML = sims.slice(-5).reverse().map(s=>`
 <div style="padding:6px 10px;background:#F0F4F8;border-radius:5px;font-size:0.78rem;display:flex;justify-content:space-between;">
 <span>${s.via} | Ancho:${s.ancho}m | Esp:${s.espaciado}m</span>
 <span><strong>${s.em} lux</strong> ${s.cumple}</span>
 </div>`).join('');
 }
}

function hoy() { return new Date().toISOString().split('T')[0]; }

function imprimirETR() { window.print(); }

function incActualizarContadores() {
 const cards = document.querySelectorAll('.incidencia-card');
 const abiertas = Array.from(cards).filter(c=>c.style.opacity!=='0.5').length;
 safeSet('dash-incidencias', abiertas);
const contadores = {alta:0, media:0, baja:0};
 cards.forEach(c=>{
 if(c.style.opacity==='0.5') return;
 const badge = c.querySelector('.badge');
 if(badge?.classList.contains('badge-rojo')) contadores.alta++;
 else if(badge?.classList.contains('badge-amarillo')) contadores.media++;
 else if(badge?.classList.contains('badge-verde')) contadores.baja++;
 });
}

function incCerrar(btn) {
 const card = btn.closest('.incidencia-card');
 if(!card) return;
 card.style.opacity='0.5';
 btn.textContent='Cerrada';
 btn.disabled=true;
 showToast('✅ Incidencia cerrada');
 incActualizarContadores();
}

function inicializarModulos() {
 lumActualizarTabla();
 lumActualizarKPIs();
 mantActualizarTabla();
 coberturaActualizarTabla();
 expansionActualizarTabla();
 incActualizarContadores();
 const incs = DB.get('incidencias');
 if(incs.length > 0) {
 const lista = document.getElementById('lista-incidencias');
 if(lista) {
 const badgeMap = {alta:'badge-rojo',media:'badge-amarillo',baja:'badge-verde'};
 lista.innerHTML = incs.slice().reverse().slice(0,20).map(inc=>`
 <div class="incidencia-card">
 <div class="incid-icon">${inc.icon||'🚨'}</div>
 <div class="incid-body">
 <div class="incid-title">${inc.tipo} — ${inc.poste}</div>
 <div class="incid-meta">📍 ${inc.dir} · 🕐 ${inc.ahora}</div>
 </div>
 <div class="incid-status">
 <span class="badge ${badgeMap[inc.prior]||'badge-gris'}">${inc.prior||'media'}</span>
 </div>
 </div>`).join('');
 }
 }
 _agregarBotonesGuardar();
 _agregarHistorialSimulacion();
}

function invExportarInventario() {
 const filas=document.querySelectorAll('#mat-tabla-body tr');
 let csv='\uFEFF'+'Codigo;Descripcion;Unidad;Stock;Minimo;Estado\n';
 let n=0;
 filas.forEach(fila=>{
 const cc=fila.querySelectorAll('td');
 if(cc.length>=5&&!cc[0].textContent.includes('Sin materiales')){
 csv+=Array.from(cc).map(c=>c.textContent.trim()).join(';')+'\n';
 n++;
 }
 });
 descargarArchivo(csv,'Inventario_Materiales_SALP.csv','text/csv;charset=utf-8');
 alert(n>0?'✅ '+n+' materiales exportados.':'✅ Plantilla descargada.');
}

function invRegistrarEntrada() {
 const cod = prompt('Código material:') || '';
 const cant = parseInt(prompt('Cantidad a ingresar:')) || 0;
 if(cod && cant>0) alert(`✅ Entrada registrada: ${cant} unidades de ${cod}\nFecha: ${new Date().toLocaleDateString('es-CO')}\nResponsable: Almacenista SALP`);
}

function invSolicitarCompra() {
 const txt = `SOLICITUD DE COMPRA — SALP\nFecha: ${new Date().toLocaleDateString('es-CO')}\n\nMATERIALES CON STOCK BAJO:\n- MAT-004: Arrancadores sodio 250W (Stock: 12, Mín: 15)\n- MAT-006: Brazos galvanizados tipo B (Stock: 8, Mín: 10)\n\nFUCDESCOC — NIT 900.517.521-0`;
 const blob=new Blob([txt],{type:'text/plain'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='Solicitud_Compra_SALP.txt';
 document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
}

function leerTexto(file, cb) {
 const r = new FileReader();
 r.onload = e => cb(e.target.result);
 r.readAsText(file, 'UTF-8');
}

function limpiarLiq() {
 ['liap-nombre','liap-nit','liap-kwh','liap-tarifa-e','liap-tasa'].forEach(id=>{
 const e=document.getElementById(id); if(e) e.value='';
 });
 setRes('res-liap','<div style="text-align:center;padding:20px;color:#aaa;">Ingresa los datos para calcular</div>');
}

function lumActualizarKPIs() {
 const lums = DB.get('luminarias');
 const leds = lums.filter(l=>l.tec==='LED').length;
 const hids = lums.filter(l=>l.tec==='HID'||l.tec==='Sodio AP').length;
 const mercs = lums.filter(l=>l.tec==='Mercurio').length;
 const potTotal = lums.reduce((s,l)=>s+(parseFloat(l.pot)||0),0)/1000;
 safeSet('dash-total-lum', lums.length||'0');
const el1=document.querySelector('#page-luminarias .kpi.azul .kpi-value');
 const el2=document.querySelector('#page-luminarias .kpi.naranja .kpi-value');
 const el3=document.querySelector('#page-luminarias .kpi.rojo .kpi-value');
 const el4=document.querySelector('#page-luminarias .kpi.verde .kpi-value');
 if(el1) el1.textContent=leds;
 if(el2) el2.textContent=hids;
 if(el3) el3.textContent=mercs;
 if(el4) el4.textContent=potTotal.toFixed(1);
}

function lumActualizarTabla() {
 const lums = DB.get('luminarias');
 const tbody = document.getElementById('lum-tabla-body');
 if(!tbody) return;
 if(lums.length === 0) {
 tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:#aaa;"><div style="font-size:1.5rem;margin-bottom:8px;">💡</div>Sin luminarias. Use "➕ Registrar" o "📥 Importar CSV".</td></tr>';
 return;
 }
 const badgeMap = {'Operativa':'badge-verde','Mantenimiento':'badge-amarillo','Reemplazar':'badge-rojo','Con falla':'badge-rojo'};
 tbody.innerHTML = lums.map(l=>`<tr>
 <td><strong>${l.codigo}</strong></td>
 <td>${l.tec}</td>
 <td>${l.pot}W</td>
 <td>${l.flujo||'—'}</td>
 <td>${l.eficacia} lm/W</td>
 <td>${l.zona||'—'}</td>
 <td>${l.anio||'—'}</td>
 <td>${l.vida_util||'—'} años</td>
 <td><span class="badge ${badgeMap[l.estado]||'badge-gris'}">${l.estado}</span></td>
 <td>
 <button class="btn btn-sm btn-outline" onclick="lumVer(${l.id})">Ver</button>
 <button class="btn btn-sm btn-danger" onclick="lumEliminar(${l.id})" style="padding:3px 8px;">🗑️</button>
 </td>
 </tr>`).join('');
}

function lumDescargarPlantilla() {
 const p = 'codigo;tecnologia;potencia_W;flujo_lm;zona;anio_instalacion;estado\n' +
 'LUM-001;LED;100;14500;Centro;2024;Operativa\n' +
 'LUM-002;HID;150;15000;Norte;2020;Mantenimiento\n' +
 'LUM-003;Mercurio;125;5400;Rural;2010;Reemplazar\n';
 descargarArchivo('\uFEFF'+p, 'Plantilla_Luminarias_SIEAP.csv', 'text/csv;charset=utf-8');
}

function lumEliminar(id) {
 if(!confirmar('¿Eliminar esta luminaria del inventario?')) return;
 DB.del('luminarias', id);
 lumActualizarTabla();
 lumActualizarKPIs();
 showToast('🗑️ Luminaria eliminada');
}

function lumExportarInventario() {
 const filas = document.querySelectorAll('#lum-tabla-body tr');
 let csv = '\uFEFF' + 'Codigo;Tecnologia;Potencia;Flujo;Eficacia;Zona;Anio;VidaUtil;Estado\n';
 let n = 0;
 filas.forEach(fila => {
 const cc = fila.querySelectorAll('td');
 if(cc.length >= 9 && !cc[0].textContent.includes('Sin luminarias')){
 csv += Array.from(cc).slice(0,9).map(c=>c.textContent.trim()).join(';') + '\n';
 n++;
 }
 });
 if(n===0){ alert('No hay luminarias registradas.'); return; }
 descargarArchivo(csv, 'Inventario_Luminarias_SIEAP.csv', 'text/csv;charset=utf-8');
 alert('✅ ' + n + ' luminarias exportadas.');
}

function lumImportarCSV() {
 abrirArchivo('.csv,.txt', file => {
 leerTexto(file, texto => {
 const lineas = texto.trim().split('\n');
 let n = 0;
 const tbody = document.getElementById('lum-tabla-body');
 if(tbody) tbody.innerHTML = '';
 for(let i=1;i<lineas.length;i++){
 const c = lineas[i].split(/[;,]/);
 if(c.length < 2) continue;
 const cod=(c[0]||'').trim(), tec=(c[1]||'LED').trim(),
 pot=(c[2]||'').trim(), flujo=(c[3]||'').trim(),
 zona=(c[4]||'').trim(), anio=(c[5]||'').trim(),
 est=(c[6]||'Operativa').trim();
 if(!cod) continue;
 const bm={'Operativa':'badge-verde','Mantenimiento':'badge-amarillo','Reemplazar':'badge-rojo'};
 const b=bm[est]||'badge-gris';
 if(tbody) tbody.innerHTML+=`<tr>
 <td><strong>${cod}</strong></td><td>${tec}</td><td>${pot}W</td>
 <td>${flujo}</td><td>—</td><td>${zona}</td><td>${anio}</td><td>—</td>
 <td><span class="badge ${b}">${est}</span></td>
 <td><button class="btn btn-sm btn-outline" onclick="lumVerModal(this)">Ver</button></td>
 </tr>`;
 n++;
 }
 alert('✅ ' + n + ' luminarias importadas.\n\nFormato: codigo;tecnologia;potencia;flujo_lm;zona;anio;estado');
 });
 });
}

function lumLimpiar() {
 clearFields(['lum-reg-codigo','lum-reg-pot','lum-reg-flujo','lum-reg-zona','lum-reg-anio']);
}

function lumRegistrar() {
const codigo = gVal('lum-reg-codigo');
 const tec = gVal('lum-reg-tec') || document.getElementById('lum-reg-tec')?.value;
 const pot = gNum('lum-reg-pot');
 const flujo = gNum('lum-reg-flujo');
 const zona = gVal('lum-reg-zona');
 const anio = gVal('lum-reg-anio');
 const estado = gVal('lum-reg-estado') || document.getElementById('lum-reg-estado')?.value || 'Operativa';

 if(!codigo) { showToast('⚠️ Ingresa el código de la luminaria', 'error'); return; }
 if(!pot) { showToast('⚠️ Ingresa la potencia', 'error'); return; }

 const eficacia = flujo && pot ? (flujo/pot).toFixed(1) : '—';
 const vidaUtil = {LED:25, 'HID':15, 'Sodio AP':15, 'Mercurio':15}[tec] || 20;

 const item = { codigo, tec, pot, flujo, eficacia, zona, anio, estado, vida_util: vidaUtil };
 DB.add('luminarias', item);
 lumActualizarTabla();
 lumLimpiar();
 lumActualizarKPIs();
 showToast('✅ Luminaria '+codigo+' registrada exitosamente');
}

function lumVer(id) {
 const l = DB.get('luminarias').find(x=>x.id===id);
 if(!l) return;
 document.getElementById('modal-title').textContent = 'Luminaria — '+l.codigo;
 document.getElementById('modal-body').innerHTML = `
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.83rem;">
 ${[['Código',l.codigo],['Tecnología',l.tec+' '+l.pot+'W'],['Flujo',l.flujo+' lm'],['Eficacia',l.eficacia+' lm/W'],
 ['Zona',l.zona],['Año inst.',l.anio],['Vida útil',l.vida_util+' años'],['Estado',l.estado]
 ].map(([k,v])=>`<div style="padding:6px 10px;background:#F0F4F8;border-radius:5px;display:flex;justify-content:space-between;">
 <span style="color:#888;">${k}</span><strong>${v||'—'}</strong></div>`).join('')}
 </div>`;
 document.getElementById('modal-overlay').classList.add('show');
}

function lumVerModal(btn) {
 const row = btn.closest('tr');
 if(!row) return;
 const cells = row.querySelectorAll('td');
 if(cells.length < 9) return;
 verLuminaria(cells[0].textContent,cells[1].textContent,cells[2].textContent,cells[3].textContent,cells[4].textContent,cells[5].textContent,cells[6].textContent,cells[7].textContent,cells[8].textContent);
}

function mantActualizarTabla() {
 const ots = DB.get('ots');
 const tbody = document.querySelector('#page-mantenimiento table:first-of-type tbody') ||
 document.getElementById('ot-tabla-body');
 if(!tbody) return;
 if(ots.length === 0) {
 tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#aaa;">Sin órdenes de trabajo. Use el formulario para programar.</td></tr>';
 return;
 }
 const badgeMap = {'Ejecutado':'badge-verde','En curso':'badge-azul','Programado':'badge-amarillo'};
 tbody.innerHTML = ots.slice().reverse().slice(0,20).map(o=>`<tr>
 <td><strong>${o.num}</strong></td>
 <td>${o.tipo}</td>
 <td>${o.zona||'—'}</td>
 <td>${o.fecha||'—'}</td>
 <td><span class="badge ${badgeMap[o.estado]||'badge-gris'}">${o.estado}</span></td>
 </tr>`).join('');
const programadas = ots.filter(o=>o.estado==='Programado').length;
 safeSet('mant-mant', programadas);
}

function mantEjecutado() {
 const ots = DB.get('ots');
 const enCurso = ots.filter(o=>o.estado==='En curso'||o.estado==='Programado');
 if(enCurso.length === 0) { showToast('No hay OT activas para marcar como ejecutadas', 'info'); return; }
 const ultima = enCurso[enCurso.length-1];
 DB.update('ots', ultima.id, { estado:'Ejecutado', fecha_ejecucion: hoy() });
 mantActualizarTabla();
 showToast('✅ '+ultima.num+' marcada como Ejecutada');
}

function mantEliminar(btn) {
 const fila = btn.closest('tr');
 if(!fila) return;
 if(!confirmar('¿Eliminar esta orden de trabajo?')) return;
 fila.remove();
 showToast('🗑️ Orden eliminada');
}

function mantProgramar() {
 const tipo = document.querySelector('#page-mantenimiento select')?.value || 'Preventivo';
 const zona = document.querySelector('#page-mantenimiento input[placeholder="Ej: Zona Norte, Calle 12"]')?.value || '';
 const fecha = document.querySelector('#page-mantenimiento input[type="date"]')?.value || hoy();
 const tecnico= document.querySelector('#page-mantenimiento input[placeholder="Nombre del técnico"]')?.value || '';
 const lumsN = document.querySelector('#page-mantenimiento input[placeholder="0"]')?.value || '0';
 const activ = document.querySelector('#page-mantenimiento select:nth-of-type(3)')?.value || '';

 if(!zona && !tecnico) { showToast('⚠️ Ingresa zona y técnico asignado', 'warning'); return; }

 const num = 'OT-'+new Date().getFullYear()+'-'+String(DB.get('ots').length+1).padStart(4,'0');
 const ot = { num, tipo, zona, fecha, tecnico, luminarias:lumsN, actividad:activ, estado:'Programado' };
 DB.add('ots', ot);
 mantActualizarTabla();
 showToast('✅ '+num+' programada correctamente');
}

function muni_calc() {
 const cr = parseFloat(document.getElementById('mn-cr')?.value)||0;
 const wacc = 0.1136;
 const vida = 20;
 const id = parseFloat(document.getElementById('mn-id')?.value||99)/100;
 const caanA = cr > 0 ? cr*(wacc/(1-Math.pow(1+wacc,-vida))) : 0;
 const cinvA = caanA*id;
 const cseeA = (parseFloat(document.getElementById('mn-csee')?.value)||0)*12;
 const caomA = cr * 0.074 * id;
 const cotrA = (cinvA+caomA)*0.08;
 const ctmax = cseeA + cinvA + caomA + cotrA;
 const recaudo = (parseFloat(document.getElementById('mn-recaudo')?.value)||0)*12;
 const cumple = recaudo <= ctmax;
 const div=document.getElementById('muni-calc-result');
 if(div) div.innerHTML=`
 <div style="background:linear-gradient(135deg,#003366,#0055A5);color:white;border-radius:8px;padding:12px 16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:0.78rem;">
 <div><div style="color:#A8C4E0;">CAAn Anual</div><strong>${formatCOP(Math.round(caanA))}</strong></div>
 <div><div style="color:#A8C4E0;">CTMAX Anual</div><strong style="color:#FFD700;">${formatCOP(Math.round(ctmax))}</strong></div>
 <div><div style="color:#A8C4E0;">Art.351</div><strong style="color:${cumple?'#2ECC71':'#E74C3C'}">${cumple?'✅ CUMPLE':'⚠️ EXCEDE'}</strong></div>
 </div>`;
}

function muni_cargarEnETR(id) {
 const m = MUNICIPIOS_DB[id];
 if(!m) return;
 const setV = (elId, v) => { const el=document.getElementById(elId); if(el) el.value=v||''; };
 setV('etr-municipio', m.nombre); setV('etr-dpto', m.dpto);
 setV('etr-vigencia', m.vigencia); setV('etr-secretario', m.secretario);
 setV('etr-comer', m.comercializadora);
 setV('i-crL', Math.round(m.cr_total * 0.62));
 setV('i-crTA', Math.round(m.cr_total * 0.38));
 setV('mn-csee', m.csee_mes);
 setV('p-tkwh', m.tarifa_kwh);
 if(typeof calcETR === 'function') calcETR();
 showPage('datos-etr');
 alert('✅ Datos de '+m.nombre+' cargados en el módulo ETR');
}

function muni_editar(id) {
 const m = MUNICIPIOS_DB[id];
 if(!m) return;
 const setV = (elId, v) => { const el=document.getElementById(elId); if(el){el.value=v||'';} };
 setV('mn-nombre',m.nombre); setV('mn-dpto',m.dpto); setV('mn-nit',m.nit);
 setV('mn-dane',m.dane); setV('mn-secretario',m.secretario); setV('mn-alcalde',m.alcalde);
 setV('mn-vigencia',m.vigencia); setV('mn-comer',m.comercializadora);
 setV('mn-luminarias',m.luminarias); setV('mn-cr',m.cr_total);
 setV('mn-csee',m.csee_mes); setV('mn-tarifa',m.tarifa_kwh);
 setV('mn-recaudo',m.recaudo_mes); setV('mn-id',(m.id_pct||0.99)*100);
 const nm=document.getElementById('mn-nombre'); if(nm) nm.dataset.editId=id;
 document.getElementById('muni-modal').style.display='flex';
 muni_calc();
}

function muni_eliminar(id) {
 const m = MUNICIPIOS_DB[id];
 if(!confirm('¿Eliminar municipio '+( m?.nombre||id)+'?')) return;
 delete MUNICIPIOS_DB[id];
 localStorage.setItem('MUNICIPIOS_DB', JSON.stringify(MUNICIPIOS_DB));
 muni_renderLista(); muni_renderComparativo();
}

function muni_exportar() {
 const munis=Object.values(window.MUNICIPIOS_DB||{});
 if(munis.length===0){alert('No hay municipios registrados.');return;}
 const h='Municipio;Departamento;Luminarias;CR_Total;CTMAX_Anual;Recaudo_IAP;Art351;Vigencia\n';
 const rows=munis.map(m=>[m.nombre,m.dpto,m.luminarias,Math.round(m.cr_total||0),Math.round(m.ctmax_anual||0),Math.round(m.recaudo_anual||0),m.cumple_art351?'CUMPLE':'EXCEDE',m.vigencia].join(';')).join('\n');
 descargarArchivo('\uFEFF'+h+rows,'Comparativo_Regional_SALP.csv','text/csv;charset=utf-8');
 alert('✅ Comparativo de '+munis.length+' municipios exportado.');
}

function muni_guardar() {
  // Leer todos los campos del modal
  function getV(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  function getN(id) {
    var el = document.getElementById(id);
    return el ? parseFloat(el.value) || 0 : 0;
  }

  var nombre = getV('mn-nombre');
  if(!nombre) {
    alert('⚠️ Ingresa el nombre del municipio');
    return;
  }

  var dpto       = getV('mn-dpto');
  var nit        = getV('mn-nit');
  var dane       = getV('mn-dane');
  var secretario = getV('mn-secretario');
  var alcalde    = getV('mn-alcalde');
  var vigencia   = getV('mn-vigencia') || '2024-2027';
  var comer      = getV('mn-comer');
  var luminarias = getN('mn-luminarias');
  var cr         = getN('mn-cr');
  var csee       = getN('mn-csee');
  var tarifa     = getN('mn-tarifa') || 890;
  var recaudo    = getN('mn-recaudo');
  var idPct      = (getN('mn-id') || 99) / 100;

  // Calcular CTMAX
  var wacc = 0.1136;
  var vida = 20;
  var caanA = cr > 0 ? cr * (wacc / (1 - Math.pow(1+wacc, -vida))) : 0;
  var cinvA = caanA * idPct;
  var cseeA = csee * 12;
  var caomA = cr * 0.074 * idPct;
  var cotrA = (cinvA + caomA) * 0.08;
  var ctmaxA = cseeA + cinvA + caomA + cotrA;
  var recaudoA = recaudo * 12;
  var cumple = recaudoA <= ctmaxA;

  // Obtener o crear ID
  var elNombre = document.getElementById('mn-nombre');
  var idEdit = (elNombre && elNombre.dataset && elNombre.dataset.editId) ? elNombre.dataset.editId : ('M-' + Date.now());

  var municipio = {
    id: idEdit,
    nombre: nombre,
    dpto: dpto,
    nit: nit,
    dane: dane,
    secretario: secretario,
    alcalde: alcalde,
    vigencia: vigencia,
    comercializadora: comer,
    luminarias: luminarias,
    cr_total: cr,
    csee_mes: csee,
    tarifa_kwh: tarifa,
    recaudo_mes: recaudo,
    id_pct: idPct,
    ctmax_anual: ctmaxA,
    recaudo_anual: recaudoA,
    cumple_art351: cumple,
    ts: new Date().toISOString()
  };

  // Guardar en memoria y localStorage
  if(!window.MUNICIPIOS_DB) window.MUNICIPIOS_DB = {};
  window.MUNICIPIOS_DB[idEdit] = municipio;
  try {
    localStorage.setItem('MUNICIPIOS_DB', JSON.stringify(window.MUNICIPIOS_DB));
  } catch(e) {}

  // Cerrar modal
  var modal = document.getElementById('muni-modal');
  if(modal) modal.style.display = 'none';

  // Actualizar UI
  if(typeof muni_renderLista === 'function') muni_renderLista();
  if(typeof muni_renderComparativo === 'function') muni_renderComparativo();

  // Notificar
  if(typeof showToast === 'function') {
    showToast('✅ Municipio ' + nombre + ' guardado correctamente', 'success');
  } else {
    alert('✅ Municipio ' + nombre + ' guardado correctamente');
  }
}


function muni_informe_regional() {
 const munis=Object.values(window.MUNICIPIOS_DB||{});
 if(munis.length===0){alert('No hay municipios registrados.');return;}
 let txt='INFORME REGIONAL SALP — FUCDESCOC\nFecha: '+getFecha()+'\n\n';
 munis.forEach(m=>{
 txt+=m.nombre+' ('+m.dpto+')\n';
 txt+=' Luminarias: '+m.luminarias+' | CTMAX: $'+Math.round(m.ctmax_anual||0).toLocaleString('es-CO')+'\n';
 txt+=' Art.351: '+(m.cumple_art351?'CUMPLE':'EXCEDE')+'\n\n';
 });
 descargarArchivo(txt,'Informe_Regional_SALP.doc','application/msword');
 alert('✅ Informe regional generado.');
}

function muni_nuevo() {
 ['mn-nombre','mn-dpto','mn-nit','mn-dane','mn-secretario','mn-alcalde','mn-comer'].forEach(id=>{
 const el=document.getElementById(id); if(el) el.value='';
 });
 ['mn-luminarias','mn-cr','mn-csee','mn-recaudo'].forEach(id=>{
 const el=document.getElementById(id); if(el) el.value='0';
 });
 const nm=document.getElementById('mn-nombre'); if(nm) nm.dataset.editId='';
 document.getElementById('muni-modal').style.display='flex';
}

function muni_renderComparativo() {
 const tbody = document.getElementById('muni-comparativo');
 if(!tbody) return;
 const munis = Object.values(MUNICIPIOS_DB);
 if(munis.length===0) { tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:#aaa;padding:20px;">Sin municipios registrados</td></tr>'; return; }
 tbody.innerHTML = munis.map(m=>`<tr>
 <td><strong>${m.nombre}</strong></td>
 <td>${m.dpto}</td>
 <td>${m.luminarias.toLocaleString('es-CO')}</td>
 <td>${formatCOPM(m.ctmax_anual)}</td>
 <td>${formatCOPM(m.recaudo_anual)}</td>
 <td><span class="badge ${m.cumple_art351?'badge-verde':'badge-rojo'}">${m.cumple_art351?'✅ Cumple':'⚠️ Excede'}</span></td>
 <td>${m.vigencia||'2024-2027'}</td>
 </tr>`).join('');
}

function muni_renderLista() {
 const lista = document.getElementById('muni-lista');
 if(!lista) return;
 const munis = Object.values(MUNICIPIOS_DB);
 if(munis.length===0) {
 lista.innerHTML='<div style="padding:20px;text-align:center;color:#aaa;font-size:0.8rem;">Sin municipios.<br>Clic en "+ Nuevo"</div>';
 return;
 }
 lista.innerHTML = munis.map(m=>`
 <div onclick="muni_seleccionar('${m.id}')" style="padding:10px 14px;border-bottom:1px solid #F0F4F8;cursor:pointer;display:flex;align-items:center;gap:10px;transition:background 0.15s;" onmouseover="this.style.background='#EBF2FA'" onmouseout="this.style.background=''">
 <div style="width:8px;height:8px;border-radius:50%;background:${m.cumple_art351?'#2ECC71':'#E74C3C'};flex-shrink:0;"></div>
 <div style="flex:1;">
 <div style="font-weight:700;font-size:0.82rem;color:#003366;">${m.nombre}</div>
 <div style="font-size:0.7rem;color:#888;">${m.dpto} · ${m.luminarias.toLocaleString('es-CO')} lum.</div>
 </div>
 <button onclick="event.stopPropagation();muni_editar('${m.id}')" style="background:none;border:none;cursor:pointer;font-size:0.8rem;color:#888;">✏️</button>
 <button onclick="event.stopPropagation();muni_eliminar('${m.id}')" style="background:none;border:none;cursor:pointer;font-size:0.8rem;color:#CC2200;">🗑️</button>
 </div>`).join('');
}

function muni_seleccionar(id) {
 const m = MUNICIPIOS_DB[id];
 if(!m) return;
 safeSet('muni-nombre-activo', m.nombre + ' — ' + m.dpto);
 const panel = document.getElementById('muni-panel');
 if(!panel) return;
 panel.innerHTML = `
 <div class="grid-4" style="margin-bottom:14px;">
 <div class="kpi azul"><div class="kpi-value" style="font-size:1.2rem;">${m.luminarias.toLocaleString('es-CO')}</div><div class="kpi-label">Luminarias SALP</div></div>
 <div class="kpi verde"><div class="kpi-value" style="font-size:1.2rem;">${formatCOPM(m.ctmax_anual)}</div><div class="kpi-label">CTMAX Anual</div></div>
 <div class="kpi naranja"><div class="kpi-value" style="font-size:1.2rem;">${formatCOPM(m.recaudo_anual)}</div><div class="kpi-label">Recaudo IAP</div></div>
 <div class="kpi ${m.cumple_art351?'verde':'rojo'}"><div class="kpi-value" style="font-size:1.1rem;">${m.cumple_art351?'✅ OK':'⚠️ Exc.'}</div><div class="kpi-label">Art.351</div></div>
 </div>
 <div class="grid-2">
 <div style="font-size:0.82rem;display:flex;flex-direction:column;gap:6px;">
 ${[['NIT',m.nit],['Código DANE',m.dane],['Secretario/a',m.secretario],['Alcalde',m.alcalde],['Vigencia ETR',m.vigencia],['Comercializadora',m.comercializadora]].map(([k,v])=>`
 <div style="display:flex;justify-content:space-between;padding:5px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">${k}</span><strong>${v||'—'}</strong>
 </div>`).join('')}
 </div>
 <div style="font-size:0.82rem;display:flex;flex-direction:column;gap:6px;">
 ${[['CR Total SALP',formatCOPM(m.cr_total)],['CSEE Mensual',formatCOP(Math.round(m.csee_mes))],['Recaudo IAP/mes',formatCOP(Math.round(m.recaudo_mes))],['ID Disponibilidad',((m.id_pct||0.99)*100).toFixed(1)+'%'],['Tarifa energía',formatCOP(m.tarifa_kwh||890)+'/kWh']].map(([k,v])=>`
 <div style="display:flex;justify-content:space-between;padding:5px 8px;background:#F0F4F8;border-radius:5px;">
 <span style="color:#888;">${k}</span><strong>${v}</strong>
 </div>`).join('')}
 </div>
 </div>
 <div class="btn-group" style="margin-top:12px;">
 <button class="btn btn-primary btn-sm" onclick="muni_cargarEnETR('${id}')">📥 Cargar en módulo ETR</button>
 <button class="btn btn-outline btn-sm" onclick="muni_editar('${id}')">✏️ Editar</button>
 </div>`;
}

function registrarIncidencia() {
 const poste = gVal('inc-poste') || 'Sin código';
 const tipo = document.getElementById('inc-tipo')?.value || 'Luminaria apagada';
 const dir = gVal('inc-dir') || 'Sin dirección';
 const prior = document.getElementById('inc-prior')?.value || 'media';
 const obs = gVal('inc-obs') || '';

 const iconMap = {'Luminaria apagada':'💡','Cable expuesto':'⚡','Vandalismo':'🔨','Brazo dañado':'🔩','Parpadeo':'🔆','Poste caído/inclinado':'⚠️'};
 const icon = Object.entries(iconMap).find(([k])=>tipo.includes(k))?.[1] || '🚨';
 const badgeMap = {'alta':'badge-rojo','media':'badge-amarillo','baja':'badge-verde'};
 const ahora = new Date().toLocaleString('es-CO');

 const item = { poste, tipo, dir, prior, obs, icon, ahora, estado:'Abierta' };
 DB.add('incidencias', item);

 const lista = document.getElementById('lista-incidencias');
 if(lista) {
const vacioMsg = lista.querySelector('div[style*="text-align:center"]');
 if(vacioMsg) vacioMsg.remove();
const card = document.createElement('div');
 card.className = 'incidencia-card';
 card.dataset.id = item.ts;
 card.innerHTML = `
 <div class="incid-icon">${icon}</div>
 <div class="incid-body">
 <div class="incid-title">${tipo} — ${poste}</div>
 <div class="incid-meta">📍 ${dir} · 🕐 ${ahora}</div>
 ${obs ? '<div class="incid-meta" style="color:#555;">📝 '+obs+'</div>' : ''}
 </div>
 <div class="incid-status" style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
 <span class="badge ${badgeMap[prior]||'badge-gris'}">${prior.charAt(0).toUpperCase()+prior.slice(1)}</span>
 <button onclick="incCerrar(this)" class="btn btn-sm btn-outline" style="font-size:0.7rem;padding:2px 8px;">✅ Cerrar</button>
 </div>`;
 lista.prepend(card);
 }
 clearFields(['inc-poste','inc-dir','inc-obs']);
 incActualizarContadores();
 showToast('🚨 Incidencia registrada — '+poste);
}

function renderCharts() {
const ct = document.getElementById('chart-tech');
 if(ct) ct.innerHTML = '<div style="text-align:center;padding:30px;color:#aaa;font-size:0.85rem;">Sin datos. Registre luminarias para ver la distribución.</div>';
 const ce = document.getElementById('chart-energia');
 if(ce) ce.innerHTML = '<div style="text-align:center;padding:30px;color:#aaa;font-size:0.85rem;">Sin datos. Configure el ETR para ver el consumo.</div>';
}

function renderGraficasFinancieras() {
const ctxFlujo = document.getElementById('chart-flujo-caja');
 if(ctxFlujo && window._flujoData) {
 const d = window._flujoData;
 const W = ctxFlujo.width = ctxFlujo.offsetWidth || 700;
 ctxFlujo.height = 240;
 const ctx = ctxFlujo.getContext('2d');
 ctx.clearRect(0,0,W,240);
 ctx.fillStyle='#F8FAFB'; ctx.fillRect(0,0,W,240);
const maxV = Math.max(...d.map(f=>Math.max(f.capA,f.recA)))*1.1;
 const minV = Math.min(0,...d.map(f=>f.saldo))*1.1;
 const range = maxV - minV;
 const pad = {top:30,right:20,bottom:40,left:80};
 const chartW = W-pad.left-pad.right;
 const chartH = 240-pad.top-pad.bottom;
 ctx.strokeStyle='#E0E8F0'; ctx.lineWidth=1;
 for(let i=0;i<=4;i++){
 const y=pad.top+chartH*(1-i/4);
 ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(W-pad.right,y); ctx.stroke();
 ctx.fillStyle='#888'; ctx.font='10px Arial'; ctx.textAlign='right';
 ctx.fillText(formatCOPM(minV+range*(i/4)), pad.left-4, y+4);
 }
 const zeroY = pad.top + chartH*(1-(-minV/range));
 ctx.strokeStyle='#999'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
 ctx.beginPath(); ctx.moveTo(pad.left,zeroY); ctx.lineTo(W-pad.right,zeroY); ctx.stroke();
 ctx.setLineDash([]);
const barW = chartW/d.length * 0.3;
 d.forEach((f,i) => {
 const x = pad.left + (i+0.5)*(chartW/d.length);
const ctmaxH = (f.capA/range)*chartH;
 ctx.fillStyle='rgba(0,85,165,0.7)';
 ctx.fillRect(x-barW-2, pad.top+chartH-(f.capA-minV)/range*chartH, barW, (f.capA-minV)/range*chartH);
ctx.fillStyle='rgba(46,139,52,0.7)';
 ctx.fillRect(x+2, pad.top+chartH-(f.recA-minV)/range*chartH, barW, (f.recA-minV)/range*chartH);
const sy = pad.top+chartH-(f.saldo-minV)/range*chartH;
 ctx.fillStyle=f.saldo>=0?'#E87722':'#CC2200';
 ctx.beginPath(); ctx.arc(x, sy, 5, 0, Math.PI*2); ctx.fill();
ctx.fillStyle='#333'; ctx.font='bold 11px Arial'; ctx.textAlign='center';
 ctx.fillText(f.anio, x, 240-pad.bottom+14);
 });
ctx.fillStyle='rgba(0,85,165,0.7)'; ctx.fillRect(pad.left,8,12,10);
 ctx.fillStyle='#333'; ctx.font='10px Arial'; ctx.textAlign='left';
 ctx.fillText('CTMAX',pad.left+15,17);
 ctx.fillStyle='rgba(46,139,52,0.7)'; ctx.fillRect(pad.left+70,8,12,10);
 ctx.fillText('Recaudo IAP',pad.left+85,17);
 ctx.fillStyle='#E87722'; ctx.beginPath(); ctx.arc(pad.left+170,12,4,0,Math.PI*2); ctx.fill();
 ctx.fillStyle='#333'; ctx.fillText('Saldo',pad.left+178,17);
 }
 const ctxPie = document.getElementById('chart-costos-pie');
 if(ctxPie && window._costosData) {
 const c = window._costosData;
 const W2 = ctxPie.width = ctxPie.offsetWidth||700;
 ctxPie.height=240;
 const ctx2=ctxPie.getContext('2d');
 ctx2.clearRect(0,0,W2,240);
 ctx2.fillStyle='#F8FAFB'; ctx2.fillRect(0,0,W2,240);
 const total=c.csee+c.cinv+c.caom+c.cotr||1;
 const slices=[
 {v:c.csee,color:'#0055A5',label:'CSEE'},
 {v:c.cinv,color:'#2E8B34',label:'CINV'},
 {v:c.caom,color:'#E87722',label:'CAOM'},
 {v:c.cotr,color:'#CC2200',label:'COTR'},
 ];
 const cx2=W2/2, cy2=110, r=90;
 let angle=-Math.PI/2;
 slices.forEach(s=>{
 const sweep=(s.v/total)*Math.PI*2;
 ctx2.beginPath();
 ctx2.moveTo(cx2,cy2);
 ctx2.arc(cx2,cy2,r,angle,angle+sweep);
 ctx2.closePath();
 ctx2.fillStyle=s.color; ctx2.fill();
 ctx2.strokeStyle='white'; ctx2.lineWidth=2; ctx2.stroke();
const midA=angle+sweep/2;
 const lx=cx2+Math.cos(midA)*(r*0.65), ly=cy2+Math.sin(midA)*(r*0.65);
 ctx2.fillStyle='white'; ctx2.font='bold 11px Arial'; ctx2.textAlign='center';
 ctx2.fillText(((s.v/total)*100).toFixed(0)+'%',lx,ly+4);
 angle+=sweep;
 });
slices.forEach((s,i)=>{
 const lx=20, ly=20+i*22;
 ctx2.fillStyle=s.color; ctx2.fillRect(W2-120,ly,14,14);
 ctx2.fillStyle='#333'; ctx2.font='11px Arial'; ctx2.textAlign='left';
 ctx2.fillText(s.label+': '+((s.v/total)*100).toFixed(1)+'%',W2-102,ly+11);
 });
 ctx2.fillStyle='#003366'; ctx2.font='bold 13px Arial'; ctx2.textAlign='center';
 ctx2.fillText('CTMAX = '+formatCOPM(total*12)+'/año',cx2,cy2+120);
 }
 const ctxWT = document.getElementById('chart-wacc-tir');
 if(ctxWT && window._waccData) {
 const d=window._waccData;
 const W3=ctxWT.width=ctxWT.offsetWidth||700;
 ctxWT.height=240;
 const ctx3=ctxWT.getContext('2d');
 ctx3.clearRect(0,0,W3,240);
 ctx3.fillStyle='#F8FAFB'; ctx3.fillRect(0,0,W3,240);
 const pad3={top:30,right:20,bottom:40,left:60};
 const rates=[4,6,8,10,11.36,12,14,16,18,20];
 const vpns=rates.map(r=>{
 let npv=-d.inversion;
 (d.flujo||[]).forEach((f,i)=>{npv+=f/(Math.pow(1+r/100,i+1));});
 return npv;
 });
 const maxNPV=Math.max(...vpns)*1.1, minNPV=Math.min(...vpns)*1.1;
 const rangeNPV=maxNPV-minNPV||1;
 const cW=W3-pad3.left-pad3.right, cH=240-pad3.top-pad3.bottom;
 ctx3.strokeStyle='#E0E8F0'; ctx3.lineWidth=1;
 for(let i=0;i<=4;i++){
 const y=pad3.top+cH*(1-i/4);
 ctx3.beginPath();ctx3.moveTo(pad3.left,y);ctx3.lineTo(W3-pad3.right,y);ctx3.stroke();
 ctx3.fillStyle='#888';ctx3.font='9px Arial';ctx3.textAlign='right';
 ctx3.fillText(formatCOPM(minNPV+rangeNPV*(i/4)),pad3.left-3,y+4);
 }
const z3=pad3.top+cH*(1-(-minNPV/rangeNPV));
 ctx3.strokeStyle='#999';ctx3.lineWidth=1;ctx3.setLineDash([3,3]);
 ctx3.beginPath();ctx3.moveTo(pad3.left,z3);ctx3.lineTo(W3-pad3.right,z3);ctx3.stroke();
 ctx3.setLineDash([]);
ctx3.beginPath();ctx3.strokeStyle='#0055A5';ctx3.lineWidth=2.5;
 rates.forEach((r,i)=>{
 const x=pad3.left+(i/(rates.length-1))*cW;
 const y=pad3.top+cH*(1-(vpns[i]-minNPV)/rangeNPV);
 i===0?ctx3.moveTo(x,y):ctx3.lineTo(x,y);
 });
 ctx3.stroke();
const waccX=pad3.left+((11.36-4)/(20-4))*cW;
 ctx3.strokeStyle='#E87722';ctx3.lineWidth=2;ctx3.setLineDash([5,3]);
 ctx3.beginPath();ctx3.moveTo(waccX,pad3.top);ctx3.lineTo(waccX,240-pad3.bottom);ctx3.stroke();
 ctx3.setLineDash([]);
 ctx3.fillStyle='#E87722';ctx3.font='bold 10px Arial';ctx3.textAlign='center';
 ctx3.fillText('WACC 11.36%',waccX,pad3.top-5);
const tirV=d.tir*100;
 if(tirV>=4&&tirV<=20){
 const tirX=pad3.left+((tirV-4)/16)*cW;
 ctx3.strokeStyle='#2E8B34';ctx3.lineWidth=2;ctx3.setLineDash([5,3]);
 ctx3.beginPath();ctx3.moveTo(tirX,pad3.top);ctx3.lineTo(tirX,240-pad3.bottom);ctx3.stroke();
 ctx3.setLineDash([]);
 ctx3.fillStyle='#2E8B34';ctx3.font='bold 10px Arial';ctx3.textAlign='center';
 ctx3.fillText('TIR '+tirV.toFixed(1)+'%',tirX,240-pad3.bottom+20);
 }
[4,8,12,16,20].forEach(r=>{
 const x=pad3.left+((r-4)/16)*cW;
 ctx3.fillStyle='#666';ctx3.font='9px Arial';ctx3.textAlign='center';
 ctx3.fillText(r+'%',x,240-pad3.bottom+14);
 });
 ctx3.fillStyle='#003366';ctx3.font='bold 12px Arial';ctx3.textAlign='center';
 ctx3.fillText('Curva VPN vs Tasa de Descuento',W3/2,pad3.top-15);
 }
 const ctxFAOM = document.getElementById('chart-faom-senda');
 if(ctxFAOM) {
 const W4=ctxFAOM.width=ctxFAOM.offsetWidth||700;
 ctxFAOM.height=240;
 const ctx4=ctxFAOM.getContext('2d');
 ctx4.clearRect(0,0,W4,240);
 ctx4.fillStyle='#F8FAFB'; ctx4.fillRect(0,0,W4,240);
 const senda=[{y:2021,v:0.093},{y:2022,v:0.097},{y:2023,v:0.092},{y:2024,v:0.086},{y:2025,v:0.080},{y:2026,v:0.074},{y:2027,v:0.069},{y:2028,v:0.063}];
 const pad4={top:30,right:20,bottom:40,left:60};
 const cW4=W4-pad4.left-pad4.right, cH4=240-pad4.top-pad4.bottom;
 const maxF=0.110, minF=0.055;
ctx4.strokeStyle='#E0E8F0';ctx4.lineWidth=1;
 [0.06,0.07,0.08,0.09,0.10].forEach(v=>{
 const y=pad4.top+cH4*(1-(v-minF)/(maxF-minF));
 ctx4.beginPath();ctx4.moveTo(pad4.left,y);ctx4.lineTo(W4-pad4.right,y);ctx4.stroke();
 ctx4.fillStyle='#888';ctx4.font='9px Arial';ctx4.textAlign='right';
 ctx4.fillText(v.toFixed(3),pad4.left-4,y+4);
 });
const bw=(cW4/senda.length)*0.6;
 senda.forEach((s,i)=>{
 const x=pad4.left+(i+0.5)*(cW4/senda.length);
 const h=((s.v-minF)/(maxF-minF))*cH4;
 const y=pad4.top+cH4-h;
 const isActual=s.y===2026;
 ctx4.fillStyle=isActual?'#E87722':'#0055A5';
 ctx4.fillRect(x-bw/2,y,bw,h);
 ctx4.fillStyle='white';ctx4.font='bold 9px Arial';ctx4.textAlign='center';
 if(h>15) ctx4.fillText(s.v.toFixed(3),x,y+12);
 ctx4.fillStyle='#333';ctx4.font=isActual?'bold 10px Arial':'9px Arial';
 ctx4.fillText(s.y,x,240-pad4.bottom+14);
 });
 ctx4.fillStyle='#003366';ctx4.font='bold 12px Arial';ctx4.textAlign='center';
 ctx4.fillText('Senda FAOML — Párrafo 3 Art.35 Res.CREG 101013/2022',W4/2,16);
 ctx4.fillStyle='#E87722';ctx4.font='10px Arial';
 ctx4.fillText('▶ 2026: 0.074 (año actual)',W4/2,28);
 }
}

function renderPosotes() {
 const container = document.getElementById('postes-container');
 container.innerHTML = '';
 postesData.forEach(p => {
 const div = document.createElement('div');
 div.className = `poste ${p.estado}`;
 div.style.left = p.x + 'px';
 div.style.top = p.y + 'px';
 div.title = p.id;
 div.innerHTML = `<div class="poste-tooltip">
 <strong>${p.id}</strong><br>
 💡 ${p.tipo}<br>
 📏 Alt: ${p.altura}m<br>
 ⚙️ ${p.estado.charAt(0).toUpperCase()+p.estado.slice(1)}
 </div>`;
 container.appendChild(div);
 });
 document.getElementById('mapa-count').textContent = postesData.length;
 actualizarTablaPostes();
}

function safeSet(id, val) {
 const el = document.getElementById(id);
 if(el) el.textContent = val;
}

function setRes(id, html){ const e=document.getElementById(id); if(e) e.innerHTML=html; }

function setVal(id, v) { const e=document.getElementById(id); if(e) e.value=v||''; }

function showTab(btn, panelId) {
 const parent = btn.closest('.card') || btn.closest('.page');
 parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
 parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
 btn.classList.add('active');
 const panel = document.getElementById(panelId);
 if(panel) panel.classList.add('active');
}

function showToast(msg, tipo='success') {
 let t = document.getElementById('sieap-toast');
 if(!t){ t=document.createElement('div'); t.id='sieap-toast';
 t.style.cssText='position:fixed;bottom:20px;right:20px;z-index:99999;padding:12px 20px;border-radius:8px;font-size:0.85rem;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.3);max-width:360px;transition:all 0.3s;';
 document.body.appendChild(t); }
 const colors={'success':'#D4EDDA:#1a7a2a','error':'#F8D7DA:#721c24','info':'#CCE5FF:#004085','warning':'#FFF3CD:#856404'};
 const [bg,color]=(colors[tipo]||colors.success).split(':');
 t.style.background=bg; t.style.color=color; t.style.border='1px solid '+color;
 t.textContent=msg; t.style.display='block';
 setTimeout(()=>{ t.style.display='none'; }, 3500);
}

function simularTarifas() {
 const csee = parseFloat(document.getElementById('ctmax-csee')?.value)||0;
 const cinv = parseFloat(document.getElementById('ctmax-cinv')?.value)||0;
 const caom = parseFloat(document.getElementById('ctmax-caom')?.value)||0;
 const cotr = parseFloat(document.getElementById('ctmax-cotr')?.value)||0;
 if(csee===0 && cinv===0 && caom===0 && cotr===0) {
 const er=document.getElementById('escenarios-resultado');
 if(er) er.innerHTML='<div style="padding:20px;color:#aaa;text-align:center;grid-column:1/-1;">Ingresa los componentes del CTMAX para simular escenarios tarifarios</div>';
 safeSet('ctmax-total-sim','$0'); return;
 }
 const tarE = parseFloat(document.getElementById('st-tarifa-kwh').value)||890;
 const sectores = [
 {id:'e1', label:'Estrato 1', tipo:'pct'},
 {id:'e2', label:'Estrato 2', tipo:'pct'},
 {id:'e3', label:'Estrato 3', tipo:'pct'},
 {id:'e4', label:'Estrato 4', tipo:'pct'},
 {id:'e5', label:'Estrato 5', tipo:'pct'},
 {id:'e6', label:'Estrato 6', tipo:'pct'},
 {id:'com', label:'Comercial', tipo:'kwh'},
 {id:'ind', label:'Industrial', tipo:'kwh'},
 ];
 const csee = parseFloat(document.getElementById('ctmax-csee').value)||0;
 const cinv = parseFloat(document.getElementById('ctmax-cinv').value)||0;
 const caom = parseFloat(document.getElementById('ctmax-caom').value)||0;
 const cotr = parseFloat(document.getElementById('ctmax-cotr').value)||0;
 const ctmax = csee + cinv + caom + cotr;
 safeSet('ctmax-total-sim', formatCOP(ctmax));
 safeSet('ctmax-anual-display', 'Anual: ' + formatCOP(ctmax*12));

 let totalA=0, totalB=0, totalC=0;
 let tbodyHTML = '';

 sectores.forEach(s => {
 const cnt = parseFloat(document.getElementById('cnt-'+s.id).value)||0;
 const kw = parseFloat(document.getElementById('kw-'+s.id).value)||0;
 const tA = parseFloat(document.getElementById('tA-'+s.id).value)||0;
 const tB = parseFloat(document.getElementById('tB-'+s.id).value)||0;
 const tC = parseFloat(document.getElementById('tC-'+s.id).value)||0;
 const facturaE = kw * tarE;
let iapA, iapB, iapC;
 if(s.tipo === 'pct') {
 iapA = facturaE * (tA/100);
 iapB = facturaE * (tB/100);
 iapC = facturaE * (tC/100);
 } else {
 iapA = kw * tA;
 iapB = kw * tB;
 iapC = kw * tC;
 }
const recA = iapA * cnt;
 const recB = iapB * cnt;
 const recC = iapC * cnt;
 totalA += recA; totalB += recB; totalC += recC;
const unidad = s.tipo === 'pct' ? tB.toFixed(1)+'%' : '$'+tB+'/kWh';
 tbodyHTML += `<tr>
 <td>${s.label}</td>
 <td>${cnt.toLocaleString('es-CO')}</td>
 <td>${kw} kWh</td>
 <td>${formatCOP(recA)}</td>
 <td><strong>${formatCOP(recB)}</strong></td>
 <td>${formatCOP(recC)}</td>
 <td>${formatCOP(iapB)}</td>
 </tr>`;
 });

 const tb = document.getElementById('tabla-escenarios');
 if(tb) tb.innerHTML = tbodyHTML + `<tr style="background:#E8F4FD;font-weight:700;">
 <td colspan="3">TOTAL RECAUDO MENSUAL</td>
 <td>${formatCOP(totalA)}</td>
 <td>${formatCOP(totalB)}</td>
 <td>${formatCOP(totalC)}</td>
 <td>—</td>
 </tr>`;

 const pctA = (totalA/ctmax*100).toFixed(1);
 const pctB = (totalB/ctmax*100).toFixed(1);
 const pctC = (totalC/ctmax*100).toFixed(1);
 const colorEsc = (pct) => parseFloat(pct) > 100 ? 'rojo' : parseFloat(pct) > 90 ? 'naranja' : 'verde';

 const erDiv = document.getElementById('escenarios-resultado');
 if(erDiv) erDiv.innerHTML = `
 <div class="kpi ${colorEsc(pctA)}">
 <div class="kpi-value" style="font-size:1.4rem;">${formatCOP(totalA)}</div>
 <div class="kpi-label">Escenario A — Bajo</div>
 <div class="kpi-sub">${pctA}% del CTMAX ${parseFloat(pctA)>100?'⚠️ EXCEDE LÍMITE':'✅ Dentro del límite'}</div>
 </div>
 <div class="kpi ${colorEsc(pctB)}">
 <div class="kpi-value" style="font-size:1.4rem;">${formatCOP(totalB)}</div>
 <div class="kpi-label">Escenario B ★ — Medio</div>
 <div class="kpi-sub">${pctB}% del CTMAX ${parseFloat(pctB)>100?'⚠️ EXCEDE LÍMITE':'✅ Dentro del límite'}</div>
 </div>
 <div class="kpi ${colorEsc(pctC)}">
 <div class="kpi-value" style="font-size:1.4rem;">${formatCOP(totalC)}</div>
 <div class="kpi-label">Escenario C — Alto</div>
 <div class="kpi-sub">${pctC}% del CTMAX ${parseFloat(pctC)>100?'⚠️ EXCEDE LÍMITE':'✅ Dentro del límite'}</div>
 </div>
 `;
}

function tarifaAgregarEscala() {
 const sector = document.getElementById('tar-estrato')?.options[document.getElementById('tar-estrato')?.selectedIndex]?.text || '';
 const metodo_raw = document.getElementById('tar-metodo')?.value||'consumo';
 const metodo = metodo_raw === 'consumo' ? 'pct' : metodo_raw;
 const tarifa = parseFloat(document.getElementById('tar-pct')?.value)||0;
 const vigencia = new Date().getFullYear()+'-'+(new Date().getFullYear()+3);
 if(!tarifa) { alert('Primero ingresa la tarifa en la calculadora'); return; }
 TARIFAS_DB.push({ sector, metodo, tarifa, tope:'', vigencia });
 localStorage.setItem('TARIFAS_DB', JSON.stringify(TARIFAS_DB));
 tarifaRenderTabla();
 alert('✅ Tarifa agregada a la escala del municipio.');
}

function tarifaAgregarManual() {
 document.getElementById('modal-tarifa').style.display = 'flex';
}

function tarifaCargarEjemplo() {
 if(!confirm('¿Cargar escala tarifaria de ejemplo? (reemplazará la actual)')) return;
 TARIFAS_DB = [
 {sector:'Estrato 1',metodo:'pct',tarifa:2.5,tope:'4200',vigencia:'2024-2027'},
 {sector:'Estrato 2',metodo:'pct',tarifa:4.0,tope:'6800',vigencia:'2024-2027'},
 {sector:'Estrato 3',metodo:'pct',tarifa:5.5,tope:'12500',vigencia:'2024-2027'},
 {sector:'Estrato 4',metodo:'pct',tarifa:8.0,tope:'22000',vigencia:'2024-2027'},
 {sector:'Estrato 5',metodo:'pct',tarifa:12.0,tope:'38000',vigencia:'2024-2027'},
 {sector:'Estrato 6',metodo:'pct',tarifa:15.0,tope:'55000',vigencia:'2024-2027'},
 {sector:'Comercial',metodo:'kwh',tarifa:80,tope:'',vigencia:'2024-2027'},
 {sector:'Industrial',metodo:'kwh',tarifa:90,tope:'',vigencia:'2024-2027'},
 {sector:'Oficial',metodo:'fijo',tarifa:0,tope:'0',vigencia:'2024-2027'},
 ];
 localStorage.setItem('TARIFAS_DB', JSON.stringify(TARIFAS_DB));
 tarifaRenderTabla();
 alert('✅ Escala de ejemplo cargada. Modifícala según el Acuerdo vigente.');
}

function tarifaDescargarPlantilla() {
 const p = 'sector;metodo(pct/kwh/fijo);tarifa;tope_mensual_COP;vigencia\n' +
 'Estrato 1;pct;2.5;4200;2024-2027\n' +
 'Estrato 2;pct;4.0;6800;2024-2027\n' +
 'Estrato 3;pct;5.5;12500;2024-2027\n' +
 'Estrato 4;pct;8.0;22000;2024-2027\n' +
 'Estrato 5;pct;12.0;38000;2024-2027\n' +
 'Estrato 6;pct;15.0;55000;2024-2027\n' +
 'Comercial;kwh;80;;2024-2027\n' +
 'Industrial;kwh;90;;2024-2027\n' +
 'Oficial;fijo;0;;2024-2027\n';
 if(window.descargarArchivo) descargarArchivo('\uFEFF'+p, 'Plantilla_Tarifas_IAP.csv', 'text/csv;charset=utf-8');
 else { const b=new Blob(['\uFEFF'+p],{type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='Plantilla_Tarifas_IAP.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
}

function tarifaEliminar(idx) {
 if(!confirm('¿Eliminar esta tarifa?')) return;
 TARIFAS_DB.splice(idx,1);
 localStorage.setItem('TARIFAS_DB', JSON.stringify(TARIFAS_DB));
 tarifaRenderTabla();
}

function tarifaExportar() {
 if(TARIFAS_DB.length===0){alert('No hay tarifas registradas.');return;}
 const muni = document.getElementById('etr-municipio')?.value||'Municipio';
 const header = '\uFEFF' + 'Estrato/Sector;Metodo;Tarifa;Tope_Mensual;Vigencia\n';
 const rows = TARIFAS_DB.map(t=>[t.sector,t.metodo,t.tarifa,t.tope||'',t.vigencia||''].join(';')).join('\n');
 if(window.descargarArchivo) descargarArchivo(header+rows,'Escala_Tarifaria_IAP_'+muni+'.csv','text/csv;charset=utf-8');
 else { const b=new Blob([header+rows],{type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='Escala_Tarifaria_IAP_'+muni+'.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
 alert('✅ Escala tarifaria exportada.');
}

function tarifaGenerarAcuerdo() {
 if(TARIFAS_DB.length===0){alert('Primero registra las tarifas del municipio.');return;}
 const muni = document.getElementById('etr-municipio')?.value||'_________';
 const fecha = new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'});
 let txt = 'ACUERDO N. ___ DE '+new Date().getFullYear()+'\n';
 txt += '"POR EL CUAL SE ESTABLECE EL IMPUESTO DE ALUMBRADO PUBLICO"\n\n';
 txt += 'EL CONCEJO MUNICIPAL DE '+muni.toUpperCase()+'\n\n';
 txt += 'ARTÍCULO 5. TARIFAS.\n';
 txt += 'Conforme al ETR elaborado según Res. CREG 101013/2022 y CE Sent. 22161/2019:\n\n';
 TARIFAS_DB.forEach(t=>{
 txt += t.sector+': ';
 if(t.metodo==='pct') txt += t.tarifa+'% sobre la factura de energía';
 else if(t.metodo==='kwh') txt += '$'+t.tarifa+' por kWh consumido';
 else txt += '$'+t.tarifa.toLocaleString('es-CO')+' mensual fijo';
 if(t.tope) txt += ' (tope: $'+parseFloat(t.tope).toLocaleString('es-CO')+'/mes)';
 txt += '\n';
 });
 txt += '\nVigencia: '+((TARIFAS_DB[0]?.vigencia)||'2024-2027')+'\n';
 txt += '\nBase: Art.351 Ley 1819/2016 | CE Sent.22161/2019 | Res.CREG 101013/2022\n';
 txt += '\nFUCDESCOC — NIT 900.517.521-0 | '+fecha;
 if(window.descargarArchivo) descargarArchivo(txt,'Acuerdo_Tarifas_IAP_'+muni+'.doc','application/msword');
 else { const b=new Blob([txt],{type:'application/msword'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='Acuerdo_Tarifas_IAP_'+muni+'.doc'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
 alert('✅ Acuerdo Municipal con tarifas descargado.');
}

function tarifaGenerarLiquidacion() {
 const estrato = document.getElementById('tar-estrato')?.options[document.getElementById('tar-estrato')?.selectedIndex]?.text||'';
 const kwh = parseFloat(document.getElementById('tar-consumo')?.value)||0;
 const tarifaE = parseFloat(document.getElementById('tar-tarifa-energia')?.value)||0;
 const pct = parseFloat(document.getElementById('tar-pct')?.value)||0;
 const iap = parseFloat(document.getElementById('monto-iap')?.textContent?.replace(/[^0-9]/g,'')||'0');
 const muni = document.getElementById('etr-municipio')?.value||'Municipio';
 const fecha = new Date().toLocaleDateString('es-CO');
 const txt = 'LIQUIDACIÓN IAP\nMunicipio: '+muni+'\nFecha: '+fecha+'\n\n'+
 'Sector: '+estrato+'\nConsumo: '+kwh+' kWh/mes\nTarifa energía: $'+tarifaE+'/kWh\nTarifa IAP: '+pct+'%\n\n'+
 'IAP A PAGAR: $'+iap.toLocaleString('es-CO')+'\n\n'+
 'Base: Art.349-353 Ley 1819/2016 | Acuerdo Municipal | CREG 101013/2022';
 if(window.descargarArchivo) descargarArchivo(txt,'Liquidacion_IAP.doc','application/msword');
 else { const b=new Blob([txt],{type:'application/msword'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='Liquidacion_IAP.doc'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
}

function tarifaGuardarManual() {
 const sector = document.getElementById('mt-sector')?.value||'';
 const metodo = document.getElementById('mt-metodo')?.value||'pct';
 const tarifa = parseFloat(document.getElementById('mt-tarifa')?.value)||0;
 const tope = document.getElementById('mt-tope')?.value||'';
 const vigencia = document.getElementById('mt-vigencia')?.value||'';
 if(!sector || !tarifa) { alert('Ingresa sector y tarifa'); return; }
 TARIFAS_DB.push({ sector, metodo, tarifa, tope, vigencia });
 localStorage.setItem('TARIFAS_DB', JSON.stringify(TARIFAS_DB));
 document.getElementById('modal-tarifa').style.display = 'none';
 tarifaRenderTabla();
 alert('✅ Tarifa agregada a la escala.');
}

function tarifaImportarCSV() {
 const input = document.createElement('input');
 input.type='file'; input.accept='.csv,.txt';
 input.onchange = e => {
 const file = e.target.files[0]; if(!file) return;
 const reader = new FileReader();
 reader.onload = ev => {
 const lineas = ev.target.result.trim().split('\n');
 let n = 0;
 for(let i=1; i<lineas.length; i++){
 const c = lineas[i].split(/[;,]/);
 if(c.length < 3) continue;
 const sector = (c[0]||'').trim();
 const metodo = (c[1]||'pct').trim();
 const tarifa = parseFloat(c[2])||0;
 const tope = (c[3]||'').trim();
 const vigencia = (c[4]||'').trim();
 if(!sector || !tarifa) continue;
 TARIFAS_DB.push({ sector, metodo, tarifa, tope, vigencia });
 n++;
 }
 localStorage.setItem('TARIFAS_DB', JSON.stringify(TARIFAS_DB));
 tarifaRenderTabla();
 alert('✅ '+n+' tarifas importadas.\n\nFormato: sector;metodo;tarifa;tope_mensual;vigencia');
 };
 reader.readAsText(file,'UTF-8');
 };
 input.click();
}

function tarifaLimpiar() {
 if(!confirm('¿Limpiar toda la escala tarifaria?')) return;
 TARIFAS_DB = [];
 localStorage.setItem('TARIFAS_DB', JSON.stringify(TARIFAS_DB));
 tarifaRenderTabla();
}

function tarifaRenderTabla() {
 const tbody = document.getElementById('tarifa-tabla');
 if(!tbody) return;
 if(TARIFAS_DB.length === 0) {
 tbody.innerHTML = '<tr id="tarifa-empty-row"><td colspan="6" style="text-align:center;padding:20px;color:#aaa;"><div style="font-size:1.5rem;margin-bottom:6px;">💰</div>Sin tarifas registradas.<br>Use <strong>📥 Importar CSV</strong> o agrega manualmente.</td></tr>';
 document.getElementById('tar-total-contrib').textContent = '0';
 document.getElementById('tar-recaudo-mes').textContent = '$0';
 document.getElementById('tar-recaudo-anual').textContent = '$0';
 return;
 }
 tbody.innerHTML = TARIFAS_DB.map((t,i) => `<tr>
 <td><strong>${t.sector}</strong></td>
 <td>${t.metodo}</td>
 <td><strong>${t.tarifa}${t.metodo==='pct'?'%':t.metodo==='kwh'?' $/kWh':' COP fijo'}</strong></td>
 <td>${t.tope ? '$'+parseFloat(t.tope).toLocaleString('es-CO') : '—'}</td>
 <td>${t.vigencia||'—'}</td>
 <td>
 <button class="btn btn-sm btn-outline" onclick="tarifaEliminar(${i})">🗑️</button>
 </td>
 </tr>`).join('');
 calcProyeccionRecaudo();
}

function updateClock() {
 const now = new Date();
 const opts = {weekday:'short', day:'2-digit', month:'short', year:'numeric'};
 document.getElementById('clock-display').textContent = '🕐 ' + now.toLocaleTimeString('es-CO');
 document.getElementById('date-display').textContent = '📅 ' + now.toLocaleDateString('es-CO', opts);
}

function verLuminaria(codigo,tec,pot,flujo,eficacia,zona,anio,vida,estado) {
 const badge = {Operativa:'badge-verde',Mantenimiento:'badge-amarillo',Reemplazar:'badge-rojo'}[estado]||'badge-gris';
 const ucap = {LED:{cr:850000,vida:25,wacc:0.1136},HID:{cr:520000,vida:15,wacc:0.1136},'Sodio AP':{cr:520000,vida:15,wacc:0.1136},Mercurio:{cr:380000,vida:15,wacc:0.1136}};
 const u = ucap[tec]||ucap['LED'];
 const potW = parseFloat(pot)||100;
 const cr = u.cr*(potW/100);
 const caan = cr*(u.wacc/(1-Math.pow(1+u.wacc,-u.vida)));
 document.getElementById('modal-title').textContent = 'Ficha Técnica — '+codigo;
 document.getElementById('modal-body').innerHTML = `
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.83rem;">
 ${[['Código SIAP',codigo],['Tecnología',tec+' '+pot],['Flujo luminoso',flujo+' lm'],['Eficacia',eficacia],['Zona',zona],['Año instalación',anio],['Vida útil',vida],['Estado','<span class="badge '+badge+'">'+estado+'</span>']].map(([k,v])=>`
 <div style="display:flex;justify-content:space-between;padding:7px 10px;background:#F0F4F8;border-radius:6px;">
 <span style="color:#888;">${k}</span><strong>${v}</strong>
 </div>`).join('')}
 </div>
 <div style="background:linear-gradient(135deg,#003366,#0055A5);color:white;border-radius:8px;padding:12px;margin-top:12px;font-size:0.8rem;">
 <div style="font-weight:700;color:#FFD700;margin-bottom:6px;">💰 Valoración UCAP — CREG 101013/2022</div>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
 <div>CR luminaria: <strong>${formatCOP(Math.round(cr))}</strong></div>
 <div>Vida útil CREG: <strong>${u.vida} años</strong></div>
 <div>CAAn anual: <strong>${formatCOP(Math.round(caan))}</strong></div>
 <div>CINV unit.: <strong>${formatCOP(Math.round(caan*0.99))}</strong></div>
 </div>
 </div>`;
 document.getElementById('modal-overlay').classList.add('show');
}

function verificarRetilap() {
 const clase = document.getElementById('ret-clase').value;
 const em = parseFloat(document.getElementById('ret-em').value)||0;
 const uo = parseFloat(document.getElementById('ret-uo').value)||0;
 const ul = parseFloat(document.getElementById('ret-ul').value)||0;
 const ti = parseFloat(document.getElementById('ret-ti').value)||0;
 const fhs = parseFloat(document.getElementById('ret-fhs').value)||0;
 const irc = parseFloat(document.getElementById('ret-irc').value)||0;
 const req = retilapReqs[clase];
 if(!req) return;

 const checks = [
 {label:'Iluminancia media (Em)', medido:em+' lux', req:'≥'+req.emMin+' lux', ok: em>=req.emMin},
 {label:'Uniformidad global Uo', medido:uo, req:'≥'+req.uo, ok: uo>=req.uo},
 {label:'Uniformidad long. Ul', medido: req.ul ? ul : 'N/A', req: req.ul ? '≥'+req.ul : 'N/A', ok: req.ul ? ul>=req.ul : true},
 {label:'Deslumbramiento TI (%)', medido: req.ti ? ti+'%' : 'N/A', req: req.ti ? '≤'+req.ti+'%' : 'N/A', ok: req.ti ? ti<=req.ti : true},
 {label:'FHS — Flujo Hemisférico Sup.', medido:fhs+'%', req:'≤'+req.fhs+'%', ok: fhs<=req.fhs},
 {label:'IRC', medido:irc, req:'≥'+req.irc, ok: irc>=req.irc},
 ];

 const allOk = checks.every(c=>c.ok);
 const div = document.getElementById('ret-resultado');
 if(!div) return;
 div.innerHTML = `
 <div class="alert ${allOk?'alert-success':'alert-danger'}" style="margin-bottom:10px;">
 ${allOk?'✅ CUMPLE todos los requisitos RETILAP Clase '+clase:'⚠️ INCUMPLIMIENTO RETILAP Clase '+clase+' — Revisar parámetros marcados en rojo'}
 </div>
 ${checks.map(c=>`
 <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;margin-bottom:5px;border-radius:7px;background:${c.ok?'#D4EDDA':'#F8D7DA'};border-left:4px solid ${c.ok?'#1a7a2a':'#721c24'};">
 <span style="font-size:0.82rem;font-weight:600;">${c.label}</span>
 <span style="font-size:0.82rem;">Medido: <strong>${c.medido}</strong> / Req: ${c.req} ${c.ok?'✅':'❌'}</span>
 </div>`).join('')}`;
}