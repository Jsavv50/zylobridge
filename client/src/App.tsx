import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
const NotFound = lazy(() => import("@/pages/NotFound"));
const Home = lazy(() => import("./pages/Home"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ProfessionalDashboard = lazy(() => import("./pages/ProfessionalDashboard"));
const EnterpriseDashboard = lazy(() => import("./pages/EnterpriseDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Messaging = lazy(() => import("./pages/Messaging"));
const VerificationRequest = lazy(() => import("./pages/VerificationRequest"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Shop = lazy(() => import("./pages/Shop"));
const Orders = lazy(() => import("./pages/Orders"));
const PhoneLogin = lazy(() => import("./pages/PhoneLogin"));
const SignIn = lazy(() => import("./pages/SignIn"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const UserProfile = lazy(() => import("./pages/UserProfile"));

function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d1117]" aria-busy="true" />}>
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
      <Route path="/profile" component={UserProfile} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
      </Switch>
    </Suspense>
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
