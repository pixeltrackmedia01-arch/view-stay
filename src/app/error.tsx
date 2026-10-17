"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const unauthorized = error.message.includes("sign in") || error.message.includes("access");
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">{unauthorized ? "Access denied" : "Something went wrong"}</h1>
      <p className="mt-2 text-slate-600">{unauthorized ? error.message : "Please try again."}</p>
      <button onClick={reset} className="mt-6 font-medium text-brand-700 underline">Try again</button>
    </div>
  );
}
