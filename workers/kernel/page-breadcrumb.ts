type MenuItem = {
  labelKey: string;
  path: string;
};

type MenuModule = {
  menuLabelKey: string;
  menu: readonly MenuItem[];
};

export type PageCrumb = {
  label: string;
  to?: string;
};

// Dashboard, then the menu section, then the page. A longer menu path wins
// so /levels/o-level/1 stays under O-Level rather than a shorter match.
export function crumbsForPath(
  pathname: string,
  label: (key: string) => string,
  modules: readonly MenuModule[],
  shell: readonly MenuItem[],
): PageCrumb[] {
  const path = pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;
  const dashboard: PageCrumb = path === '/'
    ? { label: label('dashboard') }
    : { label: label('dashboard'), to: '/' };
  if (path === '/' || path === '') {
    return [{ label: label('dashboard') }];
  }

  const extra = extraCrumbs(path, label);
  if (extra) {
    return [dashboard, ...extra];
  }

  const matched = longestMenuMatch(path, label, modules, shell);
  if (matched) {
    return [dashboard, ...matched];
  }
  const extensionCrumb = extensionCrumbFor(path);
  if (extensionCrumb) {
    return [dashboard, extensionCrumb];
  }
  return [dashboard];
}

function extraCrumbs(path: string, label: (key: string) => string): PageCrumb[] | null {
  if (path === '/profile/security') {
    return [
      { label: label('profile'), to: '/profile' },
      { label: label('accountSecurity') },
    ];
  }
  if (path === '/profile' || path.startsWith('/profile/')) {
    return [{ label: label('profile') }];
  }
  if (path === '/settings' || path.startsWith('/settings/')) {
    return [{ label: label('settings') }];
  }
  if (path === '/schools/new') {
    return [
      { label: label('schoolsSetup'), to: '/schools/profile' },
      { label: label('addSchool') },
    ];
  }
  if (/^\/schools\/\d+/.test(path)) {
    return [
      { label: label('schoolsSetup'), to: '/schools/profile' },
      { label: label('schoolProfile') },
    ];
  }
  return null;
}

function longestMenuMatch(
  path: string,
  label: (key: string) => string,
  modules: readonly MenuModule[],
  shell: readonly MenuItem[],
): PageCrumb[] | null {
  let bestPath = '';
  let best: PageCrumb[] | null = null;

  const keep = (itemPath: string, crumbs: PageCrumb[]) => {
    const matches = path === itemPath || path.startsWith(`${itemPath}/`);
    if (!matches || itemPath.length < bestPath.length) {
      return;
    }
    bestPath = itemPath;
    best = crumbs;
  };

  for (const module of modules) {
    for (const item of module.menu) {
      const sectionLabel = label(module.menuLabelKey);
      const pageLabel = label(item.labelKey);
      const crumbs: PageCrumb[] = [];
      if (sectionLabel !== pageLabel) {
        const sectionHome = module.menu[0]?.path;
        if (sectionHome && sectionHome !== path) {
          crumbs.push({ label: sectionLabel, to: sectionHome });
        } else {
          crumbs.push({ label: sectionLabel });
        }
      }
      const deeper = path !== item.path;
      if (deeper) {
        crumbs.push({ label: pageLabel, to: item.path });
      } else {
        crumbs.push({ label: pageLabel });
      }
      const detail = deeper ? detailLabel(path) : null;
      if (detail) {
        crumbs.push({ label: detail });
      }
      keep(item.path, crumbs);
    }
  }

  for (const item of shell) {
    const deeper = path !== item.path;
    const crumbs: PageCrumb[] = deeper
      ? [{ label: label(item.labelKey), to: item.path }]
      : [{ label: label(item.labelKey) }];
    const detail = deeper ? detailLabel(path) : null;
    if (detail) {
      crumbs.push({ label: detail });
    }
    keep(item.path, crumbs);
  }

  return best;
}

function extensionCrumbFor(path: string): PageCrumb | null {
  if (!path.startsWith('/x/')) {
    return null;
  }
  const key = decodeURIComponent(path.split('/')[2] ?? '').replace(/-/g, ' ');
  if (!key) {
    return null;
  }
  return { label: key.charAt(0).toUpperCase() + key.slice(1) };
}

function detailLabel(path: string): string | null {
  if (!path.startsWith('/modules/')) {
    return null;
  }
  const key = decodeURIComponent(path.split('/')[2] ?? '').replace(/-/g, ' ');
  if (!key) {
    return null;
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
}
