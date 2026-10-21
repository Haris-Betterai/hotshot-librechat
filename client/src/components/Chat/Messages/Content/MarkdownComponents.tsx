import React, { memo, useMemo, useRef, useEffect } from 'react';
import { Link2 } from 'lucide-react';
import { useRecoilValue } from 'recoil';
import { useToastContext } from '@librechat/client';
import { PermissionTypes, Permissions, apiBaseUrl } from 'librechat-data-provider';
import Mermaid, { MermaidErrorBoundary } from '~/components/Messages/Content/Mermaid';
import { handleDoubleClick, triggerDownload, cn } from '~/utils';
import CodeBlock from '~/components/Messages/Content/CodeBlock';
import useHasAccess from '~/hooks/Roles/useHasAccess';
import { useFileDownload } from '~/data-provider';
import { useCodeBlockContext, useMessageContext } from '~/Providers';
import { hasUiBlockClass, nodeText } from './UiBlocks/pre';
import UiBlock from './UiBlocks';
import { useLocalize } from '~/hooks';
import { getSourceHost, stripTrackingParams } from './sources';
import store from '~/store';

type TCodeProps = {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
};

const isSingleLineCode = (children: React.ReactNode): boolean => {
  if (typeof children === 'string') {
    return !children.includes('\n');
  }
  if (Array.isArray(children)) {
    return children.every((child) => typeof child === 'string' && !child.includes('\n'));
  }
  return false;
};

export const code: React.ElementType = memo(function MarkdownCode({
  className,
  children,
}: TCodeProps) {
  const canRunCode = useHasAccess({
    permissionType: PermissionTypes.RUN_CODE,
    permission: Permissions.USE,
  });
  const match = /language-(\w+)/.exec(className ?? '');
  const lang = match && match[1];
  const isMath = lang === 'math';
  const isMermaid = lang === 'mermaid';
  const isUiBlock = hasUiBlockClass(className);
  const isSingleLine = isSingleLineCode(children);
  const { isSubmitting = false } = useMessageContext();

  const { getNextIndex, resetCounter } = useCodeBlockContext();
  const blockIndex = useRef(getNextIndex(isMath || isMermaid || isSingleLine || isUiBlock)).current;

  useEffect(() => {
    resetCounter();
  }, [children, resetCounter]);

  if (isUiBlock) {
    return <UiBlock source={nodeText(children)} isStreaming={isSubmitting} />;
  } else if (isMath) {
    return <>{children}</>;
  } else if (isMermaid) {
    const content = typeof children === 'string' ? children : String(children);
    return (
      <MermaidErrorBoundary code={content}>
        <Mermaid id={`mermaid-${blockIndex}`}>{content}</Mermaid>
      </MermaidErrorBoundary>
    );
  } else if (isSingleLine) {
    return (
      <code onDoubleClick={handleDoubleClick} className={className}>
        {children}
      </code>
    );
  } else {
    return (
      <CodeBlock
        lang={lang ?? 'text'}
        codeChildren={children}
        blockIndex={blockIndex}
        allowExecution={canRunCode}
      />
    );
  }
});
code.displayName = 'MarkdownCode';

export const codeNoExecution: React.ElementType = memo(function MarkdownCodeNoExecution({
  className,
  children,
}: TCodeProps) {
  const match = /language-(\w+)/.exec(className ?? '');
  const lang = match && match[1];

  if (lang === 'math') {
    return children;
  } else if (lang === 'mermaid') {
    const content = typeof children === 'string' ? children : String(children);
    return <Mermaid>{content}</Mermaid>;
  } else if (isSingleLineCode(children)) {
    return (
      <code onDoubleClick={handleDoubleClick} className={className}>
        {children}
      </code>
    );
  } else {
    return <CodeBlock lang={lang ?? 'text'} codeChildren={children} allowExecution={false} />;
  }
});
codeNoExecution.displayName = 'MarkdownCodeNoExecution';

type TAnchorProps = {
  href: string;
  children: React.ReactNode;
};

const getPlainText = (children: React.ReactNode): string => {
  if (typeof children === 'string') {
    return children;
  }
  if (Array.isArray(children) && children.length === 1 && typeof children[0] === 'string') {
    return children[0];
  }
  return '';
};

const SOURCE_PILL_CLASS =
  'mx-0.5 inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 align-baseline text-xs font-normal leading-4 text-neutral-600 !no-underline transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-neutral-50';

