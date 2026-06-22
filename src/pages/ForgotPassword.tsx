import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Loader2, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';

const errorMessages: Record<string, string> = {
  'Invalid or expired code': 'Kod tidak sah atau telah tamat tempoh. Sila minta kod baharu.',
  'Too many attempts': 'Terlalu banyak percubaan. Sila minta kod baharu.',
  'Password too short': 'Kata laluan baharu mestilah sekurang-kurangnya 4 aksara.',
  'Email not found': 'Akaun untuk emel ini tidak dijumpai.',
  'Network error': 'Sambungan gagal. Sila cuba lagi.',
};

export default function ForgotPassword() {
  const { requestPasswordReset, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    const ok = await requestPasswordReset(email.trim());
    setIsSubmitting(false);

    if (!ok) {
      setError('Kod tidak dapat dihantar. Sila semak sambungan dan cuba lagi.');
      return;
    }

    setCodeSent(true);
    setMessage('Jika emel itu berdaftar, kod 6 digit telah dihantar dan sah selama 10 minit.');
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Pengesahan kata laluan tidak sepadan.');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(email.trim(), code.trim(), newPassword);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(errorMessages[result.error || ''] || 'Kata laluan tidak dapat ditetapkan semula.');
      return;
    }

    alert('Kata laluan berjaya ditetapkan semula. Sila log masuk.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Link
            to="/login"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke log masuk
          </Link>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <KeyRound className="h-6 w-6" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">Tetapkan semula kata laluan</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Kami akan menghantar kod pengesahan ke emel akaun anda.
            </p>

            <form className="mt-6 space-y-5" onSubmit={codeSent ? handleResetPassword : handleRequestCode}>
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
                  Alamat emel
                </label>
                <div className="relative mt-1">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                  <input
                    id="reset-email"
                    type="email"
                    required
                    readOnly={codeSent}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="block w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 read-only:bg-slate-100"
                    placeholder="nama@sekolah.edu.my"
                  />
                </div>
              </div>

              {codeSent && (
                <>
                  <div>
                    <label htmlFor="reset-code" className="block text-sm font-medium text-slate-700">
                      Kod pengesahan 6 digit
                    </label>
                    <input
                      id="reset-code"
                      type="text"
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 tracking-[0.35em] shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                      placeholder="000000"
                    />
                  </div>

                  <div>
                    <label htmlFor="new-password" className="block text-sm font-medium text-slate-700">
                      Kata laluan baharu
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      required
                      minLength={4}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
                      Sahkan kata laluan baharu
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      minLength={4}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              {message && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
                  {message}
                </p>
              )}

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {codeSent ? 'Tetapkan Kata Laluan Baharu' : 'Hantar Kod Pengesahan'}
              </button>

              {codeSent && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setCodeSent(false);
                    setCode('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setMessage('');
                    setError('');
                  }}
                  className="w-full text-sm font-medium text-emerald-700 hover:text-emerald-600"
                >
                  Guna emel lain atau hantar semula kod
                </button>
              )}
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
