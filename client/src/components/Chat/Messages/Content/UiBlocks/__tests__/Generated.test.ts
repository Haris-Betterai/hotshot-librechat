import { buildFrameDocument } from '../Generated';

const palette = {
  ink: '#171717',
  muted: '#525252',
  line: '#e5e5e5',
  surface: '#ffffff',
  soft: '#f5f5f5',
  accent: '#171717',
  accentInk: '#ffffff',
  scheme: 'light',
};

describe('buildFrameDocument', () => {
  it('locks the frame down with a CSP that blocks the network', () => {
    const doc = buildFrameDocument({ html: '<p>Hi</p>', props: {}, token: 't1', palette });
    expect(doc).toContain("default-src 'none'");
    expect(doc).toContain('<body><p>Hi</p></body>');
    expect(doc).toContain('color-scheme:light');
  });

  it('embeds props so they cannot close the script tag', () => {
    const doc = buildFrameDocument({
      html: '',
      props: { note: '</script><script>alert(1)</script>' },
      token: 't1',
      palette,
    });
    expect(doc).not.toContain('</script><script>alert(1)');
    expect(doc).toContain('\\u003c/script>');
  });
});