export const a: React.ElementType = memo(function MarkdownAnchor({ href, children }: TAnchorProps) {
  const user = useRecoilValue(store.user);
  const { showToast } = useToastContext();
  const localize = useLocalize();

  const {
    file_id = '',
    filename = '',
    filepath,
  } = useMemo(() => {
    const pattern = new RegExp(`(?:files|outputs)/${user?.id}/([^\\s]+)`);
    const match = href.match(pattern);
    if (match && match[0]) {
      const path = match[0];
      const parts = path.split('/');
      const name = parts.pop();
      const file_id = parts.pop();
      return { file_id, filename: name, filepath: path };
    }
    return { file_id: '', filename: '', filepath: '' };
  }, [user?.id, href]);

  const { refetch: downloadFile } = useFileDownload(user?.id ?? '', file_id, { direct: false });
  const props: { target?: string; onClick?: React.MouseEventHandler } = { target: '_blank' };

  if (!file_id || !filename) {
    const cleanHref = stripTrackingParams(href);
    const sourceHost = getSourceHost(cleanHref, getPlainText(children));
    if (sourceHost != null) {
      return (
        <a
          href={cleanHref}
          target="_blank"
          rel="noopener noreferrer"
          data-source-pill=""
          className={SOURCE_PILL_CLASS}
        >
          <Link2 className="size-3 shrink-0" aria-hidden="true" />
          {sourceHost}
        </a>
      );
    }
    return (
      <a href={cleanHref} {...props}>
        {children}
      </a>
    );
  }

  const handleDownload = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    try {
      const stream = await downloadFile();
      if (stream.data == null || stream.data === '') {
        console.error('Error downloading file: No data found');
        showToast({
          status: 'error',
          message: localize('com_ui_download_error'),
        });
        return;
      }
      triggerDownload(stream.data, filename);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  props.onClick = handleDownload;
  props.target = '_blank';

  const domainServerBaseUrl = `${apiBaseUrl()}/api`;

  return (
    <a
      href={
        filepath?.startsWith('files/')
          ? `${domainServerBaseUrl}/${filepath}`
          : `${domainServerBaseUrl}/files/${filepath}`
      }
      {...props}
    >
      {children}
    </a>
  );
});
a.displayName = 'MarkdownAnchor';

type TParagraphProps = {
  children: React.ReactNode;
};

export const p: React.ElementType = memo(function MarkdownParagraph({ children }: TParagraphProps) {
  return <p className="mb-2 whitespace-pre-wrap">{children}</p>;
});
p.displayName = 'MarkdownParagraph';

type TTableProps = {
  children: React.ReactNode;
};

export const table: React.ElementType = memo(function MarkdownTable({ children }: TTableProps) {
  return (
    <div className="markdown-table-wrapper w-full max-w-full">
      <table>{children}</table>
    </div>
  );
});
table.displayName = 'MarkdownTable';

type TImageProps = {
  src?: string;
  alt?: string;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
};

export const img: React.ElementType = memo(function MarkdownImage({
  src,
  alt,
  title,
  className,
  style,
}: TImageProps) {
  // Get the base URL from the API endpoints
  const baseURL = apiBaseUrl();

  // If src starts with /images/, prepend the base URL
  const fixedSrc = useMemo(() => {
    if (!src) return src;

    // If it's already an absolute URL or doesn't start with /images/, return as is
    if (src.startsWith('http') || src.startsWith('data:') || !src.startsWith('/images/')) {
      return src;
    }

    // Prepend base URL to the image path
    return `${baseURL}${src}`;
  }, [src, baseURL]);

  /** Inline Markdown images are product shots, not artwork: cap them so a 600px
   *  product photo does not take over the message, and let a customer open the
   *  full-size image to check they have the right bottle. Generated images and
   *  attachments render through their own components and are unaffected. */
  const image = (
    <img
      src={fixedSrc}
      alt={alt}
      title={title}
      loading="lazy"
      className={cn(
        '!m-0 block h-auto max-h-40 w-auto max-w-full rounded-xl border border-black/10 bg-white dark:border-white/10',
        className,
      )}
      style={style}
    />
  );

  if (!fixedSrc || fixedSrc.startsWith('data:')) {
    return <span className="m-1 inline-block align-top leading-none">{image}</span>;
  }

  return (
    <a
      href={fixedSrc}
      target="_blank"
      rel="noopener noreferrer"
      title={title || alt}
      aria-label={alt ? `${alt} (opens full size)` : 'Open image full size'}
      className="my-1 mr-2 inline-block rounded-xl align-top leading-none transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
    >
      {image}
    </a>
  );
});
img.displayName = 'MarkdownImage';
