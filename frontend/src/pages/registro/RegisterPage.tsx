import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth/auth.service';
import bgImage from '../../assets/mundial-2026-cartel-fifa.jpg';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await authService.register({ username, email, password });
      navigate('/login');
    } catch {
      setError('No se pudo crear la cuenta. El usuario o email ya existe.');
    } finally {
      setLoading(false);
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
        {/* Header */}
        <div
          className="px-8 pt-8 pb-6 flex flex-col items-center gap-1"
          style={{ background: 'linear-gradient(135deg, #05B15A 0%, #03BAE9 100%)' }}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-1">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">Crear cuenta</h1>
          <p className="text-white/70 text-xs">FIFA World Cup 2026</p>
        </div>

        {/* Cuerpo */}
        <div className="bg-white px-8 py-7 flex flex-col gap-4">
          {error && (
            <p className="text-sm text-center font-medium rounded-lg px-3 py-2 bg-red-50" style={{ color: '#D82D31' }}>
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username */}
            <div className="flex flex-col gap-1">
              <label htmlFor="register-username" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</label>
              <input
                id="register-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Tu nombre de usuario"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none transition-all duration-150 focus:border-[#05B15A] focus:ring-2 focus:ring-[#05B15A]/20 placeholder:text-gray-300"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label htmlFor="register-email" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none transition-all duration-150 focus:border-[#05B15A] focus:ring-2 focus:ring-[#05B15A]/20 placeholder:text-gray-300"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label htmlFor="register-password" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contraseña</label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none transition-all duration-150 focus:border-[#05B15A] focus:ring-2 focus:ring-[#05B15A]/20 placeholder:text-gray-300"
              />
            </div>

            {/* Confirmar password */}
            <div className="flex flex-col gap-1">
              <label htmlFor="register-confirm" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirmar contraseña</label>
              <input
                id="register-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 outline-none transition-all duration-150 focus:border-[#05B15A] focus:ring-2 focus:ring-[#05B15A]/20 placeholder:text-gray-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-95 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#05B15A' }}
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </form>

          <div className="flex items-center justify-center gap-1 text-xs text-gray-400 mt-1">
            <span>¿Ya tenés cuenta?</span>
            <Link
              to="/login"
              className="font-semibold underline no-underline transition-colors duration-150"
              style={{ color: '#03BAE9' }}
            >
              Iniciá sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
