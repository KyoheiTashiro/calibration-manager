import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // なぜ: 例外を握りつぶさず、原因調査ができるようコンソールに残す。
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
