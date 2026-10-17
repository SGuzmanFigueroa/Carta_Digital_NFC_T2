import type { SystemConfigState } from '@/types';

/** Clases de color de la pantalla de configuración según el tema del panel. */
export function getConfigStyles(themeMode: SystemConfigState['themeMode']) {
  const isLight = themeMode === 'light';
  const isHighContrast = themeMode === 'kds-high-contrast';
  return {
    isLight,
    isHighContrast,
    sectionBg: isLight
      ? 'bg-white border-[#e2e8f0] shadow-sm'
      : isHighContrast
      ? 'bg-black border-2 border-white'
      : 'bg-[#1A1A1A] border-[#2A2A2A]',
    sectionHeaderBorder: isLight ? 'border-[#e2e8f0]' : isHighContrast ? 'border-white' : 'border-[#2A2A2A]',
    titleColor: isLight ? 'text-[#0f172a]' : 'text-white',
    descColor: isLight ? 'text-[#64748b]' : 'text-gray-400',
    inputBg: isLight
      ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] focus:border-[#FF5A1F] focus:bg-white'
      : isHighContrast
      ? 'bg-black border-2 border-white text-white focus:border-[#f59e0b]'
      : 'bg-[#141414] border-[#2A2A2A] text-gray-200 focus:border-[#FF5A1F]',
    labelColor: isLight ? 'text-[#475569]' : 'text-gray-500',
    cardBg: isLight ? 'bg-[#f8fafc] border-[#e2e8f0] shadow-sm' : isHighContrast ? 'bg-black border-2 border-white' : 'bg-[#1C1C1C] border-[#2A2A2A]',
    sidebarBg: isLight ? 'bg-white border-[#e2e8f0] shadow-sm text-[#64748b]' : isHighContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#141414] border-[#2A2A2A] text-gray-400',
    selectBg: isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : isHighContrast ? 'bg-black border-2 border-white text-white' : 'bg-[#252525] border-[#333] text-gray-200'
  };
}

export type ConfigStyles = ReturnType<typeof getConfigStyles>;
