import { isEngineId, type EngineId } from '../homi';

export type Route =
  | { kind: 'home' }
  | { kind: 'engine'; engineId: EngineId }
  | { kind: 'backup' }
  | { kind: 'unknown'; path: string };

const BRAIN_ROUTE_PATH = '/brain';
const LEGACY_BACKUP_ROUTE_PATH = '/backup';

export { BRAIN_ROUTE_PATH };

export function canonicalizeRoutePath(pathname: string) {
  const clean = (pathname || '/').replace(/\/$/, '') || '/';
  if (clean === LEGACY_BACKUP_ROUTE_PATH) {
    return BRAIN_ROUTE_PATH;
  }
  return clean;
}

export function parseRoute(pathname: string): Route {
  const clean = canonicalizeRoutePath(pathname);
  if (clean === '/' || clean === '/index.html') {
    return { kind: 'home' };
  }
  if (clean === BRAIN_ROUTE_PATH) {
    return { kind: 'backup' };
  }
  const engineMatch = clean.match(/^\/engines\/([^/?#]+)$/);
  if (engineMatch) {
    const engineId = decodeURIComponent(engineMatch[1]);
    if (isEngineId(engineId)) {
      return { kind: 'engine', engineId };
    }
    return { kind: 'unknown', path: clean };
  }
  return { kind: 'unknown', path: clean };
}

let _route = $state<Route>(parseRoute(window.location.pathname));

export function getRoute(): Route {
  return _route;
}

export function setRoute(route: Route) {
  _route = route;
}

let _routeSideEffects: (() => void) | null = null;

export function setRouteSideEffects(fn: () => void) {
  _routeSideEffects = fn;
}

let _sharedImportLoader: (() => void) | null = null;

export function setSharedImportLoader(fn: () => void) {
  _sharedImportLoader = fn;
}

export function parsePath() {
  const canonicalPath = canonicalizeRoutePath(window.location.pathname);
  if (canonicalPath !== window.location.pathname) {
    history.replaceState({}, '', canonicalPath);
  }
  _route = parseRoute(canonicalPath);
  _routeSideEffects?.();
  _sharedImportLoader?.();
}

export function navigate(path: string) {
  history.pushState({}, '', path);
  parsePath();
}
