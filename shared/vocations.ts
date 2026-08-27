type VocationEntry = readonly [string, string];

export const VOCATION_CATEGORIES = [
  {
    key: "construction_structural",
    label: "Construction & Structural Trades",
    icon: "🏗️",
    vocations: [
      ["carpenter", "Carpenter"],
      ["mason_bricklayer", "Mason / Bricklayer"],
      ["steel_fixer", "Steel Fixer / Reinforcing Ironworker"],
      ["roofer", "Roofer"],
      ["scaffolder", "Scaffolder"],
      ["drywall_gypsum_installer", "Drywall / Gypsum Installer"],
      ["acoustic_ceiling_wallpaper_installer", "Acoustic Ceiling / Wallpaper Installer"],
      ["concrete_finisher", "Concrete Finisher"],
      ["stone_mason", "Stone Mason"],
      ["waterproofing_technician", "Waterproofing Technician"],
      ["insulation_installer", "Insulation Installer"],
      ["glazier", "Glazier (Glass Installer)"],
      ["rigger", "Rigger"],
      ["building_restoration_technician", "Building Restoration Technician"],
      ["demolition_worker", "Demolition Worker"],
      ["handyman", "Handyman"],
      ["heavy_equipment_operator", "Heavy Equipment Operator"],
      ["painter", "Painter"],
      ["flooring_tiler", "Flooring Installer / Tiler"],
    ],
  },
  {
    key: "electrical_energy_building_technology",
    label: "Electrical, Energy & Building Technology",
    icon: "⚡",
    vocations: [
      ["electrician", "Electrician"],
      ["solar_pv_installer", "Solar PV Installer"],
      ["solar_technician", "Solar Technician"],
      ["generator_technician", "Generator Technician"],
      ["power_systems_technician", "Power Systems Technician"],
      ["wind_turbine_technician", "Wind Turbine Technician"],
      ["fire_alarm_technician", "Fire Alarm Technician"],
      ["security_systems_cctv_technician", "Security Systems / CCTV Technician"],
      ["smart_home_building_automation_technician", "Smart Home / Building Automation Technician"],
      ["fiber_optics_installer", "Fiber Optics Installer"],
      ["telecommunication_technician", "Telecommunication Technician"],
      ["security_system_installer", "Security System Installer"],
      ["hvac_technician", "HVAC Technician"],
    ],
  },
  {
    key: "plumbing_water_environmental",
    label: "Plumbing, Water & Environmental Systems",
    icon: "🚰",
    vocations: [
      ["plumber", "Plumber"],
      ["pipefitter", "Pipefitter"],
      ["gas_technician", "Gas Technician"],
      ["sanitary_installation_technician", "Sanitary Installation Technician"],
      ["drainage_technician", "Drainage Technician"],
      ["water_treatment_technician", "Water Treatment Technician"],
      ["borehole_technician_driller", "Borehole Technician / Driller"],
      ["irrigation_smart_agricultural_technician", "Irrigation / Smart Agricultural Technician"],
      ["pool_technician", "Pool Technician"],
    ],
  },
  {
    key: "civil_engineering_roads_infrastructure",
    label: "Civil Engineering, Roads & Infrastructure",
    icon: "🚧",
    vocations: [
      ["civil_engineer", "Civil Engineer"],
      ["surveyor", "Surveyor"],
      ["road_construction_worker", "Road Construction Worker"],
      ["road_marking_technician", "Road Marking Technician"],
      ["excavation_worker", "Excavation Worker"],
      ["bridge_construction_worker", "Bridge Construction Worker"],
      ["railway_construction_worker", "Railway Construction Worker"],
      ["port_railway_worker", "Port and Railway Worker"],
      ["geological_field_assistant", "Geological Field Assistant"],
      ["drilling_operator", "Drilling Operator"],
    ],
  },
  {
    key: "mechanical_industrial_plant",
    label: "Mechanical, Industrial & Plant Trades",
    icon: "🔧",
    vocations: [
      ["automotive_mechanic", "Automotive Mechanic"],
      ["heavy_vehicle_mechanic", "Heavy Vehicle Mechanic"],
      ["fitters_turners", "Fitters & Turners"],
      ["plant_mechanic", "Plant Mechanic"],
      ["industrial_machinery_technician", "Industrial Machinery Technician"],
      ["heavy_equipment_operator", "Heavy Equipment Operator"],
      ["hydraulic_technician", "Hydraulic Technician"],
      ["compressed_air_pneumatic_technician", "Compressed Air / Pneumatic Technician"],
      ["millwright", "Millwright"],
      ["machinist", "Machinist"],
      ["boilermaker", "Boilermaker"],
      ["welder_fabricator", "Welder / Fabricator"],
      ["pipe_welder", "Pipe Welder"],
      ["mining_technician", "Mining Technician"],
      ["mining_equipment_plant_technician", "Mining Equipment / Plant Technician"],
      ["mechanical_industrial_technician", "Mechanical / Industrial Technician"],
    ],
  },
  {
    key: "transport_logistics_fleet",
    label: "Transport, Logistics & Fleet",
    icon: "🚛",
    vocations: [
      ["truck_driver", "Truck Driver"],
      ["fleet_operator", "Fleet Operator"],
      ["warehouse_worker", "Warehouse Worker"],
      ["supply_chain_technician", "Supply Chain Technician"],
      ["port_railway_worker", "Port and Railway Worker"],
    ],
  },
  {
    key: "agriculture_land_forestry",
    label: "Agriculture, Land & Forestry",
    icon: "🌾",
    vocations: [
      ["agricultural_processing_worker", "Agricultural Processing Worker"],
      ["irrigation_smart_agricultural_technician", "Irrigation / Smart Agricultural Technician"],
      ["farm_equipment_operator", "Farm Equipment Operator"],
      ["arborist", "Arborist"],
      ["landscape_maintenance_worker", "Landscape Maintenance Worker"],
      ["gardener_groundskeeper", "Gardener / Groundskeeper"],
      ["geological_field_assistant", "Geological Field Assistant"],
    ],
  },
  {
    key: "property_facilities_maintenance",
    label: "Property, Facilities & Maintenance",
    icon: "🏢",
    vocations: [
      ["general_maintenance_technician", "General Maintenance Technician"],
      ["building_maintenance_technician", "Building Maintenance Technician"],
      ["facilities_technician", "Facilities Technician"],
      ["private_commercial_cleaning_technician", "Private & Commercial Cleaning Technician"],
      ["appliance_repair_technician", "Appliance Repair Technician"],
      ["door_window_installer", "Door / Window Installer"],
      ["locksmith", "Locksmith"],
      ["furniture_maker", "Furniture Maker"],
    ],
  },
  {
    key: "safety_security_fire",
    label: "Safety, Security & Fire Protection",
    icon: "🔥",
    vocations: [
      ["safety_officer", "Safety Officer"],
      ["fire_protection_technician", "Fire Protection Technician"],
      ["fire_sprinkler_installer", "Fire Sprinkler Installer"],
      ["fire_extinguisher_technician", "Fire Extinguisher Technician"],
      ["security_system_installer", "Security System Installer"],
      ["security_systems_cctv_technician", "Security Systems / CCTV Technician"],
      ["fire_alarm_technician", "Fire Alarm Technician"],
    ],
  },
  {
    key: "technology_inspection_specialized",
    label: "Technology, Inspection & Specialized Services",
    icon: "🚁",
    vocations: [
      ["drone_operator", "Drone Operator"],
      ["fiber_optics_installer", "Fiber Optics Installer"],
      ["telecommunication_technician", "Telecommunication Technician"],
      ["surveyor", "Surveyor"],
      ["geological_field_assistant", "Geological Field Assistant"],
      ["elevator_installer_repairer", "Elevator Installer / Repairer"],
      ["pest_control_technician", "Pest Control Technician"],
    ],
  },
] as const;

