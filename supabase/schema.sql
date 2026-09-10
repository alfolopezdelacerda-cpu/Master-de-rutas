-- Esquema de Tracking ADL (Sábana)
-- GENERADO por scripts/generar-esquema.mjs a partir de apps-script/Codigo.gs
-- No editar a mano: vuelve a generarse y se pierde. Para cambiar una columna,
-- cámbiala en el mapa HOJAS y corre de nuevo el generador.
--
-- 34 tablas. Todas las columnas son text en esta etapa, igual que
-- en el Sheet, para que la migración se pueda verificar renglón por renglón.

create extension if not exists pgcrypto;


-- ---------------------------------------------------------------------------
-- CONFIG: los parámetros de la plataforma, igual que la hoja CONFIG
-- ---------------------------------------------------------------------------
create table if not exists config (
  clave  text primary key,
  valor  text,
  actualizado_en timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- UNIDADES (22 columnas)
-- ---------------------------------------------------------------------------
create table if not exists unidades (
  "ID" text primary key default gen_random_uuid()::text,
  "ECONOMICO"                  text,
  "PLACAS"                     text,
  "TIPO_UNIDAD"                text,
  "MODELO"                     text,
  "ANIO"                       text,
  "COMBUSTIBLE"                text,
  "RENDIMIENTO"                text,
  "UREA"                       text,
  "OPERADOR_ASIGNADO"          text,
  "REMOLQUE1"                  text,
  "REMOLQUE2"                  text,
  "DOLLY"                      text,
  "ESTATUS_OPERATIVO"          text,
  "NOTA_OPERATIVA"             text,
  "ESTATUS_ACTUALIZADO"        text,
  "UBICACION_ACTUAL"           text,
  "UBICACION_ACTUALIZADA"      text,
  "UBICACION_FUENTE"           text,
  "LAT"                        text,
  "LON"                        text,
  "GPS_ACTUALIZADO"            text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists unidades_economico_idx on unidades ("ECONOMICO");

-- ---------------------------------------------------------------------------
-- OPERADORES (25 columnas)
-- ---------------------------------------------------------------------------
create table if not exists operadores (
  "ID" text primary key default gen_random_uuid()::text,
  "NOMBRE"                     text,
  "TELEFONO"                   text,
  "PAGO_NOMINAL_SEMANAL"       text,
  "SUELDO_FIJO_SEMANAL"        text,
  "MEDIO_COMUNICACION"         text,
  "ACTIVO"                     text,
  "FECHA_INGRESO"              text,
  "CURP"                       text,
  "RFC"                        text,
  "NSS"                        text,
  "TIPO_SANGRE"                text,
  "DOMICILIO"                  text,
  "CONTACTO_EMERGENCIA"        text,
  "TEL_EMERGENCIA"             text,
  "LICENCIA_NUM"               text,
  "LICENCIA_TIPO"              text,
  "LICENCIA_VENCE"             text,
  "APTO_MEDICO_VENCE"          text,
  "EXAMEN_TOX_VENCE"           text,
  "CURSO_MP_VENCE"             text,
  "RCONTROL_FOLIO"             text,
  "RCONTROL_RESULTADO"         text,
  "RCONTROL_VENCE"             text,
  "NOTAS_RRHH"                 text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists operadores_nombre_idx on operadores ("NOMBRE");

-- ---------------------------------------------------------------------------
-- EJECUTIVOS (2 columnas)
-- ---------------------------------------------------------------------------
create table if not exists ejecutivos (
  "ID" text primary key default gen_random_uuid()::text,
  "NOMBRE"                     text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists ejecutivos_nombre_idx on ejecutivos ("NOMBRE");

-- ---------------------------------------------------------------------------
-- REMOLQUES (4 columnas)
-- ---------------------------------------------------------------------------
create table if not exists remolques (
  "ID" text primary key default gen_random_uuid()::text,
  "ECONOMICO"                  text,
  "PLACAS"                     text,
  "TIPO"                       text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists remolques_economico_idx on remolques ("ECONOMICO");

-- ---------------------------------------------------------------------------
-- CLIENTES (33 columnas)
-- ---------------------------------------------------------------------------
create table if not exists clientes (
  "ID" text primary key default gen_random_uuid()::text,
  "NOMBRE"                     text,
  "RAZON_SOCIAL"               text,
  "RFC"                        text,
  "REGIMEN_FISCAL"             text,
  "CP_FISCAL"                  text,
  "USO_CFDI"                   text,
  "METODO_PAGO"                text,
  "FORMA_PAGO"                 text,
  "MONEDA"                     text,
  "DIAS_CREDITO"               text,
  "LIMITE_CREDITO"             text,
  "DOMICILIO"                  text,
  "CIUDAD"                     text,
  "ESTADO"                     text,
  "PAIS"                       text,
  "CONTACTO"                   text,
  "CONTACTO_TEL"               text,
  "CONTACTO_MAIL"              text,
  "MAIL_FACTURACION"           text,
  "PORTAL_ENLACE"              text,
  "PORTAL_USUARIO"             text,
  "PORTAL_PASSWORD"            text,
  "CONSTANCIA_URL"             text,
  "ACTA_URL"                   text,
  "PODER_URL"                  text,
  "OPINION_SAT_URL"            text,
  "OPINION_SAT_VENCE"          text,
  "CONTRATO_URL"               text,
  "CONTRATO_VENCE"             text,
  "NOTAS"                      text,
  "ACTIVO"                     text,
  "EJECUTIVO"                  text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists clientes_nombre_idx on clientes ("NOMBRE");
create index if not exists clientes_estado_idx on clientes ("ESTADO");

-- ---------------------------------------------------------------------------
-- TIPO_NEGOCIO (2 columnas)
-- ---------------------------------------------------------------------------
create table if not exists tipo_negocio (
  "ID" text primary key default gen_random_uuid()::text,
  "NOMBRE"                     text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists tipo_negocio_nombre_idx on tipo_negocio ("NOMBRE");

-- ---------------------------------------------------------------------------
-- ADUANAS (2 columnas)
-- ---------------------------------------------------------------------------
create table if not exists aduanas (
  "ID" text primary key default gen_random_uuid()::text,
  "NOMBRE"                     text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists aduanas_nombre_idx on aduanas ("NOMBRE");

-- ---------------------------------------------------------------------------
-- ESTADOS (2 columnas)
-- ---------------------------------------------------------------------------
create table if not exists estados (
  "ID" text primary key default gen_random_uuid()::text,
  "NOMBRE"                     text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists estados_nombre_idx on estados ("NOMBRE");

-- ---------------------------------------------------------------------------
-- CIUDADES (3 columnas)
-- ---------------------------------------------------------------------------
create table if not exists ciudades (
  "ID" text primary key default gen_random_uuid()::text,
  "NOMBRE"                     text,
  "ESTADO"                     text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists ciudades_nombre_idx on ciudades ("NOMBRE");
create index if not exists ciudades_estado_idx on ciudades ("ESTADO");

-- ---------------------------------------------------------------------------
-- PROVEEDORES (33 columnas)
-- ---------------------------------------------------------------------------
create table if not exists proveedores (
  "ID" text primary key default gen_random_uuid()::text,
  "NOMBRE"                     text,
  "RAZON_SOCIAL"               text,
  "RFC"                        text,
  "REGIMEN_FISCAL"             text,
  "CP_FISCAL"                  text,
  "TIPO"                       text,
  "DOMICILIO"                  text,
  "CIUDAD"                     text,
  "ESTADO"                     text,
  "CONTACTO"                   text,
  "CONTACTO_TEL"               text,
  "CONTACTO_MAIL"              text,
  "MAIL_FACTURACION"           text,
  "BANCO"                      text,
  "CUENTA"                     text,
  "CLABE"                      text,
  "DIAS_CREDITO"               text,
  "CONSTANCIA_URL"             text,
  "OPINION_SAT_URL"            text,
  "OPINION_SAT_VENCE"          text,
  "POLIZA_SEGURO"              text,
  "POLIZA_VENCE"               text,
  "PERMISO_SCT"                text,
  "PERMISO_SCT_VENCE"          text,
  "REPSE"                      text,
  "CONTRATO_URL"               text,
  "CONTRATO_VENCE"             text,
  "NOTAS"                      text,
  "ACTIVO"                     text,
  "PLATAFORMA_USUARIO"         text,
  "PLATAFORMA_PASSWORD"        text,
  "PLATAFORMA_ENLACE"          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists proveedores_nombre_idx on proveedores ("NOMBRE");
create index if not exists proveedores_estado_idx on proveedores ("ESTADO");

-- ---------------------------------------------------------------------------
-- TIPOS_INCIDENCIA (2 columnas)
-- ---------------------------------------------------------------------------
create table if not exists tipos_incidencia (
  "ID" text primary key default gen_random_uuid()::text,
  "NOMBRE"                     text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists tipos_incidencia_nombre_idx on tipos_incidencia ("NOMBRE");

-- ---------------------------------------------------------------------------
-- INCIDENCIAS (10 columnas)
-- ---------------------------------------------------------------------------
create table if not exists incidencias (
  "ID" text primary key default gen_random_uuid()::text,
  "FECHA_HORA"                 text,
  "SERVICIO_ID"                text,
  "CP"                         text,
  "CLIENTE"                    text,
  "ECONOMICO"                  text,
  "OPERADOR"                   text,
  "TIPO"                       text,
  "DESCRIPCION"                text,
  "REGISTRADO_POR"             text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists incidencias_servicio_id_idx on incidencias ("SERVICIO_ID");
create index if not exists incidencias_cp_idx on incidencias ("CP");
create index if not exists incidencias_cliente_idx on incidencias ("CLIENTE");
create index if not exists incidencias_economico_idx on incidencias ("ECONOMICO");
create index if not exists incidencias_operador_idx on incidencias ("OPERADOR");

-- ---------------------------------------------------------------------------
-- UBICACIONES (11 columnas)
-- ---------------------------------------------------------------------------
create table if not exists ubicaciones (
  "ID" text primary key default gen_random_uuid()::text,
  "FECHA_HORA"                 text,
  "SERVICIO_ID"                text,
  "CP"                         text,
  "ECONOMICO"                  text,
  "OPERADOR"                   text,
  "UBICACION"                  text,
  "LAT"                        text,
  "LON"                        text,
  "FUENTE"                     text,
  "REGISTRADO_POR"             text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists ubicaciones_servicio_id_idx on ubicaciones ("SERVICIO_ID");
create index if not exists ubicaciones_cp_idx on ubicaciones ("CP");
create index if not exists ubicaciones_economico_idx on ubicaciones ("ECONOMICO");
create index if not exists ubicaciones_operador_idx on ubicaciones ("OPERADOR");

-- ---------------------------------------------------------------------------
-- EVIDENCIAS (11 columnas)
-- ---------------------------------------------------------------------------
create table if not exists evidencias (
  "ID" text primary key default gen_random_uuid()::text,
  "FECHA_HORA"                 text,
  "SERVICIO_ID"                text,
  "FOLIO"                      text,
  "CP"                         text,
  "OPERADOR"                   text,
  "CLASE"                      text,
  "GASTO_ID"                   text,
  "NOMBRE"                     text,
  "IMAGEN"                     text,
  "REGISTRADO_POR"             text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists evidencias_servicio_id_idx on evidencias ("SERVICIO_ID");
create index if not exists evidencias_folio_idx on evidencias ("FOLIO");
create index if not exists evidencias_cp_idx on evidencias ("CP");
create index if not exists evidencias_operador_idx on evidencias ("OPERADOR");
create index if not exists evidencias_nombre_idx on evidencias ("NOMBRE");

-- ---------------------------------------------------------------------------
-- TARIFAS (9 columnas)
-- ---------------------------------------------------------------------------
create table if not exists tarifas (
  "ID" text primary key default gen_random_uuid()::text,
  "CLIENTE"                    text,
  "RUTA"                       text,
  "TIPO_UNIDAD"                text,
  "TARIFA"                     text,
  "MONEDA"                     text,
  "VIGENCIA_DESDE"             text,
  "VIGENCIA_HASTA"             text,
  "NOTAS"                      text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists tarifas_cliente_idx on tarifas ("CLIENTE");

-- ---------------------------------------------------------------------------
-- CXC (16 columnas)
-- ---------------------------------------------------------------------------
create table if not exists cxc (
  "ID" text primary key default gen_random_uuid()::text,
  "SERVICIO_ID"                text,
  "CP"                         text,
  "CLIENTE"                    text,
  "RUTA"                       text,
  "TIPO_UNIDAD"                text,
  "FECHA_SERVICIO"             text,
  "TARIFA"                     text,
  "EXTRAS"                     text,
  "TOTAL"                      text,
  "ESTADO"                     text,
  "FACTURA"                    text,
  "FECHA_FACTURA"              text,
  "FECHA_COBRO"                text,
  "NOTAS"                      text,
  "REGISTRADO_POR"             text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists cxc_servicio_id_idx on cxc ("SERVICIO_ID");
create index if not exists cxc_cp_idx on cxc ("CP");
create index if not exists cxc_cliente_idx on cxc ("CLIENTE");
create index if not exists cxc_estado_idx on cxc ("ESTADO");

-- ---------------------------------------------------------------------------
-- ORDENES_COMPRA (22 columnas)
-- ---------------------------------------------------------------------------
create table if not exists ordenes_compra (
  "ID" text primary key default gen_random_uuid()::text,
  "FOLIO"                      text,
  "FECHA"                      text,
  "PROVEEDOR"                  text,
  "CONCEPTO"                   text,
  "SERVICIO_ID"                text,
  "CP"                         text,
  "PARTIDAS_JSON"              text,
  "SUBTOTAL"                   text,
  "IVA"                        text,
  "TOTAL"                      text,
  "MONEDA"                     text,
  "ESTADO"                     text,
  "AUTORIZADA_POR"             text,
  "FECHA_AUTORIZACION"         text,
  "FACTURA_PROVEEDOR"          text,
  "UUID_PROVEEDOR"             text,
  "FECHA_RECEPCION"            text,
  "FECHA_PAGO"                 text,
  "PAGADA_POR"                 text,
  "NOTAS"                      text,
  "CREADA_POR"                 text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists ordenes_compra_folio_idx on ordenes_compra ("FOLIO");
create index if not exists ordenes_compra_servicio_id_idx on ordenes_compra ("SERVICIO_ID");
create index if not exists ordenes_compra_cp_idx on ordenes_compra ("CP");
create index if not exists ordenes_compra_estado_idx on ordenes_compra ("ESTADO");

-- ---------------------------------------------------------------------------
-- CARTAS_PORTE (20 columnas)
-- ---------------------------------------------------------------------------
create table if not exists cartas_porte (
  "ID" text primary key default gen_random_uuid()::text,
  "CP"                         text,
  "SERVICIO_ID"                text,
  "CLIENTE"                    text,
  "SERIE"                      text,
  "FOLIO"                      text,
  "UUID"                       text,
  "IDCCP"                      text,
  "FECHA_TIMBRADO"             text,
  "RFC_EMISOR"                 text,
  "RFC_RECEPTOR"               text,
  "TIPO_CFDI"                  text,
  "TOTAL"                      text,
  "ESTADO"                     text,
  "FECHA_CANCELACION"          text,
  "MOTIVO_CANCELACION"         text,
  "XML_URL"                    text,
  "PDF_URL"                    text,
  "NOTAS"                      text,
  "REGISTRADO_POR"             text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists cartas_porte_cp_idx on cartas_porte ("CP");
create index if not exists cartas_porte_servicio_id_idx on cartas_porte ("SERVICIO_ID");
create index if not exists cartas_porte_cliente_idx on cartas_porte ("CLIENTE");
create index if not exists cartas_porte_folio_idx on cartas_porte ("FOLIO");
create index if not exists cartas_porte_uuid_idx on cartas_porte ("UUID");
create index if not exists cartas_porte_estado_idx on cartas_porte ("ESTADO");

-- ---------------------------------------------------------------------------
-- FACTURAS (25 columnas)
-- ---------------------------------------------------------------------------
create table if not exists facturas (
  "ID" text primary key default gen_random_uuid()::text,
  "SERIE"                      text,
  "FOLIO"                      text,
  "UUID"                       text,
  "FECHA"                      text,
  "CLIENTE"                    text,
  "RFC"                        text,
  "CONCEPTO"                   text,
  "CXC_IDS"                    text,
  "CARTAS_PORTE"               text,
  "SUBTOTAL"                   text,
  "IVA"                        text,
  "RETENCION"                  text,
  "TOTAL"                      text,
  "MONEDA"                     text,
  "METODO_PAGO"                text,
  "FORMA_PAGO"                 text,
  "USO_CFDI"                   text,
  "ESTADO"                     text,
  "FECHA_PAGO"                 text,
  "FECHA_CANCELACION"          text,
  "XML_URL"                    text,
  "PDF_URL"                    text,
  "NOTAS"                      text,
  "REGISTRADO_POR"             text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists facturas_folio_idx on facturas ("FOLIO");
create index if not exists facturas_uuid_idx on facturas ("UUID");
create index if not exists facturas_cliente_idx on facturas ("CLIENTE");
create index if not exists facturas_cartas_porte_idx on facturas ("CARTAS_PORTE");
create index if not exists facturas_estado_idx on facturas ("ESTADO");

-- ---------------------------------------------------------------------------
-- PAGOS (12 columnas)
-- ---------------------------------------------------------------------------
create table if not exists pagos (
  "ID" text primary key default gen_random_uuid()::text,
  "FECHA"                      text,
  "TIPO"                       text,
  "ORIGEN"                     text,
  "REFERENCIA_ID"              text,
  "FOLIO"                      text,
  "CONTRAPARTE"                text,
  "MONTO"                      text,
  "METODO"                     text,
  "CUENTA"                     text,
  "NOTAS"                      text,
  "REGISTRADO_POR"             text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists pagos_referencia_id_idx on pagos ("REFERENCIA_ID");
create index if not exists pagos_folio_idx on pagos ("FOLIO");

-- ---------------------------------------------------------------------------
-- LIBERACIONES (12 columnas)
-- ---------------------------------------------------------------------------
create table if not exists liberaciones (
  "ID" text primary key default gen_random_uuid()::text,
  "FECHA"                      text,
  "TIPO"                       text,
  "REFERENCIA_ID"              text,
  "FOLIO"                      text,
  "CONCEPTO"                   text,
  "CONTRAPARTE"                text,
  "MONTO"                      text,
  "ESTADO"                     text,
  "LIBERADO_POR"               text,
  "FECHA_LIBERACION"           text,
  "MOTIVO"                     text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists liberaciones_referencia_id_idx on liberaciones ("REFERENCIA_ID");
create index if not exists liberaciones_folio_idx on liberaciones ("FOLIO");
create index if not exists liberaciones_estado_idx on liberaciones ("ESTADO");

-- ---------------------------------------------------------------------------
-- TICKETS_CALIDAD (21 columnas)
-- ---------------------------------------------------------------------------
create table if not exists tickets_calidad (
  "ID" text primary key default gen_random_uuid()::text,
  "FOLIO"                      text,
  "FECHA_ALTA"                 text,
  "TIPO"                       text,
  "PRIORIDAD"                  text,
  "ESTADO"                     text,
  "AREA"                       text,
  "SERVICIO_ID"                text,
  "CP"                         text,
  "CLIENTE"                    text,
  "OPERADOR"                   text,
  "ECONOMICO"                  text,
  "TITULO"                     text,
  "DESCRIPCION"                text,
  "RESPONSABLE"                text,
  "LEVANTADO_POR"              text,
  "FECHA_COMPROMISO"           text,
  "ACCION_CORRECTIVA"          text,
  "CAUSA_RAIZ"                 text,
  "FECHA_CIERRE"               text,
  "CERRADO_POR"                text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists tickets_calidad_folio_idx on tickets_calidad ("FOLIO");
create index if not exists tickets_calidad_estado_idx on tickets_calidad ("ESTADO");
create index if not exists tickets_calidad_servicio_id_idx on tickets_calidad ("SERVICIO_ID");
create index if not exists tickets_calidad_cp_idx on tickets_calidad ("CP");
create index if not exists tickets_calidad_cliente_idx on tickets_calidad ("CLIENTE");
create index if not exists tickets_calidad_operador_idx on tickets_calidad ("OPERADOR");
create index if not exists tickets_calidad_economico_idx on tickets_calidad ("ECONOMICO");

-- ---------------------------------------------------------------------------
-- SEGUIMIENTOS_CALIDAD (6 columnas)
-- ---------------------------------------------------------------------------
create table if not exists seguimientos_calidad (
  "ID" text primary key default gen_random_uuid()::text,
  "TICKET_ID"                  text,
  "FECHA_HORA"                 text,
  "ESTADO"                     text,
  "NOTA"                       text,
  "REGISTRADO_POR"             text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists seguimientos_calidad_ticket_id_idx on seguimientos_calidad ("TICKET_ID");
create index if not exists seguimientos_calidad_estado_idx on seguimientos_calidad ("ESTADO");

-- ---------------------------------------------------------------------------
-- GASTOS_EXTRA (16 columnas)
-- ---------------------------------------------------------------------------
create table if not exists gastos_extra (
  "ID" text primary key default gen_random_uuid()::text,
  "FOLIO"                      text,
  "SOLICITUD_ID"               text,
  "SERVICIO_ID"                text,
  "CARTAS_PORTE"               text,
  "OPERADOR"                   text,
  "ECONOMICO"                  text,
  "FECHA_SOLICITUD"            text,
  "TIPO"                       text,
  "MONTO"                      text,
  "MOTIVO"                     text,
  "SOLICITADO_POR"             text,
  "DISPERSION"                 text,
  "DISPERSADO_POR"             text,
  "FECHA_DISPERSION"           text,
  "COMPROBANTE_ID"             text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists gastos_extra_folio_idx on gastos_extra ("FOLIO");
create index if not exists gastos_extra_solicitud_id_idx on gastos_extra ("SOLICITUD_ID");
create index if not exists gastos_extra_servicio_id_idx on gastos_extra ("SERVICIO_ID");
create index if not exists gastos_extra_cartas_porte_idx on gastos_extra ("CARTAS_PORTE");
create index if not exists gastos_extra_operador_idx on gastos_extra ("OPERADOR");
create index if not exists gastos_extra_economico_idx on gastos_extra ("ECONOMICO");

-- ---------------------------------------------------------------------------
-- SERVICIOS (68 columnas)
-- ---------------------------------------------------------------------------
create table if not exists servicios (
  "ID" text primary key default gen_random_uuid()::text,
  "MODALIDAD"                  text,
  "SABANA"                     text,
  "FECHA_SOLICITUD"            text,
  "FECHA_ACEPTACION"           text,
  "CITA_CARGA"                 text,
  "SEMANA"                     text,
  "MES"                        text,
  "EJECUTIVO"                  text,
  "TIPO_NEGOCIO"               text,
  "ADUANA_PUERTO"              text,
  "RF_SECO"                    text,
  "OW_RT"                      text,
  "CLIENTE"                    text,
  "CITA_ENTREGA"               text,
  "ESTATUS"                    text,
  "CP"                         text,
  "CONTENEDORES"               text,
  "TIPO_MERCANCIA"             text,
  "BOOKING"                    text,
  "PO"                         text,
  "ESTADO_ORIGEN"              text,
  "PUNTO_CARGA"                text,
  "CIUDAD_DESTINO"             text,
  "PUNTO_DESCARGA"             text,
  "LINEA_TRANSPORTISTA"        text,
  "TIPO_UNIDAD"                text,
  "CONTENEDOR_1"               text,
  "CONTENEDOR_2"               text,
  "ESTADO_DESTINO"             text,
  "RUTA"                       text,
  "ECONOMICO"                  text,
  "PLACAS"                     text,
  "OPERADOR"                   text,
  "MEDIO_COMUNICACION"         text,
  "REMOLQUE1"                  text,
  "REMOLQUE2"                  text,
  "DOLLY"                      text,
  "ASIGNADO_POR"               text,
  "FECHA_ASIGNACION"           text,
  "ETAPA"                      text,
  "SOLICITUD_ID"               text,
  "FOLIO_GASTO"                text,
  "FECHA_GASTO"                text,
  "FECHA_DISPERSION"           text,
  "FECHA_SALIDA"               text,
  "FECHA_FINALIZADO"           text,
  "FECHA_EVIDENCIA"            text,
  "FECHA_LIQUIDACION"          text,
  "NOMINA_ID"                  text,
  "FECHA_PAGO"                 text,
  "NOTA_MONITOREO"             text,
  "ESTATUS_MONITOREO"          text,
  "ESPEJO_UNIDAD"              text,
  "ESPEJO_PORTAS"              text,
  "HITO_SALIDA_PATIO"          text,
  "HITO_ARRIBO_CARGA"          text,
  "HITO_INGRESO_CARGAR"        text,
  "HITO_INICIO_RUTA"           text,
  "HITO_ARRIBO_DESTINO"        text,
  "HITO_INGRESO_DESCARGA"      text,
  "HITO_SERVICIO_FINALIZADO"   text,
  "REGRESA_PATIO"              text,
  "HITO_ARRIBO_PATIO_ADL"      text,
  "CUMPLIMIENTO_CARGA"         text,
  "CUMPLIMIENTO_DESCARGA"      text,
  "CREADO_POR"                 text,
  "FECHA_REGISTRO"             text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists servicios_cliente_idx on servicios ("CLIENTE");
create index if not exists servicios_estatus_idx on servicios ("ESTATUS");
create index if not exists servicios_cp_idx on servicios ("CP");
create index if not exists servicios_economico_idx on servicios ("ECONOMICO");
create index if not exists servicios_operador_idx on servicios ("OPERADOR");
create index if not exists servicios_etapa_idx on servicios ("ETAPA");
create index if not exists servicios_solicitud_id_idx on servicios ("SOLICITUD_ID");

-- ---------------------------------------------------------------------------
-- CASETAS (6 columnas)
-- ---------------------------------------------------------------------------
create table if not exists casetas (
  "ID" text primary key default gen_random_uuid()::text,
  "NOMBRE"                     text,
  "CARRETERA"                  text,
  "COSTO_2E"                   text,
  "COSTO_5E"                   text,
  "COSTO_9E"                   text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists casetas_nombre_idx on casetas ("NOMBRE");

-- ---------------------------------------------------------------------------
-- USUARIOS (8 columnas)
-- ---------------------------------------------------------------------------
create table if not exists usuarios (
  "ID" text primary key default gen_random_uuid()::text,
  "USUARIO"                    text,
  "NOMBRE"                     text,
  "PASSWORD"                   text,
  "ROL"                        text,
  "ACTIVO"                     text,
  "PESTANAS"                   text,
  "CLIENTES"                   text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists usuarios_usuario_idx on usuarios ("USUARIO");
create index if not exists usuarios_nombre_idx on usuarios ("NOMBRE");

-- ---------------------------------------------------------------------------
-- RUTAS (19 columnas)
-- ---------------------------------------------------------------------------
create table if not exists rutas (
  "ID" text primary key default gen_random_uuid()::text,
  "RUTA"                       text,
  "CLIENTE"                    text,
  "ENLACE"                     text,
  "TIPO_SERVICIO"              text,
  "TIPO_VIAJE"                 text,
  "TIPO_UNIDAD"                text,
  "EQUIPO_ARRASTRE"            text,
  "TRAMOS_JSON"                text,
  "TOTAL_KM"                   text,
  "KM_CARGADOS"                text,
  "KM_VACIOS"                  text,
  "KM_POSICIONAMIENTO"         text,
  "OPTIMIZADA_FULL"            text,
  "CASETAS_JSON"               text,
  "COSTO_CASETAS"              text,
  "COSTO_CASETAS_2E"           text,
  "COSTO_CASETAS_5E"           text,
  "COSTO_CASETAS_9E"           text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists rutas_cliente_idx on rutas ("CLIENTE");

-- ---------------------------------------------------------------------------
-- SOLICITUDES (41 columnas)
-- ---------------------------------------------------------------------------
create table if not exists solicitudes (
  "ID" text primary key default gen_random_uuid()::text,
  "FOLIO"                      text,
  "FECHA_SOLICITUD"            text,
  "FECHA_SERVICIO"             text,
  "CARTAS_PORTE"               text,
  "TIPO_ARRASTRE"              text,
  "ECONOMICO"                  text,
  "PLACAS"                     text,
  "TIPO_UNIDAD"                text,
  "OPERADOR"                   text,
  "REMOLQUE1"                  text,
  "REMOLQUE2"                  text,
  "DOLLY"                      text,
  "RUTA"                       text,
  "CLIENTE"                    text,
  "TIPO_SERVICIO"              text,
  "TIPO_VIAJE"                 text,
  "KM"                         text,
  "KM_CARGADOS"                text,
  "KM_VACIOS"                  text,
  "COMBUSTIBLE"                text,
  "RENDIMIENTO"                text,
  "LITROS_COMBUSTIBLE"         text,
  "LITROS_UREA"                text,
  "DEPOSITO_UREA"              text,
  "PENSION"                    text,
  "COMIDA"                     text,
  "COSTO_CASETAS"              text,
  "TARIFA_CASETAS"             text,
  "COMBUSTIBLE_ASIGNADO"       text,
  "EJECUTIVO"                  text,
  "TOTAL"                      text,
  "GASTOS_ADICIONALES_JSON"    text,
  "DISP_COMBUSTIBLE"           text,
  "DISP_CASETAS"               text,
  "DISP_GASTOS_ADICIONALES_JSON" text,
  "DISP_TOTAL"                 text,
  "SERVICIO_ID"                text,
  "DISPERSION"                 text,
  "DISPERSADO_POR"             text,
  "FECHA_DISPERSION"           text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists solicitudes_folio_idx on solicitudes ("FOLIO");
create index if not exists solicitudes_cartas_porte_idx on solicitudes ("CARTAS_PORTE");
create index if not exists solicitudes_economico_idx on solicitudes ("ECONOMICO");
create index if not exists solicitudes_operador_idx on solicitudes ("OPERADOR");
create index if not exists solicitudes_cliente_idx on solicitudes ("CLIENTE");
create index if not exists solicitudes_servicio_id_idx on solicitudes ("SERVICIO_ID");

-- ---------------------------------------------------------------------------
-- NOMINAS (41 columnas)
-- ---------------------------------------------------------------------------
create table if not exists nominas (
  "ID" text primary key default gen_random_uuid()::text,
  "OPERADOR"                   text,
  "MODO"                       text,
  "PERIODO"                    text,
  "SEMANAS"                    text,
  "TIPO_PAGO"                  text,
  "SUELDO_BRUTO"               text,
  "SUELDO_FIJO"                text,
  "IMPUESTO_PCT"               text,
  "IMPUESTOS"                  text,
  "SUELDO_NETO"                text,
  "BONO_CUMPLIMIENTO"          text,
  "KM"                         text,
  "KM_RUTA"                    text,
  "KM_ODOMETRO"                text,
  "FUENTE_KM"                  text,
  "OBJETIVO_KM"                text,
  "CUMPLIMIENTO_PCT"           text,
  "KM_EXTRA"                   text,
  "PAGO_KM_EXTRA"              text,
  "REND_OBJETIVO"              text,
  "REND_REAL"                  text,
  "LITROS_AHORRADOS"           text,
  "PAGO_RENDIMIENTO"           text,
  "OBJ_LLEGADA_TIEMPO"         text,
  "OBJ_SIN_INCIDENCIAS"        text,
  "PAGO_SERVICIOS"             text,
  "DIFERENCIA_SERVICIOS"       text,
  "PISO_PAGO"                  text,
  "COMPLEMENTO_PAGO"           text,
  "APOYO_VIAJE"                text,
  "APOYO_PCT"                  text,
  "APOYO_AUTORIZADO"           text,
  "AUTORIZADO_POR"             text,
  "DESCUENTO_GASTOS"           text,
  "TOTAL"                      text,
  "REGISTRADO_POR"             text,
  "FECHA_REGISTRO"             text,
  "PAGADA"                     text,
  "PAGADA_POR"                 text,
  "FECHA_PAGO"                 text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists nominas_operador_idx on nominas ("OPERADOR");

-- ---------------------------------------------------------------------------
-- LIQUIDACION (47 columnas)
-- ---------------------------------------------------------------------------
create table if not exists liquidacion (
  "ID" text primary key default gen_random_uuid()::text,
  "FOLIO"                      text,
  "CARTAS_PORTE"               text,
  "FECHA_CARGA"                text,
  "FECHA_FINALIZADO"           text,
  "RUTA"                       text,
  "CLIENTE"                    text,
  "OPERADOR"                   text,
  "COMB_PROYECTADO"            text,
  "CASETAS_PROYECTADO"         text,
  "COMB_REAL"                  text,
  "CASETAS_REAL"               text,
  "PENSION_LIQ"                text,
  "VIATICOS"                   text,
  "MANIOBRAS"                  text,
  "TALACHAS"                   text,
  "DADIVAS"                    text,
  "ESTACIONAMIENTOS"           text,
  "ODOMETRO_INICIAL"           text,
  "ODOMETRO_FINAL"             text,
  "KM_ODOMETRO"                text,
  "KM_RUTA"                    text,
  "DIFERENCIA_KM"              text,
  "REVISAR_KM"                 text,
  "EVIDENCIA"                  text,
  "ESTADO"                     text,
  "FECHA_LIQUIDACION"          text,
  "LIQUIDADO_POR"              text,
  "MOTIVO_ACLARACION"          text,
  "ACLARACION_POR"             text,
  "ACLARACION_FECHA"           text,
  "AUTORIZADO_POR"             text,
  "FECHA_AUTORIZACION"         text,
  "NOTA_AUTORIZACION"          text,
  "GASTOS_ADICIONALES_JSON"    text,
  "DESCUENTO_GASTOS_ADICIONALES" text,
  "INCIDENCIAS_NOTA"           text,
  "N_INCIDENCIAS"              text,
  "SEGURIDAD_ESTADO"           text,
  "SEGURIDAD_INCIDENCIAS"      text,
  "SEGURIDAD_TIEMPO"           text,
  "SEGURIDAD_COMENTARIOS"      text,
  "SEGURIDAD_VALIDADO_POR"     text,
  "SEGURIDAD_FECHA_VALIDACION" text,
  "DISPERSION"                 text,
  "DISPERSADO_POR"             text,
  "FECHA_DISPERSION"           text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists liquidacion_folio_idx on liquidacion ("FOLIO");
create index if not exists liquidacion_cartas_porte_idx on liquidacion ("CARTAS_PORTE");
create index if not exists liquidacion_cliente_idx on liquidacion ("CLIENTE");
create index if not exists liquidacion_operador_idx on liquidacion ("OPERADOR");
create index if not exists liquidacion_estado_idx on liquidacion ("ESTADO");

-- ---------------------------------------------------------------------------
-- SOLICITUDES_CANCELADAS (31 columnas)
-- ---------------------------------------------------------------------------
create table if not exists solicitudes_canceladas (
  "ID" text primary key default gen_random_uuid()::text,
  "FECHA_CANCELACION"          text,
  "FOLIO"                      text,
  "FECHA_SOLICITUD"            text,
  "FECHA_SERVICIO"             text,
  "CARTAS_PORTE"               text,
  "TIPO_ARRASTRE"              text,
  "ECONOMICO"                  text,
  "PLACAS"                     text,
  "TIPO_UNIDAD"                text,
  "OPERADOR"                   text,
  "REMOLQUE1"                  text,
  "REMOLQUE2"                  text,
  "DOLLY"                      text,
  "RUTA"                       text,
  "CLIENTE"                    text,
  "TIPO_SERVICIO"              text,
  "TIPO_VIAJE"                 text,
  "KM"                         text,
  "COMBUSTIBLE"                text,
  "LITROS_COMBUSTIBLE"         text,
  "PENSION"                    text,
  "COMIDA"                     text,
  "COSTO_CASETAS"              text,
  "EJECUTIVO"                  text,
  "TOTAL"                      text,
  "ESTADO_CANCELACION"         text,
  "MOTIVO_CANCELACION"         text,
  "CANCELADA_POR"              text,
  "AUTORIZADA_POR"             text,
  "ROL_AUTORIZA"               text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists solicitudes_canceladas_folio_idx on solicitudes_canceladas ("FOLIO");
create index if not exists solicitudes_canceladas_cartas_porte_idx on solicitudes_canceladas ("CARTAS_PORTE");
create index if not exists solicitudes_canceladas_economico_idx on solicitudes_canceladas ("ECONOMICO");
create index if not exists solicitudes_canceladas_operador_idx on solicitudes_canceladas ("OPERADOR");
create index if not exists solicitudes_canceladas_cliente_idx on solicitudes_canceladas ("CLIENTE");

-- ---------------------------------------------------------------------------
-- BITACORA (9 columnas)
-- ---------------------------------------------------------------------------
create table if not exists bitacora (
  "ID" text primary key default gen_random_uuid()::text,
  "FECHA_HORA"                 text,
  "USUARIO"                    text,
  "NOMBRE"                     text,
  "ROL"                        text,
  "ACCION"                     text,
  "HOJA"                       text,
  "REGISTRO"                   text,
  "DETALLE"                    text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists bitacora_usuario_idx on bitacora ("USUARIO");
create index if not exists bitacora_nombre_idx on bitacora ("NOMBRE");

-- ---------------------------------------------------------------------------
-- PAGO_X_KM (11 columnas)
-- ---------------------------------------------------------------------------
create table if not exists pago_x_km (
  "ID" text primary key default gen_random_uuid()::text,
  "ORIGEN"                     text,
  "DESTINO"                    text,
  "KMS_RED"                    text,
  "VJS_MES"                    text,
  "KMS_MES"                    text,
  "FULL"                       text,
  "SENCILLO"                   text,
  "RABON"                      text,
  "TON_3_5"                    text,
  "TON_1_5"                    text,
  "KG_600"                     text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- actualizado_en se sella solo en cada UPDATE
-- ---------------------------------------------------------------------------
create or replace function sellar_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end $$;

drop trigger if exists unidades_sellar on unidades;
create trigger unidades_sellar before update on unidades
  for each row execute function sellar_actualizado();
drop trigger if exists operadores_sellar on operadores;
create trigger operadores_sellar before update on operadores
  for each row execute function sellar_actualizado();
drop trigger if exists ejecutivos_sellar on ejecutivos;
create trigger ejecutivos_sellar before update on ejecutivos
  for each row execute function sellar_actualizado();
drop trigger if exists remolques_sellar on remolques;
create trigger remolques_sellar before update on remolques
  for each row execute function sellar_actualizado();
drop trigger if exists clientes_sellar on clientes;
create trigger clientes_sellar before update on clientes
  for each row execute function sellar_actualizado();
drop trigger if exists tipo_negocio_sellar on tipo_negocio;
create trigger tipo_negocio_sellar before update on tipo_negocio
  for each row execute function sellar_actualizado();
drop trigger if exists aduanas_sellar on aduanas;
create trigger aduanas_sellar before update on aduanas
  for each row execute function sellar_actualizado();
drop trigger if exists estados_sellar on estados;
create trigger estados_sellar before update on estados
  for each row execute function sellar_actualizado();
drop trigger if exists ciudades_sellar on ciudades;
create trigger ciudades_sellar before update on ciudades
  for each row execute function sellar_actualizado();
drop trigger if exists proveedores_sellar on proveedores;
create trigger proveedores_sellar before update on proveedores
  for each row execute function sellar_actualizado();
drop trigger if exists tipos_incidencia_sellar on tipos_incidencia;
create trigger tipos_incidencia_sellar before update on tipos_incidencia
  for each row execute function sellar_actualizado();
drop trigger if exists incidencias_sellar on incidencias;
create trigger incidencias_sellar before update on incidencias
  for each row execute function sellar_actualizado();
drop trigger if exists ubicaciones_sellar on ubicaciones;
create trigger ubicaciones_sellar before update on ubicaciones
  for each row execute function sellar_actualizado();
drop trigger if exists evidencias_sellar on evidencias;
create trigger evidencias_sellar before update on evidencias
  for each row execute function sellar_actualizado();
drop trigger if exists tarifas_sellar on tarifas;
create trigger tarifas_sellar before update on tarifas
  for each row execute function sellar_actualizado();
drop trigger if exists cxc_sellar on cxc;
create trigger cxc_sellar before update on cxc
  for each row execute function sellar_actualizado();
drop trigger if exists ordenes_compra_sellar on ordenes_compra;
create trigger ordenes_compra_sellar before update on ordenes_compra
  for each row execute function sellar_actualizado();
drop trigger if exists cartas_porte_sellar on cartas_porte;
create trigger cartas_porte_sellar before update on cartas_porte
  for each row execute function sellar_actualizado();
drop trigger if exists facturas_sellar on facturas;
create trigger facturas_sellar before update on facturas
  for each row execute function sellar_actualizado();
drop trigger if exists pagos_sellar on pagos;
create trigger pagos_sellar before update on pagos
  for each row execute function sellar_actualizado();
drop trigger if exists liberaciones_sellar on liberaciones;
create trigger liberaciones_sellar before update on liberaciones
  for each row execute function sellar_actualizado();
drop trigger if exists tickets_calidad_sellar on tickets_calidad;
create trigger tickets_calidad_sellar before update on tickets_calidad
  for each row execute function sellar_actualizado();
drop trigger if exists seguimientos_calidad_sellar on seguimientos_calidad;
create trigger seguimientos_calidad_sellar before update on seguimientos_calidad
  for each row execute function sellar_actualizado();
drop trigger if exists gastos_extra_sellar on gastos_extra;
create trigger gastos_extra_sellar before update on gastos_extra
  for each row execute function sellar_actualizado();
drop trigger if exists servicios_sellar on servicios;
create trigger servicios_sellar before update on servicios
  for each row execute function sellar_actualizado();
drop trigger if exists casetas_sellar on casetas;
create trigger casetas_sellar before update on casetas
  for each row execute function sellar_actualizado();
drop trigger if exists usuarios_sellar on usuarios;
create trigger usuarios_sellar before update on usuarios
  for each row execute function sellar_actualizado();
drop trigger if exists rutas_sellar on rutas;
create trigger rutas_sellar before update on rutas
  for each row execute function sellar_actualizado();
drop trigger if exists solicitudes_sellar on solicitudes;
create trigger solicitudes_sellar before update on solicitudes
  for each row execute function sellar_actualizado();
drop trigger if exists nominas_sellar on nominas;
create trigger nominas_sellar before update on nominas
  for each row execute function sellar_actualizado();
drop trigger if exists liquidacion_sellar on liquidacion;
create trigger liquidacion_sellar before update on liquidacion
  for each row execute function sellar_actualizado();
drop trigger if exists solicitudes_canceladas_sellar on solicitudes_canceladas;
create trigger solicitudes_canceladas_sellar before update on solicitudes_canceladas
  for each row execute function sellar_actualizado();
drop trigger if exists bitacora_sellar on bitacora;
create trigger bitacora_sellar before update on bitacora
  for each row execute function sellar_actualizado();
drop trigger if exists pago_x_km_sellar on pago_x_km;
create trigger pago_x_km_sellar before update on pago_x_km
  for each row execute function sellar_actualizado();


-- ---------------------------------------------------------------------------
-- Bitácora a nivel de base de datos
-- La hoja BITACORA registra lo que la app reporta; esto registra lo que de
-- verdad pasó, lo reporte quien lo reporte. Es la diferencia entre
-- trazabilidad operativa y auditoría.
-- ---------------------------------------------------------------------------
create table if not exists auditoria (
  id          bigserial primary key,
  momento     timestamptz not null default now(),
  usuario_id  uuid,
  tabla       text not null,
  registro_id text,
  operacion   text not null,
  antes       jsonb,
  despues     jsonb
);
create index if not exists auditoria_tabla_idx   on auditoria (tabla, momento desc);
create index if not exists auditoria_usuario_idx on auditoria (usuario_id, momento desc);

create or replace function auditar()
returns trigger language plpgsql security definer as $$
begin
  insert into auditoria (usuario_id, tabla, registro_id, operacion, antes, despues)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(new."ID", old."ID"),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

drop trigger if exists servicios_auditar on servicios;
create trigger servicios_auditar after insert or update or delete on servicios
  for each row execute function auditar();
drop trigger if exists solicitudes_auditar on solicitudes;
create trigger solicitudes_auditar after insert or update or delete on solicitudes
  for each row execute function auditar();
drop trigger if exists liquidacion_auditar on liquidacion;
create trigger liquidacion_auditar after insert or update or delete on liquidacion
  for each row execute function auditar();
drop trigger if exists nominas_auditar on nominas;
create trigger nominas_auditar after insert or update or delete on nominas
  for each row execute function auditar();
drop trigger if exists gastos_extra_auditar on gastos_extra;
create trigger gastos_extra_auditar after insert or update or delete on gastos_extra
  for each row execute function auditar();
drop trigger if exists cxc_auditar on cxc;
create trigger cxc_auditar after insert or update or delete on cxc
  for each row execute function auditar();
drop trigger if exists facturas_auditar on facturas;
create trigger facturas_auditar after insert or update or delete on facturas
  for each row execute function auditar();
drop trigger if exists pagos_auditar on pagos;
create trigger pagos_auditar after insert or update or delete on pagos
  for each row execute function auditar();
drop trigger if exists ordenes_compra_auditar on ordenes_compra;
create trigger ordenes_compra_auditar after insert or update or delete on ordenes_compra
  for each row execute function auditar();
drop trigger if exists liberaciones_auditar on liberaciones;
create trigger liberaciones_auditar after insert or update or delete on liberaciones
  for each row execute function auditar();
drop trigger if exists cartas_porte_auditar on cartas_porte;
create trigger cartas_porte_auditar after insert or update or delete on cartas_porte
  for each row execute function auditar();
drop trigger if exists tarifas_auditar on tarifas;
create trigger tarifas_auditar after insert or update or delete on tarifas
  for each row execute function auditar();
drop trigger if exists usuarios_auditar on usuarios;
create trigger usuarios_auditar after insert or update or delete on usuarios
  for each row execute function auditar();
drop trigger if exists clientes_auditar on clientes;
create trigger clientes_auditar after insert or update or delete on clientes
  for each row execute function auditar();
drop trigger if exists proveedores_auditar on proveedores;
create trigger proveedores_auditar after insert or update or delete on proveedores
  for each row execute function auditar();
drop trigger if exists operadores_auditar on operadores;
create trigger operadores_auditar after insert or update or delete on operadores
  for each row execute function auditar();
drop trigger if exists unidades_auditar on unidades;
create trigger unidades_auditar after insert or update or delete on unidades
  for each row execute function auditar();
