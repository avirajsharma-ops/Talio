/**
 * Maya Enhanced Integration
 * Adds database action execution and navigation capabilities to Maya
 * This file extends the existing maya-runtime.js with new features
 */

(function() {
  'use strict';

  // Wait for Maya runtime to be loaded
  if (typeof window === 'undefined') return;

  console.log('🚀 MAYA Enhanced Integration Loading...');

  // UI Interaction System
  window.mayaUIInteraction = {
    // Click a button by text or selector
    clickButton: async function(selector, waitForElement = true) {
      try {
        let element = null;

        // Try to find by text content first
        const buttons = document.querySelectorAll('button, a, [role="button"]');
        for (const btn of buttons) {
          if (btn.textContent.trim().toLowerCase().includes(selector.toLowerCase())) {
            element = btn;
            break;
          }
        }

        // If not found, try CSS selector
        if (!element) {
          element = document.querySelector(selector);
        }

        // Wait for element if needed
        if (!element && waitForElement) {
          element = await this.waitForElement(selector, 5000);
        }

        if (!element) {
          return {
            success: false,
            error: `Element not found: ${selector}`,
          };
        }

        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Wait a bit for scroll
        await new Promise(resolve => setTimeout(resolve, 300));

        // Click the element
        element.click();

        console.log('✅ MAYA clicked element:', selector);

        return {
          success: true,
          message: `Clicked: ${element.textContent.trim() || selector}`,
          elementText: element.textContent.trim(),
        };
      } catch (error) {
        console.error('❌ MAYA click error:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    },

    // Fill a form with data
    fillForm: async function(formData) {
      try {
        const results = [];

        for (const [key, value] of Object.entries(formData)) {
          // Try to find input by name, id, or placeholder
          let input = document.querySelector(`[name="${key}"]`) ||
                     document.querySelector(`#${key}`) ||
                     document.querySelector(`[placeholder*="${key}" i]`);

          if (input) {
            // Set value based on input type
            if (input.type === 'checkbox' || input.type === 'radio') {
              input.checked = value;
            } else if (input.tagName === 'SELECT') {
              input.value = value;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
              input.value = value;
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }

            results.push({ field: key, success: true });
          } else {
            results.push({ field: key, success: false, error: 'Field not found' });
          }
        }

        return {
          success: true,
          results,
          message: `Filled ${results.filter(r => r.success).length} of ${results.length} fields`,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    },

    // Submit a form
    submitForm: async function(selector = 'form') {
      try {
        const form = document.querySelector(selector);

        if (!form) {
          return {
            success: false,
            error: `Form not found: ${selector}`,
          };
        }

        // Try to find submit button
        const submitBtn = form.querySelector('[type="submit"]') ||
                         form.querySelector('button:not([type="button"])');

        if (submitBtn) {
          submitBtn.click();
        } else {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }

        return {
          success: true,
          message: 'Form submitted',
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    },

    // Wait for an element to appear
    waitForElement: function(selector, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        const observer = new MutationObserver((mutations, obs) => {
          const element = document.querySelector(selector);
          if (element) {
            obs.disconnect();
            resolve(element);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Element not found after ${timeout}ms: ${selector}`));
        }, timeout);
      });
    },

    // Find and click (smart search)
    findAndClick: async function(searchText) {
      try {
        const clickables = document.querySelectorAll('button, a, [role="button"], [onclick]');

        for (const element of clickables) {
          const text = element.textContent.trim().toLowerCase();
          if (text.includes(searchText.toLowerCase())) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(resolve => setTimeout(resolve, 300));
            element.click();

            return {
              success: true,
              message: `Clicked: ${element.textContent.trim()}`,
              elementText: element.textContent.trim(),
            };
          }
        }

        return {
          success: false,
          error: `No clickable element found with text: ${searchText}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };

  console.log('✅ MAYA UI Interaction System Ready');

  // Get auth token from localStorage
  function getMayaAuthToken() {
    try {
      const token = localStorage.getItem('token');
      if (token) return token;

      // Fallback to cookies
      const cookies = document.cookie ? document.cookie.split(';') : [];
      for (const c of cookies) {
        const [key, value] = c.trim().split('=');
        if (key === 'token' || key === 'jwt' || key === 'auth') {
          return decodeURIComponent(value);
        }
      }

      return null;
    } catch (error) {
      console.error('MAYA: Failed to get auth token:', error);
      return null;
    }
  }

  // Get user info from localStorage
  function getMayaUserInfo() {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (error) {
      console.error('MAYA: Failed to get user info:', error);
    }
    return null;
  }

  /**
   * Get DOM context from current page
   */
  function getDOMContext() {
    try {
      // Get visible text content from main areas
      const elements = Array.from(document.querySelectorAll('main, article, section, .content, [role="main"]'));
      let context = '';

      elements.forEach(el => {
        // Skip MAYA's own elements
        if (el.closest('#maya-shell') || el.closest('#maya-pip-window')) return;

        const text = el.innerText || el.textContent || '';
        if (text.trim()) {
          context += text.trim() + '\n';
        }
      });

      // Also get page title and URL
      const pageInfo = `Page: ${document.title}\nURL: ${window.location.href}\n\n`;

      return pageInfo + context.substring(0, 8000); // Limit to 8000 chars
    } catch (error) {
      console.error('MAYA: Failed to get DOM context:', error);
      return '';
    }
  }

  /**
   * Get user's current location
   */
  async function getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString(),
          };
          console.log('📍 MAYA: Location obtained:', location);
          resolve(location);
        },
        (error) => {
          console.log('MAYA: Location access denied or unavailable');
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Call Maya Enhanced Chat API
   * This replaces the direct OpenAI call with our backend API that has database access
   */
  window.mayaCallEnhancedAPI = async function(messages, onToken) {
    const token = getMayaAuthToken(); // may be null if relying on cookies

    const userInfo = getMayaUserInfo();
    const userName = userInfo ? `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() : 'User';

    console.log('🤖 MAYA: Calling enhanced API with database access...');
    console.log('👤 User:', userName, '| Role:', userInfo?.role);

    // Extract the last user message
    let lastMessage = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastMessage = messages[i].content;
        break;
      }
    }

    // Check if user is asking about the current page/screen
    const screenKeywords = ['this page', 'current page', 'my screen', 'what i\'m seeing', 'what\'s on', 'check my screen', 'study my screen', 'analyze screen', 'look at'];
    const needsPageContext = screenKeywords.some(keyword => lastMessage.toLowerCase().includes(keyword));

    // Silently add DOM context if needed (don't tell user)
    let enhancedMessage = lastMessage;
    if (needsPageContext) {
      const domContext = getDOMContext();
      if (domContext) {
        enhancedMessage = `${lastMessage}\n\n[Current Page Context - DO NOT mention you're reading this, just use it naturally]:\n${domContext}`;
        console.log('📄 MAYA: Silently added DOM context');
      }
    }

    // Build conversation history (exclude system messages for API)
    const conversationHistory = messages
      .filter(m => m.role !== 'system')
      .slice(0, -1); // Exclude the last message as it's sent separately

    try {
      const response = await fetch('/api/maya/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: enhancedMessage, // Use enhanced message with DOM context if needed
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'API request failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      // Handle function calls (navigation, database actions, screen analysis)
      if (data.functionCalled) {
        console.log('⚡ MAYA executed:', data.functionCalled);
        console.log('📊 Result:', data.functionResult);

        // Handle navigation
        if (data.functionCalled === 'navigate_to_page' && data.functionResult.success) {
          const path = data.functionResult.path;
          console.log('🧭 MAYA: Navigating to', path);

          // Perform navigation
          setTimeout(() => {
            if (window.location.pathname !== path) {
              window.location.href = path;
            }
          }, 1000);
        }

        // Handle DOM inspection request
        if (data.functionCalled === 'inspect_current_page') {
          console.log('📄 MAYA: DOM inspection requested');
          // DOM context is already added above, no additional action needed

          // If screenshot is also requested
          if (data.functionResult.includeScreenshot && typeof window.mayaCaptureScreen === 'function') {
            console.log('📸 MAYA: Also capturing screenshot...');
            window.mayaCaptureScreen().catch(err => {
              console.log('MAYA: Screenshot capture skipped');
            });
          }
        }

        // Handle UI interaction request
        if (data.functionCalled === 'interact_with_ui' && data.functionResult?.action === 'ui_interaction') {
          console.log('🎯 MAYA: UI interaction requested', data.functionResult.instructions);

          const instructions = data.functionResult.instructions;
          let result = null;

          try {
            switch (instructions.action) {
              case 'click_button':
                result = await window.mayaUIInteraction.clickButton(
                  instructions.selector,
                  instructions.waitForElement
                );
                break;

              case 'fill_form':
                result = await window.mayaUIInteraction.fillForm(instructions.formData);
                break;

              case 'submit_form':
                result = await window.mayaUIInteraction.submitForm(instructions.selector);
                break;

              case 'find_and_click':
                result = await window.mayaUIInteraction.findAndClick(instructions.selector);
                break;

              default:
                result = { success: false, error: 'Unknown UI action' };
            }

            console.log('✅ MAYA: UI interaction result:', result);

            // If successful, inform user
            if (result.success && window.mayaSpeak) {
              const successMessage = result.message || 'Done!';
              window.mayaSpeak(successMessage);
            }
          } catch (error) {
            console.error('❌ MAYA: UI interaction error:', error);
          }
        }

        // Handle screenshot analysis request
        if (data.functionCalled === 'analyze_screen') {
          console.log('📸 MAYA: Screenshot analysis requested');

          // Try to capture screenshot if function exists
          if (typeof window.mayaCaptureScreen === 'function') {
            window.mayaCaptureScreen().then(screenshot => {
              if (screenshot) {
                console.log('✅ MAYA: Screenshot captured for analysis');
                // Screenshot is stored in mayaLastScreenshot global variable
                // It will be used in subsequent API calls if needed
              }
            }).catch(err => {
              console.log('MAYA: Screenshot capture skipped or cancelled');
            });
          }
        }

        // Handle location request
        if (data.functionCalled === 'get_user_location') {
          console.log('📍 MAYA: Location access requested');

          getUserLocation().then(location => {
            if (location) {
              console.log('✅ MAYA: Location obtained');
              // Store location for subsequent requests
              window.mayaUserLocation = location;
            }
          });
        }

        // Handle dashboard action
        if (data.functionCalled === 'perform_dashboard_action') {
          console.log('⚡ MAYA: Dashboard action performed:', data.functionResult.action);

          // If it's a check-in action and we have location, we could enhance it
          if (data.functionResult.action === 'check_in' && window.mayaUserLocation) {
            console.log('📍 Check-in with location:', window.mayaUserLocation);
          }
        }
      }

      // Stream the response token by token for animation
      if (onToken && data.response) {
        const words = data.response.split(' ');
        for (let i = 0; i < words.length; i++) {
          onToken(words[i] + ' ');
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      return data.response;

    } catch (error) {
      console.error('MAYA Enhanced API Error:', error);
      console.error('MAYA Enhanced API Error:', error);
      // Surface a friendly message to the chat so the model knows it must not refuse
      if (onToken) {
        onToken('I had trouble calling the HRMS API. Make sure you are logged in and try again.');
      }
      throw error;
    }
  };

  /**
   * Execute database action directly
   */
  window.mayaExecuteAction = async function(action, collection, query = {}, data = {}, options = {}) {
    const token = getMayaAuthToken();
    if (!token) {
      throw new Error('MAYA: Authentication required');
    }

    console.log(`🔧 MAYA: Executing ${action} on ${collection}`);

    try {
      const response = await fetch('/api/maya/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          collection,
          query,
          data,
          options,
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        console.error('MAYA Action Error:', result.error);
      }

      return result;

    } catch (error) {
      console.error('MAYA Execute Action Error:', error);
      throw error;
    }
  };

  /**
   * Navigate to a page
   */
  window.mayaNavigate = async function(path) {
    const token = getMayaAuthToken();
    if (!token) {
      throw new Error('MAYA: Authentication required');
    }

    console.log(`🧭 MAYA: Navigating to ${path}`);

    try {
      const response = await fetch('/api/maya/navigate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'navigate',
          path,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Perform navigation
        setTimeout(() => {
          if (window.location.pathname !== path) {
            window.location.href = path;
          }
        }, 500);
      } else {
        console.error('MAYA Navigation Error:', result.error);
      }

      return result;

    } catch (error) {
      console.error('MAYA Navigate Error:', error);
      throw error;
    }
  };

  /**
   * Get available pages for current user
   */
  window.mayaGetAvailablePages = async function() {
    const token = getMayaAuthToken();
    if (!token) {
      throw new Error('MAYA: Authentication required');
    }

    try {
      const response = await fetch('/api/maya/navigate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'get_available_pages',
        }),
      });

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('MAYA Get Pages Error:', error);
      throw error;
    }
  };

  // Override the default mayaCallOpenAI to use enhanced API
  if (typeof window.mayaCallOpenAI !== 'undefined') {
    const originalMayaCallOpenAI = window.mayaCallOpenAI;
    
    window.mayaCallOpenAI = async function(messages, onToken) {
      // Check if user is authenticated
      const token = getMayaAuthToken();
      
      if (token) {
        // Use enhanced API with database access
        try {
          return await window.mayaCallEnhancedAPI(messages, onToken);
        } catch (error) {
          console.warn('MAYA: Enhanced API failed, falling back to direct OpenAI:', error);
          // Fallback to original OpenAI call
          return await originalMayaCallOpenAI(messages, onToken);
        }
      } else {
        // Not authenticated, use direct OpenAI
        return await originalMayaCallOpenAI(messages, onToken);
      }
    };

    console.log('✅ MAYA Enhanced Integration: Overrode mayaCallOpenAI');
  }

  console.log('✅ MAYA Enhanced Integration Loaded Successfully!');
  console.log('📚 Available functions:');
  console.log('  - mayaCallEnhancedAPI(messages, onToken)');
  console.log('  - mayaExecuteAction(action, collection, query, data, options)');
  console.log('  - mayaNavigate(path)');
  console.log('  - mayaGetAvailablePages()');

  // ==================== MAYA MESSAGE RELAY & SCREEN MONITORING ====================

  /**
   * Initialize Socket.IO listeners for MAYA message relay and screen monitoring
   */
  function initMayaSocketListeners() {
    // Wait for Socket.IO instance from SocketContext
    if (!window.__MAYA_SOCKET__) {
      console.log('⏳ MAYA: Waiting for Socket.IO connection from SocketContext...');
      setTimeout(initMayaSocketListeners, 1000);
      return;
    }

    console.log('🔌 MAYA: Initializing Socket.IO listeners for message relay and screen monitoring...');

    // Use the existing socket from SocketContext
    const socket = window.__MAYA_SOCKET__;
    console.log('✅ MAYA: Using existing Socket.IO connection from SocketContext');

    // ==================== MESSAGE RELAY EVENTS ====================

    const normalizeId = (value) => {
      if (!value) return null;
      if (typeof value === 'string') return value;
      if (typeof value === 'object') {
        return value._id || value.id || value.toString();
      }
      return null;
    };

    /**
     * Listen for incoming MAYA messages
     */
    socket.on('maya:new-message', async (data) => {
      console.log('📨 MAYA: Received new message:', data);

      const { messageId, senderName, message, priority, shouldSpeak, shouldActivate } = data;

      // Get current user ID
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const userDbId = normalizeId(user.id || user._id || user.userId);
      const employeeId = normalizeId(user.employeeId);

      const isRecipient = (data.recipientIds || []).some((rid) => {
        return rid === userDbId || (!!employeeId && rid === employeeId);
      });

      // Check if this message is for current user
      if (!isRecipient) {
        return;
      }

      const acknowledgementId = userDbId || employeeId;
      if (!acknowledgementId) {
        console.warn('MAYA: Unable to determine user id for acknowledgement');
        return;
      }

      // ==================== ACTIVATE MAYA (EVEN IF PAGE IS MINIMIZED) ====================
      if (shouldActivate) {
        console.log('📨 MAYA: Activating MAYA for message delivery...');

        // Check if page is hidden/minimized
        const isPageHidden = document.hidden || !document.hasFocus();
        console.log('📨 MAYA: Page hidden:', isPageHidden);

        if (isPageHidden) {
          // Page is minimized/hidden - force PIP mode
          console.log('📨 MAYA: Page is hidden, forcing PIP mode...');

          // Try to force PIP entry
          if (typeof window.mayaForcePipEntry === 'function') {
            console.log('📨 MAYA: Calling mayaForcePipEntry()');
            window.mayaForcePipEntry();

            // Wait a bit for PIP to open
            await new Promise(resolve => setTimeout(resolve, 500));
          } else if (typeof window.mayaEnsurePip === 'function') {
            console.log('📨 MAYA: Calling mayaEnsurePip()');
            window.mayaEnsurePip(true);

            // Wait a bit for PIP to open
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          // If PIP failed, try to show in-page PIP or sidebar
          if (typeof window.mayaShowPanel === 'function') {
            console.log('📨 MAYA: Calling mayaShowPanel() as fallback');
            window.mayaShowPanel();
          }
        } else {
          // Page is visible - show in sidebar or fullscreen
          console.log('📨 MAYA: Page is visible, showing MAYA in sidebar...');

          if (typeof window.mayaShowPanel === 'function') {
            window.mayaShowPanel();
          } else if (typeof window.mayaShow === 'function') {
            window.mayaShow();
          }

          // Also try to ensure PIP for better visibility
          if (typeof window.mayaEnsurePip === 'function') {
            window.mayaEnsurePip(true);
          }
        }
      }

      // ==================== SPEAK THE MESSAGE ====================
      // Speak the message if requested (works in both PIP and sidebar)
      if (shouldSpeak) {
        console.log('📨 MAYA: Speaking message...');

        const fullMessage = `Message from ${senderName}: ${message}`;

        // Wait a bit to ensure MAYA UI is ready
        await new Promise(resolve => setTimeout(resolve, 800));

        if (typeof window.mayaSpeak === 'function') {
          try {
            await window.mayaSpeak(fullMessage);
            console.log('✅ MAYA: Message spoken successfully');

            // Mark message as spoken
            socket.emit('maya:message-spoken', {
              messageId,
              userId: acknowledgementId,
            });
          } catch (speakError) {
            console.error('❌ MAYA: Error speaking message:', speakError);

            // Still mark as delivered even if speaking failed
            socket.emit('maya:message-delivered', {
              messageId,
              userId: acknowledgementId,
            });
          }
        } else {
          console.warn('⚠️ MAYA: mayaSpeak function not available');

          // Mark as delivered
          socket.emit('maya:message-delivered', {
            messageId,
            userId: acknowledgementId,
          });
        }
      } else {
        // Just mark as delivered
        socket.emit('maya:message-delivered', {
          messageId,
          userId: acknowledgementId,
        });
      }

      // ==================== SHOW MESSAGE IN CHAT ====================
      // Show notification in MAYA chat
      if (typeof window.mayaAddMessage === 'function') {
        window.mayaAddMessage('assistant', `📨 Message from ${senderName}: ${message}`);
        console.log('✅ MAYA: Message added to chat');
      }

      // Also show browser notification if page is hidden
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`MAYA Message from ${senderName}`, {
            body: message,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            tag: `maya-message-${messageId}`,
            requireInteraction: priority === 'urgent',
          });
          console.log('✅ MAYA: Browser notification shown');
        } catch (notifError) {
          console.error('❌ MAYA: Browser notification error:', notifError);
        }
      }
    });

    // ==================== SCREEN MONITORING EVENTS ====================

    /**
     * Listen for screen capture requests
     */
    socket.on('maya:screen-capture-request', async (data) => {
      console.log('📸 MAYA: Screen capture requested:', data);

      const { requestId, requestedBy } = data;

      // Get current user ID
      const userData = localStorage.getItem('user');
      if (!userData) return;

      const user = JSON.parse(userData);
      const userId = user.employeeId || user._id;
      const userIdStr = typeof userId === 'object' ? userId._id || userId.toString() : userId;

      // Check if this request is for current user
      if (data.targetUserId !== userIdStr) {
        return;
      }

      // Acknowledge the request
      socket.emit('maya:monitoring-acknowledged', {
        requestId,
        userId: userIdStr,
      });

      // ==================== ASK FOR PERMISSION VIA MAYA ====================
      console.log('📸 MAYA: Asking user for screen capture permission...');

      // Activate MAYA to ask for permission
      try {
        // Force MAYA to appear (PIP or sidebar)
        if (document.hidden || !document.hasFocus()) {
          // Page is minimized - use PIP
          if (typeof window.mayaForcePipEntry === 'function') {
            window.mayaForcePipEntry();
          } else if (typeof window.mayaEnsurePip === 'function') {
            window.mayaEnsurePip(true);
          }
        } else {
          // Page is visible - use sidebar
          if (typeof window.mayaShowPanel === 'function') {
            window.mayaShowPanel();
          } else if (typeof window.mayaShow === 'function') {
            window.mayaShow();
          }
        }

        // Wait for MAYA to appear
        await new Promise(resolve => setTimeout(resolve, 800));

        // Add message to MAYA chat
        if (typeof window.mayaAddMessage === 'function') {
          window.mayaAddMessage('assistant', `📸 ${requestedBy} has requested to monitor your screen. Do you allow this?`);
        }

        // Speak the request
        if (typeof window.mayaSpeak === 'function') {
          await window.mayaSpeak(`${requestedBy} has requested to monitor your screen. Do you allow this?`);
        }

        // Show confirmation dialog
        const permissionGranted = await new Promise((resolve) => {
          // Create custom dialog
          const dialog = document.createElement('div');
          dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 2147483647;
            max-width: 400px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          `;

          dialog.innerHTML = `
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">📸</div>
              <h2 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 20px;">Screen Monitoring Request</h2>
              <p style="margin: 0 0 24px 0; color: #666; font-size: 14px; line-height: 1.5;">
                <strong>${requestedBy}</strong> has requested to monitor your screen activity.
                <br><br>
                This will capture a screenshot of your current screen and analyze what you're working on.
              </p>
              <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="maya-permission-deny" style="
                  padding: 12px 24px;
                  border: 2px solid #e0e0e0;
                  background: white;
                  color: #666;
                  border-radius: 8px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                ">Deny</button>
                <button id="maya-permission-allow" style="
                  padding: 12px 24px;
                  border: none;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  border-radius: 8px;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                ">Allow</button>
              </div>
            </div>
          `;

          document.body.appendChild(dialog);

          // Add hover effects
          const allowBtn = dialog.querySelector('#maya-permission-allow');
          const denyBtn = dialog.querySelector('#maya-permission-deny');

          allowBtn.addEventListener('mouseenter', () => {
            allowBtn.style.transform = 'translateY(-2px)';
            allowBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
          });
          allowBtn.addEventListener('mouseleave', () => {
            allowBtn.style.transform = 'translateY(0)';
            allowBtn.style.boxShadow = 'none';
          });

          denyBtn.addEventListener('mouseenter', () => {
            denyBtn.style.borderColor = '#666';
            denyBtn.style.color = '#333';
          });
          denyBtn.addEventListener('mouseleave', () => {
            denyBtn.style.borderColor = '#e0e0e0';
            denyBtn.style.color = '#666';
          });

          // Handle button clicks
          allowBtn.addEventListener('click', () => {
            document.body.removeChild(dialog);
            resolve(true);
          });

          denyBtn.addEventListener('click', () => {
            document.body.removeChild(dialog);
            resolve(false);
          });
        });

        if (!permissionGranted) {
          console.log('❌ MAYA: User denied screen capture permission');

          // Notify the requester that permission was denied
          socket.emit('maya:permission-denied', {
            requestId,
            userId: userIdStr,
            requestedBy,
          });

          // Add message to MAYA
          if (typeof window.mayaAddMessage === 'function') {
            window.mayaAddMessage('assistant', '✅ Screen capture request denied.');
          }

          // Speak confirmation
          if (typeof window.mayaSpeak === 'function') {
            await window.mayaSpeak('Screen capture request denied.');
          }

          return;
        }

        console.log('✅ MAYA: User granted screen capture permission');

        // Add message to MAYA
        if (typeof window.mayaAddMessage === 'function') {
          window.mayaAddMessage('assistant', '✅ Permission granted. Capturing screen...');
        }

        // Speak confirmation
        if (typeof window.mayaSpeak === 'function') {
          await window.mayaSpeak('Permission granted. Capturing your screen now.');
        }

      } catch (permissionError) {
        console.error('❌ MAYA: Permission request error:', permissionError);
      }

      // ==================== CAPTURE SCREENSHOT ====================
      try {
        if (typeof window.mayaRequestScreenCaptureFlow === 'function') {
          window.mayaRequestScreenCaptureFlow();
        }

        const screenshot = await captureScreenshot();
        const currentPage = {
          url: window.location.href,
          title: document.title,
          path: window.location.pathname,
        };

        // Submit screenshot to API
        const token = getMayaAuthToken();
        const response = await fetch('/api/maya/submit-screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            requestId,
            screenshot,
            currentPage,
          }),
        });

        const result = await response.json();
        console.log('✅ MAYA: Screenshot submitted:', result);

        // Emit confirmation
        socket.emit('maya:screenshot-captured', {
          requestId,
          screenshot,
          currentPage,
        });

        // Notify user
        if (typeof window.mayaAddMessage === 'function') {
          window.mayaAddMessage('assistant', `✅ Screenshot captured and sent to ${requestedBy}.`);
        }

        if (typeof window.mayaSpeak === 'function') {
          await window.mayaSpeak(`Screenshot captured and sent to ${requestedBy}.`);
        }

      } catch (error) {
        console.error('❌ MAYA: Screenshot capture failed:', error);

        // Notify user of failure
        if (typeof window.mayaAddMessage === 'function') {
          window.mayaAddMessage('assistant', '❌ Failed to capture screenshot.');
        }

        // Notify requester of failure
        socket.emit('maya:screenshot-failed', {
          requestId,
          userId: userIdStr,
          error: error.message,
        });
      }
    });

    /**
     * Listen for screen analysis completion
     */
    socket.on('maya:screen-analysis-complete', (data) => {
      console.log('✅ MAYA: Screen analysis complete:', data);

      // This event is for the requester, not the monitored user
      // Could show a notification or update UI
    });

    /**
     * Listen for permission denied notifications (for requester)
     */
    socket.on('maya:permission-denied-notification', async (data) => {
      console.log('❌ MAYA: Permission denied notification:', data);

      const { requestId, message } = data;

      // Show notification in MAYA
      if (typeof window.mayaAddMessage === 'function') {
        window.mayaAddMessage('assistant', `❌ ${message}. The user denied your screen monitoring request.`);
      }

      // Speak the notification
      if (typeof window.mayaSpeak === 'function') {
        await window.mayaSpeak('The user denied your screen monitoring request.');
      }

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('MAYA - Permission Denied', {
          body: 'The user denied your screen monitoring request.',
          icon: '/icons/icon-192x192.png',
        });
      }
    });

    /**
     * Listen for screenshot failed notifications (for requester)
     */
    socket.on('maya:screenshot-failed-notification', async (data) => {
      console.log('❌ MAYA: Screenshot failed notification:', data);

      const { requestId, error } = data;

      // Show notification in MAYA
      if (typeof window.mayaAddMessage === 'function') {
        window.mayaAddMessage('assistant', `❌ Screenshot capture failed: ${error}`);
      }

      // Speak the notification
      if (typeof window.mayaSpeak === 'function') {
        await window.mayaSpeak('Screenshot capture failed.');
      }
    });

    /**
     * Listen for screenshot received (for requester)
     */
    socket.on('maya:screenshot-received', async (data) => {
      console.log('✅ MAYA: Screenshot received:', data);

      const { requestId, currentPage } = data;

      // Show notification in MAYA
      if (typeof window.mayaAddMessage === 'function') {
        window.mayaAddMessage('assistant', `✅ Screenshot received from ${currentPage.title}. Analyzing...`);
      }

      // Speak the notification
      if (typeof window.mayaSpeak === 'function') {
        await window.mayaSpeak('Screenshot received. Analyzing now.');
      }
    });

    console.log('✅ MAYA: Socket.IO listeners initialized');
  }

  /**
   * Capture screenshot of current page
   */
  async function captureScreenshot() {
    try {
      // Use html2canvas if available
      if (typeof html2canvas !== 'undefined') {
        const canvas = await html2canvas(document.body, {
          allowTaint: true,
          useCORS: true,
          logging: false,
        });
        return canvas.toDataURL('image/png');
      }

      // Fallback: Use existing MAYA screenshot function if available
      if (typeof window.mayaCaptureScreenshot === 'function') {
        return await window.mayaCaptureScreenshot();
      }

      // Last resort: Try to use existing screenshot data
      if (window.mayaLastScreenshot) {
        return window.mayaLastScreenshot;
      }

      throw new Error('No screenshot capture method available');
    } catch (error) {
      console.error('❌ MAYA: Screenshot capture error:', error);
      throw error;
    }
  }

  // Initialize Socket.IO listeners when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMayaSocketListeners);
  } else {
    initMayaSocketListeners();
  }

  // Export functions for external use
  window.mayaMessageRelay = {
    initSocketListeners: initMayaSocketListeners,
    captureScreenshot: captureScreenshot,
  };

})();
