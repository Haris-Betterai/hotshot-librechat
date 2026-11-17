import React from 'react';
import { RecoilRoot, useSetRecoilState } from 'recoil';
import { act, renderHook } from '@testing-library/react';
import type { TConversation } from 'librechat-data-provider';
import usePinnedProduct from '../usePinnedProduct';
import store from '~/store';

const DE = 'https://www.hotshotsecret.com/products/diesel-extreme';
const mockMutateAsync = jest.fn();

jest.mock('~/data-provider', () => ({
  usePinProductMutation: () => ({ mutateAsync: mockMutateAsync, isLoading: false }),
}));

const convo = (conversationId: string): TConversation =>
  ({ conversationId, endpoint: 'agents', title: 'Chat' }) as TConversation;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <RecoilRoot>{children}</RecoilRoot>
);

const setup = () =>
  renderHook(
    () => ({
      pinned: usePinnedProduct(),
      setConversation: useSetRecoilState(store.conversationByIndex(0)),
    }),
    { wrapper },
  );

beforeEach(() => mockMutateAsync.mockReset());

describe('usePinnedProduct', () => {
  it('saves the pin before showing it on an existing chat', async () => {
    mockMutateAsync.mockResolvedValue({});
    const { result } = setup();
    act(() => result.current.setConversation(convo('c1')));

    await act(() => result.current.pinned.setPinnedProduct(DE));

    expect(mockMutateAsync).toHaveBeenCalledWith({ conversationId: 'c1', productUrl: DE });
    expect(result.current.pinned.productUrl).toBe(DE);
  });

  it('pins a new chat locally without calling the server', async () => {
    const { result } = setup();
    act(() => result.current.setConversation(convo('new')));

    await act(() => result.current.pinned.setPinnedProduct(DE));

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(result.current.pinned.productUrl).toBe(DE);
  });

  it('does not move the pin to another chat opened while it was saving', async () => {
    let finish: () => void = () => undefined;
    mockMutateAsync.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    const { result } = setup();
    act(() => result.current.setConversation(convo('c1')));

    let saving: Promise<void> = Promise.resolve();
    act(() => {
      saving = result.current.pinned.setPinnedProduct(DE);
    });
    act(() => result.current.setConversation(convo('c2')));
    await act(async () => {
      finish();
      await saving;
    });

    expect(result.current.pinned.productUrl).toBeNull();
  });

  it('leaves the chat unchanged when saving fails', async () => {
    mockMutateAsync.mockRejectedValue(new Error('offline'));
    const { result } = setup();
    act(() => result.current.setConversation(convo('c1')));

    await expect(result.current.pinned.setPinnedProduct(DE)).rejects.toThrow('offline');
    expect(result.current.pinned.productUrl).toBeNull();
  });
});
