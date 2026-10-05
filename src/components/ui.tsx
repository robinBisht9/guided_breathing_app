import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { HAPTIC, haptics } from "../lib/feedback";
import { springs } from "../lib/motion";
import { cn } from "../utils/cn";

/* ─────────────────────────── Icon ─────────────────────────── */
export function Icon({
  name,
  size = 24,
  fill = false,
  weight = 400,
  className,
  style,
}: {
  name: string;
  size?: number;
  fill?: boolean;
  weight?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={cn("material-symbols-rounded shrink-0 select-none", className)}
      style={{
        fontSize: size,
        width: size,
        height: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${Math.min(48, Math.max(20, size))}`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}

/* ─────────────────────────── Button ─────────────────────────── */
type ButtonVariant = "filled" | "tonal" | "outlined" | "text" | "elevated";
type ButtonSize = "xs" | "sm" | "md" | "lg";

const BUTTON_SIZES = {
  xs: { h: 32, px: 12, icon: 18, pressed: 8, text: "text-sm" },
  sm: { h: 40, px: 16, icon: 20, pressed: 8, text: "text-sm" },
  md: { h: 56, px: 24, icon: 24, pressed: 12, text: "text-base" },
  lg: { h: 72, px: 32, icon: 28, pressed: 16, text: "text-lg" },
} as const;

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  filled: "bg-primary text-on-primary",
  tonal: "bg-secondary-container text-on-secondary-container",
  outlined: "border border-outline-variant text-on-surface-variant",
  text: "text-primary",
  elevated: "bg-surface-container-low text-primary elev-1",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children" | "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  children?: ReactNode;
}

/** M3 Expressive button — round at rest, corners morph tighter when pressed */
export function Button({
  variant = "filled",
  size = "sm",
  icon,
  children,
  className,
  style,
  onClick,
  type = "button",
  ...rest
}: ButtonProps) {
  const s = BUTTON_SIZES[size];
  return (
    <motion.button
      type={type}
      initial={false}
      animate={{ borderRadius: s.h / 2 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96, borderRadius: s.pressed }}
      transition={springs.fastSpatial}
      onClick={(e) => {
        haptics.play(HAPTIC.tap);
        onClick?.(e);
      }}
      style={{ height: s.h, paddingInline: s.px, ...style }}
      className={cn(
        "state-layer relative inline-flex shrink-0 select-none items-center justify-center gap-2 overflow-hidden font-semibold disabled:pointer-events-none disabled:opacity-40",
        s.text,
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={s.icon} fill />}
      {children}
    </motion.button>
  );
}

/* ─────────────────────────── Icon button ─────────────────────────── */
type IconButtonVariant = "standard" | "filled" | "tonal" | "outlined";

export interface IconButtonProps extends Omit<HTMLMotionProps<"button">, "children" | "ref"> {
  icon: string;
  label: string;
  variant?: IconButtonVariant;
  size?: number;
  iconSize?: number;
  toggle?: boolean;
  selected?: boolean;
  iconFill?: boolean;
}

function iconButtonColors(variant: IconButtonVariant, toggle: boolean, selected: boolean) {
  switch (variant) {
    case "filled":
      return toggle && !selected ? "bg-surface-container-highest text-primary" : "bg-primary text-on-primary";
    case "tonal":
      return toggle
        ? selected
          ? "bg-secondary text-on-secondary"
          : "bg-surface-container-highest text-on-surface-variant"
        : "bg-secondary-container text-on-secondary-container";
    case "outlined":
      return toggle && selected
        ? "bg-inverse-surface text-inverse-on-surface"
        : "border border-outline-variant text-on-surface-variant";
    default:
      return toggle && selected ? "text-primary" : "text-on-surface-variant";
  }
}

/** Toggle icon buttons morph from round → square when selected (M3 Expressive) */
export function IconButton({
  icon,
  label,
  variant = "standard",
  size = 48,
  iconSize,
  toggle = false,
  selected = false,
  iconFill,
  className,
  onClick,
  style,
  ...rest
}: IconButtonProps) {
  const radius = toggle && selected ? Math.round(size * 0.3) : size / 2;
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={toggle ? selected : undefined}
      initial={false}
      animate={{ borderRadius: radius }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.88, borderRadius: Math.round(size * 0.24) }}
      transition={springs.fastSpatial}
      onClick={(e) => {
        haptics.play(toggle ? HAPTIC.toggle : HAPTIC.tap);
        onClick?.(e);
      }}
      style={{ width: size, height: size, ...style }}
      className={cn(
        "state-layer relative inline-grid shrink-0 select-none place-items-center overflow-hidden transition-colors duration-200 disabled:pointer-events-none disabled:opacity-35",
        iconButtonColors(variant, toggle, selected),
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={iconSize ?? Math.round(size * 0.5)} fill={iconFill ?? (toggle ? selected : false)} />
    </motion.button>
  );
}

/* ─────────────────────────── Connected button group ─────────────────────────── */
export interface GroupOption<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

/** M3 Expressive connected button group — selected item becomes fully round, pressed item widens */
export function ConnectedButtonGroup<T extends string>({
  options,
  value,
  onChange,
  size = 48,
  ariaLabel,
  className,
}: {
  options: GroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: number;
  ariaLabel?: string;
  className?: string;
}) {
  const R = size / 2;
  const r = 8;
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("flex w-full gap-[3px]", className)}>
      {options.map((o, i) => {
        const selected = o.value === value;
        const first = i === 0;
        const last = i === options.length - 1;
        return (
          <motion.button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              if (selected) return;
              haptics.play(HAPTIC.select);
              onChange(o.value);
            }}
            initial={false}
            animate={{
              borderTopLeftRadius: selected || first ? R : r,
              borderBottomLeftRadius: selected || first ? R : r,
              borderTopRightRadius: selected || last ? R : r,
              borderBottomRightRadius: selected || last ? R : r,
              flexGrow: 1,
            }}
            whileTap={{ flexGrow: 1.35, scale: 0.98 }}
            transition={springs.fastSpatial}
            style={{ height: size, flexBasis: 0 }}
            className={cn(
              "state-layer relative flex min-w-0 items-center justify-center gap-1.5 overflow-hidden px-2 text-sm font-semibold transition-colors duration-200",
              selected ? "bg-secondary text-on-secondary" : "bg-surface-container-highest text-on-surface-variant",
            )}
          >
            {o.icon && <Icon name={o.icon} size={18} fill={selected} />}
            <span className="truncate">{o.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── Switch ─────────────────────────── */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const handle = pressed ? 28 : checked ? 24 : 16;
  const cx = checked ? 34 : 14;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        haptics.play(HAPTIC.toggle);
        onChange(!checked);
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      className={cn(
        "relative h-8 w-[52px] shrink-0 rounded-full border-2 transition-colors duration-200 disabled:opacity-40",
        checked ? "border-primary bg-primary" : "border-outline bg-surface-container-highest",
      )}
    >
      <motion.span
        className={cn(
          "absolute left-0 top-0 grid place-items-center rounded-full transition-colors duration-200",
          checked ? "bg-on-primary text-on-primary-container" : "bg-outline text-surface-container-highest",
        )}
        initial={false}
        animate={{ width: handle, height: handle, x: cx - handle / 2, y: 14 - handle / 2 }}
        transition={springs.fastSpatial}
      >
        <AnimatePresence initial={false}>
          {checked && (
            <motion.span
              key="check"
              className="grid place-items-center"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={springs.bouncy}
            >
              <Icon name="check" size={16} weight={600} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </button>
  );
}

/* ─────────────────────────── Filter chip ─────────────────────────── */
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={!!selected}
      onClick={() => {
        haptics.play(HAPTIC.tap);
        onClick();
      }}
      whileTap={{ scale: 0.92 }}
      transition={springs.fastSpatial}
      className={cn(
        "state-layer relative inline-flex h-8 items-center gap-1 overflow-hidden rounded-lg border px-3 text-sm font-medium transition-colors duration-200",
        selected
          ? "border-transparent bg-secondary-container text-on-secondary-container"
          : "border-outline-variant text-on-surface-variant",
      )}
    >
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span
            key="check"
            className="-ml-1 inline-flex overflow-hidden"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 20, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={springs.fastSpatial}
          >
            <Icon name="check" size={18} weight={600} />
          </motion.span>
        )}
      </AnimatePresence>
      {children}
    </motion.button>
  );
}

/* ─────────────────────────── Animated text (rolling numbers) ─────────────────────────── */
export function AnimatedText({ value, className }: { value: string | number; className?: string }) {
  return (
    <span className={cn("relative inline-grid overflow-hidden align-bottom", className)}>
      <AnimatePresence initial={false}>
        <motion.span
          key={String(value)}
          className="col-start-1 row-start-1 inline-block"
          initial={{ y: "70%", opacity: 0, scale: 0.7 }}
          animate={{ y: "0%", opacity: 1, scale: 1 }}
          exit={{ y: "-70%", opacity: 0, scale: 0.7 }}
          transition={springs.bouncy}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ─────────────────────────── Stepper ─────────────────────────── */
export function Stepper({
  display,
  caption,
  onDec,
  onInc,
  canDec = true,
  canInc = true,
  label,
}: {
  display: string | number;
  caption?: ReactNode;
  onDec: () => void;
  onInc: () => void;
  canDec?: boolean;
  canInc?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <IconButton icon="remove" label={`Fewer ${label}`} variant="tonal" size={56} onClick={onDec} disabled={!canDec} />
      <div className="min-w-0 flex-1 text-center">
        <AnimatedText
          value={display}
          className="text-[44px] font-semibold leading-[1.1] tracking-tight tabular-nums rond-100"
        />
        {caption && <div className="mt-0.5 text-sm text-on-surface-variant">{caption}</div>}
      </div>
      <IconButton icon="add" label={`More ${label}`} variant="tonal" size={56} onClick={onInc} disabled={!canInc} />
    </div>
  );
}
