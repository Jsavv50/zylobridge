export type MatchProfile = {
  vocation?: string | null;
  skills?: string | null;
  location?: string | null;
  isAvailable?: boolean | null;
  yearsExperience?: number | null;
  averageRating?: string | number | null;
};

export type MatchJob = {
  vocation: string;
  title: string;
  description?: string | null;
  location: string;
  isUrgent?: boolean | null;
  createdAt?: Date | string | null;
};

export type MatchReason = {
  label: string;
  detail: string;
  points: number;
};

export type JobMatch = {
  score: number;
  reasons: MatchReason[];
};

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "your", "that", "this", "into", "have", "will", "you", "are", "job", "work", "project",
]);

function tokens(value: string | null | undefined): string[] {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/[\s,;|/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function normalized(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function locationMatches(profileLocation: string | null | undefined, jobLocation: string | null | undefined): boolean {
  const profile = normalized(profileLocation);
  const job = normalized(jobLocation);
  return Boolean(profile && job && (profile === job || profile.includes(job) || job.includes(profile)));
}

function freshnessPoints(createdAt: Date | string | null | undefined): number {
  if (!createdAt) return 0;
  const time = new Date(createdAt).getTime();
  if (!Number.isFinite(time)) return 0;
  const ageDays = Math.max(0, (Date.now() - time) / 86_400_000);
  if (ageDays <= 3) return 5;
  if (ageDays <= 14) return 3;
  return 1;
}

export function calculateExplainableJobMatch(profile: MatchProfile, job: MatchJob): JobMatch {
  const reasons: MatchReason[] = [];
  let score = 0;

  if (normalized(profile.vocation) && normalized(profile.vocation) === normalized(job.vocation)) {
    score += 45;
    reasons.push({ label: "Matches your vocation", detail: "The opportunity is in your selected vocation.", points: 45 });
  }

  const profileSkills = Array.from(new Set(tokens(profile.skills)));
  const jobText = tokens(`${job.title} ${job.description ?? ""}`);
  const overlappingSkills = profileSkills.filter((skill) => jobText.includes(skill));
  if (overlappingSkills.length > 0) {
    const points = Math.min(25, overlappingSkills.length * 5);
    score += points;
    reasons.push({ label: "Matches your skills", detail: `Shared terms: ${overlappingSkills.slice(0, 4).join(", ")}.`, points });
  }

  if (locationMatches(profile.location, job.location)) {
    score += 15;
    reasons.push({ label: "Fits your location", detail: "The job location overlaps your profile location.", points: 15 });
  }

  if (profile.isAvailable) {
    score += 5;
    reasons.push({ label: "You are marked available", detail: "Your profile currently accepts new opportunities.", points: 5 });
  }

  const experience = Number(profile.yearsExperience ?? 0);
  if (experience >= 3) {
    score += 5;
    reasons.push({ label: "Relevant experience signal", detail: "Your profile lists at least three years of experience.", points: 5 });
  }

  const freshPoints = freshnessPoints(job.createdAt);
  if (freshPoints > 0) {
    score += freshPoints;
    reasons.push({ label: "Recently posted", detail: freshPoints === 5 ? "Posted within the last three days." : "Posted within the last two weeks.", points: freshPoints });
  }

  if (job.isUrgent) {
    score += 5;
    reasons.push({ label: "Urgent opportunity", detail: "The employer has marked this job urgent.", points: 5 });
  }

  return { score: Math.min(100, score), reasons: reasons.sort((a, b) => b.points - a.points).slice(0, 4) };
}
