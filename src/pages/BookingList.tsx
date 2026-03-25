import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Printer, Check, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function BookingList() {
  const { bookings, updateBookingStatus } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'Approved' | 'Rejected' | null>(null);
  const [catatan, setCatatan] = useState('');

  const isGuru = user?.role === 'Guru';
  const statusParam = searchParams.get('status');
  const allowedStatus = statusParam === 'Pending' || statusParam === 'Approved' || statusParam === 'Rejected'
    ? statusParam
    : null;

  // ✅ Guru nampak tempahan sendiri sahaja
  const roleBasedBookings = isGuru ? bookings.filter((b) => b.guru_id === user?.id) : bookings;
  const visibleBookings = allowedStatus
    ? roleBasedBookings.filter((b) => b.status === allowedStatus)
    : roleBasedBookings;

  const getBookingTimestamp = (booking: (typeof bookings)[number]) => {
    const createdAtTs = Date.parse(booking.created_at);
    if (!Number.isNaN(createdAtTs)) return createdAtTs;

    const tarikhMasaTs = Date.parse(`${booking.tarikh}T${booking.masa || '00:00'}:00`);
    if (!Number.isNaN(tarikhMasaTs)) return tarikhMasaTs;

    const idMatch = booking.id.match(/\d+/);
    if (idMatch) {
      const idTs = Number(idMatch[0]);
      if (!Number.isNaN(idTs)) return idTs;
    }

    return 0;
  };

  // Sort paling terkini di atas (descending)
  const sortedBookings = [...visibleBookings].sort(
    (a, b) => getBookingTimestamp(b) - getBookingTimestamp(a)
  );

const handlePrint = (id: string) => {
  navigate(`/print/${id}`);
};

  const openStatusModal = (id: string, status: 'Approved' | 'Rejected') => {
    setSelectedBookingId(id);
    setSelectedStatus(status);
    setCatatan('');
    setModalOpen(true);
  };

  const handleStatusUpdate = () => {
    if (selectedBookingId && selectedStatus) {
      updateBookingStatus(selectedBookingId, selectedStatus, catatan, user?.name);
    }
    setModalOpen(false);
    setSelectedBookingId(null);
    setSelectedStatus(null);
    setCatatan('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isGuru ? 'Tempahan Saya' : 'Senarai Tempahan'}
          </h1>
          <p className="text-slate-500">
            {allowedStatus
              ? `Paparan ditapis: ${allowedStatus}`
              : isGuru
              ? 'Semak status & cetak borang tempahan anda.'
              : 'Urus dan sahkan tempahan makmal.'}
          </p>
        </div>
        {allowedStatus && (
          <button
            type="button"
            onClick={() => navigate('/tempahan')}
            className="px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Reset Filter
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm font-medium border-b border-slate-200">
                <th className="px-6 py-4">Tarikh & Masa</th>
                {!isGuru && <th className="px-6 py-4">Guru</th>}
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">Eksperimen / Aktiviti</th>
                <th className="px-6 py-4">Kumpulan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Tindakan</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{format(new Date(booking.tarikh), 'dd MMM yyyy')}</div>
                    <div className="text-sm text-slate-500">{booking.masa}</div>
                  </td>

                  {!isGuru && (
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{booking.guru_name}</div>
                    </td>
                  )}

                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900">
                      {booking.tingkatan && booking.kelas ? `${booking.tingkatan} ${booking.kelas}` : '-'}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-900 max-w-xs truncate" title={booking.eksperimen_tajuk}>
                      {booking.eksperimen_tajuk}
                    </div>

                    {booking.catatan_guru && (
                      <div className="text-xs text-amber-600 mt-1 truncate max-w-xs" title={booking.catatan_guru}>
                        Catatan: {booking.catatan_guru}
                      </div>
                    )}

                    {booking.catatan_makmal && (
                      <div className="text-xs text-indigo-600 mt-1 truncate max-w-xs" title={booking.catatan_makmal}>
                        Makmal: {booking.catatan_makmal}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4 text-slate-600">{booking.bilangan_kumpulan}</td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : booking.status === 'Rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right space-x-2">
                    {/* ✅ Approve/Reject hanya untuk bukan guru */}
                    {!isGuru && booking.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => openStatusModal(booking.id, 'Approved')}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Luluskan"
                        >
                          <Check className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => openStatusModal(booking.id, 'Rejected')}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Tolak"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {/* ✅ Cetak untuk semua */}
                    <button
                      onClick={() => handlePrint(booking.id)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                      title="Cetak Borang"
                    >
                      <Printer className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}

              {sortedBookings.length === 0 && (
                <tr>
                  <td colSpan={isGuru ? 6 : 7} className="px-6 py-8 text-center text-slate-500">
                    Tiada tempahan ditemui.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Update Modal */}
      {modalOpen && !isGuru && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {selectedStatus === 'Approved' ? 'Luluskan Tempahan' : 'Tolak Tempahan'}
            </h3>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Catatan untuk guru (Pilihan)</label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                rows={3}
                placeholder="Contoh: Sila ambil kunci di pejabat..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>

              <button
                onClick={handleStatusUpdate}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  selectedStatus === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Sahkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
