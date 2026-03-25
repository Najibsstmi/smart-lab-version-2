// ==============================
// TETAPAN EMEL
// ==============================
var EMAIL_KETUA_PANITIA = 'najibnoor87@gmail.com';

// Email statik lama masih boleh dikekalkan jika mahu
var EMAIL_PEMBANTU_MAKMAL = [
  'faridbinnasir@yahoo.com',
  'ieffamanan@gmail.com'
];

// ==============================
// TETAPAN FCM
// ==============================
var FCM_PROJECT_ID = 'senismartlab';

// ==============================
// UTILITI ASAS
// ==============================
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers) sheet.appendRow(headers);
  }
  return sheet;
}

function readSheetData(sheet) {
  if (!sheet) return [];
  var dataRange = sheet.getDataRange().getValues();
  var result = [];

  for (var i = 1; i < dataRange.length; i++) {
    if (dataRange[i][1]) {
      try {
        result.push(JSON.parse(dataRange[i][1]));
      } catch (e) {}
    }
  }

  return result;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function hashPassword(password) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );

  return raw.map(function (b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function uniqueEmails_(arr) {
  return arr.filter(function (email, index, self) {
    return email && self.indexOf(email) === index;
  });
}

function getPembantuMakmalEmails(sheetPengguna) {
  var users = readSheetData(sheetPengguna);
  var emails = [];

  for (var i = 0; i < users.length; i++) {
    var user = users[i];

    if (
      user.role &&
      user.role.toString().trim() === 'Pembantu Makmal' &&
      user.email
    ) {
      emails.push(user.email.toString().trim());
    }
  }

  return emails;
}

// ==============================
// PUSH TOKEN + FCM
// ==============================
function registerPushToken_(sheetPushTokens, payload) {
  var userId = String(payload.user_id || '').trim();
  var email = String(payload.email || '').trim().toLowerCase();
  var role = String(payload.role || '').trim();
  var token = String(payload.token || '').trim();
  var platform = String(payload.platform || 'web').trim();

  if (!userId || !email || !role || !token) {
    return { ok: false, error: 'Missing required fields' };
  }

  var values = sheetPushTokens.getDataRange().getValues();
  var now = new Date().toISOString();
  var foundRow = -1;

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === userId && String(values[i][3]) === token) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow > 0) {
    sheetPushTokens
      .getRange(foundRow, 1, 1, 6)
      .setValues([[userId, email, role, token, platform, now]]);
  } else {
    sheetPushTokens.appendRow([userId, email, role, token, platform, now]);
  }

  return { ok: true };
}

function getPushTokensByRoles_(sheetPushTokens, roles) {
  var rows = sheetPushTokens.getDataRange().getValues();
  var tokens = [];

  for (var i = 1; i < rows.length; i++) {
    var role = String(rows[i][2] || '').trim();
    var token = String(rows[i][3] || '').trim();

    if (roles.indexOf(role) !== -1 && token) {
      tokens.push(token);
    }
  }

  return Array.from(new Set(tokens));
}

