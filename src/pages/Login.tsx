import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';
import { KeyRound } from 'lucide-react';

export default function Login() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    const ok = await login(email, password);

    if (ok) {
      navigate('/');
    }

  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="sm:mx-auto sm:w-full sm:max-w-md">

            <div className="flex justify-center gap-6">

              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Coat_of_arms_of_Malaysia.svg/500px-Coat_of_arms_of_Malaysia.svg.png"
                alt="KPM Logo"
                className="w-20 h-20 object-contain"
                referrerPolicy="no-referrer"
              />

              <img
                src="https://lh3.googleusercontent.com/d/1NJI6pEh_7toHDtSYvl3sWikGeXdUdGXK"
                alt="SSMJ Logo"
                className="w-20 h-20 object-contain"
                referrerPolicy="no-referrer"
              />

            </div>

            <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
              Sistem Tempahan Makmal
            </h2>

            <p className="mt-2 text-center text-sm text-slate-600">
              SEKOLAH SENI MALAYSIA JOHOR
            </p>

          </div>

          {/* Login Box */}
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">

            <div className="bg-white py-8 px-4 shadow-sm sm:rounded-xl sm:px-10 border border-slate-200">

              <form className="space-y-6" onSubmit={handleSubmit}>

                {/* Email */}
                <div>

                  <label className="block text-sm font-medium text-slate-700">
                    Emel
                  </label>

                  <div className="mt-1">

                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      placeholder="nama@sekolah.edu.my"
                    />

                  </div>

                </div>

                {/* Password */}
                <div>

                  <label className="block text-sm font-medium text-slate-700">
                    Kata Laluan
                  </label>

                  <div className="mt-1">

                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      placeholder="Masukkan kata laluan"
                    />

                  </div>

                </div>

                {/* Button */}
                <div>

                  <button
                    type="submit"
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                  >
                    Log Masuk
                  </button>

                </div>

              </form>

              <div className="mt-4">
                <Link
                  to="/lupa-kata-laluan"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <KeyRound className="h-4 w-4" />
                  Lupa Kata Laluan? Reset Sekarang
                </Link>
              </div>

              {/* Register link */}
              <div className="mt-6 text-center">

                <p className="text-sm text-slate-600">

                  Belum mempunyai akaun?{' '}

                  <Link
                    to="/register"
                    className="font-medium text-emerald-600 hover:text-emerald-500"
                  >
                    Daftar Akaun
                  </Link>

                </p>

              </div>

            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
