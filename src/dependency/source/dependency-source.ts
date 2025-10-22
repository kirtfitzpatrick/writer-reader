export interface DependencySource {
  getString(key: string): string;
  getSecret(key: string): string;
}
