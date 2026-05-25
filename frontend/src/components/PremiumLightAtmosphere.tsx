/** Ambient orbs matching Cause Detail light theme — fixed behind page content. */
export function PremiumLightAtmosphere() {
  return (
    <div className="vtx-premium-atmosphere pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-[22%] top-[-6rem] h-[26rem] w-[26rem] rounded-full bg-emerald-600/[0.32] blur-[115px]" />
      <div className="absolute -right-[20%] top-[12%] h-[30rem] w-[30rem] rounded-full bg-cyan-600/[0.26] blur-[115px]" />
      <div className="absolute bottom-[-10rem] left-1/2 h-[22rem] w-[min(100%,44rem)] -translate-x-1/2 rounded-full bg-teal-600/[0.22] blur-[100px]" />
      <div className="absolute left-[38%] top-[32%] h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-emerald-500/[0.18] blur-[90px]" />
    </div>
  );
}
