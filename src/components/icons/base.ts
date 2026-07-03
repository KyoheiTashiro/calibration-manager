import type { SVGProps } from "react";

/**
 * アイコン共通props。サイズは呼び出し側の className（例: "h-5 w-5"）で制御し、
 * アイコン自体には width/height をハードコードしない（coding-standards.md §2）。
 */
export type IconProps = { className?: string };

const ICON_VIEW_BOX = "0 0 24 24";

/**
 * 線画（stroke）系アイコン共通のSVG属性を返すヘルパ。
 * なぜ: 装飾目的のインラインアイコンはスクリーンリーダーに読み上げさせないため
 * aria-hidden="true" を固定で付与し、色は currentColor で親要素のtext colorに追従させる。
 */
export const strokeIconProps = (className?: string): SVGProps<SVGSVGElement> => ({
  viewBox: ICON_VIEW_BOX,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  className,
});

/**
 * 塗りつぶし（fill）系アイコン共通のSVG属性を返すヘルパ。
 * なぜ: strokeIconProps と同様にaria-hidden・currentColor方針を共有しつつ、
 * ベル等の塗りつぶし表現が自然なアイコン向けに別途用意する。
 */
export const fillIconProps = (className?: string): SVGProps<SVGSVGElement> => ({
  viewBox: ICON_VIEW_BOX,
  fill: "currentColor",
  "aria-hidden": "true",
  className,
});
