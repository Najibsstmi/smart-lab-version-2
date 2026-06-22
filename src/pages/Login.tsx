import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';

const REMEMBERED_EMAIL_KEY = 'smartlab_remembered_email';

type PasswordCredentialConstructor = new (data: {
  id: string;
  password: string;
  name?: string;
}) => Credential;

async function saveCredential(email: string, password: string) {
  const passwordCredential = (
    window as Window & {
      PasswordCredential?: PasswordCredentialConstructor;
    }
  ).PasswordCredential;

  if (!passwordCredential || !navigator.credentials?.store) return;

  try {
    await navigator.credentials.store(
      new passwordCredential({
        id: email,
        password,
        name: email,
      })
    );
  } catch (error) {
    console.info('Browser tidak menyimpan kelayakan log masuk:', error);
  }
}

export default function Login() {
  const [email, setEmail] = useState(
    () => localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? ''
  );
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(
    () => localStorage.getItem(REMEMBERED_EMAIL_KEY) !== null
  );

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const ok = await login(normalizedEmail, password);

    if (!ok) return;

    if (rememberLogin) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, normalizedEmail);
      await saveCredential(normalizedEmail, password);
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }

    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="flex justify-center gap-6">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Coat_of_arms_of_Malaysia.svg/500px-Coat_of_arms_of_Malaysia.svg.png"
                alt="KPM Logo"
                className="h-20 w-20 object-contain"
                referrerPolicy="no-referrer"
              />

              <img
                src="https://lh3.googleusercontent.com/d/1NJI6pEh_7toHDtSYvl3sWikGeXdUdGXK"
                alt="SSMJ Logo"
                className="h-20 w-20 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <h1 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
              Sistem Tempahan Makmal
            </h1>

            <p className="mt-2 text-center text-sm text-slate-600">
              SEKOLAH SENI MALAYSIA JOHOR
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="border border-slate-200 bg-white px-4 py-8 shadow-sm sm:rounded-xl sm:px-10">
              <form
                className="space-y-6"
                onSubmit={handleSubmit}
                autoComplete="on"
              >
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Emel
                  </label>

                  <div className="mt-1">
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      className="block w-full appearance-none rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                      placeholder="nama@sekolah.edu.my"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Kata Laluan
                  </label>

                  <div className="mt-1">
                    <input
                      id="login-password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      className="block w-full appearance-none rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 sm:text-sm"
                      placeholder="Masukkan kata laluan"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <input
                    id="remember-login"
                    name="remember-login"
                    type="checkbox"
                    checked={rememberLogin}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setRememberLogin(checked);

                      if (!checked) {
                        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />

                  <div>
                    <label
                      htmlFor="remember-login"
                      className="block cursor-pointer text-sm font-medium text-slate-700"
                    >
                      Ingat emel dan kata laluan
                    </label>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Kata laluan disimpan dengan selamat oleh pengurus kata
                      laluan browser.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex w-full justify-center rounded-lg border border-transparent bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Log Masuk
                </button>
              </form>

              <div className="mt-4">
                <Link
                  to="/lupa-kata-laluan"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  Lupa Kata Laluan? Reset Sekarang
                </Link>
              </div>

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
