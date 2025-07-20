import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight } from "lucide-react";

interface SessionWarningProps {
  title?: string;
  description?: string;
  showActionButton?: boolean;
}

export function SessionWarning({ 
  title = "Sesi Kasir Belum Aktif", 
  description = "Anda harus membuka sesi kasir terlebih dahulu sebelum dapat melakukan transaksi atau input pengeluaran.",
  showActionButton = true 
}: SessionWarningProps) {
  const router = useRouter();

  const handleOpenSession = () => {
    router.push('/cash-drawer');
  };

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm">{description}</p>
          </div>
          {showActionButton && (
            <Button 
              onClick={handleOpenSession}
              size="sm" 
              className="w-fit bg-orange-600 hover:bg-orange-700 text-white"
            >
              Buka Sesi Kasir
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
} 