/**
 * Módulo de Utilidades de Geocerca GPS Antifraude
 * Proyecto: Carta Digital NFC
 * Arquitectura Segura, Aislamiento de Pedidos y Tolerancia a Entornos de Desarrollo
 */

export interface GeofenceConfig {
  enabled: boolean;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  bypassInDev: boolean;
  branchName: string;
}

export interface GeofenceValidationResult {
  allowed: boolean;
  distanceMeters: number;
  maxAllowedMeters: number;
  reason: 'valid_inside_radius' | 'geofence_disabled' | 'sandbox_dev_bypass' | 'outside_radius' | 'permission_denied' | 'unsupported_device' | 'timeout';
  message: string;
  userCoords?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

export const STORAGE_KEY_GEOFENCE = 'gastropulse_geofence_config';

/** Configuración por defecto (Centro Gastronómico de Lima: Miraflores / San Isidro) */
export const DEFAULT_GEOFENCE_CONFIG: GeofenceConfig = {
  enabled: true,
  latitude: -12.1217,
  longitude: -77.0298,
  radiusMeters: 150,
  bypassInDev: true,
  branchName: 'AUREA Bistro Central'
};

/**
 * Fórmula de Haversine para calcular la distancia ortodrómica en metros entre dos puntos geográficos
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Lee la configuración de geocerca desde localStorage con respaldo por defecto
 */
export function getStoredGeofenceConfig(): GeofenceConfig {
  if (typeof window === 'undefined') return DEFAULT_GEOFENCE_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GEOFENCE);
    if (!raw) return DEFAULT_GEOFENCE_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_GEOFENCE_CONFIG.enabled,
      latitude: typeof parsed.latitude === 'number' ? parsed.latitude : DEFAULT_GEOFENCE_CONFIG.latitude,
      longitude: typeof parsed.longitude === 'number' ? parsed.longitude : DEFAULT_GEOFENCE_CONFIG.longitude,
      radiusMeters: typeof parsed.radiusMeters === 'number' ? parsed.radiusMeters : DEFAULT_GEOFENCE_CONFIG.radiusMeters,
      bypassInDev: typeof parsed.bypassInDev === 'boolean' ? parsed.bypassInDev : DEFAULT_GEOFENCE_CONFIG.bypassInDev,
      branchName: parsed.branchName || DEFAULT_GEOFENCE_CONFIG.branchName,
    };
  } catch {
    return DEFAULT_GEOFENCE_CONFIG;
  }
}

/**
 * Guarda y emite evento reactivo de cambio de configuración
 */
export function saveStoredGeofenceConfig(config: GeofenceConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_GEOFENCE, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('gastropulse_geofence_changed', { detail: config }));
  } catch (err) {
    console.error('Error al guardar configuración de geocerca:', err);
  }
}

/**
 * Detecta si la aplicación se ejecuta en un host local de desarrollo
 */
export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    process.env.NODE_ENV === 'development'
  );
}

/**
 * Valida la ubicación física del comensal contra la geocerca del restaurante.
 * Diseñado con protección contra falsos positivos y bypass inteligente en desarrollo.
 */
export async function validateDinerGeofence(
  overrideConfig?: Partial<GeofenceConfig>
): Promise<GeofenceValidationResult> {
  const config: GeofenceConfig = { ...getStoredGeofenceConfig(), ...overrideConfig };

  // 1. Si la geocerca está desactivada en administración
  if (!config.enabled) {
    return {
      allowed: true,
      distanceMeters: 0,
      maxAllowedMeters: config.radiusMeters,
      reason: 'geofence_disabled',
      message: 'Geocerca desactivada por la administración del restaurante.'
    };
  }

  // 2. Si estamos en desarrollo local y está activo el bypass
  if (config.bypassInDev && isLocalEnvironment()) {
    return {
      allowed: true,
      distanceMeters: 5,
      maxAllowedMeters: config.radiusMeters,
      reason: 'sandbox_dev_bypass',
      message: 'Modo Desarrollo / Simulación Local: Pedido autorizado sin restricción GPS.',
      userCoords: {
        latitude: config.latitude,
        longitude: config.longitude,
        accuracy: 5
      }
    };
  }

  // 3. Verificación de soporte de Geolocation en el navegador
  if (typeof window === 'undefined' || !navigator.geolocation) {
    if (isLocalEnvironment()) {
      return {
        allowed: true,
        distanceMeters: 0,
        maxAllowedMeters: config.radiusMeters,
        reason: 'sandbox_dev_bypass',
        message: 'Dispositivo sin GPS nativo. Aprobado en entorno de pruebas.'
      };
    }
    return {
      allowed: false,
      distanceMeters: -1,
      maxAllowedMeters: config.radiusMeters,
      reason: 'unsupported_device',
      message: 'Tu navegador no soporta geolocalización para validar pedidos en mesa.'
    };
  }

  // 4. Solicitar coordenadas reales con timeout seguro de 8 segundos
  return new Promise<GeofenceValidationResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 10;
        const distance = calculateHaversineDistance(userLat, userLon, config.latitude, config.longitude);

        if (distance <= config.radiusMeters) {
          resolve({
            allowed: true,
            distanceMeters: distance,
            maxAllowedMeters: config.radiusMeters,
            reason: 'valid_inside_radius',
            message: `Ubicación verificada en el local (a ${distance}m de la sede).`,
            userCoords: {
              latitude: userLat,
              longitude: userLon,
              accuracy
            }
          });
        } else {
          resolve({
            allowed: false,
            distanceMeters: distance,
            maxAllowedMeters: config.radiusMeters,
            reason: 'outside_radius',
            message: `Estás a ${distance}m del restaurante. El límite máximo permitido en mesa es ${config.radiusMeters}m.`,
            userCoords: {
              latitude: userLat,
              longitude: userLon,
              accuracy
            }
          });
        }
      },
      (error) => {
        if (config.bypassInDev && isLocalEnvironment()) {
          resolve({
            allowed: true,
            distanceMeters: 0,
            maxAllowedMeters: config.radiusMeters,
            reason: 'sandbox_dev_bypass',
            message: 'Permiso GPS no concedido, pero autorizado por Bypass de Desarrollo.'
          });
          return;
        }

        let msg = 'No pudimos verificar tu ubicación física.';
        let reason: GeofenceValidationResult['reason'] = 'permission_denied';

        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Debes conceder permisos de ubicación al navegador para enviar el pedido desde tu mesa.';
          reason = 'permission_denied';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Tiempo de espera agotado al consultar el GPS. Verifica la señal de tu celular.';
          reason = 'timeout';
        }

        resolve({
          allowed: false,
          distanceMeters: -1,
          maxAllowedMeters: config.radiusMeters,
          reason,
          message: msg
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 15000
      }
    );
  });
}
