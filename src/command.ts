/**
 * http://www.faqs.org/rfcs/rfc854.html
 */
export enum Command {
  SE = 240,
  NOP = 241,
  DM = 242,
  BRK = 243,
  IP = 244,
  AO = 245,
  AYT = 246,
  EC = 247,
  EL = 248,
  GA = 249,
  SB = 250,

  WILL = 251,
  WONT = 252,
  DO = 253,
  DONT = 254,
  IAC = 255,

  ECHO = 1,
  SUPPRESS_GO_AHEAD = 3,
  STATUS = 5,
  TIMING_MARK = 6,
  TERMINAL_TYPE = 24,
  WINDOW_SIZE = 31,
  TERMINAL_SPEED = 32,
  REMOTE_FLOW_CONTROL = 33,
  LINEMODE = 34,
  ENVIRONMENT_VARIABLES = 36,
}
