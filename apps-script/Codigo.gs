/**
 * Master de Ruta · ADL Transportes
 * Backend en Google Apps Script para el Sheet de datos.
 *
 * INSTALACIÓN
 *  1. Abre el Google Sheet → Extensiones → Apps Script.
 *  2. Reemplaza TODO el contenido del archivo por este.
 *  3. Ejecuta una vez la función  configurarHojas()  (crea las hojas y los
 *     encabezados que falten, sin tocar los datos que ya existan).
 *  4. Implementar → Nueva implementación → Aplicación web:
 *       Ejecutar como:        Yo
 *       Quién tiene acceso:   Cualquier persona
 *  5. Copia la URL /exec y pégala en la app (Administración → URL de conexión),
 *     o actualiza la constante WEBHOOK dentro de index.html.
 *
 * NOTA: cada vez que cambies este código hay que crear una implementación nueva
 * (o actualizar la existente) para que la URL /exec sirva la versión nueva.
 */

/* ------------------------------------------------------------------ *
 *  Estructura de las hojas
 * ------------------------------------------------------------------ */

var HOJAS = {
  UNIDADES: ['ID','ECONOMICO','PLACAS','TIPO_UNIDAD','MODELO','ANIO','COMBUSTIBLE','RENDIMIENTO','UREA'],

  OPERADORES: ['ID','NOMBRE','PAGO_NOMINAL_SEMANAL','ACTIVO'],

  EJECUTIVOS: ['ID','NOMBRE'],

  REMOLQUES: ['ID','ECONOMICO','PLACAS','TIPO'],

  CLIENTES: ['ID','NOMBRE'],

  /* Catálogo de casetas: un costo por categoría de ejes */
  CASETAS: ['ID','NOMBRE','CARRETERA','COSTO_2E','COSTO_5E','COSTO_9E'],

  /* Acceso a la app. ROL: ADMIN | OPERATIVO — ACTIVO: SI | NO */
  USUARIOS: ['ID','USUARIO','NOMBRE','PASSWORD','ROL','ACTIVO'],

  RUTAS: ['ID','RUTA','CLIENTE','TIPO_SERVICIO','TIPO_VIAJE','TIPO_UNIDAD','EQUIPO_ARRASTRE',
          'TRAMOS_JSON','TOTAL_KM','KM_CARGADOS','KM_VACIOS','KM_POSICIONAMIENTO',
          'OPTIMIZADA_FULL','CASETAS_JSON','COSTO_CASETAS',
          'COSTO_CASETAS_2E','COSTO_CASETAS_5E','COSTO_CASETAS_9E'],

  SOLICITUDES: ['ID','FOLIO','FECHA_SOLICITUD','FECHA_SERVICIO','CARTAS_PORTE','TIPO_ARRASTRE',
                'ECONOMICO','PLACAS','TIPO_UNIDAD','OPERADOR','REMOLQUE1','REMOLQUE2','DOLLY',
                'RUTA','CLIENTE','TIPO_SERVICIO','TIPO_VIAJE','KM','KM_CARGADOS','KM_VACIOS',
                'COMBUSTIBLE','RENDIMIENTO','LITROS_COMBUSTIBLE','LITROS_UREA','DEPOSITO_UREA',
                'PENSION','COMIDA','COSTO_CASETAS','TARIFA_CASETAS','EJECUTIVO','TOTAL'],

  NOMINAS: ['ID','OPERADOR','MODO','PERIODO','SEMANAS','SUELDO_BRUTO','IMPUESTO_PCT','IMPUESTOS',
            'SUELDO_NETO','BONO_CUMPLIMIENTO','KM','KM_RUTA','KM_ODOMETRO','FUENTE_KM',
            'OBJETIVO_KM','CUMPLIMIENTO_PCT','KM_EXTRA','PAGO_KM_EXTRA',
            'REND_OBJETIVO','REND_REAL','LITROS_AHORRADOS','PAGO_RENDIMIENTO',
            'APOYO_VIAJE','APOYO_PCT','APOYO_AUTORIZADO','AUTORIZADO_POR',
            'TOTAL','REGISTRADO_POR','FECHA_REGISTRO'],

  /* ESTADO: LIQUIDADO | ACLARACION */
  LIQUIDACION: ['ID','FOLIO','CARTAS_PORTE','FECHA_CARGA','FECHA_FINALIZADO','RUTA','CLIENTE','OPERADOR',
                'COMB_PROYECTADO','CASETAS_PROYECTADO','COMB_REAL','CASETAS_REAL',
                'PENSION_LIQ','VIATICOS','MANIOBRAS','TALACHAS','DADIVAS','ESTACIONAMIENTOS',
                'ODOMETRO_INICIAL','ODOMETRO_FINAL','KM_ODOMETRO','KM_RUTA','DIFERENCIA_KM','REVISAR_KM',
                'EVIDENCIA','ESTADO','FECHA_LIQUIDACION','LIQUIDADO_POR',
                'MOTIVO_ACLARACION','ACLARACION_POR','ACLARACION_FECHA',
                'AUTORIZADO_POR','FECHA_AUTORIZACION','NOTA_AUTORIZACION'],

  /* Solicitudes canceladas: copia completa de la solicitud más el motivo y
     las firmas de quién la cancela y quién la autoriza. */
  SOLICITUDES_CANCELADAS: ['ID','FECHA_CANCELACION','FOLIO','FECHA_SOLICITUD','FECHA_SERVICIO',
                'CARTAS_PORTE','TIPO_ARRASTRE','ECONOMICO','PLACAS','TIPO_UNIDAD','OPERADOR',
                'REMOLQUE1','REMOLQUE2','DOLLY','RUTA','CLIENTE','TIPO_SERVICIO','TIPO_VIAJE',
                'KM','COMBUSTIBLE','LITROS_COMBUSTIBLE','PENSION','COMIDA','COSTO_CASETAS',
                'EJECUTIVO','TOTAL',
                'MOTIVO_CANCELACION','CANCELADA_POR','AUTORIZADA_POR','ROL_AUTORIZA'],

  /* Bitácora de auditoría: quién hizo qué y cuándo. Solo la escribe el script. */
  BITACORA: ['ID','FECHA_HORA','USUARIO','NOMBRE','ROL','ACCION','HOJA','REGISTRO','DETALLE']
};

