interface SectionLabelProps {
  hint?: string;
  index?: string;
  title: string;
}

export function SectionLabel({ index, title, hint }: SectionLabelProps) {
  return (
    <div className="flex items-baseline gap-2.5">
      {index && (
        <span className="font-mono text-[10px] text-muted-foreground tracking-widest">
          {index}
        </span>
      )}
      <h2 className="font-display font-medium text-[15px] text-foreground">
        {title}
      </h2>
      {hint && (
        <span className="ml-auto font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          {hint}
        </span>
      )}
    </div>
  );
}
