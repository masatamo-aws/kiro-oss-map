/**
 * BookmarkPanel - ブックマーク管理パネル
 */

import { EventBus } from '../utils/EventBus.js';

export class BookmarkPanel extends HTMLElement {
  constructor() {
    super();
    this.isVisible = false;
    this.currentView = 'list';
    this.selectedBookmark = null;
    this.selectedCategory = null;
    this.searchQuery = '';
    this.searchFilters = {};
    this.bookmarks = [];
    this.categories = [];
    
    this.setupEventListeners();
  }

  connectedCallback() {
    this.render();
    this.setupUIEventListeners();
  }

  setupEventListeners() {
    EventBus.on('bookmark:added', () => {
      this.refreshBookmarkList();
    });

    EventBus.on('i18n:languageChanged', () => {
      this.updateTranslations();
    });

    EventBus.on('bookmark:updated', () => {
      this.refreshBookmarkList();
    });

    EventBus.on('bookmark:deleted', () => {
      this.refreshBookmarkList();
    });

    EventBus.on('bookmark:category:created', () => {
      this.refreshCategoryList();
    });

    EventBus.on('bookmark:category:updated', () => {
      this.refreshCategoryList();
    });

    EventBus.on('bookmark:category:deleted', () => {
      this.refreshCategoryList();
    });

    EventBus.on('bookmark:search:results', (data) => {
      this.displaySearchResults(data.results);
    });
  }

