/** Server start hook. Node-only work lives in instrumentation-node.ts so it is excluded from the edge bundle. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seedIfEmpty } = await import("./instrumentation-node");
    await seedIfEmpty();
  }
}
