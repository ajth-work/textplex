type TextPlexRoleUser = {
  app_metadata?: Record<string, unknown> | null;
} | null | undefined;

export function isTextPlexAdmin(user: TextPlexRoleUser): boolean {
  return user?.app_metadata?.textplex_role === "admin";
}

export function isTextPlexTester(user: TextPlexRoleUser): boolean {
  return user?.app_metadata?.textplex_role === "tester";
}
