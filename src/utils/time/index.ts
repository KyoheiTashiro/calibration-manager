/**
 * 日付ユーティリティ。アプリ全域で日付は `YYYY-MM-DD`（ISO 8601 日付）の文字列で扱い、
 * 時刻・タイムゾーンは扱わない（screen-design/README.md §0.4）。
 * ISO形式の日付文字列は辞書順比較（`<` `>`）がそのまま日付の前後比較になるため、
 * 比較専用の関数は設けない。
 */

import type { IsoDateString } from "@/store/types";

/** `YYYY-MM-DD` の形式チェック用パターン（形式のみ。暦上の妥当性は isIsoDateString で判定） */
const ISO_DATE_PATTERN = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u;

/** 年月日の内部表現。month は 1〜12（Date の 0 始まりと混同しないため 1 始まりで統一） */
type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

/**
 * その年月の末日（28〜31）を返す。
 * なぜ Date.UTC の day=0 か: 「翌月の0日目 = 当月末日」という Date の仕様を使うと
 * 閏年判定を自前で書かずに済む。UTC 固定なのは実行環境のタイムゾーンの影響を受けないため。
 */
export const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * `YYYY-MM-DD` 文字列を年月日に分解する。
 * 形式不正・暦上あり得ない日付（例: 2026-02-30）は例外を投げず null を返す
 * （coding-standards.md §8「例外を投げない」）。
 */
export const parseIsoDate = (value: string): CalendarDate | null => {
  const matched = ISO_DATE_PATTERN.exec(value)?.groups;
  if (!matched) return null;
  const year = Number(matched.year);
  const month = Number(matched.month);
  const day = Number(matched.day);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
};

/** `YYYY-MM-DD` として妥当（形式・暦の両方）かを判定する */
export const isIsoDateString = (value: string): boolean => parseIsoDate(value) !== null;

/** 年月日を `YYYY-MM-DD` 文字列へ整形する（ゼロ埋め固定10桁） */
export const formatIsoDate = ({ year, month, day }: CalendarDate): IsoDateString => {
  const paddedYear = String(year).padStart(4, "0");
  const paddedMonth = String(month).padStart(2, "0");
  const paddedDay = String(day).padStart(2, "0");
  return `${paddedYear}-${paddedMonth}-${paddedDay}`;
};

/**
 * 日数を加算（負値で減算）した `YYYY-MM-DD` を返す。
 * 入力が不正な場合は null（例外を投げない）。
 * なぜ Date.UTC 経由か: 月末・閏年をまたぐ繰り上がり/繰り下がりを Date に任せるため。
 */
export const addDays = (isoDate: IsoDateString, days: number): IsoDateString | null => {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) return null;
  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return formatIsoDate({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
};

/**
 * 今日の日付を端末ローカルタイムゾーンの `YYYY-MM-DD` で返す。
 * なぜローカルか: 現場担当者が見る「今日」と期限判定を一致させるため（UTCだと日本では朝9時まで前日になる）。
 */
export const todayIsoDate = (): IsoDateString => {
  const now = new Date();
  return formatIsoDate({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
};
