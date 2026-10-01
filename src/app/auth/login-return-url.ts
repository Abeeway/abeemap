// Only application routes may receive a login return. In particular, exclude
// login itself and static assets, even when they share the application's origin.
const RETURN_ROUTE = /^(?:home|map|logs|bluetooth-map|integrations|user|(?:connector-configs|binder-configs|api-keys)\/[^/\\]+)\/?$/;

export function getLoginReturnUrl(value: unknown, baseURI: string): URL | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const base = new URL(baseURI);
    const url = new URL(value);
    const basePath = base.pathname.replace(/\/$/, '');

    if (!['http:', 'https:'].includes(url.protocol)
      || url.origin !== base.origin
      || url.username || url.password) return null;

    if (url.pathname !== basePath && !url.pathname.startsWith(`${basePath}/`)) {
      return null;
    }

    const route = url.pathname.slice(basePath.length).replace(/^\//, '');
    if (route && !RETURN_ROUTE.test(route)) return null;

    url.searchParams.delete('access_token');
    url.searchParams.delete('state');
    return url;
  } catch {
    return null;
  }
}