  setupUIEventListeners() {
    this.querySelector('.close-btn')?.addEventListener('click', () => {
      this.hide();
    });

    this.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.switchView(view);
      });
    });

    this.querySelector('.add-bookmark-btn')?.addEventListener('click', () => {
      this.switchView('add');
    });

    this.setupContentEventListeners();
  }

  setupContentEventListeners() {
    // Add form event listeners for add/edit views
    const addForm = this.querySelector('.add-bookmark-form');
    if (addForm) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAddBookmark(e);
      });

      const cancelBtn = addForm.querySelector('.cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          this.switchView('list');
        });
      }
    }

    // Edit form event listeners
    const editForm = this.querySelector('.edit-bookmark-form');
    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleEditBookmark(e);
      });

      const deleteBtn = editForm.querySelector('.delete-bookmark-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.handleDeleteBookmark();
        });
      }

      const cancelBtn = editForm.querySelector('.cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          this.selectedBookmark = null;
          this.switchView('list');
        });
      }
    }

    // Bookmark item event listeners
    this.querySelectorAll('.bookmark-item').forEach(item => {
      // View bookmark
      item.addEventListener('bookmark-view', (e) => {
        EventBus.emit('bookmark:view', { id: e.detail.id });
      });

      // Edit bookmark button
      const editBtn = item.querySelector('.edit-bookmark-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const bookmarkId = e.target.closest('.edit-bookmark-btn').dataset.bookmarkId;
          this.editBookmark(bookmarkId);
        });
      }

      // Delete bookmark button
      const deleteBtn = item.querySelector('.delete-bookmark-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const bookmarkId = e.target.closest('.delete-bookmark-btn').dataset.bookmarkId;
          this.confirmDeleteBookmark(bookmarkId);
        });
      }
    });

    // Category management event listeners
    this.querySelectorAll('.edit-category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const categoryId = btn.dataset.categoryId;
        this.editCategory(categoryId);
      });
    });

    this.querySelectorAll('.delete-category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const categoryId = btn.dataset.categoryId;
        this.confirmDeleteCategory(categoryId);
      });
    });

    const addCategoryBtn = this.querySelector('.add-category-btn');
    if (addCategoryBtn) {
      addCategoryBtn.addEventListener('click', () => {
        this.showAddCategoryDialog();
      });
    }

    // Add search input event listener
    const searchInput = this.querySelector('.search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.handleSearch(e.target.value);
      });
    }
  }

  render() {
    this.className = 'bookmark-panel fixed top-20 right-4 w-80 z-40 hidden';
    this.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="bookmark-header bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
              </svg>
              <h2 class="text-xl font-bold">ブックマーク</h2>
            </div>
            <button class="close-btn text-white hover:text-gray-200 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <div class="flex space-x-2 mt-4">
            <button class="view-btn px-3 py-1 rounded text-sm bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors active" data-view="list">
              一覧
            </button>
            <button class="view-btn px-3 py-1 rounded text-sm bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors" data-view="categories">
              カテゴリ
            </button>
            <button class="view-btn px-3 py-1 rounded text-sm bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors" data-view="search">
              検索
            </button>
          </div>
        </div>

        <div class="bookmark-content p-4 max-h-96 overflow-y-auto">
          ${this.renderCurrentView()}
        </div>

        <div class="bookmark-footer bg-gray-50 dark:bg-gray-700 p-3 border-t border-gray-200 dark:border-gray-600">
          <div class="flex justify-between items-center">
            <button class="add-bookmark-btn bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors">
              追加
            </button>
          </div>
        </div>
      </div>
    `;

    this.updateActiveView();
  }

  renderCurrentView() {
    switch (this.currentView) {
      case 'add':
        return this.renderAddBookmarkView();
      case 'edit':
        return this.renderEditBookmarkView();
      case 'categories':
        return this.renderCategoriesView();
      case 'search':
        return this.renderSearchView();
      default:
        return this.renderBookmarkListView();
    }
  }

  renderBookmarkListView() {
    if (this.bookmarks.length === 0) {
      return `
        <div class="bookmark-list-view">
          <div class="bookmark-list space-y-2">
            <div class="text-center text-gray-500 dark:text-gray-400 py-8">
              ブックマークがありません
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="bookmark-list-view">
        <div class="bookmark-list space-y-2">
          ${this.bookmarks.map(bookmark => this.renderBookmarkItem(bookmark, true)).join('')}
        </div>
      </div>
    `;
  }

  renderAddBookmarkView() {
    return `
      <div class="add-bookmark-view">
        <form class="add-bookmark-form space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              名前 *
            </label>
            <input type="text" name="name" required 
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              カテゴリ
            </label>
            <select name="categoryId" 
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="personal">プライベート</option>
            </select>
          </div>
          
          <div class="flex space-x-2">
            <button type="submit" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors">
              保存
            </button>
            <button type="button" class="cancel-btn flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    `;
  }

  renderEditBookmarkView() {
    if (!this.selectedBookmark) {
      return `
        <div class="edit-bookmark-view">
          <p class="text-gray-500 dark:text-gray-400">編集するブックマークを選択してください</p>
        </div>
      `;
    }

    return `
      <div class="edit-bookmark-view">
        <form class="edit-bookmark-form space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              名前 *
            </label>
            <input type="text" name="name" required value="${this.selectedBookmark.name}"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              カテゴリ
            </label>
            <select name="categoryId" 
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              ${this.categories.map(cat => 
                `<option value="${cat.id}" ${cat.id === this.selectedBookmark.categoryId ? 'selected' : ''}>${cat.name}</option>`
              ).join('')}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              メモ
            </label>
            <textarea name="notes" rows="3" placeholder="メモを入力..."
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">${this.selectedBookmark.notes || ''}</textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              タグ（カンマ区切り）
            </label>
            <input type="text" name="tags" value="${(this.selectedBookmark.tags || []).join(', ')}"
                   placeholder="タグ1, タグ2, タグ3"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div class="location-info bg-blue-50 dark:bg-blue-900 p-3 rounded-md">
            <div class="text-sm text-blue-800 dark:text-blue-200">
              <strong>位置:</strong><br>
              緯度: ${this.selectedBookmark.location.lat.toFixed(6)}<br>
              経度: ${this.selectedBookmark.location.lng.toFixed(6)}
            </div>
          </div>
          
          <div class="flex space-x-2">
            <button type="submit" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors">
              更新
            </button>
            <button type="button" class="delete-bookmark-btn flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md transition-colors">
              削除
            </button>
            <button type="button" class="cancel-btn bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    `;
  }

  renderCategoriesView() {
    if (this.categories.length === 0) {
      return `
        <div class="categories-view">
          <div class="text-center text-gray-500 dark:text-gray-400 py-8">
            カテゴリがありません
          </div>
          <button class="add-category-btn w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors">
            新しいカテゴリを追加
          </button>
        </div>
      `;
    }

    return `
      <div class="categories-view">
        <div class="category-list space-y-2">
          ${this.categories.map(category => `
            <div class="category-item bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-4 h-4 rounded-full" style="background-color: ${category.color || '#3B82F6'}"></div>
                  <div>
                    <h4 class="font-medium text-gray-900 dark:text-gray-100">${category.name}</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${this.getBookmarkCountByCategory(category.id)} 個のブックマーク</p>
                  </div>
                </div>
                <div class="flex space-x-1">
                  <button class="edit-category-btn text-blue-600 hover:text-blue-700 dark:text-blue-400 p-1" data-category-id="${category.id}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>
                  <button class="delete-category-btn text-red-600 hover:text-red-700 dark:text-red-400 p-1" data-category-id="${category.id}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="add-category-btn w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors">
          新しいカテゴリを追加
        </button>
      </div>
    `;
  }

  renderSearchView() {
    return `
      <div class="search-view">
        <div class="search-controls space-y-3 mb-4">
          <input type="text" placeholder="ブックマークを検索..." 
                 class="search-input w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        
        <div class="search-results">
          <div class="text-center text-gray-500 dark:text-gray-400 py-8">
            検索キーワードを入力してください
          </div>
        </div>
      </div>
    `;
  }

  switchView(view) {
    this.currentView = view;
    this.querySelector('.bookmark-content').innerHTML = this.renderCurrentView();
    this.updateActiveView();
    this.setupContentEventListeners();
  }

  updateActiveView() {
    this.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.view === this.currentView) {
        btn.classList.add('active');
      }
    });
  }

  updateTranslations() {
    this.render();
    this.setupUIEventListeners();
  }

  refreshBookmarkList() {
    if (this.currentView === 'list') {
      this.switchView('list');
    }
  }

  refreshCategoryList() {
    if (this.currentView === 'categories') {
      this.switchView('categories');
    }
  }

  displaySearchResults(results) {
    const container = this.querySelector('.search-results');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 dark:text-gray-400 py-8">
          検索結果が見つかりませんでした
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="search-results-list space-y-2">
        ${results.map(bookmark => this.renderBookmarkItem(bookmark)).join('')}
      </div>
    `;
  }

  renderBookmarkItem(bookmark, showActions = false) {
    const category = this.categories.find(cat => cat.id === bookmark.categoryId);
    const categoryName = category ? category.name : 'プライベート';
    
    return `
      <div class="bookmark-item bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer" data-bookmark-id="${bookmark.id}">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0" onclick="this.closest('.bookmark-item').dispatchEvent(new CustomEvent('bookmark-view', {detail: {id: '${bookmark.id}'}}))">
            <h4 class="font-medium text-gray-900 dark:text-gray-100 truncate">${bookmark.name}</h4>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              ${categoryName}
            </div>
            ${bookmark.notes ? `<div class="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">${bookmark.notes}</div>` : ''}
            ${bookmark.tags && bookmark.tags.length > 0 ? `
              <div class="flex flex-wrap gap-1 mt-2">
                ${bookmark.tags.slice(0, 3).map(tag => `
                  <span class="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">${tag}</span>
                `).join('')}
                ${bookmark.tags.length > 3 ? `<span class="text-xs text-gray-500">+${bookmark.tags.length - 3}</span>` : ''}
              </div>
            ` : ''}
          </div>
          ${showActions ? `
            <div class="flex flex-col space-y-1 ml-2">
              <button class="edit-bookmark-btn text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1" 
                      data-bookmark-id="${bookmark.id}" title="編集">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="delete-bookmark-btn text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1" 
                      data-bookmark-id="${bookmark.id}" title="削除">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          ` : ''}
        </div>
        ${bookmark.visitCount > 0 ? `
          <div class="text-xs text-gray-500 dark:text-gray-500 mt-2">
            訪問回数: ${bookmark.visitCount}回
            ${bookmark.lastVisited ? ` | 最終訪問: ${new Date(bookmark.lastVisited).toLocaleDateString()}` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  updateBookmarks(bookmarks) {
    this.bookmarks = bookmarks;
    this.refreshBookmarkList();
  }

  updateCategories(categories) {
    this.categories = categories;
    this.refreshCategoryList();
  }

  handleAddBookmark(event) {
    const formData = new FormData(event.target);
    const bookmarkData = {
      name: formData.get('name'),
      categoryId: formData.get('categoryId') || 'personal',
      location: this.getCurrentLocation(),
      timestamp: new Date().toISOString()
    };

    EventBus.emit('bookmark:add', bookmarkData);
    this.switchView('list');
  }

  handleSearch(query) {
    this.searchQuery = query;
    if (query.trim()) {
      EventBus.emit('bookmark:search', { query: query.trim() });
    } else {
      this.displaySearchResults([]);
    }
  }

  editBookmark(bookmarkId) {
    this.selectedBookmark = this.bookmarks.find(b => b.id === bookmarkId);
    if (this.selectedBookmark) {
      this.switchView('edit');
    }
  }

  handleEditBookmark(event) {
    const formData = new FormData(event.target);
    const tags = formData.get('tags') ? 
      formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : 
      [];

    const updates = {
      name: formData.get('name'),
      categoryId: formData.get('categoryId'),
      notes: formData.get('notes') || '',
      tags: tags
    };

    EventBus.emit('bookmark:update', { 
      id: this.selectedBookmark.id, 
      updates: updates 
    });
    
    this.selectedBookmark = null;
    this.switchView('list');
  }

  confirmDeleteBookmark(bookmarkId) {
    const bookmark = this.bookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    if (confirm(`ブックマーク「${bookmark.name}」を削除しますか？`)) {
      EventBus.emit('bookmark:delete', { id: bookmarkId });
    }
  }

  handleDeleteBookmark() {
    if (!this.selectedBookmark) return;

    if (confirm(`ブックマーク「${this.selectedBookmark.name}」を削除しますか？`)) {
      EventBus.emit('bookmark:delete', { id: this.selectedBookmark.id });
      this.selectedBookmark = null;
      this.switchView('list');
    }
  }

  getCurrentLocation() {
    // Get current map center and zoom
    if (window.app && window.app.services && window.app.services.map) {
      const map = window.app.services.map.getMap();
      if (map) {
        const center = map.getCenter();
        const zoom = map.getZoom();
        return {
          lng: center.lng,
          lat: center.lat,
          zoom: zoom
        };
      }
    }
    return { lng: 0, lat: 0, zoom: 1 };
  }

  getBookmarkCountByCategory(categoryId) {
    return this.bookmarks.filter(bookmark => bookmark.categoryId === categoryId).length;
  }

  editCategory(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category) return;

    this.showEditCategoryDialog(category);
  }

  confirmDeleteCategory(categoryId) {
    const category = this.categories.find(c => c.id === categoryId);
    if (!category) return;

    const bookmarkCount = this.getBookmarkCountByCategory(categoryId);
    let message = `カテゴリ「${category.name}」を削除しますか？`;
    
    if (bookmarkCount > 0) {
      message += `\n\n注意: このカテゴリには${bookmarkCount}個のブックマークが含まれています。削除すると、これらのブックマークは「プライベート」カテゴリに移動されます。`;
    }

    if (confirm(message)) {
      EventBus.emit('bookmark:category:delete', { id: categoryId });
    }
  }

  showAddCategoryDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    dialog.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">新しいカテゴリ</h3>
        
        <form class="add-category-form space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              カテゴリ名 *
            </label>
            <input type="text" name="name" required placeholder="カテゴリ名を入力"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              色
            </label>
            <div class="flex space-x-2">
              <input type="color" name="color" value="#3B82F6" 
                     class="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer">
              <input type="text" name="colorText" value="#3B82F6" placeholder="#3B82F6"
                     class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
          </div>
          
          <div class="flex space-x-2">
            <button type="submit" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors">
              作成
            </button>
            <button type="button" class="cancel-dialog-btn flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(dialog);

    // Sync color inputs
    const colorInput = dialog.querySelector('input[name="color"]');
    const colorTextInput = dialog.querySelector('input[name="colorText"]');
    
    colorInput.addEventListener('input', (e) => {
      colorTextInput.value = e.target.value;
    });
    
    colorTextInput.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        colorInput.value = e.target.value;
      }
    });

    // Setup dialog listeners
    const form = dialog.querySelector('.add-category-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      
      EventBus.emit('bookmark:category:create', {
        name: formData.get('name'),
        color: formData.get('color')
      });
      
      document.body.removeChild(dialog);
    });

    dialog.querySelector('.cancel-dialog-btn').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });

    // Focus on name input
    setTimeout(() => {
      dialog.querySelector('input[name="name"]').focus();
    }, 100);
  }

  showEditCategoryDialog(category) {
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    dialog.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">カテゴリ編集</h3>
        
        <form class="edit-category-form space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              カテゴリ名 *
            </label>
            <input type="text" name="name" required value="${category.name}"
                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              色
            </label>
            <div class="flex space-x-2">
              <input type="color" name="color" value="${category.color || '#3B82F6'}" 
                     class="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer">
              <input type="text" name="colorText" value="${category.color || '#3B82F6'}"
                     class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
          </div>
          
          <div class="flex space-x-2">
            <button type="submit" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors">
              更新
            </button>
            <button type="button" class="cancel-dialog-btn flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors">
              キャンセル
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(dialog);

    // Sync color inputs
    const colorInput = dialog.querySelector('input[name="color"]');
    const colorTextInput = dialog.querySelector('input[name="colorText"]');
    
    colorInput.addEventListener('input', (e) => {
      colorTextInput.value = e.target.value;
    });
    
    colorTextInput.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        colorInput.value = e.target.value;
      }
    });

    // Setup dialog listeners
    const form = dialog.querySelector('.edit-category-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      
      EventBus.emit('bookmark:category:update', {
        id: category.id,
        updates: {
          name: formData.get('name'),
          color: formData.get('color')
        }
      });
      
      document.body.removeChild(dialog);
    });

    dialog.querySelector('.cancel-dialog-btn').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });

    // Focus on name input
    setTimeout(() => {
      dialog.querySelector('input[name="name"]').focus();
    }, 100);
  }

  t(key, params = {}) {
    if (window.app && window.app.services && window.app.services.i18n) {
      return window.app.services.i18n.translate(key, params);
    }
    return key;
  }

  show() {
    this.isVisible = true;
    this.classList.remove('hidden');
    this.switchView('list');
  }

  hide() {
    this.isVisible = false;
    this.classList.add('hidden');
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Register the custom element
customElements.define('bookmark-panel', BookmarkPanel);