var HOJA_CANCELADAS = 'SOLICITUDES_CANCELADAS';

var HOJA_BITACORA = 'BITACORA';

/* Máximo de renglones que se conservan en la bitácora (los más viejos se
   recortan para que la hoja no crezca sin límite). 0 = sin límite. */
var BITACORA_MAX = 10000;

/* Hojas que la app lee como catálogo/registro (CONFIG se maneja aparte) */
var HOJAS_DATOS = Object.keys(HOJAS);

/* Columnas que se guardan como texto para que no se pierdan ceros a la
   izquierda ni se conviertan en fecha o número. */
var COLUMNAS_TEXTO = {
  USUARIOS: ['USUARIO','PASSWORD'],
  SOLICITUDES: ['CARTAS_PORTE','FOLIO'],
  LIQUIDACION: ['CARTAS_PORTE','FOLIO']
};

var HOJA_CONFIG = 'CONFIG';
var HOJA_SABANA = 'Transportadora';

/**
 * Columnas de la sábana que se escriben por POSICIÓN, no por nombre de
 * encabezado. El kilometraje del odómetro va a AC y AD de la hoja
 * Transportadora. Si en la sábana cambian de lugar, se ajusta aquí.
 */
var SABANA_COLUMNAS_FIJAS = [
  { columna: 'AC', campo: 'ODOMETRO_INICIAL' },   // KM inicial
  { columna: 'AD', campo: 'ODOMETRO_FINAL'   }    // KM final
];

/* ------------------------------------------------------------------ *
 *  Puntos de entrada HTTP
 * ------------------------------------------------------------------ */

