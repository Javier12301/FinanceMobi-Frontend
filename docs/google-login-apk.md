# Google login en el APK — estado y pasos de dispositivo

## Qué quedó implementado (código, verificado en web)
- **Plugin**: `@capgo/capacitor-social-login@8.3.31` (compatible Capacitor 8; el clásico `@codetrix-studio/...` solo soporta Capacitor 6). `cap sync android` lo registró.
- **Frontend** (`src/features/auth/api/googleIdentity.ts`): `requestGoogleIdToken()` bifurca por plataforma:
  - Web → Google Identity Services (GIS) como antes.
  - Nativo (`Capacitor.isNativePlatform()`) → `SocialLogin.initialize({ google: { webClientId } })` + `SocialLogin.login({ provider:'google' })`, idToken desde `login.result.idToken`. Dynamic import → no pesa en web.
- **Audiencia**: `webClientId` = el **Web Client ID** existente (`...2fg6e7mq...`, en `VITE_GOOGLE_CLIENT_ID`). El idToken sale con `aud` = ese web id, y el backend ya lo valida con `GOOGLE_CLIENT_ID` (multi-audience ya soporta además `GOOGLE_ANDROID_CLIENT_ID` opcional). **No hubo que tocar el backend.**
- typecheck + build verdes; web sin cambios de comportamiento.

## Client IDs (proyecto 171866358561)
- **Web** (audiencia / webClientId): `171866358561-2fg6e7mqfbv5ve7k4kd4f3u504668e81.apps.googleusercontent.com`
- **Android** (creado por el usuario, solo debe existir en GCP): `171866358561-488h2d0vhqv9mpnturve530ilaeapkjn.apps.googleusercontent.com`

## Pasos en el dispositivo (lo que falta, no testeable desde acá)
1. En Google Cloud Console, el **Android OAuth client** debe tener el **package** `com.financemobile.app` y el **SHA-1** del keystore con el que se firma el APK.
   - Debug: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android` → copiar SHA1.
   - Release: usar el SHA-1 del keystore de firma real.
2. Compilar y correr: `npx cap open android` (Android Studio) o `npx cap run android`.
3. En el APK, configurar en Ajustes la **URL del servidor** (ej. `http://IP-LAN:3000`) — el login pega a `POST /api/auth/google`.
4. Probar el botón de Google → debe abrir el selector nativo y loguear.

## Errores típicos si falla en el device
- `auth 10` / respuesta en blanco → **SHA-1 no coincide** con el registrado en GCP (causa #1). Registrar el SHA-1 correcto.
- `aud` inválido → el `webClientId` debe ser el **Web** client id (no el Android). Ya está seteado así.
- Requiere una cuenta de Google agregada en el dispositivo/emulador.
