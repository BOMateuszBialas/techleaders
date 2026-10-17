/** A log value: scalars and string lists only, so a payload can never carry an object of data. */
export type CopilotLogValue = string | number | boolean | null | string[];

/**
 * Where the Copilot writes its one event per answer (Copilot spec, "AskCopilotUseCase flow").
 * The app adapts its redacting logger to this port; the payload never holds the question, a
 * prompt, fact values or model text (#27).
 */
export interface CopilotLogPort {
  info(event: string, data: Record<string, CopilotLogValue>): void;
}
