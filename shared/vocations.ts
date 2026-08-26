export const VOCATION_CATEGORIES = [
  {
    id: "construction",
    label: "Construction & Trades",
    items: [
      { key: "electrician", label: "Electrician" }, { key: "carpenter", label: "Carpenter" }, { key: "plumber", label: "Plumber" }, { key: "mason_bricklayer", label: "Mason / Bricklayer" }, { key: "bricklayer", label: "Bricklayer" }, { key: "mason", label: "Mason" }, { key: "painter", label: "Painter" }, { key: "flooring_tiler", label: "Flooring Installer / Tiler" }, { key: "tiler", label: "Tiler" }, { key: "roofer", label: "Roofer" }, { key: "welder", label: "Welder" }, { key: "steel_fixer", label: "Steel Fixer" }, { key: "scaffolder", label: "Scaffolder" }, { key: "plasterer", label: "Plasterer" }, { key: "drywall_installer", label: "Drywall Installer" }, { key: "glazier", label: "Glazier" }, { key: "heavy_equipment_operator", label: "Heavy Equipment Operator" }, { key: "machine_operator", label: "Machine Operator" }, { key: "road_construction_worker", label: "Road Construction Worker" }, { key: "general_laborer", label: "General Laborer" }, { key: "construction_supervisor", label: "Construction Supervisor" }, { key: "site_manager", label: "Site Manager" }, { key: "quantity_surveyor", label: "Quantity Surveyor" }, { key: "civil_engineer", label: "Civil Engineer" }, { key: "structural_engineer", label: "Structural Engineer" }, { key: "architect", label: "Architect" },
    ],
  },
  {
    id: "property_facilities",
    label: "Property & Facilities",
    items: [
      { key: "hvac_technician", label: "HVAC Technician" }, { key: "refrigeration_technician", label: "Refrigeration Technician" }, { key: "elevator_installer_repairer", label: "Elevator Installer / Repairer" }, { key: "pest_control_technician", label: "Pest Control Technician" }, { key: "solar_technician", label: "Solar Technician" }, { key: "generator_technician", label: "Generator Technician" }, { key: "cleaner", label: "Cleaner" }, { key: "gardener", label: "Gardener" }, { key: "landscaper", label: "Landscaper" }, { key: "security_guard", label: "Security Guard" }, { key: "cctv_technician", label: "CCTV Technician" }, { key: "maintenance_technician", label: "Maintenance Technician" }, { key: "handyman", label: "Handyman" }, { key: "pool_technician", label: "Pool Technician" }, { key: "facilities_manager", label: "Facilities Manager" },
    ],
  },
  {
    id: "mechanical_transport",
    label: "Mechanical, Transport & Logistics",
    items: [
      { key: "mechanic", label: "Mechanic" }, { key: "auto_electrician", label: "Auto Electrician" }, { key: "diesel_mechanic", label: "Diesel Mechanic" }, { key: "forklift_operator", label: "Forklift Operator" }, { key: "driver", label: "Driver" }, { key: "delivery_driver", label: "Delivery Driver" }, { key: "truck_driver", label: "Truck Driver" }, { key: "courier", label: "Courier" }, { key: "warehouse_worker", label: "Warehouse Worker" }, { key: "logistics_coordinator", label: "Logistics Coordinator" }, { key: "dispatcher", label: "Dispatcher" },
    ],
  },
  {
    id: "personal_household",
    label: "Personal & Household Services",
    items: [
      { key: "domestic_worker", label: "Domestic Worker" }, { key: "nanny", label: "Nanny" }, { key: "caregiver", label: "Caregiver" }, { key: "cook", label: "Cook" }, { key: "baker", label: "Baker" }, { key: "hairdresser", label: "Hairdresser" }, { key: "barber", label: "Barber" }, { key: "makeup_artist", label: "Makeup Artist" }, { key: "tailor", label: "Tailor" }, { key: "fashion_designer", label: "Fashion Designer" },
    ],
  },
  {
    id: "digital_business",
    label: "Digital & Business Services",
    items: [
      { key: "graphic_designer", label: "Graphic Designer" }, { key: "web_developer", label: "Web Developer" }, { key: "software_developer", label: "Software Developer" }, { key: "it_support_specialist", label: "IT Support Specialist" }, { key: "network_technician", label: "Network Technician" }, { key: "digital_marketer", label: "Digital Marketer" }, { key: "photographer", label: "Photographer" }, { key: "videographer", label: "Videographer" }, { key: "accountant", label: "Accountant" }, { key: "bookkeeper", label: "Bookkeeper" }, { key: "administrative_assistant", label: "Administrative Assistant" },
    ],
  },
] as const;

export type VocationKey = (typeof VOCATION_CATEGORIES)[number]["items"][number]["key"];

export const VOCATION_KEYS = VOCATION_CATEGORIES.flatMap((category) => category.items.map((item) => item.key)) as VocationKey[];

export const VOCATION_LABELS = Object.fromEntries(
  VOCATION_CATEGORIES.flatMap((category) => category.items.map((item) => [item.key, item.label])),
) as Record<VocationKey, string>;

export const VOCATION_ICONS = Object.fromEntries(VOCATION_KEYS.map((key) => [key, "•"])) as Record<VocationKey, string>;

export const JOB_STATUS_LABELS = {
  draft: "Draft",
  open: "Open",
  paused: "Paused",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  closed: "Closed",
} as const;

export const APPLICATION_STATUS_LABELS = {
  pending: "Pending",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  interview: "Interview",
  accepted: "Accepted",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
} as const;
