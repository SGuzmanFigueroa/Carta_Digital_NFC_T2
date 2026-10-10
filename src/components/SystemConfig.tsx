'use client';

import React, { useState, useEffect } from 'react';
import { SystemConfigState } from '../types';
import { applyTheme, ACCENT_PALETTE } from '@/utils/theme';
import { getTranslations, getLanguageCode } from '@/utils/i18n';
import { kitchenAudio } from '@/utils/audio';
import { MenuItem } from '../types';
import { fetchDishesFromDb, updateDishPrice, deleteDishFromDb } from '@/services/menuService';
import { Dish3DScannerModal } from './Dish3DScannerModal';
import { getPaymentConfig, savePaymentConfig, PaymentGatewayConfig } from '@/services/paymentConfigService';
import { DishCatalogAdmin } from './DishCatalogAdmin';
// CD-17 · Sección 09: Gestión de Ofertas Flash (formulario + vista previa móvil).
import { PromoOffersManager } from './PromoOffersManager';
import { GeofenceSettings } from './GeofenceSettings';
import {ComplaintBookSettings} from './ComplaintBookSettings';

interface SystemConfigProps {
  config: SystemConfigState;
  onSaveConfig: (updated: SystemConfigState) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export const SystemConfig: React.FC<SystemConfigProps> = ({
  config,
  onSaveConfig,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<SystemConfigState>({ ...config });
  const [testPrintActive, setTestPrintActive] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [customLogoInput, setCustomLogoInput] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [activeSection, setActiveSection] = useState<'perfil' | 'notificaciones' | 'tema' | 'idioma' | 'impresion' | 'qr-mesas' | 'carta-platos' | 'pagos-digitales' | 'ofertas' | 'seguridad-geocerca' | 'libro-reclamaciones'>('perfil');
  const [selectedTableNumber, setSelectedTableNumber] = useState('01');
  const [selectedZone, setSelectedZone] = useState('Salón Principal');
  const [customTableName, setCustomTableName] = useState('');
  const [showAllQRsModal, setShowAllQRsModal] = useState(false);
  const [qrColor, setQrColor] = useState<'black' | 'brand'>('brand');
  const [includeLogoInQR, setIncludeLogoInQR] = useState(true);
  const [totalTablesCount, setTotalTablesCount] = useState<number>(24);
  const [tableSearchFilter, setTableSearchFilter] = useState('');
  const [modalZoneFilter, setModalZoneFilter] = useState<string>('all');
  const [paymentGatewayConfig, setPaymentGatewayConfig] = useState<PaymentGatewayConfig>(() => getPaymentConfig());

  const handleUploadPaymentQr = (method: 'yape' | 'plin', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPaymentGatewayConfig((prev) => {
        const next = { ...prev, [method === 'yape' ? 'yapeQrImage' : 'plinQrImage']: dataUrl };
        savePaymentConfig(next);
        return next;
      });
      onShowToast(`Código QR de ${method.toUpperCase()} cargado y sincronizado en vivo`, 'check_circle');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePaymentQr = (method: 'yape' | 'plin') => {
    setPaymentGatewayConfig((prev) => {
      const next = { ...prev, [method === 'yape' ? 'yapeQrImage' : 'plinQrImage']: null };
      savePaymentConfig(next);
      return next;
    });
    onShowToast(`QR personalizado de ${method.toUpperCase()} eliminado. Se usará el QR dinámico.`, 'info');
  };

  const handleSavePaymentGateway = () => {
    savePaymentConfig(paymentGatewayConfig);
    onShowToast('Pasarela de pagos QR guardada y sincronizada en tiempo real con la Carta Digital', 'check_circle');
  };
  const [dishes, setDishes] = useState<MenuItem[]>([]);
  const [loadingDishes, setLoadingDishes] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [dishSearchFilter, setDishSearchFilter] = useState('');
  const [editingDishPriceId, setEditingDishPriceId] = useState<string | null>(null);
  const [tempDishPrice, setTempDishPrice] = useState<string>('');
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDishes() {
      try {
        setLoadingDishes(true);
        const data = await fetchDishesFromDb();
        if (isMounted && data && data.length > 0) {
          setDishes(data);
        }
      } catch (err) {
        console.warn('Error cargando platos en SystemConfig:', err);
      } finally {
        if (isMounted) setLoadingDishes(false);
      }
    }
    loadDishes();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveDishPrice = async (dishId: string) => {
    const num = parseFloat(tempDishPrice);
    if (isNaN(num) || num <= 0) {
      onShowToast('Ingresa un precio numérico válido', 'warning');
      return;
    }
    const ok = await updateDishPrice(dishId, num);
    if (ok) {
      setDishes((prev) => prev.map((d) => (d.id === dishId ? { ...d, price: num } : d)));
      setEditingDishPriceId(null);
      onShowToast('Precio actualizado en la carta', 'check_circle');
    } else {
      onShowToast('Error al actualizar precio en base de datos', 'error');
    }
  };

  const handleDeleteDishItem = async (dishId: string, dishName: string) => {
    if (!window.confirm(`¿Eliminar el plato "${dishName}" de la carta del restaurante?`)) {
      return;
    }
    const ok = await deleteDishFromDb(dishId);
    if (ok) {
      setDishes((prev) => prev.filter((d) => d.id !== dishId));
      onShowToast(`Plato "${dishName}" eliminado con éxito`, 'delete');
    } else {
      onShowToast('Error al eliminar plato', 'error');
    }
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('El archivo supera los 5MB permitidos', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setFormData((prev) => ({ ...prev, logoUrl: base64 }));
        onShowToast('Nuevo logo seleccionado con éxito', 'photo_library');
        setShowLogoModal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLogoInput.trim()) return;
    setFormData((prev) => ({ ...prev, logoUrl: customLogoInput.trim() }));
    onShowToast('URL de logo asignada correctamente', 'link');
    setShowLogoModal(false);
    setCustomLogoInput('');
  };

  const handleResetDefaultLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '/logo.png' }));
    onShowToast('Logo restaurado al oficial predeterminado', 'restore');
    setShowLogoModal(false);
  };
  // Función para imprimir de forma aislada sin imprimir el resto del dashboard de configuración
  const printIsolatedDocument = (html: string, docTitle: string) => {
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
  const handlePrintStandee = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const tableName = customTableName.trim() || ('MESA ' + selectedTableNumber);
    const targetMenuUrl = `${origin}/menu?mesa=${encodeURIComponent(tableName)}&zona=${encodeURIComponent(selectedZone)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&color=${qrColor === 'brand' ? 'ff5a1f' : '000000'}&bgcolor=ffffff&data=${encodeURIComponent(targetMenuUrl)}`;
    const branchName = formData.branchName || 'AUREA Bistro';
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

    printIsolatedDocument(htmlContent, `Atril-${tableName}`);
  };

  // Función para imprimir lote de mesas en cuadrícula A4 optimizada para corte
  const handlePrintAllTables = (customList?: string[], customTitle?: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const branchName = formData.branchName || 'AUREA Bistro';
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

    const cardsHtml = filteredForPrint.map((tbl) => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&color=${qrColor === 'brand' ? 'ff5a1f' : '000000'}&bgcolor=ffffff&data=${encodeURIComponent(origin + '/menu?mesa=' + encodeURIComponent(tbl))}`;
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
    }).join('');

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

    printIsolatedDocument(htmlContent, `Lote-QRs-${branchName}`);
  };



  // Lista dinámica de todas las mesas del restaurante basada en la capacidad total configurada
  const allTablesList = React.useMemo(() => {
    const list: string[] = [];
    for (let i = 1; i <= totalTablesCount; i++) {
      list.push(`Mesa ${String(i).padStart(2, '0')}`);
    }
    list.push('Terraza T1', 'Terraza T2', 'Terraza T3', 'Barra B1', 'Barra B2', 'Salón VIP');
    return list;
  }, [totalTablesCount]);

  const filteredModalTables = React.useMemo(() => {
    if (modalZoneFilter === 'salon') return allTablesList.filter(t => t.startsWith('Mesa'));
    if (modalZoneFilter === 'terraza') return allTablesList.filter(t => t.includes('Terraza'));
    if (modalZoneFilter === 'barra') return allTablesList.filter(t => t.includes('Barra'));
    if (modalZoneFilter === 'vip') return allTablesList.filter(t => t.includes('VIP'));
    return allTablesList;
  }, [allTablesList, modalZoneFilter]);

  const t = getTranslations(formData.language);
  const activeLabel = ({
    perfil: t.nav_profile,
    notificaciones: t.nav_notifications,
    tema: t.nav_theme,
    idioma: t.nav_region,
    impresion: t.nav_hardware,
    'qr-mesas': t.nav_qr_tables,
    'carta-platos': 'Carta & Platos 3D',
    'pagos-digitales': 'Pagos QR (Yape / Plin)',
    ofertas: 'Ofertas & Promociones',
  } as Record<string, string>)[activeSection];
  const isLight = formData.themeMode === 'light';
  const isHighContrast = formData.themeMode === 'kds-high-contrast';

  // Dynamic theme styling tokens
  const sectionBg = isLight 
    ? 'bg-white border-[#e2e8f0] shadow-sm' 
    : isHighContrast 
    ? 'bg-black border-2 border-white' 
    : 'bg-[#1A1A1A] border-[#2A2A2A]';

  const sectionHeaderBorder = isLight ? 'border-[#e2e8f0]' : isHighContrast ? 'border-white' : 'border-[#2A2A2A]';
  const iconBoxBg = isLight ? 'bg-[#fff7ed] border-[#fed7aa]' : isHighContrast ? 'bg-black border-2 border-white' : 'bg-[#252525] border-[#333]';
  const titleColor = isLight ? 'text-[#0f172a]' : 'text-white';
  const descColor = isLight ? 'text-[#64748b]' : 'text-gray-400';
  const badgeStyle = isLight ? 'text-[#64748b] bg-[#f1f5f9] border-[#e2e8f0]' : 'text-gray-400 bg-[#252525] border-[#333]';
  const inputBg = isLight 
    ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] focus:border-[#FF5A1F] focus:bg-white' 
    : isHighContrast 
    ? 'bg-black border-2 border-white text-white focus:border-[#f59e0b]' 
    : 'bg-[#141414] border-[#2A2A2A] text-gray-200 focus:border-[#FF5A1F]';
  const labelColor = isLight ? 'text-[#475569]' : 'text-gray-500';
  const cardBg = isLight ? 'bg-[#f8fafc] border-[#e2e8f0] shadow-sm' : isHighContrast ? 'bg-black border-2 border-white' : 'bg-[#1C1C1C] border-[#2A2A2A]';
  const sidebarBg = isLight ? 'bg-white border-[#e2e8f0] shadow-sm text-[#64748b]' : isHighContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#141414] border-[#2A2A2A] text-gray-400';
  const selectBg = isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : isHighContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#252525] border-[#333] text-gray-200';

  useEffect(() => {
    setFormData({ ...config });
    applyTheme(config.themeMode, config.colorAccent, config.density);
  }, [config]);

  // Observador de scroll para actualizar el menú lateral automáticamente
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as any);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    const sectionIds = ['perfil', 'notificaciones', 'tema', 'idioma', 'impresion', 'qr-mesas', 'carta-platos', 'pagos-digitales', 'ofertas'];
    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const handleToggle = (field: keyof SystemConfigState) => {
    const nextVal = !formData[field];
    setFormData((prev) => ({ ...prev, [field]: nextVal }));

    const isEn = formData.language.includes('English');
    if (field === 'soundAlerts') {
      kitchenAudio.enabled = nextVal;
      if (nextVal) {
        kitchenAudio.playCheckItemSound();
        onShowToast(isEn ? 'Sound alerts enabled' : 'Alertas sonoras de comandas activadas', 'volume_up');
      } else {
        onShowToast(isEn ? 'Sound alerts muted' : 'Alertas sonoras silenciadas', 'volume_off');
      }
    } else if (field === 'delayAlerts') {
      onShowToast(
        nextVal 
          ? (isEn ? 'Critical delay alert active (+15m)' : 'Alerta de demora crítica activa (+15 min)')
          : (isEn ? 'Critical delay alert disabled' : 'Alerta de demora crítica desactivada'),
        'timer'
      );
    } else if (field === 'paymentAlerts') {
      onShowToast(
        nextVal 
          ? (isEn ? 'QR payment alerts active' : 'Avisos de pago QR activados')
          : (isEn ? 'QR payment alerts disabled' : 'Avisos de pago QR desactivados'),
        'payments'
      );
    } else if (field === 'lowStockAlerts') {
      onShowToast(
        nextVal 
          ? (isEn ? 'Low stock alerts active' : 'Alertas de bajo stock activadas')
          : (isEn ? 'Low stock alerts disabled' : 'Alertas de bajo stock desactivadas'),
        'inventory_2'
      );
    } else if (field === 'autoCut') {
      onShowToast(
        nextVal
          ? (isEn ? 'ESC/POS Auto-cut enabled' : 'Corte automático ESC/POS activado')
          : (isEn ? 'Auto-cut disabled' : 'Corte automático desactivado'),
        'content_cut'
      );
    } else if (field === 'acousticBuzzer') {
      if (nextVal) kitchenAudio.playCheckItemSound();
      onShowToast(
        nextVal
          ? (isEn ? 'Printer acoustic buzzer enabled' : 'Buzzer acústico de impresora activado')
          : (isEn ? 'Buzzer disabled' : 'Buzzer acústico desactivado'),
        'notifications_active'
      );
    }
  };

  const handleSave = () => {
    onSaveConfig(formData);
    applyTheme(formData.themeMode, formData.colorAccent, formData.density);
  };

  const handleTestPrint = () => {
    setTestPrintActive(true);
    const isEn = formData.language.includes('English');
    if (formData.acousticBuzzer) {
      kitchenAudio.playRunnerAlertSound();
    }
    setTimeout(() => {
      setTestPrintActive(false);
      onShowToast(
        isEn
          ? `Test ticket dispatched to ${formData.printerIp}:${formData.printerPort} (${formData.paperWidth})`
          : `Impresión de prueba enviada a ${formData.printerIp}:${formData.printerPort} (${formData.paperWidth})`,
        'print'
      );
    }, 700);
  };

  return (
    <div className="w-full flex flex-col px-4 lg:px-8 py-6 max-w-[1400px] mx-auto gap-6 lg:gap-8 selection:bg-[#FF5A1F] selection:text-[#0F0F0F] transition-colors duration-200 overflow-x-clip">
      
      {/* Header */}
      <div className={`mb-2 border-b pb-6 ${sectionHeaderBorder}`}>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold mb-1 tracking-tight ${titleColor}`}>
              {t.sys_title}
            </h1>
            <p className={`text-[13px] max-w-2xl ${descColor}`}>
              {t.sys_subtitle} {formData.branchName || 'AUREA Bistro'}. {t.sys_subtitle_end}
            </p>
          </div>
          <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={() => {
                setFormData({ ...config });
                applyTheme(config.themeMode, config.colorAccent, config.density);
                onShowToast('Valores restablecidos', 'restart_alt');
              }}
              className={`flex-1 sm:flex-none justify-center px-3 sm:px-5 py-2.5 rounded border transition text-sm font-medium flex items-center gap-2 cursor-pointer ${
                isLight 
                  ? 'bg-white text-[#334155] border-[#cbd5e1] hover:bg-[#f8fafc] shadow-sm' 
                  : isHighContrast 
                  ? 'bg-black text-white border-2 border-white hover:bg-[#111]' 
                  : 'bg-[#1C1C1C] text-gray-300 border-[#2A2A2A] hover:bg-[#252525]'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {t.reset_values}
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 sm:flex-none justify-center px-3 sm:px-5 py-2.5 bg-[#FF5A1F] text-white rounded hover:bg-[#FF703D] transition font-bold text-sm flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,90,31,0.25)] active:scale-95"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              {t.save_changes}
            </button>
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-start w-full">
        
        {/* Botón para abrir el panel lateral (solo móvil) */}
        <button
          type="button"
          onClick={() => setShowMobileNav(true)}
          className={`lg:hidden sticky top-[72px] z-40 w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm font-semibold cursor-pointer shadow-lg ${
            isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : isHighContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#1A1A1A] border-[#2A2A2A] text-white'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-[#FF5A1F] text-[20px]">menu_open</span>
            <span className="truncate">{activeLabel}</span>
          </span>
          <span className={`text-[10px] font-mono uppercase tracking-widest ${descColor}`}>Secciones</span>
        </button>

        {/* Fondo oscuro al abrir el panel (solo móvil) */}
        {showMobileNav && (
          <div
            className="lg:hidden fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowMobileNav(false)}
          />
        )}

        {/* Menú Lateral: panel deslizable en móvil, sticky en escritorio */}
        <aside className={`fixed inset-y-0 left-0 z-[60] w-[280px] max-w-[85vw] p-4 overflow-y-auto flex flex-col gap-2 transition-transform duration-300 ease-out border-r ${
          isLight ? 'bg-white border-[#e2e8f0]' : isHighContrast ? 'bg-black border-white' : 'bg-[#0e0e10] border-[#2A2A2A]'
        } ${showMobileNav ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0 lg:z-auto lg:w-[260px] lg:max-w-none lg:shrink-0 lg:p-0 lg:overflow-visible lg:bg-transparent lg:border-0 lg:sticky lg:top-24 min-w-0`}>
          <div className="lg:hidden flex items-center justify-between pb-3 mb-1 border-b border-gray-500/20">
            <span className={`text-[11px] font-mono uppercase tracking-widest font-bold ${labelColor}`}>Secciones</span>
            <button
              type="button"
              onClick={() => setShowMobileNav(false)}
              className={`p-1 rounded-lg cursor-pointer ${isLight ? 'text-[#64748b] hover:bg-[#f1f5f9]' : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'}`}
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <nav className="flex flex-col gap-1.5">
            {[
              {
                id: 'perfil',
                num: '01',
                label: t.nav_profile,
                icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
              },
              {
                id: 'notificaciones',
                num: '02',
                label: t.nav_notifications,
                icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
              },
              {
                id: 'tema',
                num: '03',
                label: t.nav_theme,
                icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42'
              },
              {
                id: 'idioma',
                num: '04',
                label: t.nav_region,
                icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'
              },
              {
                id: 'impresion',
                num: '05',
                label: t.nav_hardware,
                icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z'
              },
              {
                id: 'qr-mesas',
                num: '06',
                label: t.nav_qr_tables,
                icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z'
              },
              {
                id: 'carta-platos',
                num: '07',
                label: 'Carta & Platos 3D',
                icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'
              },
              {
                id: 'pagos-digitales',
                num: '08',
                label: 'Pagos QR (Yape / Plin)',
                icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
              },
              {
                id: 'ofertas',
                num: '09',
                label: 'Ofertas & Promociones',
                icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z'
              },
              {
                id: 'libro-reclamaciones',num:'11',label:'Libro de Reclamaciones',icon:'M12 6v12m-8-12h16v12H4z'
              },
              {
                id: 'seguridad-geocerca',
                num: '10',
                label: 'Seguridad Antifraude & GPS',
                icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
              },
            ].map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => { setActiveSection(item.id as any); setShowMobileNav(false); }}
                  className={`gap-3 flex justify-between items-center px-4 py-3 rounded text-sm transition-all cursor-pointer ${
                    isActive
                      ? isLight
                        ? 'bg-white text-[#ff5708] border-l-2 border-[#FF5A1F] shadow-sm font-semibold'
                        : 'bg-[#1A1A1A] text-white border-l-2 border-[#FF5A1F]'
                      : isLight
                      ? 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a] border-l-2 border-transparent'
                      : 'text-gray-400 hover:bg-[#161616] hover:text-gray-200 border-l-2 border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <svg
                      className={`w-4 h-4 transition-colors ${isActive ? 'text-[#FF5A1F]' : isLight ? 'text-[#94a3b8]' : 'text-gray-500'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    {item.label}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${isActive ? 'text-[#FF5A1F]' : isLight ? 'text-[#94a3b8]' : 'text-gray-600'}`}>
                    {item.num}
                  </span>
                </a>
              );
            })}
          </nav>

          <div className={`block mt-4 lg:mt-8 p-5 rounded text-[11px] font-mono tracking-wide border ${sidebarBg}`}>
            <div className={`flex justify-between mb-4 uppercase font-bold ${isLight ? 'text-[#64748b]' : 'text-gray-500'}`}>
              <span>{t.terminal_status}</span>
              <span className="text-[#00FF88] flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]"></span> OK</span>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between">
                <span>{t.kds_latency}</span> 
                <span className={isLight ? 'text-[#0f172a] font-semibold' : 'text-white'}>18 ms</span>
              </div>
              <div className="flex justify-between">
                <span>{t.local_sync}</span> 
                <span className={isLight ? 'text-[#0f172a] font-semibold' : 'text-white'}>SQLite Activo</span>
              </div>
              <div className="flex justify-between">
                <span>{t.printer_network}</span> 
                <span className="text-[#FF5A1F] font-semibold">{t.connected}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Contenido Central Scrollable */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-6 lg:gap-8 max-w-4xl pb-24">
          
          {/* SEC_01: PERFIL */}
          <section id="perfil" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex justify-between items-start p-4 sm:p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-[#FF5A1F] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>{t.profile_title}</h2>
                  <p className={`text-[13px] ${descColor}`}>{t.profile_desc}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row p-4 sm:p-6 gap-6">
              {/* Panel Izquierdo (Logo) */}
              <div className={`w-full md:w-[240px] shrink-0 flex flex-col items-center justify-center p-5 rounded-lg border ${
                isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : isHighContrast ? 'bg-black border-2 border-white' : 'bg-[#0F0F0F] border-[#2A2A2A]'
              }`}>
                <div className={`w-[110px] h-[110px] rounded border mb-5 overflow-hidden flex items-center justify-center shadow-md ${
                  isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#050505] border-[#1A1A1A]'
                }`}>
                  <img 
                    src={formData.logoUrl || '/logo.png'} 
                    alt={`Logo ${formData.branchName || 'AUREA Bistro'}`} 
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className={`font-bold mb-1 text-[15px] text-center ${titleColor}`}>{formData.branchName || 'AUREA Bistro'}</h3>
                <p className={`text-[10px] font-mono tracking-widest mb-5 ${descColor}`}>RUC: {formData.branchRuc || '20608941203'}</p>
                <button 
                  type="button"
                  onClick={() => setShowLogoModal(true)}
                  className={`text-[11px] px-4 py-2 border rounded transition flex items-center justify-center gap-2 w-full cursor-pointer ${
                    isLight 
                      ? 'bg-white hover:bg-[#f1f5f9] border-[#cbd5e1] text-[#334155] shadow-sm font-semibold' 
                      : 'bg-[#1A1A1A] hover:bg-[#252525] border-[#333] text-gray-300'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {t.change_logo}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoFileSelect} 
                  accept="image/png, image/jpeg, image/webp, image/svg+xml" 
                  className="hidden" 
                />
              </div>

              {/* Panel Derecho */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.branch_name}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                      </div>
                      <input type="text" value={formData.branchName} onChange={(e) => setFormData({...formData, branchName: e.target.value})} className={`w-full rounded py-2.5 pr-3 pl-9 text-[13px] transition ${inputBg}`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.shift_manager}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <input type="text" value={formData.managerName} onChange={(e) => setFormData({...formData, managerName: e.target.value})} className={`w-full rounded py-2.5 pr-3 pl-9 text-[13px] transition ${inputBg}`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.notification_email}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className={`w-full rounded py-2.5 pr-3 pl-9 text-[13px] transition ${inputBg}`} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.room_phone}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </div>
                      <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className={`w-full rounded py-2.5 pr-3 pl-9 text-[13px] font-mono transition ${inputBg}`} />
                    </div>
                  </div>
                </div>
                
                <div className={`mt-8 pt-4 border-t flex justify-between items-center ${sectionHeaderBorder}`}>
                  <p className={`text-[11px] flex items-center gap-2 ${descColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]"></span>
                    Licencia GastroPulse Enterprise: <strong className={`font-medium ${titleColor}`}>32 Terminales Activas</strong>
                  </p>
                  
                </div>
              </div>
            </div>
          </section>

          {/* SEC_02: NOTIFICACIONES */}
          <section id="notificaciones" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex justify-between items-start p-4 sm:p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-[#FF5A1F] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M3.124 7.5A8.969 8.969 0 015.292 3m13.416 0a8.969 8.969 0 012.168 4.5" />
                </svg>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>{t.notif_title}</h2>
                  <p className={`text-[13px] ${descColor}`}>{t.notif_desc}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Alertas sonoras */}
              <div className={`p-4 rounded-xl flex justify-between items-start transition-all ${cardBg}`}>
                <div className="flex gap-3 pr-4">
                  <svg className="w-5 h-5 text-[#FF5A1F] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                  <div>
                    <h4 className={`text-[13.5px] font-bold mb-1 ${titleColor}`}>{t.sound_alerts_title}</h4>
                    <p className={`text-[11.5px] leading-tight ${descColor}`}>{t.sound_alerts_desc}</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleToggle('soundAlerts')} className={`w-11 h-6 shrink-0 rounded-full transition-colors flex items-center px-0.5 cursor-pointer mt-1 ${formData.soundAlerts ? 'bg-[#FF5A1F]' : isLight ? 'bg-[#cbd5e1]' : 'bg-[#333]'}`}>
                  <div className={`w-5 h-5 rounded-full transition-transform ${formData.soundAlerts ? 'translate-x-5' : 'translate-x-0'} ${isLight ? 'bg-white shadow-sm' : 'bg-[#0F0F0F]'}`} />
                </button>
              </div>

              {/* Card 2: Demora crítica */}
              <div className={`p-4 rounded-xl flex justify-between items-start transition-all ${cardBg}`}>
                <div className="flex gap-3 pr-4">
                  <svg className="w-5 h-5 text-[#FF8A65] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 3.75h12m-12 16.5h12M7.5 3.75V5.5c0 1.48-.68 2.89-1.85 3.82l-1.3 1.02c-.89.7-1.35 1.77-1.35 2.91s.46 2.21 1.35 2.91l1.3 1.02c1.17.93 1.85 2.34 1.85 3.82v1.75m9-16.5V5.5c0 1.48.68 2.89 1.85 3.82l1.3 1.02c.89.7 1.35 1.77 1.35 2.91s-.46 2.21-1.35 2.91l-1.3 1.02c-1.17.93-1.85 2.34-1.85 3.82v1.75" />
                  </svg>
                  <div>
                    <h4 className={`text-[13.5px] font-bold mb-1 ${titleColor}`}>{t.critical_delay_title}</h4>
                    <p className={`text-[11.5px] leading-tight ${descColor}`}>{t.critical_delay_desc}</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleToggle('delayAlerts')} className={`w-11 h-6 shrink-0 rounded-full transition-colors flex items-center px-0.5 cursor-pointer mt-1 ${formData.delayAlerts ? 'bg-[#FF5A1F]' : isLight ? 'bg-[#cbd5e1]' : 'bg-[#333]'}`}>
                  <div className={`w-5 h-5 rounded-full transition-transform ${formData.delayAlerts ? 'translate-x-5' : 'translate-x-0'} ${isLight ? 'bg-white shadow-sm' : 'bg-[#0F0F0F]'}`} />
                </button>
              </div>

              {/* Card 3: Avisos de pago */}
              <div className={`p-4 rounded-xl flex justify-between items-start transition-all ${cardBg}`}>
                <div className="flex gap-3 pr-4">
                  <svg className="w-5 h-5 text-[#0EA5E9] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14.25h6M9 11.25h6M9 8.25h6M2.25 5.25A2.25 2.25 0 014.5 3h15a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0119.5 21h-15A2.25 2.25 0 012.25 18.75V5.25z" />
                  </svg>
                  <div>
                    <h4 className={`text-[13.5px] font-bold mb-1 ${titleColor}`}>{t.payment_alerts_title}</h4>
                    <p className={`text-[11.5px] leading-tight ${descColor}`}>{t.payment_alerts_desc}</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleToggle('paymentAlerts')} className={`w-11 h-6 shrink-0 rounded-full transition-colors flex items-center px-0.5 cursor-pointer mt-1 ${formData.paymentAlerts ? 'bg-[#FF5A1F]' : isLight ? 'bg-[#cbd5e1]' : 'bg-[#333]'}`}>
                  <div className={`w-5 h-5 rounded-full transition-transform ${formData.paymentAlerts ? 'translate-x-5' : 'translate-x-0'} ${isLight ? 'bg-white shadow-sm' : 'bg-[#0F0F0F]'}`} />
                </button>
              </div>

              {/* Card 4: Bajo stock */}
              <div className={`p-4 rounded-xl flex justify-between items-start transition-all ${cardBg}`}>
                <div className="flex gap-3 pr-4">
                  <svg className="w-5 h-5 text-[#FDBA74] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  <div>
                    <h4 className={`text-[13.5px] font-bold mb-1 ${titleColor}`}>{t.low_stock_title}</h4>
                    <p className={`text-[11.5px] leading-tight ${descColor}`}>{t.low_stock_desc}</p>
                  </div>
                </div>
                <button type="button" onClick={() => handleToggle('lowStockAlerts')} className={`w-11 h-6 shrink-0 rounded-full transition-colors flex items-center px-0.5 cursor-pointer mt-1 ${formData.lowStockAlerts ? 'bg-[#FF5A1F]' : isLight ? 'bg-[#cbd5e1]' : 'bg-[#333]'}`}>
                  <div className={`w-5 h-5 rounded-full transition-transform ${formData.lowStockAlerts ? 'translate-x-5' : 'translate-x-0'} ${isLight ? 'bg-white shadow-sm' : 'bg-[#0F0F0F]'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* SEC_03: TEMA & ERGONOMÍA */}
          <section id="tema" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex justify-between items-start p-4 sm:p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-[#FF5A1F] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                </svg>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>Tema & Ergonomía Visual</h2>
                  <p className={`text-[13px] ${descColor}`}>Optimizado para legibilidad bajo luces cálidas de salón o el calor intenso de cocina.</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 flex flex-col gap-6">
              {/* MODO DE PANTALLA */}
              <div>
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold mb-3 block ${labelColor}`}>{t.screen_mode}</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Obsidian */}
                  <div 
                    onClick={() => {
                      setFormData({ ...formData, themeMode: 'obsidian' });
                      applyTheme('obsidian', formData.colorAccent, formData.density);
                    }} 
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      formData.themeMode === 'obsidian' 
                        ? 'border-[#FF5A1F] bg-[#161616] ring-2 ring-[#FF5A1F]/30 shadow-md' 
                        : isLight 
                        ? 'border-[#e2e8f0] bg-[#141414] text-white hover:border-[#cbd5e1]'
                        : 'border-[#2A2A2A] bg-[#141414] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[13px] font-bold text-white">{t.theme_obsidian_title}</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        formData.themeMode === 'obsidian' ? 'border-[#FF5A1F]' : 'border-gray-600'
                      }`}>
                        {formData.themeMode === 'obsidian' && <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />}
                      </span>
                    </div>
                    <div className="w-full h-20 rounded bg-[#0A0A0A] border border-[#222] p-2.5 mb-4 flex flex-col justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />
                        <span className="w-16 h-1.5 rounded-full bg-[#2A2A2A]" />
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        <div className="h-6 bg-[#181818] rounded border border-[#252525]" />
                        <div className="h-6 bg-[#181818] rounded border border-[#252525]" />
                        <div className="h-6 bg-[#181818] rounded border border-[#252525]" />
                        <div className="h-6 bg-[#181818] rounded border border-[#252525]" />
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-tight">Predeterminado. Reduce fatiga visual en salón de noche.</p>
                  </div>

                  {/* Claro Minimal */}
                  <div 
                    onClick={() => {
                      setFormData({ ...formData, themeMode: 'light' });
                      applyTheme('light', formData.colorAccent, formData.density);
                    }} 
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      formData.themeMode === 'light' 
                        ? 'border-2 border-[#FF5A1F] bg-[#fff7ed]/50 shadow-md ring-2 ring-[#FF5A1F]/20' 
                        : isLight 
                        ? 'border-[#cbd5e1] bg-white text-[#0f172a] hover:border-[#94a3b8]'
                        : 'border-[#2A2A2A] bg-[#141414] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[13px] font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{t.theme_light_title}</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        formData.themeMode === 'light' ? 'border-[#FF5A1F]' : 'border-gray-500'
                      }`}>
                        {formData.themeMode === 'light' && <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />}
                      </span>
                    </div>
                    <div className="w-full h-20 rounded bg-[#f1f5f9] border border-[#cbd5e1] p-2.5 mb-4 flex flex-col justify-between shadow-inner">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />
                        <span className="w-16 h-1.5 rounded-full bg-[#cbd5e1]" />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="h-6 bg-white rounded border border-[#e2e8f0]" />
                        <div className="h-6 bg-white rounded border border-[#e2e8f0]" />
                        <div className="h-6 bg-white rounded border border-[#e2e8f0]" />
                      </div>
                    </div>
                    <p className={`text-[11px] leading-tight ${isLight ? 'text-[#64748b]' : 'text-gray-400'}`}>{t.theme_light_desc}</p>
                  </div>

                  {/* Alto Contraste KDS */}
                  <div 
                    onClick={() => {
                      setFormData({ ...formData, themeMode: 'kds-high-contrast' });
                      applyTheme('kds-high-contrast', formData.colorAccent, formData.density);
                    }} 
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      formData.themeMode === 'kds-high-contrast' 
                        ? 'border-2 border-[#FF5A1F] bg-black ring-2 ring-[#FF5A1F]/30 shadow-md' 
                        : isLight 
                        ? 'border-[#e2e8f0] bg-black text-white hover:border-[#cbd5e1]'
                        : 'border-[#2A2A2A] bg-[#141414] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[13px] font-bold text-white">{t.theme_kds_title}</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        formData.themeMode === 'kds-high-contrast' ? 'border-[#FF5A1F]' : 'border-gray-600'
                      }`}>
                        {formData.themeMode === 'kds-high-contrast' && <span className="w-2 h-2 rounded-full bg-[#FF5A1F]" />}
                      </span>
                    </div>
                    <div className="w-full h-20 rounded bg-black border-2 border-white p-2.5 mb-4 flex flex-col justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                        <span className="w-16 h-1.5 rounded-full bg-white" />
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="h-6 bg-[#EAB308] rounded-sm" />
                        <div className="h-6 bg-[#10B981] rounded-sm" />
                        <div className="h-6 bg-white rounded-sm" />
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-tight">{t.theme_kds_desc}</p>
                  </div>
                </div>
              </div>

              {/* FILA INFERIOR: ACENTO CROMÁTICO + DENSIDAD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Acento Cromático */}
                <div className="flex flex-col gap-3">
                  <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.chromatic_accent}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.values(ACCENT_PALETTE).map((accent) => {
                      const isSelected = formData.colorAccent === accent.id;
                      return (
                        <button
                          key={accent.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, colorAccent: accent.id });
                            applyTheme(formData.themeMode, accent.id, formData.density);
                            onShowToast(`Acento cromático: ${accent.name}`, 'palette');
                          }}
                          className={`flex items-center gap-2 py-2 px-2.5 rounded-lg border text-[12px] font-medium transition-all cursor-pointer text-left ${
                            isSelected
                              ? isLight
                                ? 'font-bold shadow-sm'
                                : 'text-white font-bold'
                              : isLight
                              ? 'border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc]'
                              : 'border-[#2A2A2A] bg-[#141414] text-gray-400 hover:border-[#444]'
                          }`}
                          style={
                            isSelected
                              ? isLight
                                ? { borderColor: accent.hex, backgroundColor: accent.lightBg, color: accent.textLight }
                                : { borderColor: accent.hex, backgroundColor: accent.darkBg, color: '#ffffff' }
                              : undefined
                          }
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0 transition-transform"
                            style={{
                              backgroundColor: accent.hex,
                              boxShadow: isSelected ? `0 0 8px ${accent.hex}99` : undefined,
                              transform: isSelected ? 'scale(1.15)' : 'scale(1)'
                            }}
                          />
                          <span className="truncate">{accent.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className={`text-[11px] ${descColor}`}>El acento determina el foco de órdenes críticas y botones de acción rápida.</p>
                </div>

                {/* Densidad de Interfaz */}
                <div className="flex flex-col gap-3">
                  <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>
                    {t.density_title}
                  </label>
                  <div className={`grid grid-cols-2 gap-2 p-1 rounded-lg border ${
                    isLight ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#141414] border-[#2A2A2A]'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, density: 'compact' });
                        applyTheme(formData.themeMode, formData.colorAccent, 'compact');
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-[12px] font-medium transition-all cursor-pointer ${
                        formData.density === 'compact'
                          ? isLight
                            ? 'border border-[#FF5A1F] bg-white text-[#FF5A1F] shadow-sm font-bold'
                            : 'border border-[#FF5A1F] bg-[#221A15] text-white shadow-[0_0_8px_rgba(255,90,31,0.2)]'
                          : isLight
                          ? 'border border-transparent text-[#64748b] hover:text-[#0f172a]'
                          : 'border border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-colors ${formData.density === 'compact' ? 'text-[#FF5A1F]' : isLight ? 'text-[#64748b]' : 'text-gray-400'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      <span>{t.density_compact}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, density: 'touch' });
                        applyTheme(formData.themeMode, formData.colorAccent, 'touch');
                      }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-[12px] font-medium transition-all cursor-pointer ${
                        formData.density === 'touch'
                          ? isLight
                            ? 'border border-[#FF5A1F] bg-white text-[#FF5A1F] shadow-sm font-bold'
                            : 'border border-[#FF5A1F] bg-[#221A15] text-white shadow-[0_0_8px_rgba(255,90,31,0.2)]'
                          : isLight
                          ? 'border border-transparent text-[#64748b] hover:text-[#0f172a]'
                          : 'border border-transparent text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-colors ${formData.density === 'touch' ? 'text-[#FF5A1F]' : isLight ? 'text-[#64748b]' : 'text-gray-400'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                      </svg>
                      <span>{t.density_touch}</span>
                    </button>
                  </div>
                  <p className={`text-[11px] ${descColor}`}>
                    {formData.density === 'compact'
                      ? 'Compacta maximiza datos por pantalla en estación de caja y barra.'
                      : 'Táctil ampliada agranda botones para terminales táctiles en cocina y pase.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* SEC_04: IDIOMA */}
          <section id="idioma" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex justify-between items-start p-4 sm:p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-[#FF5A1F] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>{t.region_title}</h2>
                  <p className={`text-[13px] ${descColor}`}>{t.region_desc}</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.system_language}</label>
                <select 
                    value={formData.language} 
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setFormData({...formData, language: newLang});
                      const newT = getTranslations(newLang);
                      if (typeof document !== 'undefined') {
                        document.documentElement.lang = getLanguageCode(newLang);
                      }
                      onShowToast(newT.toast_lang_changed, 'translate');
                    }} 
                    className={`w-full rounded p-2.5 text-[13px] focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`}
                  >
                  <option value="Español (Perú)">Español (Perú)</option>
                  <option value="English (US)">English (US)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.base_currency}</label>
                <select 
                    value={formData.currency} 
                    onChange={(e) => {
                      const newCurr = e.target.value;
                      setFormData({...formData, currency: newCurr});
                      onShowToast(`Moneda actualizada: ${newCurr}`, 'payments');
                    }} 
                    className={`w-full rounded p-2.5 text-[13px] focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`}
                  >
                  <option value="Soles Peruanos (S/)">Soles Peruanos (S/)</option>
                  <option value="USD ($)">Dólares (USD)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.timezone}</label>
                <select 
                  value={formData.timezone} 
                  onChange={(e) => setFormData({...formData, timezone: e.target.value})} 
                  className={`w-full rounded p-2.5 text-[13px] font-mono focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`}
                >
                  <option value="America/Lima (UTC-5)">America/Lima (UTC-5)</option>
                  <option value="America/Bogota (UTC-5)">America/Bogota (UTC-5)</option>
                  <option value="America/Santiago (UTC-4)">America/Santiago (UTC-4)</option>
                  <option value="America/Buenos_Aires (UTC-3)">America/Buenos_Aires (UTC-3)</option>
                  <option value="America/Mexico_City (UTC-6)">America/Mexico_City (UTC-6)</option>
                  <option value="America/New_York (UTC-5)">America/New_York (UTC-5)</option>
                  <option value="Europe/Madrid (UTC+1)">Europe/Madrid (UTC+1)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.time_format}</label>
                <div className={`flex border rounded overflow-hidden p-0.5 ${
                  isLight ? 'bg-[#f1f5f9] border-[#cbd5e1]' : 'bg-[#252525] border-[#333]'
                }`}>
                  <button 
                    type="button"
                    onClick={() => {
                      setFormData({...formData, timeFormat: '24h'});
                      onShowToast('Formato cambiado a 24 Horas', 'schedule');
                    }} 
                    className={`flex-1 text-[11px] font-bold rounded py-2 transition cursor-pointer ${
                      formData.timeFormat === '24h' 
                        ? isLight ? 'bg-white text-[#0f172a] shadow-sm font-bold' : 'bg-[#333] text-white font-bold' 
                        : isLight ? 'text-[#64748b] hover:text-[#0f172a]' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {t.format_24h}
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setFormData({...formData, timeFormat: '12h'});
                      onShowToast('Formato cambiado a 12 Horas (AM/PM)', 'schedule');
                    }} 
                    className={`flex-1 text-[11px] font-bold rounded py-2 transition cursor-pointer ${
                      formData.timeFormat === '12h' 
                        ? isLight ? 'bg-white text-[#0f172a] shadow-sm font-bold' : 'bg-[#333] text-white font-bold' 
                        : isLight ? 'text-[#64748b] hover:text-[#0f172a]' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {t.format_12h}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SEC_05: IMPRESIÓN */}
          <section id="impresion" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex justify-between items-start p-4 sm:p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-[#FF5A1F] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>{t.hardware_title}</h2>
                  <p className={`text-[13px] ${descColor}`}>{t.hardware_desc}</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-6 flex flex-col md:flex-row gap-8">
              <div className="flex-1 min-w-0 space-y-6">
                <div className="flex items-center justify-between">
                  <p className={`text-[13px] font-semibold flex items-center gap-2 ${isLight ? 'text-[#334155]' : 'text-gray-300'}`}>
                    <span className="w-2 h-2 rounded-full bg-[#00FF88]"></span> {t.thermal_printer}
                  </p>
                  {formData.printerIp.trim() ? (
                    <span className="text-[#00FF88] text-[10px] font-mono tracking-widest font-bold">ONLINE // READY</span>
                  ) : (
                    <span className="text-[#FF5A1F] text-[10px] font-mono tracking-widest font-bold">OFFLINE // NO IP</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.ip_address}</label>
                    <input type="text" value={formData.printerIp} onChange={(e) => setFormData({...formData, printerIp: e.target.value})} className={`w-full rounded p-2.5 text-[13px] font-mono focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`} />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.port_socket}</label>
                    <input type="text" value={formData.printerPort} onChange={(e) => setFormData({...formData, printerPort: e.target.value})} className={`w-full rounded p-2.5 text-[13px] font-mono focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`} />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className={`text-[10px] uppercase tracking-[0.1em] font-bold ${labelColor}`}>{t.paper_width}</label>
                    <select 
                      value={formData.paperWidth} 
                      onChange={(e) => {
                        const newWidth = e.target.value as any;
                        setFormData({...formData, paperWidth: newWidth});
                        const isEn = formData.language.includes('English');
                        onShowToast(isEn ? `Paper width set to ${newWidth}` : `Ancho de papel configurado en ${newWidth}`, 'receipt_long');
                      }} 
                      className={`w-full rounded p-2.5 text-[13px] focus:border-[#FF5A1F] focus:outline-none transition ${selectBg}`}
                    >
                      <option value="80mm">80mm (Estándar)</option>
                      <option value="58mm">58mm (Compacto)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 pt-4 flex-wrap">
                  <label className={`flex items-center gap-2 text-[12.5px] cursor-pointer ${isLight ? 'text-[#334155]' : 'text-gray-300'}`}>
                    <input type="checkbox" checked={formData.autoCut} onChange={() => handleToggle('autoCut')} className="w-4 h-4 accent-[#FF5A1F]" />
                    {t.auto_cut}
                  </label>
                  <label className={`flex items-center gap-2 text-[12.5px] cursor-pointer ${isLight ? 'text-[#334155]' : 'text-gray-300'}`}>
                    <input type="checkbox" checked={formData.acousticBuzzer} onChange={() => handleToggle('acousticBuzzer')} className="w-4 h-4 accent-[#FF5A1F]" />
                    {t.acoustic_buzzer}
                  </label>
                  <button onClick={handleTestPrint} className={`sm:ml-auto w-full sm:w-auto justify-center px-4 py-2 border rounded-lg transition text-[12px] font-medium flex items-center gap-2 cursor-pointer ${
                    isLight 
                      ? 'bg-white hover:bg-[#f8fafc] border-[#cbd5e1] text-[#334155] shadow-sm' 
                      : 'bg-[#252525] hover:bg-[#333] border-[#3A3A3A] text-gray-300'
                  }`}>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    {testPrintActive ? t.printing : t.print_test}
                  </button>
                </div>
              </div>
              
              {/* Monitor Simulador */}
              <div className={`w-full md:w-[290px] shrink-0 border p-4 rounded-xl flex flex-col ${
                isLight ? 'bg-[#f8fafc] border-[#cbd5e1]' : 'bg-[#0F0F0F] border-[#2A2A2A]'
              }`}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] tracking-[0.1em] font-mono ${isLight ? 'text-[#64748b]' : 'text-gray-500'}`}>{t.escpos_monitor}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/10 font-bold font-mono text-[#FF5A1F] border border-[#FF5A1F]/30">{formData.paperWidth}</span>
                  </div>
                  <span className="text-[10px] text-[#FF5A1F] tracking-[0.1em] font-bold font-mono">{t.simulator}</span>
                </div>

                <div className={`mx-auto max-w-full bg-white p-4 font-mono text-black leading-relaxed shadow-lg border border-[#e2e8f0] rounded transition-all duration-300 ${
                  formData.paperWidth === '58mm' ? 'w-[220px] text-[9px]' : 'w-full text-[10px]'
                } ${testPrintActive ? 'ring-4 ring-[#00FF88]/40 scale-[1.02] shadow-[#00FF88]/20' : ''}`}>
                  
                  {/* Status header inside ticket */}
                  <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
                    <p className="font-extrabold text-[11px]">=== {formData.branchName.toUpperCase() || 'AUREA BISTRO'} ===</p>
                    <p className="text-[8px] text-gray-500 font-mono tracking-wider">RUC: {formData.branchRuc || '20608941203'}</p>
                    <p className="font-bold mt-1 text-[#FF5A1F]">COMANDA: #4088 (MESA 12)</p>
                  </div>

                  <div className="flex justify-between mb-2 pb-1 border-b border-dashed border-gray-400">
                    <span>{t.waiter}: CARLOS R.</span>
                    <span className="font-bold">{formData.timeFormat === '12h' ? '02:28:10 PM' : '14:28:10'}</span>
                  </div>

                  <div className="space-y-1.5 my-2">
                    <div className="flex justify-between font-bold">
                      <span>2x LOMO SALTADO</span>
                      <span>MED</span>
                    </div>
                    <p className="pl-2 text-gray-600 text-[8.5px]">- SIN CEBOLLA ROJA</p>

                    <div className="flex justify-between font-bold">
                      <span>1x CEVICHE PULPO</span>
                      <span>PIC</span>
                    </div>
                  </div>

                  <div className="flex justify-between font-bold mt-2 pt-1 border-t border-dashed border-gray-400">
                    <span>{t.total_order}:</span>
                    <span className="text-[#FF5A1F] font-bold">{formData.currency.includes('USD') ? '$ 48.00' : 'S/ 124.00'}</span>
                  </div>

                  <div className="text-center text-gray-500 mt-2 text-[8px] space-y-0.5">
                    <p>{t.escpos_ok}</p>
                    <p className="text-[7.5px] text-gray-400 font-mono">IP: {formData.printerIp}:{formData.printerPort}</p>
                  </div>

                  {/* Auto-cut line simulation */}
                  {formData.autoCut && (
                    <div className="mt-3 pt-2 border-t-2 border-dashed border-gray-400 text-center text-gray-500 text-[8px] flex items-center justify-center gap-1">
                      <span>✂</span>
                      <span className="tracking-widest font-mono">[ CORTE AUTOMÁTICO ]</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
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
                      value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/menu?mesa=${encodeURIComponent(customTableName.trim() || ('MESA ' + selectedTableNumber))}&zona=${encodeURIComponent(selectedZone)}`}
                      className={`flex-1 min-w-0 w-full sm:w-auto rounded p-2.5 text-[12px] font-mono tracking-tight cursor-default ${
                        isLight ? 'bg-[#f1f5f9] border border-[#cbd5e1] text-[#334155]' : 'bg-[#141414] border border-[#2A2A2A] text-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${window.location.origin}/menu?mesa=${encodeURIComponent(customTableName.trim() || ('MESA ' + selectedTableNumber))}&zona=${encodeURIComponent(selectedZone)}`;
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
                        const url = `${window.location.origin}/menu?mesa=${encodeURIComponent(customTableName.trim() || ('MESA ' + selectedTableNumber))}&zona=${encodeURIComponent(selectedZone)}`;
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
                    <img src={formData.logoUrl || '/logo.png'} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  <h4 className={`text-[13px] font-extrabold tracking-tight ${titleColor}`}>{formData.branchName || 'AUREA Bistro'}</h4>
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
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=${qrColor === 'brand' ? 'ff5a1f' : '000000'}&bgcolor=ffffff&data=${encodeURIComponent(
                      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') +
                      '/menu?mesa=' + encodeURIComponent(customTableName.trim() || ('MESA ' + selectedTableNumber)) +
                      '&zona=' + encodeURIComponent(selectedZone)
                    )}`}
                    alt="Código QR de la Mesa"
                    className="w-[180px] h-[180px] object-contain rounded"
                  />
                  {includeLogoInQR && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-white p-1 shadow-lg border border-gray-200 flex items-center justify-center">
                        <img src={formData.logoUrl || '/logo.png'} alt="Mini Logo" className="w-full h-full object-cover rounded-full" />
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
                          const targetUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&color=${qrColor === 'brand' ? 'ff5a1f' : '000000'}&bgcolor=ffffff&data=${encodeURIComponent(
                            window.location.origin + '/menu?mesa=' + encodeURIComponent(customTableName.trim() || ('MESA ' + selectedTableNumber))
                          )}`;
                          const res = await fetch(targetUrl);
                          const blob = await res.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = blobUrl;
                          a.download = `QR-${(customTableName.trim() || ('MESA_' + selectedTableNumber)).replace(/\s+/g, '_')}.png`;
                          a.click();
                          URL.revokeObjectURL(blobUrl);
                          onShowToast('Imagen QR descargada en alta resolución', 'download');
                        } catch {
                          window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.location.origin + '/menu?mesa=' + (customTableName.trim() || selectedTableNumber))}`, '_blank');
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

          {/* SEC_07: CARTA DIGITAL & ESCANEO 3D DE PLATOS (SETUP ONBOARDING) */}
          <section id="carta-platos" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[28px] text-[#ff5708] shrink-0">view_in_ar</span>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>Carta Digital & Escaneo 3D</h2>
                  <p className={`text-[13px] ${descColor}`}>
                    Digitalización 360° para visualización 3D y Realidad Aumentada (AR) en mesa
                  </p>
                </div>
              </div>

              {/* Action Buttons Header */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(true)}
                  className={`px-3 py-2 rounded-xl text-[12px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isLight ? 'bg-white border-[#cbd5e1] text-[#334155] hover:bg-[#f1f5f9]' : 'bg-[#1e1f26] border-[#383a48] text-white hover:border-[#ff5708]/50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px] text-[#ff5708]">format_list_bulleted</span>
                  <span>Gestionar Catálogo</span>
                </button>

                <div className={`px-3 py-2 rounded-xl border text-[11.5px] font-mono-code flex items-center gap-2 ${
                  isLight ? 'bg-[#f1f5f9] border-[#cbd5e1] text-[#475569]' : 'bg-[#1a1b24] border-[#313342] text-[#ffb59c]'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Plan: Platos 3D Gestionados</span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Card Explicativa de Plan SaaS: Platos 3D Gestionados por la Empresa Proveedora */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                isLight ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-[#0f1f17] border-[#166534]/40'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[22px] text-emerald-400 shrink-0 mt-0.5">verified</span>
                  <div>
                    <h4 className="text-[13px] font-bold text-emerald-400">
                      Platos 3D y Realidad Aumentada Gestionados por Plan
                    </h4>
                    <p className={`text-[12px] leading-relaxed mt-0.5 ${isLight ? 'text-[#166534]' : 'text-[#bbf7d0]/80'}`}>
                      La digitalización fotogramétrica 360° y los modelos 3D son preparados y cargados directamente por nuestro equipo técnico según el plan contratado por tu restaurante (ej. paquete de 20 platos). Desde este panel puedes visualizar tus platos activos, ajustar precios en vivo y consultar el maridaje. Para solicitar la inclusión de nuevos platos 3D a tu carta, contacta a tu ejecutivo comercial.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Servicio Gestionado
                  </span>
                </div>
              </div>

              {/* Estadísticas de la Carta y Platos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl border ${cardBg}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${descColor}`}>Total Platos en Carta</span>
                    <span className="material-symbols-outlined text-[#ff5708] text-[20px]">restaurant</span>
                  </div>
                  <div className={`text-2xl font-bold font-mono-code mt-2 ${titleColor}`}>{dishes.length}</div>
                  <span className="text-[11px] text-emerald-400 font-medium">Sincronizados en Supabase</span>
                </div>

                <div className={`p-4 rounded-xl border ${cardBg}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${descColor}`}>Modelos 3D Escaneados</span>
                    <span className="material-symbols-outlined text-purple-400 text-[20px]">view_in_ar</span>
                  </div>
                  <div className={`text-2xl font-bold font-mono-code mt-2 ${titleColor}`}>
                    {dishes.filter((d) => d.has3D).length}
                  </div>
                  <span className="text-[11px] text-purple-400 font-medium">Listos para Realidad Aumentada</span>
                </div>

                <div className={`p-4 rounded-xl border ${cardBg}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${descColor}`}>Categorías Activas</span>
                    <span className="material-symbols-outlined text-blue-400 text-[20px]">category</span>
                  </div>
                  <div className={`text-2xl font-bold font-mono-code mt-2 ${titleColor}`}>
                    {Array.from(new Set(dishes.map((d) => d.category))).length || 4}
                  </div>
                  <span className={`text-[11px] font-medium ${descColor}`}>Estructura gastronómica</span>
                </div>
              </div>

              {/* Buscador y Filtro Rápido */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-gray-400">search</span>
                  <input
                    type="text"
                    placeholder="Buscar plato por nombre, descripción o categoría..."
                    value={dishSearchFilter}
                    onChange={(e) => setDishSearchFilter(e.target.value)}
                    className={`w-full pl-9 pr-4 py-2 rounded-xl text-[12.5px] border focus:border-[#ff5708] focus:outline-none transition-colors ${
                      isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#16171d] border-[#2f313d] text-white'
                    }`}
                  />
                </div>
                <span className={`text-[12px] font-mono ${descColor}`}>
                  Mostrando {dishes.filter(d => !dishSearchFilter || d.name.toLowerCase().includes(dishSearchFilter.toLowerCase())).length} platos
                </span>
              </div>

              {/* Lista de Platos Configurados */}
              {loadingDishes ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#ff5708] border-t-transparent animate-spin"></div>
                  <span className={`text-[12px] font-mono ${descColor}`}>Cargando platos desde Supabase...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {dishes
                    .filter((d) => !dishSearchFilter || d.name.toLowerCase().includes(dishSearchFilter.toLowerCase()) || d.description.toLowerCase().includes(dishSearchFilter.toLowerCase()))
                    .map((dish) => (
                      <div
                        key={dish.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all hover:border-[#ff5708]/40 shadow-sm ${
                          isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#181921] border-[#292a35]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-14 h-14 rounded-lg bg-[#252632] overflow-hidden shrink-0 relative flex items-center justify-center border border-[#373948]">
                            {dish.image ? (
                              <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-[24px] text-gray-500">restaurant</span>
                            )}
                            {dish.has3D && (
                              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black" title="3D & AR Activo"></span>
                            )}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[13px] font-bold truncate ${titleColor}`}>{dish.name}</span>
                              {dish.has3D && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#ff5708]/15 text-[#ff5708] border border-[#ff5708]/30">
                                  3D / AR
                                </span>
                              )}
                            </div>
                            <span className={`text-[11px] truncate mt-0.5 ${descColor}`}>
                              {dish.description}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 capitalize mt-1">
                              Cat: {dish.category}
                            </span>
                          </div>
                        </div>

                        {/* Price & Actions */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {editingDishPriceId === dish.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-mono text-[#ff5708] font-bold">S/</span>
                              <input
                                type="number"
                                step="0.5"
                                value={tempDishPrice}
                                onChange={(e) => setTempDishPrice(e.target.value)}
                                className={`w-16 px-1.5 py-0.5 rounded text-[12px] font-mono font-bold border focus:border-[#ff5708] focus:outline-none ${
                                  isLight ? 'bg-white border-[#cbd5e1] text-black' : 'bg-[#101116] border-[#383a48] text-white'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveDishPrice(dish.id)}
                                className="p-1 rounded bg-[#ff5708] text-black hover:bg-[#ff7a3d] cursor-pointer"
                                title="Guardar Precio"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDishPriceId(null)}
                                className="p-1 rounded bg-gray-600/30 text-gray-400 hover:text-white cursor-pointer"
                                title="Cancelar"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-mono-code font-bold text-[#ff5708]">
                                S/ {dish.price.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDishPriceId(dish.id);
                                  setTempDishPrice(dish.price.toString());
                                }}
                                className="p-1 text-gray-400 hover:text-[#ff5708] transition-colors cursor-pointer"
                                title="Editar precio"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteDishItem(dish.id, dish.name)}
                            className="p-1 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Eliminar plato de la carta"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </section>

          {/* SEC_08: PASARELA DE PAGOS DIGITALES QR (YAPE & PLIN) */}
          <section id="pagos-digitales" className={`border rounded-xl scroll-mt-24 ${sectionBg}`}>
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6 border-b ${sectionHeaderBorder}`}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[28px] text-[#ff5708] shrink-0">qr_code_2</span>
                <div>
                  <h2 className={`text-lg font-bold mb-0.5 ${titleColor}`}>Pasarela de Pagos & Códigos QR</h2>
                  <p className={`text-[13px] ${descColor}`}>
                    Configura los códigos QR oficiales de tu restaurante (Yape / Plin), titular de cuenta y métodos habilitados en mesa
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSavePaymentGateway}
                  className="px-4 py-2 bg-[#FF5A1F] text-white font-bold text-[12px] rounded-lg hover:bg-[#FF703D] flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#FF5A1F]/20 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Guardar Cambios de Pagos</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Información y Datos de la Cuenta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-[12px] font-bold uppercase tracking-wider ${descColor}`}>
                    Razón Social / Titular de la Cuenta:
                  </label>
                  <input
                    type="text"
                    value={paymentGatewayConfig.titularName}
                    onChange={(e) => setPaymentGatewayConfig({ ...paymentGatewayConfig, titularName: e.target.value })}
                    placeholder="Ej. ÁUREA BISTRO S.A.C."
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-[13px] font-medium focus:outline-none transition-all ${inputBg}`}
                  />
                  <span className={`text-[11px] ${descColor}`}>
                    Aparecerá en la pantalla de cobro del comensal para que corrobore el nombre.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className={`text-[12px] font-bold uppercase tracking-wider ${descColor}`}>
                    Número de Celular / Cuenta Yape y Plin:
                  </label>
                  <input
                    type="text"
                    value={paymentGatewayConfig.phoneNumber}
                    onChange={(e) => setPaymentGatewayConfig({ ...paymentGatewayConfig, phoneNumber: e.target.value })}
                    placeholder="Ej. 987 654 321"
                    className={`w-full px-3.5 py-2.5 rounded-lg border text-[13px] font-mono-code focus:outline-none transition-all ${inputBg}`}
                  />
                  <span className={`text-[11px] ${descColor}`}>
                    Los comensales podrán copiar este número con un solo clic si pagan por número.
                  </span>
                </div>
              </div>

              {/* Tarjetas de Subida de QR (YAPE & PLIN) */}
              <div className="space-y-3">
                <h3 className={`text-[14px] font-bold flex items-center gap-2 ${titleColor}`}>
                  <span className="material-symbols-outlined text-[18px] text-[#ff5708]">image</span>
                  <span>Códigos QR Oficiales del Restaurante</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tarjeta QR YAPE */}
                  <div className={`p-4 rounded-xl border space-y-3.5 ${isLight ? 'bg-[#fcf8ff] border-[#e9d5ff]' : 'bg-[#18141f] border-[#742284]/40'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#742284]"></span>
                        <span className="text-[13px] font-bold text-[#742284] dark:text-[#d8b4fe]">
                          Código QR Oficial — YAPE
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        paymentGatewayConfig.yapeQrImage
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-[#742284]/10 text-[#742284] dark:text-[#d8b4fe]'
                      }`}>
                        {paymentGatewayConfig.yapeQrImage ? '✓ QR Personalizado Activo' : 'QR Dinámico por Defecto'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 rounded-xl bg-white border-2 border-dashed border-[#742284]/30 flex items-center justify-center p-2 shrink-0 shadow-sm overflow-hidden">
                        {paymentGatewayConfig.yapeQrImage ? (
                          <img
                            src={paymentGatewayConfig.yapeQrImage}
                            alt="QR Yape"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-2 text-[#742284]/60">
                            <span className="material-symbols-outlined text-[32px]">qr_code</span>
                            <div className="text-[9px] font-bold mt-1">QR Dinámico SVG</div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <p className={`text-[11.5px] leading-relaxed ${descColor}`}>
                          Sube la imagen del QR descargado de tu app de Yape. Se mostrará automáticamente a los comensales al pagar su cuenta.
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="px-3 py-1.5 bg-[#742284] hover:bg-[#862b98] text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                            <span className="material-symbols-outlined text-[15px]">upload</span>
                            <span>{paymentGatewayConfig.yapeQrImage ? 'Cambiar QR' : 'Subir QR de Yape'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadPaymentQr('yape', file);
                              }}
                            />
                          </label>

                          {paymentGatewayConfig.yapeQrImage && (
                            <button
                              type="button"
                              onClick={() => handleRemovePaymentQr('yape')}
                              className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                            >
                              Restablecer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta QR PLIN */}
                  <div className={`p-4 rounded-xl border space-y-3.5 ${isLight ? 'bg-[#f0f9ff] border-[#bae6fd]' : 'bg-[#101824] border-[#0077b6]/40'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#0077b6]"></span>
                        <span className="text-[13px] font-bold text-[#0077b6] dark:text-[#7dd3fc]">
                          Código QR Oficial — PLIN
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        paymentGatewayConfig.plinQrImage
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-[#0077b6]/10 text-[#0077b6] dark:text-[#7dd3fc]'
                      }`}>
                        {paymentGatewayConfig.plinQrImage ? '✓ QR Personalizado Activo' : 'QR Dinámico por Defecto'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 rounded-xl bg-white border-2 border-dashed border-[#0077b6]/30 flex items-center justify-center p-2 shrink-0 shadow-sm overflow-hidden">
                        {paymentGatewayConfig.plinQrImage ? (
                          <img
                            src={paymentGatewayConfig.plinQrImage}
                            alt="QR Plin"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-2 text-[#0077b6]/60">
                            <span className="material-symbols-outlined text-[32px]">qr_code</span>
                            <div className="text-[9px] font-bold mt-1">QR Dinámico SVG</div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <p className={`text-[11.5px] leading-relaxed ${descColor}`}>
                          Sube la imagen del QR descargado de tu banco afiliado a Plin (ej. BBVA, Interbank, Scotiabank).
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="px-3 py-1.5 bg-[#0077b6] hover:bg-[#0284c7] text-white font-bold text-[11px] rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shadow-sm">
                            <span className="material-symbols-outlined text-[15px]">upload</span>
                            <span>{paymentGatewayConfig.plinQrImage ? 'Cambiar QR' : 'Subir QR de Plin'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadPaymentQr('plin', file);
                              }}
                            />
                          </label>

                          {paymentGatewayConfig.plinQrImage && (
                            <button
                              type="button"
                              onClick={() => handleRemovePaymentQr('plin')}
                              className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                            >
                              Restablecer
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métodos de Pago Activos en Mesa */}
              <div className="space-y-3 pt-2 border-t border-gray-500/20">
                <h3 className={`text-[14px] font-bold flex items-center gap-2 ${titleColor}`}>
                  <span className="material-symbols-outlined text-[18px] text-[#ff5708]">toggle_on</span>
                  <span>Métodos de Pago Habilitados para Comensales en Mesa</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: 'acceptYape', label: 'Yape QR Móvil', icon: 'qr_code' },
                    { key: 'acceptPlin', label: 'Plin QR Móvil', icon: 'qr_code' },
                    { key: 'acceptPos', label: 'Tarjeta POS Inalámbrico', icon: 'point_of_sale' },
                    { key: 'acceptCash', label: 'Efectivo con Vuelto', icon: 'payments' },
                  ].map((m) => {
                    const isChecked = (paymentGatewayConfig as any)[m.key];
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => {
                          const next = { ...paymentGatewayConfig, [m.key]: !isChecked };
                          setPaymentGatewayConfig(next);
                          savePaymentConfig(next);
                          onShowToast(`${m.label} ${!isChecked ? 'habilitado' : 'desactivado'} para la Carta Digital`, 'info');
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-[#FF5A1F]/10 border-[#FF5A1F] text-[#FF5A1F]'
                            : isLight
                            ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#94a3b8]'
                            : 'bg-[#151515] border-[#2A2A2A] text-gray-500'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{m.icon}</span>
                        <span className="text-[11.5px] font-bold">{m.label}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${isChecked ? 'bg-[#FF5A1F] text-white' : 'bg-gray-500/20'}`}>
                          {isChecked ? 'Habilitado' : 'Desactivado'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </section>

          {/* SEC_09: GESTIÓN DE OFERTAS FLASH (FORMULARIO INTERACTIVO + VISTA PREVIA MÓVIL) */}
          <PromoOffersManager
            isLight={isLight}
            isHighContrast={isHighContrast}
            dishes={dishes}
            sectionBg={sectionBg}
            sectionHeaderBorder={sectionHeaderBorder}
            onShowToast={onShowToast}
          />

          <ComplaintBookSettings sectionBg={sectionBg} sectionHeaderBorder={sectionHeaderBorder}/>

          {/* SEC_10: SEGURIDAD ANTIFRAUDE & GEOCERCA GPS */}
          <GeofenceSettings
            isLight={isLight}
            isHighContrast={isHighContrast}
            sectionBg={sectionBg}
            sectionHeaderBorder={sectionHeaderBorder}
            onShowToast={onShowToast}
          />

        </div>
      </div>


      {/* Modal de Cuadrícula de Todas las Mesas */}
      {showAllQRsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`border rounded-2xl shadow-2xl max-w-4xl w-full p-4 sm:p-6 space-y-5 max-h-[90vh] flex flex-col ${
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
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=${qrColor === 'brand' ? 'ff5a1f' : '000000'}&bgcolor=ffffff&data=${encodeURIComponent(
                  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000') + '/menu?mesa=' + encodeURIComponent(tableLabel)
                )}`;
                return (
                  <div
                    key={tableLabel}
                    className={`p-3.5 rounded-xl border flex flex-col items-center text-center justify-between shadow-sm ${
                      isLight ? 'bg-[#f8fafc] border-[#cbd5e1]' : 'bg-[#121215] border-[#2A2A2A]'
                    }`}
                  >
                    <div className="w-full text-[10px] font-mono text-[#FF5A1F] font-bold uppercase tracking-wider mb-1">
                      {formData.branchName || 'AUREA Bistro'}
                    </div>
                    <div className={`text-[13px] font-bold mb-2 ${titleColor}`}>{tableLabel}</div>
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                      <img src={qrUrl} alt={tableLabel} className="w-24 h-24 object-contain" />
                    </div>
                    <span className="text-[9px] text-emerald-400 mt-2 font-mono">(( · )) NFC LINKED</span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* Modal Escáner 3D de Platos (Cámara / 360 Photogrammetry) */}
      {showScannerModal && (
        <Dish3DScannerModal
          onClose={() => setShowScannerModal(false)}
          onDishCreated={(newDish) => {
            setDishes((prev) => [newDish, ...prev.filter((d) => d.id !== newDish.id)]);
            setShowScannerModal(false);
            onShowToast(`Plato "${newDish.name}" escaneado y publicado con éxito`, '3d_rotation');
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Modal Gestor Completo de Catálogo de Platos */}
      {showCatalogModal && (
        <DishCatalogAdmin
          dishes={dishes}
          onClose={() => setShowCatalogModal(false)}

          onRefreshDishes={async () => {
            const list = await fetchDishesFromDb();
            if (list) setDishes(list);
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Modal de Cambio de Logo */}
      {showLogoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 ${
            isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#18181b] border-[#3f3f46] text-[#e5e1e4]'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-[#e2e8f0]' : 'border-[#27272a]'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FF5A1F] text-[22px]">add_photo_alternate</span>
                <h3 className={`font-bold text-[16px] ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  {t.modal_logo_title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className={`p-1 rounded-lg ${isLight ? 'text-[#64748b] hover:bg-[#f1f5f9]' : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]'}`}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Opcion 1: Subir desde PC */}
              <div 
                className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-[#FF5A1F] ${
                  isLight ? 'bg-[#f8fafc] border-[#cbd5e1]' : 'bg-[#121215] border-[#27272a]'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-[32px] text-[#FF5A1F]">upload_file</span>
                <div className="text-center">
                  <div className={`text-[13px] font-bold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{t.upload_pc}</div>
                  <div className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-gray-400'}`}>{t.upload_specs}</div>
                </div>
              </div>

              {/* Opcion 2: URL Externa */}
              <form onSubmit={handleApplyLogoUrl} className="space-y-2">
                <label className={`text-[11px] font-bold uppercase tracking-wider block ${isLight ? 'text-[#475569]' : 'text-gray-400'}`}>
                  {t.or_url}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/logo.png"
                    value={customLogoInput}
                    onChange={(e) => setCustomLogoInput(e.target.value)}
                    className={`flex-1 min-w-0 rounded-lg px-3 py-2 text-[12.5px] border focus:border-[#FF5A1F] focus:outline-none ${
                      isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#121215] border-[#27272a] text-white'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-[#FF5A1F] text-white font-bold text-[12px] rounded-lg hover:bg-[#FF703D] cursor-pointer"
                  >
                    Asignar
                  </button>
                </div>
              </form>

              {/* Opcion 3: Restaurar por defecto */}
              <button
                type="button"
                onClick={handleResetDefaultLogo}
                className={`w-full py-2.5 rounded-lg border text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  isLight ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] border-[#cbd5e1] text-[#475569]' : 'bg-[#27272a] hover:bg-[#323236] border-[#3f3f46] text-[#a1a1aa]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>{t.restore_default_logo}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};