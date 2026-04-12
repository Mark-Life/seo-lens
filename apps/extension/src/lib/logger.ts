import { Logger, LogLevel } from "effect";

export const LoggerLive = Logger.minimumLogLevel(
  import.meta.env.DEV ? LogLevel.Debug : LogLevel.None
);
