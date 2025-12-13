const { desktopCapturer, screen } = require('electron');
const Store = require('electron-store');

const store = new Store();

/**
 * Screenshot Service
 * Captures full screen every minute and uploads when user is clocked in
 */
class ScreenshotService {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl;
    this.clockStatusUrl = options.clockStatusUrl;
    this.getAuthToken = options.getAuthToken || (() => store.get('authToken'));
    this.interval = options.interval || 60000; // Default 1 minute
    this.intervalId = null;
    this.isRunning = false;
    this.isClockedIn = false;
    this.lastClockCheck = 0;
    this.clockCheckInterval = 30000; // Check clock status every 30 seconds
  }

  /**
   * Start the screenshot service
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[ScreenshotService] Starting...');
    
    // Initial clock status check
    this.checkClockStatus();
    
    // Start interval for screenshots
    this.intervalId = setInterval(() => {
      this.captureAndUpload();
    }, this.interval);

    // Start clock status check interval
    this.clockCheckIntervalId = setInterval(() => {
      this.checkClockStatus();
    }, this.clockCheckInterval);
  }

  /**
   * Stop the screenshot service
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('[ScreenshotService] Stopping...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.clockCheckIntervalId) {
      clearInterval(this.clockCheckIntervalId);
      this.clockCheckIntervalId = null;
    }
  }

  /**
   * Check if user is clocked in
   */
  async checkClockStatus() {
    const token = this.getAuthToken();
    
    if (!token) {
      this.isClockedIn = false;
      console.log('[ScreenshotService] No auth token, not clocked in');
      return false;
    }

    try {
      const response = await fetch(this.clockStatusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        this.isClockedIn = false;
        return false;
      }

      const data = await response.json();
      this.isClockedIn = data.success && data.isClockedIn;
      this.lastClockCheck = Date.now();
      
      console.log(`[ScreenshotService] Clock status: ${this.isClockedIn ? 'Clocked In' : 'Not Clocked In'}`);
      return this.isClockedIn;
    } catch (error) {
      console.error('[ScreenshotService] Failed to check clock status:', error.message);
      this.isClockedIn = false;
      return false;
    }
  }

  /**
   * Capture screenshot and upload if clocked in
   */
  async captureAndUpload() {
    // Check if we have a recent clock status or need to refresh
    if (Date.now() - this.lastClockCheck > this.clockCheckInterval) {
      await this.checkClockStatus();
    }

    // Only capture if clocked in
    if (!this.isClockedIn) {
      console.log('[ScreenshotService] Not clocked in, skipping capture');
      return;
    }

    const token = this.getAuthToken();
    if (!token) {
      console.log('[ScreenshotService] No auth token, skipping capture');
      return;
    }

    try {
      console.log('[ScreenshotService] Capturing screenshot...');
      
      // Get all displays
      const displays = screen.getAllDisplays();
      const primaryDisplay = screen.getPrimaryDisplay();
      
      // Get all screen sources
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: primaryDisplay.workAreaSize.width * primaryDisplay.scaleFactor,
          height: primaryDisplay.workAreaSize.height * primaryDisplay.scaleFactor
        }
      });

      if (sources.length === 0) {
        console.error('[ScreenshotService] No screen sources available');
        return;
      }

      // Capture primary screen
      const primarySource = sources.find(s => s.display_id === primaryDisplay.id.toString()) || sources[0];
      const thumbnail = primarySource.thumbnail;
      
      // Convert to WebP with compression using sharp (if available) or PNG
      let imageBuffer;
      let mimeType = 'image/webp';
      
      try {
        // Try to use sharp for WebP compression
        const sharp = require('sharp');
        const pngBuffer = thumbnail.toPNG();
        
        imageBuffer = await sharp(pngBuffer)
          .webp({ quality: 70, effort: 4 }) // Good balance of quality and compression
          .toBuffer();
        
        console.log(`[ScreenshotService] Compressed to WebP: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
      } catch {
        // Fallback to PNG if sharp is not available
        imageBuffer = thumbnail.toPNG();
        mimeType = 'image/png';
        console.log(`[ScreenshotService] Using PNG: ${(imageBuffer.length / 1024).toFixed(1)}KB`);
      }

      // Upload to server
      await this.uploadScreenshot(imageBuffer, mimeType, token);
      
    } catch (error) {
      console.error('[ScreenshotService] Capture failed:', error.message);
    }
  }

  /**
   * Upload screenshot to server
   */
  async uploadScreenshot(imageBuffer, mimeType, token) {
    try {
      const timestamp = Date.now();
      
      // Convert buffer to base64 for JSON upload
      const base64Data = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          screenshot: base64Data,
          timestamp: timestamp.toString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`[ScreenshotService] Uploaded successfully: ${data.path}`);
      
      return data;
    } catch (error) {
      console.error('[ScreenshotService] Upload failed:', error.message);
      
      // Store failed uploads for retry (optional)
      const failedUploads = store.get('failedUploads', []);
      failedUploads.push({
        timestamp: Date.now(),
        error: error.message
      });
      // Keep only last 10 failed uploads
      store.set('failedUploads', failedUploads.slice(-10));
      
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isClockedIn: this.isClockedIn,
      lastClockCheck: this.lastClockCheck,
      interval: this.interval
    };
  }
}

module.exports = { ScreenshotService };
