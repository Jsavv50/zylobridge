import { Toaster } from "@/components/ui/sonner";
import { lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "@/_core/hooks/useAuth";
import Home from "./pages/Home";
const JobsMarketplace = lazy(() => import("./pages/JobsMarketplace"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const JobPosting = lazy(() => import("./pages/JobPosting"));
const TalentDirectory = lazy(() => import("./pages/TalentDirectory"));
const ProfessionalProfilePage = lazy(() => import("./pages/ProfessionalProfilePage"));
const CompanyProfile = lazy(() => import("./pages/CompanyProfile"));
const EmployerJobs = lazy(() => import("./pages/EmployerJobs"));
const ProfessionalApplications = lazy(() => import("./pages/ProfessionalApplications"));
const ApplicationDetail = lazy(() => import("./pages/ApplicationDetail"));
const EmployerCandidates = lazy(() => import("./pages/EmployerCandidates"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ProfessionalDashboard = lazy(() => import("./pages/ProfessionalDashboard"));
const EnterpriseDashboard = lazy(() => import("./pages/EnterpriseDashboard"));
const EnterpriseAccountManagement = lazy(() => import("./pages/EnterpriseAccountManagement"));
const EnterpriseInvitation = lazy(() => import("./pages/EnterpriseInvitation"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Messaging = lazy(() => import("./pages/Messaging"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const Payments = lazy(() => import("./pages/Payments"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const VerificationRequest = lazy(() => import("./pages/VerificationRequest"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Shop = lazy(() => import("./pages/Shop"));
const Orders = lazy(() => import("./pages/Orders"));
const PhoneLogin = lazy(() => import("./pages/PhoneLogin"));
const SignIn = lazy(() => import("./pages/SignIn"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));

function RouteFallback() {
  return <div className="min-h-screen bg-[#0d1117] text-gray-300 flex items-center justify-center px-6"><div className="rounded-2xl border border-white/10 bg-[#131a26] px-6 py-5 text-sm shadow-xl">Loading workspace…</div></div>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/marketplace" component={JobsMarketplace} />
      <Route path="/jobs" component={JobsMarketplace} />
      <Route path="/jobs/new" component={JobPosting} />
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/talent" component={TalentDirectory} />
      <Route path="/professionals/:id" component={ProfessionalProfilePage} />
      <Route path="/companies/:slug" component={CompanyProfile} />
      <Route path="/employer/jobs" component={EmployerJobs} />
      <Route path="/applications" component={ProfessionalApplications} />
      <Route path="/applications/:id" component={ApplicationDetail} />
      <Route path="/employer/jobs/:jobId/candidates" component={EmployerCandidates} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/dashboard" component={ProfessionalDashboard} />
      <Route path="/employer" component={ClientDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/dashboard/contractor" component={ClientDashboard} />
      <Route path="/dashboard/client" component={ClientDashboard} />
      <Route path="/dashboard/professional" component={ProfessionalDashboard} />
      <Route path="/dashboard/enterprise" component={EnterpriseDashboard} />
      <Route path="/enterprise" component={EnterpriseDashboard} />
      <Route path="/enterprise/account-management" component={EnterpriseAccountManagement} />
      <Route path="/organization" component={EnterpriseDashboard} />
      <Route path="/enterprise/invitations/accept" component={EnterpriseInvitation} />
      <Route path="/dashboard/admin" component={AdminDashboard} />
      <Route path="/dashboard/super-admin" component={AdminDashboard} />
      <Route path="/messages/:id" component={Messaging} />
      <Route path="/messages" component={Messaging} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/notifications/settings" component={NotificationSettings} />
      <Route path="/payments" component={Payments} />
      <Route path="/payment/callback" component={PaymentCallback} />
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
      <Route path="/profile/edit" component={EditProfile} />
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
          <AuthProvider>
            <Toaster richColors position="top-right" />
            <Suspense fallback={<RouteFallback />}><Router /></Suspense>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
