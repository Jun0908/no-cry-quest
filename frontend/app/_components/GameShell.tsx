"use client";

import { ReactNode } from "react";

type GameShellProps = {
    children: ReactNode;
};

export function GameShell({ children }: GameShellProps) {
    return (
        <div
            className="relative min-h-screen w-full overflow-x-hidden"
            style={{
                background: "radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a1a 60%, #0d0508 100%)",
                fontFamily: "'Noto Serif JP', 'Hiragino Mincho ProN', serif",
            }}
        >
            {/* Ambient particle overlay */}
            <div
                className="pointer-events-none fixed inset-0 z-0"
                style={{
                    background:
                        "radial-gradient(ellipse at 20% 30%, rgba(201,150,42,0.06) 0%, transparent 60%), " +
                        "radial-gradient(ellipse at 80% 70%, rgba(120,40,80,0.08) 0%, transparent 60%)",
                }}
            />
            <div className="relative z-10 mx-auto max-w-[430px] px-4 pb-20 pt-6">
                {children}
            </div>
        </div>
    );
}

type PhaseCardProps = {
    phase: number;
    currentPhase: number;
    title: string;
    icon: string;
    children: ReactNode;
    done?: boolean;
};

export function PhaseCard({ phase, currentPhase, title, icon, children, done }: PhaseCardProps) {
    const active = phase === currentPhase;
    const past = phase < currentPhase || done;

    return (
        <div
            className="mb-4 overflow-hidden rounded-2xl transition-all duration-500"
            style={{
                border: active
                    ? "1px solid rgba(201,150,42,0.6)"
                    : past
                        ? "1px solid rgba(201,150,42,0.2)"
                        : "1px solid rgba(255,255,255,0.08)",
                background: active
                    ? "rgba(20,12,4,0.92)"
                    : past
                        ? "rgba(10,10,10,0.6)"
                        : "rgba(10,10,10,0.4)",
                boxShadow: active ? "0 0 32px rgba(201,150,42,0.15), inset 0 0 32px rgba(0,0,0,0.4)" : "none",
            }}
        >
            {/* Header */}
            <div
                className="flex items-center gap-3 px-5 py-4"
                style={{
                    borderBottom: active ? "1px solid rgba(201,150,42,0.2)" : "none",
                    background: past && !active
                        ? "rgba(201,150,42,0.05)"
                        : "transparent",
                }}
            >
                <span className="text-xl">{icon}</span>
                <span
                    className="flex-1 text-sm font-semibold tracking-widest"
                    style={{ color: active ? "#c9962a" : past ? "rgba(201,150,42,0.5)" : "rgba(255,255,255,0.3)" }}
                >
                    {title}
                </span>
                {past && (
                    <span className="text-xs" style={{ color: "rgba(201,150,42,0.7)" }}>
                        ✓ 完了
                    </span>
                )}
                {active && (
                    <span
                        className="animate-pulse rounded-full px-2 py-0.5 text-xs"
                        style={{ background: "rgba(201,150,42,0.2)", color: "#c9962a" }}
                    >
                        進行中
                    </span>
                )}
            </div>

            {/* Body — only show if active */}
            {active && <div className="px-5 pb-5 pt-4">{children}</div>}
        </div>
    );
}

type GoldButtonProps = {
    onClick?: () => void;
    disabled?: boolean;
    children: ReactNode;
    variant?: "primary" | "secondary" | "danger" | "ghost";
    className?: string;
};

export function GoldButton({ onClick, disabled, children, variant = "primary", className = "" }: GoldButtonProps) {
    const styles: Record<string, React.CSSProperties> = {
        primary: {
            background: disabled ? "rgba(100,80,20,0.3)" : "linear-gradient(135deg, #c9962a 0%, #e8b84b 50%, #c9962a 100%)",
            color: disabled ? "rgba(255,255,255,0.3)" : "#0a0a1a",
            boxShadow: disabled ? "none" : "0 0 20px rgba(201,150,42,0.4)",
        },
        secondary: {
            background: "transparent",
            border: "1px solid rgba(201,150,42,0.5)",
            color: disabled ? "rgba(201,150,42,0.3)" : "#c9962a",
        },
        danger: {
            background: "transparent",
            border: "1px solid rgba(200,60,60,0.5)",
            color: disabled ? "rgba(200,60,60,0.3)" : "#e07070",
        },
        ghost: {
            background: "rgba(255,255,255,0.05)",
            color: disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)",
        },
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold tracking-wider transition-all duration-200 active:scale-95 disabled:cursor-not-allowed ${className}`}
            style={styles[variant]}
        >
            {children}
        </button>
    );
}

export function StatusBadge({ ok, text }: { ok: boolean; text: string }) {
    return (
        <span
            className="rounded-full px-2 py-1 text-xs font-medium"
            style={{
                background: ok ? "rgba(40,120,60,0.25)" : "rgba(120,80,20,0.25)",
                color: ok ? "#60d080" : "#c9962a",
                border: ok ? "1px solid rgba(60,180,80,0.3)" : "1px solid rgba(201,150,42,0.3)",
            }}
        >
            {text}
        </span>
    );
}

export function GoldDivider() {
    return (
        <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, rgba(201,150,42,0.4), transparent)" }} />
            <span className="text-xs" style={{ color: "rgba(201,150,42,0.5)" }}>✦</span>
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, rgba(201,150,42,0.4), transparent)" }} />
        </div>
    );
}

export function TextSm({ children, muted }: { children: ReactNode; muted?: boolean }) {
    return (
        <p className="text-xs leading-relaxed" style={{ color: muted ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.65)" }}>
            {children}
        </p>
    );
}
