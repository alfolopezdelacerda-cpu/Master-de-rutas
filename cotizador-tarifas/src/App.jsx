import { useState, useEffect, useCallback } from "react";

const APP_VERSION = "1.2";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwYpWx5BDv_4FJvUvG_FzzdAxt6fNUe9d_1vGRmahdwpg7mHyiNIveJHmrJzHa4BRQO/exec";

const STORAGE_KEY = "cotizador_cfg_v4";
const ADMIN_KEY   = "cotizador_admin_v4";

const UNIT_DEFAULTS = {
  "Full":            { diesel:28.5, tractos:1, motriz:850000, cajas:2, remolque:375000, rendimiento:1.8, mtto:2.5, sueldo:40000 },
  "Sencillo":        { diesel:28.5, tractos:1, motriz:850000, cajas:1, remolque:375000, rendimiento:2.1, mtto:2.5, sueldo:27500 },
  "Caja refrigerada":{ diesel:28.5, tractos:1, motriz:850000, cajas:0, remolque:375000, rendimiento:2.1, mtto:2.5, sueldo:27500 },
  "Thorton":         { diesel:28.5, tractos:1, motriz:850000, cajas:0, remolque:375000, rendimiento:3.5, mtto:2.0, sueldo:20000 },
  "Rabón":           { diesel:28.5, tractos:1, motriz:550000, cajas:0, remolque:375000, rendimiento:3.5, mtto:2.0, sueldo:20000 },
  "Camioneta 3.5":   { diesel:25,   tractos:1, motriz:350000, cajas:0, remolque:375000, rendimiento:3.0, mtto:2.0, sueldo:16000 },
  "Camioneta 1.5":   { diesel:25,   tractos:1, motriz:350000, cajas:0, remolque:375000, rendimiento:9.0, mtto:2.0, sueldo:14500 },
};

const BASE_CFG = {
  diesel:28.5, tractos:1, motriz:850000, cajas:2, remolque:375000,
  rendimiento:1.8, mtto:2.5, operadores:1, sueldo:40000,
  cargaSocial:39, alimentosDia:300, ayudantes:0, sueldoAyudante:0,
  cargaSocialAyudante:0
};

const ADMIN_DEFAULT = {
  jefeOpSueldo:38970.87, auxOpSueldo:19790.38, traficoSueldo:23626.50,
  mecanicoSueldo:26183.88, mecanicoCantidad:2,
  pctFull:8, pctSencillo:8, pctRabon:5, pctCam35:3, pctCam15:3,
  telefonia:550, gps:1750, seguroMotriz:5583.33, reservaMotriz:885.42,
  seguroArrastre:0, reservaArrastre:0, canacar:115.69,
  overheadBase:740000, overheadPct:30, overheadDiv:20,
  sobrecostos:33882.91,
  depAnios:5, depRescate:20
};

const mxn  = n => isNaN(n)||!isFinite(n) ? "$0.00" : "$"+Number(n).toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtR = n => isNaN(n)||!isFinite(n) ? 0 : Math.round(n*100)/100;
const toNum = v => parseFloat(String(v).replace(/,/g,""))||0;

const loadObj = (key, fallback) => {
  try {
    const raw = typeof localStorage!=="undefined" ? localStorage.getItem(key) : null;
    return raw ? {...fallback, ...JSON.parse(raw)} : {...fallback};
  } catch { return {...fallback}; }
};

