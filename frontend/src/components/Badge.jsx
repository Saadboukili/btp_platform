const TONES = {
  ok: 'bg-ok-light text-ok',
  warn: 'bg-warn-light text-warn',
  danger: 'bg-danger-light text-danger',
};

export default function Badge({ label, tone = 'warn' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-full font-medium ${TONES[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
