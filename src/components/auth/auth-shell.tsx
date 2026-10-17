import { Card, CardContent } from "@/components/ui/card";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md">
        <h1 className="text-center font-display text-3xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-center text-ink-2">{subtitle}</p>}
        <Card className="mt-6">
          <CardContent className="py-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
