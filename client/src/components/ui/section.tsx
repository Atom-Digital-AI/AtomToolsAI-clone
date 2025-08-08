import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  className?: string;
}

export default function Section({ children, className }: SectionProps) {
  return (
    <section className={cn("py-16 lg:py-24", className)}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}
