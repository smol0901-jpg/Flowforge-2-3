/* FlowForge · data/presets — отраслевые пресеты: роли, слои, стартовые наборы блоков */
export const PRESETS = {
  none: { name: 'Блок-схема', roles: [], layers: null },
  org: {
    name: 'Оргструктура',
    roles: [
      ['boss', 'Руководство', '#f9e2af'], ['dept', 'Подразделение', '#89b4fa'],
      ['role', 'Должность', '#a6e3a1'], ['staff', 'Сотрудник', '#94e2d5'], ['outsrc', 'Подрядчик', '#fab387']
    ],
    layers: [['Вертикаль', '#f9e2af'], ['Горизонталь', '#89b4fa']]
  },
  haccp: {
    name: 'ХАССП',
    roles: [
      ['raw', 'Сырьё', '#a6e3a1'], ['prep', 'Приготовление', '#fab387'], ['ccp', 'Критическая точка', '#f38ba8'],
      ['ctrl', 'Контроль', '#89dceb'], ['store', 'Хранение', '#74c7ec'], ['ship', 'Отгрузка', '#f9e2af'],
      ['doc', 'Документация', '#f2cdcd'], ['corr', 'Коррекция', '#b4befe']
    ],
    layers: [['Поток', '#89b4fa'], ['Контроль КТ', '#f38ba8'], ['Документы', '#f2cdcd']]
  },
  finance: {
    name: 'Финансы',
    roles: [
      ['cash', 'Денежный поток', '#a6e3a1'], ['expense', 'Расход', '#eba0ac'], ['income', 'Доход', '#94e2d5'],
      ['oblig', 'Обязательство', '#fab387'], ['asset', 'Актив', '#89b4fa'], ['doc', 'Документ', '#f2cdcd']
    ],
    layers: [['Движение средств', '#a6e3a1'], ['Обязательства', '#fab387']]
  },
  agro: {
    name: 'Агроцикл',
    roles: [
      ['field', 'Поле', '#a6e3a1'], ['care', 'Уход', '#b4befe'], ['harvest', 'Урожай', '#f9e2af'],
      ['storage', 'Хранение', '#74c7ec'], ['control', 'Контроль', '#89dceb'], ['animal', 'Животные', '#fab387']
    ],
    layers: [['Растениеводство', '#a6e3a1'], ['Животноводство', '#fab387']]
  },
  it: {
    name: 'ИТ-архитектура',
    roles: [
      ['client', 'Клиент', '#74c7ec'], ['service', 'Сервис', '#89b4fa'], ['data', 'Данные', '#94e2d5'],
      ['infra', 'Инфраструктура', '#b4befe'], ['sec', 'Безопасность', '#f38ba8'], ['ci', 'CI/CD', '#f9e2af']
    ],
    layers: [['Продакшн', '#89b4fa'], ['Разработка', '#f9e2af']]
  }
};
export const presetNames = () => Object.entries(PRESETS).map(([k, v]) => [k, v.name]);

/** Палитра фигур для пресета (порядок важен) */
export function paletteFor(preset) {
  return {
    none: ['terminal', 'process', 'decision', 'io', 'data', 'sub', 'doc', 'prep', 'conn', 'note', 'manual', 'delay'],
    org: ['org_boss', 'org_dept', 'org_role', 'org_staff', 'org_lane', 'org_outsrc', 'org_committee', 'g_person', 'g_folder', 'g_mail'],
    haccp: ['h_raw', 'h_prep', 'h_heat', 'h_cold', 'h_ccp', 'h_oprp', 'h_prp', 'h_monitor', 'h_limit', 'h_correct', 'h_verify', 'h_record', 'h_store', 'h_pack', 'h_ship', 'h_sample', 'h_allergen', 'h_recall'].map(x => x === 'h_prep' ? 'prep' : x),
    finance: ['f_money', 'f_budget', 'f_invoice', 'f_payment', 'f_tax', 'f_profit', 'f_cost', 'f_cashflow', 'f_contract', 'f_audit', 'f_invest', 'f_reserve', 'f_kpi', 'f_price', 'g_docx', 'g_calendar'],
    agro: ['a_field', 'a_sow', 'a_fert', 'a_water', 'a_pest', 'a_harvest', 'a_grain', 'a_green', 'a_livestock', 'a_vet', 'a_soil', 'a_weather', 'h_store', 'h_ship'],
    it: ['i_client', 'i_browser', 'i_mobile', 'i_api', 'i_server', 'i_db', 'i_cache', 'i_queue', 'i_cloud', 'i_build', 'i_deploy', 'i_test', 'i_security', 'i_git']
  }[preset] || [];
}
