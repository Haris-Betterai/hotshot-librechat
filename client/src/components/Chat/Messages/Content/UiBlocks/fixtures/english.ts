export const ENGLISH: Record<string, string> = {
  com_ui_block_view_product: 'View product',
  com_ui_block_size: 'Size',
  com_ui_block_capacity: 'Capacity',
  com_ui_block_capacity_invalid: 'Enter a capacity greater than 0',
  com_ui_block_dose_result: 'Recommended dose',
  com_ui_block_dose_math: '{{0}} × {{1}} per {{2}}',
  com_ui_block_unit_quart: 'qt',
  com_ui_block_unit_gallon: 'gal',
  com_ui_block_unit_liter: 'L',
  com_ui_block_compare_feature: 'Feature',
  com_ui_block_quick_replies: 'Suggested replies',
  com_ui_block_loading: 'Preparing details',
  com_ui_block_vehicle: 'Tell me about your vehicle',
  com_ui_block_send: 'Send',
  com_ui_block_year: 'Year',
  com_ui_block_make: 'Make',
  com_ui_block_model: 'Model',
  com_ui_block_engine: 'Engine',
  com_ui_block_year_hint: '2018',
  com_ui_block_make_hint: 'Ram',
  com_ui_block_model_hint: '2500',
  com_ui_block_engine_hint: '6.7 Cummins',
};

export const localizeEnglish = (key: string, params?: Record<string, string>): string =>
  Object.entries(params ?? {}).reduce(
    (text, [name, value]) => text.replace(`{{${name}}}`, value),
    ENGLISH[key] ?? key,
  );
