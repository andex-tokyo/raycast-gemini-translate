import React, { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Preferences, getInputText, callGemini } from "./utils";

export default function Command() {
  // 状態管理用フック
  const [text, setText] = useState<string>(""); // 表示する翻訳結果テキスト
  const [isLoading, setIsLoading] = useState<boolean>(true); // ローディング状態
  const [error, setError] = useState<string | null>(null); // エラーメッセージ

  // コンポーネントマウント時に翻訳処理を実行
  useEffect(() => {
    const translate = async () => {
      setIsLoading(true); // 開始時にローディング状態にする
      try {
        // PreferencesからAPIキーとモデル名を取得
        const { geminiApiKey, geminiModel } = getPreferenceValues<Preferences>();

        // APIキーとモデル名が設定されているかチェック
        if (!geminiApiKey || !geminiModel) {
          throw new Error("API Key or Model not configured in preferences.");
        }

        // 翻訳対象のテキストを取得
        const inputText = await getInputText();

        // 処理中であることをユーザーに通知
        await showToast(Toast.Style.Animated, "Translating to English...");

        // Gemini APIに渡すプロンプトを作成 (英語翻訳用)
        const prompt = `Act as a software engineer translating a technical update for an English-speaking colleague. Use precise engineering vocabulary (merge, deploy, commit, etc.). Use common abbreviations like 'PR' instead of 'pull request'. Assume singular for terms like 'commit' unless multiple are clearly specified in the source text. Translate the following Japanese text to English. Output only the translated text:\n\n${inputText}`;
        // 共通化されたGemini API呼び出し関数を使用
        const translatedText = await callGemini(prompt, geminiApiKey, geminiModel);

        // 成功したら結果テキストを状態にセット
        setText(translatedText);
        await showToast(Toast.Style.Success, "Translation Complete");
      } catch (err) {
        console.error("Translation Error:", err);
        const message = err instanceof Error ? err.message : "An unknown error occurred"; // エラーメッセージを取得
        setError(message);
        await showFailureToast(err, { title: "Translation Failed" });
      } finally {
        // 成功・失敗に関わらずローディング状態を解除
        setIsLoading(false);
      }
    };

    translate(); // 非同期関数を実行
  }, []); // 空の依存配列で、マウント時に一度だけ実行

  // エラーが発生した場合の表示
  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  // ローディング中または翻訳結果の表示
  return (
    <Detail
      isLoading={isLoading} // ローディング状態をDetailコンポーネントに渡す
      markdown={text} // 翻訳結果をマークダウンとして表示
      actions={
        // ローディング中でなく、かつ結果テキストが存在する場合のみアクションを表示
        !isLoading && text ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy English Translation" content={text} />
            <Action.Paste title="Paste English Translation" content={text} />
          </ActionPanel>
        ) : null
      }
    />
  );
}
