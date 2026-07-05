import {
  createFormSubmitHandler,
  createSaveHandler,
  emptyToUndefined,
  optionalNonNegativeIntegerString,
} from "@/utils/form";
import { describe, expect, it, vi } from "vitest";

describe("emptyToUndefined", () => {
  it("空文字は undefined を返す", () => {
    expect(emptyToUndefined("")).toBeUndefined();
  });

  it("undefined は undefined を返す", () => {
    // oxlint-disable-next-line unicorn/no-useless-undefined -- undefined入力時の挙動確認のため明示的に渡す必要がある
    expect(emptyToUndefined(undefined)).toBeUndefined();
  });

  it("空文字以外の文字列はそのまま返す", () => {
    expect(emptyToUndefined("value")).toBe("value");
  });
});

describe("createSaveHandler", () => {
  it("handleSubmit(onSubmit)()を呼び出す関数を返す", async () => {
    // oxlint-disable-next-line unicorn/no-useless-undefined -- mockResolvedValue は Promise<void> の解決値として引数必須
    const submitFn = vi.fn().mockResolvedValue(undefined);
    const handleSubmit = vi.fn().mockReturnValue(submitFn);
    const onSubmit = vi.fn();

    const handleSave = createSaveHandler(handleSubmit, onSubmit);
    handleSave();

    expect(handleSubmit).toHaveBeenCalledWith(onSubmit);
    await Promise.resolve();
    expect(submitFn).toHaveBeenCalledTimes(1);
  });

  it("handleSubmit(onSubmit)()がrejectしても例外を投げない", async () => {
    const submitFn = vi.fn().mockRejectedValue(new Error("到達しない想定"));
    const handleSubmit = vi.fn().mockReturnValue(submitFn);
    const onSubmit = vi.fn();

    const handleSave = createSaveHandler(handleSubmit, onSubmit);
    expect(() => {
      handleSave();
    }).not.toThrow();
    await Promise.resolve();
  });
});

describe("createFormSubmitHandler", () => {
  // イベント型はジェネリックに素通しされるため、React イベントを偽装せず文字列で代用する
  it("onFormSubmit(event)を呼び出す", async () => {
    // oxlint-disable-next-line unicorn/no-useless-undefined -- mockResolvedValue は Promise<void> の解決値として引数必須
    const onFormSubmit = vi.fn<(event: string) => Promise<void>>().mockResolvedValue(undefined);

    const handleSubmit = createFormSubmitHandler(onFormSubmit);
    handleSubmit("submit-event");

    expect(onFormSubmit).toHaveBeenCalledWith("submit-event");
    await Promise.resolve();
  });

  it("onFormSubmit(event)がrejectしても例外を投げない", async () => {
    const onFormSubmit = vi
      .fn<(event: string) => Promise<void>>()
      .mockRejectedValue(new Error("到達しない想定"));

    const handleSubmit = createFormSubmitHandler(onFormSubmit);
    expect(() => {
      handleSubmit("submit-event");
    }).not.toThrow();
    await Promise.resolve();
  });
});

describe("optionalNonNegativeIntegerString", () => {
  const schema = optionalNonNegativeIntegerString("0以上の整数で入力してください");

  it("undefinedは許容する", () => {
    // oxlint-disable-next-line unicorn/no-useless-undefined -- undefined入力時の挙動確認のため明示的に渡す必要がある
    expect(schema.safeParse(undefined).success).toBe(true);
  });

  it("空文字は許容する", () => {
    expect(schema.safeParse("").success).toBe(true);
  });

  it("0以上の整数文字列は許容する", () => {
    expect(schema.safeParse("0").success).toBe(true);
    expect(schema.safeParse("10").success).toBe(true);
  });

  it("負の数は拒否する", () => {
    const result = schema.safeParse("-1");
    expect(result.success).toBe(false);
  });

  it("整数でない値は拒否する", () => {
    const result = schema.safeParse("1.5");
    expect(result.success).toBe(false);
  });

  it("数値に変換できない文字列は拒否する", () => {
    const result = schema.safeParse("abc");
    expect(result.success).toBe(false);
  });
});
