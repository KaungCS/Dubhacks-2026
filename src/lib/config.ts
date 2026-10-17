export function getClubName(): string {
  return process.env.CLUB_NAME?.trim() || "RSO Manager";
}

export function getTimezone(): string {
  return process.env.CLUB_TIMEZONE?.trim() || "America/Los_Angeles";
}
