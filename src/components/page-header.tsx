import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  className?: string;
}

export function PageHeader({ icon, title, subtitle, className }: PageHeaderProps) {
  return (
    <CardHeader className={cn("flex flex-row items-center gap-4", className)}>
      {icon && <div className="shrink-0">{icon}</div>}
      <div>
        <CardTitle className="font-headline text-2xl md:text-3xl font-bold leading-tight">{title}</CardTitle>
        {subtitle && <CardDescription className="text-muted-foreground mt-1">{subtitle}</CardDescription>}
      </div>
    </CardHeader>
  );
}
