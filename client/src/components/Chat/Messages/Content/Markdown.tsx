import React, { memo, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { getRemarkPlugins, getRehypePlugins, getMarkdownComponents } from './markdownConfig';
import MarkdownErrorBoundary from './MarkdownErrorBoundary';
import MarkdownBlocks from './MarkdownBlocks';
import { preprocessLaTeX } from '~/utils';
import store from '~/store';

type TContentProps = {
  content: string;
  isLatestMessage: boolean;
  isStreaming?: boolean;
};

const Markdown = memo(function Markdown({
  content = '',
  isLatestMessage,
  isStreaming = false,
}: TContentProps) {
  const LaTeXParsing = useRecoilValue<boolean>(store.LaTeXParsing);
  const isInitializing = content === '';

  const currentContent = useMemo(() => {
    if (isInitializing) {
      return '';
    }
    return LaTeXParsing ? preprocessLaTeX(content) : content;
  }, [content, LaTeXParsing, isInitializing]);

  if (isInitializing) {
    return (
      <div className="absolute">
        <p className="relative">
          <span className={isLatestMessage ? 'result-thinking' : ''} />
        </p>
      </div>
    );
  }

  return (
    <MarkdownErrorBoundary content={content} codeExecution={true}>
      <MarkdownBlocks
        content={currentContent}
        remarkPlugins={getRemarkPlugins()}
        rehypePlugins={getRehypePlugins()}
        components={getMarkdownComponents()}
        animateStreaming={isStreaming}
      />
    </MarkdownErrorBoundary>
  );
});
Markdown.displayName = 'Markdown';

export default Markdown;
