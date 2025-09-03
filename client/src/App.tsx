import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";
import AdminPage from "@/pages/admin-page";
import { ProtectedRoute } from "./lib/protected-route";
import { TopBar } from "./components/layout/TopBar";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/profile/:username" component={ProfilePage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* TopBar é renderizada aqui para ser persistente em todas as páginas */}
        <TopBar />
        {/* Adicionamos um padding-top ao container principal para não ficar atrás da TopBar fixa */}
        <main className="pt-11">
            <Router />
        </main>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
