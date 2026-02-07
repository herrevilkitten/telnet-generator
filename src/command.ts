/**
 * @see http://www.faqs.org/rfcs/rfc854.html
 */
export enum Command {
  /** End of subnegotiation parameters */
  SE = 240,
  /** No operation */
  NOP = 241,
  /** Data mark */
  DM = 242,
  /** Break */
  BRK = 243,
  /** Interrupt process */
  IP = 244,
  /** Abort output */
  AO = 245,
  /** Are you there */
  AYT = 246,
  /** Erase character */
  EC = 247,
  /** Erase line */
  EL = 248,
  /** Go ahead */
  GA = 249,
  /** Start of subnegotiation */
  SB = 250,

  /** Will perform */
  WILL = 251,
  /** Won't perform */
  WONT = 252,
  /** Do perform */
  DO = 253,
  /** Don't perform */
  DONT = 254,
  /** Interpret as command */
  IAC = 255,

  /** Echo */
  ECHO = 1,
  /** Suppress go ahead */
  SUPPRESS_GO_AHEAD = 3,
  /** Status */
  STATUS = 5,
  /** Timing mark */
  TIMING_MARK = 6,
  /** Terminal type */
  TERMINAL_TYPE = 24,
  /** Window size */
  WINDOW_SIZE = 31,
  /** Terminal speed */
  TERMINAL_SPEED = 32,
  /** Remote flow control */
  REMOTE_FLOW_CONTROL = 33,
  /** Linemode */
  LINEMODE = 34,
  /** Environment variables */
  ENVIRONMENT_VARIABLES = 36,
}
