export default function ImmersiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="flex min-h-dvh flex-1 flex-col bg-primary-dark">
      {children}
    </main>
  );
}