function doGet() {
  try {
    return json({ ok: true, data: leerTodo() });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    var p = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Un evento de bitácora no modifica datos: se registra y se responde corto
    if (p.action === 'log') {
      registrarBitacora(p.usuario, p.evento, '', '', p.detalle);
      return json({ ok: true, logged: true });
    }

    // Las filas capturadas a mano en el Sheet pueden venir sin ID
    asignarIdsFaltantes();

    switch (p.action) {
      case 'upsert':      upsert(p.sheet, p.record);        break;
      case 'bulkUpsert':  bulkUpsert(p.sheet, p.records);   break;
      case 'delete':      borrar(p.sheet, [p.id]);          break;
      case 'deleteMany':  borrar(p.sheet, p.ids || []);     break;
      case 'clearAll':    vaciar(p.sheet);                  break;
      case 'setConfig':   setConfig(p.clave, p.valor);      break;
      case 'liquidar':    liquidar(p.record);               break;
      case 'cancelarSolicitud': cancelarSolicitud(p.record); break;
      default:
        throw new Error('Acción no reconocida: ' + p.action);
    }

    registrarAccion(p);

    var respuesta = { ok: true, data: leerTodo() };
    if (avisoSabana) { respuesta.aviso = avisoSabana; avisoSabana = ''; }
    return json(respuesta);

  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ *
 *  Configuración inicial
 * ------------------------------------------------------------------ */

/**
 * Crea las hojas y los encabezados que falten. No borra ni reordena datos:
 * las columnas nuevas se agregan al final de la fila de encabezados.
 * Se puede volver a ejecutar sin riesgo cuantas veces haga falta.
 */
function configurarHojas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var resumen = [];

  HOJAS_DATOS.forEach(function (nombre) {
    var hoja = ss.getSheetByName(nombre);
    if (!hoja) {
      hoja = ss.insertSheet(nombre);
      resumen.push('Hoja creada: ' + nombre);
    }
    var agregadas = asegurarEncabezados(hoja, HOJAS[nombre]);
    if (agregadas.length) resumen.push(nombre + ' → columnas nuevas: ' + agregadas.join(', '));
    aplicarFormatoTexto(hoja, nombre);
    hoja.setFrozenRows(1);
  });

  // Hoja CONFIG (clave/valor)
  var cfg = ss.getSheetByName(HOJA_CONFIG);
  if (!cfg) {
    cfg = ss.insertSheet(HOJA_CONFIG);
    resumen.push('Hoja creada: ' + HOJA_CONFIG);
  }
  asegurarEncabezados(cfg, ['CLAVE','VALOR']);
  cfg.setFrozenRows(1);

  var ids = asignarIdsFaltantes();
  if (ids) resumen.push('Se asignaron ' + ids + ' ID(s) a filas capturadas a mano.');

  var msg = resumen.length ? resumen.join('\n') : 'Todo estaba en orden, no hubo cambios.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Configuración de hojas', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (ignore) {}
  return msg;
}

function asegurarEncabezados(hoja, columnas) {
  var ancho = Math.max(hoja.getLastColumn(), 1);
  var actuales = hoja.getLastRow() >= 1
    ? hoja.getRange(1, 1, 1, ancho).getValues()[0].map(function (v) { return String(v).trim(); })
    : [];

  // Hoja vacía: se escriben todos los encabezados de golpe
  if (!actuales.filter(String).length) {
    hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]).setFontWeight('bold');
    return columnas.slice();
  }

  var faltantes = columnas.filter(function (c) { return actuales.indexOf(c) === -1; });
  if (faltantes.length) {
    hoja.getRange(1, actuales.length + 1, 1, faltantes.length)
        .setValues([faltantes])
        .setFontWeight('bold');
  }
  return faltantes;
}

function aplicarFormatoTexto(hoja, nombre) {
  var cols = COLUMNAS_TEXTO[nombre];
  if (!cols) return;
  var heads = encabezados(hoja);
  cols.forEach(function (c) {
    var i = heads.indexOf(c);
    if (i >= 0) hoja.getRange(2, i + 1, Math.max(hoja.getMaxRows() - 1, 1), 1).setNumberFormat('@');
  });
}

/* ------------------------------------------------------------------ *
 *  Lectura
 * ------------------------------------------------------------------ */

function hojaDe(nombre) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    if (HOJAS[nombre]) asegurarEncabezados(hoja, HOJAS[nombre]);
    else if (nombre === HOJA_CONFIG) asegurarEncabezados(hoja, ['CLAVE','VALOR']);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function encabezados(hoja) {
  if (hoja.getLastColumn() < 1) return [];
  return hoja.getRange(1, 1, 1, hoja.getLastColumn())
             .getValues()[0]
             .map(function (v) { return String(v).trim(); });
}

