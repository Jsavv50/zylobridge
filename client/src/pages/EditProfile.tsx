import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  ChevronRight,
  Save,
  ArrowLeft,
  Loader2,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import VocationSelector from "@/components/VocationSelector";
import { parseProfileMetadata, type ProfileAvailabilityStatus } from "@shared/profile";

export default function EditProfile() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const { data: profProfile } = trpc.profiles.me.useQuery(undefined, {
    enabled: !!user && user.userType === "professional",
  });

  const [vocation, setVocation] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [certifications, setCertifications] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [headline, setHeadline] = useState("");
  const [additionalVocations, setAdditionalVocations] = useState("");
  const [specializations, setSpecializations] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState<ProfileAvailabilityStatus>("available_now");
  const [availableFrom, setAvailableFrom] = useState("");
  const [preferredWorkDays, setPreferredWorkDays] = useState("");
  const [employmentTypes, setEmploymentTypes] = useState("");
  const [preferredProjectTypes, setPreferredProjectTypes] = useState("");
  const [preferredJobSize, setPreferredJobSize] = useState<"small" | "medium" | "large" | "">("");
  const [minimumProjectValue, setMinimumProjectValue] = useState("");
  const [paymentStructure, setPaymentStructure] = useState<"hourly" | "daily" | "fixed_project" | "milestone" | "">("");
  const [dailyRate, setDailyRate] = useState("");
  const [startingProjectRate, setStartingProjectRate] = useState("");
  const [rateVisibility, setRateVisibility] = useState<"public" | "private">("private");
  const [languages, setLanguages] = useState("");
  const [equipment, setEquipment] = useState("");
  const [transportation, setTransportation] = useState("");
  const [serviceAreas, setServiceAreas] = useState("");
  const [serviceRadiusKm, setServiceRadiusKm] = useState("");
  const [willingToTravel, setWillingToTravel] = useState(false);
  const [visibility, setVisibility] = useState<"visible" | "hidden">("visible");
  const [allowEmployerContact, setAllowEmployerContact] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhone(user.phone ?? "");
      setAvatarUrl(user.avatarUrl ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (profProfile) {
      setVocation(profProfile.vocation ?? "");
      setBio(profProfile.bio ?? "");
      setSkills(profProfile.skills ?? "");
      setCertifications(profProfile.certifications ?? "");
      setHourlyRate(profProfile.hourlyRate ? String(profProfile.hourlyRate) : "");
      setLocationStr(profProfile.location ?? "");
      setYearsExperience(profProfile.yearsExperience ? String(profProfile.yearsExperience) : "");
      const metadata = parseProfileMetadata(profProfile.profileMetadata);
      setHeadline(metadata.headline ?? "");
      setAdditionalVocations(metadata.additionalVocations?.join(", ") ?? "");
      setSpecializations(metadata.specializations?.join(", ") ?? "");
      setAvailabilityStatus(metadata.availabilityStatus ?? (profProfile.isAvailable ? "available_now" : "not_available"));
      setAvailableFrom(metadata.availableFrom ?? "");
      setPreferredWorkDays(metadata.preferredWorkDays?.join(", ") ?? "");
      setEmploymentTypes(metadata.employmentTypes?.join(", ") ?? "");
      setPreferredProjectTypes(metadata.preferredProjectTypes?.join(", ") ?? "");
      setPreferredJobSize(metadata.preferredJobSize ?? "");
      setMinimumProjectValue(metadata.minimumProjectValue !== undefined ? String(metadata.minimumProjectValue) : "");
      setPaymentStructure(metadata.paymentStructure ?? "");
      setDailyRate(metadata.dailyRate !== undefined ? String(metadata.dailyRate) : "");
      setStartingProjectRate(metadata.startingProjectRate !== undefined ? String(metadata.startingProjectRate) : "");
      setRateVisibility(metadata.rateVisibility ?? "private");
      setLanguages(metadata.languages?.map((item) => `${item.language}:${item.proficiency}`).join(", ") ?? "");
      setEquipment(metadata.equipment?.join(", ") ?? "");
      setTransportation(metadata.transportation ?? "");
      setServiceAreas(metadata.serviceAreas?.join(", ") ?? "");
      setServiceRadiusKm(metadata.serviceRadiusKm !== undefined ? String(metadata.serviceRadiusKm) : "");
      setWillingToTravel(metadata.willingToTravel ?? false);
      setVisibility(metadata.visibility ?? "visible");
      setAllowEmployerContact(metadata.allowEmployerContact ?? true);
    }
  }, [profProfile]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
    },
  });

  const upsertProfMutation = trpc.profiles.upsert.useMutation({
    onSuccess: () => {
      utils.profiles.me.invalidate();
    },
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        name: name.trim(),
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      if (user?.userType === "professional") {
        await upsertProfMutation.mutateAsync({
          vocation: vocation || undefined,
          bio: bio || undefined,
          skills: skills || undefined,
          certifications: certifications || undefined,
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
          location: locationStr || undefined,
          yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
          isAvailable: availabilityStatus !== "not_available",
          profileMetadata: {
            headline: headline.trim() || undefined,
            additionalVocations: additionalVocations.split(",").map((item) => item.trim()).filter(Boolean),
            specializations: specializations.split(",").map((item) => item.trim()).filter(Boolean),
            availabilityStatus,
            availableFrom: availableFrom || undefined,
            preferredWorkDays: preferredWorkDays.split(",").map((item) => item.trim()).filter(Boolean),
            employmentTypes: employmentTypes.split(",").map((item) => item.trim()).filter((item): item is "contract" | "project" | "temporary" | "full_time" => ["contract", "project", "temporary", "full_time"].includes(item)),
            preferredProjectTypes: preferredProjectTypes.split(",").map((item) => item.trim()).filter(Boolean),
            preferredJobSize: preferredJobSize || undefined,
            minimumProjectValue: minimumProjectValue ? Number(minimumProjectValue) : undefined,
            paymentStructure: paymentStructure || undefined,
            dailyRate: dailyRate ? Number(dailyRate) : undefined,
            startingProjectRate: startingProjectRate ? Number(startingProjectRate) : undefined,
            rateVisibility,
            languages: languages.split(",").map((item) => { const [language, proficiency = "conversational"] = item.split(":").map((part) => part.trim()); return { language, proficiency }; }).filter((item): item is { language: string; proficiency: "basic" | "conversational" | "fluent" | "native" } => Boolean(item.language) && ["basic", "conversational", "fluent", "native"].includes(item.proficiency)),
            equipment: equipment.split(",").map((item) => item.trim()).filter(Boolean),
            transportation: transportation.trim() || undefined,
            serviceAreas: serviceAreas.split(",").map((item) => item.trim()).filter(Boolean),
            serviceRadiusKm: serviceRadiusKm ? Number(serviceRadiusKm) : undefined,
            willingToTravel,
            visibility,
            allowEmployerContact,
          },
        });
      }

      toast.success("Profile updated successfully.");
      setLocation("/profile");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    setLocation("/sign-in");
    return null;
  }

  const initials = name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
      <Navbar />

      <main className="flex-1 py-10 px-4">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/profile" className="hover:text-gray-300 transition-colors">My Profile</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-gray-300 font-medium">Edit Profile</span>
          </nav>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Edit Profile
              </h1>
              <p className="text-gray-400 text-sm mt-1">Update your account information and preferences</p>
            </div>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="border-white/10 text-gray-300 hover:text-white bg-transparent gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Cancel
              </Button>
            </Link>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="rounded-3xl border border-white/8 bg-[#131a26]/80 p-6 sm:p-8 space-y-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-center gap-5 pb-6 border-b border-white/8">
              <Avatar className="w-20 h-20 border-2 border-violet-500/30">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={name} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-blue-600 text-white text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Avatar Image URL</label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="bg-[#0a0f1a] border-white/10 text-white text-sm"
                />
              </div>
            </div>

            {/* Standard User Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Full Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  required
                  className="bg-[#0a0f1a] border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Email Address</label>
                <Input
                  value={user.email ?? ""}
                  disabled
                  className="bg-[#0a0f1a]/50 border-white/5 text-gray-500 cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-500">Email address cannot be changed directly.</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="bg-[#0a0f1a] border-white/10 text-white"
              />
            </div>

            {/* Professional Specific Fields */}
            {user.userType === "professional" && (
              <div className="pt-6 border-t border-white/8 space-y-6">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-violet-400" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Professional Profile Details</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Primary Vocation</label>
                    <VocationSelector
                      id="profile-vocation"
                      value={vocation}
                      onChange={setVocation}
                      placeholder="Select Vocation"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Hourly Rate ($/hr)</label>
                    <Input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="50"
                      className="bg-[#0a0f1a] border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Location</label>
                    <Input
                      value={locationStr}
                      onChange={(e) => setLocationStr(e.target.value)}
                      placeholder="City, State or Country"
                      className="bg-[#0a0f1a] border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Years of Experience</label>
                    <Input
                      type="number"
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      placeholder="5"
                      className="bg-[#0a0f1a] border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Professional Bio</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your background and expertise..."
                    className="bg-[#0a0f1a] border-white/10 text-white min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Skills (comma-separated)</label>
                  <Input
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="Wiring, Panel Upgrade, Troubleshooting"
                    className="bg-[#0a0f1a] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Certifications</label>
                  <Input
                    value={certifications}
                    onChange={(e) => setCertifications(e.target.value)}
                    placeholder="Master Electrician License #12345"
                    className="bg-[#0a0f1a] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Marketplace Headline</label>
                  <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={160} placeholder="e.g. Licensed electrician for commercial fit-outs" className="bg-[#0a0f1a] border-white/10 text-white" />
                  <p className="text-[11px] text-gray-500">Help employers understand what you do best in one line.</p>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2"><div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Additional Vocations</label><Input value={additionalVocations} onChange={(e) => setAdditionalVocations(e.target.value)} placeholder="Concrete Finisher, Plasterer" className="bg-[#0a0f1a] border-white/10 text-white" /></div><div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Specializations</label><Input value={specializations} onChange={(e) => setSpecializations(e.target.value)} placeholder="Brickwork, Repairs, Finishing" className="bg-[#0a0f1a] border-white/10 text-white" /></div></div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Availability</label><select value={availabilityStatus} onChange={(e) => setAvailabilityStatus(e.target.value as ProfileAvailabilityStatus)} className="w-full rounded-md border border-white/10 bg-[#0a0f1a] px-3 py-2 text-sm text-white"><option value="available_now">Available now</option><option value="available_from">Available from a future date</option><option value="currently_working">Currently working</option><option value="emergency_only">Emergency jobs only</option><option value="not_available">Not available</option></select></div>
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Available From</label><Input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Preferred Work Days</label><Input value={preferredWorkDays} onChange={(e) => setPreferredWorkDays(e.target.value)} placeholder="Monday, Tuesday, Saturday" className="bg-[#0a0f1a] border-white/10 text-white" /></div>
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Service Areas</label><Input value={serviceAreas} onChange={(e) => setServiceAreas(e.target.value)} placeholder="Cape Town, Bellville" className="bg-[#0a0f1a] border-white/10 text-white" /></div>
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Service Radius (km)</label><Input type="number" min="0" max="1000" value={serviceRadiusKm} onChange={(e) => setServiceRadiusKm(e.target.value)} placeholder="Optional" className="bg-[#0a0f1a] border-white/10 text-white" /></div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Job Types</label><Input value={employmentTypes} onChange={(e) => setEmploymentTypes(e.target.value)} placeholder="project, contract, full_time" className="bg-[#0a0f1a] border-white/10 text-white" /><p className="text-[11px] text-gray-500">Use: contract, project, temporary, full_time.</p></div>
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Preferred Projects</label><Input value={preferredProjectTypes} onChange={(e) => setPreferredProjectTypes(e.target.value)} placeholder="Residential, Renovation, Maintenance" className="bg-[#0a0f1a] border-white/10 text-white" /></div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Job Size</label><select value={preferredJobSize} onChange={(e) => setPreferredJobSize(e.target.value as "small" | "medium" | "large" | "")} className="w-full rounded-md border border-white/10 bg-[#0a0f1a] px-3 py-2 text-sm text-white"><option value="">Any size</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></div>
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Payment Structure</label><select value={paymentStructure} onChange={(e) => setPaymentStructure(e.target.value as "hourly" | "daily" | "fixed_project" | "milestone" | "")} className="w-full rounded-md border border-white/10 bg-[#0a0f1a] px-3 py-2 text-sm text-white"><option value="">Not set</option><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="fixed_project">Fixed project</option><option value="milestone">Milestone</option></select></div>
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Minimum Project Value</label><Input type="number" min="0" value={minimumProjectValue} onChange={(e) => setMinimumProjectValue(e.target.value)} placeholder="Optional" className="bg-[#0a0f1a] border-white/10 text-white" /></div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Daily Rate</label><Input type="number" min="0" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} placeholder="Optional" className="bg-[#0a0f1a] border-white/10 text-white" /></div>
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Starting Project Rate</label><Input type="number" min="0" value={startingProjectRate} onChange={(e) => setStartingProjectRate(e.target.value)} placeholder="Optional" className="bg-[#0a0f1a] border-white/10 text-white" /></div>
                  <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Rate Visibility</label><select value={rateVisibility} onChange={(e) => setRateVisibility(e.target.value as "public" | "private")} className="w-full rounded-md border border-white/10 bg-[#0a0f1a] px-3 py-2 text-sm text-white"><option value="private">Private</option><option value="public">Public</option></select></div>
                </div>

                <div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Languages</label><Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English:fluent, Afrikaans:conversational" className="bg-[#0a0f1a] border-white/10 text-white" /><p className="text-[11px] text-gray-500">Add language:proficiency pairs. Proficiency: basic, conversational, fluent, native.</p></div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2"><div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Equipment & Capabilities</label><Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Masonry tools, Power mixer" className="bg-[#0a0f1a] border-white/10 text-white" /></div><div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Transportation</label><Input value={transportation} onChange={(e) => setTransportation(e.target.value)} placeholder="Own transportation" className="bg-[#0a0f1a] border-white/10 text-white" /></div></div>
                <label className="flex items-center gap-3 text-sm text-gray-300"><input type="checkbox" checked={willingToTravel} onChange={(e) => setWillingToTravel(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-[#0a0f1a] text-violet-600" />Willing to travel beyond my primary service area</label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-xl border border-white/8 bg-[#0a0f1a] p-3 text-sm text-gray-300"><input type="checkbox" checked={allowEmployerContact} onChange={(e) => setAllowEmployerContact(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-[#0a0f1a] text-violet-600" />Allow verified employers to contact me</label><div className="space-y-2"><label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Profile Visibility</label><select value={visibility} onChange={(e) => setVisibility(e.target.value as "visible" | "hidden")} className="w-full rounded-md border border-white/10 bg-[#0a0f1a] px-3 py-2 text-sm text-white"><option value="visible">Visible in professional search</option><option value="hidden">Hidden from professional search</option></select></div></div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-6 border-t border-white/8 flex items-center justify-end gap-3">
              <Link href="/profile">
                <Button type="button" variant="ghost" className="text-gray-400 hover:text-white">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/25 gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving Changes…" : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
