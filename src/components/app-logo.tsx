import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  size?: 'sm' | 'md' | 'lg';
}

export function AppLogo({ size = 'md' }: AppLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-16 h-16 text-lg"
  };
  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-8 h-8"
  }

  return (
    <div className={cn("flex items-center justify-center bg-primary text-primary-foreground rounded-full", sizeClasses[size])}>
      <UtensilsCrossed className={cn(iconSizeClasses[size])} />
    </div>
  );
}
