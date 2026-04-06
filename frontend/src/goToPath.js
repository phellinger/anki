const hashRouterBuild = ['1', 'true'].includes(
  String(process.env.REACT_APP_USE_HASH_ROUTER || '').toLowerCase()
);

export function isHashRouterBuild() {
  return hashRouterBuild;
}

/**
 * Capacitor WKWebView can ignore history.pushState; assigning location.hash still
 * triggers hashchange so HashRouter updates. Web / non-native builds use navigate().
 */
export function goToPath(navigate, path) {
  if (!hashRouterBuild) {
    navigate(path);
    return;
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  window.location.hash = `#${normalized}`;
}
