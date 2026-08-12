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
import EnterpriseDashboard from "./pages/EnterpriseDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Messaging from "./pages/Messaging";
import VerificationRequest from "./pages/VerificationRequest";
import HowItWorks from "./pages/HowItWorks";
import Shop from "./pages/Shop";
import Orders from "./pages/Orders";
import PhoneLogin from "./pages/PhoneLogin";
import SignIn from "./pages/SignIn";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import UserProfile from "./pages/UserProfile";
import CookiePolicy from "./pages/CookiePolicy";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard/contractor" component={ClientDashboard} />
      <Route path="/dashboard/client" component={ClientDashboard} />
      <Route path="/dashboard/professional" component={ProfessionalDashboard} />
      <Route path="/dashboard/enterprise" component={EnterpriseDashboard} />
      <Route path="/dashboard/admin" component={AdminDashboard} />
      <Route path="/messages" component={Messaging} />
      <Route path="/verification" component={VerificationRequest} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/shop" component={Shop} />
      <Route path="/orders" component={Orders} />
      <Route path="/orders/verify" component={Orders} />
      <Route path="/login/phone" component={PhoneLogin} />
      <Route path="/sign-in" component={SignIn} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/cookie-policy" component={CookiePolicy} />
      <Route path="/profile" component={UserProfile} />
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
