"use client";

import Image from "next/image";

type FinalSceneVisualProps = {
  submitted: number;
  threshold: number;
  unlocked: boolean;
  paid: boolean;
};

export function FinalSceneVisual(props: FinalSceneVisualProps) {
  const ready = props.submitted >= props.threshold;
  const timelineSrc = ready ? "/scene/final/timeline-4of4.svg" : "/scene/final/timeline-3of4.svg";
  const centerSrc = props.paid
    ? "/scene/final/payout-glow.svg"
    : ready || props.unlocked
      ? "/scene/final/unlock-burst.svg"
      : "/scene/final/shard-last.svg";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950/90 p-4">
      <Image
        src="/scene/final/bg-final-room.svg"
        alt="final room background"
        fill
        sizes="(max-width: 1024px) 100vw, 60vw"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
      />
      <div className="relative z-10 grid gap-4">
        <Image src={timelineSrc} alt="timeline" width={820} height={120} className="h-14 w-full object-contain" />
        <div className="flex justify-center">
          <Image src={centerSrc} alt="center visual" width={320} height={320} className="h-44 w-44 object-contain" />
        </div>
        <div className="text-center text-xs text-slate-300">
          {props.paid ? "分配完了" : props.unlocked ? "unlock済み" : ready ? "unlock可能" : "最後の鍵を待機中"}
        </div>
      </div>
    </div>
  );
}
