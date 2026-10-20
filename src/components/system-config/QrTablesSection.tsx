'use client';

import { DEFAULT_RESTAURANT_IDENTITY } from '@/config/restaurant';

import { useEffect, useState } from 'react';
import type { SystemConfigState } from '@/types';
import { useDialog } from '@/hooks/useDialog';
import { fetchTableQrTokens, rotateTableQrTokens } from '@/services/tableService';
import { qrDataUrl, tableMenuUrl, tableNumberFromLabel } from '@/utils/tableQr';
import { TableQrImage } from '../TableQrImage';
import { UploadedImage } from '../UploadedImage';
import type { TranslationDictionary } from '@/i18n/adminTranslations';
import type { ConfigStyles } from './configStyles';

interface QrTablesSectionProps {
  styles: ConfigStyles;
  t: TranslationDictionary;
  /** Datos del local (nombre, logo) que van impresos en los atriles. */
  formData: SystemConfigState;
  onShowToast: (msg: string, icon?: string) => void;
}

/**
 * Sección 06 de Configuración: QR firmados de cada mesa (Tarea 9), su rotación,
 * impresión de atriles y del lote completo para cortar.
 */
export function QrTablesSection({ styles, t, formData, onShowToast }: QrTablesSectionProps) {
  const { isLight, sectionBg, sectionHeaderBorder, titleColor, descColor, labelColor, cardBg, selectBg } = styles;

  const [selectedTableNumber, setSelectedTableNumber] = useState('01');
  const [selectedZone, setSelectedZone] = useState('Salón Principal');
  const [customTableName, setCustomTableName] = useState('');
  const [showAllQRsModal, setShowAllQRsModal] = useState(false);
  const [qrColor, setQrColor] = useState<'black' | 'brand'>('brand');
  // Códigos secretos de los QR de mesa (Tarea 9): sin ellos el servidor no
  // acepta pedidos del comensal. Solo el admin puede obtenerlos.
  const [qrTokens, setQrTokens] = useState<Record<number, string>>({});
  const [qrTokensError, setQrTokensError] = useState('');
  const [isRotatingQr, setIsRotatingQr] = useState(false);
  const [includeLogoInQR, setIncludeLogoInQR] = useState(true);
  const [totalTablesCount, setTotalTablesCount] = useState<number>(24);
  const [tableSearchFilter, setTableSearchFilter] = useState('');
  const [modalZoneFilter, setModalZoneFilter] = useState<string>('all');
  const qrTokenCount = Math.min(300, Math.max(totalTablesCount, 60));
  useEffect(() => {
    let cancelled = false;
    fetchTableQrTokens(qrTokenCount)
      .then((tokens) => {
        if (cancelled) return;
        setQrTokens(tokens);
        setQrTokensError('');
      })
      .catch((err) => {
        console.warn('[qr] No se obtuvieron los códigos de mesa:', err);
        if (!cancelled) setQrTokensError('No se pudieron cargar los códigos de mesa: los QR no servirán para pedir hasta que vuelvas a iniciar sesión como administrador.');
      });
    return () => {
      cancelled = true;
    };
  }, [qrTokenCount]);

  /** URL firmada de la mesa (lleva su código secreto). */
  const signedTableUrl = (tableLabel: string, zone?: string) =>
    tableMenuUrl(
      typeof window !== 'undefined' ? window.location.origin : '',
      tableLabel,
      qrTokens[tableNumberFromLabel(tableLabel) ?? -1],
      zone
    );

  const handleRotateQrTokens = async () => {
    if (!window.confirm('Se generarán códigos nuevos para TODAS las mesas y los QR impresos dejarán de funcionar. ¿Continuar?')) return;
    setIsRotatingQr(true);
    try {
      const count = await rotateTableQrTokens();
      setQrTokens(await fetchTableQrTokens(qrTokenCount));
      onShowToast(`Códigos regenerados (${count} mesas). Imprime los QR nuevos.`, 'qr_code_2');
    } catch {
      onShowToast('No se pudieron regenerar los códigos QR', 'error');
    } finally {
      setIsRotatingQr(false);
    }
  };
  const printIsolatedDocument = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      const printWin = window.open('', '_blank', 'width=700,height=900');
      if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 500);
      }
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    const doPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        onShowToast(formData.language.includes('English') ? 'Sent to print dialog' : 'Enviado al diálogo de impresión', 'print');
      } catch (err) {
        console.error('Error al imprimir:', err);
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    };

    const images = doc.images;
    let count = 0;
    const total = images.length;

    if (total === 0) {
      setTimeout(doPrint, 350);
    } else {
      let fired = false;
      const onImgReady = () => {
        count++;
        if (count >= total && !fired) {
          fired = true;
          setTimeout(doPrint, 350);
        }
      };

      for (let i = 0; i < total; i++) {
        if (images[i].complete) {
          onImgReady();
        } else {
          images[i].onload = onImgReady;
          images[i].onerror = onImgReady;
        }
      }

      setTimeout(() => {
        if (!fired) {
          fired = true;
          doPrint();
        }
      }, 5000);
    }
  };

  // Función para imprimir únicamente el atril / standee físico de mesa en 1 sola hoja limpia
  const handlePrintStandee = async () => {
    const tableName = customTableName.trim() || ('MESA ' + selectedTableNumber);
    const targetMenuUrl = signedTableUrl(tableName, selectedZone);
    const qrCodeUrl = await qrDataUrl(targetMenuUrl, 500, qrColor);
    const branchName = formData.branchName || DEFAULT_RESTAURANT_IDENTITY.branchName;
    const logoUrl = formData.logoUrl || '/logo.png';
    const instructions = t.scan_to_order || 'Escanea con la cámara de tu celular para ver la carta y hacer tu pedido';
    const nfcLabel = t.nfc_active || 'NTAG213 NFC Chip Linked';

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Atril de Mesa - ${tableName} - ${branchName}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 98vh;
    }
    .print-instructions {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-family: monospace;
    }
    .standee-card {
      width: 310px;
      border: 2px dashed #94a3b8;
      border-radius: 24px;
      padding: 24px 20px 20px;
      background: #0a0a0c;
      color: #ffffff;
      text-align: center;
      position: relative;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      page-break-inside: avoid;
    }
    .logo-container {
      width: 48px;
      height: 48px;
      margin: 0 auto 8px;
      border-radius: 12px;
      overflow: hidden;
      border: 1.5px solid #27272a;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .logo-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .branch-title {
      font-size: 14px;
      font-weight: 800;
      margin: 0 0 3px;
      color: #ffffff;
      letter-spacing: -0.2px;
    }
    .subtitle {
      font-size: 9px;
      font-weight: 800;
      font-family: monospace;
      color: #ff5a1f;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
      display: block;
    }
    .divider {
      border: none;
      border-top: 1px dashed rgba(255,255,255,0.2);
      margin: 10px 0 14px;
    }
    .table-pill {
      display: inline-block;
      padding: 6px 20px;
      border-radius: 9999px;
      background: #ff5a1f;
      color: #ffffff;
      font-weight: 800;
      font-size: 15px;
      font-family: monospace;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 12px rgba(255, 90, 31, 0.4);
    }
    .zone-label {
      font-size: 11px;
      color: #94a3b8;
      margin: 5px 0 12px;
      font-weight: 500;
    }
    .qr-frame {
      background: #ffffff;
      border-radius: 16px;
      padding: 10px;
      display: inline-flex;
      position: relative;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
      margin: 0 auto;
    }
    .qr-frame img.qr-img {
      width: 190px;
      height: 190px;
      display: block;
      border-radius: 4px;
    }
    .qr-center-logo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #ffffff;
      padding: 2.5px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-center-logo img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
    .order-note {
      font-size: 10.5px;
      color: #a1a1aa;
      line-height: 1.4;
      max-width: 230px;
      margin: 12px auto 8px;
    }
    .nfc-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 9999px;
      background: #18181b;
      border: 1px solid #27272a;
      color: #34d399;
      font-size: 9px;
      font-family: monospace;
      font-weight: 700;
    }
    .nfc-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #34d399;
    }
    .crop-mark {
      position: absolute;
      width: 10px;
      height: 10px;
      border-color: #64748b;
      border-style: solid;
    }
    .c-tl { top: -2px; left: -2px; border-width: 2px 0 0 2px; }
    .c-tr { top: -2px; right: -2px; border-width: 2px 2px 0 0; }
    .c-bl { bottom: -2px; left: -2px; border-width: 0 0 2px 2px; }
    .c-br { bottom: -2px; right: -2px; border-width: 0 2px 2px 0; }
  </style>
