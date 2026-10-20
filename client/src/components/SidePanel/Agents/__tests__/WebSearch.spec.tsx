import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { render, screen, fireEvent } from '@testing-library/react';
import type { AgentForm } from '~/common';
import WebSearch from '../WebSearch';

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('@librechat/client', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
  }) => (
    <input
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      {...props}
    />
  ),
}));

let form: ReturnType<typeof useForm<AgentForm>>;

function Harness({ provider, params }: { provider: string; params?: Record<string, unknown> }) {
  form = useForm<AgentForm>({
    defaultValues: { provider, model_parameters: params } as unknown as AgentForm,
  });
  return (
    <FormProvider {...form}>
      <WebSearch />
    </FormProvider>
  );
}

describe('WebSearch agent section', () => {
  it('is hidden for non-OpenAI providers', () => {
    const { container } = render(<Harness provider="anthropic" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('prefills the suggested domain when enabled with none set', () => {
    render(<Harness provider="openAI" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(form.getValues('model_parameters.web_search')).toBe(true);
    expect(form.getValues('model_parameters.web_search_domains')).toEqual(['hotshotsecret.com']);
    expect(screen.getByLabelText('com_ui_agent_web_search_domains')).toHaveValue(
      'hotshotsecret.com',
    );
  });

  it('normalises typed domains on blur', () => {
    render(
      <Harness provider="openAI" params={{ web_search: true, web_search_domains: ['a.com'] }} />,
    );
    const box = screen.getByLabelText('com_ui_agent_web_search_domains');
    fireEvent.change(box, { target: { value: 'Shop.Example.com, https://bad/x\nb.org' } });
    fireEvent.blur(box);
    expect(form.getValues('model_parameters.web_search_domains')).toEqual([
      'shop.example.com',
      'b.org',
    ]);
  });
});
