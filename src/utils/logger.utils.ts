export const parseExecutionLogString = (
  command: string,
  params: Record<string, any>,
) =>
  `[EXECUTED] /${command} ${Object.entries(params).map(
    ([key, value]) => `${key}: ${value}`,
  )}`;

export const isDebugMode = process.env.DEBUG_MODE === 'true';
