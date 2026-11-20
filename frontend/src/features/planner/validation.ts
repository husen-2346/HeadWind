import { haversineMiles } from "@/lib/geo";

export interface Place {
  label: string;
  lat: number;
  lon: number;
}

export interface TripFormValues {
  origin: Place | null;
  destination: Place | null;
  departureLocal: string;
  loadLb: number;
  intervalMiles: 10 | 25 | 50;
}

export interface ValidationResult {
  isValid: boolean;
  errors: {
    origin?: string;
    destination?: string;
    departureLocal?: string;
    loadLb?: string;
    intervalMiles?: string;
    general?: string;
  };
  disabledReason: string | null;
}

export function validateTripForm(
  values: TripFormValues,
  currentTime: Date = new Date()
): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  // 1. Origin validation
  if (!values.origin || !Number.isFinite(values.origin.lat) || !Number.isFinite(values.origin.lon)) {
    errors.origin = "Please select an origin from search suggestions";
  }

  // 2. Destination validation
  if (!values.destination || !Number.isFinite(values.destination.lat) || !Number.isFinite(values.destination.lon)) {
    errors.destination = "Please select a destination from search suggestions";
  }

  // 3. Proximity check (at least 2 miles apart)
  if (values.origin && values.destination && !errors.origin && !errors.destination) {
    const dist = haversineMiles(
      values.origin.lat,
      values.origin.lon,
      values.destination.lat,
      values.destination.lon
    );
    if (dist < 2.0) {
      errors.destination = "Origin and destination must be at least 2 miles apart";
      errors.general = "Origin and destination are too close (must be >= 2 miles)";
    }
  }

  // 4. Load weight check (1 to 100,000 lb)
  if (
    typeof values.loadLb !== "number" ||
    !Number.isFinite(values.loadLb) ||
    !Number.isInteger(values.loadLb) ||
    values.loadLb < 1 ||
    values.loadLb > 100000
  ) {
    errors.loadLb = "Cargo load must be between 1 and 100,000 lb";
  }

  // 5. Interval check (10, 25, 50 miles)
  if (![10, 25, 50].includes(values.intervalMiles)) {
    errors.intervalMiles = "Sampling interval must be 10, 25, or 50 miles";
  }

  // 6. Departure time window (now - 1h to now + 72h)
  if (!values.departureLocal || values.departureLocal.trim() === "") {
    errors.departureLocal = "Departure date and time is required";
  } else {
    const depTime = new Date(values.departureLocal).getTime();
    if (Number.isNaN(depTime)) {
      errors.departureLocal = "Invalid departure date and time";
    } else {
      const nowMs = currentTime.getTime();
      const minMs = nowMs - 60 * 60 * 1000; // 1 hour ago
      const maxMs = nowMs + 72 * 60 * 60 * 1000; // 72 hours ahead

      if (depTime < minMs) {
        errors.departureLocal = "Departure cannot be more than 1 hour in the past";
      } else if (depTime > maxMs) {
        errors.departureLocal = "Departure cannot be more than 72 hours in the future";
      }
    }
  }

  const errorKeys = Object.keys(errors);
  const isValid = errorKeys.length === 0;

  let disabledReason: string | null = null;
  if (!isValid) {
    if (errors.origin) disabledReason = errors.origin;
    else if (errors.destination) disabledReason = errors.destination;
    else if (errors.departureLocal) disabledReason = errors.departureLocal;
    else if (errors.loadLb) disabledReason = errors.loadLb;
    else if (errors.intervalMiles) disabledReason = errors.intervalMiles;
    else if (errors.general) disabledReason = errors.general;
    else disabledReason = "Please correct form inputs to analyze trip";
  }

  return {
    isValid,
    errors,
    disabledReason,
  };
}
