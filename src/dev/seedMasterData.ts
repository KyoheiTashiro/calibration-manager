import {
  EQUIPMENT_STATUS,
  type Equipment,
  type EquipmentStatus,
  type Person,
  type Vendor,
} from '@/store/types';

export const buildSeedVendors = (): Record<string, Vendor> => ({
  'seed-vendor-tokyo': {
    id: 'seed-vendor-tokyo',
    name: '東京計測サービス',
    isManufacturer: false,
    isCalibrator: true,
    standardLeadTimeDays: 21,
    contactPerson: '山本 直樹',
    email: 'yamamoto@tokyo-keisoku.example.com',
  },
  'seed-vendor-osaka': {
    id: 'seed-vendor-osaka',
    name: '大阪校正センター',
    isManufacturer: false,
    isCalibrator: true,
    standardLeadTimeDays: 14,
    contactPerson: '井上 恵子',
    email: 'inoue@osaka-calib.example.com',
  },
  'seed-vendor-maker': {
    id: 'seed-vendor-maker',
    name: '山田計器製作所',
    isManufacturer: true,
    isCalibrator: false,
  },
  'seed-vendor-both': {
    id: 'seed-vendor-both',
    name: '共立精機',
    isManufacturer: true,
    isCalibrator: true,
    standardLeadTimeDays: 30,
  },
});

export const buildSeedPersons = (): Record<string, Person> => ({
  'seed-person-sato': {
    id: 'seed-person-sato',
    name: '佐藤 由紀子',
    email: 'sato@example.com',
    department: '品質保証部',
    isActive: true,
  },
  'seed-person-suzuki': {
    id: 'seed-person-suzuki',
    name: '鈴木 健太',
    email: 'suzuki@example.com',
    department: '製造部',
    isActive: true,
  },
  'seed-person-takahashi': {
    id: 'seed-person-takahashi',
    name: '高橋 美咲',
    email: 'takahashi@example.com',
    department: '品質保証部',
    isActive: true,
  },
  'seed-person-tanaka': {
    id: 'seed-person-tanaka',
    name: '田中 一郎',
    email: 'tanaka@example.com',
    department: '製造部',
    isActive: false,
  },
});

/** シード機器の総数。手作りの6件 + 自動生成でこの件数まで埋める（一覧・ページング確認用） */
export const SEED_EQUIPMENT_COUNT = 50;

const GENERATED_EQUIPMENT_NAMES = [
  'オシロスコープ',
  '絶縁抵抗計',
  '接地抵抗計',
  'クランプメータ',
  '騒音計',
  '照度計',
  '回転計',
  '膜厚計',
  '硬度計',
  '表面粗さ計',
  'マイクロメータ',
  'ハイトゲージ',
  'ダイヤルゲージ',
  'ブロックゲージ',
  '電子天秤',
  'pH計',
  '導電率計',
  '粘度計',
  '恒温槽',
  'データロガー',
  'ファンクションジェネレータ',
  '耐電圧試験器',
] as const;

const GENERATED_LOCATIONS = [
  '第一工場',
  '第二工場',
  '第三工場',
  '第一工場 計測室',
  '品質保証室',
  '検査ライン',
] as const;

const GENERATED_MANUFACTURER_IDS = ['seed-vendor-maker', 'seed-vendor-both'] as const;

// なぜ剰余で決めるか: 乱数を使わず決定的に生成し、テスト・画面確認の再現性を保つため。
// 大半を稼働中にしつつ、休止・廃棄も一覧フィルタ確認用に少数混ぜる。
const generatedEquipmentStatus = (index: number): EquipmentStatus => {
  if (index % 15 === 13) return EQUIPMENT_STATUS.SUSPENDED;
  if (index % 15 === 14) return EQUIPMENT_STATUS.RETIRED;
  return EQUIPMENT_STATUS.ACTIVE;
};

/** 手作りシード機器（ステータス網羅・関連データの参照先として seed.test.ts が前提にする6件） */
const buildCuratedEquipment = (): Record<string, Equipment> => ({
  'seed-equipment-001': {
    id: 'seed-equipment-001',
    managementNo: 'EQ-001',
    name: 'デジタルマルチメータ',
    model: 'DM-100',
    serialNo: 'SN-0001',
    manufacturerId: 'seed-vendor-maker',
    location: '第一工場 計測室',
    status: EQUIPMENT_STATUS.ACTIVE,
  },
  'seed-equipment-002': {
    id: 'seed-equipment-002',
    managementNo: 'EQ-002',
    name: 'トルクレンチ',
    model: 'TW-200',
    serialNo: 'SN-0002',
    manufacturerId: 'seed-vendor-both',
    location: '第二工場',
    status: EQUIPMENT_STATUS.ACTIVE,
  },
  'seed-equipment-003': {
    id: 'seed-equipment-003',
    managementNo: 'EQ-003',
    name: 'ノギス',
    model: 'CN-150',
    serialNo: 'SN-0003',
    manufacturerId: 'seed-vendor-maker',
    location: '第一工場',
    status: EQUIPMENT_STATUS.ACTIVE,
  },
  'seed-equipment-004': {
    id: 'seed-equipment-004',
    managementNo: 'EQ-004',
    name: '圧力計',
    model: 'PG-300',
    serialNo: 'SN-0004',
    manufacturerId: 'seed-vendor-both',
    location: '第三工場',
    status: EQUIPMENT_STATUS.ACTIVE,
  },
  'seed-equipment-005': {
    id: 'seed-equipment-005',
    managementNo: 'EQ-005',
    name: 'はかり',
    model: 'SC-500',
    serialNo: 'SN-0005',
    manufacturerId: 'seed-vendor-maker',
    status: EQUIPMENT_STATUS.SUSPENDED,
  },
  'seed-equipment-006': {
    id: 'seed-equipment-006',
    managementNo: 'EQ-006',
    name: '温湿度計',
    model: 'TH-600',
    serialNo: 'SN-0006',
    status: EQUIPMENT_STATUS.RETIRED,
  },
});

export const buildGeneratedEquipment = (): Record<string, Equipment> => {
  const generated: Record<string, Equipment> = {};
  const curatedCount = Object.keys(buildCuratedEquipment()).length;
  for (let index = 0; index < SEED_EQUIPMENT_COUNT - curatedCount; index += 1) {
    const sequence = String(curatedCount + index + 1).padStart(3, '0');
    const id = `seed-equipment-${sequence}`;
    generated[id] = {
      id,
      managementNo: `EQ-${sequence}`,
      name: GENERATED_EQUIPMENT_NAMES[index % GENERATED_EQUIPMENT_NAMES.length] ?? '測定器',
      model: `MD-${sequence}`,
      serialNo: `SN-0${sequence}`,
      manufacturerId:
        GENERATED_MANUFACTURER_IDS[index % GENERATED_MANUFACTURER_IDS.length] ??
        'seed-vendor-maker',
      location: GENERATED_LOCATIONS[index % GENERATED_LOCATIONS.length] ?? '第一工場',
      status: generatedEquipmentStatus(index),
    };
  }
  return generated;
};

export const buildSeedEquipment = (): Record<string, Equipment> => ({
  ...buildCuratedEquipment(),
  ...buildGeneratedEquipment(),
});
