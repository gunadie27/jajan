import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Construction } from "lucide-react";

type PlaceholderPageProps = {
    title: string;
    description?: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
    return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-2 text-center">
                <Construction className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-2xl font-bold tracking-tight font-headline">
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {description || "Fitur ini sedang dalam pengembangan dan akan segera hadir."}
                </p>
            </div>
        </div>
    );
}