function leerHoja(nombre) {
  var hoja = hojaDe(nombre);
  var heads = encabezados(hoja);
  if (!heads.length || hoja.getLastRow() < 2) return [];

  var filas = hoja.getRange(2, 1, hoja.getLastRow() - 1, heads.length).getValues();
  var out = [];

  filas.forEach(function (fila) {
    // Se ignoran los renglones completamente vacíos
    if (!fila.some(function (v) { return String(v).trim() !== ''; })) return;
    var reg = {};
    heads.forEach(function (h, i) { if (h) reg[h] = normalizar(fila[i]); });
    out.push(reg);
  });

  return out;
}

/** Las fechas se devuelven como yyyy-MM-dd, que es lo que espera la app. */
function normalizar(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  }
  return v;
}

function leerConfig() {
  var hoja = hojaDe(HOJA_CONFIG);
  var cfg = {};
  if (hoja.getLastRow() < 2) return cfg;
  hoja.getRange(2, 1, hoja.getLastRow() - 1, 2).getValues().forEach(function (f) {
    var clave = String(f[0]).trim();
    if (clave) cfg[clave] = normalizar(f[1]);
  });
  return cfg;
}

function leerTodo() {
  var data = {};
  HOJAS_DATOS.forEach(function (n) { data[n] = leerHoja(n); });
  data.CONFIG = leerConfig();
  return data;
}

/* ------------------------------------------------------------------ *
 *  Escritura
 * ------------------------------------------------------------------ */

/**
 * Inserta o actualiza un registro buscándolo por su columna ID.
 * Si el registro trae campos que aún no son columnas, se agregan al final.
 */
function upsert(nombre, record) {
  if (!nombre || !record) throw new Error('Falta la hoja o el registro');
  var hoja = hojaDe(nombre);

  // Columnas nuevas que traiga el registro
  asegurarEncabezados(hoja, Object.keys(record));
  var heads = encabezados(hoja);
  var colId = heads.indexOf('ID');
  if (colId === -1) throw new Error('La hoja ' + nombre + ' no tiene columna ID');

  var fila = buscarFilaPorId(hoja, heads, record.ID);
  var valores = heads.map(function (h) { return record.hasOwnProperty(h) ? record[h] : ''; });

  if (fila > 0) {
    // Actualización: se conservan los valores de las columnas que no vengan
    var actuales = hoja.getRange(fila, 1, 1, heads.length).getValues()[0];
    valores = heads.map(function (h, i) { return record.hasOwnProperty(h) ? record[h] : actuales[i]; });
    hoja.getRange(fila, 1, 1, heads.length).setValues([valores]);
  } else {
    hoja.appendRow(valores);
  }
}

function bulkUpsert(nombre, records) {
  if (!records || !records.length) return;
  var hoja = hojaDe(nombre);

  var todas = {};
  records.forEach(function (r) { Object.keys(r).forEach(function (k) { todas[k] = true; }); });
  asegurarEncabezados(hoja, Object.keys(todas));

  var heads = encabezados(hoja);
  var nuevos = [];

  records.forEach(function (r) {
    var fila = buscarFilaPorId(hoja, heads, r.ID);
    if (fila > 0) {
      var actuales = hoja.getRange(fila, 1, 1, heads.length).getValues()[0];
      var valores = heads.map(function (h, i) { return r.hasOwnProperty(h) ? r[h] : actuales[i]; });
      hoja.getRange(fila, 1, 1, heads.length).setValues([valores]);
    } else {
      nuevos.push(heads.map(function (h) { return r.hasOwnProperty(h) ? r[h] : ''; }));
    }
  });

  if (nuevos.length) {
    hoja.getRange(hoja.getLastRow() + 1, 1, nuevos.length, heads.length).setValues(nuevos);
  }
}

function buscarFilaPorId(hoja, heads, id) {
  if (id === undefined || id === null || id === '') return -1;
  var colId = heads.indexOf('ID');
  if (colId === -1 || hoja.getLastRow() < 2) return -1;

  var ids = hoja.getRange(2, colId + 1, hoja.getLastRow() - 1, 1).getValues();
  var buscado = String(id);
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === buscado) return i + 2;
  }
  return -1;
}

function borrar(nombre, ids) {
  if (!ids || !ids.length) return;
  var hoja = hojaDe(nombre);
  var heads = encabezados(hoja);

  // De abajo hacia arriba, para que no se recorran los índices
  var filas = ids.map(function (id) { return buscarFilaPorId(hoja, heads, id); })
                 .filter(function (f) { return f > 0; })
                 .sort(function (a, b) { return b - a; });

  filas.forEach(function (f) { hoja.deleteRow(f); });
}