function useCalc(cfg, admin, dist, rot, casetas, sinIva, util, comisionPct, comisionAplica, unit, splitPct) {
  const r = toNum(rot)||1;
  const distViaje    = toNum(dist);
  const kmMes        = distViaje*r;
  const casetasPorViaje = sinIva ? toNum(casetas)*0.84 : toNum(casetas);
  const casetasCosto = casetasPorViaje * r;
  const numRemolques = unit==="Full" ? 2 : unit==="Sencillo" ? 1 : 0;
  const dep = v => (toNum(v)*(1 - toNum(admin.depRescate)/100))/((toNum(admin.depAnios)||5)*12);
  const depMotriz    = dep(cfg.motriz);
  const depRemolque  = dep(cfg.remolque) * numRemolques;
  const costoDiesel  = (kmMes/(toNum(cfg.rendimiento)||1))*toNum(cfg.diesel);
  const costoMtto    = toNum(cfg.mtto)*kmMes;
  const costoAlim    = toNum(cfg.alimentosDia)*r;
  const sueldoBase   = toNum(cfg.sueldo);
  const operadoresN  = toNum(cfg.operadores)||1;
  const cargaSoc     = toNum(cfg.cargaSocial)/100;
  const costoOp      = sueldoBase*operadoresN*(1+cargaSoc);
  const subtotalConc = depMotriz+depRemolque+costoDiesel+casetasCosto+costoMtto+costoOp+costoAlim;

  const adminPct = (
    unit==="Sencillo" ? toNum(admin.pctSencillo)
    : unit==="Caja refrigerada" ? toNum(admin.pctSencillo)
    : unit==="Rabón" ? toNum(admin.pctRabon)
    : unit==="Camioneta 3.5" ? toNum(admin.pctCam35)
    : unit==="Camioneta 1.5" ? toNum(admin.pctCam15)
    : toNum(admin.pctFull)
  )/100;
  const jefeOp   = toNum(admin.jefeOpSueldo)*adminPct;
  const auxOp    = toNum(admin.auxOpSueldo)*adminPct;
  const trafico  = toNum(admin.traficoSueldo)*adminPct;
  const mecanico = toNum(admin.mecanicoSueldo)*(toNum(admin.mecanicoCantidad)||0)*adminPct;
  const overhead = ((toNum(admin.overheadBase)*(toNum(admin.overheadPct)/100))/(toNum(admin.overheadDiv)||1))/r;
  const fijos    = toNum(admin.telefonia)+toNum(admin.gps)+toNum(admin.seguroMotriz)+toNum(admin.reservaMotriz)+toNum(admin.seguroArrastre)+toNum(admin.reservaArrastre)+toNum(admin.canacar);
  const subtotalAdmin = jefeOp+auxOp+trafico+mecanico+fijos+overhead;
  const sobre = toNum(admin.sobrecostos);
  const subtotalCostos = subtotalConc+subtotalAdmin;

  // Costo/tarifa BASE — nunca se ve afectada por la comisión de venta
  const totalCostosBase = subtotalCostos+sobre;
  const tarifaMensual = totalCostosBase/(1-util/100);
  const tarifaRedondo = tarifaMensual/r;
  const tarifaIda = tarifaRedondo*(toNum(splitPct)/100);
  const tarifaRegreso = tarifaRedondo-tarifaIda;

  // Comisión por venta: % de la TARIFA DE REGRESO únicamente (no de la tarifa global)
  const comisionMonto = tarifaRegreso * (toNum(comisionPct)/100);
  const totalCostos = totalCostosBase + (comisionAplica ? comisionMonto*r : 0);
  const costoViaje = totalCostos/r;
  const utilViaje = tarifaRedondo-costoViaje;

  const contenedores = unit==="Full" ? 2 : 0;
  const costoContenedor = contenedores>=2 ? tarifaRedondo/contenedores : 0;

  const gastoDirecto = depMotriz+depRemolque+costoDiesel+casetasCosto+costoMtto+costoOp+costoAlim+jefeOp+auxOp+trafico+mecanico;
  const gastoIndirecto = fijos+overhead+sobre+(comisionAplica?comisionMonto*r:0);

  return {kmMes,distViaje,casetasCosto,casetasPorViaje,depMotriz,depRemolque,costoDiesel,costoMtto,costoOp,costoAlim,
    sueldoBase,adminPct,
    subtotalConc,subtotalAdmin,subtotalCostos,totalCostos,totalCostosBase,costoViaje,
    tarifaMensual,tarifaRedondo,tarifaIda,tarifaRegreso,utilViaje,comisionMonto,
    gastoDirecto,gastoIndirecto,jefeOp,auxOp,trafico,mecanico,overhead,sobre,fijos,
    contenedores,costoContenedor};
}

const inputStyle = {
  width:"100%", background:"var(--bg3)", border:"1px solid var(--border)",
  borderRadius:"var(--radius-sm)", padding:"9px 12px", color:"var(--text)",
  fontSize:"13px", outline:"none", MozAppearance:"textfield", appearance:"textfield"
};
const labelStyle = { display:"block", fontSize:"11px", color:"var(--text2)", marginBottom:"5px" };
const fieldStyle = { marginBottom:"11px" };

function TxtInput({ label, value, onChange }) {
  return (<div style={fieldStyle}><label style={labelStyle}>{label}</label>
    <input style={inputStyle} type="text" value={value} onChange={e=>onChange(e.target.value)} /></div>);
}
function NumInput({ label, value, onChange }) {
  return (<div style={fieldStyle}><label style={labelStyle}>{label}</label>
    <input style={inputStyle} type="text" inputMode="decimal" value={value}
      onChange={e=>{const v=e.target.value;if(v===''||/^[\d.,\-]*$/.test(v))onChange(v);}}
      onBlur={e=>{const v=toNum(e.target.value);if(!isNaN(v))onChange(v);}} /></div>);
}
function KVInput({ label, kk, value, onChange }) {
  return (<div style={fieldStyle}><label style={labelStyle}>{label}</label>
    <input style={inputStyle} type="text" inputMode="decimal" value={value}
      onChange={e=>{const v=e.target.value;if(v===''||/^[\d.,\-]*$/.test(v))onChange(kk,v);}}
      onBlur={e=>{const v=toNum(e.target.value);onChange(kk,v);}} /></div>);
}
function Brow({ label, value, bold, total }) {
  return (<div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",
    borderBottom:"1px solid var(--border)",fontSize: total?"13px":bold?"12.5px":"12px",
    fontWeight:total||bold?600:400}}>
    <span style={{color:total?"var(--text)":bold?"var(--text)":"var(--text2)"}}>{label}</span>
    <span style={{color:total?"var(--text)":bold?"var(--text)":"var(--text3)"}}>{value}</span></div>);
}

let _toastId = 0;

