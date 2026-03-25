# Google Apps Script Setup Untuk Push Notification

Dokumen ini menerangkan action yang perlu ditambah dalam Google Apps Script supaya push notification telefon berfungsi bersama Smart Lab.

## 1) Sediakan sheet baru

Dalam Google Sheet backend, buat sheet bernama:

push_tokens

Header baris pertama:

- user_id
- email
- role
- token
- platform
- updated_at

## 2) Tambah action baru dalam doPost(e)

Tambah blok case ini ke switch action anda:

```javascript
case 'registerPushToken':
  return jsonOut(registerPushToken(payload));

case 'sendPushToRoles':
  return jsonOut(sendPushToRoles(payload));
```

Jika anda belum ada helper jsonOut:

```javascript
function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3) Fungsi simpan token

```javascript
function registerPushToken(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('push_tokens') || ss.insertSheet('push_tokens');

  if (sh.getLastRow() === 0) {
    sh.appendRow(['user_id', 'email', 'role', 'token', 'platform', 'updated_at']);
  }

  var userId = String(payload.user_id || '').trim();
  var email = String(payload.email || '').trim().toLowerCase();
  var role = String(payload.role || '').trim();
  var token = String(payload.token || '').trim();
  var platform = String(payload.platform || 'web').trim();

  if (!userId || !email || !role || !token) {
    return { ok: false, error: 'Missing required fields' };
  }

  var values = sh.getDataRange().getValues();
  var now = new Date().toISOString();
  var foundRow = -1;

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === userId && String(values[i][3]) === token) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow > 0) {
    sh.getRange(foundRow, 1, 1, 6).setValues([[userId, email, role, token, platform, now]]);
  } else {
    sh.appendRow([userId, email, role, token, platform, now]);
  }

  return { ok: true };
}
```

## 4) Fungsi hantar push ikut role

```javascript
function sendPushToRoles(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('push_tokens');
  if (!sh) return { ok: false, error: 'push_tokens sheet not found' };

  var roles = payload.roles || [];
  var notif = payload.notification || {};

  var title = String(notif.title || 'Smart Lab');
  var body = String(notif.body || 'Tempahan baru memerlukan tindakan.');
  var url = String(notif.url || '');

  var rows = sh.getDataRange().getValues();
  var tokens = [];

  for (var i = 1; i < rows.length; i++) {
    var role = String(rows[i][2] || '');
    var token = String(rows[i][3] || '');
    if (roles.indexOf(role) !== -1 && token) {
      tokens.push(token);
    }
  }

  tokens = Array.from(new Set(tokens));
  if (tokens.length === 0) {
    return { ok: true, sent: 0 };
  }

  var sent = 0;
  var failed = 0;
  var errors = [];

  for (var t = 0; t < tokens.length; t++) {
    var result = sendFcmV1Message_(tokens[t], title, body, url);
    if (result.ok) {
      sent++;
    } else {
      failed++;
      errors.push(result.error);
    }
  }

  return { ok: failed === 0, sent: sent, failed: failed, errors: errors };
}
```

## 5) Fungsi hantar ke FCM HTTP v1

```javascript
function sendFcmV1Message_(token, title, body, url) {
  try {
    var projectId = 'senismartlab';
    var endpoint = 'https://fcm.googleapis.com/v1/projects/' + projectId + '/messages:send';

    var payload = {
      message: {
        token: token,
        notification: {
          title: title,
          body: body
        },
        webpush: {
          notification: {
            title: title,
            body: body,
            icon: '/icons/icon-192.png'
          },
          fcm_options: {
            link: url
          }
        },
        data: {
          url: url
        }
      }
    };

    var response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return { ok: true };
    }

    return { ok: false, error: response.getContentText() };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
```

## 6) Keizinan IAM penting

Agar ScriptApp.getOAuthToken boleh hantar ke FCM:

1. Buka Google Cloud Console untuk project senismartlab.
2. Cari service account Apps Script anda.
3. Beri role sekurang-kurangnya Firebase Admin atau Firebase Cloud Messaging API Admin.
4. Pastikan Firebase Cloud Messaging API diaktifkan.

## 7) Deploy semula Apps Script

Selepas tambah kod:

1. Deploy as Web app semula.
2. Pastikan URL deployment sama yang digunakan oleh aplikasi.

## 8) Ujian ringkas

1. Login sebagai Pembantu Makmal di telefon dan benarkan notification.
2. Buat tempahan baru sebagai Guru.
3. Pastikan action sendPushToRoles dipanggil dan notification masuk.
