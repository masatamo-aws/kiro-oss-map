/**
 * Kiro OSS Map v2.1.0 - Map Service テストセットアップ
 * テスト環境の初期化・クリーンアップ
 */
import { beforeAll, afterAll } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
/**
 * テスト前のセットアップ
 */
beforeAll(async () => {
    // テスト用環境変数設定
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error'; // テスト中はエラーログのみ
    // テスト用データディレクトリ作成
    const testDataDir = './test-data';
    const tilesDir = path.join(testDataDir, 'tiles');
    const stylesDir = path.join(testDataDir, 'styles');
    try {
        await fs.mkdir(testDataDir, { recursive: true });
        await fs.mkdir(tilesDir, { recursive: true });
        await fs.mkdir(stylesDir, { recursive: true });
        // テスト用サンプルファイル作成
        await createTestTiles(tilesDir);
        await createTestStyles(stylesDir);
        console.log('Test environment setup completed');
    }
    catch (error) {
        console.error('Failed to setup test environment:', error);
    }
});
/**
 * テスト後のクリーンアップ
 */
afterAll(async () => {
    // テスト用データディレクトリ削除
    const testDataDir = './test-data';
    try {
        await fs.rm(testDataDir, { recursive: true, force: true });
        console.log('Test environment cleanup completed');
    }
    catch (error) {
        console.error('Failed to cleanup test environment:', error);
    }
});
/**
 * テスト用タイル作成
 */
async function createTestTiles(tilesDir) {
    // 1x1ピクセルのPNG画像データ（透明）
    const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0B, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    // テスト用タイル構造作成
    const testTiles = [
        { z: 0, x: 0, y: 0 },
        { z: 1, x: 0, y: 0 },
        { z: 1, x: 0, y: 1 },
        { z: 1, x: 1, y: 0 },
        { z: 1, x: 1, y: 1 },
        { z: 2, x: 0, y: 0 }
    ];
    for (const tile of testTiles) {
        const tileDir = path.join(tilesDir, tile.z.toString(), tile.x.toString());
        await fs.mkdir(tileDir, { recursive: true });
        const tilePath = path.join(tileDir, `${tile.y}.png`);
        await fs.writeFile(tilePath, pngData);
    }
}
/**
 * テスト用スタイル作成
 */
async function createTestStyles(stylesDir) {
    const testStyles = [
        {
            id: 'basic',
            name: 'Basic Style',
            style: {
                version: 8,
                name: 'Basic',
                sources: {
                    'test-source': {
                        type: 'raster',
                        tiles: ['http://localhost:3002/tiles/{z}/{x}/{y}.png'],
                        tileSize: 256
                    }
                },
                layers: [
                    {
                        id: 'background',
                        type: 'background',
                        paint: {
                            'background-color': '#f0f0f0'
                        }
                    },
                    {
                        id: 'test-layer',
                        type: 'raster',
                        source: 'test-source'
                    }
                ]
            },
            metadata: {
                description: 'Basic test style',
                author: 'Test Suite',
                version: '1.0.0'
            }
        },
        {
            id: 'satellite',
            name: 'Satellite Style',
            style: {
                version: 8,
                name: 'Satellite',
                sources: {
                    'satellite-source': {
                        type: 'raster',
                        tiles: ['http://localhost:3002/tiles/{z}/{x}/{y}.jpg'],
                        tileSize: 256
                    }
                },
                layers: [
                    {
                        id: 'satellite-layer',
                        type: 'raster',
                        source: 'satellite-source'
                    }
                ]
            },
            metadata: {
                description: 'Satellite imagery style',
                author: 'Test Suite',
                version: '1.0.0'
            }
        }
    ];
    for (const style of testStyles) {
        const stylePath = path.join(stylesDir, `${style.id}.json`);
        await fs.writeFile(stylePath, JSON.stringify(style, null, 2));
    }
}
/**
 * テスト用ヘルパー関数
 */
export const testHelpers = {
    /**
     * テスト用タイルデータ取得
     */
    getTestTileData() {
        return Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
            0x0B, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
            0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);
    },
    /**
     * テスト用スタイルデータ取得
     */
    getTestStyleData() {
        return {
            version: 8,
            name: 'Test Style',
            sources: {
                'test-source': {
                    type: 'raster',
                    tiles: ['http://localhost:3002/tiles/{z}/{x}/{y}.png'],
                    tileSize: 256
                }
            },
            layers: [
                {
                    id: 'test-layer',
                    type: 'raster',
                    source: 'test-source'
                }
            ]
        };
    },
    /**
     * 遅延実行
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    /**
     * ランダム文字列生成
     */
    randomString(length = 8) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
};
//# sourceMappingURL=setup.js.map