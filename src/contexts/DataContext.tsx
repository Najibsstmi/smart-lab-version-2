import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Booking, Experiment, InventoryItem } from '../types';
import { mockExperiments, mockInventory } from '../lib/mockData';

// SILA MASUKKAN URL GOOGLE SCRIPT CIKGU DI BAWAH INI:
const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwSnIL8EVPYdyFcH8RLR-KB7olxDBsq5TVJ3y4muYkYrErf9oTCL5aA8w8cRuj15Zu-xg/exec';

type DataContextType = {
  experiments: Experiment[];
  inventory: InventoryItem[];
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id' | 'status' | 'created_at'>) => void;
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

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

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
      .catch((err) => console.error('Gagal ambil dari Google Sheets:', err));
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

  const addBooking = async (bookingData: Omit<Booking, 'id' | 'status' | 'created_at'>) => {
    const newBooking: Booking = {
      ...bookingData,
      id: `b${Date.now()}`,
      status: 'Pending',
      created_at: new Date().toISOString(),
    };

    // Update UI + local
    const newBookingsList = [...bookings, newBooking];
    setBookings(newBookingsList);
    localStorage.setItem(LS_BOOKINGS, JSON.stringify(newBookingsList));

    // Hantar ke Sheets
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'add', booking: newBooking }),
      });
    } catch (error) {
      console.error('Gagal hantar ke Google Sheets:', error);
    }
  };

  const updateBookingStatus = async (
    id: string,
    status: 'Approved' | 'Rejected',
    catatan_makmal?: string,
    approved_by?: string
  ) => {
    const updatedBookings = bookings.map((b) =>
      b.id === id ? { ...b, status, catatan_makmal, approved_by: status === 'Approved' ? approved_by : b.approved_by } : b
    );
    setBookings(updatedBookings);
    localStorage.setItem(LS_BOOKINGS, JSON.stringify(updatedBookings));

    // Tolak inventori bila Approved
    const booking = bookings.find((b) => b.id === id);
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
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
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
    } catch (error) {
      console.error('Gagal kemaskini Google Sheets:', error);
    }
  };

  const value = useMemo(
    () => ({ experiments, inventory, bookings, addBooking, updateBookingStatus }),
    [experiments, inventory, bookings]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
