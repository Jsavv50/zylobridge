export type ApplicationStage = "submitted" | "under_review" | "shortlisted" | "interview" | "accepted" | "active" | "completed" | "rejected" | "withdrawn";

export type ApplicationLifecycleInput = {
  applicationStatus: "pending" | "accepted" | "rejected" | "withdrawn";
  jobStatus?: "open" | "in_progress" | "completed" | "cancelled" | null;
  shortlisted?: boolean;
  interviewStatus?: "proposed" | "confirmed" | "cancelled" | "completed" | null;
  engagementStatus?: "active" | "completed" | "cancelled" | "disputed" | null;
};

export function deriveApplicationStage(input: ApplicationLifecycleInput): ApplicationStage {
  if (input.applicationStatus === "withdrawn") return "withdrawn";
  if (input.applicationStatus === "rejected") return "rejected";
  if (input.engagementStatus === "completed" || input.jobStatus === "completed") return "completed";
  if (input.engagementStatus === "active" || input.jobStatus === "in_progress") return "active";
  if (input.applicationStatus === "accepted") return "accepted";
  if (input.interviewStatus === "proposed" || input.interviewStatus === "confirmed") return "interview";
  if (input.shortlisted) return "shortlisted";
  if (input.applicationStatus === "pending") return "under_review";
  return "submitted";
}

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  accepted: "Accepted",
  active: "Active",
  completed: "Completed",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const APPLICATION_STAGE_ORDER: ApplicationStage[] = ["submitted", "under_review", "shortlisted", "interview", "accepted", "active", "completed"];

export function applicationStageMessage(stage: ApplicationStage): string {
  switch (stage) {
    case "under_review": return "Your application has been submitted and is awaiting employer review.";
    case "shortlisted": return "You have been shortlisted for further consideration.";
    case "interview": return "An interview has been proposed or confirmed for this opportunity.";
    case "accepted": return "Your application was accepted. Review the engagement and payment steps.";
    case "active": return "This opportunity is an active engagement.";
    case "completed": return "This engagement is complete. Review payment and leave feedback when available.";
    case "rejected": return "This application was not selected. Explore other relevant opportunities.";
    case "withdrawn": return "You withdrew this application.";
    default: return "Your application was submitted successfully.";
  }
}
