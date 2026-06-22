import React, { createContext, useContext, useEffect, useState } from 'react';
import { Booking, Experiment, InventoryItem, Role, User } from '../types';
import { mockExperiments, mockInventory } from '../lib/mockData';

// SILA MASUKKAN URL GOOGLE SCRIPT CIKGU DI BAWAH INI:
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwSnIL8EVPYdyFcH8RLR-KB7olxDBsq5TVJ3y4muYkYrErf9oTCL5aA8w8cRuj15Zu-xg/exec';

type DataContextType = {
  experiments: Experiment[];
  inventory: InventoryItem[];
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id' | 'status' | 'created_at'>) => Promise<boolean>;
  updateBookingStatus: (
    id: string,
    status: 'Approved' | 'Rejected',
    catatan_makmal?: string,
    approved_by?: string
  ) => void;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const LS_BOOKINGS = 'smartlab_bookings';
const LS_INVENTORY = 'smartlab_inventory';
const LS_EXPERIMENTS = 'smartlab_experiments';
const LS_USERS = 'smartlab_users';

function mergeExperiments(primary: Experiment[], fallback: Experiment[]): Experiment[] {
  const byId = new Map<string, Experiment>();

  // Keep fallback data first, then let primary data override if the id already exists.
  fallback.forEach((exp) => byId.set(exp.id, exp));
  primary.forEach((exp) => byId.set(exp.id, exp));

  return Array.from(byId.values()).sort((a, b) => {
    if (a.tingkatan !== b.tingkatan) return a.tingkatan - b.tingkatan;
    if (a.bab !== b.bab) return a.bab - b.bab;
    return a.tajuk.localeCompare(b.tajuk, 'ms');
  });
}

const formatBookingDate = (dateStr: string) => {
  try {
    return new Intl.DateTimeFormat('ms-MY', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const getAppBaseUrl = () => {
  const configuredUrl = (import.meta.env.VITE_APP_URL || '').trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [experiments, setExperiments] = useState<Experiment[]>(mockExperiments);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // 1) Restore dari LocalStorage dulu (supaya refresh tak hilang)
  useEffect(() => {
    try {
      const storedBookings = localStorage.getItem(LS_BOOKINGS);
      if (storedBookings) setBookings(JSON.parse(storedBookings));

      const storedInventory = localStorage.getItem(LS_INVENTORY);
      if (storedInventory) setInventory(JSON.parse(storedInventory));

      const storedExperiments = localStorage.getItem(LS_EXPERIMENTS);
      if (storedExperiments) {
        const parsedExperiments = JSON.parse(storedExperiments);
        if (Array.isArray(parsedExperiments)) {
          setExperiments(mergeExperiments(parsedExperiments, mockExperiments));
        }
      }

      const storedUsers = localStorage.getItem(LS_USERS);
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        if (Array.isArray(parsedUsers)) {
          setUsers(parsedUsers);
        }
      }
    } catch (e) {
      console.error('LocalStorage read failed:', e);
    }
  }, []);

  // 2) Sync dari Google Sheets (kalau ada)
  useEffect(() => {
    fetch(GOOGLE_SCRIPT_URL)
      .then((res) => res.json())
      .then((data) => {
        if (data.bookings) {
          setBookings(data.bookings);
          localStorage.setItem(LS_BOOKINGS, JSON.stringify(data.bookings));
        }

        if (Array.isArray(data.users)) {
          setUsers(data.users);
          localStorage.setItem(LS_USERS, JSON.stringify(data.users));
        }

        if (data.inventory && data.inventory.length > 0) {
          setInventory(data.inventory);
          localStorage.setItem(LS_INVENTORY, JSON.stringify(data.inventory));
        } else {
          setInventory(mockInventory);
          localStorage.setItem(LS_INVENTORY, JSON.stringify(mockInventory));
          syncInventoryToDB(mockInventory);
        }

        if (data.experiments && data.experiments.length > 0) {
          const mergedExperiments = mergeExperiments(data.experiments, mockExperiments);
          setExperiments(mergedExperiments);
          localStorage.setItem(LS_EXPERIMENTS, JSON.stringify(mergedExperiments));

          // Push back any newly introduced local experiments so cloud data stays current.
          if (mergedExperiments.length > data.experiments.length) {
            syncExperimentsToDB(mergedExperiments);
          }
        } else {
          setExperiments(mockExperiments);
          localStorage.setItem(LS_EXPERIMENTS, JSON.stringify(mockExperiments));
          syncExperimentsToDB(mockExperiments);
        }
      })
      .catch((err) => {
        console.error('Gagal ambil dari Google Sheets:', err);
        setExperiments((current) => (current.length > 0 ? current : mockExperiments));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncInventoryToDB = async (inv: InventoryItem[]) => {
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'syncInventori', inventory: inv }),
      });
    } catch (e) {
      console.error('syncInventori gagal:', e);
    }
  };

  const syncExperimentsToDB = async (exp: Experiment[]) => {
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'syncEksperimen', experiments: exp }),
      });
    } catch (e) {
      console.error('syncEksperimen gagal:', e);
    }
  };

  const saveInventory = (newInventory: InventoryItem[]) => {
    setInventory(newInventory);
    localStorage.setItem(LS_INVENTORY, JSON.stringify(newInventory));
    syncInventoryToDB(newInventory);
  };

  const fetchLatestUsers = async (forceRefresh = false): Promise<User[]> => {
    if (!forceRefresh && users.length > 0) {
      return users;
    }

    try {
      const res = await fetch(GOOGLE_SCRIPT_URL);
      const data = await res.json();

      if (Array.isArray(data.users)) {
        setUsers(data.users);
        localStorage.setItem(LS_USERS, JSON.stringify(data.users));
        return data.users;
      }
    } catch (e) {
      console.error('Gagal ambil data users terkini:', e);
    }

    return users;
  };

  const getRecipientEmailsByRole = (allUsers: User[], roles: Role[]) => {
    const byRole = allUsers
      .filter((u) => roles.includes(u.role))
      .map((u) => (u.email || '').trim().toLowerCase())
      .filter((email) => email.length > 0);

    return Array.from(new Set(byRole));
  };

  const sendEmail = async (to: string, subject: string, html: string) => {
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, subject, html }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Email API gagal');
      }
    } catch (e) {
      console.error(`Gagal hantar email kepada ${to}:`, e);
    }
  };

  const sendBulkEmails = async (emails: string[], subject: string, html: string) => {
    const recipients = Array.from(new Set(emails.filter(Boolean)));
    if (recipients.length === 0) return;

    await Promise.allSettled(recipients.map((to) => sendEmail(to, subject, html)));
  };

  const sendPushToRoles = async (
    roles: Role[],
    title: string,
    body: string,
    url: string,
    booking: Booking
  ) => {
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'sendPushToRoles',
          roles,
          notification: {
            title,
            body,
            url,
          },
          booking: {
            id: booking.id,
            guru_name: booking.guru_name,
            eksperimen_tajuk: booking.eksperimen_tajuk,
            tarikh: booking.tarikh,
            masa: booking.masa,
            status: booking.status,
          },
        }),
      });
    } catch (error) {
      console.error('Gagal trigger push notification:', error);
    }
  };

  const buildProfessionalEmailHtml = ({
    title,
    intro,
    booking,
    catatanMakmal,
  }: {
    title: string;
    intro: string;
    booking: Booking;
    catatanMakmal?: string;
  }) => {
    const kelas = [booking.tingkatan, booking.kelas].filter(Boolean).join(' ');
    const tarikhPaparan = formatBookingDate(booking.tarikh);
    const statusLabel =
      booking.status === 'Approved'
        ? 'Diluluskan'
        : booking.status === 'Rejected'
        ? 'Ditolak'
        : 'Menunggu';
    const appUrl = getAppBaseUrl();
    const bookingListUrl = `${appUrl}/tempahan`;

    return `
      <div style="background:#f3f4f6;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#111827;">
        <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <div style="background:#0f172a;padding:18px 24px;">
            <div style="font-size:18px;font-weight:700;color:#ffffff;">Smart Lab</div>
            <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">Sistem Tempahan Makmal Sains</div>
          </div>

          <div style="padding:24px;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">${escapeHtml(title)}</h2>
            <p style="margin:0 0 18px;line-height:1.6;color:#334155;">${intro}</p>

            <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;">
              <tbody>
                <tr>
                  <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:600;width:38%;">Nama Guru</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(booking.guru_name)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:600;">Eksperimen/Aktiviti</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(booking.eksperimen_tajuk)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:600;">Tarikh</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(tarikhPaparan)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:600;">Masa</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(booking.masa)}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:600;">Kelas</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(kelas || '-')}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:600;">Makmal</td>
                  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(booking.makmal || '-')}</td>
                </tr>
                <tr>
                  <td style="padding:10px 12px;background:#f8fafc;font-weight:600;">Status</td>
                  <td style="padding:10px 12px;">${escapeHtml(statusLabel)}</td>
                </tr>
              </tbody>
            </table>

            ${catatanMakmal ? `<p style="margin:16px 0 0;line-height:1.6;color:#334155;"><strong>Catatan Makmal:</strong> ${escapeHtml(catatanMakmal)}</p>` : ''}

            <div style="margin:20px 0 0;">
              <a
                href="${escapeHtml(bookingListUrl)}"
                style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;"
              >
                Buka Smart Lab Untuk Tindakan Lanjut
              </a>
              <p style="margin:10px 0 0;color:#64748b;font-size:12px;word-break:break-all;">Jika butang tidak berfungsi, salin pautan ini: ${escapeHtml(bookingListUrl)}</p>
            </div>

            <p style="margin:18px 0 0;line-height:1.6;color:#334155;">Email ini dijana secara automatik oleh sistem Smart Lab.</p>
          </div>
        </div>
      </div>
    `;
  };

  const notifyNewBooking = async (booking: Booking) => {
    const allUsers = await fetchLatestUsers(true);
    const recipients = getRecipientEmailsByRole(allUsers, ['Pembantu Makmal', 'Ketua Panitia']);
    const appUrl = getAppBaseUrl();

    const subject = `[Smart Lab] Tempahan Baru - ${booking.guru_name}`;
    const html = buildProfessionalEmailHtml({
      title: 'Makluman Tempahan Baru',
      intro: `Tempahan baharu telah dibuat oleh ${escapeHtml(booking.guru_name)} dan memerlukan perhatian pihak berkaitan.`,
      booking,
    });

    await Promise.allSettled([
      sendBulkEmails(recipients, subject, html),
      sendPushToRoles(
        ['Pembantu Makmal', 'Ketua Panitia'],
        'Tempahan Baru Smart Lab',
        `${booking.guru_name} membuat tempahan ${booking.eksperimen_tajuk} pada ${booking.tarikh} ${booking.masa}.`,
        `${appUrl}/tempahan?status=Pending`,
        booking
      ),
    ]);
  };

  const notifyBookingStatusUpdate = async (
    booking: Booking,
    status: 'Approved' | 'Rejected',
    catatanMakmal?: string
  ) => {
    const allUsers = await fetchLatestUsers(true);
    const ketuaEmails = getRecipientEmailsByRole(allUsers, ['Ketua Panitia']);
    const recipients = Array.from(new Set([(booking.guru_email || '').trim().toLowerCase(), ...ketuaEmails].filter(Boolean)));

    const statusText = status === 'Approved' ? 'Diluluskan' : 'Ditolak';
    const subject = `[Smart Lab] Tempahan ${statusText} - ${booking.eksperimen_tajuk}`;
    const html = buildProfessionalEmailHtml({
      title: `Status Tempahan: ${statusText}`,
      intro: `Tempahan oleh ${escapeHtml(booking.guru_name)} telah ${statusText.toLowerCase()}.`,
      booking: { ...booking, status },
      catatanMakmal,
    });

    await sendBulkEmails(recipients, subject, html);
  };

  const addBooking = async (
    bookingData: Omit<Booking, 'id' | 'status' | 'created_at'>
  ): Promise<boolean> => {
    const newBooking: Booking = {
      ...bookingData,
      id: `b${Date.now()}`,
      status: 'Pending',
      created_at: new Date().toISOString(),
    };

    // Simpan ke Sheets dahulu supaya pengguna tidak menerima kejayaan palsu.
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add', booking: newBooking }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status !== 'success' && result.ok !== true) {
        throw new Error(result.message || result.error || 'Simpanan ditolak oleh Google Apps Script');
      }
    } catch (error) {
      console.error('Gagal hantar ke Google Sheets:', error);
      return false;
    }

    setBookings((currentBookings) => {
      const newBookingsList = [...currentBookings, newBooking];
      localStorage.setItem(LS_BOOKINGS, JSON.stringify(newBookingsList));
      return newBookingsList;
    });

    // Tempahan sudah selamat disimpan; notifikasi tidak perlu menahan UI.
    void notifyNewBooking(newBooking);
    return true;
  };

  const updateBookingStatus = async (
    id: string,
    status: 'Approved' | 'Rejected',
    catatan_makmal?: string,
    approved_by?: string
  ) => {
    const booking = bookings.find((b) => b.id === id);

    const updatedBookings = bookings.map((b) =>
      b.id === id ? { ...b, status, catatan_makmal, approved_by: status === 'Approved' ? approved_by : undefined } : b
    );
    setBookings(updatedBookings);
    localStorage.setItem(LS_BOOKINGS, JSON.stringify(updatedBookings));

    // Tolak inventori bila Approved
    if (booking && status === 'Approved') {
      let currentInventory = [...inventory];

      booking.senarai_bahan.forEach((bahan: any) => {
        const itemIndex = currentInventory.findIndex((i) => i.nama_item === bahan.nama);
        if (itemIndex >= 0) currentInventory[itemIndex].kuantiti_stok -= bahan.kuantiti;
      });

      booking.senarai_radas.forEach((radas: any) => {
        const itemIndex = currentInventory.findIndex((i) => i.nama_item === radas.nama);
        if (itemIndex >= 0) currentInventory[itemIndex].kuantiti_stok -= radas.kuantiti;
      });

      saveInventory(currentInventory);
    }

    // Hantar status ke Sheets
    let isStatusUpdated = false;
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateStatus',
          id,
          status,
          catatan_makmal: catatan_makmal || '',
          approved_by: approved_by || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      isStatusUpdated = true;
    } catch (error) {
      console.error('Gagal kemaskini Google Sheets:', error);
    }

    if (!isStatusUpdated) {
      console.warn('Notifikasi emel status dibatalkan kerana kemaskini ke Google Sheets gagal.');
      return;
    }

    if (booking) {
      await notifyBookingStatusUpdate(booking, status, catatan_makmal);
    }
  };

  const value = { experiments, inventory, bookings, addBooking, updateBookingStatus };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
