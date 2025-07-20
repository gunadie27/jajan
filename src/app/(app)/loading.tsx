export default function Loading() {
  return (
    <div className="flex h-full flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    </div>
  );
}
