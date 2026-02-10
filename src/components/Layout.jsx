import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Calendar, BookOpen, LayoutDashboard, DollarSign, Users, Library,
  LogOut, Menu, X, Church, CalendarDays, Sparkles, Sun, Moon,
} from 'lucide-react';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const memberLinks = [
    { to: '/cronograma', icon: Calendar, label: 'Cronograma' },
    { to: '/estudos', icon: BookOpen, label: 'Estudos' },
  ];
  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/cronogramas', icon: CalendarDays, label: 'Cronogramas' },
    { to: '/admin/financas', icon: DollarSign, label: 'Finanças' },
    { to: '/admin/estudos', icon: Library, label: 'Estudos' },
    { to: '/admin/membros', icon: Users, label: 'Membros' },
  ];

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      end={to === '/admin'}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
          isActive
            ? 'text-white shadow-[0_4px_15px_rgba(191,36,122,0.3)]'
            : 'text-dark-400 hover:text-dark-50 hover:bg-dark-850/60'
        }`
      }
      style={({ isActive }) => isActive ? {
        background: 'linear-gradient(135deg, #BF247A 0%, #9e1d64 50%, #D9731A 100%)',
      } : {}}
    >
      <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-300 group-hover:scale-110`} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-dark-950 transition-colors duration-300">
      {/* Header Mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 px-4 h-14 flex items-center justify-between" style={{ background: 'rgba(var(--dark-925), 0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: 'var(--header-shadow), var(--inset-highlight)' }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-xl hover:bg-dark-850 text-dark-400 hover:text-dark-50 transition-all duration-200">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2">
          <Church className="w-5 h-5 text-gold-500" />
          <span className="font-bold text-dark-50">Células</span>
        </div>
        {/* Mobile Theme Toggle */}
        <button onClick={toggleTheme} className="theme-toggle w-9 h-9 !rounded-xl flex items-center justify-center" aria-label="Alternar tema">
          {isDark ? <Moon className="w-4 h-4 text-gold-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
        </button>
      </header>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30 animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-[270px] transform transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{
          background: `linear-gradient(180deg, rgb(var(--dark-925)) 0%, rgb(var(--dark-950)) 100%)`,
          boxShadow: 'var(--sidebar-shadow)',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Gradient accent bar at top */}
          <div className="gradient-accent-bar" />

          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-5" style={{ boxShadow: 'var(--inset-highlight)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_2px_12px_rgba(191,36,122,0.2)]"
              style={{ background: 'linear-gradient(135deg, #BF247A 0%, #D9731A 100%)' }}
            >
              <Church className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-dark-50 text-lg">Células</span>
              <p className="text-[10px] text-dark-500 -mt-0.5 uppercase tracking-widest">Gestão</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
            <p className="px-4 py-2 text-[10px] font-bold text-dark-500 uppercase tracking-[0.15em]">Menu</p>
            {memberLinks.map((link) => <NavItem key={link.to} {...link} />)}
            {isAdmin && (
              <>
                <div className="my-4 divider-gold" />
                <p className="px-4 py-2 text-[10px] font-bold text-dark-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-accent-500" />Administração
                </p>
                {adminLinks.map((link) => <NavItem key={link.to} {...link} />)}
              </>
            )}
          </nav>

          {/* Theme Toggle + User */}
          <div className="p-3 space-y-3" style={{ boxShadow: 'var(--inset-highlight)', background: 'rgba(var(--dark-950), 0.3)' }}>
            {/* Theme Switch */}
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-xs font-medium text-dark-500">{isDark ? 'Tema escuro' : 'Tema claro'}</span>
              <button onClick={toggleTheme} className="theme-toggle" aria-label="Alternar tema">
                <Sun className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-all duration-300 ${isDark ? 'opacity-30 text-dark-600' : 'opacity-100 text-amber-500'}`} />
                <Moon className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-all duration-300 ${isDark ? 'opacity-100 text-gold-400' : 'opacity-30 text-dark-600'}`} />
                <span className="theme-toggle-dot" data-dark={isDark ? 'true' : 'false'} />
              </button>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-accent-500 to-[#812B8C] rounded-xl flex items-center justify-center shadow-gold">
                <span className="text-sm font-bold text-white">{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark-50 truncate">{user?.name}</p>
                <p className="text-[11px] text-dark-500 truncate">{isAdmin ? '✦ Administrador' : 'Membro'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-dark-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300"
            >
              <LogOut className="w-[18px] h-[18px]" /><span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-[270px] pt-14 lg:pt-0 min-h-screen relative">
        {/* Subtle background gradient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(191,36,122,0.06) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(217,115,26,0.05) 0%, transparent 70%)' }} />
        <div className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
