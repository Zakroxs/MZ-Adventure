// ============================================================
// AUTENTICACIÓN CON GOOGLE — "Los Últimos Reinos"
// ------------------------------------------------------------
// ¿Para qué sirve este archivo?
//   1. Iniciar sesión con la cuenta de Google del jugador.
//   2. Guardar SU partida asociada a esa cuenta (no al navegador),
//      así el progreso se conserva aunque cambie de ordenador.
//   3. Descargar/cargar la partida desde la nube de Google Drive
//      (opcional: solo si configuras las credenciales, ver README).
//
// ¿QUÉ NECESITAS EDITAR A MANO para que funcione de verdad?
//   - GOOGLE_CLIENT_ID: lo obtienes en https://console.cloud.google.com
//     (APIs y servicios → Credenciales → ID de cliente OAuth "Web").
//   - GOOGLE_CLIENT_ID es OBLIGATORIO para el botón "Iniciar sesión con Google".
//   - DRIVE_CLIENT_ID es OPCIONAL: sin él, la partida se guarda igualmente
//     en este navegador (localStorage) pero vinculada al correo de Google.
// ============================================================

import { jwtDecode } from 'jwt-decode';

// ⚠️ EDÍTAME: pega aquí tu "Client ID" de Google Cloud Console.
// Ejemplo real: '1234567890-abcde.apps.googleusercontent.com'
export const GOOGLE_CLIENT_ID = 'PEGA_AQUI_TU_GOOGLE_CLIENT_ID';

// ⚠️ EDÍTAME (OPCIONAL): segundo Client ID si quieres sincronizar con Google Drive.
// Si lo dejas vacío, la partida se guarda solo en este navegador (funciona igual).
export const DRIVE_CLIENT_ID = '';

/** Datos del jugador que llegan de Google (nombre, foto, correo único). */
export interface PlayerAccount {
  email: string;       // correo = identificador único de la partida
  name: string;        // nombre mostrado ("Sir Aldric")
  picture?: string;    // foto de perfil de Google
  sub: string;         // id interno estable de la cuenta Google
}

/** Decodifica el token que devuelve el botón de Google y extrae los datos. */
export function parseCredential(credentialJwt: string): PlayerAccount {
  // El token de Google es un JWT: una cadena con los datos del usuario codificados.
  const payload = jwtDecode<{ email?: string; name?: string; picture?: string; sub: string }>(credentialJwt);
  return {
    email: payload.email ?? 'cuenta-sin-correo',
    name: payload.name ?? 'Aventero anónimo',
    picture: payload.picture,
    sub: payload.sub,
  };
}

// ------------------------------------------------------------
// CLAVE DE GUARDADO POR CUENTA
// ------------------------------------------------------------
// Antes todo el mundo compartía UNA sola ranura de guardado.
// Ahora cada correo de Google tiene la suya: 'lur-save-<email>'.
// Así dos jugadores en el mismo PC no se pisan las partidas.

const SAVE_PREFIX = 'lur-save-';

export function saveKeyFor(account: PlayerAccount | null): string {
  // Sin sesión → ranura genérica (modo invitado / desarrollo local).
  return account ? `${SAVE_PREFIX}${account.email}` : 'lur-phase2-state-v1';
}

/** Guarda la partida (JSON) en el navegador, asociada a la cuenta. */
export function persistLocal(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('No se pudo guardar la partida en este navegador:', err);
  }
}

/** Lee la partida guardada para una clave concreta (o {} si no hay nada). */
export function loadLocal<T>(key: string): Partial<T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<T>) : {};
  } catch {
    return {};
  }
}

// ------------------------------------------------------------
// SINCRONIZACIÓN CON GOOGLE DRIVE (opcional)
// ------------------------------------------------------------
// La partida se guarda como archivo privado "los-ultimos-reinos-save.json"
// en la cuenta de Google del jugador (App Data Folder: no ocupa espacio
// visible ni necesita permisos de lectura de otros archivos).
//
// ¿CÓMO SE ACTIVA?
//   1. Consigue DRIVE_CLIENT_ID arriba (mismo proceso que GOOGLE_CLIENT_ID,
//      pero activando también la API "Google Drive" y el scope
//      https://www.googleapis.com/auth/drive.appdata).
//   2. Pega en index.html, justo antes de </head>, esta línea:
//      <script src="https://apis.google.com/js/api.js"></script>
//   3. Listo: al iniciar sesión aparecerá el botón "☁️ Guardar en Google Drive".

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const DRIVE_FILE_NAME = 'los-ultimos-reinos-save.json';
const DRIVE_MIME = 'application/json';

