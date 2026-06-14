import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  ChevronDown,
  ClipboardList,
  FileQuestion,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuthStore } from "../../store/authStore";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Create Test", icon: FileQuestion, to: "/tests/create" },
  { label: "Questions", icon: BookOpenCheck, to: "/questions" },
];

const railIcons = [BookOpenCheck, ShieldCheck, BarChart3, ClipboardList, Settings];

export const AppShell = ({ children, compactRail = false }: { children: ReactNode; compactRail?: boolean }) => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white lg:block ${compactRail ? "w-[72px]" : "w-[252px]"
          }`}
      >
        <div className={`${compactRail ? "px-0 justify-center" : "px-7"} flex h-[100px] items-center border-b border-slate-100`}>
          <Logo compact={compactRail} />
        </div>
        {compactRail ? (
          <div className="flex flex-col items-center gap-6 pt-16">
            {railIcons.map((Icon, index) => (
              <Icon key={index} className="h-4.5 w-4.5 text-slate-400 hover:text-slate-700 transition cursor-pointer" />
            ))}
          </div>
        ) : (
          <nav className="space-y-2 px-3 py-8">
            {sidebarItems.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={label}
                to={to}
                className={({ isActive }) =>
                  `relative flex h-12 items-center gap-3 rounded-md px-4 text-sm font-semibold transition ${isActive ? "bg-primary-50 text-primary-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? <span className="absolute left-0 h-9 w-1 rounded-r-full bg-primary-600" /> : null}
                    <Icon className="h-5 w-5" />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        )}
      </aside>

      <header
        className={`fixed right-0 top-0 z-20 flex h-[100px] items-center justify-end border-b border-slate-200 bg-white px-7 ${compactRail ? "left-0 lg:left-[72px]" : "left-0 lg:left-[252px]"
          }`}
      >
        <div className="flex items-center gap-4">
          <button className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white">
            <Bell className="h-5 w-5 text-slate-700" />
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
          </button>
          <div className="h-12 w-12 overflow-hidden rounded-full border border-primary-400 bg-[#ffd584]">
            <div className="mt-1 text-center text-3xl">🙂</div>
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-700">
              {user?.name ?? "Alex Wando"} <ChevronDown className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium text-slate-500">{user?.role ?? "Admin"}</p>
          </div>
          <button
            onClick={logout}
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className={`min-h-screen pt-[100px] ${compactRail ? "lg:pl-[72px]" : "lg:pl-[252px]"}`}>{children}</main>
    </div>
  );
};
