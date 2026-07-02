import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

// なぜclassコンポーネントで書くか（coding-standards.md §4の例外）:
// このコードベースはアロー関数コンポーネントを原則とするが、
// Reactのエラー境界（Error Boundary）は `componentDidCatch` / `getDerivedStateFromError` という
// クラスコンポーネントのライフサイクルAPIでしか実装できない仕様上の制約があるため、
// このコンポーネントに限り class component を用いる。
export class ErrorBoundary extends Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // なぜ: 例外を握りつぶさず、原因調査ができるようコンソールに残す
    // （coding-standards.md §8「例外を投げない」方針の裏側でも、捕捉した例外自体は可視化する）。
    console.error("予期しないエラーが発生しました", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex h-dvh flex-col items-center justify-center gap-2 p-4 text-center"
        >
          <p className="text-lg font-semibold text-slate-900">予期しないエラーが発生しました</p>
          <p className="text-sm text-slate-500">画面を再読み込みしてください。</p>
        </div>
      );
    }

    return this.props.children;
  }
}