declare global {
  interface Window {
    gapi?: any;          // librería de Google APIs (la carga index.html)
    google?: any;        // librería Identity Services (la carga main.tsx/App)
  }
}

let driveAccessToken: string | null = null;
let driveReady = false;

/** Carga la librería gapi y prepara Drive. Se llama solo si hay DRIVE_CLIENT_ID. */
export function initDrive(): Promise<boolean> {
  if (!DRIVE_CLIENT_ID || !window.gapi) return Promise.resolve(false);
  return new Promise((resolve) => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({});
        driveReady = true;
      } catch (err) {
        console.error('Fallo al preparar Google Drive:', err);
      }
      resolve(driveReady);
    });
  });
}

/** Pide permiso de Drive tras iniciar sesión con Google (usa el mismo login popup). */
export function authorizeDrive(): Promise<string | null> {
  if (!driveReady || !window.google) return Promise.resolve(null);
  return new Promise((resolve) => {
    window.google.accounts.oauth2
      .initTokenClient({
        client_id: DRIVE_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (resp: { access_token?: string }) => {
          driveAccessToken = resp.access_token ?? null;
          resolve(driveAccessToken);
        },
      })
      .requestAccessToken();
  });
}

async function driveFetch(path: string, options: RequestInit = {}): Promise<Response | null> {
  if (!driveAccessToken) return null;
  return fetch(`https://www.googleapis.com/drive/v3/files${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${driveAccessToken}`, ...(options.headers ?? {}) },
  });
}

/** Busca el archivo de partida en Drive; devuelve su id o null. */
async function findDriveFileId(): Promise<string | null> {
  const q = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and appDataFolder`);
  const res = await driveFetch(`?spaces=appDataFolder&q=${q}&fields=files(id,name)`);
  if (!res?.ok) return null;
  const json = await res.json();
  return json.files?.[0]?.id ?? null;
}

/** Sube la partida (crea o reemplaza el archivo en el Drive privado del jugador). */
export async function uploadSaveToDrive(data: unknown): Promise<boolean> {
  if (!driveAccessToken) return false;
  const body = JSON.stringify(data);
  const existingId = await findDriveFileId();
  const url = existingId
    ? `https://www.googleapis.com/drive/v3/files/${existingId}?uploadType=media`
    : 'https://www.googleapis.com/drive/v3/files?uploadType=media';
  const res = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${driveAccessToken}`,
      'Content-Type': DRIVE_MIME,
    },
    body: existingId ? body : JSON.stringify({ name: DRIVE_FILE_NAME, parents: ['appDataFolder'] }),
  });
  // Para crear usamos multipart simple: si falló, reintento con metadata+datos juntos.
  if (!res.ok && !existingId) {
    const boundary = '-------lurBoundary';
    const mixed =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify({ name: DRIVE_FILE_NAME, parents: ['appDataFolder'] }) +
      `\r\n--${boundary}\r\nContent-Type: ${DRIVE_MIME}\r\n\r\n${body}\r\n--${boundary}--`;
    const retry = await fetch('https://www.googleapis.com/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${driveAccessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: mixed,
    });
    return retry.ok;
  }
  return res.ok;
}

/** Descarga la partida del Drive del jugador (null si no existe todavía). */
export async function downloadSaveFromDrive<T>(): Promise<Partial<T> | null> {
  if (!driveAccessToken) return null;
  const fileId = await findDriveFileId();
  if (!fileId) return null;
  const res = await driveFetch(`/${fileId}?alt=media`);
  if (!res?.ok) return null;
  try {
    return (await res.json()) as Partial<T>;
  } catch {
    return null;
  }
}