export type VocationKey = (typeof VOCATION_CATEGORIES)[number]["vocations"][number][0];

export const VOCATION_KEYS = Array.from(
  new Set(VOCATION_CATEGORIES.flatMap((category) => category.vocations.map(([key]) => key))),
) as VocationKey[];

const ALL_VOCATION_ENTRIES: VocationEntry[] = [];
for (const category of VOCATION_CATEGORIES) {
  for (const entry of category.vocations) ALL_VOCATION_ENTRIES.push(entry as VocationEntry);
}

export const VOCATION_LABELS = Object.fromEntries(ALL_VOCATION_ENTRIES) as Record<VocationKey, string>;

export const VOCATION_ICONS = Object.fromEntries(
  VOCATION_CATEGORIES.flatMap((category) => category.vocations.map(([key]) => [key, category.icon] as const)),
) as Record<VocationKey, string>;

export const VOCATION_CATEGORY_BY_KEY = Object.fromEntries(
  VOCATION_CATEGORIES.flatMap((category) => category.vocations.map(([key]) => [key, category.label] as const)),
) as Record<VocationKey, string>;

const VOCATION_ALIASES: Record<string, VocationKey> = Object.fromEntries(
  Object.entries(VOCATION_LABELS).map(([key, label]) => [label.toLowerCase(), key]),
) as Record<string, VocationKey>;

export function normalizeVocation(value: string): VocationKey | undefined {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*\/\s*/g, " / ");
  if (VOCATION_KEYS.includes(normalized as VocationKey)) return normalized as VocationKey;
  return VOCATION_ALIASES[normalized];
}

export function getVocationLabel(value: string | null | undefined): string {
  if (!value) return "Vocation not specified";
  const key = normalizeVocation(value);
  return key ? VOCATION_LABELS[key] : value;
}

export function searchVocations(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const seen = new Set<VocationKey>();
  const results: Array<{ key: VocationKey; label: string; category: string; icon: string }> = [];
  for (const category of VOCATION_CATEGORIES) {
    for (const [key, label] of category.vocations) {
      const canonicalKey = key as VocationKey;
      if (seen.has(canonicalKey)) continue;
      if (normalizedQuery && !label.toLowerCase().includes(normalizedQuery)) continue;
      seen.add(canonicalKey);
      results.push({ key: canonicalKey, label, category: category.label, icon: category.icon });
    }
  }
  return results;
}

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
