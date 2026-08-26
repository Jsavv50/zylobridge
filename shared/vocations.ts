export const VOCATION_KEYS = [
  "electrician",
  "carpenter",
  "plumber",
  "mason_bricklayer",
  "painter",
  "flooring_tiler",
  "heavy_equipment_operator",
  "road_construction_worker",
  "hvac_technician",
  "elevator_installer_repairer",
  "pest_control_technician",
  "glazier",
] as const;

export type VocationKey = (typeof VOCATION_KEYS)[number];

export const VOCATION_LABELS: Record<VocationKey, string> = {
  electrician: "Electrician",
  carpenter: "Carpenter",
  plumber: "Plumber",
  mason_bricklayer: "Mason / Bricklayer",
  painter: "Painter",
  flooring_tiler: "Flooring Installer / Tiler",
  heavy_equipment_operator: "Heavy Equipment Operator",
  road_construction_worker: "Road Construction Worker",
  hvac_technician: "HVAC Technician",
  elevator_installer_repairer: "Elevator Installer / Repairer",
  pest_control_technician: "Pest Control Technician",
  glazier: "Glazier (Glass Installer)",
};

export const VOCATION_ICONS: Record<VocationKey, string> = {
  electrician: "⚡",
  carpenter: "🪵",
  plumber: "🔧",
  mason_bricklayer: "🧱",
  painter: "🎨",
  flooring_tiler: "🏠",
  heavy_equipment_operator: "🏗️",
  road_construction_worker: "🛣️",
  hvac_technician: "❄️",
  elevator_installer_repairer: "🛗",
  pest_control_technician: "🐛",
  glazier: "🪟",
};

export const JOB_STATUS_LABELS = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

export const APPLICATION_STATUS_LABELS = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
} as const;
