import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import JobDetail from "./pages/JobDetail";
import Onboarding from "./pages/Onboarding";
import ClientDashboard from "./pages/ClientDashboard";
import ProfessionalDashboard from "./pages/ProfessionalDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Messaging from "./pages/Messaging";
import VerificationRequest from "./pages/VerificationRequest";
import HowItWorks from "./pages/HowItWorks";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard/contractor" component={ClientDashboard} />
      <Route path="/dashboard/professional" component={ProfessionalDashboard} />
      <Route path="/dashboard/admin" component={AdminDashboard} />
      <Route path="/messages" component={Messaging} />
      <Route path="/verification" component={VerificationRequest} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
