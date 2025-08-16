/**
 * WorkerManager - Web Worker管理サービス
 */

import { EventBus } from '../utils/EventBus.js';
import { Logger } from '../utils/Logger.js';

export class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.taskQueue = [];
    this.activeTasks = new Map();
    this.taskIdCounter = 0;
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    this.workerPool = [];
    
    this.setupEventListeners();
    this.initializeWorkerPool();
  }

  setupEventListeners() {
    EventBus.on('worker:execute', (data) => {
      this.executeTask(data.type, data.data, data.callback);
    });

    EventBus.on('worker:terminate', (data) => {
      this.terminateWorker(data.workerId);
    });

    EventBus.on('worker:terminateAll', () => {
      this.terminateAllWorkers();
    });
  }

  initializeWorkerPool() {
    // Create a pool of workers for better performance
    for (let i = 0; i < Math.min(this.maxWorkers, 2); i++) {
      this.createWorker();
    }
    
    Logger.info('Worker pool initialized', { 
      poolSize: this.workerPool.length,
      maxWorkers: this.maxWorkers 
    });
  }

  createWorker() {
    try {
      const worker = new Worker(new URL('../workers/DataProcessorWorker.js', import.meta.url), {
        type: 'module'
      });
      
      const workerId = `worker_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const workerInfo = {
        id: workerId,
        worker: worker,
        busy: false,
        createdAt: Date.now(),
        taskCount: 0
      };

      worker.onmessage = (e) => {
        this.handleWorkerMessage(workerId, e.data);
      };

      worker.onerror = (error) => {
        this.handleWorkerError(workerId, error);
      };

      worker.onmessageerror = (error) => {
        this.handleWorkerMessageError(workerId, error);
      };

      this.workers.set(workerId, workerInfo);
      this.workerPool.push(workerId);

      Logger.debug('Worker created', { workerId });
      return workerId;
    } catch (error) {
      Logger.error('Failed to create worker', { error: error.message });
      return null;
    }
  }

  handleWorkerMessage(workerId, data) {
    const { type, id, result, error, progress } = data;
    
    switch (type) {
      case 'READY':
        Logger.debug('Worker ready', { workerId });
        break;
        
      case 'SUCCESS':
        this.handleTaskSuccess(workerId, id, result);
        break;
        
      case 'ERROR':
        this.handleTaskError(workerId, id, error);
        break;
        
      case 'PROGRESS':
        this.handleTaskProgress(workerId, id, progress);
        break;
        
      default:
        Logger.warn('Unknown worker message type', { workerId, type });
    }
  }

  handleWorkerError(workerId, error) {
    Logger.error('Worker error', { workerId, error: error.message });
    
    // Mark worker as failed and remove from pool
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.failed = true;
      this.removeWorkerFromPool(workerId);
    }

    // Notify about worker failure
    EventBus.emit('worker:error', { workerId, error });
  }

  handleWorkerMessageError(workerId, error) {
    Logger.error('Worker message error', { workerId, error });
    this.handleWorkerError(workerId, error);
  }

  handleTaskSuccess(workerId, taskId, result) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      Logger.warn('Task not found for success', { workerId, taskId });
      return;
    }

    // Mark worker as available
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.busy = false;
      workerInfo.taskCount++;
    }

    // Execute callback
    if (task.callback) {
      try {
        task.callback(null, result);
      } catch (error) {
        Logger.error('Task callback error', { taskId, error: error.message });
      }
    }

    // Clean up
    this.activeTasks.delete(taskId);
    
    // Process next task in queue
    this.processQueue();

    Logger.debug('Task completed successfully', { workerId, taskId });
  }

  handleTaskError(workerId, taskId, error) {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      Logger.warn('Task not found for error', { workerId, taskId });
      return;
    }

    // Mark worker as available
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.busy = false;
    }

    // Execute callback with error
    if (task.callback) {
      try {
        task.callback(new Error(error.message), null);
      } catch (callbackError) {
        Logger.error('Task error callback error', { taskId, error: callbackError.message });
      }
    }

    // Clean up
    this.activeTasks.delete(taskId);
    
    // Process next task in queue
    this.processQueue();

    Logger.error('Task failed', { workerId, taskId, error: error.message });
  }

  handleTaskProgress(workerId, taskId, progress) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    // Emit progress event
    EventBus.emit('worker:progress', {
      taskId,
      workerId,
      progress
    });

    Logger.debug('Task progress', { workerId, taskId, progress });
  }

  executeTask(type, data, callback) {
    const taskId = this.generateTaskId();
    const task = {
      id: taskId,
      type,
      data: {
        ...data,
        startTime: Date.now()
      },
      callback,
      createdAt: Date.now()
    };

    // Try to execute immediately if worker is available
    const availableWorkerId = this.getAvailableWorker();
    if (availableWorkerId) {
      this.executeTaskOnWorker(availableWorkerId, task);
    } else {
      // Add to queue
      this.taskQueue.push(task);
      Logger.debug('Task queued', { taskId, type, queueLength: this.taskQueue.length });
    }

    return taskId;
  }

  executeTaskOnWorker(workerId, task) {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo || workerInfo.busy || workerInfo.failed) {
      // Worker not available, add task back to queue
      this.taskQueue.unshift(task);
      return false;
    }

    // Mark worker as busy
    workerInfo.busy = true;
    
    // Add to active tasks
    this.activeTasks.set(task.id, task);

    // Send task to worker
    try {
      workerInfo.worker.postMessage({
        type: task.type,
        data: task.data,
        id: task.id
      });

      Logger.debug('Task sent to worker', { 
        workerId, 
        taskId: task.id, 
        type: task.type 
      });
      
      return true;
    } catch (error) {
      Logger.error('Failed to send task to worker', { 
        workerId, 
        taskId: task.id, 
        error: error.message 
      });
      
      // Clean up
      workerInfo.busy = false;
      this.activeTasks.delete(task.id);
      
      // Execute callback with error
      if (task.callback) {
        task.callback(error, null);
      }
      
      return false;
    }
  }

  getAvailableWorker() {
    // Find an available worker
    for (const workerId of this.workerPool) {
      const workerInfo = this.workers.get(workerId);
      if (workerInfo && !workerInfo.busy && !workerInfo.failed) {
        return workerId;
      }
    }

    // If no available worker and we can create more
    if (this.workerPool.length < this.maxWorkers) {
      const newWorkerId = this.createWorker();
      if (newWorkerId) {
        return newWorkerId;
      }
    }

    return null;
  }

  processQueue() {
    if (this.taskQueue.length === 0) return;

    const availableWorkerId = this.getAvailableWorker();
    if (availableWorkerId) {
      const task = this.taskQueue.shift();
      this.executeTaskOnWorker(availableWorkerId, task);
      
      // Process more tasks if available
      if (this.taskQueue.length > 0) {
        setTimeout(() => this.processQueue(), 0);
      }
    }
  }

  terminateWorker(workerId) {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) {
      Logger.warn('Worker not found for termination', { workerId });
      return false;
    }

    try {
      workerInfo.worker.terminate();
      this.workers.delete(workerId);
      this.removeWorkerFromPool(workerId);
      
      Logger.info('Worker terminated', { workerId });
      return true;
    } catch (error) {
      Logger.error('Failed to terminate worker', { workerId, error: error.message });
      return false;
    }
  }

  terminateAllWorkers() {
    const workerIds = Array.from(this.workers.keys());
    let terminatedCount = 0;

    workerIds.forEach(workerId => {
      if (this.terminateWorker(workerId)) {
        terminatedCount++;
      }
    });

    // Clear queues
    this.taskQueue.length = 0;
    this.activeTasks.clear();
    this.workerPool.length = 0;

    Logger.info('All workers terminated', { terminatedCount });
    return terminatedCount;
  }

  removeWorkerFromPool(workerId) {
    const index = this.workerPool.indexOf(workerId);
    if (index > -1) {
      this.workerPool.splice(index, 1);
    }
  }

  generateTaskId() {
    return `task_${++this.taskIdCounter}_${Date.now()}`;
  }

  // Public API methods
  processSearchResults(results, query, filters, callback) {
    return this.executeTask('PROCESS_SEARCH_RESULTS', {
      results,
      query,
      filters
    }, callback);
  }

  calculateDistance(point1, point2, callback) {
    return this.executeTask('CALCULATE_DISTANCE', {
      point1,
      point2
    }, callback);
  }

  calculateArea(coordinates, callback) {
    return this.executeTask('CALCULATE_AREA', {
      coordinates
    }, callback);
  }

  processRouteData(route, options, callback) {
    return this.executeTask('PROCESS_ROUTE_DATA', {
      route,
      options
    }, callback);
  }

  optimizeBookmarks(bookmarks, callback) {
    return this.executeTask('OPTIMIZE_BOOKMARKS', {
      bookmarks
    }, callback);
  }

  generateStatistics(items, type, callback) {
    return this.executeTask('GENERATE_STATISTICS', {
      items,
      type
    }, callback);
  }

  compressData(data, callback) {
    return this.executeTask('COMPRESS_DATA', data, callback);
  }

  decompressData(data, callback) {
    return this.executeTask('DECOMPRESS_DATA', data, callback);
  }

  // Status and monitoring
  getStatus() {
    const workers = Array.from(this.workers.values()).map(worker => ({
      id: worker.id,
      busy: worker.busy,
      failed: worker.failed || false,
      taskCount: worker.taskCount,
      uptime: Date.now() - worker.createdAt
    }));

    return {
      totalWorkers: this.workers.size,
      availableWorkers: workers.filter(w => !w.busy && !w.failed).length,
      busyWorkers: workers.filter(w => w.busy).length,
      failedWorkers: workers.filter(w => w.failed).length,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      workers
    };
  }

  getMetrics() {
    const status = this.getStatus();
    const totalTasks = status.workers.reduce((sum, worker) => sum + worker.taskCount, 0);
    const avgTasksPerWorker = status.totalWorkers > 0 ? totalTasks / status.totalWorkers : 0;

    return {
      ...status,
      totalTasksProcessed: totalTasks,
      averageTasksPerWorker: Math.round(avgTasksPerWorker),
      workerUtilization: status.totalWorkers > 0 ? 
        (status.busyWorkers / status.totalWorkers) * 100 : 0
    };
  }

  // Cleanup
  destroy() {
    this.terminateAllWorkers();
    Logger.info('WorkerManager destroyed');
  }
}