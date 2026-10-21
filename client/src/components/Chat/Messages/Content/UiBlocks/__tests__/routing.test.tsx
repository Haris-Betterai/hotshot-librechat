import React from 'react';
import { RecoilRoot } from 'recoil';
import ReactMarkdown from 'react-markdown';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { getRemarkPlugins, getRehypePlugins, getMarkdownComponents } from '../../markdownConfig';
import { CodeBlockProvider, MessageContext } from '~/Providers';

jest.mock('~/hooks/Messages/useSubmitMessage', () => ({
  __esModule: true,
  default: () => ({ submitMessage: jest.fn() }),
}));

jest.mock('~/components/Messages/Content/CodeBlock', () => ({
  __esModule: true,
  default: ({ lang }: { lang: string }) => <div data-testid="codeblock" data-lang={lang} />,
}));

const block = JSON.stringify({ type: 'quick_replies', options: ['Diesel', 'Gas'] });

const renderMarkdown = (content: string, isSubmitting = false) =>
  render(
    <MemoryRouter>
      <RecoilRoot>
        <MessageContext.Provider value={{ messageId: 'm', isExpanded: true, isSubmitting }}>
          <CodeBlockProvider>
            <ReactMarkdown
              /** @ts-ignore */
              remarkPlugins={getRemarkPlugins()}
              /** @ts-ignore */
              rehypePlugins={getRehypePlugins()}
              components={getMarkdownComponents()}
            >
              {content}
            </ReactMarkdown>
          </CodeBlockProvider>
        </MessageContext.Provider>
      </RecoilRoot>
    </MemoryRouter>,
  );

describe('markdown code routing', () => {
  it('routes hotshot-ui fences to UiBlock without a code wrapper', () => {
    const { container } = renderMarkdown('```hotshot-ui\n' + block + '\n```');
    expect(screen.getByRole('button', { name: 'Diesel' })).toBeInTheDocument();
    expect(screen.queryByTestId('codeblock')).toBeNull();
    expect(container.querySelector('pre')).toBeNull();
  });

  it('shows a skeleton for a partial block while submitting, nothing otherwise', () => {
    const partial = '```hotshot-ui\n{"type":"quick_rep\n```';
    const streaming = renderMarkdown(partial, true);
    expect(screen.getByRole('status')).toBeInTheDocument();
    streaming.unmount();
    const done = renderMarkdown(partial, false);
    expect(done.container.textContent).toBe('');
  });

  it('leaves other languages alone', () => {
    const { container } = renderMarkdown('```js\nconst a = 1;\nconst b = 2;\n```');
    expect(screen.getByTestId('codeblock')).toHaveAttribute('data-lang', 'js');
    expect(container.querySelector('pre')).not.toBeNull();
  });
});
