import type { Link, Parent, PhrasingContent, Root, Text } from 'mdast';

const TRACKING_PARAM = /^utm_source$/i;
const OPENAI_SOURCE = 'openai';

export const stripTrackingParams = (href: string): string => {
  if (!/^https?:\/\//i.test(href)) {
    return href;
  }
  try {
    const url = new URL(href);
    const source = url.searchParams.get('utm_source');
    if (source !== OPENAI_SOURCE) {
      return href;
    }
    const keys = [...url.searchParams.keys()].filter((key) => TRACKING_PARAM.test(key));
    keys.forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch {
    return href;
  }
};

export const getHost = (href: string): string | null => {
  if (!/^https?:\/\//i.test(href)) {
    return null;
  }
  try {
    return new URL(href).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
};

/** Returns the host when the link's visible text is only that host (or its `www.` form). */
export const getSourceHost = (href: string | undefined, text: string): string | null => {
  const host = href ? getHost(href) : null;
  if (host == null) {
    return null;
  }
  const label = text
    .trim()
    .replace(/^www\./i, '')
    .replace(/\/$/, '')
    .toLowerCase();
  return label === host ? host : null;
};

const linkText = (link: Link): string =>
  link.children.length === 1 && link.children[0].type === 'text' ? link.children[0].value : '';

const isSourceLink = (node: PhrasingContent | undefined): node is Link =>
  node?.type === 'link' && getSourceHost(node.url, linkText(node)) != null;

const isText = (node: PhrasingContent | undefined): node is Text => node?.type === 'text';

const transform = (parent: Parent): void => {
  const children = parent.children as PhrasingContent[];
  children.forEach((child) => {
    if (child.type === 'link') {
      child.url = stripTrackingParams(child.url);
    }
    if ('children' in child) {
      transform(child as Parent);
    }
  });

  for (let i = 1; i < children.length - 1; i++) {
    const [before, middle, after] = [children[i - 1], children[i], children[i + 1]];
    if (!isSourceLink(middle) || !isText(before) || !isText(after)) {
      continue;
    }
    if (!before.value.endsWith('(') || !after.value.startsWith(')')) {
      continue;
    }
    before.value = before.value.slice(0, -1);
    after.value = after.value.slice(1);
    if (/^[.,;:!?]/.test(after.value)) {
      before.value = before.value.trimEnd();
    }
  }
};

/**
 * Remark plugin for web-search answers: drops tracking params from links and
 * removes the "(" ")" that wrap a lone host-only source link, since the link
 * renders as a source pill that needs no brackets.
 */
export const remarkSources = () => (tree: Root) => transform(tree as Parent);
