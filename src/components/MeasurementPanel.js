/**
 * MeasurementPanel - 計測ツール管理パネル
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

export class MeasurementPanel extends HTMLElement {
  constructor() {
    super();
    this.isOpen = false;
    this.activeMeasurement = null;
    this.measurements = [];
    this.currentUnits = 'metric';
    
    this.setupEventListeners();
  }

  connectedCallback() {
    this.render();
    this.setupUIEventListeners();
    this.loadMeasurements();
  }

  setupEventListeners() {
    EventBus.on('measurement:started', (data) => {
      this.activeMeasurement = data.measurement;
      this.updateActiveSection();
    });

    EventBus.on('measurement:updated', (data) => {
      this.activeMeasurement = data.measurement;
      this.updateMeasurementResult(data.result);
    });

    EventBus.on('measurement:completed', (data) => {
      this.activeMeasurement = null;
      this.measurements.unshift(data.measurement);
      this.updateMeasurementsList();
      this.updateActiveSection();
    });

    EventBus.on('measurement:cancelled', () => {
      this.activeMeasurement = null;
      this.updateActiveSection();
    });

    EventBus.on('measurement:deleted', (data) => {
      this.measurements = this.measurements.filter(m => m.id !== data.id);
      this.updateMeasurementsList();
    });

    EventBus.on('measurement:allCleared', () => {
      this.measurements = [];
      this.updateMeasurementsList();
    });

    EventBus.on('measurement:unitsChanged', (data) => {
      this.currentUnits = data.units;
      this.updateUnitsDisplay();
    });
  }

  render() {
    this.innerHTML = `
      <div class="measurement-panel bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700">
        <!-- Header -->
        <div class="measurement-header p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
              計測ツール
            </h3>
            <button id="close-measurement" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Measurement Tools -->
        <div class="measurement-tools p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="grid grid-cols-3 gap-2 mb-4">
            <button id="measure-distance" class="measurement-tool-btn flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
              <svg class="w-6 h-6 mb-1 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
              <span class="text-xs text-gray-600 dark:text-gray-400">距離</span>
            </button>
            <button id="measure-area" class="measurement-tool-btn flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
              <svg class="w-6 h-6 mb-1 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
              </svg>
              <span class="text-xs text-gray-600 dark:text-gray-400">面積</span>
            </button>
            <button id="measure-route" class="measurement-tool-btn flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
              <svg class="w-6 h-6 mb-1 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
              </svg>
              <span class="text-xs text-gray-600 dark:text-gray-400">ルート</span>
            </button>
          </div>

          <!-- Units Toggle -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400">単位:</span>
            <div class="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button id="units-metric" class="units-btn px-3 py-1 text-sm rounded-md transition-colors">
                メートル法
              </button>
              <button id="units-imperial" class="units-btn px-3 py-1 text-sm rounded-md transition-colors">
                ヤード・ポンド法
              </button>
            </div>
          </div>
        </div>

        <!-- Active Measurement -->
        <div id="active-measurement" class="active-measurement p-4 border-b border-gray-200 dark:border-gray-700 hidden">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-medium text-gray-900 dark:text-white">測定中</h4>
            <div class="flex space-x-2">
              <button id="finish-measurement" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors">
                完了
              </button>
              <button id="cancel-measurement" class="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-colors">
                キャンセル
              </button>
            </div>
          </div>
          
          <div id="measurement-result" class="measurement-result">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              地図をクリックして測定点を追加してください
            </div>
          </div>
        </div>

        <!-- Measurements History -->
        <div class="measurements-history">
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-gray-900 dark:text-white">測定履歴</h4>
              <div class="flex space-x-2">
                <button id="export-measurements" class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                  エクスポート
                </button>
                <button id="clear-measurements" class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                  すべて削除
                </button>
              </div>
            </div>
          </div>
          
          <div id="measurements-list" class="measurements-list max-h-64 overflow-y-auto">
            <div class="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              測定履歴はありません
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupUIEventListeners() {
    // Close button
    this.querySelector('#close-measurement').addEventListener('click', () => {
      this.close();
    });

    // Measurement tool buttons
    this.querySelector('#measure-distance').addEventListener('click', () => {
      this.startMeasurement('distance');
    });

    this.querySelector('#measure-area').addEventListener('click', () => {
      this.startMeasurement('area');
    });

    this.querySelector('#measure-route').addEventListener('click', () => {
      this.startMeasurement('route');
    });

    // Units buttons
    this.querySelector('#units-metric').addEventListener('click', () => {
      this.setUnits('metric');
    });

    this.querySelector('#units-imperial').addEventListener('click', () => {
      this.setUnits('imperial');
    });

    // Active measurement controls
    this.querySelector('#finish-measurement').addEventListener('click', () => {
      EventBus.emit('measurement:finish');
    });

    this.querySelector('#cancel-measurement').addEventListener('click', () => {
      EventBus.emit('measurement:cancel');
    });

    // History controls
    this.querySelector('#export-measurements').addEventListener('click', () => {
      this.showExportDialog();
    });

    this.querySelector('#clear-measurements').addEventListener('click', () => {
      this.confirmClearMeasurements();
    });

    // Initialize units display
    this.updateUnitsDisplay();
  }

  startMeasurement(type) {
    const typeNames = {
      distance: '距離',
      area: '面積',
      route: 'ルート距離'
    };

    Logger.info(`Starting ${type} measurement`);
    EventBus.emit('measurement:start', { type });
    
    // Update UI
    this.updateToolButtons(type);
    this.showActiveSection(typeNames[type]);
  }

  updateToolButtons(activeType) {
    const buttons = this.querySelectorAll('.measurement-tool-btn');
    buttons.forEach(btn => {
      btn.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
      btn.classList.add('border-gray-200', 'dark:border-gray-600');
    });

    const activeButton = this.querySelector(`#measure-${activeType}`);
    if (activeButton) {
      activeButton.classList.remove('border-gray-200', 'dark:border-gray-600');
      activeButton.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
    }
  }

  showActiveSection(typeName) {
    const activeSection = this.querySelector('#active-measurement');
    activeSection.classList.remove('hidden');
    
    const resultDiv = this.querySelector('#measurement-result');
    resultDiv.innerHTML = `
      <div class="text-sm text-gray-600 dark:text-gray-400">
        ${typeName}測定中 - 地図をクリックして測定点を追加してください
      </div>
    `;
  }

  updateActiveSection() {
    const activeSection = this.querySelector('#active-measurement');
    
    if (this.activeMeasurement) {
      activeSection.classList.remove('hidden');
    } else {
      activeSection.classList.add('hidden');
      this.clearToolButtons();
    }
  }

  clearToolButtons() {
    const buttons = this.querySelectorAll('.measurement-tool-btn');
    buttons.forEach(btn => {
      btn.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900');
      btn.classList.add('border-gray-200', 'dark:border-gray-600');
    });
  }

  updateMeasurementResult(result) {
    if (!result) return;

    const resultDiv = this.querySelector('#measurement-result');
    let content = '';

    switch (result.type) {
      case 'distance':
        content = `
          <div class="space-y-2">
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              総距離: ${result.formatted}
            </div>
            ${result.segments ? `
              <div class="text-sm text-gray-600 dark:text-gray-400">
                セグメント数: ${result.segments.length}
              </div>
            ` : ''}
          </div>
        `;
        break;

      case 'area':
        content = `
          <div class="space-y-2">
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              面積: ${result.formatted}
            </div>
            ${result.perimeter ? `
              <div class="text-sm text-gray-600 dark:text-gray-400">
                周囲長: ${result.perimeter.formatted}
              </div>
            ` : ''}
          </div>
        `;
        break;

      case 'route':
        content = `
          <div class="space-y-2">
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              ルート距離: ${result.formatted}
            </div>
            ${result.formattedDuration ? `
              <div class="text-sm text-gray-600 dark:text-gray-400">
                所要時間: ${result.formattedDuration}
              </div>
            ` : ''}
          </div>
        `;
        break;
    }

    resultDiv.innerHTML = content;
  }

  setUnits(units) {
    this.currentUnits = units;
    EventBus.emit('measurement:setUnits', { units });
  }

  updateUnitsDisplay() {
    const metricBtn = this.querySelector('#units-metric');
    const imperialBtn = this.querySelector('#units-imperial');

    if (this.currentUnits === 'metric') {
      metricBtn.classList.add('bg-white', 'dark:bg-gray-600', 'text-gray-900', 'dark:text-white');
      metricBtn.classList.remove('text-gray-600', 'dark:text-gray-400');
      imperialBtn.classList.remove('bg-white', 'dark:bg-gray-600', 'text-gray-900', 'dark:text-white');
      imperialBtn.classList.add('text-gray-600', 'dark:text-gray-400');
    } else {
      imperialBtn.classList.add('bg-white', 'dark:bg-gray-600', 'text-gray-900', 'dark:text-white');
      imperialBtn.classList.remove('text-gray-600', 'dark:text-gray-400');
      metricBtn.classList.remove('bg-white', 'dark:bg-gray-600', 'text-gray-900', 'dark:text-white');
      metricBtn.classList.add('text-gray-600', 'dark:text-gray-400');
    }
  }

  loadMeasurements() {
    // Request measurements from service
    EventBus.emit('measurement:requestHistory');
  }

  updateMeasurementsList() {
    const listContainer = this.querySelector('#measurements-list');
    
    if (this.measurements.length === 0) {
      listContainer.innerHTML = `
        <div class="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          測定履歴はありません
        </div>
      `;
      return;
    }

    const measurementItems = this.measurements.map(measurement => {
      const typeNames = {
        distance: '距離',
        area: '面積',
        route: 'ルート'
      };

      const date = new Date(measurement.createdAt).toLocaleDateString('ja-JP');
      const time = new Date(measurement.createdAt).toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      return `
        <div class="measurement-item p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <span class="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                <span class="font-medium text-gray-900 dark:text-white">
                  ${typeNames[measurement.type]}測定
                </span>
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                ${measurement.result?.formatted || '計算中...'}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                ${date} ${time}
              </div>
            </div>
            <div class="flex space-x-1">
              <button class="view-measurement-btn text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1" 
                      data-id="${measurement.id}" title="表示">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </button>
              <button class="delete-measurement-btn text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1" 
                      data-id="${measurement.id}" title="削除">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    listContainer.innerHTML = measurementItems;

    // Add event listeners for measurement items
    listContainer.querySelectorAll('.view-measurement-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.viewMeasurement(id);
      });
    });

    listContainer.querySelectorAll('.delete-measurement-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.deleteMeasurement(id);
      });
    });
  }

  viewMeasurement(id) {
    const measurement = this.measurements.find(m => m.id === id);
    if (measurement) {
      EventBus.emit('measurement:view', { measurement });
    }
  }

  deleteMeasurement(id) {
    if (confirm('この測定結果を削除しますか？')) {
      EventBus.emit('measurement:delete', { id });
    }
  }

  showExportDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    dialog.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          測定結果をエクスポート
        </h3>
        <div class="space-y-3">
          <button class="export-btn w-full p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" data-format="json">
            <div class="font-medium text-gray-900 dark:text-white">JSON形式</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">構造化データとして保存</div>
          </button>
          <button class="export-btn w-full p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" data-format="csv">
            <div class="font-medium text-gray-900 dark:text-white">CSV形式</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">表計算ソフトで利用</div>
          </button>
          <button class="export-btn w-full p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700" data-format="geojson">
            <div class="font-medium text-gray-900 dark:text-white">GeoJSON形式</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">GISソフトで利用</div>
          </button>
        </div>
        <div class="flex justify-end space-x-3 mt-6">
          <button id="cancel-export" class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            キャンセル
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // Add event listeners
    dialog.querySelectorAll('.export-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const format = btn.dataset.format;
        this.exportMeasurements(format);
        document.body.removeChild(dialog);
      });
    });

    dialog.querySelector('#cancel-export').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });
  }

  exportMeasurements(format) {
    EventBus.emit('measurement:export', { format });
  }

  confirmClearMeasurements() {
    if (confirm('すべての測定履歴を削除しますか？この操作は取り消せません。')) {
      EventBus.emit('measurement:clear');
    }
  }

  open() {
    this.isOpen = true;
    this.classList.remove('hidden');
    this.classList.add('block');
    
    EventBus.emit('measurement-panel:opened');
    Logger.info('Measurement panel opened');
  }

  close() {
    this.isOpen = false;
    this.classList.add('hidden');
    this.classList.remove('block');
    
    // Cancel active measurement if any
    if (this.activeMeasurement) {
      EventBus.emit('measurement:cancel');
    }
    
    EventBus.emit('measurement-panel:closed');
    Logger.info('Measurement panel closed');
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
}

// Register the custom element
customElements.define('measurement-panel', MeasurementPanel);