function vaciar(nombre) {
  var hoja = hojaDe(nombre);
  if (hoja.getLastRow() > 1) {
    hoja.deleteRows(2, hoja.getLastRow() - 1);
  }
}

function setConfig(clave, valor) {
  if (!clave) throw new Error('Falta la clave de configuración');
  var hoja = hojaDe(HOJA_CONFIG);

  if (hoja.getLastRow() >= 2) {
    var claves = hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < claves.length; i++) {
      if (String(claves[i][0]).trim() === String(clave)) {
        hoja.getRange(i + 2, 2).setValue(valor);
        return;
      }
    }
  }
  hoja.appendRow([clave, valor]);
}

/* ------------------------------------------------------------------ *
 *  Cancelación de solicitudes
 * ------------------------------------------------------------------ */

/**
 * Copia la solicitud a SOLICITUDES_CANCELADAS y la borra de SOLICITUDES.
 * Primero se archiva y luego se borra: si algo falla en el archivado, la
 * solicitud original sigue ahí y no se pierde el registro.
 */
function cancelarSolicitud(record) {
  if (!record || !record.ID) throw new Error('Falta la solicitud a cancelar');
  if (!record.MOTIVO_CANCELACION) throw new Error('Falta el motivo de la cancelación');
  if (!record.AUTORIZADA_POR) throw new Error('Falta la autorización del supervisor');

  var archivo = {};
  Object.keys(record).forEach(function (k) { archivo[k] = record[k]; });
  if (!archivo.FECHA_CANCELACION) {
    var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    archivo.FECHA_CANCELACION = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  }

  upsert(HOJA_CANCELADAS, archivo);   // 1) se archiva
  borrar('SOLICITUDES', [record.ID]); // 2) se elimina la original
}

/* ------------------------------------------------------------------ *
 *  Bitácora de auditoría
 * ------------------------------------------------------------------ */

/** Traduce la petición a un renglón legible de bitácora. */
function registrarAccion(p) {
  var hoja = p.sheet || '';
  var registro = '';
  var detalle = '';
  var accion = String(p.action || '').toUpperCase();

  switch (p.action) {
    case 'upsert':
      registro = (p.record && p.record.ID) || '';
      accion = 'ALTA / EDICIÓN';
      detalle = describir(p.record);
      if (p.sheet === 'NOMINAS' && p.record) {
        accion = 'REGISTRO DE NÓMINA';
        detalle = 'Periodo: ' + p.record.PERIODO + ' · Total: ' + p.record.TOTAL +
                  ' · Apoyo: ' + p.record.APOYO_VIAJE + ' (' + p.record.APOYO_PCT + '%)' +
                  (String(p.record.APOYO_AUTORIZADO).toUpperCase() === 'SI'
                    ? ' AUTORIZADO POR EL ADMINISTRADOR' : '') +
                  ' · KM: ' + p.record.KM + ' (' + p.record.FUENTE_KM + ')';
      }
      break;
    case 'bulkUpsert':
      accion = 'IMPORTACIÓN';
      detalle = (p.records ? p.records.length : 0) + ' registro(s) importados';
      break;
    case 'delete':
      accion = 'ELIMINACIÓN';
      registro = p.id || '';
      break;
    case 'deleteMany':
      accion = 'ELIMINACIÓN MÚLTIPLE';
      registro = (p.ids || []).join(' ');
      detalle = (p.ids || []).length + ' registro(s)';
      break;
    case 'clearAll':
      accion = 'VACIADO DE HOJA';
      detalle = 'Se borraron todos los registros de ' + hoja;
      break;
    case 'setConfig':
      accion = 'CAMBIO DE PARÁMETRO';
      hoja = 'CONFIG';
      registro = p.clave || '';
      detalle = p.clave + ' = ' + p.valor;
      break;
    case 'cancelarSolicitud':
      accion = 'CANCELACIÓN DE SOLICITUD';
      hoja = 'SOLICITUDES';
      registro = (p.record && p.record.FOLIO) || '';
      detalle = 'Motivo: ' + (p.record && p.record.MOTIVO_CANCELACION) +
                ' · Autorizó: ' + (p.record && p.record.AUTORIZADA_POR) +
                ' (' + (p.record && p.record.ROL_AUTORIZA) + ')' +
                ' · Total: ' + (p.record && p.record.TOTAL);
      break;
    case 'liquidar':
      hoja = 'LIQUIDACION';
      registro = (p.record && p.record.FOLIO) || '';
      var estado = String((p.record && p.record.ESTADO) || '').toUpperCase();
      accion = estado === 'ACLARACION' ? 'ENVÍO A ACLARACIÓN'
             : (p.record && p.record.AUTORIZADO_POR) ? 'AUTORIZACIÓN DE ACLARACIÓN'
             : 'LIQUIDACIÓN';
      detalle = describirLiquidacion(p.record);
      break;
  }

  registrarBitacora(p.usuario, accion, hoja, registro, detalle);
}

