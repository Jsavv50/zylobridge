import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// ── Eagerly loaded (always needed on first paint) ──────────────────────────
import NotFound from "./pages/NotFound";

// ── Route-based lazy chunks ────────────────────────────────────────────────
// Each lazy() call becomes its own JS chunk — only downloaded when the user
// navigates to that route for the first time.
const Home                  = lazy(() => import("./pages/Home"));
const SignIn                = lazy(() => import("./pages/SignIn"));
const Onboarding            = lazy(() => import("./pages/Onboarding"));
const Marketplace           = lazy(() => import("./pages/Marketplace"));
const JobDetail             = lazy(() => import("./pages/JobDetail"));
const HowItWorks            = lazy(() => import("./pages/HowItWorks"));
const Shop                  = lazy(() => import("./pages/Shop"));
const Orders                = lazy(() => import("./pages/Orders"));
const PhoneLogin            = lazy(() => import("./pages/PhoneLogin"));
const Messaging             = lazy(() => import("./pages/Messaging"));
const VerificationRequest   = lazy(() => import("./pages/VerificationRequest"));
const ClientDashboard       = lazy(() => import("./pages/ClientDashboard"));
const ProfessionalDashboard = lazy(() => import("./pages/ProfessionalDashboard"));
const AdminDashboard        = lazy(() => import("./pages/AdminDashboard"));
const UserProfile           = lazy(() => import("./pages/UserProfile"));
const PrivacyPolicy         = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService        = lazy(() => import("./pages/TermsOfService"));

// ── Route loading skeleton ─────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

// ── Router ─────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/"                         component={Home} />
        <Route path="/sign-in"                  component={SignIn} />
        <Route path="/login/phone"              component={PhoneLogin} />
        <Route path="/onboarding"               component={Onboarding} />
        <Route path="/marketplace"              component={Marketplace} />
        <Route path="/jobs/:id"                 component={JobDetail} />
        <Route path="/how-it-works"             component={HowItWorks} />
        <Route path="/shop"                     component={Shop} />
        <Route path="/orders"                   component={Orders} />
        <Route path="/orders/verify"            component={Orders} />
        <Route path="/messages"                 component={Messaging} />
        <Route path="/verification"             component={VerificationRequest} />
        <Route path="/dashboard/contractor"     component={ClientDashboard} />
        <Route path="/dashboard/professional"   component={ProfessionalDashboard} />
        <Route path="/dashboard/admin"          component={AdminDashboard} />
        <Route path="/profile"                  component={UserProfile} />
        <Route path="/privacy-policy"           component={PrivacyPolicy} />
        <Route path="/terms"                    component={TermsOfService} />
        <Route path="/404"                      component={NotFound} />
        <Route                                  component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
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
