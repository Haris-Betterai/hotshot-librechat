import type { Node, Parent } from 'unist';

type TextNode = Node & { type: 'text'; value: string };
type ElementNode = Parent & {
  type: 'element';
  tagName: string;
  properties?: { className?: string | string[]; style?: string };
};

const excludedTags = new Set(['code', 'pre', 'script', 'style', 'svg', 'math', 'textarea']);

function isExcluded(parent: Node | undefined): boolean {
  if (!parent || parent.type !== 'element') {
    return false;
  }
  const element = parent as ElementNode;
  if (excludedTags.has(element.tagName)) {
    return true;
  }
  const className = element.properties?.className;
  const classes = Array.isArray(className) ? className : [className ?? ''];
  return classes.some((name) => name.includes('katex') || name.includes('mermaid'));
}

function splitGraphemes(text: string): string[] {
  if (typeof Intl.Segmenter !== 'function') {
    return Array.from(text);
  }
  return Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
    (part) => part.segment,
  );
}

/** Wraps streamed prose graphemes in stable spans so each newly appended glyph fades in. */
export function streamFade() {
  return (tree: Node) => {
    let offset = 0;

    const walk = (parent: Parent, insideExcludedContent: boolean): void => {
      for (let index = 0; index < parent.children.length; index += 1) {
        const child = parent.children[index];
        if (child.type === 'text') {
          const graphemes = splitGraphemes((child as TextNode).value);
          if (insideExcludedContent) {
            offset += graphemes.length;
            continue;
          }
          const children: ElementNode[] = graphemes.map((grapheme, position) => ({
            type: 'element',
            tagName: 'span',
            properties: {
              className: 'stream-glyph',
              style: `animation-delay:${((offset + position) % 18) * 6}ms`,
            },
            children: [{ type: 'text', value: grapheme }],
          }));
          offset += graphemes.length;
          parent.children.splice(index, 1, ...children);
          index += children.length - 1;
          continue;
        }
        if ('children' in child && Array.isArray(child.children)) {
          walk(child as Parent, insideExcludedContent || isExcluded(child));
        }
      }
    };

    if ('children' in tree && Array.isArray(tree.children)) {
      walk(tree as Parent, false);
    }
  };
}
