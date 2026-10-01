import { getLoginReturnUrl } from './login-return-url';

describe('login return URL validation', () => {
  const base = 'https://example.com/abeemap/';

  for (const path of ['', 'map', 'bluetooth-map', 'integrations', 'connector-configs/create', 'binder-configs/ref-1', 'api-keys/ref-1']) {
    it(`accepts the application route ${path || '(root)'}`, () => {
      const url = `${base}${path}?filter=active#details`;
      expect(getLoginReturnUrl(url, base)?.href).toBe(url);
    });
  }

  for (const url of [
    'https://attacker.example/abeemap/map',
    'https://example.com.attacker.example/abeemap/map',
    'http://example.com/abeemap/map',
    'https://example.com:444/abeemap/map',
    'https://example.com/other/map',
    'https://example.com/abeemap-other/map',
    'https://example.com/abeemap/../other/map',
    'https://example.com/abeemap/assets/floorplans.jsonc',
    'https://example.com/abeemap/login',
    'https://example.com/abeemap/unknown',
    'https://user:password@example.com/abeemap/map',
    'javascript:alert(1)',
    'data:text/html,hello',
    '//example.com/abeemap/map',
    '/abeemap/map',
    'not a URL',
    '',
  ]) {
    it(`rejects ${url || '(missing URL)'}`, () => {
      expect(getLoginReturnUrl(url, base)).toBeNull();
    });
  }

  it('rejects non-string query parameter values', () => {
    expect(getLoginReturnUrl(undefined, base)).toBeNull();
    expect(getLoginReturnUrl(['https://example.com/abeemap/map'], base)).toBeNull();
  });

  it('supports the development root base href', () => {
    expect(getLoginReturnUrl('http://localhost:4200/map', 'http://localhost:4200/')?.pathname).toBe('/map');
  });

  it('supports a development server accessed by IP on a custom port', () => {
    const base = 'http://127.0.0.1:4300/';
    expect(getLoginReturnUrl(`${base}map`, base)?.href).toBe(`${base}map`);
    expect(getLoginReturnUrl('http://localhost:4200/map', base)).toBeNull();
  });

  it('removes callback credentials while preserving other query parameters', () => {
    const url = getLoginReturnUrl(`${base}map?access_token=old&state=old&filter=active`, base);
    expect(url?.href).toBe(`${base}map?filter=active`);
  });
});