function describir(rec) {
  if (!rec) return '';
  var claves = ['NOMBRE','USUARIO','ECONOMICO','RUTA','FOLIO','CLAVE','OPERADOR','ROL'];
  var partes = [];
  claves.forEach(function (k) {
    if (rec[k] !== undefined && rec[k] !== '') partes.push(k + ': ' + rec[k]);
  });
  return partes.join(' · ');
}

function describirLiquidacion(rec) {
  if (!rec) return '';
  var partes = [];
  if (rec.OPERADOR) partes.push('Operador: ' + rec.OPERADOR);
  if (rec.KM_ODOMETRO !== undefined) {
    partes.push('KM odómetro: ' + rec.KM_ODOMETRO + ' vs ruta: ' + rec.KM_RUTA +
                ' (dif ' + rec.DIFERENCIA_KM + ')');
  }
  if (rec.MOTIVO_ACLARACION) partes.push('Motivo: ' + rec.MOTIVO_ACLARACION);
  if (rec.NOTA_AUTORIZACION) partes.push('Autorización: ' + rec.NOTA_AUTORIZACION);
  return partes.join(' · ');
}

/**
 * Escribe un renglón en la bitácora. Nunca lanza: un fallo aquí no debe
 * tumbar la operación que el usuario acaba de hacer.
 */
function registrarBitacora(usuario, accion, hoja, registro, detalle) {
  try {
    var u = usuario || {};
    var b = hojaDe(HOJA_BITACORA);
    var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();

    b.appendRow([
      Utilities.getUuid(),
      Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss'),
      String(u.USUARIO || '(desconocido)'),
      String(u.NOMBRE  || ''),
      String(u.ROL     || ''),
      String(accion    || ''),
      String(hoja      || ''),
      String(registro  || ''),
      String(detalle   || '')
    ]);

    if (BITACORA_MAX > 0) {
      var sobra = b.getLastRow() - 1 - BITACORA_MAX;
      if (sobra > 0) b.deleteRows(2, sobra);
    }
  } catch (err) {
    Logger.log('No se pudo escribir en la bitácora: ' + err);
  }
}

/* ------------------------------------------------------------------ *
 *  IDs faltantes
 * ------------------------------------------------------------------ */

/**
 * Rellena la columna ID de las filas capturadas a mano en el Sheet.
 * Sin ID, la app no puede distinguir un registro de otro: era la causa de que
 * al elegir una caseta se guardara siempre la primera del catálogo.
 */
function asignarIdsFaltantes() {
  var total = 0;

  HOJAS_DATOS.forEach(function (nombre) {
    if (nombre === HOJA_BITACORA) return;

    var hoja = hojaDe(nombre);
    if (hoja.getLastRow() < 2) return;

    var heads = encabezados(hoja);
    var colId = heads.indexOf('ID');
    if (colId === -1) return;

    var rango = hoja.getRange(2, colId + 1, hoja.getLastRow() - 1, 1);
    var ids = rango.getValues();
    var datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, heads.length).getValues();
    var cambios = false;

    for (var i = 0; i < ids.length; i++) {
      var vacio = String(ids[i][0]).trim() === '';
      // Solo se le asigna ID a las filas que sí tienen contenido
      var tieneDatos = datos[i].some(function (v, j) {
        return j !== colId && String(v).trim() !== '';
      });
      if (vacio && tieneDatos) {
        ids[i][0] = Utilities.getUuid();
        cambios = true;
        total++;
      }
    }

    if (cambios) rango.setValues(ids);
  });

  if (total) Logger.log('IDs asignados: ' + total);
  return total;
}

