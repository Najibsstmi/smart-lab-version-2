import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app } from './firebase';

type PushUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const LS_PUSH_TOKEN = 'smartlab_push_token';

type PushRegisterResult = {
  ok: boolean;
  reason?: string;
};

function isSecurePushContext() {
  return window.isSecureContext || window.location.hostname === 'localhost';
}

export function getPushReadinessReason() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return 'Peranti/browser tidak menyokong push notification.';
  }

  if (!isSecurePushContext()) {
    return 'Push notification perlukan HTTPS (atau localhost semasa pembangunan).';
  }

  return '';
}

export async function registerPushForUser(
  user: PushUser,
  googleScriptUrl: string,
  opts?: { promptPermission?: boolean }
): Promise<PushRegisterResult> {
  try {
    if (user.role === 'Guru') {
      return { ok: false, reason: 'Role guru tidak perlu push token.' };
    }

    const readinessReason = getPushReadinessReason();
    if (readinessReason) {
      return { ok: false, reason: readinessReason };
    }

    const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim();
    if (!vapidKey) {
      console.warn('VITE_FIREBASE_VAPID_KEY belum diset. Push notification tidak aktif.');
      return { ok: false, reason: 'VAPID key belum diset.' };
    }

    const supported = await isSupported();
    if (!supported) {
      return { ok: false, reason: 'Firebase messaging tidak disokong pada browser ini.' };
    }

    let permission = Notification.permission;
    if (permission === 'default' && opts?.promptPermission) {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return { ok: false, reason: 'Kebenaran notifikasi belum diberikan.' };
    }

    const registration = await navigator.serviceWorker.ready;
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return { ok: false, reason: 'Token notifikasi tidak berjaya dijana.' };
    }

    const previousToken = localStorage.getItem(LS_PUSH_TOKEN);
    if (previousToken === token) {
      return { ok: true };
    }

    localStorage.setItem(LS_PUSH_TOKEN, token);

    await fetch(googleScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'registerPushToken',
        user_id: user.id,
        email: user.email,
        role: user.role,
        token,
        platform: 'web',
      }),
    });

    return { ok: true };
  } catch (error) {
    console.error('Pendaftaran push notification gagal:', error);
    return { ok: false, reason: 'Pendaftaran push gagal. Sila semak konfigurasi Firebase.' };
  }
}
