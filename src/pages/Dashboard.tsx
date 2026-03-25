import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { format } from 'date-fns';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { bookings } = useData();
  const navigate = useNavigate();

  const userBookings = bookings.filter(b => b.guru_id === user?.id);
  const pendingBookings = bookings.filter(b => b.status === 'Pending');

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

  const recentBookings = [...(user?.role === 'Guru' ? userBookings : bookings)]
    .sort((a, b) => getBookingTimestamp(b) - getBookingTimestamp(a))
    .slice(0, 5);

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'Approved': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'Rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Selamat Datang, {user?.name}</h1>
        <p className="text-slate-500">Gambaran keseluruhan sistem tempahan makmal anda.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {user?.role === 'Guru' && (
          <>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500">Jumlah Tempahan Anda</h3>
              <p className="text-3xl font-bold text-slate-900 mt-2">{userBookings.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500">Tempahan Menunggu</h3>
              <p className="text-3xl font-bold text-amber-600 mt-2">
                {userBookings.filter(b => b.status === 'Pending').length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500">Tempahan Diluluskan</h3>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                {userBookings.filter(b => b.status === 'Approved').length}
              </p>
            </div>
          </>
        )}

        {(user?.role === 'Pembantu Makmal' || user?.role === 'Ketua Panitia') && (
          <>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-medium text-slate-500">Jumlah Tempahan Keseluruhan</h3>
              <p className="text-3xl font-bold text-slate-900 mt-2">{bookings.length}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/tempahan?status=Pending')}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left transition hover:border-amber-300 hover:bg-amber-50/40"
            >
              <h3 className="text-sm font-medium text-slate-500">Perlu Tindakan (Pending)</h3>
              <p className="text-3xl font-bold text-amber-600 mt-2">{pendingBookings.length}</p>
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Recent Bookings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Tempahan Terkini</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentBookings.map(booking => (
              <div key={booking.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <p className="font-medium text-slate-900">{booking.eksperimen_tajuk}</p>
                  <p className="text-sm text-slate-500">
                    {format(new Date(booking.tarikh), 'dd MMM yyyy')} • {booking.masa}
                    {user?.role !== 'Guru' && ` • Oleh: ${booking.guru_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    booking.status === 'Approved' ? 'text-emerald-600' :
                    booking.status === 'Rejected' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {booking.status}
                  </span>
                  <StatusIcon status={booking.status} />
                </div>
              </div>
            ))}
            {recentBookings.length === 0 && (
              <div className="p-6 text-center text-slate-500">Tiada tempahan direkodkan.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
