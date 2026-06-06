import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout/app-layout";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Verify from "@/pages/verify";
import Transactions from "@/pages/transactions";
import TransactionDetail from "@/pages/transaction-detail";
import Transfers from "@/pages/transfers";
import Reports from "@/pages/reports";
import Tax from "@/pages/tax";
import AuditLogs from "@/pages/audit";
import Users from "@/pages/users";
import Customers from "@/pages/customers";
import Accounts from "@/pages/accounts";
import Settings from "@/pages/settings";
import PublicVerify from "@/pages/public-verify";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, roles }: { component: any, roles?: string[] }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Redirect to="/login" />;
  if (roles && !roles.includes(user.role)) return <Redirect to="/dashboard" />;
  
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/verify/:cplid" component={PublicVerify} />
      <Route path="/login" component={Login} />
      
      <Route path="/">
        {() => <Redirect to="/dashboard" />}
      </Route>
      
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/verify">
        {() => <ProtectedRoute component={Verify} />}
      </Route>
      <Route path="/transactions">
        {() => <ProtectedRoute component={Transactions} />}
      </Route>
      <Route path="/transactions/:id">
        {() => <ProtectedRoute component={TransactionDetail} />}
      </Route>
      <Route path="/reports">
        {() => <ProtectedRoute component={Reports} roles={["admin", "account_officer"]} />}
      </Route>
      <Route path="/transfers">
        {() => <ProtectedRoute component={Transfers} roles={["admin"]} />}
      </Route>
      <Route path="/tax">
        {() => <ProtectedRoute component={Tax} roles={["admin"]} />}
      </Route>
      <Route path="/audit">
        {() => <ProtectedRoute component={AuditLogs} roles={["admin"]} />}
      </Route>
      <Route path="/customers">
        {() => <ProtectedRoute component={Customers} />}
      </Route>
      <Route path="/users">
        {() => <ProtectedRoute component={Users} roles={["admin"]} />}
      </Route>
      <Route path="/accounts">
        {() => <ProtectedRoute component={Accounts} roles={["admin"]} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      
      <Route>
        {() => (
          <AppLayout>
            <NotFound />
          </AppLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
