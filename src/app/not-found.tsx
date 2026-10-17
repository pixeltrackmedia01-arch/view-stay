import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-bold">We couldn&apos;t find that page</h1>
      <Link href="/" className="mt-6 inline-block font-medium text-brand-700 underline">Back home</Link>
    </div>
  );
}
