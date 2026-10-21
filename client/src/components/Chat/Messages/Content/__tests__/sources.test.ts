import type { Link, Paragraph, PhrasingContent, Root } from 'mdast';
import { remarkSources, stripTrackingParams, getSourceHost } from '../sources';

describe('stripTrackingParams', () => {
  it('removes utm_source=openai and keeps other params', () => {
    expect(stripTrackingParams('https://hotshotsecret.com/p?utm_source=openai&x=1')).toBe(
      'https://hotshotsecret.com/p?x=1',
    );
    expect(stripTrackingParams('https://hotshotsecret.com/p?utm_source=openai')).toBe(
      'https://hotshotsecret.com/p',
    );
  });

  it('leaves unrelated and non-http links alone', () => {
    expect(stripTrackingParams('https://a.com/?utm_source=news')).toBe(
      'https://a.com/?utm_source=news',
    );
    expect(stripTrackingParams('/files/abc')).toBe('/files/abc');
  });
});

describe('getSourceHost', () => {
  it('matches a link whose text is its host, with or without www', () => {
    expect(getSourceHost('https://www.hotshotsecret.com/x', 'hotshotsecret.com')).toBe(
      'hotshotsecret.com',
    );
    expect(getSourceHost('https://hotshotsecret.com/x', 'www.hotshotsecret.com')).toBe(
      'hotshotsecret.com',
    );
  });

  it('rejects descriptive link text', () => {
    expect(getSourceHost('https://hotshotsecret.com/x', 'Buy the bottle')).toBeNull();
  });
});

describe('remarkSources', () => {
  const link = (url: string, text: string): Link => ({
    type: 'link',
    url,
    children: [{ type: 'text', value: text }],
  });
  const paragraph = (...children: PhrasingContent[]): Root => ({
    type: 'root',
    children: [{ type: 'paragraph', children }],
  });
  const run = (tree: Root): PhrasingContent[] => {
    remarkSources()(tree);
    return (tree.children[0] as Paragraph).children;
  };

  it('drops parentheses around a lone host link and strips utm_source', () => {
    const children = run(
      paragraph(
        { type: 'text', value: 'Use it every tank (' },
        link('https://hotshotsecret.com/p?utm_source=openai', 'hotshotsecret.com'),
        { type: 'text', value: ').' },
      ),
    );
    expect(children[0]).toMatchObject({ value: 'Use it every tank' });
    expect(children[1]).toMatchObject({ url: 'https://hotshotsecret.com/p' });
    expect(children[2]).toMatchObject({ value: '.' });
  });

  it('keeps parentheses around descriptive links', () => {
    const children = run(
      paragraph({ type: 'text', value: 'See (' }, link('https://a.com/g', 'the guide'), {
        type: 'text',
        value: ') here',
      }),
    );
    expect(children[0]).toMatchObject({ value: 'See (' });
    expect(children[2]).toMatchObject({ value: ') here' });
  });
});