const css = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f2f4f9;--bg2:#ffffff;--bg3:#f2f4f9;--bg4:#e7eaf2;
  --accent:#6366f1;--accent2:#4f46e5;
  --green:#059669;--green-dim:rgba(5,150,105,.10);
  --text:#1e293b;--text2:#64748b;--text3:#334155;
  --border:rgba(15,23,42,.10);--border2:rgba(15,23,42,.16);
  --radius:14px;--radius-sm:8px;
}
body{background:var(--bg);color:var(--text);font-family:var(--font-sans),-apple-system,sans-serif;min-height:100vh}
.app{padding:24px 20px 48px;max-width:1100px;margin:0 auto}
.toast-portal{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.toast-pill{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:40px;font-size:12px;font-weight:500;border:1px solid rgba(15,23,42,.08);box-shadow:0 4px 14px rgba(15,23,42,.12);animation:slideUp .22s ease;white-space:nowrap;background:#fff}
.toast-pill.success{color:#059669}
.toast-pill.info{color:#4f46e5}
.toast-pill.warn{color:#b45309}
@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:26px;flex-wrap:wrap;gap:12px}
.logo{display:flex;align-items:center;gap:10px}
.logo-icon{width:36px;height:36px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(99,102,241,.35)}
.logo-title{font-size:15px;font-weight:600;color:var(--text)}
.logo-sub{font-size:11px;color:var(--text2);margin-top:1px}
.tabs{display:flex;background:#fff;border:1px solid var(--border);border-radius:10px;padding:4px;gap:2px;flex-wrap:wrap}
.tab{padding:7px 14px;border-radius:7px;border:none;background:none;color:var(--text2);font-size:13px;cursor:pointer;transition:all .2s}
.tab.active{background:var(--accent);color:#fff;font-weight:500}
.grid{display:grid;grid-template-columns:360px 1fr;gap:20px;align-items:start}
.form-card{background:var(--bg2);border-radius:var(--radius);border:1px solid var(--border);padding:20px;box-shadow:0 1px 3px rgba(15,23,42,.04)}
.sec{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent2);margin:18px 0 10px;display:flex;align-items:center;gap:6px}
.sec:first-child{margin-top:0}
.sec::after{content:'';flex:1;height:1px;background:var(--border)}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.toggle-wrap{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text2);cursor:pointer;user-select:none}
.toggle{width:32px;height:18px;background:var(--bg4);border-radius:9px;position:relative;transition:background .2s;flex-shrink:0;border:1px solid var(--border)}
.toggle.on{background:var(--accent);border-color:var(--accent)}
.toggle::after{content:'';position:absolute;width:12px;height:12px;background:#fff;border-radius:50%;top:2px;left:2px;transition:left .2s;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.toggle.on::after{left:16px}
input[type=range]{width:100%;accent-color:var(--accent);cursor:pointer}
.util-row{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text2);margin-bottom:6px}
.util-val{color:var(--accent2);font-weight:700;font-size:15px}
.util-limits{display:flex;justify-content:space-between;font-size:10px;color:var(--text2);margin-top:3px}
.chip-group{display:flex;gap:6px;flex-wrap:wrap}
.chip{padding:6px 13px;border-radius:20px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);font-size:12px;cursor:pointer;transition:all .18s;white-space:nowrap}
.chip.active{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:500}
.chip:hover:not(.active){border-color:var(--accent);color:var(--accent2)}
.btn-row{display:flex;gap:8px;margin-top:16px}
.btn{flex:1;padding:10px 0;border-radius:var(--radius-sm);border:none;font-size:13px;cursor:pointer;font-weight:500;transition:all .15s}
.btn:active{transform:scale(.98)}
.btn-ghost{background:var(--bg3);border:1px solid var(--border2);color:var(--text2)}
.btn-ghost:hover{border-color:var(--accent);color:var(--accent2)}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{opacity:.9}
.btn-primary:disabled{opacity:.55;cursor:not-allowed}
.btn-wa{background:#25d366;color:#fff;display:flex;align-items:center;justify-content:center;gap:6px}
.btn-wa:hover{background:#1ebe5d}
.btn-save-cfg{background:var(--green-dim);color:var(--green);border:1px solid rgba(5,150,105,.28);display:flex;align-items:center;justify-content:center;gap:6px}
.btn-save-cfg:hover{background:rgba(5,150,105,.18)}
.right{display:flex;flex-direction:column;gap:16px}
.info-chips{display:flex;flex-wrap:wrap;gap:7px}
.info-chip{background:#fff;border:1px solid var(--border);border-radius:20px;padding:5px 12px;font-size:11px;display:flex;align-items:center;gap:5px}
.info-chip span{color:var(--text2)}
.info-chip strong{color:var(--text3)}
.hero{background:linear-gradient(135deg,#6366f1 0%,#4f46e5 55%,#4338ca 100%);border:1px solid rgba(79,70,229,.3);border-radius:var(--radius);padding:24px;position:relative;overflow:hidden;box-shadow:0 10px 30px rgba(79,70,229,.25)}
.hero::before{content:'';position:absolute;top:-80px;right:-80px;width:240px;height:240px;background:radial-gradient(circle,rgba(255,255,255,.15) 0%,transparent 70%);pointer-events:none}
.hero-label{font-size:10px;color:rgba(255,255,255,.85);font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px}
.hero-amount{font-size:44px;font-weight:800;color:#fff;letter-spacing:-1.5px;line-height:1}
.hero-meta{display:flex;gap:16px;margin-top:8px;flex-wrap:wrap}
.hero-meta-item{font-size:12px;color:rgba(255,255,255,.75)}
.hero-meta-item strong{color:#fff}
.cont-box{margin-top:14px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}
.cont-box .cl{font-size:10px;color:#fff;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.cont-box .cs{font-size:10px;color:rgba(255,255,255,.75);margin-top:2px}
.cont-box .cv{font-size:22px;font-weight:800;color:#fff}
.hero-divider{height:1px;background:rgba(255,255,255,.2);margin:18px 0}
.rt-label-top{font-size:10px;color:rgba(255,255,255,.85);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px}
.rt-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rt-card{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:10px;padding:14px 16px}
.rt-dir{font-size:10px;color:rgba(255,255,255,.75);margin-bottom:4px;display:flex;align-items:center;gap:5px}
.rt-amount{font-size:22px;font-weight:700;color:#fff}
.rt-pct{font-size:10px;color:rgba(255,255,255,.7);margin-top:2px}
.breakdown{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;box-shadow:0 1px 3px rgba(15,23,42,.04)}
.breakdown-title{font-size:12px;font-weight:600;color:var(--text3);margin-bottom:12px}
.util-table{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:18px;box-shadow:0 1px 3px rgba(15,23,42,.04)}
.util-table-title{font-size:11px;color:var(--text2);margin-bottom:10px;font-weight:600}
.util-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.util-cell{text-align:center;padding:10px 4px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg3)}
.util-cell.active{background:var(--accent);border-color:var(--accent)}
.util-cell .up{font-size:10px;color:var(--text2);margin-bottom:3px}
.util-cell.active .up{color:rgba(255,255,255,.75)}
.util-cell .uv{font-size:11px;font-weight:600;color:var(--text3)}
.util-cell.active .uv{color:#fff}
.cfg-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.cfg-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:20px;box-shadow:0 1px 3px rgba(15,23,42,.04)}
.cfg-title{font-size:12px;font-weight:700;color:var(--text3);margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)}
.cfg-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:var(--green);background:var(--green-dim);border:1px solid rgba(5,150,105,.22);border-radius:20px;padding:2px 9px;margin-left:8px;font-weight:500}
.footer{text-align:center;font-size:10px;color:var(--text2);margin-top:28px;opacity:.8}
.modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:10000}
.modal-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);padding:22px;width:280px;box-shadow:0 20px 50px rgba(15,23,42,.25)}
.modal-title{font-size:13px;font-weight:700;color:var(--text3);margin-bottom:12px}
.modal-error{font-size:11px;color:#c43d3d;margin-top:6px}
`;

const ADMIN_PASSWORD = "poncho";

export default function App() {
  const [page, setPage]     = useState("cotizador");
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminPwdError, setAdminPwdError] = useState(false);

  const [cliente, setCliente]     = useState("");
  const [ejecutivo, setEjecutivo] = useState("");
  const [origen, setOrigen]       = useState("");
  const [destino, setDestino]     = useState("");
  const [rotacion, setRotacion]   = useState("8");
  const [distancia, setDistancia] = useState("0");
  const [casetas, setCasetas]     = useState("0");
  const [sinIva, setSinIva]       = useState(false);
  const [tipoUnidad, setTipoUnidad] = useState("Full");
  const [tipoViaje, setTipoViaje] = useState("One Way");
  const [utilidad, setUtilidad]   = useState(35);
  const [comisionPct, setComisionPct] = useState("2");
  const [comisionAplica, setComisionAplica] = useState(false);
  const [splitPct, setSplitPct] = useState(54);

  const [cfg, setCfg]         = useState(() => loadObj(STORAGE_KEY, BASE_CFG));
  const [cfgEdit, setCfgEdit] = useState(() => loadObj(STORAGE_KEY, BASE_CFG));
  const [cfgSaved, setCfgSaved] = useState(false);

  const [admin, setAdmin]       = useState(() => loadObj(ADMIN_KEY, ADMIN_DEFAULT));
  const [adminSaved, setAdminSaved] = useState(false);

  const addToast = useCallback((msg, type="success") => {
    const id = ++_toastId;
    setToasts(t => [...t, {id, msg, type}]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!window.storage?.get) return;
        try { const g = await window.storage.get(ADMIN_KEY, true); if (g?.value) setAdmin(a=>({...a, ...JSON.parse(g.value)})); } catch {}
        try { const g = await window.storage.get(STORAGE_KEY, true); if (g?.value) setCfg(c=>({...c, ...JSON.parse(g.value)})); } catch {}
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const d = UNIT_DEFAULTS[tipoUnidad];
    const patch = {diesel:d.diesel,tractos:d.tractos,motriz:d.motriz,cajas:d.cajas,
      remolque:d.remolque,rendimiento:d.rendimiento,mtto:d.mtto,sueldo:d.sueldo};
    setCfg(p => ({...p,...patch}));
    setCfgEdit(p => ({...p,...patch}));
  }, [tipoUnidad]);

  const c = useCalc(cfg, admin, distancia, rotacion, casetas, sinIva, utilidad, comisionPct, comisionAplica, tipoUnidad, splitPct);
  const isRound = tipoViaje === "Roundtrip";
  const pctTxt = (c.adminPct*100).toFixed(0);

  const handleCfgChange = useCallback((key, val) => { setCfgEdit(p=>({...p,[key]:val})); setCfgSaved(false); }, []);
  const handleAdminChange = useCallback((key, val) => { setAdmin(p=>({...p,[key]:val})); setAdminSaved(false); }, []);

  const persist = async (key, obj) => {
    const withV = {...obj, _v: APP_VERSION};
    try { localStorage.setItem(key, JSON.stringify(withV)); } catch {}
    try { if (window.storage?.set) await window.storage.set(key, JSON.stringify(withV), true); } catch {}
  };

  const saveCfg = async () => {
    const parsed = {}; Object.keys(cfgEdit).forEach(k => { parsed[k] = k==="_v"?cfgEdit[k]:(toNum(cfgEdit[k])||0); });
    await persist(STORAGE_KEY, parsed);
    setCfg(parsed); setCfgEdit(parsed); setCfgSaved(true);
    addToast("Configuración guardada para todos", "success");
  };

  const saveAdmin = async () => {
    const parsed = {}; Object.keys(admin).forEach(k => { parsed[k] = k==="_v"?admin[k]:(toNum(admin[k])||0); });
    await persist(ADMIN_KEY, parsed);
    setAdmin(parsed); setAdminSaved(true);
    addToast("Datos de administrador guardados para todos", "success");
  };

  const openAdmin = () => {
    if (adminUnlocked) { setPage("admin"); return; }
    setAdminPwd(""); setAdminPwdError(false); setShowAdminPrompt(true);
  };

  const submitAdminPwd = () => {
    if (adminPwd === ADMIN_PASSWORD) {
      setAdminUnlocked(true); setShowAdminPrompt(false); setPage("admin");
    } else {
      setAdminPwdError(true);
    }
  };

  const reset = () => {
    setCliente(""); setEjecutivo(""); setOrigen(""); setDestino("");
    setRotacion("8"); setDistancia("0"); setCasetas("0"); setSinIva(false);
    setTipoUnidad("Full"); setTipoViaje("One Way"); setUtilidad(35);
    setComisionPct("2"); setComisionAplica(false); setSplitPct(54);
    addToast("Formulario limpio", "info");
  };

  const guardar = async () => {
    setSaving(true);
    const id = "TRF-"+Date.now().toString().slice(-6);
    const rot = toNum(rotacion)||1;
    const tarifaIdaF = isRound ? c.tarifaIda : c.tarifaRedondo;
    const tarifaVF   = isRound ? c.tarifaRegreso : 0;
    const row = [
      id, ejecutivo, cliente, tipoViaje, `${origen} - ${destino}`,
      toNum(distancia), fmtR(c.casetasPorViaje), tipoUnidad, fmtR(c.costoViaje),
      fmtR(tarifaIdaF), fmtR(tarifaVF),
      fmtR(c.totalCostosBase/0.60/rot), fmtR(c.totalCostosBase/0.65/rot),
      fmtR(c.totalCostosBase/0.70/rot), fmtR(c.totalCostosBase/0.75/rot),
      fmtR(c.totalCostosBase/0.80/rot), fmtR(c.totalCostosBase/0.85/rot)
    ];
    try {
      const url = APPS_SCRIPT_URL + "?data=" + encodeURIComponent(JSON.stringify(row));
      await fetch(url, { method: "GET", mode: "no-cors" });
      addToast(`Cotización ${id} guardada en Google Sheets`, "success");
    } catch(e) { addToast("No se pudo guardar: " + e.message, "warn"); }
    setSaving(false);
  };

  const compartir = () => {
    const contLine = tipoUnidad==="Full" ? `\n📦 *Costo por contenedor (÷2):* ${mxn(c.costoContenedor)}` : "";
    const lineas = [
      "📦 *COTIZACIÓN DE TARIFA*","",
      `👤 *Cliente:* ${cliente||"—"}`,
      `🗺️ *Ruta:* ${origen||"—"} → ${destino||"—"}`,
      `🚛 *Unidad:* ${tipoUnidad}`,
      `🔄 *Tipo de viaje:* ${tipoViaje}`,
      `📊 *Margen:* ${utilidad}%`,"",
      isRound
        ? `💰 *Tarifa de ida:* ${mxn(c.tarifaIda)}\n💰 *Tarifa de regreso:* ${mxn(c.tarifaRegreso)}\n💰 *Tarifa redondo:* ${mxn(c.tarifaRedondo)}${contLine}`
        : `💰 *Tarifa sugerida:* ${mxn(c.tarifaRedondo)}${contLine}`,
      "",`✅ *Utilidad por viaje:* ${mxn(c.utilViaje)}`,
    ];
    const texto = lineas.join("\n");
    const doCopy = () => {
      const ta = document.createElement("textarea");
      ta.value = texto; ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); addToast("Copiado — pégalo en WhatsApp","success"); }
      catch { addToast("No se pudo copiar","warn"); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(texto).then(()=>addToast("Copiado — pégalo en WhatsApp","success")).catch(doCopy);
    else doCopy();
  };

  const TRUCK = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
  const AR = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
  const AL = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
  const SAVE = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;

  return (
    <div>
      <style>{css}</style>
      <div className="toast-portal">
        {toasts.map(t => (<div key={t.id} className={`toast-pill ${t.type}`}>{t.type==="success"?"✓":t.type==="info"?"ℹ":"⚠"} {t.msg}</div>))}
      </div>

      {showAdminPrompt && (
        <div className="modal-overlay" onClick={()=>setShowAdminPrompt(false)}>
          <div className="modal-card" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Acceso a Administrador</div>
            <input
              style={inputStyle}
              type="password"
              autoFocus
              value={adminPwd}
              onChange={e=>{setAdminPwd(e.target.value); setAdminPwdError(false);}}
              onKeyDown={e=>{if(e.key==="Enter") submitAdminPwd();}}
              placeholder="Contraseña"
            />
            {adminPwdError && <div className="modal-error">Contraseña incorrecta</div>}
            <div className="btn-row" style={{marginTop:14}}>
              <button className="btn btn-ghost" onClick={()=>setShowAdminPrompt(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submitAdminPwd}>Entrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="app">
        <div className="topbar">
          <div className="logo">
            <div className="logo-icon">{TRUCK}</div>
            <div>
              <div className="logo-title">Cotizador de tarifas</div>
              <div className="logo-sub">Transporte · Logística · v{APP_VERSION}</div>
            </div>
          </div>
          <div className="tabs">
            <button type="button" className={`tab${page==="cotizador"?" active":""}`} onClick={()=>setPage("cotizador")}>Cotizador</button>
            <button type="button" className={`tab${page==="config"?" active":""}`} onClick={()=>setPage("config")}>Configuración</button>
            <button type="button" className={`tab${page==="admin"?" active":""}`} onClick={openAdmin}>Administrador</button>
          </div>
        </div>

        {/* ── COTIZADOR ── */}
        {page==="cotizador" && (
          <div className="grid">
            <div className="form-card">
              <div className="sec">Cliente y ruta</div>
              <TxtInput label="Cliente" value={cliente} onChange={setCliente} />
              <TxtInput label="Nombre del ejecutivo" value={ejecutivo} onChange={setEjecutivo} />
              <div className="row2">
                <TxtInput label="Origen" value={origen} onChange={setOrigen} />
                <TxtInput label="Destino" value={destino} onChange={setDestino} />
              </div>
              <div className="row2">
                <NumInput label="Rotación mensual" value={rotacion} onChange={setRotacion} />
                <NumInput label="Distancia (km)" value={distancia} onChange={setDistancia} />
              </div>
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <label style={labelStyle}>Costo de casetas por viaje ($)</label>
                  <div className="toggle-wrap" onClick={()=>setSinIva(v=>!v)}>
                    <div className={`toggle${sinIva?" on":""}`}/><span>Quitar IVA −16%</span>
                  </div>
                </div>
                <input style={inputStyle} type="text" inputMode="decimal" value={casetas}
                  onChange={e=>{if(/^[\d.]*$/.test(e.target.value))setCasetas(e.target.value);}}
                  onBlur={e=>setCasetas(String(toNum(e.target.value)))}/>
                {sinIva && <div style={{fontSize:10,color:"var(--accent2)",marginTop:4}}>Ajustado: {mxn(c.casetasPorViaje)}/viaje</div>}
              </div>

              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <label style={labelStyle}>Comisión por venta (% de tarifa de regreso)</label>
                  <div className="toggle-wrap" onClick={()=>setComisionAplica(v=>!v)}>
                    <div className={`toggle${comisionAplica?" on":""}`}/><span>Agregar al costo</span>
                  </div>
                </div>
                <input style={inputStyle} type="text" inputMode="decimal" value={comisionPct}
                  onChange={e=>{const v=e.target.value;if(v===''||/^[\d.,]*$/.test(v))setComisionPct(v);}}
                  onBlur={e=>setComisionPct(String(toNum(e.target.value)))}/>
                <div style={{fontSize:10,color:comisionAplica?"var(--accent2)":"var(--text2)",marginTop:4}}>
                  {mxn(c.comisionMonto)}/viaje {comisionAplica ? "— incluida en el costo operativo (afecta la utilidad, no la tarifa)" : "— no incluida en el costo"}
                  {!isRound && <><br/>Solo aplica sobre la tarifa de regreso — en One Way es $0.</>}
                </div>
              </div>

              <div className="sec">Tipo de unidad</div>
              <div className="chip-group">
                {Object.keys(UNIT_DEFAULTS).map(u => (<div key={u} className={`chip${tipoUnidad===u?" active":""}`} onClick={()=>setTipoUnidad(u)}>{u}</div>))}
              </div>
              <div className="sec" style={{marginTop:14}}>Tipo de viaje</div>
              <div className="chip-group">
                {["One Way","Roundtrip"].map(t => (<div key={t} className={`chip${tipoViaje===t?" active":""}`} onClick={()=>setTipoViaje(t)}>{t}</div>))}
              </div>
              <div className="sec" style={{marginTop:14}}>Utilidad esperada</div>
              <div className="util-row"><span>Margen sobre costos</span><span className="util-val">{utilidad}%</span></div>
              <input type="range" min="5" max="50" step="1" value={utilidad} onChange={e=>setUtilidad(Number(e.target.value))}/>
              <div className="util-limits"><span>5%</span><span>50%</span></div>
              <div className="btn-row">
                <button className="btn btn-ghost" onClick={reset}>Nueva cotización</button>
                <button className="btn btn-primary" disabled={saving} onClick={guardar}>{saving?"Guardando…":"Guardar"}</button>
              </div>
              <div className="btn-row" style={{marginTop:8}}>
                <button className="btn btn-wa" onClick={compartir}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.112 1.522 5.84L0 24l6.336-1.48A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.372l-.36-.214-3.732.871.936-3.44-.235-.374A9.818 9.818 0 1112 21.818z"/></svg>
                  Compartir por WhatsApp
                </button>
              </div>
            </div>

            <div className="right">
              <div className="info-chips">
                {[["Cliente",cliente||"—"],["Ejecutivo",ejecutivo||"—"],
                  ["Ruta",origen&&destino?`${origen} → ${destino}`:"—"],
                  ["Km/mes",(c.kmMes||0).toLocaleString("es-MX")+" km"],
                  ["Unidad",tipoUnidad]
                ].map(([k,v])=>(<div key={k} className="info-chip"><span>{k}:</span><strong>{v}</strong></div>))}
              </div>

              <div className="hero">
                <div className="hero-label">Tarifa sugerida por viaje</div>
                <div className="hero-amount">{mxn(c.tarifaRedondo)}</div>
                <div className="hero-meta">
                  <div className="hero-meta-item">Tarifa mensual: <strong>{mxn(c.tarifaMensual)}</strong></div>
                  <div className="hero-meta-item">Utilidad por viaje: <strong>{mxn(c.utilViaje)}</strong></div>
                </div>

                {tipoUnidad==="Full" && (
                  <div className="cont-box">
                    <div><div className="cl">Costo por contenedor</div><div className="cs">Full = 2 contenedores · tarifa ÷ 2</div></div>
                    <div className="cv">{mxn(c.costoContenedor)}</div>
                  </div>
                )}

                {isRound && (<>
                  <div className="hero-divider"/>
                  <div className="rt-label-top">Desglose roundtrip</div>
                  <div style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,.8)",marginBottom:6}}>
                      <span>Jugar con mis tarifas</span>
                      <span style={{fontWeight:700,color:"#fff"}}>{splitPct}% ida · {(100-splitPct)}% regreso</span>
                    </div>
                    <input type="range" min="10" max="90" step="1" value={splitPct} onChange={e=>setSplitPct(Number(e.target.value))}
                      style={{width:"100%",accentColor:"#fff"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"rgba(255,255,255,.6)",marginTop:3}}>
                      <span>10%</span><span>50%</span><span>90%</span>
                    </div>
                  </div>
                  <div className="rt-grid">
                    <div className="rt-card"><div className="rt-dir">{AR} Tarifa de ida ({splitPct}%)</div><div className="rt-amount">{mxn(c.tarifaIda)}</div><div className="rt-pct">del viaje redondo</div></div>
                    <div className="rt-card"><div className="rt-dir">{AL} Tarifa de regreso ({100-splitPct}%)</div><div className="rt-amount">{mxn(c.tarifaRegreso)}</div><div className="rt-pct">del viaje redondo</div></div>
                  </div>
                </>)}
              </div>

              <div className="util-table">
                <div className="util-table-title">Nivel de utilidad — tarifa por viaje</div>
                <div className="util-grid">
                  {[40,35,30,25,20,15].map(p=>(
                    <div key={p} className={`util-cell${p===utilidad?" active":""}`}>
                      <div className="up">{p}%</div>
                      <div className="uv">{mxn(c.totalCostosBase/(1-p/100)/(toNum(rotacion)||1))}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="breakdown">
                <div className="breakdown-title">Desglose de costos</div>
                <Brow label="Conceptos operativos" value={mxn(c.subtotalConc)}/>
                <Brow label="  · Depreciación motriz" value={mxn(c.depMotriz)}/>
                <Brow label="  · Depreciación remolque" value={mxn(c.depRemolque)}/>
                <Brow label="  · Diesel" value={mxn(c.costoDiesel)}/>
                <Brow label="  · Casetas" value={mxn(c.casetasCosto)}/>
                <Brow label="  · Mantenimiento" value={mxn(c.costoMtto)}/>
                <Brow label="  · Operador (sueldo + IMSS)" value={mxn(c.costoOp)}/>
                <Brow label="  · Apoyo alimentos" value={mxn(c.costoAlim)}/>
                <Brow label="Administración directa" value={mxn(c.subtotalAdmin)}/>
                <Brow label="Sobrecostos corporativos" value={mxn(c.sobre)}/>
                {comisionAplica && <Brow label="Comisión por venta" value={mxn(c.comisionMonto)}/>}
                <div style={{height:4}}/>
                <Brow label="Total costos mensuales" value={mxn(c.totalCostos)} total/>
                <Brow label="Costo por viaje" value={mxn(c.costoViaje)} bold/>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIGURACIÓN ── */}
        {page==="config" && (
          <div className="cfg-grid">
            <div className="cfg-card">
              <div className="cfg-title">Parámetros de la unidad{cfgSaved && <span className="cfg-badge">✓ Guardado</span>}</div>
              {[
                ["Costo del diesel ($/lt)","diesel"],["Tractos","tractos"],
                ["Valor del motriz ($)","motriz"],["Cajas de 53'","cajas"],
                ["Valor del remolque ($)","remolque"],["Rendimiento diesel (km/lt)","rendimiento"],
                ["Costo de mtto ($/km)","mtto"],
              ].map(([l,k]) => <KVInput key={k} label={l} kk={k} value={cfgEdit[k]} onChange={handleCfgChange}/>)}
              <div className="cfg-title" style={{marginTop:20}}>Personal operativo</div>
              {[
                ["Cantidad de operadores","operadores"],["Sueldo mensual operador ($)","sueldo"],
                ["% Carga social operador","cargaSocial"],["Apoyo alimentos/día ($)","alimentosDia"],
                ["Ayudantes","ayudantes"],["Sueldo ayudante ($)","sueldoAyudante"],
                ["% Carga social ayudante","cargaSocialAyudante"],
              ].map(([l,k]) => <KVInput key={k} label={l} kk={k} value={cfgEdit[k]} onChange={handleCfgChange}/>)}
              <div className="btn-row" style={{marginTop:20}}>
                <button className="btn btn-save-cfg" onClick={saveCfg}>{SAVE} Guardar como default</button>
              </div>
            </div>

            <div className="cfg-card">
              <div className="cfg-title">Resumen operativo (solo lectura)</div>
              <Brow label="Depreciación motriz" value={mxn(c.depMotriz)}/>
              <Brow label="Depreciación remolque" value={mxn(c.depRemolque)}/>
              <Brow label="Diesel" value={mxn(c.costoDiesel)}/>
              <Brow label="Casetas" value={mxn(c.casetasCosto)}/>
              <Brow label="Mantenimiento" value={mxn(c.costoMtto)}/>
              <Brow label="Operador (sueldo + IMSS)" value={mxn(c.costoOp)}/>
              <Brow label="Apoyo alimentos operador" value={mxn(c.costoAlim)}/>
              <Brow label="Subtotal conceptos" value={mxn(c.subtotalConc)} bold/>
              <div style={{height:6}}/>
              <Brow label={`Jefe de operaciones (${pctTxt}%)`} value={mxn(c.jefeOp)}/>
              <Brow label={`Auxiliar de operaciones (${pctTxt}%)`} value={mxn(c.auxOp)}/>
              <Brow label={`Tráfico (${pctTxt}%)`} value={mxn(c.trafico)}/>
              <Brow label={`Mecánico (${pctTxt}%)`} value={mxn(c.mecanico)}/>
              <Brow label="Telefonía + GPS" value={mxn(toNum(admin.telefonia)+toNum(admin.gps))}/>
              <Brow label="Seguros + deducibles" value={mxn(toNum(admin.seguroMotriz)+toNum(admin.reservaMotriz)+toNum(admin.seguroArrastre)+toNum(admin.reservaArrastre))}/>
              <Brow label="Canacar" value={mxn(toNum(admin.canacar))}/>
              <Brow label="Overhead" value={mxn(c.overhead)}/>
              <Brow label="Subtotal administración" value={mxn(c.subtotalAdmin)} bold/>
              <div style={{height:6}}/>
              <Brow label="Sobrecostos corporativos" value={mxn(c.sobre)}/>
              {comisionAplica && <Brow label="Comisión por venta" value={mxn(c.comisionMonto)}/>}
              <Brow label="Total costos" value={mxn(c.totalCostos)} total/>
              <div style={{height:6}}/>
              <Brow label="Costo por viaje" value={mxn(c.costoViaje)} bold/>
              <Brow label={`Tarifa mensual (${utilidad}%)`} value={mxn(c.tarifaMensual)} bold/>
              <Brow label="Tarifa redondo" value={mxn(c.tarifaRedondo)} bold/>
              {tipoUnidad==="Full" && <Brow label="Costo por contenedor (÷2)" value={mxn(c.costoContenedor)} bold/>}
              <Brow label={`Tarifa de ida (${splitPct}%)`} value={mxn(c.tarifaIda)}/>
              <Brow label={`Tarifa de regreso (${100-splitPct}%)`} value={mxn(c.tarifaRegreso)}/>
              <div style={{height:16}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{background:"rgba(99,102,241,.08)",border:"1px solid rgba(99,102,241,.18)",borderRadius:"var(--radius-sm)",padding:"14px 16px"}}>
                  <div style={{fontSize:10,color:"var(--accent2)",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",marginBottom:6}}>Gasto directo</div>
                  <div style={{fontSize:22,fontWeight:800}}>{mxn(c.gastoDirecto)}</div>
                </div>
                <div style={{background:"rgba(180,83,9,.08)",border:"1px solid rgba(180,83,9,.18)",borderRadius:"var(--radius-sm)",padding:"14px 16px"}}>
                  <div style={{fontSize:10,color:"#b45309",fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",marginBottom:6}}>Gasto indirecto</div>
                  <div style={{fontSize:22,fontWeight:800}}>{mxn(c.gastoIndirecto)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ADMINISTRADOR ── */}
        {page==="admin" && adminUnlocked && (
          <div className="cfg-grid">
            <div className="cfg-card">
              <div className="cfg-title">Administración directa — sueldos base{adminSaved && <span className="cfg-badge">✓ Guardado</span>}</div>
              <div style={{fontSize:10,color:"var(--text2)",marginBottom:12,lineHeight:1.5}}>Sueldos mensuales con carga social ya incluida; se prorratean según el % por tipo de unidad.</div>
              {[
                ["Jefe de operaciones ($)","jefeOpSueldo"],["Auxiliar de operaciones ($)","auxOpSueldo"],
                ["Tráfico ($)","traficoSueldo"],["Mecánico ($)","mecanicoSueldo"],["Cantidad de mecánicos","mecanicoCantidad"],
              ].map(([l,k]) => <KVInput key={k} label={l} kk={k} value={admin[k]} onChange={handleAdminChange}/>)}

              <div className="cfg-title" style={{marginTop:20}}>% de prorrateo por unidad</div>
              {[
                ["% Full","pctFull"],["% Sencillo","pctSencillo"],["% Rabón","pctRabon"],
                ["% Camioneta 3.5","pctCam35"],["% Camioneta 1.5","pctCam15"],
              ].map(([l,k]) => <KVInput key={k} label={l} kk={k} value={admin[k]} onChange={handleAdminChange}/>)}
              <div style={{fontSize:10,color:"var(--text2)",marginTop:2,lineHeight:1.5}}>Caja refrigerada usa el % de Sencillo · Thorton usa el % de Full.</div>

              <div className="cfg-title" style={{marginTop:20}}>Depreciación</div>
              {[
                ["Años de depreciación","depAnios"],["% Valor de rescate","depRescate"],
              ].map(([l,k]) => <KVInput key={k} label={l} kk={k} value={admin[k]} onChange={handleAdminChange}/>)}
            </div>

            <div className="cfg-card">
              <div className="cfg-title">Gastos fijos indirectos</div>
              {[
                ["Telefonía fija ($)","telefonia"],["GPS ($)","gps"],
                ["Seguro equipo motriz ($)","seguroMotriz"],["Reserva deducible motriz ($)","reservaMotriz"],
                ["Seguro equipo de arrastre ($)","seguroArrastre"],["Reserva deducible arrastre ($)","reservaArrastre"],
                ["Canacar ($)","canacar"],
              ].map(([l,k]) => <KVInput key={k} label={l} kk={k} value={admin[k]} onChange={handleAdminChange}/>)}

              <div className="cfg-title" style={{marginTop:20}}>Overhead y sobrecostos</div>
              {[
                ["Overhead — base ($)","overheadBase"],["Overhead — % aplicado","overheadPct"],["Overhead — divisor (unidades)","overheadDiv"],
                ["Sobrecostos corporativos ($)","sobrecostos"],
              ].map(([l,k]) => <KVInput key={k} label={l} kk={k} value={admin[k]} onChange={handleAdminChange}/>)}

              <div className="btn-row" style={{marginTop:20}}>
                <button className="btn btn-save-cfg" onClick={saveAdmin}>{SAVE} Guardar datos para todos</button>
              </div>
              <div style={{fontSize:10,color:"var(--text2)",marginTop:10,lineHeight:1.5,background:"var(--bg3)",borderRadius:8,padding:"10px 12px"}}>
                <strong style={{color:"var(--text3)"}}>Vista previa del servicio actual</strong><br/>
                Subtotal admin: {mxn(c.subtotalAdmin)} · Total costos: {mxn(c.totalCostos)}<br/>
                Gasto directo: {mxn(c.gastoDirecto)} · Gasto indirecto: {mxn(c.gastoIndirecto)}
              </div>
            </div>
          </div>
        )}

        <div className="footer">Cotizador ADL · versión {APP_VERSION} · los datos guardados quedan disponibles para todos los usuarios</div>
      </div>
    </div>
  );
}