/* ------------------------------------------------------------------ *
 *  Liquidación
 * ------------------------------------------------------------------ */

/**
 * Guarda la liquidación y, si hay un SABANA_SHEET_ID configurado, agrega el
 * renglón a la hoja "Transportadora" de ese otro Sheet.
 */
/* Último problema al escribir la sábana. Se devuelve al front para que el
   usuario se entere: antes fallaba en silencio y no había forma de saberlo. */
var avisoSabana = '';

function liquidar(record) {
  upsert('LIQUIDACION', record);
  avisoSabana = '';

  var cfg = leerConfig();
  var idSabana = String(cfg.SABANA_SHEET_ID || '').trim();
  if (!idSabana) {
    avisoSabana = 'No hay un ID de sábana configurado, así que el odómetro no se copió a la hoja Transportadora. ' +
                  'Captúralo en Administración → ID del Google Sheet de la sábana.';
    return;
  }

  try {
    escribirSabana(idSabana, record);
  } catch (err) {
    // La liquidación ya quedó guardada: no se tumba la operación por la sábana
    avisoSabana = 'La liquidación se guardó, pero no se pudo escribir en la sábana: ' +
                  String(err && err.message || err);
    Logger.log(avisoSabana);
  }
}

/**
 * Agrega el renglón a la sábana haciendo coincidir los encabezados por nombre,
 * así que respeta el orden de columnas que ya tenga esa hoja. Las columnas de
 * la sábana que no existan en el registro se dejan vacías.
 *
 * Excepción: el kilometraje del odómetro va SIEMPRE a las columnas fijas
 * AC y AD (ver SABANA_COLUMNAS_FIJAS), sin importar cómo se llamen ahí.
 */
function escribirSabana(idSabana, record) {
  var hoja = SpreadsheetApp.openById(idSabana).getSheetByName(HOJA_SABANA);
  if (!hoja) throw new Error('La sábana no tiene una hoja llamada ' + HOJA_SABANA);

  var heads = encabezados(hoja);
  if (!heads.length) throw new Error('La hoja ' + HOJA_SABANA + ' no tiene encabezados');

  // El renglón se extiende si las columnas fijas caen más allá del encabezado
  var ancho = heads.length;
  SABANA_COLUMNAS_FIJAS.forEach(function (c) {
    var n = letraAColumna(c.columna);
    if (n > ancho) ancho = n;
  });

  // Si ya existe el folio, se actualiza en lugar de duplicar
  var colFolio = buscarColumnaFolio(heads);
  var fila = -1;
  if (colFolio >= 0 && hoja.getLastRow() >= 2) {
    var folios = hoja.getRange(2, colFolio + 1, hoja.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < folios.length; i++) {
      if (String(folios[i][0]) === String(record.FOLIO)) { fila = i + 2; break; }
    }
  }

  // Encabezado → campo del registro, tolerando mayúsculas, acentos y signos:
  // en la sábana las columnas suelen llamarse "Folio" o "KM inicial", no "FOLIO"
  var campoDe = mapearEncabezados(heads, record);

  var valores;
  if (fila > 0) {
    var actuales = hoja.getRange(fila, 1, 1, ancho).getValues()[0];
    valores = [];
    for (var j = 0; j < ancho; j++) {
      valores.push(campoDe[j] ? record[campoDe[j]] : actuales[j]);
    }
  } else {
    valores = [];
    for (var k = 0; k < ancho; k++) {
      valores.push(campoDe[k] ? record[campoDe[k]] : '');
    }
    fila = hoja.getLastRow() + 1;
  }

  // Columnas fijas por posición: mandan sobre lo que diga el encabezado
  SABANA_COLUMNAS_FIJAS.forEach(function (c) {
    if (record[c.campo] === undefined || record[c.campo] === '') return;
    valores[letraAColumna(c.columna) - 1] = record[c.campo];
  });

  hoja.getRange(fila, 1, 1, ancho).setValues([valores]);
}

/**
 * Diagnóstico de la conexión con la sábana. Se corre desde el menú
 * "Master de Ruta → Probar sábana" y dice exactamente qué encuentra y dónde
 * escribiría el odómetro, sin modificar nada.
 */
