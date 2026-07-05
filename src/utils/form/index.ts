/**
 * RHF（react-hook-form）+ zodResolver を使うフォームで共通に必要になる処理のユーティリティ。
 * なぜ必要か: 各モーダル・ダイアログ（PersonModal/VendorModal/RecordModal/ServiceOrderModal/
 * ServiceItemModal/TransitionDialogs）で同じ送信ハンドラ・空文字正規化・zod 入力ヘルパが
 * 逐語重複していたため、ここに集約する（D-048）。
 */

import type { FieldValues, SubmitHandler, UseFormHandleSubmit } from "react-hook-form";
import { z } from "zod";

/**
 * フォーム値の空文字を undefined へ正規化する（フォーム値→ストア payload 変換用）。
 * なぜ必要か: HTML input は未入力でも空文字を返すが、ストアの optional フィールドは
 * undefined で「未設定」を表す（domain-model.md）ため、送信時にこの変換が各所で必要になる。
 */
export const emptyToUndefined = (value: string | undefined): string | undefined =>
  value === undefined || value === "" ? undefined : value;

/**
 * RHF の handleSubmit をラップし、そのまま onClick に渡せる保存ハンドラを作る。
 * なぜcatchで終端するか: no-void下でfloating promiseを残さないため(onSubmitは例外を投げない設計)。
 */
export const createSaveHandler =
  <FormValues extends FieldValues>(
    handleSubmit: UseFormHandleSubmit<FormValues>,
    onSubmit: SubmitHandler<FormValues>,
  ): (() => void) =>
  (): void => {
    handleSubmit(onSubmit)().catch(() => {
      // onSubmitは例外を投げない設計のため到達しない想定
    });
  };

/**
 * <form noValidate onSubmit={...}> に渡す同期ハンドラを作る。
 * なぜ必要か: RHFのhandleSubmit(onSubmit)はPromiseを返すが、<form onSubmit>属性は同期関数を
 * 要求する。equipment/form の create/edit で同一の.catch()終端イディオムが逐語重複していたため
 * ここに集約する（D-048）。
 * なぜcatchで終端するか: フォーム送信自体に非同期待機は不要で、no-floating-promises対応として
 * 結果を無視するため(onFormSubmitは例外を投げない設計、バリデーションエラーはRHFが内部で処理する)。
 * なぜイベント型をジェネリックにするか: React 19 で FormEvent が非推奨(実在しないイベント)となり、
 * このヘルパはイベントを素通しするだけで中身に触れないため、呼び出し側の型をそのまま受け渡す。
 */
export const createFormSubmitHandler =
  <EventArg>(onFormSubmit: (event: EventArg) => Promise<void>) =>
  (event: EventArg): void => {
    onFormSubmit(event).catch(() => {
      // 送信処理内で例外は発生しない想定(バリデーションエラーはRHFが内部で処理する)
    });
  };

/** 空欄可・0以上の整数文字列（納期(日)・費用等、フォーム入力向け zod ヘルパ） */
// なぜ戻り値の型注釈を付けないか: refine() 済みの具体的な Zod スキーマ形状を
// TypeScript の推論に委ねる必要があるため（equipment/form/shared/schema.ts の
// createEquipmentFormSchema と同方針）。
// oxlint-disable-next-line typescript/explicit-function-return-type, typescript/explicit-module-boundary-types -- 上記理由によりzodスキーマの戻り値型は推論に委ねる必要がある
export const optionalNonNegativeIntegerString = (invalidMessage: string) =>
  z
    .string()
    .optional()
    .refine(
      (value) =>
        value === undefined ||
        value === "" ||
        (Number.isInteger(Number(value)) && Number(value) >= 0),
      {
        message: invalidMessage,
      },
    );
