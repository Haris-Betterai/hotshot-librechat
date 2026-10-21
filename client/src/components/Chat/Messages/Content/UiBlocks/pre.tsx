import React, { Children, isValidElement } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { UI_BLOCK_LANGUAGE } from 'librechat-data-provider';

type ClassNameProps = { className?: string | string[] };

export const hasUiBlockClass = (className?: string | string[]): boolean =>
  [className ?? []].flat().join(' ').includes(`language-${UI_BLOCK_LANGUAGE}`);

export const nodeText = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(nodeText).join('');
  }
  return isValidElement<{ children?: ReactNode }>(node) ? nodeText(node.props.children) : '';
};

const isUiBlock = (children: ReactNode): boolean =>
  Children.toArray(children).some(
    (child) => isValidElement<ClassNameProps>(child) && hasUiBlockClass(child.props.className),
  );

/** Markdown `pre` that lets a `hotshot-ui` block render as a card instead of a code wrapper. */
export function UiAwarePre({
  children,
  node: _node,
  ...rest
}: ComponentPropsWithoutRef<'pre'> & { node?: unknown }) {
  if (isUiBlock(children)) {
    return <>{children}</>;
  }
  return <pre {...rest}>{children}</pre>;
}
