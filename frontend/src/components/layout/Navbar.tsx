import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Train,
  Activity,
  Users,
  Monitor,
  BarChart2,
  Radio,
  Bell,
  Info,
  Bot,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAuth } from '../../hooks/useAuth';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { connected } = useWebSocket();
  const { user, logout, isStaff } = useAuth();

  // Passenger links
  const passengerLinks = [
    { name: 'Passenger View', path: '/passenger', icon: Users },
    { name: 'AI Assistant', path: '/assistant', icon: Bot },
    { name: 'About', path: '/about', icon: Info },
  ];

  // Railway Staff links
  const staffLinks = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Live Trains', path: '/trains', icon: Train },
    { name: 'Passenger View', path: '/passenger', icon: Users },
    { name: 'AI Assistant', path: '/assistant', icon: Bot },
    { name: 'Control Room', path: '/control-room', icon: Monitor },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Network', path: '/network', icon: Radio },
    { name: 'Alerts', path: '/alerts', icon: Bell },
    { name: 'About', path: '/about', icon: Info },
  ];

  const navLinks = isStaff ? staffLinks : passengerLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-700">
            <Train className="h-5 w-5 text-white" />
          </div>
          <div className="font-bold text-slate-900">
            RailPulse <span className="text-red-700">ETA</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/assistant"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Bot className="h-4 w-4 text-red-600" />
            <span>Assistant</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Approved Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white md:flex">
        {/* Brand */}
        <div className="flex h-20 items-center border-b border-slate-200 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-700">
              <Train className="h-5 w-5 text-white" />
            </div>

            <div>
              <div className="text-lg font-bold tracking-tight text-slate-900">
                RailPulse
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-red-700">
                ETA
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {isStaff ? 'Operations' : 'Passenger Services'}
          </p>

          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                location.pathname === link.path ||
                (link.path !== '/' &&
                  location.pathname.startsWith(link.path));

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-red-50 text-red-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] ${
                      isActive
                        ? 'text-red-700'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Identity & Logout */}
        {user && (
          <div className="border-t border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="truncate">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {user.name}
                  </p>
                  <p className="text-[10px] font-medium text-slate-500">
                    {user.role === 'RAILWAY_STAFF' ? 'Railway Staff' : 'Passenger'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* System status */}
        <div className="border-t border-slate-200 p-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                System Status
              </span>

              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connected ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </div>

            <div className="text-[11px] text-slate-500">
              {connected ? 'Live connection active' : 'Connection unavailable'}
            </div>
          </div>

          <div
            className="mt-3 text-[10px] leading-4 text-slate-400"
            title="Train master data and schedules are based on real railway services. Live GPS/RTIS telemetry is simulated in this prototype because authorized live railway telemetry is not connected."
          >
            DEMO MODE • SIMULATED TELEMETRY
          </div>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
