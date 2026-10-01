// ============================================================
// PANTALLA DE ACCESO — "Los Últimos Reinos"
// ------------------------------------------------------------
// Es la primera pantalla que ve el jugador. Aquí decide:
//   • Entrar con su cuenta de Google (recomendado: su partida
//     queda guardada a nombre de su correo, y podrá recuperarla
//     desde cualquier ordenador si activas Google Drive).
//   • O jugar como invitado (la partida se guarda solo en este
//     navegador; si borras los datos del navegador, se pierde).
//
// ¿CÓMO FUNCIONA EL BOTÓN DE GOOGLE?
//   Usamos "Google Identity Services" (GIS), la librería oficial.
//   No necesita backend: Google nos devuelve un token con el
//   nombre/correo/foto del usuario y nosotros lo desciframos aquí
//   mismo en el navegador (función parseCredential en lib/auth.ts).
//
// ⚠️ IMPORTANTE: para que el botón aparezca, en src/lib/auth.ts
//    debes pegar un GOOGLE_CLIENT_ID válido. Mientras siga poniendo
//    'PEGA_AQUI_TU_GOOGLE_CLIENT_ID', verás solo el modo invitado
//    y un aviso explicándote qué falta.
// ============================================================

import { useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID, type PlayerAccount } from '../lib/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

interface Props {
  /** Se llama cuando el jugador entra con Google. */
  onLogin: (account: PlayerAccount) => void;
  /** Se llama cuando el jugador elige seguir sin cuenta. */
  onGuest: () => void;
}

/** Devuelve true si el Client ID todavía no fue configurado por el autor. */
export function isGoogleConfigured(): boolean {
  return GOOGLE_CLIENT_ID !== 'PEGA_AQUI_TU_GOOGLE_CLIENT_ID' && GOOGLE_CLIENT_ID.length > 10;
}

export default function LoginScreen({ onLogin, onGuest }: Props) {
  /** Abre el popup de Google y entrega la cuenta al recibir el token. */
  const loginWithGoogle = () => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) return; // librería aún no cargada
    google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (resp: { access_token?: string; error?: string }) => {
        if (resp.error || !resp.access_token) return;
        // Con el access token pedimos identidad: correo, nombre y foto.
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${resp.access_token}` },
        })
          .then((r) => r.json())
          .then((u: { email?: string; name?: string; picture?: string; sub: string }) => {
            onLogin({
              email: u.email ?? 'cuenta-sin-correo',
              name: u.name ?? 'Aventero anónimo',
              picture: u.picture,
              sub: u.sub,
            });
          });
      },
    }).requestAccessToken();
  };

  useEffect(() => {
    if (!isGoogleConfigured()) return; // sin credencial → solo modo invitado

    // Cargamos la librería oficial "Google Identity Services" una sola vez.
    const SCRIPT_ID = 'google-gis-script';
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement('script');
      s.id = SCRIPT_ID;
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="parchment-panel w-full max-w-md text-center space-y-2">
        <CardHeader>
          <CardTitle className="font-display text-3xl text-gold-gradient">⚜️ Los Últimos Reinos</CardTitle>
          <CardDescription className="text-sm">
            Reclama tu linaje. Tu honor, tus tierras y tus cicatrices quedarán escritos en las crónicas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGoogleConfigured() ? (
            <>
              {/* Botón oficial de acceso con Google */}
              <Button className="w-full shadow-gold" onClick={loginWithGoogle}>
                <span aria-hidden>🔑</span>&nbsp; Continuar con Google
              </Button>
              <p className="text-xs text-muted-foreground">
                Tu partida quedará guardada a nombre de tu correo de Google y podrás retomarla en cualquier dispositivo.
              </p>
            </>
          ) : (
            <div className="rounded-sm border border-gold/40 bg-gold/5 p-3 text-xs text-left space-y-1">
              <p className="font-display text-gold">ℹ️ Acceso con Google pendiente de configurar</p>
              <p>
                Para activarlo, abre <code>src/lib/auth.ts</code> y pega tu <b>Google Client ID</b> en la constante{' '}
                <code>GOOGLE_CLIENT_ID</code>. Se obtiene gratis en{' '}
                <a className="underline" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">
                  Google Cloud Console → Credenciales
                </a>{' '}
                (tipo «Web», con tu dominio en orígenes autorizados de JavaScript).
              </p>
            </div>
          )}

          <div className="ornament-line" aria-hidden />

          <Button variant="outline" className="w-full" onClick={onGuest}>
            🕯️ Entrar como invitado
          </Button>
          <p className="text-xs text-muted-foreground">
            El progreso se guardará solo en este navegador. Recomendado para probar el juego.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