function sendFcmV1Message_(token, title, body, url) {
  try {
    var endpoint =
      'https://fcm.googleapis.com/v1/projects/' +
      FCM_PROJECT_ID +
      '/messages:send';

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

function sendPushToRoles_(sheetPushTokens, payload) {
  var roles = payload.roles || [];
  var notif = payload.notification || {};

  var title = String(notif.title || 'Smart Lab').trim();
  var body = String(notif.body || 'Tempahan baru memerlukan tindakan.').trim();
  var url = String(notif.url || '').trim();

  if (!roles.length) {
    return { ok: false, error: 'Missing roles' };
  }

  var tokens = getPushTokensByRoles_(sheetPushTokens, roles);
  if (tokens.length === 0) {
    return { ok: true, sent: 0, failed: 0, errors: [] };
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

// ==============================
// POST
// ==============================
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var sheetTempahan = getOrCreateSheet(ss, 'Tempahan', ['ID', 'Data JSON']);
    var sheetPengguna = getOrCreateSheet(ss, 'Pengguna', ['ID', 'Data JSON']);
    var sheetInventori = getOrCreateSheet(ss, 'Inventori', ['ID', 'Data JSON']);
    var sheetEksperimen = getOrCreateSheet(ss, 'Eksperimen', ['ID', 'Data JSON']);
    var sheetPushTokens = getOrCreateSheet(ss, 'push_tokens', [
      'user_id',
      'email',
      'role',
      'token',
      'platform',
      'updated_at'
    ]);

    var data = JSON.parse(e.postData.contents || '{}');

    // ==============================
    // REGISTER PUSH TOKEN
    // ==============================
    if (data.action === 'registerPushToken') {
      return json_(registerPushToken_(sheetPushTokens, data));
    }

    // ==============================
    // SEND PUSH TO ROLES
    // ==============================
    if (data.action === 'sendPushToRoles') {
      return json_(sendPushToRoles_(sheetPushTokens, data));
    }

    // ==============================
    // REGISTER USER
    // ==============================
    if (data.action === 'registerUser') {
      var name = (data.name || '').toString().trim();
      var email = (data.email || '').toString().trim().toLowerCase();
      var role = (data.role || '').toString().trim();
      var password = (data.password || '').toString();

      if (!name || !email || !role || !password) {
        return json_({ ok: false, error: 'Missing fields' });
      }

      if (password.length < 4) {
        return json_({ ok: false, error: 'Password too short' });
      }

      var users = readSheetData(sheetPengguna);

      for (var i = 0; i < users.length; i++) {
        var existingEmail = (users[i].email || '').toString().toLowerCase();
        if (existingEmail === email) {
          return json_({ ok: false, error: 'Email already registered' });
        }
      }

      var id = 'u' + new Date().getTime();
      var passwordHash = hashPassword(password);

      var user = {
        id: id,
        name: name,
        email: email,
        role: role,
        password_hash: passwordHash,
        created_at: new Date().toISOString()
      };

      sheetPengguna.appendRow([user.id, JSON.stringify(user)]);

      return json_({
        ok: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    // ==============================
    // LOGIN USER
    // ==============================
    if (data.action === 'loginUser') {
      var email2 = (data.email || '').toString().trim().toLowerCase();
      var password2 = (data.password || '').toString();

      if (!email2 || !password2) {
        return json_({ ok: false, error: 'Missing fields' });
      }

      var users2 = readSheetData(sheetPengguna);
      var passwordHash2 = hashPassword(password2);

      for (var j = 0; j < users2.length; j++) {
        var u = users2[j];
        var rowEmail = (u.email || '').toString().toLowerCase();

        if (rowEmail === email2) {
          if ((u.password_hash || '') === passwordHash2) {
            return json_({
              ok: true,
              user: {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role
              }
            });
          } else {
            return json_({ ok: false, error: 'Wrong password' });
          }
        }
      }

      return json_({ ok: false, error: 'Email not found' });
    }

    // ==============================
    // CLEAR USERS (optional, hati-hati)
    // ==============================
    if (data.action === 'clearUsers') {
      var lastRowUsers = sheetPengguna.getLastRow();
      if (lastRowUsers > 1) {
        sheetPengguna.getRange(2, 1, lastRowUsers - 1, 2).clearContent();
      }
      return json_({ ok: true, cleared: Math.max(0, lastRowUsers - 1) });
    }

    // ==============================
    // ADD BOOKING
    // ==============================
    if (data.action === 'add') {
      sheetTempahan.appendRow([data.booking.id, JSON.stringify(data.booking)]);

      var subject = 'TEMPAHAN BARU: Makmal Sains (' + data.booking.guru_name + ')';
      var message =
        'Salam,\n\n' +
        'Terdapat satu tempahan makmal baru yang memerlukan tindakan/makluman anda.\n\n' +
        'Butiran Tempahan:\n' +
        'Guru: ' + data.booking.guru_name + '\n' +
        'Tarikh: ' + data.booking.tarikh + '\n' +
        'Masa: ' + data.booking.masa + '\n' +
        'Makmal: ' + data.booking.makmal + '\n' +
        'Eksperimen: ' + data.booking.eksperimen_tajuk + '\n\n' +
        'Sila log masuk ke sistem untuk melihat senarai penuh radas dan bahan.\n\n' +
        'Terima kasih.';

      // Ketua Panitia
      if (EMAIL_KETUA_PANITIA) {
        MailApp.sendEmail(EMAIL_KETUA_PANITIA, subject, message);
      }

      // Pembantu Makmal:
      // gabung email statik + email pembantu makmal yang daftar sendiri
      var pembantuMakmalEmails = getPembantuMakmalEmails(sheetPengguna);
      var semuaEmailPembantu = EMAIL_PEMBANTU_MAKMAL.concat(pembantuMakmalEmails);
      semuaEmailPembantu = uniqueEmails_(semuaEmailPembantu);

      if (semuaEmailPembantu.length > 0) {
        MailApp.sendEmail(semuaEmailPembantu.join(','), subject, message);
      }

      return json_({ status: 'success' });
    }

    // ==============================
    // UPDATE STATUS BOOKING
    // ==============================
    if (data.action === 'updateStatus') {
      var dataRange = sheetTempahan.getDataRange().getValues();

      for (var k = 1; k < dataRange.length; k++) {
        if (dataRange[k][0] == data.id) {
          var booking = JSON.parse(dataRange[k][1]);
          booking.status = data.status;
          booking.catatan_makmal = data.catatan_makmal;
          if (data.status === 'Approved' && data.approved_by) {
            booking.approved_by = data.approved_by;
          } else if (data.status === 'Rejected') {
            booking.approved_by = '';
          }

          sheetTempahan.getRange(k + 1, 2).setValue(JSON.stringify(booking));

          var statusText = booking.status === 'Approved' ? 'DILULUSKAN' : 'DITOLAK';
          var subject2 = 'STATUS TEMPAHAN ' + statusText + ': ' + booking.eksperimen_tajuk;
          var message2 =
            'Salam,\n\n' +
            'Status tempahan makmal berikut telah dikemaskini.\n\n' +
            'Butiran Tempahan:\n' +
            'Guru: ' + booking.guru_name + '\n' +
            'Eksperimen: ' + booking.eksperimen_tajuk + '\n' +
            'Tarikh: ' + booking.tarikh + '\n' +
            'Status Terkini: ' + statusText + '\n' +
            'Catatan Makmal: ' + (booking.catatan_makmal || 'Tiada catatan') + '\n\n' +
            'Terima kasih.';

          if (booking.guru_email) {
            MailApp.sendEmail(booking.guru_email, subject2, message2);
          }

          if (EMAIL_KETUA_PANITIA) {
            MailApp.sendEmail(EMAIL_KETUA_PANITIA, subject2, message2);
          }

          return json_({ status: 'success' });
        }
      }

      return json_({ status: 'error', message: 'Tempahan tidak dijumpai' });
    }

    // ==============================
    // SYNC INVENTORI
    // ==============================
    if (data.action === 'syncInventori') {
      sheetInventori.clear();
      sheetInventori.appendRow(['ID', 'Data JSON']);

      var invData = (data.inventory || []).map(function (item) {
        return [item.id, JSON.stringify(item)];
      });

      if (invData.length > 0) {
        sheetInventori.getRange(2, 1, invData.length, 2).setValues(invData);
      }

      return json_({ status: 'success' });
    }

    // ==============================
    // SYNC EKSPERIMEN
    // ==============================
    if (data.action === 'syncEksperimen') {
      sheetEksperimen.clear();
      sheetEksperimen.appendRow(['ID', 'Data JSON']);

      var expData = (data.experiments || []).map(function (item) {
        return [item.id, JSON.stringify(item)];
      });

      if (expData.length > 0) {
        sheetEksperimen.getRange(2, 1, expData.length, 2).setValues(expData);
      }

      return json_({ status: 'success' });
    }

    return json_({ status: 'error', message: 'Unknown action' });
  } catch (error) {
    return json_({ status: 'error', message: error.toString() });
  }
}

// ==============================
// GET
// ==============================
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var sheetTempahan = ss.getSheetByName('Tempahan');
    var sheetPengguna = ss.getSheetByName('Pengguna');
    var sheetInventori = ss.getSheetByName('Inventori');
    var sheetEksperimen = ss.getSheetByName('Eksperimen');

    var bookings = readSheetData(sheetTempahan);

    // Users untuk frontend: jangan hantar password_hash
    var usersRaw = readSheetData(sheetPengguna);
    var users = usersRaw.map(function (u) {
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        created_at: u.created_at
      };
    });

    var inventory = readSheetData(sheetInventori);
    var experiments = readSheetData(sheetEksperimen);

    return json_({
      bookings: bookings,
      users: users,
      inventory: inventory,
      experiments: experiments
    });
  } catch (error) {
    return json_({ error: error.toString() });
  }
}
