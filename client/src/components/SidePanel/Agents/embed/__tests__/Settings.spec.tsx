import { render, screen, fireEvent } from 'test/layout-test-utils';
import { normalizeEmbedWidgetSettings } from 'librechat-data-provider';
import EmbedSettingsForm from '../Settings';

jest.mock('~/data-provider', () => ({
  ...jest.requireActual('~/data-provider'),
  useGetAgentByIdQuery: jest.fn(() => ({
    data: {
      provider: 'anthropic',
      intelligence: {
        auto: { label: 'Auto', base: 'Balanced', escalate: 'Deep' },
        levels: [
          { label: 'Fast', model: 'm1' },
          { label: 'Balanced', model: 'm2' },
          { label: 'Deep', model: 'm3' },
          { label: 'Ultra', model: 'm4' },
        ],
      },
    },
  })),
}));
jest.mock('~/hooks', () => ({ useLocalize: () => (key: string) => key }));

const setup = (levels: string[]) => {
  const onChange = jest.fn();
  render(
    <EmbedSettingsForm
      draft={normalizeEmbedWidgetSettings({ levels })}
      colorText="#3b6cf6"
      onColorText={jest.fn()}
      onChange={onChange}
      agentId="agent_1"
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'com_ui_embed_group_behaviour' }));
  return onChange;
};

it('offers Auto and the agent levels in each select', () => {
  setup(['Auto', 'Deep', 'Ultra']);
  const options = Array.from(
    (screen.getByLabelText('com_ui_embed_level 1') as HTMLSelectElement).options,
  ).map((option) => option.value);
  expect(options).toEqual(['Auto', 'Fast', 'Balanced', 'Deep', 'Ultra']);
});

it('saves levels in slot order', () => {
  const onChange = setup(['Auto', 'Deep', 'Ultra']);
  fireEvent.change(screen.getByLabelText('com_ui_embed_level 2'), { target: { value: 'Fast' } });
  expect(onChange).toHaveBeenCalledWith({ levels: ['Auto', 'Fast', 'Ultra'] });
});

it('drops blanks when a later slot is set to None', () => {
  const onChange = setup(['Auto', 'Deep', 'Ultra']);
  fireEvent.change(screen.getByLabelText('com_ui_embed_level 3'), { target: { value: '' } });
  expect(onChange).toHaveBeenCalledWith({ levels: ['Auto', 'Deep'] });
});

it('first slot has no None option', () => {
  setup(['Auto']);
  const first = screen.getByLabelText('com_ui_embed_level 1') as HTMLSelectElement;
  expect(Array.from(first.options).some((option) => option.value === '')).toBe(false);
});
