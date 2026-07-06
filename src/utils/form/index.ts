import type { FieldValues, SubmitHandler, UseFormHandleSubmit } from "react-hook-form";
import { z } from "zod";

/**
 * HTML input は未入力でも空文字を返すが、ストアの optional フィールドは
 * undefined で「未設定」を表すため、送信時にこの変換が各所で必要になる。
 */
export const emptyToUndefined = (value: string | undefined): string | undefined =>
  value === undefined || value === "" ? undefined : value;

/**
 * RHF の handleSubmit をラップし、そのまま onClick に渡せる保存ハンドラを作る。
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
 * RHFのhandleSubmit(onSubmit)はPromiseを返すが、<form onSubmit>属性は同期関数を要求するため、
 * ここで吸収する。
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
// TypeScript の推論に委ねる必要があるため。
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
