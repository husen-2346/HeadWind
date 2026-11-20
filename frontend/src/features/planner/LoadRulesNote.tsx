import { useRiskRules } from "@/hooks/useRiskRules";
import { Info } from "@/components/ui/icons";

export interface LoadRulesNoteProps {
  loadLb: number;
}

export function LoadRulesNote({ loadLb }: LoadRulesNoteProps) {
  const { data: riskRules } = useRiskRules();

  if (!riskRules || !riskRules.load_rules || riskRules.load_rules.length === 0) {
    return (
      <div className="text-12 text-text-muted flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>Load thresholds adapt weather risk to vehicle cargo weight.</span>
      </div>
    );
  }

  // Filter rules that apply to this current load weight
  const activeRules = riskRules.load_rules.filter((rule) => {
    return loadLb > rule.min_load_lb || rule.min_load_lb === 0;
  });

  return (
    <div className="space-y-1.5 text-left p-2.5 bg-surface border border-border rounded-input">
      <div className="text-12 font-medium text-text-muted flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-accent shrink-0" />
        <span>Active Load Rules ({loadLb.toLocaleString()} lb):</span>
      </div>
      <ul className="text-12 text-text-muted space-y-1 list-disc list-inside font-mono">
        {activeRules.map((r, i) => (
          <li key={i} className="text-12 leading-tight">
            <span className="text-text">{r.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
