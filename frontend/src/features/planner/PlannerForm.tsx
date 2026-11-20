import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppStore } from "@/stores/appStore";
import { useGeocode } from "@/hooks/useGeocode";
import { useAnalyzeTrip } from "@/hooks/useAnalyzeTrip";
import {
  Combobox,
  NumberInput,
  SegmentedControl,
  Button,
  InlineAlert,
  IconButton,
  ArrowRight,
  RotateCcw,
} from "@/components/ui";
import { validateTripForm, type Place } from "./validation";
import { LoadRulesNote } from "./LoadRulesNote";
import type { TripAnalysisRequest } from "@/types/api";

export function PlannerForm() {
  const [searchParams, setSearchParams] = useSearchParams();

  // App Store values & actions
  const origin = useAppStore((s) => s.origin);
  const destination = useAppStore((s) => s.destination);
  const originInput = useAppStore((s) => s.originInput);
  const destinationInput = useAppStore((s) => s.destinationInput);
  const departureLocal = useAppStore((s) => s.departureLocal);
  const loadLb = useAppStore((s) => s.loadLb);
  const intervalMiles = useAppStore((s) => s.intervalMiles);
  const analysisResult = useAppStore((s) => s.analysisResult);

  const setOrigin = useAppStore((s) => s.setOrigin);
  const setDestination = useAppStore((s) => s.setDestination);
  const setOriginInput = useAppStore((s) => s.setOriginInput);
  const setDestinationInput = useAppStore((s) => s.setDestinationInput);
  const swapLocations = useAppStore((s) => s.swapLocations);
  const clearOrigin = useAppStore((s) => s.clearOrigin);
  const clearDestination = useAppStore((s) => s.clearDestination);
  const setDepartureLocal = useAppStore((s) => s.setDepartureLocal);
  const setLoadLb = useAppStore((s) => s.setLoadLb);
  const setIntervalMiles = useAppStore((s) => s.setIntervalMiles);
  const setAnalysisResult = useAppStore((s) => s.setAnalysisResult);
  const syncPlannerFromUrl = useAppStore((s) => s.syncPlannerFromUrl);
  const getPlannerUrlParams = useAppStore((s) => s.getPlannerUrlParams);

  // Geocode suggestions for inputs
  const { data: originSuggestions = [], isFetching: isSearchingOrigin } = useGeocode(originInput);
  const { data: destSuggestions = [], isFetching: isSearchingDest } = useGeocode(destinationInput);

  // Analysis mutation
  const { mutate: analyze, isPending, cancel } = useAnalyzeTrip();

  // Local touched / submitted state for error displays
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Pre-fill form from shared URL on mount (do NOT auto-submit)
  useEffect(() => {
    if (searchParams.has("o") || searchParams.has("d") || searchParams.has("t")) {
      syncPlannerFromUrl(searchParams);
    }
  }, [searchParams, syncPlannerFromUrl]);

  // Compute validation
  const validation = validateTripForm({
    origin,
    destination,
    departureLocal,
    loadLb,
    intervalMiles,
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasAttemptedSubmit(true);
    setServerError(null);

    if (!validation.isValid || !origin || !destination) {
      return;
    }

    // Write parameters to URL query string
    setSearchParams(getPlannerUrlParams(), { replace: true });

    const requestPayload: TripAnalysisRequest = {
      origin: [origin.lon, origin.lat],
      destination: [destination.lon, destination.lat],
      departure_local: departureLocal,
      load_lb: loadLb,
      interval_miles: intervalMiles,
    };

    analyze(requestPayload, {
      onSuccess: (data) => {
        setAnalysisResult(data);
      },
      onError: (err) => {
        if (err.code !== "aborted") {
          setServerError(err.message || "Failed to analyze trip routes");
        }
      },
    });
  };

  // Timezone helper display
  const originTz = analysisResult?.request.origin_timezone;
  const timezoneHelperText = originTz
    ? `Times are in origin time zone (${originTz})`
    : "Interpreted in the origin's time zone";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left select-none">
      {/* Origin Combobox */}
      <div className="relative">
        <Combobox<Place>
          label="Origin"
          placeholder="City, state or coordinates"
          value={originInput}
          onChange={(val) => setOriginInput(val)}
          onSelectOption={(opt) => {
            if (opt.data) setOrigin(opt.data);
          }}
          options={originSuggestions.map((s) => ({
            value: `${s.lat},${s.lon}`,
            label: s.name,
            subLabel: s.place_formatted,
            data: { label: s.name, lat: s.lat, lon: s.lon },
          }))}
          loading={isSearchingOrigin}
          onClear={clearOrigin}
          error={hasAttemptedSubmit ? validation.errors.origin : undefined}
          disabled={isPending}
        />
      </div>

      {/* Swap button between Origin & Destination */}
      <div className="flex justify-center -my-2 relative z-10">
        <IconButton
          type="button"
          aria-label="Swap origin and destination"
          variant="ghost"
          size="sm"
          onClick={swapLocations}
          disabled={isPending}
          className="bg-surface border border-border h-8 w-8 text-text-muted hover:text-text rounded-full"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </IconButton>
      </div>

      {/* Destination Combobox */}
      <div className="relative">
        <Combobox<Place>
          label="Destination"
          placeholder="City, state or coordinates"
          value={destinationInput}
          onChange={(val) => setDestinationInput(val)}
          onSelectOption={(opt) => {
            if (opt.data) setDestination(opt.data);
          }}
          options={destSuggestions.map((s) => ({
            value: `${s.lat},${s.lon}`,
            label: s.name,
            subLabel: s.place_formatted,
            data: { label: s.name, lat: s.lat, lon: s.lon },
          }))}
          loading={isSearchingDest}
          onClear={clearDestination}
          error={hasAttemptedSubmit ? validation.errors.destination : undefined}
          disabled={isPending}
        />
      </div>

      {/* Departure datetime-local */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="departure-input"
          className="text-12 font-medium text-text-muted uppercase tracking-wider"
        >
          Departure Time
        </label>
        <input
          id="departure-input"
          type="datetime-local"
          value={departureLocal}
          onChange={(e) => setDepartureLocal(e.target.value)}
          disabled={isPending}
          className="w-full h-10 px-3 bg-surface border border-border rounded-input text-14 text-text font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <span className="text-12 text-text-muted">{timezoneHelperText}</span>
        {hasAttemptedSubmit && validation.errors.departureLocal && (
          <span className="text-12 text-risk-severe" role="alert">
            {validation.errors.departureLocal}
          </span>
        )}
      </div>

      {/* Cargo Load Weight with quick chips */}
      <div className="space-y-1.5">
        <NumberInput
          label="Cargo Weight"
          value={loadLb}
          onChange={(val) => setLoadLb(val)}
          monoSuffix="lb"
          min={1}
          max={100000}
          disabled={isPending}
          error={hasAttemptedSubmit ? validation.errors.loadLb : undefined}
        />
        {/* Chips */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-12 text-text-muted font-mono mr-1">Presets:</span>
          {[20000, 42000, 60000].map((preset) => {
            const isSelected = loadLb === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setLoadLb(preset)}
                disabled={isPending}
                className={`text-12 font-mono px-2 py-0.5 rounded border transition-colors ${
                  isSelected
                    ? "bg-accent/15 text-accent border-accent/50"
                    : "bg-surface text-text-muted border-border hover:text-text hover:bg-border/30"
                }`}
              >
                {preset.toLocaleString()} lb
              </button>
            );
          })}
        </div>
        {/* Dynamic active load rules indicator */}
        <LoadRulesNote loadLb={loadLb} />
      </div>

      {/* Sampling Interval */}
      <div className="space-y-1">
        <label className="text-12 font-medium text-text-muted uppercase tracking-wider block">
          Weather check every
        </label>
        <SegmentedControl<10 | 25 | 50>
          name="interval-miles"
          value={intervalMiles}
          onChange={(val) => setIntervalMiles(val)}
          options={[
            { value: 10, label: "10 mi" },
            { value: 25, label: "25 mi" },
            { value: 50, label: "50 mi" },
          ]}
        />
      </div>

      {/* Server / General error alert */}
      {serverError && (
        <InlineAlert
          type="error"
          title="Analysis Request Failed"
          message={serverError}
        />
      )}

      {/* Disabled reason visible message when invalid and user attempted submit */}
      {hasAttemptedSubmit && validation.disabledReason && (
        <div className="text-12 text-risk-severe font-mono p-2 bg-risk-severe/10 border border-risk-severe/30 rounded">
          {validation.disabledReason}
        </div>
      )}

      {/* Submit / Cancel Actions */}
      <div className="pt-2 flex items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isPending}
          disabled={isPending}
          trailingIcon={<ArrowRight className="w-4 h-4" />}
          className="flex-1"
        >
          {isPending ? "Analyzing Routes & Weather..." : "Analyze Routes"}
        </Button>

        {isPending && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={cancel}
            className="text-12 shrink-0"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
