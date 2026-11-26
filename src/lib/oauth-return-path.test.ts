import { describe, expect, it } from 'vitest';
import { oauthReturnPath } from './oauth-return-path';

describe('OAuth return paths', () => {
  it('preserves consent authorization and fragment', () => {
    expect(oauthReturnPath('/.lovable/oauth/consent?authorization_id=abc#confirm')).toBe('/.lovable/oauth/consent?authorization_id=abc#confirm');
  });
  it.each(['https://outside.invalid', '//outside.invalid', '/\\outside.invalid', '/\noutside.invalid', '/\u007foutside.invalid', null])('rejects unsafe path %s', value => {
    expect(oauthReturnPath(value)).toBe('/');
  });
});