import { describe, expect, it } from 'vitest';
import en from './en.json';
import ur from './ur.json';
function paths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    paths(child, prefix ? `${prefix}.${key}` : key),
  );
}
describe('translation key parity', () => {
  it('keeps English and Urdu key trees aligned', () => {
    expect(paths(ur).sort()).toEqual(paths(en).sort());
  });
});
