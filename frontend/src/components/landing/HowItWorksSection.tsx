/**
 * HowItWorksSection.tsx – Interactive/deterministic time-distance diagram.
 *
 * Demonstrates why sampling weather at the truck's ETA is essential.
 * Uses pure functions to model a moving storm band and two truck departures (06:00 vs 10:00).
 * Place callout markers exactly at mile 520 on the axis without prompt defects.
 */

export function HowItWorksSection() {
  // Chart dimensions & coordinate mapping
  // X: Time 06:00 (left=80) to 22:00 (right=660) -> 16 hours span = 580px
  // Y: Mile 0 (bottom=330) to Mile 800 (top=50) -> 800 miles span = 280px

  const timeToX = (hour: number) => 80 + ((hour - 6) / 16) * 580;
  const mileToY = (mile: number) => 330 - (mile / 800) * 280;

  // Truck 1: departs 06:00, travels 800 miles at ~55 mph (14.5 hours -> arrives 20:30)
  // Reaches mile 520 at hour = 6 + (520 / 55) = 15.45 (15:27)
  const t1DepHour = 6;
  const t1Mile520Hour = t1DepHour + 520 / 55;
  const t1ArrHour = 20.5;

  // Truck 2: departs 10:00, travels 800 miles at ~55 mph (arrives 00:30, off chart or 22:00 at mile 660)
  // Reaches mile 520 at hour = 10 + (520 / 55) = 19.45 (19:27)
  const t2DepHour = 10;
  const t2Mile520Hour = t2DepHour + 520 / 55;

  const mile520Y = mileToY(520);
  const t1Mile520X = timeToX(t1Mile520Hour);
  const t2Mile520X = timeToX(t2Mile520Hour);

  return (
    <section
      id="how-it-works"
      className="py-20 md:py-28 bg-surface/40 border-b border-border scroll-mt-16 text-left"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-badge border border-border bg-surface">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-11 font-mono uppercase tracking-wider text-text-muted">
              How It Works
            </span>
          </div>

          <h2 className="text-display-32 sm:text-display-40 font-bold tracking-tight text-text">
            The forecast that matters is the one at your arrival.
          </h2>

          <p className="text-16 text-text-muted leading-relaxed">
            Static weather snapshots are misleading for long hauls. A corridor
            that looks clear at departure can develop severe storms hours down
            the road—or a storm at departure may clear before you reach it.
            Headwind calculates your ETA at every checkpoint to query the exact
            forecast for when your wheels touch the pavement.
          </p>
        </div>

        {/* SVG Time-Distance Chart */}
        <div className="bg-surface border border-border rounded-panel p-4 md:p-8">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
            <div className="space-y-0.5">
              <span className="text-13 font-mono font-medium text-text">
                Corridor Time-Distance Simulation
              </span>
              <p className="text-12 font-mono text-text-muted">
                Route trajectory vs. moving storm cell along I-25 corridor
              </p>
            </div>
            <span className="text-11 font-mono text-text-muted hidden sm:inline">
              Pure deterministic model
            </span>
          </div>

          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox="0 0 740 380"
              className="w-full min-w-[640px] select-none font-mono"
              aria-label="Time-Distance chart showing two truck departure trajectories intersecting a moving storm front"
              role="img"
            >
              {/* Chart Grid Lines */}
              {[0, 200, 400, 520, 600, 800].map((m) => (
                <g key={`mile-grid-${m}`}>
                  <line
                    x1="80"
                    y1={mileToY(m)}
                    x2="660"
                    y2={mileToY(m)}
                    stroke={m === 520 ? "#2E9CCA" : "rgba(255,255,255,0.08)"}
                    strokeDasharray={m === 520 ? "3 3" : undefined}
                    strokeWidth={m === 520 ? "1.5" : "1"}
                  />
                  <text
                    x="70"
                    y={mileToY(m) + 4}
                    textAnchor="end"
                    fill={m === 520 ? "#2E9CCA" : "rgba(255,255,255,0.4)"}
                    fontSize="11"
                    fontWeight={m === 520 ? "bold" : "normal"}
                  >
                    {m === 520 ? "Mi 520" : `${m} mi`}
                  </text>
                </g>
              ))}

              {/* Hourly Time Ticks */}
              {[6, 8, 10, 12, 14, 16, 18, 20, 22].map((h) => (
                <g key={`hour-grid-${h}`}>
                  <line
                    x1={timeToX(h)}
                    y1="50"
                    x2={timeToX(h)}
                    y2="330"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="1"
                  />
                  <text
                    x={timeToX(h)}
                    y="352"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.45)"
                    fontSize="11"
                  >
                    {`${h.toString().padStart(2, "0")}:00`}
                  </text>
                </g>
              ))}

              {/* Axis Titles */}
              <text
                x="40"
                y="35"
                fill="rgba(255,255,255,0.5)"
                fontSize="11"
                fontWeight="bold"
              >
                DISTANCE
              </text>
              <text
                x="670"
                y="352"
                fill="rgba(255,255,255,0.5)"
                fontSize="11"
                fontWeight="bold"
              >
                TIME
              </text>

              {/* Moving Storm Cell (Active from 13:00 to 18:00, crossing miles 460 to 620) */}
              <polygon
                points={`
                  ${timeToX(12.5)},${mileToY(440)}
                  ${timeToX(16.5)},${mileToY(600)}
                  ${timeToX(18)},${mileToY(540)}
                  ${timeToX(14)},${mileToY(380)}
                `}
                fill="#D1344B"
                fillOpacity="0.28"
                stroke="#D1344B"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <text
                x={timeToX(15)}
                y={mileToY(490)}
                fill="#D1344B"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                Severe Storm Cell (45+ mph)
              </text>

              {/* Truck 1 Line (06:00 Departure) -> Enters storm cell at Mile 520 (~15:30) */}
              <line
                x1={timeToX(t1DepHour)}
                y1={mileToY(0)}
                x2={timeToX(t1ArrHour)}
                y2={mileToY(800)}
                stroke="#D1344B"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Truck 2 Line (10:00 Departure) -> Crosses Mile 520 at 19:30 AFTER storm moved out */}
              <line
                x1={timeToX(t2DepHour)}
                y1={mileToY(0)}
                x2={timeToX(22)}
                y2={mileToY(660)}
                stroke="#2E9CCA"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Truck 1 Callout Dot at EXACT Mile 520 */}
              <circle
                cx={t1Mile520X}
                cy={mile520Y}
                r="6"
                fill="#D1344B"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              {/* Callout Box Truck 1 */}
              <g transform={`translate(${t1Mile520X - 100}, ${mile520Y - 45})`}>
                <rect
                  width="145"
                  height="34"
                  rx="4"
                  fill="#1C0F13"
                  stroke="#D1344B"
                  strokeWidth="1.2"
                />
                <text x="8" y="15" fill="#FFFFFF" fontSize="10" fontWeight="bold">
                  Truck 1 (Dep 06:00)
                </text>
                <text x="8" y="27" fill="#D1344B" fontSize="9">
                  Mile 520 at 15:27 → Severe
                </text>
              </g>

              {/* Truck 2 Callout Dot at EXACT Mile 520 */}
              <circle
                cx={t2Mile520X}
                cy={mile520Y}
                r="6"
                fill="#2E9CCA"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              {/* Callout Box Truck 2 */}
              <g transform={`translate(${t2Mile520X + 15}, ${mile520Y - 15})`}>
                <rect
                  width="145"
                  height="34"
                  rx="4"
                  fill="#0B1A24"
                  stroke="#2E9CCA"
                  strokeWidth="1.2"
                />
                <text x="8" y="15" fill="#FFFFFF" fontSize="10" fontWeight="bold">
                  Truck 2 (Dep 10:00)
                </text>
                <text x="8" y="27" fill="#2E9CCA" fontSize="9">
                  Mile 520 at 19:27 → Clear
                </text>
              </g>
            </svg>
          </div>

          {/* Explanation Footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 mt-6 border-t border-border text-left">
            <div className="p-3 bg-risk-severe/10 border border-risk-severe/30 rounded-card space-y-1">
              <span className="text-12 font-mono font-bold text-risk-severe">
                Earlier isn't always safer
              </span>
              <p className="text-12 text-text-muted leading-relaxed">
                Truck 1 left early at 06:00 and drove straight into the peak storm
                front at mile 520 around 15:30.
              </p>
            </div>
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-card space-y-1">
              <span className="text-12 font-mono font-bold text-accent">
                ETA-synchronized weather
              </span>
              <p className="text-12 text-text-muted leading-relaxed">
                Truck 2 delayed departure to 10:00. By the time it arrived at mile
                520 at 19:30, the storm had safely dissipated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
