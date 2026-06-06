import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Search, 
  ListOrdered, 
  ArrowRightLeft, 
  BarChart3, 
  Calculator, 
  ShieldCheck, 
  Users, 
  Building2,
  Landmark, 
  Settings, 
  LogOut 
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  roles: string[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} />, roles: ["admin", "account_officer", "sales_rep"] },
  { href: "/verify", label: "Verify Payment", icon: <Search size={18} />, roles: ["admin", "account_officer", "sales_rep"] },
  { href: "/transactions", label: "Transactions", icon: <ListOrdered size={18} />, roles: ["admin", "account_officer", "sales_rep"] },
  { href: "/reports", label: "Reports", icon: <BarChart3 size={18} />, roles: ["admin", "account_officer"] },
  { href: "/transfers", label: "Transfers", icon: <ArrowRightLeft size={18} />, roles: ["admin"] },
  { href: "/tax", label: "Tax & VAT", icon: <Calculator size={18} />, roles: ["admin"] },
  { href: "/audit", label: "Audit Logs", icon: <ShieldCheck size={18} />, roles: ["admin"] },
  { href: "/customers", label: "Customers", icon: <Building2 size={18} />, roles: ["admin", "account_officer", "sales_rep"] },
  { href: "/users", label: "Users", icon: <Users size={18} />, roles: ["admin"] },
  { href: "/accounts", label: "Bank Accounts", icon: <Landmark size={18} />, roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: <Settings size={18} />, roles: ["admin", "account_officer", "sales_rep"] },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const visibleItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono">B</div>
          <span className="font-bold text-xl tracking-tight">BANKIT</span>
        </div>
        
        <div className="flex-1 py-6 px-4 overflow-y-auto space-y-1">
          {visibleItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>
        
        <div className="p-4 border-t border-border">
          <div className="mb-4 px-2">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{user.role.replace("_", " ")}</div>
          </div>
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => logout()}>
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="md:hidden font-bold tracking-tight">BANKIT</div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>
        
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
