import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { authService } from '../../services/auth/auth.service';
import bgImage from '../../assets/mundial-2026-cartel-fifa.jpg';

type Mode = 'login' | 'forgot';

export default function LoginPage() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (mode === 'login') {
      setLoading(true);
      try {
        const token = await authService.login({ username, password });
        loginWithToken(token);
        navigate(from, { replace: true });
      } catch {
        setError('Usuario o contraseña incorrectos.');
      } finally {
        setLoading(false);
      }
    } else {
      setInfo('Si el usuario existe, recibirás instrucciones para restablecer tu contraseña.');
      setMode('login');
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative"
      style={{ backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header del modal */}
        <div
          className="px-8 pt-8 pb-6 flex flex-col items-center gap-1"
          style={{
            background:
              mode === 'forgot'
                ? 'linear-gradient(135deg, #03BAE9 0%, #D82D31 100%)'
                : 'linear-gradient(135deg, #D82D31 0%, #03BAE9 100%)',
          }}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            {mode === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}
          </h1>
          <p className="text-white/70 text-xs">FIFA World Cup 2026</p>
        </div>

        {/* Cuerpo */}
        <div className="bg-white px-8 py-7 flex flex-col gap-4">
          {error && (
            <p className="text-sm text-center font-medium rounded-lg px-3 py-2 bg-red-50" style={{ color: '#D82D31' }}>
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-center font-medium rounded-lg px-3 py-2 bg-green-50" style={{ color: '#05B15A' }}>
              {info}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Usuario */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Tu nombre de usuario"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none transition-all duration-150 focus:border-[#03BAE9] focus:ring-2 focus:ring-[#03BAE9]/20 placeholder:text-gray-300"
              />
            </div>

            {/* Contraseña (solo en login) */}
            {mode === 'login' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none transition-all duration-150 focus:border-[#03BAE9] focus:ring-2 focus:ring-[#03BAE9]/20 placeholder:text-gray-300"
                />
                <div className="flex justify-end mt-0.5">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}
                    className="text-xs font-medium bg-transparent border-none cursor-pointer transition-colors duration-150"
                    style={{ color: '#03BAE9' }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>
            )}

            {/* Botón principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-95 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background:
                  mode === 'forgot'
                    ? '#03BAE9'
                    : 'linear-gradient(90deg, #D82D31, #03BAE9)',
              }}
            >
              {loading ? 'Ingresando...' : mode === 'login' ? 'Ingresar' : 'Enviar instrucciones'}
            </button>
          </form>

          {/* Links de modo */}
          <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-1">
            {mode === 'login' ? (
              <>
                <span>¿No tenés cuenta?</span>
                <Link
                  to="/register"
                  className="font-semibold underline transition-colors duration-150"
                  style={{ color: '#05B15A' }}
                >
                  Registrate
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); setInfo(''); }}
                className="font-semibold bg-transparent border-none cursor-pointer transition-colors duration-150"
                style={{ color: '#03BAE9' }}
              >
                ← Volver al login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