</head>
<body>
  <div class="print-instructions">✂ Guía de corte para atril / portavasos acrílico (A6)</div>
  <div class="standee-card">
    <div class="crop-mark c-tl"></div>
    <div class="crop-mark c-tr"></div>
    <div class="crop-mark c-bl"></div>
    <div class="crop-mark c-br"></div>
    
    <div class="logo-container">
      <img src="${logoUrl}" alt="Logo" onerror="this.src='/logo.png'" />
    </div>
    <div class="branch-title">${branchName}</div>
    <span class="subtitle">CARTA DIGITAL • AUTO-PEDIDO</span>
    
    <div class="divider"></div>
    
    <div class="table-pill">${tableName}</div>
    <div class="zone-label">${selectedZone}</div>
    
    <div class="qr-frame">
      <img class="qr-img" src="${qrCodeUrl}" alt="QR Mesa" />
      ${includeLogoInQR ? `<div class="qr-center-logo"><img src="${logoUrl}" alt="Logo" onerror="this.src='/logo.png'" /></div>` : ''}
    </div>
    
    <div class="order-note">${instructions}</div>
    
    <div class="nfc-indicator">
      <span class="nfc-dot"></span>
      <span>${nfcLabel}</span>
    </div>
  </div>
</body>
</html>`;

    printIsolatedDocument(htmlContent);
  };

  // Función para imprimir lote de mesas en cuadrícula A4 optimizada para corte
  const handlePrintAllTables = async (customList?: string[], customTitle?: string) => {
    const branchName = formData.branchName || DEFAULT_RESTAURANT_IDENTITY.branchName;
    const logoUrl = formData.logoUrl || '/logo.png';
    
    let filteredForPrint: string[] = [];
    if (customList && customList.length > 0) {
      filteredForPrint = customList;
    } else {
      // Si no se especifica lista personalizada, tomar las mesas de salón según capacidad configurada
      const salonTables: string[] = [];
      for (let i = 1; i <= totalTablesCount; i++) {
        salonTables.push(`Mesa ${String(i).padStart(2, '0')}`);
      }
      
      if (showAllQRsModal) {
        if (modalZoneFilter === 'salon') filteredForPrint = salonTables;
        else if (modalZoneFilter === 'all') filteredForPrint = allTablesList;
        else filteredForPrint = allTablesList.filter(t => {
          if (modalZoneFilter === 'terraza') return t.includes('Terraza');
          if (modalZoneFilter === 'barra') return t.includes('Barra');
          if (modalZoneFilter === 'vip') return t.includes('VIP');
          return true;
        });
      } else {
        filteredForPrint = salonTables;
      }
    }

    onShowToast(`Preparando impresión de lote (${filteredForPrint.length} mesas)...`, 'print');

    const cardsHtml = (await Promise.all(filteredForPrint.map(async (tbl) => {
      const qrUrl = await qrDataUrl(signedTableUrl(tbl), 350, qrColor);
      return `
        <div class="batch-card">
          <div class="batch-header">
            <span class="batch-branch">${branchName}</span>
            <span class="batch-tag">CARTA DIGITAL • AUTO-PEDIDO</span>
          </div>
          <div class="batch-table-pill">${tbl}</div>
          <div class="batch-qr">
            <img src="${qrUrl}" alt="${tbl}" />
            ${includeLogoInQR && logoUrl ? `
              <div class="batch-logo-overlay">
                <img src="${logoUrl}" alt="Logo" />
              </div>
            ` : ''}
          </div>
          <div class="batch-nfc">● NTAG213 NFC LINKED</div>
        </div>
      `;
    }))).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${customTitle || `Lote de QRs de Mesas - ${branchName} (${filteredForPrint.length} Mesas)`}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fff;
    }
    .page-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 10px;
    }
    .batch-card {
      border: 1.5px dashed #cbd5e1;
      border-radius: 14px;
      padding: 12px 8px;
      background: #0a0a0c;
      color: #fff;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      min-height: 220px;
    }
    .batch-branch {
      font-size: 10.5px;
      font-weight: 700;
      display: block;
      color: #fff;
    }
    .batch-tag {
      font-size: 8px;
      font-family: monospace;
      color: #ff5a1f;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .batch-table-pill {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 9999px;
      background: #ff5a1f;
      color: #fff;
      font-weight: 800;
      font-size: 13px;
      font-family: monospace;
      margin: 5px 0;
    }
    .batch-qr {
      background: #fff;
      border-radius: 10px;
      padding: 6px;
      display: inline-block;
      margin: 2px 0;
      position: relative;
    }
    .batch-qr > img {
      width: 110px;
      height: 110px;
      display: block;
    }
    .batch-logo-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 26px;
      height: 26px;
      background: #fff;
      border-radius: 50%;
      padding: 2px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .batch-logo-overlay img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
      display: block;
    }
    .batch-nfc {
      font-size: 8px;
      font-family: monospace;
      color: #34d399;
      font-weight: 700;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="page-title">
    <span>${branchName} — ${customTitle || `Lote de Códigos QR para Mesas (${filteredForPrint.length} Mesas)`}</span>
    <span style="font-family: monospace; font-size: 10px; color: #64748b;">✂ Líneas de corte para atril acrílico</span>
  </div>
  <div class="grid">
    ${cardsHtml}
  </div>
</body>
</html>`;

    printIsolatedDocument(htmlContent);
  };
  // Lista dinámica de todas las mesas del restaurante basada en la capacidad total configurada
  // Cálculo trivial (unas 30 etiquetas): sin useMemo.
  const allTablesList = [
    ...Array.from({ length: totalTablesCount }, (_, i) => `Mesa ${String(i + 1).padStart(2, '0')}`),
    'Terraza T1', 'Terraza T2', 'Terraza T3', 'Barra B1', 'Barra B2', 'Salón VIP'
  ];

  const filteredModalTables = (() => {
    if (modalZoneFilter === 'salon') return allTablesList.filter(t => t.startsWith('Mesa'));
    if (modalZoneFilter === 'terraza') return allTablesList.filter(t => t.includes('Terraza'));
    if (modalZoneFilter === 'barra') return allTablesList.filter(t => t.includes('Barra'));
    if (modalZoneFilter === 'vip') return allTablesList.filter(t => t.includes('VIP'));
    return allTablesList;
  })();

  const qrGridDialog = useDialog(showAllQRsModal, () => setShowAllQRsModal(false));

  return (
    <>
      {/* SEC_06: CÓDIGOS QR PARA MESAS & NFC */}
      <section id="qr-mesas" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
        <div className={`flex justify-between items-start p-4 sm:p-6 border-b ${sectionHeaderBorder}`}>
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-[#FF5A1F] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <div>
              <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>{t.qr_section_title}</h2>
              <p className={`text-[13px] ${descColor}`}>{t.qr_section_desc}</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-8">
          {/* Columna Izquierda: Parámetros y Generador */}
          <div className="flex-1 min-w-0 space-y-6">
            
            {/* Capacidad y Selector Dinámico de Mesas del Restaurante (10, 20, 50 mesas) */}
            <div className={`p-4 rounded-xl border flex flex-col gap-3.5 ${cardBg}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-300/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#FF5A1F] text-[18px]">table_restaurant</span>
                    <h4 className={`text-[12px] font-bold uppercase tracking-wider ${titleColor}`}>
                      Capacidad de Mesas del Restaurante
                    </h4>
                  </div>
                  <p className={`text-[11px] ${descColor}`}>
                    Ajusta cuántas mesas tiene tu local para generar y numerar todos los códigos QR.
                  </p>
                </div>
                
                {/* Botones de Presets y selector numérico */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[10, 20, 30, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setTotalTablesCount(num);
                        onShowToast(`Capacidad configurada a ${num} mesas`, 'table_restaurant');
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                        totalTablesCount === num
                          ? 'bg-[#FF5A1F] text-white border-[#FF5A1F] shadow-sm'
                          : isLight
                          ? 'bg-white border-[#cbd5e1] text-[#334155] hover:bg-[#f1f5f9]'
                          : 'bg-[#1C1C1C] border-[#333] text-gray-300 hover:border-[#555]'
                      }`}
                    >
                      {num} Mesas
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-1 bg-black/10 px-2 py-0.5 rounded border border-gray-400/20">
                    <span className={`text-[10px] uppercase font-bold ${labelColor}`}>Total:</span>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={totalTablesCount}
                      onChange={(e) => setTotalTablesCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                      className={`w-14 text-center py-0.5 text-[11px] font-mono font-bold rounded border focus:border-[#FF5A1F] focus:outline-none ${
                        isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#141414] border-[#333] text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Selector interactivo de mesas */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>
                    {t.select_table} ({allTablesList.length} Mesas en Total)
                  </label>
                  <input
                    type="text"
                    placeholder="Filtrar mesa (ej: 05, T1, VIP)..."
                    value={tableSearchFilter}
                    onChange={(e) => setTableSearchFilter(e.target.value)}
                    className={`text-[11px] px-2.5 py-1 rounded border focus:border-[#FF5A1F] focus:outline-none w-full sm:w-48 ${
                      isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#141414] border-[#333] text-gray-200'
                    }`}
                  />
                </div>

                {/* Chips de mesas */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border rounded-lg border-gray-300/30">
                  {allTablesList
                    .filter(tbl => !tableSearchFilter || tbl.toLowerCase().includes(tableSearchFilter.toLowerCase()))
                    .map((tbl) => {
                      const currentActive = (customTableName.trim() || ('MESA ' + selectedTableNumber)).toUpperCase();
                      const isActive = currentActive === tbl.toUpperCase() || currentActive === ('MESA ' + tbl).toUpperCase();
                      return (
                        <button
                          key={tbl}
                          type="button"
                          onClick={() => {
                            if (tbl.startsWith('Mesa ')) {
                              const num = tbl.replace('Mesa ', '');
                              setSelectedTableNumber(num);
                              setCustomTableName('');
                            } else {
                              setCustomTableName(tbl);
                            }
                            onShowToast(`Mesa seleccionada: ${tbl}`, 'qr_code_2');
                          }}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#FF5A1F] border-[#FF5A1F] text-white shadow-md shadow-[#FF5A1F]/30 scale-105'
                              : isLight
                              ? 'bg-white border-[#cbd5e1] text-[#334155] hover:bg-[#f1f5f9]'
                              : 'bg-[#18181b] border-[#2A2A2A] text-gray-300 hover:border-[#444]'
                          }`}
                        >
                          {tbl}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Input personalizado de mesa y zona */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>
                  Nombre o Identificador Personalizado
                </label>
                <input
                  type="text"
                  placeholder="Ej: Mesa VIP 02, Terraza 05"
                  value={customTableName}
                  onChange={(e) => setCustomTableName(e.target.value)}
                  className={`w-full rounded p-2.5 text-[13px] focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>
                  {t.table_zone}
                </label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className={`w-full rounded p-2.5 text-[13px] focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`}
                >
                  <option value="Salón Principal">Salón Principal</option>
                  <option value="Terraza Exterior">Terraza Exterior</option>
                  <option value="Rooftop Lounge">Rooftop Lounge</option>
                  <option value="Barra Central">Barra Central</option>
                  <option value="Salón Privé VIP">Salón Privé VIP</option>
                </select>
              </div>
            </div>

            {/* URL del comensal vinculada */}
            <div className="flex flex-col gap-1.5">
              <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>
                {t.table_url}
              </label>
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  readOnly
                  value={signedTableUrl(customTableName.trim() || ('MESA ' + selectedTableNumber), selectedZone)}
                  className={`flex-1 min-w-0 w-full sm:w-auto rounded p-2.5 text-[12px] font-mono tracking-tight cursor-default ${
                    isLight ? 'bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155]' : 'bg-[#141414] border border-[#2A2A2A] text-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = signedTableUrl(customTableName.trim() || ('MESA ' + selectedTableNumber), selectedZone);
                    navigator.clipboard.writeText(url);
                    onShowToast('Enlace de la mesa copiado al portapapeles', 'content_copy');
                  }}
                  className="flex-1 sm:flex-none justify-center px-3.5 py-2 rounded border bg-[#FF5A1F] text-white hover:bg-[#FF703D] font-bold text-[12px] flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span className="sm:hidden lg:inline">{t.copy_link}</span>
                  <span className="hidden sm:inline lg:hidden">{t.copy_link}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = signedTableUrl(customTableName.trim() || ('MESA ' + selectedTableNumber), selectedZone);
                    window.open(url, '_blank');
                  }}
                  className={`flex-1 sm:flex-none justify-center px-3 py-2 rounded border text-[12px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 transition-colors ${
                    isLight ? 'bg-white border-[#cbd5e1] text-[#334155] hover:bg-[#f8fafc]' : 'bg-[#252525] border-[#333] text-gray-200 hover:bg-[#2e2e2e]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>{t.open_menu}</span>
                </button>
              </div>
            </div>

            {/* Personalización y Opciones de Impresión */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${cardBg}`}>
              <div className="flex flex-col gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${labelColor}`}>Opciones del QR</span>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qrColor === 'brand'}
                      onChange={(e) => setQrColor(e.target.checked ? 'brand' : 'black')}
                      className="w-4 h-4 accent-[#FF5A1F]"
                    />
                    <span>Color AURA Naranja</span>
                  </label>
                  <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeLogoInQR}
                      onChange={(e) => setIncludeLogoInQR(e.target.checked)}
                      className="w-4 h-4 accent-[#FF5A1F]"
                    />
                    <span>Logotipo central</span>
                  </label>
                </div>
                <p className={`text-[11px] leading-snug max-w-[360px] ${descColor}`}>
                  Cada QR lleva un código secreto de su mesa: sin él no se puede pedir desde fuera del local.
                </p>
                {qrTokensError && <p className="text-[11px] text-red-400 max-w-[360px]" role="alert">{qrTokensError}</p>}
                <button
                  type="button"
                  onClick={handleRotateQrTokens}
                  disabled={isRotatingQr}
                  className="self-start text-[11px] font-semibold text-[#FF5A1F] hover:underline disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  title="Usar si un QR impreso fue fotografiado o robado"
                >
                  <span className="material-symbols-outlined text-[14px]">autorenew</span>
                  {isRotatingQr ? 'Regenerando…' : 'Invalidar QR impresos y generar nuevos'}
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowAllQRsModal(true)}
                  className="flex-1 sm:flex-initial px-3.5 py-2 border rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 bg-[#FF5A1F]/10 border-[#FF5A1F]/40 text-[#FF5A1F] hover:bg-[#FF5A1F]/20 cursor-pointer transition-colors"
                  title="Ver cuadrícula interactiva de todas las mesas"
                >
                  <span className="material-symbols-outlined text-[17px]">grid_view</span>
                  <span>{t.all_tables_grid}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const salonTables = [];
                    for (let i = 1; i <= totalTablesCount; i++) {
                      salonTables.push(`Mesa ${String(i).padStart(2, '0')}`);
                    }
                    handlePrintAllTables(salonTables, `Lote de ${totalTablesCount} Mesas de Salón`);
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 bg-[#FF5A1F] text-white hover:bg-[#FF703D] cursor-pointer shadow-md shadow-[#FF5A1F]/20 transition-all"
                  title={`Imprimir las ${totalTablesCount} mesas configuradas en hoja de corte`}
                >
                  <span className="material-symbols-outlined text-[17px]">print</span>
                  <span>Imprimir Lote ({totalTablesCount})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Caballete Físico de Mesa (Standee) Preview */}
          <div className={`w-full lg:w-[320px] shrink-0 border p-5 rounded-2xl flex flex-col items-center justify-between shadow-2xl relative overflow-hidden ${
            isLight ? 'bg-[#ffffff] border-[#cbd5e1]' : 'bg-[#0A0A0C] border-[#2A2A2A]'
          }`}>
            <div className="w-full text-center pb-3 border-b border-dashed border-gray-400/40">
              <div className="w-10 h-10 mx-auto rounded-lg overflow-hidden border border-gray-300 shadow-sm mb-1.5 flex items-center justify-center bg-black">
                <UploadedImage src={formData.logoUrl || '/logo.png'} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <h4 className={`text-[13px] font-extrabold tracking-tight ${titleColor}`}>{formData.branchName || DEFAULT_RESTAURANT_IDENTITY.branchName}</h4>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF5A1F] font-bold">CARTA DIGITAL • AUTO-PEDIDO</span>
            </div>

            {/* Mesa Badge */}
            <div className="my-3 text-center">
              <div className="inline-block px-4 py-1 rounded-full bg-[#FF5A1F] text-white font-extrabold text-[14px] shadow-md shadow-[#FF5A1F]/30 tracking-wide font-mono">
                {customTableName.trim() || ('MESA ' + selectedTableNumber)}
              </div>
              <p className={`text-[10.5px] mt-1 font-medium ${descColor}`}>{selectedZone}</p>
            </div>

            {/* Tarjeta de Código QR */}
            <div className="p-3 bg-white rounded-xl shadow-md border border-gray-200 relative group flex items-center justify-center">
              <TableQrImage
                value={signedTableUrl(customTableName.trim() || ('MESA ' + selectedTableNumber), selectedZone)}
                size={220}
                color={qrColor}
                alt="Código QR de la Mesa"
                className="w-[180px] h-[180px] object-contain rounded"
              />
              {includeLogoInQR && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-white p-1 shadow-lg border border-gray-200 flex items-center justify-center">
                    <UploadedImage src={formData.logoUrl || '/logo.png'} alt="Mini Logo" className="w-full h-full object-cover rounded-full" />
                  </div>
                </div>
              )}
            </div>

            <p className={`text-center text-[10px] max-w-[220px] mt-3 leading-snug ${descColor}`}>
              {t.scan_to_order}
            </p>

            {/* NFC Badge Indicator */}
            <div className={`mt-2 px-3 py-1 rounded-full border text-[9px] font-mono font-bold flex items-center gap-1.5 ${
              isLight ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#334155]' : 'bg-[#18181b] border-[#3f3f46] text-emerald-400'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{t.nfc_active}</span>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col gap-2 w-full mt-4 pt-3 border-t border-gray-300/30">
              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const tableName = customTableName.trim() || ('MESA ' + selectedTableNumber);
                      const a = document.createElement('a');
                      a.href = await qrDataUrl(signedTableUrl(tableName, selectedZone), 1000, qrColor);
                      a.download = `QR-${tableName.replace(/\s+/g, '_')}.png`;
                      a.click();
                      onShowToast('Imagen QR descargada en alta resolución', 'download');
                    } catch {
                      onShowToast('No se pudo generar la imagen del QR', 'error');
                    }
                  }}
                  className={`py-2 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a] hover:bg-[#f1f5f9]' : 'bg-[#1C1C1C] border-[#333] text-gray-200 hover:bg-[#252525]'
                  }`}
                  title="Descargar imagen QR en alta resolución"
                >
                  <span className="material-symbols-outlined text-[15px]">download</span>
                  <span>Descargar QR</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintStandee}
                  className={`py-2 px-2 rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a] hover:bg-[#f1f5f9]' : 'bg-[#1C1C1C] border-[#333] text-gray-200 hover:bg-[#252525]'
                  }`}
                  title="Imprimir solo el atril individual de esta mesa (1 hoja)"
                >
                  <span className="material-symbols-outlined text-[15px]">print</span>
                  <span>Mesa Actual</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const salonTables = [];
                  for (let i = 1; i <= totalTablesCount; i++) {
                    salonTables.push(`Mesa ${String(i).padStart(2, '0')}`);
                  }
                  handlePrintAllTables(salonTables, `Lote de ${totalTablesCount} Mesas de Salón`);
                }}
                className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-[#FF5A1F] to-[#FF7A3D] text-white hover:opacity-95 font-bold text-[12px] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#FF5A1F]/25 transition-all active:scale-[0.98]"
                title={`Imprimir todas las ${totalTablesCount} mesas configuradas en hojas A4 con guías de corte`}
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                <span>Imprimir Lote ({totalTablesCount} Mesas)</span>
              </button>
            </div>
          </div>
        </div>
      </section>
  {/* Modal de Cuadrícula de Todas las Mesas */}
  {showAllQRsModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div {...qrGridDialog} aria-label="QR de todas las mesas" className={`border rounded-2xl shadow-2xl max-w-4xl w-full p-4 sm:p-6 space-y-5 max-h-[90vh] flex flex-col ${
        isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-[#e5e1e4]'
      }`}>
        <div className={`flex items-center justify-between flex-wrap gap-2 pb-3 border-b shrink-0 ${isLight ? 'border-[#e2e8f0]' : 'border-[#27272a]'}`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FF5A1F] text-[22px]">grid_view</span>
            <h3 className={`font-bold text-[16px] ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              Lote de Códigos QR para Todas las Mesas
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                handlePrintAllTables(filteredModalTables, `Lote de ${filteredModalTables.length} Mesas (${modalZoneFilter.toUpperCase()})`);
              }}
              className="px-3.5 py-1.5 bg-[#FF5A1F] text-white font-bold text-[12px] rounded-lg hover:bg-[#FF703D] flex items-center gap-1.5 cursor-pointer shadow-md"
              title="Imprimir las mesas visibles con guías de corte"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Imprimir {filteredModalTables.length} Mesas</span>
            </button>
            <button
              type="button"
              onClick={() => setShowAllQRsModal(false)}
              className={`p-1 rounded-lg ${isLight ? 'text-[#64748b] hover:bg-[#f1f5f9]' : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'}`}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Filtro por Zona en el Modal de Lote */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-gray-500/20 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: `Todas (${allTablesList.length})` },
              { id: 'salon', label: `Salón (${totalTablesCount})` },
              { id: 'terraza', label: 'Terraza (3)' },
              { id: 'barra', label: 'Barra (2)' },
              { id: 'vip', label: 'Salón VIP (1)' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setModalZoneFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  modalZoneFilter === f.id
                    ? 'bg-[#FF5A1F] text-white border-[#FF5A1F]'
                    : isLight
                    ? 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-[#f1f5f9]'
                    : 'bg-[#18181b] border-[#333] text-gray-300 hover:border-[#555]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className={`text-[11px] font-mono ${descColor}`}>
            Mostrando {filteredModalTables.length} mesas
          </span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredModalTables.map((tableLabel) => {
            return (
              <div
                key={tableLabel}
                className={`p-3.5 rounded-xl border flex flex-col items-center text-center justify-between shadow-sm ${
                  isLight ? 'bg-[#f8fafc] border-[#cbd5e1]' : 'bg-[#121215] border-[#2A2A2A]'
                }`}
              >
                <div className="w-full text-[10px] font-mono text-[#FF5A1F] font-bold uppercase tracking-wider mb-1">
                  {formData.branchName || DEFAULT_RESTAURANT_IDENTITY.branchName}
                </div>
                <div className={`text-[13px] font-bold mb-2 ${titleColor}`}>{tableLabel}</div>
                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                  <TableQrImage value={signedTableUrl(tableLabel)} size={200} color={qrColor} alt={tableLabel} className="w-24 h-24 object-contain" />
                </div>
                <span className="text-[9px] text-emerald-400 mt-2 font-mono">(( · )) NFC LINKED</span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  )}
    </>
  );
}
