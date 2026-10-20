import type { Element, Root, Text } from 'hast';
import { streamFade } from './streamFade';

function transform(tree: Root): Root {
  streamFade()(tree);
  return tree;
}

describe('streamFade', () => {
  it('wraps streamed prose by grapheme so emoji stay intact', () => {
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [{ type: 'text', value: 'A👍🏽B' }],
        },
      ],
    };

    transform(tree);
    const paragraph = tree.children[0] as Element;
    expect(paragraph.children).toHaveLength(3);
    expect(
      paragraph.children.map((child) => ((child as Element).children[0] as Text).value),
    ).toEqual(['A', '👍🏽', 'B']);
    expect((paragraph.children[0] as Element).properties).toMatchObject({
      className: 'stream-glyph',
      style: 'animation-delay:0ms',
    });
  });

  it('leaves code text untouched', () => {
    const code: Element = {
      type: 'element',
      tagName: 'code',
      properties: {},
      children: [{ type: 'text', value: 'const value = 1;' }],
    };
    const tree: Root = { type: 'root', children: [code] };

    transform(tree);
    expect(code.children).toEqual([{ type: 'text', value: 'const value = 1;' }]);
  });

  it('leaves every descendant of rendered math and diagrams untouched', () => {
    const inner: Element = {
      type: 'element',
      tagName: 'span',
      properties: {},
      children: [{ type: 'text', value: 'x + y' }],
    };
    const katex: Element = {
      type: 'element',
      tagName: 'span',
      properties: { className: ['katex'] },
      children: [inner],
    };
    const tree: Root = { type: 'root', children: [katex] };

    transform(tree);
    expect(inner.children).toEqual([{ type: 'text', value: 'x + y' }]);
  });
});
