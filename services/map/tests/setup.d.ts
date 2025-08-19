/**
 * Kiro OSS Map v2.1.0 - Map Service テストセットアップ
 * テスト環境の初期化・クリーンアップ
 */
/**
 * テスト用ヘルパー関数
 */
export declare const testHelpers: {
    /**
     * テスト用タイルデータ取得
     */
    getTestTileData(): Buffer;
    /**
     * テスト用スタイルデータ取得
     */
    getTestStyleData(): {
        version: number;
        name: string;
        sources: {
            'test-source': {
                type: string;
                tiles: string[];
                tileSize: number;
            };
        };
        layers: {
            id: string;
            type: string;
            source: string;
        }[];
    };
    /**
     * 遅延実行
     */
    delay(ms: number): Promise<void>;
    /**
     * ランダム文字列生成
     */
    randomString(length?: number): string;
};
//# sourceMappingURL=setup.d.ts.map