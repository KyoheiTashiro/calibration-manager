import { z } from 'zod';

/**
 * HTML input は未入力でも空文字を返すが、ストアの optional フィールドは
 * undefined で「未設定」を表すため、送信時にこの変換が各所で必要になる。
 */
export const emptyToUndefined = (value: string | undefined): string | undefined =>
  value === undefined || value === '' ? undefined : value;

/**
 * <form noValidate onSubmit={...}> やモーダルの保存ボタン onClick に渡す同期ハンドラを作る
 * （`createFormSubmitHandler(handleSubmit(onSubmit))`）。
 * RHFのhandleSubmit(onSubmit)はPromiseを返すが、<form onSubmit>属性は同期関数を要求するため、
 * ここで吸収する。
 * なぜ引数型をジェネリックにするか: React 19 で FormEvent が非推奨(実在しないイベント)となり、
 * このヘルパはイベントを素通しするだけで中身に触れないため、呼び出し側の型をそのまま受け渡す
 * （RHF の handleSubmit(onSubmit) はイベント省略可のため、引数なしの onClick 型にも渡せる）。
 */
export const createFormSubmitHandler =
  <Args extends unknown[]>(onFormSubmit: (...args: Args) => Promise<unknown>) =>
  (...args: Args): void => {
    onFormSubmit(...args).catch(() => {
      // 送信処理内で例外は発生しない想定(バリデーションエラーはRHFが内部で処理する)
    });
  };

/** 文字数上限エラーの統一文言(`${label}は${max}文字以内で入力してください`) */
export const maxLengthMessage = (label: string, max: number): string =>
  `${label}は${max}文字以内で入力してください`;

const isNonNegativeIntegerString = (value: string): boolean =>
  Number.isInteger(Number(value)) && Number(value) >= 0;

/** 空欄可・0以上の整数文字列（納期(日)・費用等、フォーム入力向け zod ヘルパ） */
// なぜ戻り値の型注釈を付けないか: refine() 済みの具体的な Zod スキーマ形状を
// TypeScript の推論に委ねる必要があるため。
// oxlint-disable-next-line typescript/explicit-function-return-type, typescript/explicit-module-boundary-types -- 上記理由によりzodスキーマの戻り値型は推論に委ねる必要がある
export const optionalNonNegativeIntegerString = (invalidMessage: string) =>
  z
    .string()
    .optional()
    .refine((value) => value === undefined || value === '' || isNonNegativeIntegerString(value), {
      message: invalidMessage,
    });

/** 空欄不可・0以上の整数文字列（発注余裕日・通知開始日数等、フォーム入力向け zod ヘルパ） */
// oxlint-disable-next-line typescript/explicit-function-return-type, typescript/explicit-module-boundary-types -- optionalNonNegativeIntegerString と同じ理由によりzodスキーマの戻り値型は推論に委ねる必要がある
export const requiredNonNegativeIntegerString = (requiredMessage: string, invalidMessage: string) =>
  z.string().min(1, requiredMessage).refine(isNonNegativeIntegerString, {
    message: invalidMessage,
  });
