import { buildFrameDocument } from '../Generated';
import { LIGHT } from '../kit';

const palette = LIGHT;

describe('buildFrameDocument', () => {
  it('locks the frame down with a CSP that blocks the network', () => {
    const doc = buildFrameDocument({
      html: '<p>Hi</p>',
      props: {},
      token: 't1',
      palette,
      origin: 'https://chat.example.com',
    });
    expect(doc).toContain("default-src 'none'");
    expect(doc).toContain('font-src https://chat.example.com data:');
    expect(doc).toContain('https://chat.example.com/assets/fonts/Inter-Regular.woff2');
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
