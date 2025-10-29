import crypto from "node:crypto";

/**
 * Generate a random string for PKCE code verifier
 * Length must be between 43 and 128 characters
 */
export function generateCodeVerifier(): string {
  // Generate 64 bytes (512 bits) = 128 base64 characters, but URL-safe base64
  // Will be trimmed to 128 chars max which meets requirements
  const bytes = crypto.randomBytes(64);
  return bytes.toString("base64url");
}

/**
 * Generate code challenge from code verifier using SHA256
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash.toString("base64url");
}

/**
 * Generate a random state parameter for CSRF protection
 * Length must be between 22 and 1024 characters
 */
export function generateState(): string {
  // Generate 32 bytes = 44 base64 characters (meets 22 char minimum)
  const bytes = crypto.randomBytes(32);
  return bytes.toString("base64url");
}
