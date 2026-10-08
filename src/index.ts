export { generateAgendas } from "./agendas/gen/index.ts";
import type { WgConfig } from "./configSchema.ts";
export async function getAgendaDetails(
  config: WgConfig,
  filter: { year?: string; month?: string; day?: string },
) {
  const details = await import("./agendas/details/index.ts");
  return details.getAgendaDetails(config, filter);
}
export type { Config } from "./configSchema.ts";