function probarSabana() {
  var msg = [];
  var cfg = leerConfig();
  var id = String(cfg.SABANA_SHEET_ID || '').trim();

  if (!id) {
    return reportar('No hay SABANA_SHEET_ID en la hoja CONFIG.\n\n' +
      'Captúralo en la app: Administración → ID del Google Sheet de la sábana.');
  }
  msg.push('ID de sábana configurado: ' + id);

  var libro;
  try {
    libro = SpreadsheetApp.openById(id);
  } catch (err) {
    return reportar(msg.join('\n') + '\n\nNO SE PUDO ABRIR la sábana: ' + err + '\n\n' +
      'Revisa que el ID sea correcto y que la cuenta que ejecuta el script tenga acceso a ese archivo.');
  }
  msg.push('Sábana abierta: ' + libro.getName());

  var nombres = libro.getSheets().map(function (h) { return h.getName(); });
  msg.push('Hojas que contiene: ' + nombres.join(' | '));

  var hoja = libro.getSheetByName(HOJA_SABANA);
  if (!hoja) {
    return reportar(msg.join('\n') + '\n\nNO EXISTE una hoja llamada exactamente "' + HOJA_SABANA + '".\n\n' +
      'El nombre distingue mayúsculas y espacios. Cámbialo en la sábana, o ajusta la constante ' +
      'HOJA_SABANA al inicio de este script.');
  }

  var heads = encabezados(hoja);
  msg.push('Hoja "' + HOJA_SABANA + '" encontrada: ' + heads.length + ' columnas, ' +
           Math.max(hoja.getLastRow() - 1, 0) + ' renglones de datos.');

  SABANA_COLUMNAS_FIJAS.forEach(function (c) {
    var n = letraAColumna(c.columna);
    msg.push('  ' + c.columna + ' (columna ' + n + ') ← ' + c.campo +
             '   encabezado actual: "' + (heads[n - 1] || '(vacío)') + '"');
  });

  var colFolio = buscarColumnaFolio(heads);
  msg.push(colFolio >= 0
    ? 'Columna de folio: ' + (colFolio + 1) + ' ("' + heads[colFolio] + '"). Los folios ya existentes se actualizan.'
    : 'NO hay columna de folio: cada liquidación AGREGA un renglón nuevo al final ' +
      'en lugar de completar el renglón del viaje. Si esperabas que llenara un renglón ya existente, ' +
      'ese es el motivo: agrega una columna FOLIO a la hoja Transportadora.');

  return reportar(msg.join('\n'));
}

function reportar(texto) {
  Logger.log(texto);
  try { SpreadsheetApp.getUi().alert('Prueba de sábana', texto, SpreadsheetApp.getUi().ButtonSet.OK); } catch (ignore) {}
  return texto;
}

/**
 * Deja un nombre comparable: sin acentos, en mayúsculas y solo con letras y
 * números. Así "KM inicial", "Km_Inicial" y "KM_INICIAL" son lo mismo.
 */
function clave(texto) {
  return String(texto)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quita acentos
    .toUpperCase().replace(/[^A-Z0-9]/g, '');           // deja letras y números
}

/**
 * Para cada columna de la sábana devuelve el campo del registro que le toca,
 * o null si esa columna no le corresponde a ninguno (se deja intacta).
 */
function mapearEncabezados(heads, record) {
  var porClave = {};
  Object.keys(record).forEach(function (k) { porClave[clave(k)] = k; });
  return heads.map(function (h) {
    if (!String(h).trim()) return null;
    return porClave[clave(h)] || null;
  });
}

/** Busca la columna del folio tolerando mayúsculas, acentos y puntuación. */
function buscarColumnaFolio(heads) {
  for (var i = 0; i < heads.length; i++) {
    var h = clave(heads[i]);
    if (h === 'FOLIO' || h === 'NOFOLIO' || h === 'NUMFOLIO' || h === 'NFOLIO') return i;
  }
  return -1;
}

/** 'A' → 1, 'AC' → 29, 'AD' → 30 */
function letraAColumna(letra) {
  var s = String(letra).toUpperCase();
  var n = 0;
  for (var i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n;
}

/* ------------------------------------------------------------------ *
 *  Menú de apoyo dentro del Sheet
 * ------------------------------------------------------------------ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Master de Ruta')
    .addItem('Configurar hojas', 'configurarHojas')
    .addItem('Asignar IDs faltantes', 'asignarIdsFaltantes')
    .addItem('Probar sábana', 'probarSabana')
    .addToUi();
}
