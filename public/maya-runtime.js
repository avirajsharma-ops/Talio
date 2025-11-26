// Auto-generated from public/MAYA.html
// Define global variables BEFORE blob animation so they're available
    var mayaSpeaking = false;
    var mayaVisible = false;
    var mayaSidePanel = false;
    var mayaPipActive = false;
    var mayaLastScreenshot = null;
    var mayaLastDOMSnapshot = null;
    var mayaScreenCaptureStream = null;

(function(){
      if (typeof window !== "undefined" && window.__MAYA_DISABLE_BLOB_RUNTIME__) {
        console.log("MAYA: Legacy blob runtime disabled; using React hook implementation");
        return;
      }
      console.log("=== MAYA BLOB INIT START ===");
      console.log("MAYA: Document ready state:", document.readyState);
      var card=document.getElementById("maya-blob-card");
      var canvas=document.getElementById("maya-blob-canvas");
      console.log("MAYA: Card element:", card);
      console.log("MAYA: Canvas element:", canvas);
      if(card){
        console.log("MAYA: Card computed style:", window.getComputedStyle(card).display, window.getComputedStyle(card).visibility, window.getComputedStyle(card).opacity);
        console.log("MAYA: Card dimensions:", card.offsetWidth, card.offsetHeight, card.getBoundingClientRect());
      }
      if(!card||!canvas){
        console.warn("MAYA: Blob elements missing on first pass; deferring init to DOMContentLoaded");
        document.addEventListener("DOMContentLoaded",function(){
          console.log("=== MAYA BLOB INIT ON DOM READY ===");
          var c1=document.getElementById("maya-blob-card");
          var c2=document.getElementById("maya-blob-canvas");
          console.log("MAYA: Card on DOM ready:", c1);
          console.log("MAYA: Canvas on DOM ready:", c2);
          if(c1&&c2){ initBlob(c1, c2); }
        }, { once:true });
        return;
      }
      initBlob(card, canvas);

      function initBlob(card, canvas){
      console.log("=== MAYA BLOB INIT FUNCTION CALLED ===");
      if(!card) card=document.getElementById("maya-blob-card");
      if(!canvas) canvas=document.getElementById("maya-blob-canvas");
      console.log("MAYA: initBlob - card:", card, "canvas:", canvas);
      if(!card || !canvas){
        console.error("MAYA: Cannot initialize blob - missing elements");
        return;
      }
      var ctx=canvas.getContext("2d");
      if(!ctx){
        console.error("MAYA: Cannot get 2d context from canvas");
        return;
      }
      var COLORS=[
        ["#00f5d4","#00e1a5","#4ea1ff"],
        ["#6a5cff","#7b66ff","#48e1c6"],
        ["#39ffd0","#32e6b7","#5a8bff"]
      ];
      var canvasW=0, canvasH=0;
      function sizeCanvas(){
        var dpr=Math.min(2,window.devicePixelRatio||1);
        var rect=card.getBoundingClientRect();
        var width=rect.width;
        var height=rect.height;
        if(width === 0 || height === 0){
          console.warn("MAYA: Card has zero dimensions, retrying...");
          setTimeout(sizeCanvas, 100);
          return;
        }
        canvas.width=Math.floor(width*dpr);
        canvas.height=Math.floor(height*dpr);
        canvas.style.width=width+"px";
        canvas.style.height=height+"px";
        ctx.setTransform(dpr,0,0,dpr,0,0);
        canvasW=width; canvasH=height;
      }
      sizeCanvas();
      console.log("MAYA: Canvas sized successfully");
      window.addEventListener("resize",sizeCanvas,{passive:true});
      var BLOBS=[];
      var MAX=(window.matchMedia&&window.matchMedia('(max-width: 640px)').matches)?3:5;
      var mouse={x:0.5,y:0.5,active:false};
      var pointerInside=false;
      function rand(min,max){return Math.random()*(max-min)+min}
      function initBlobs(){
        BLOBS.length=0;
        var width=canvasW;
        var height=canvasH;
        var cx=width*0.5;
        var cy=height*0.5;
        var margin=Math.min(width,height)*0.08;
        var baseRmin=Math.min(width,height)*0.18;
        var baseRmax=Math.min(width,height)*0.35;
        for(var i=0;i<MAX;i++){
          var angle=rand(0,Math.PI*2);
          var dist=rand(0,Math.min(width,height)*0.15);
          var r=rand(baseRmin,baseRmax);
          var homeX=cx+Math.cos(angle)*dist;
          var homeY=cy+Math.sin(angle)*dist;
          var speed=rand(0.12,0.25);
          var theta=rand(0,Math.PI*2);
          var palette=COLORS[i%COLORS.length];
          BLOBS.push({
            x:homeX,
            y:homeY,
            r:r,
            vx:Math.cos(theta)*speed,
            vy:Math.sin(theta)*speed,
            hx:homeX,
            hy:homeY,
            palette:palette,
            pulsePhase:rand(0,1000),
            margin:margin,
            noiseOffset:rand(0,1000)
          });
        }
      }
      initBlobs();
      console.log("MAYA: Blobs initialized, count:", BLOBS.length);
      window.addEventListener("resize",initBlobs,{passive:true});
      card.addEventListener("pointerenter",function(){
        pointerInside=true;
        mouse.active=true;
      });
      card.addEventListener("pointerleave",function(){
        pointerInside=false;
        mouse.active=false;
      });
      card.addEventListener("pointermove",function(e){
        var rect=card.getBoundingClientRect();
        mouse.x=(e.clientX-rect.left)/rect.width;
        mouse.y=(e.clientY-rect.top)/rect.height;
        mouse.active=true;
      });
      function hexWithAlpha(hex,a){
        var m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if(!m)return hex;
        var r=parseInt(m[1],16);
        var g=parseInt(m[2],16);
        var b=parseInt(m[3],16);
        return "rgba("+r+","+g+","+b+","+a+")";
      }
      function drawBlob(b,now){
        var points=(window.matchMedia&&window.matchMedia('(max-width: 640px)').matches)?8:10;
        if(mayaSpeaking) points+=2;
        var angleStep=(Math.PI*2)/points;
        var noiseScale=mayaSpeaking?0.32:0.18;
        var speedMultiplier=mayaSpeaking?2.2:0.95;
        var rotationOffset=mayaSpeaking?(now*0.001):0;

        var grd=ctx.createRadialGradient(b.x,b.y,b.r*0.1,b.x,b.y,b.r*1.2);
        if(mayaSpeaking){
          grd.addColorStop(0,hexWithAlpha("#4dffb3",0.98));
          grd.addColorStop(0.5,hexWithAlpha("#4dffc8",0.85));
          grd.addColorStop(1,hexWithAlpha(b.palette[2],0));
        }else{
          grd.addColorStop(0,hexWithAlpha(b.palette[0],0.95));
          grd.addColorStop(0.5,hexWithAlpha(b.palette[1],0.75));
          grd.addColorStop(1,hexWithAlpha(b.palette[2],0));
        }
        ctx.fillStyle=grd;
        ctx.beginPath();
        var pts=[];
        for(var i=0;i<points;i++){
          var angle=i*angleStep+rotationOffset;
          var noise=Math.sin((now*speedMultiplier+b.noiseOffset+i*100)/800)*noiseScale;
          var noise2=Math.cos((now*speedMultiplier+b.noiseOffset+i*150)/600)*noiseScale*0.5;
          var r=b.r*(1+noise+noise2);
          var px=b.x+Math.cos(angle)*r;
          var py=b.y+Math.sin(angle)*r;
          pts.push({x:px,y:py});
        }
        ctx.moveTo(pts[0].x,pts[0].y);
        for(var i=0;i<points;i++){
          var p1=pts[i];
          var p2=pts[(i+1)%points];
          var cp1x=p1.x+(p2.x-p1.x)*0.5;
          var cp1y=p1.y+(p2.y-p1.y)*0.5;
          ctx.quadraticCurveTo(p1.x,p1.y,cp1x,cp1y);
        }
        ctx.closePath();
        ctx.fill();
      }
      var last=performance.now();
      function tick(now){
        var dt=Math.min(32,now-last);
        last=now;
        var width=canvasW;
        var height=canvasH;
        var influenceR=Math.min(width,height)*0.35;
        var damping=0.97;
        var step=dt*0.04;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.globalCompositeOperation="source-over";
        for(var i=0;i<BLOBS.length;i++){
          var b=BLOBS[i];
          var k=0.015;
          var fxHome=(b.hx-b.x)*k;
          var fyHome=(b.hy-b.y)*k;
          var fxMouse=0;
          var fyMouse=0;
          if(mouse.active){
            var mx=mouse.x*width;
            var my=mouse.y*height;
            var dx=mx-b.x;
            var dy=my-b.y;
            var dist=Math.hypot(dx,dy);
            if(dist<influenceR){
              var strength=(1-dist/influenceR);
              var att=0.015*strength;
              fxMouse=dx*att;
              fyMouse=dy*att;
            }
          }
          b.vx=(b.vx+fxHome+fxMouse)*damping;
          b.vy=(b.vy+fyHome+fyMouse)*damping;
          b.x+=b.vx*step;
          b.y+=b.vy*step;
          b.r*=1+Math.sin((now+b.pulsePhase)/1200)*0.001;
          var minX=b.margin+b.r;
          var maxX=width-b.margin-b.r;
          var minY=b.margin+b.r;
          var maxY=height-b.margin-b.r;
          if(b.x<minX){b.x=minX;b.vx=Math.abs(b.vx)*0.5}
          if(b.x>maxX){b.x=maxX;b.vx=-Math.abs(b.vx)*0.5}
          if(b.y<minY){b.y=minY;b.vy=Math.abs(b.vy)*0.5}
          if(b.y>maxY){b.y=maxY;b.vy=-Math.abs(b.vy)*0.5}
          drawBlob(b,now);
        }

        // Optimize: Lower frame rate when MAYA is minimized
        if(!mayaVisible){
          setTimeout(function(){ requestAnimationFrame(tick); }, 33); // ~30fps when minimized
        } else {
          requestAnimationFrame(tick); // 60fps when visible
        }
      }
      // Draw one immediate frame for instant appearance
      console.log("MAYA: Drawing first frame...");
      tick(performance.now());
      console.log("MAYA: First frame drawn, starting animation loop");
      console.log("=== MAYA BLOB INIT COMPLETE ===");
      }
    })();

// AI Backend Configuration
    // Using OpenAI ONLY with web search for internet access
    var MAYA_BACKEND = "openai"; // Options: "openai", "gemini", or "hybrid"

    // Google Gemini Configuration (DISABLED - not using Gemini)
    // API key is injected at runtime from the Next.js env into window.GEMINI_API_KEY
    var GEMINI_API_KEY = (window.GEMINI_API_KEY || "");
    var GEMINI_MODEL = "gemini-2.0-flash-exp";
    var GEMINI_USE_SEARCH = true;

    // OpenAI configuration
    // API key, model, and URL are injected at runtime from the Next.js env
    var OPENAI_API_KEY = (window.OPENAI_API_KEY || "");
    var OPENAI_MODEL = (window.OPENAI_MODEL || "gpt-4o");
    var OPENAI_API_URL = (window.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions");

    // Tavily Search API configuration (for internet access)
    // API key is injected at runtime from the Next.js env
    var TAVILY_API_KEY = (window.TAVILY_API_KEY || "");
    var TAVILY_API_URL = "https://api.tavily.com/search";
    var TAVILY_ENABLED = true; // Enable web search for OpenAI

    // Hybrid Mode Configuration (DISABLED - using OpenAI only)
    var HYBRID_USE_GEMINI_FOR_SEARCH = false;
    var HYBRID_USE_OPENAI_FOR_REASONING = true;

    // Keywords that trigger web search
    var WEB_SEARCH_KEYWORDS = [
      "weather", "news", "latest", "current", "today", "now", "recent",
      "price", "stock", "crypto", "bitcoin", "score", "game", "match",
      "search", "find", "look up", "what is happening", "what's happening",
      "update", "breaking", "live", "real-time", "realtime", "who is", "what is"
    ];

    // Load saved API keys from localStorage
    try{
      var savedGeminiKey = localStorage.getItem('maya_gemini_api_key');
      if(savedGeminiKey) GEMINI_API_KEY = savedGeminiKey;

      var savedBackend = localStorage.getItem('maya_backend');
      if(savedBackend) MAYA_BACKEND = savedBackend;
    }catch(_){}

    // Function to configure Gemini API key
    function mayaConfigureGemini(){
      var currentKey = GEMINI_API_KEY || "";
      var newKey = prompt("Enter your Google Gemini API key:\n\nGet your free API key at:\nhttps://aistudio.google.com/app/apikey", currentKey);

      if(newKey && newKey.trim()){
        GEMINI_API_KEY = newKey.trim();
        try{
          localStorage.setItem('maya_gemini_api_key', GEMINI_API_KEY);
        }catch(_){}
        alert("Gemini API key saved! MAYA now has internet access via Google Search.");
        return true;
      }
      return false;
    }

    function mayaBuildPageContext(maxLength){
      if(!maxLength)maxLength=4000;
      try{
        var elements=Array.prototype.slice.call(document.querySelectorAll("main, article, section, p, h1, h2, h3, li"));
        var parts=[];
        var length=0;
        for(var i=0;i<elements.length;i++){
          var el=elements[i];
          if(el.closest("#maya-shell"))continue;
          var text=(el.innerText||"").replace(/\s+/g," ").trim();
          if(!text)continue;
          var remaining=maxLength-length;
          if(remaining<=0)break;
          if(text.length>remaining){
            parts.push(text.slice(0,remaining));
            break;
          }else{
            parts.push(text);
            length+=text.length;
          }
        }
        return parts.join("\n");
      }catch(e){
        return "";
      }
    }

    // Expose helpers so other scripts can force PIP/side-panel visibility (e.g., monitoring/message relay)
    window.mayaEnsurePip = function(preferSidebar){
      try{
        if(preferSidebar && typeof mayaShowPanel === "function"){
          mayaShowPanel();
        }
        if(typeof mayaForcePipEntry === "function"){
          mayaForcePipEntry();
        } else if(mayaPipWindow){
          mayaPipWindow.classList.add("active");
        }
      }catch(err){
        console.error("MAYA: Failed to ensure PIP visibility", err);
      }
    };

    window.mayaRequestScreenCaptureFlow = function(){
      try{
        if(typeof mayaShowPanel === "function"){
          mayaShowPanel();
        }
        if(typeof mayaForcePipEntry === "function"){
          mayaForcePipEntry();
        } else if(mayaPipWindow){
          mayaPipWindow.classList.add("active");
        }
      }catch(err){
        console.error("MAYA: Failed to start screen capture flow", err);
      }
    };
    var MAYA_PAGE_CONTEXT=mayaBuildPageContext();

    // ============================================
    // SCREEN CAPTURE & ENHANCED DOM ANALYSIS
    // ============================================

    // Capture screenshot of current screen/tab
    async function mayaCaptureScreen(){
      try{
        console.log("MAYA: Requesting screen capture...");

        if(!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia){
          console.error("MAYA: Screen capture not supported in this browser/context");
          return null;
        }

        // Request screen capture - automatically select entire screen
        // Prefer entire screen/monitor as the capture surface
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            // Hint to prefer full monitor capture where supported
            displaySurface: 'monitor',
            logicalSurface: true,
            cursor: 'never', // Don't show cursor in capture
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false,
          // Automatically select entire screen without user prompt (where supported)
          preferCurrentTab: false,
          selfBrowserSurface: 'exclude',
          systemAudio: 'exclude',
          surfaceSwitching: 'include',
          monitorTypeSurfaces: 'include'
        });

        mayaScreenCaptureStream = stream;

        // Create video element to capture frame
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        // Wait for video to be ready
        await new Promise(resolve => {
          if(video.readyState >= 2){
            resolve();
          }else{
            video.onloadedmetadata = function(){ resolve(); };
          }
        });

        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Convert to base64
        const screenshot = canvas.toDataURL('image/jpeg', 0.8);
        mayaLastScreenshot = screenshot;

        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
        mayaScreenCaptureStream = null;

        console.log("MAYA: ✅ Screenshot captured successfully");
        return screenshot;
      }catch(e){
        // Don't show error to user - silently fail and continue
        console.log("MAYA: Screen capture cancelled or unavailable - continuing without screenshot");
        mayaScreenCaptureStream = null;
        return null;
      }
    }

    // ============================================
    // PIP VOICE VISUALIZER
    // ============================================

    function mayaStartPipVoiceVisualizer(){
      if(!mayaPipVoiceVisualizer || !mayaPipVoiceCanvas) return;

      // Show visualizer, hide input
      mayaPipVoiceVisualizer.classList.add('active');
      if(mayaPipInput) mayaPipInput.style.display = 'none';

      // Setup canvas
      var canvas = mayaPipVoiceCanvas;
      var ctx = canvas.getContext('2d');
      var width = canvas.offsetWidth;
      var height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;

      var centerY = height / 2;
      var points = 50; // Number of points along the wave
      var waveAmplitudes = new Array(points).fill(0);
      var targetAmplitudes = new Array(points).fill(0);
      var noiseOffset = Math.random() * 1000;

      function animate(){
        if(!mayaPipVoiceVisualizer || !mayaPipVoiceVisualizer.classList.contains('active')){
          return; // Stop animation if visualizer is hidden
        }

        var now = performance.now();
        ctx.clearRect(0, 0, width, height);

        // Update target amplitudes with smooth wave pattern
        for(var i = 0; i < points; i++){
          var t = now * 0.003;
          var x = i / points;
          // Create smooth wave with multiple frequencies
          var wave1 = Math.sin(x * Math.PI * 4 + t) * 0.3;
          var wave2 = Math.sin(x * Math.PI * 2 + t * 1.5) * 0.5;
          var wave3 = Math.sin(x * Math.PI * 6 + t * 0.8) * 0.2;
          targetAmplitudes[i] = (wave1 + wave2 + wave3) * height * 0.3;
        }

        // Smoothly interpolate current amplitudes to target
        for(var i = 0; i < points; i++){
          waveAmplitudes[i] += (targetAmplitudes[i] - waveAmplitudes[i]) * 0.15;
        }

        // Draw smooth curved line
        ctx.beginPath();
        ctx.lineWidth = 3;

        // Create gradient along the line
        var gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(77, 163, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(139, 93, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(77, 163, 255, 0.8)');
        ctx.strokeStyle = gradient;

        // Draw the wave using smooth curves
        for(var i = 0; i < points; i++){
          var x = (i / (points - 1)) * width;
          var y = centerY + waveAmplitudes[i];

          if(i === 0){
            ctx.moveTo(x, y);
          } else {
            // Use quadratic curves for smoothness
            var prevX = ((i - 1) / (points - 1)) * width;
            var prevY = centerY + waveAmplitudes[i - 1];
            var cpX = (prevX + x) / 2;
            var cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
          }
        }

        ctx.stroke();

        mayaPipVoiceAnimationId = requestAnimationFrame(animate);
      }

      animate();
    }

    function mayaStopPipVoiceVisualizer(){
      if(!mayaPipVoiceVisualizer) return;

      // Hide visualizer, show input
      mayaPipVoiceVisualizer.classList.remove('active');
      if(mayaPipInput) mayaPipInput.style.display = 'block';

      // Stop animation
      if(mayaPipVoiceAnimationId){
        cancelAnimationFrame(mayaPipVoiceAnimationId);
        mayaPipVoiceAnimationId = null;
      }
    }

    // Voice visualizer for Document PIP (runs in PIP window context)
    var pipVoiceAnimationId = null;
    function mayaStartPipVoiceVisualizerInDoc(pipDoc, canvas, visualizer){
      if(!canvas || !visualizer) return;

      var ctx = canvas.getContext('2d');
      var width = canvas.offsetWidth || 300;
      var height = canvas.offsetHeight || 50;
      canvas.width = width;
      canvas.height = height;

      var centerY = height / 2;
      var points = 50; // Number of points along the wave
      var waveAmplitudes = new Array(points).fill(0);
      var targetAmplitudes = new Array(points).fill(0);
      var noiseOffset = Math.random() * 1000;

      function animate(){
        if(!visualizer || !visualizer.classList.contains('active')){
          return; // Stop animation if visualizer is hidden
        }

        var now = pipDoc.defaultView.performance.now();
        ctx.clearRect(0, 0, width, height);

        // Update target amplitudes with smooth wave pattern
        for(var i = 0; i < points; i++){
          var t = now * 0.003;
          var x = i / points;
          // Create smooth wave with multiple frequencies
          var wave1 = Math.sin(x * Math.PI * 4 + t) * 0.3;
          var wave2 = Math.sin(x * Math.PI * 2 + t * 1.5) * 0.5;
          var wave3 = Math.sin(x * Math.PI * 6 + t * 0.8) * 0.2;
          targetAmplitudes[i] = (wave1 + wave2 + wave3) * height * 0.3;
        }

        // Smoothly interpolate current amplitudes to target
        for(var i = 0; i < points; i++){
          waveAmplitudes[i] += (targetAmplitudes[i] - waveAmplitudes[i]) * 0.15;
        }

        // Draw smooth curved line
        ctx.beginPath();
        ctx.lineWidth = 3;

        // Create gradient along the line
        var gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(77, 163, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(139, 93, 255, 0.9)');
        gradient.addColorStop(1, 'rgba(77, 163, 255, 0.8)');
        ctx.strokeStyle = gradient;

        // Draw the wave using smooth curves
        for(var i = 0; i < points; i++){
          var x = (i / (points - 1)) * width;
          var y = centerY + waveAmplitudes[i];

          if(i === 0){
            ctx.moveTo(x, y);
          } else {
            // Use quadratic curves for smoothness
            var prevX = ((i - 1) / (points - 1)) * width;
            var prevY = centerY + waveAmplitudes[i - 1];
            var cpX = (prevX + x) / 2;
            var cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
          }
        }

        ctx.stroke();

        pipVoiceAnimationId = pipDoc.defaultView.requestAnimationFrame(animate);
      }

      animate();
    }

    // ============================================
    // BROWSER ACTIONS & PERMISSIONS
    // ============================================

    /**
     * Open a new browser tab with the specified URL
     * @param {string} url - The URL to open
     * @returns {Promise<boolean>} - True if successful
     */
    async function mayaOpenNewTab(url){
      try{
        console.log("MAYA: Opening new tab:", url);

        // Try Chrome extension API first
        if(typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create){
          await chrome.tabs.create({ url: url, active: true });
          console.log("MAYA: ✅ New tab opened via Chrome extension API");
          return true;
        }

        // Fallback to window.open
        var newWindow = window.open(url, '_blank');
        if(newWindow){
          console.log("MAYA: ✅ New tab opened via window.open");
          return true;
        }

        console.log("MAYA: ⚠️ Could not open new tab");
        return false;
      }catch(e){
        console.error("MAYA: Error opening new tab:", e);
        return false;
      }
    }

    /**
     * Navigate current tab to a URL
     * @param {string} url - The URL to navigate to
     * @returns {Promise<boolean>} - True if successful
     */
    async function mayaNavigateToUrl(url){
      try{
        console.log("MAYA: Navigating to:", url);
        window.location.href = url;
        return true;
      }catch(e){
        console.error("MAYA: Error navigating:", e);
        return false;
      }
    }

    /**
     * Search Google in a new tab
     * @param {string} query - The search query
     * @returns {Promise<boolean>} - True if successful
     */
    async function mayaSearchGoogle(query){
      var searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(query);
      return await mayaOpenNewTab(searchUrl);
    }

    /**
     * Process browser actions from AI response
     * Detects commands like "opening new tab", "searching for", etc.
     * @param {string} response - The AI response text
     */
    function mayaProcessBrowserActions(response){
      if(!response) return;

      var lowerResponse = response.toLowerCase();

      // Detect "opening [URL]" or "opening new tab with [URL]"
      var urlMatch = response.match(/opening (?:new tab (?:with|to|for) )?(?:the )?(?:website |page |link )?(?:at )?(?:\[)?([https?:\/\/][^\s\]]+)(?:\])?/i);
      if(urlMatch && urlMatch[1]){
        var url = urlMatch[1];
        console.log("MAYA: Detected URL to open:", url);
        setTimeout(function(){
          mayaOpenNewTab(url);
        }, 500);
        return;
      }

      // Detect "searching for [query]" or "searching Google for [query]"
      var searchMatch = response.match(/searching (?:(?:google|the web) )?for[:\s]+["']?([^"'\n]+)["']?/i);
      if(searchMatch && searchMatch[1]){
        var query = searchMatch[1].trim();
        console.log("MAYA: Detected search query:", query);
        setTimeout(function(){
          mayaSearchGoogle(query);
        }, 500);
        return;
      }

      // Detect "navigating to [URL]"
      var navMatch = response.match(/navigating to (?:\[)?([https?:\/\/][^\s\]]+)(?:\])?/i);
      if(navMatch && navMatch[1]){
        var url = navMatch[1];
        console.log("MAYA: Detected navigation to:", url);
        setTimeout(function(){
          mayaNavigateToUrl(url);
        }, 500);
        return;
      }
    }

    /**
     * Detect if the application behind PIP is a browser
     * This helps determine if we should attempt DOM analysis or skip directly to screen capture
     * @returns {Promise<{isBrowser: boolean, browserType: string|null}>}
     */
    async function mayaDetectApplicationBehindPIP(){
      try{
        console.log("MAYA: Detecting application behind PIP...");

        // Check if Chrome extension APIs are available (indicates we're in a browser)
        if(typeof chrome !== 'undefined' && chrome.tabs){
          console.log("MAYA: ✅ Browser detected (Chrome extension APIs available)");
          return {
            isBrowser: true,
            browserType: 'chrome'
          };
        }

        // Check for other browser APIs
        if(typeof browser !== 'undefined' && browser.tabs){
          console.log("MAYA: ✅ Browser detected (Firefox extension APIs available)");
          return {
            isBrowser: true,
            browserType: 'firefox'
          };
        }

        // If we're in a browser context but without extension APIs
        if(window.opener || document.referrer){
          console.log("MAYA: ✅ Browser detected (window context)");
          return {
            isBrowser: true,
            browserType: 'unknown'
          };
        }

        console.log("MAYA: ⚠️ Cannot determine if application is a browser");
        return {
          isBrowser: false,
          browserType: null
        };
      }catch(e){
        console.error("MAYA: Error detecting application:", e);
        return {
          isBrowser: false,
          browserType: null
        };
      }
    }

    /**
     * Analyze DOM of the active browser tab when in PIP mode
     * This function intelligently detects the actual active content tab, ignoring the PIP window itself
     *
     * Strategy:
     * 1. Detect if application behind PIP is a browser (if not, return null for screen capture fallback)
     * 2. Use Chrome extension APIs to query all tabs and filter out MAYA/PIP tabs
     * 3. Sort by lastAccessed to find the most recently active content tab
     * 4. Try to inject script into that tab to extract DOM content
     * 5. Fallback to current window active tab if injection fails
     * 6. Try opener window if available
     * 7. Return null if all strategies fail (triggers screen capture fallback)
     *
     * @returns {Promise<Object|null>} DOM analysis object with url, title, textContent, headings, etc. or null
     */
    async function mayaAnalyzeActiveTab(){
      try{
        console.log("MAYA: Analyzing active tab DOM...");

        // First, detect if the application behind PIP is a browser
        var appInfo = await mayaDetectApplicationBehindPIP();
        if(!appInfo.isBrowser){
          console.log("MAYA: Application behind PIP is not a browser - skipping DOM analysis");
          return null;
        }

        console.log("MAYA: Browser detected, attempting to analyze active tab...");

        // Strategy 1: Try Chrome extension APIs to find the actual active browser tab
        if(typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting){
          console.log("MAYA: Chrome extension APIs available, searching for active browser tab...");

          // Get the current PIP window URL to exclude it
          var pipUrl = window.location.href;
          var pipHostname = window.location.hostname;

          // Query all tabs across all windows
          var allTabs = await chrome.tabs.query({});
          console.log("MAYA: Found " + allTabs.length + " total tabs");

          // Filter out MAYA/PIP tabs and find the most recently active content tab
          var contentTabs = allTabs.filter(function(tab){
            // Exclude chrome:// URLs, extension pages, and MAYA pages
            if(!tab.url) return false;
            if(tab.url.startsWith('chrome://')) return false;
            if(tab.url.startsWith('chrome-extension://')) return false;
            if(tab.url.includes('MAYA.html')) return false;
            if(tab.url === pipUrl) return false;
            return true;
          });

          console.log("MAYA: Found " + contentTabs.length + " content tabs (excluding PIP/MAYA)");

          // Sort by lastAccessed (most recent first)
          contentTabs.sort(function(a, b){
            return (b.lastAccessed || 0) - (a.lastAccessed || 0);
          });

          // Try the most recently accessed content tab first
          if(contentTabs.length > 0){
            var targetTab = contentTabs[0];
            console.log("MAYA: Attempting to analyze tab:", targetTab.title, targetTab.url);

            try{
              const result = await chrome.scripting.executeScript({
                target: {tabId: targetTab.id},
                func: function(){
                  // This runs in the context of the target tab
                  return {
                    url: window.location.href,
                    title: document.title,
                    textContent: document.body.innerText.substring(0, 5000),
                    headings: Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(h => h.textContent.trim()),
                    links: Array.from(document.querySelectorAll('a')).length,
                    images: Array.from(document.querySelectorAll('img')).length
                  };
                }
              });

              if(result && result[0] && result[0].result){
                var data = result[0].result;
                console.log("MAYA: ✅ Successfully analyzed active browser tab:", data.title);
                return data;
              }
            }catch(scriptError){
              console.log("MAYA: Could not inject script into tab (may be protected):", scriptError);
              // Continue to next strategy
            }
          }

          // If we have content tabs but couldn't inject, try the active tab in current window
          var currentWindowTabs = await chrome.tabs.query({active: true, currentWindow: true});
          if(currentWindowTabs && currentWindowTabs.length > 0){
            var currentTab = currentWindowTabs[0];
            // Make sure it's not the PIP window itself
            if(currentTab.url && currentTab.url !== pipUrl && !currentTab.url.includes('MAYA.html')){
              console.log("MAYA: Trying current window active tab:", currentTab.title);
              try{
                const result = await chrome.scripting.executeScript({
                  target: {tabId: currentTab.id},
                  func: function(){
                    return {
                      url: window.location.href,
                      title: document.title,
                      textContent: document.body.innerText.substring(0, 5000),
                      headings: Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 10).map(h => h.textContent.trim()),
                      links: Array.from(document.querySelectorAll('a')).length,
                      images: Array.from(document.querySelectorAll('img')).length
                    };
                  }
                });

                if(result && result[0] && result[0].result){
                  console.log("MAYA: ✅ Successfully analyzed current window tab");
                  return result[0].result;
                }
              }catch(scriptError){
                console.log("MAYA: Could not inject into current window tab:", scriptError);
              }
            }
          }
        }

        // Strategy 2: If PIP is in a separate window, try to access the opener window
        if(window.opener && !window.opener.closed){
          try{
            console.log("MAYA: Attempting to analyze opener window...");
            var openerDoc = window.opener.document;
            if(openerDoc && openerDoc.body){
              return {
                url: window.opener.location.href,
                title: openerDoc.title,
                textContent: openerDoc.body.innerText.substring(0, 5000),
                headings: Array.from(openerDoc.querySelectorAll('h1, h2, h3')).slice(0, 10).map(h => h.textContent.trim()),
                links: Array.from(openerDoc.querySelectorAll('a')).length,
                images: Array.from(openerDoc.querySelectorAll('img')).length
              };
            }
          }catch(e){
            console.log("MAYA: Cannot access opener window (cross-origin):", e);
          }
        }

        // Strategy 3: All strategies failed - return null to trigger screen capture fallback
        console.log("MAYA: ❌ Cannot access browser tab DOM - will fallback to screen capture");
        return null;
      }catch(e){
        console.error("MAYA: Active tab analysis failed:", e);
        return null;
      }
    }

    // Enhanced DOM analysis with structured data extraction
    function mayaAnalyzeDOM(){
      try{
        console.log("MAYA: Analyzing DOM...");

        const analysis = {
          url: window.location.href,
          title: document.title,
          meta: {},
          headings: [],
          links: [],
          images: [],
          forms: [],
          tables: [],
          lists: [],
          textContent: "",
          structuredData: {}
        };

        // Extract meta tags
        document.querySelectorAll('meta').forEach(meta => {
          const name = meta.getAttribute('name') || meta.getAttribute('property');
          const content = meta.getAttribute('content');
          if(name && content){
            analysis.meta[name] = content;
          }
        });

        // Extract headings with hierarchy
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
          if(!h.closest('#maya-shell') && !h.closest('#maya-pip-window')){
            analysis.headings.push({
              level: h.tagName,
              text: h.textContent.trim()
            });
          }
        });

        // Extract links
        document.querySelectorAll('a[href]').forEach((link, idx) => {
          if(idx < 50 && !link.closest('#maya-shell') && !link.closest('#maya-pip-window')){ // Limit to 50 links
            analysis.links.push({
              text: link.textContent.trim(),
              href: link.href
            });
          }
        });

        // Extract images
        document.querySelectorAll('img[src]').forEach((img, idx) => {
          if(idx < 20 && !img.closest('#maya-shell') && !img.closest('#maya-pip-window')){ // Limit to 20 images
            analysis.images.push({
              alt: img.alt || '',
              src: img.src,
              title: img.title || ''
            });
          }
        });

        // Extract forms
        document.querySelectorAll('form').forEach((form, idx) => {
          if(idx < 10 && !form.closest('#maya-shell') && !form.closest('#maya-pip-window')){
            const inputs = [];
            form.querySelectorAll('input, select, textarea').forEach(input => {
              inputs.push({
                type: input.type || input.tagName.toLowerCase(),
                name: input.name || '',
                placeholder: input.placeholder || '',
                label: input.labels && input.labels[0] ? input.labels[0].textContent.trim() : ''
              });
            });
            analysis.forms.push({
              action: form.action || '',
              method: form.method || 'get',
              inputs: inputs
            });
          }
        });

        // Extract tables
        document.querySelectorAll('table').forEach((table, idx) => {
          if(idx < 5 && !table.closest('#maya-shell') && !table.closest('#maya-pip-window')){
            const headers = [];
            table.querySelectorAll('th').forEach(th => {
              headers.push(th.textContent.trim());
            });
            analysis.tables.push({
              headers: headers,
              rowCount: table.querySelectorAll('tr').length
            });
          }
        });

        // Extract lists
        document.querySelectorAll('ul, ol').forEach((list, idx) => {
          if(idx < 10 && !list.closest('#maya-shell') && !list.closest('#maya-pip-window')){
            const items = [];
            list.querySelectorAll('li').forEach((li, liIdx) => {
              if(liIdx < 10){
                items.push(li.textContent.trim());
              }
            });
            analysis.lists.push({
              type: list.tagName.toLowerCase(),
              items: items
            });
          }
        });

        // Extract main text content
        const bodyText = document.body.innerText || document.body.textContent || '';
        const mayaShell = document.getElementById('maya-shell');
        const mayaPip = document.getElementById('maya-pip-window');
        let cleanText = bodyText;
        if(mayaShell){
          const mayaText = mayaShell.innerText || mayaShell.textContent || '';
          cleanText = cleanText.replace(mayaText, '');
        }
        if(mayaPip){
          const pipText = mayaPip.innerText || mayaPip.textContent || '';
          cleanText = cleanText.replace(pipText, '');
        }
        analysis.textContent = cleanText.substring(0, 3000);

        // Try to extract JSON-LD structured data
        document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
          try{
            const data = JSON.parse(script.textContent);
            analysis.structuredData = data;
          }catch(e){}
        });

        mayaLastDOMSnapshot = analysis;
        console.log("MAYA: DOM analysis complete", analysis);
        return analysis;
      }catch(e){
        console.error("MAYA: DOM analysis failed:", e);
        return null;
      }
    }

    // Build system prompt with location (async function)
    async function mayaBuildSystemPrompt(){
      return "You are MAYA, a female professional AI assistant.\n\n"+
        "Your purpose:\n"+
        "- Professional task assistance: Help with work projects, productivity, organization, and professional development.\n"+
        "- Creative support: Brainstorming, content creation, problem-solving, and innovative thinking.\n"+
        "- General intelligence: Answer questions about current events, world knowledge, science, technology, and various topics.\n\n"+
        "Your capabilities:\n"+
        "1. PROFESSIONAL ASSISTANT: Help with work tasks, research, analysis, writing, coding, and strategic planning.\n"+
        "2. CREATIVE PARTNER: Support brainstorming, content creation, design thinking, and innovative problem-solving.\n"+
        "3. KNOWLEDGE BASE: Extensive knowledge across domains including science, technology, business, arts, and current affairs.\n"+
        "4. INTERNET ACCESS: You have real-time access to the internet via Tavily Search API. You can search for current information, news, weather, prices, and any up-to-date data automatically.\n"+
        "5. SCREEN AWARENESS: Can capture and analyze screenshots of the user's screen to see exactly what they're looking at.\n"+
        "6. WEB CONTEXT: Can analyze webpage DOM structure, extract data, understand forms, tables, links, and page content.\n"+
        "7. CROSS-TAB AWARENESS: Available in Picture-in-Picture mode to follow you across tabs and applications.\n"+
        "8. BROWSER CONTROL: Can open new tabs, navigate to URLs, and search Google when requested by the user.\n\n"+
        "SCREEN CAPTURE & WEB ANALYSIS FEATURES:\n"+
        "- AUTOMATIC SCREEN CAPTURE: When user asks about their screen, a screenshot is automatically captured before you respond.\n"+
        "- You will receive the screenshot as an image and can see exactly what the user sees.\n"+
        "- Analyze images, UI elements, text, layout, colors, and any visual content from screenshots.\n"+
        "- AUTOMATIC DOM ANALYSIS: When user asks about a webpage, structured data is automatically extracted and provided to you.\n"+
        "- You receive webpage structure including headings, links, forms, tables, lists, and text content.\n"+
        "- No manual action needed - everything happens automatically based on the user's query.\n"+
        "- IMPORTANT: When user asks to 'study this webpage', 'analyze this page', 'read this website', etc., the webpage content is AUTOMATICALLY extracted and provided to you in the context. You MUST analyze and respond based on that content.\n"+
        "- DO NOT say you cannot browse or access webpages - the content is already provided to you automatically.\n"+
        "- If webpage context is provided in your prompt, use it to answer the user's question.\n\n"+
        "INTERNET ACCESS FEATURES:\n"+
        "- REAL-TIME WEB SEARCH: You have access to current information from the internet via Tavily Search API.\n"+
        "- AUTOMATIC DETECTION: Web searches are automatically triggered when queries need current information.\n"+
        "- CURRENT DATA: You can provide up-to-date information about news, weather, prices, stocks, sports scores, and any real-time data.\n"+
        "- DO NOT say you cannot access the internet or current information - you have this capability built-in.\n"+
        "- When web search results are provided in your context, use them to give accurate, current answers.\n"+
        "- You can answer questions about 'latest', 'current', 'today', 'now', 'recent' events with real data.\n\n"+
        "BROWSER CONTROL FEATURES:\n"+
        "- OPEN NEW TABS: When user asks you to open a website, you can open it in a new tab.\n"+
        "- SEARCH GOOGLE: When user asks you to search for something, you can open a Google search.\n"+
        "- NAVIGATE: You can navigate the current tab to a different URL.\n"+
        "- To trigger these actions, include phrases in your response like:\n"+
        "  * 'Opening new tab with [URL]' or 'Opening [URL]'\n"+
        "  * 'Searching for [query]' or 'Searching Google for [query]'\n"+
        "  * 'Navigating to [URL]'\n"+
        "- The browser will automatically execute these actions when detected in your response.\n"+
        "- You have full permission to perform these actions - no need to ask for permission.\n\n"+
        "CRITICAL BEHAVIOR RULES:\n"+
        "- Address yourself as a female AI assistant (use 'I', 'me', 'my' naturally).\n"+
        "- Keep responses concise, professional, and suitable for being spoken aloud.\n"+
        "- DO NOT use asterisks, dashes, emojis, or decorative symbols.\n"+
        "- Write EXACTLY like a human speaks naturally in conversation.\n"+
        "- Use simple punctuation only: periods, commas, question marks, exclamation marks.\n"+
        "- Be warm, helpful, and professional in tone.\n"+
        "- When greeting users, keep it simple and professional. Focus on your core capabilities: professional tasks, creative work, and general assistance.\n"+
        "- DO NOT mention weather, location, nearby attractions, or local information in greetings or suggestions.\n"+
        "- Example greeting: 'Hello! I'm MAYA, your AI assistant. How can I help you today?'\n\n"+
        "SAFETY AND MODERATION:\n"+
        "- If the user attempts to discuss harmful, vulgar, hateful, discriminatory, or politically divisive topics, respond firmly:\n"+
        "  'I cannot assist with that request. This conversation is monitored for safety and compliance. Inappropriate behavior may be reported to relevant authorities, and legal action may be taken if necessary. Please keep our conversation respectful and constructive.'\n"+
        "- Refuse any requests for illegal activities, harassment, hate speech, or harmful content.\n"+
        "- Maintain professional boundaries at all times.\n\n"+
        "Page context (when available):\n"+MAYA_PAGE_CONTEXT;
    }

    var MAYA_SYSTEM_PROMPT = ""; // Will be populated async


    var mayaBlobCard=document.getElementById("maya-blob-card");
    var mayaBlobShell=document.getElementById("maya-blob-shell");
    var mayaListeningIndicator=document.getElementById("maya-listening-indicator");
    var mayaCloseOverlay=document.getElementById("maya-close-overlay");
    var mayaMinimizeOverlay=document.getElementById("maya-minimize-overlay");
    var mayaKeyboardOverlay=document.getElementById("maya-keyboard-overlay");
    var mayaKeyboardInputContainer=document.getElementById("maya-keyboard-input-container");
    var mayaStopOverlay=document.getElementById("maya-stop-overlay");

    var mayaKeyboardInput=document.getElementById("maya-keyboard-input");
    var mayaMuteOverlay=document.getElementById("maya-mute-overlay");

    var mayaChatTimeline=document.getElementById("maya-chat-timeline");
    var mayaMicPermission=document.getElementById("maya-mic-permission");
    var mayaMicAllowBtn=document.getElementById("maya-mic-allow-btn");
    var mayaMicCloseBtn=document.getElementById("maya-mic-close-btn");
    var mayaMicRequested=false;

    var mayaSendBtn=document.getElementById("maya-send-btn");

    // Picture-in-Picture elements
    var mayaPipWindow=document.getElementById("maya-pip-window");
    var mayaPipHeader=document.getElementById("maya-pip-header");
    var mayaPipChat=document.getElementById("maya-pip-chat");
    var mayaPipInput=document.getElementById("maya-pip-input");
    var mayaPipSend=document.getElementById("maya-pip-send");
    var mayaPipCaptureBtn=document.getElementById("maya-pip-capture-btn");
    var mayaPipRestoreBtn=document.getElementById("maya-pip-restore-btn");
    var mayaPipCloseBtn=document.getElementById("maya-pip-close-btn");
    var mayaPipBlobCanvas=document.getElementById("maya-pip-blob-canvas");
    var mayaPipStopBtn=document.getElementById("maya-pip-stop-btn");
    var mayaPipMuteBtn=document.getElementById("maya-pip-mute-btn");
    var mayaPipModeToggle=document.getElementById("maya-pip-mode-toggle");
    var mayaPipInputMode="keyboard";
    var mayaPipVoiceVisualizer=document.getElementById("maya-pip-voice-visualizer");
    var mayaPipVoiceCanvas=document.getElementById("maya-pip-voice-canvas");
    var mayaPipVoiceLabel=document.getElementById("maya-pip-voice-label");
    var mayaPipVoiceAnimationId=null;

    // Atlas-style AI Dots elements
    var mayaAiDotsWrapper = document.getElementById("maya-ai-dots-wrapper");
    var mayaAiDotsCanvas = document.getElementById("maya-ai-dots-canvas");
    var mayaAiDotsLabel = document.getElementById("maya-ai-dots-label");
    var mayaAiDotsActive = false;

    // mayaVisible and mayaSpeaking already declared before blob script
    var mayaSending=false;
    var mayaFetchAbort=null;

    var mayaSpeechEnabled=true;
    var mayaCurrentUtterance=null;
    var mayaThinkingMessage=null;
    var mayaStreamingMessage=null;

    var mayaInputMode="voice";

    // ElevenLabs Configuration
    // API key and voice ID are injected at runtime from the Next.js env
    var ELEVENLABS_API_KEY = (window.ELEVENLABS_API_KEY || "");
    var ELEVENLABS_VOICE_ID = (window.ELEVENLABS_VOICE_ID || "m7GHBtY0UEqljrKQw2JH"); // Default voice ID
    var ELEVENLABS_MAX_RETRIES = 2; // Reduced retries to save credits
    var ELEVENLABS_RETRY_DELAY = 1000; // 1 second between retries
    var MAYA_FORCE_SPEECH = true; // Always try to speak, even on errors
    var MAYA_AUTO_RETRY_CONNECTIONS = true; // Auto-retry connection failures

    // Credit optimization settings
    var ELEVENLABS_USE_TURBO_MODEL = true; // Use turbo model (cheaper & faster)
    var ELEVENLABS_CACHE_AUDIO = true; // Cache repeated phrases
    var ELEVENLABS_MAX_SENTENCE_LENGTH = 500; // Limit sentence length to avoid huge requests
    var MAYA_VOICE_SPEED = 0.90; // Playback speed (0.90 = 90% = slower, calmer voice)


    try{ var storedVid=localStorage.getItem('maya_voice_id'); if(storedVid){ ELEVENLABS_VOICE_ID=storedVid; } }catch(_){ }

    // Clear old chat history with location-based greetings (version 2.1)
    try{
      var mayaVersion = localStorage.getItem('maya_version');
      if(mayaVersion !== '2.1'){
        console.log("MAYA: Clearing old chat history (upgrading to v2.1)");
        localStorage.removeItem('maya_chat_history');
        localStorage.setItem('maya_version', '2.1');
      }
    }catch(_){}

    var mayaConversation=[
      {
        role:"system",
        content:MAYA_SYSTEM_PROMPT
      }
    ];

    function mayaGetTimestamp(){
      var now=new Date();
      var hours=now.getHours();
      var minutes=now.getMinutes();
      var ampm=hours>=12?"PM":"AM";
      hours=hours%12||12;
      minutes=minutes<10?"0"+minutes:minutes;
      return hours+":"+minutes+" "+ampm;
    }

    function mayaEscapeHtml(s){
      return String(s||"").replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]);});
    }
    function mayaRenderMarkdown(s){
      var t=mayaEscapeHtml(s||"");
      t=t.replace(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g,function(_,lang,code){
        var l=lang?(' class="language-'+lang+'"'):'';
        return '<pre><code'+l+'>'+code+'</code></pre>';
      });
      t=t.replace(/`([^`]+)`/g,'<code>$1</code>');
      t=t.replace(/\n\n+/g,'</p><p>').replace(/\n/g,'<br>');
      return '<p>'+t+'</p>';
    }

    function mayaAddMessage(role,text){
      var timeline=document.getElementById("maya-chat-timeline");
      if(!timeline){ console.warn("MAYA: Chat timeline not found"); return; }
      try{
        var msgDiv=document.createElement("div");
        msgDiv.className="maya-chat-message "+(role==="user"?"user":"assistant");

        var bubble=document.createElement("div");
        bubble.className="maya-chat-bubble";
        bubble.innerHTML=mayaRenderMarkdown(text);
        msgDiv.appendChild(bubble);

        var timestamp=document.createElement("div");
        timestamp.className="maya-chat-timestamp";
        timestamp.textContent=mayaGetTimestamp();
        msgDiv.appendChild(timestamp);

        timeline.appendChild(msgDiv);
        timeline.scrollTop=timeline.scrollHeight;

        // Sync to PIP if active
        if(mayaPipActive){
          mayaSyncChatToPIP(true);
        }
      }catch(e){
        console.error("MAYA: Failed to add chat message", e);
      }
    }


    function mayaStartStreamingAssistantMessage(){
      var timeline=document.getElementById("maya-chat-timeline");
      if(!timeline){ console.warn("MAYA: Chat timeline not found"); return null; }
      try{
        var msgDiv=document.createElement("div");
        msgDiv.className="maya-chat-message assistant";

        var bubble=document.createElement("div");
        bubble.className="maya-chat-bubble";
        msgDiv.appendChild(bubble);

        var timestamp=document.createElement("div");
        timestamp.className="maya-chat-timestamp";
        timestamp.textContent=mayaGetTimestamp();
        msgDiv.appendChild(timestamp);

        timeline.appendChild(msgDiv);
        timeline.scrollTop=timeline.scrollHeight;
        mayaStreamingMessage={container:msgDiv,bubble:bubble};
        return mayaStreamingMessage;
      }catch(e){
        console.error("MAYA: Failed to start streaming message",e);
        return null;
      }
    }

    function mayaUpdateStreamingAssistantMessage(text){
      if(!mayaStreamingMessage||!mayaStreamingMessage.bubble)return;
      try{
        mayaStreamingMessage.bubble.innerHTML=mayaRenderMarkdown(text||"");
        var timeline=document.getElementById("maya-chat-timeline");
        if(timeline) timeline.scrollTop=timeline.scrollHeight;

        // Sync to PIP if active
        if(mayaPipActive){
          mayaSyncChatToPIP();
        }
      }catch(e){
        console.error("MAYA: Failed to update streaming message",e);
      }
    }

    function mayaClearStreamingAssistantMessage(){
      mayaStreamingMessage=null;
    }


    function mayaShowThinkingBubble(){
      var timeline=document.getElementById("maya-chat-timeline");
      if(!timeline){ return; }
      try{
        if(mayaThinkingMessage && mayaThinkingMessage.parentNode){
          mayaThinkingMessage.parentNode.removeChild(mayaThinkingMessage);
        }
        var msgDiv=document.createElement("div");
        msgDiv.className="maya-chat-message assistant maya-thinking";

        var bubble=document.createElement("div");
        bubble.className="maya-chat-bubble maya-thinking-bubble";
        bubble.innerHTML='<span class="maya-typing-dot"></span><span class="maya-typing-dot"></span><span class="maya-typing-dot"></span>';
        msgDiv.appendChild(bubble);

        timeline.appendChild(msgDiv);
        timeline.scrollTop=timeline.scrollHeight;
        mayaThinkingMessage=msgDiv;
      }catch(e){
        console.error("MAYA: Failed to show thinking bubble", e);
      }
    }

    function mayaHideThinkingBubble(){
      try{
        if(mayaThinkingMessage && mayaThinkingMessage.parentNode){
          mayaThinkingMessage.parentNode.removeChild(mayaThinkingMessage);
        }
      }catch(_){ }
      mayaThinkingMessage=null;
    }



    function mayaAnalyzeWebsite(){
      var analysis={
        url:window.location.href,
        title:document.title,
        description:"",
        headings:[],
        textContent:""
      };

      var metaDesc=document.querySelector('meta[name="description"]');
      if(metaDesc)analysis.description=metaDesc.content;

      var headings=document.querySelectorAll("h1,h2,h3,h4,h5,h6");
      headings.forEach(function(h){
        if(h.textContent.trim()&&!h.closest("#maya-shell")){
          analysis.headings.push(h.tagName+": "+h.textContent.trim());
        }
      });

      var bodyText=document.body.innerText||document.body.textContent;
      var mayaShell=document.getElementById("maya-shell");
      if(mayaShell){
        var mayaText=mayaShell.innerText||mayaShell.textContent;
        bodyText=bodyText.replace(mayaText,"");
      }
      analysis.textContent=bodyText.substring(0,800);

      return analysis;
    }

    async function mayaCallBackend(messages,onToken){
      // HYBRID MODE: Intelligently route to best backend based on query type
      if(MAYA_BACKEND === "hybrid"){
        // Get the last user message to analyze
        var lastUserMessage = "";
        for(var i = messages.length - 1; i >= 0; i--){
          if(messages[i].role === "user"){
            lastUserMessage = String(messages[i].content || "").toLowerCase();
            break;
          }
        }

        // Check if query needs internet search (use Gemini)
        var needsSearch = false;
        for(var k = 0; k < GEMINI_TRIGGER_KEYWORDS.length; k++){
          if(lastUserMessage.indexOf(GEMINI_TRIGGER_KEYWORDS[k]) !== -1){
            needsSearch = true;
            break;
          }
        }

        if(needsSearch && GEMINI_API_KEY && HYBRID_USE_GEMINI_FOR_SEARCH){
          console.log("MAYA HYBRID: Using Gemini (internet search needed)");
          return await mayaCallGemini(messages, onToken);
        } else if(OPENAI_API_KEY && HYBRID_USE_OPENAI_FOR_REASONING){
          console.log("MAYA HYBRID: Using OpenAI (reasoning/conversation)");
          return await mayaCallOpenAI(messages, onToken);
        } else if(GEMINI_API_KEY){
          console.log("MAYA HYBRID: Fallback to Gemini");
          return await mayaCallGemini(messages, onToken);
        } else {
          throw new Error("MAYA_OFFLINE: No API keys configured");
        }
      } else if(MAYA_BACKEND === "gemini"){
        return await mayaCallGemini(messages, onToken);
      } else {
        return await mayaCallOpenAI(messages, onToken);
      }
    }

    // Google Gemini API call (DISABLED - using OpenAI only)
    async function mayaCallGemini(messages, onToken){
      // Gemini is disabled - redirect to OpenAI
      console.log("MAYA: Gemini disabled, using OpenAI instead");
      return await mayaCallOpenAI(messages, onToken);
    }

    // Tavily Web Search function
    async function mayaSearchWeb(query){
      if(!TAVILY_API_KEY){
        console.warn("MAYA: Tavily API key not configured, skipping web search");
        return null;
      }

      try{
        console.log("🔍 MAYA: Searching web for:", query);

        var response = await fetch(TAVILY_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            api_key: TAVILY_API_KEY,
            query: query,
            search_depth: "basic", // "basic" or "advanced"
            include_answer: true,
            include_raw_content: false,
            max_results: 5,
            include_domains: [],
            exclude_domains: []
          })
        });

        if(!response.ok){
          var errorText = await response.text();
          console.error("MAYA: Tavily search failed:", errorText);
          return null;
        }

        var data = await response.json();
        console.log("✅ MAYA: Web search results:", data);

        // Format search results for OpenAI
        var searchContext = "";

        if(data.answer){
          searchContext += "Quick Answer: " + data.answer + "\n\n";
        }

        if(data.results && data.results.length > 0){
          searchContext += "Web Search Results:\n\n";
          data.results.forEach(function(result, idx){
            searchContext += (idx + 1) + ". " + result.title + "\n";
            searchContext += "   URL: " + result.url + "\n";
            searchContext += "   " + result.content + "\n\n";
          });
        }

        return searchContext;
      }catch(err){
        console.error("MAYA: Web search error:", err);
        return null;
      }
    }

    // Check if query needs web search
    function mayaNeedsWebSearch(query){
      if(!TAVILY_ENABLED || !TAVILY_API_KEY) return false;

      var lowerQuery = query.toLowerCase();

      // Never web search for internal monitoring/screen requests
      var monitoringKeywords = ["monitor", "screen", "screenshot", "check on", "what is", "doing right now"];
      for(var k = 0; k < monitoringKeywords.length; k++){
        if(lowerQuery.includes(monitoringKeywords[k])){
          return false;
        }
      }

      // Check for search keywords
      for(var i = 0; i < WEB_SEARCH_KEYWORDS.length; i++){
        if(lowerQuery.includes(WEB_SEARCH_KEYWORDS[i])){
          return true;
        }
      }

      // Check for question words that often need current info
      var questionPatterns = [
        /what (is|are|was|were) the (latest|current|recent)/i,
        /who (is|are|was|were)/i,
        /when (is|are|was|were|did)/i,
        /where (is|are|can)/i,
        /how (much|many) (is|are|does|do)/i
      ];

      for(var j = 0; j < questionPatterns.length; j++){
        if(questionPatterns[j].test(query)){
          return true;
        }
      }

      return false;
    }

    // OpenAI API call with web search
    async function mayaCallOpenAI(messages, onToken){
      if(!OPENAI_API_KEY){
        throw new Error("MAYA_OFFLINE: OpenAI API key not configured");
      }

      // Check if we need web search for the latest user query
      var webSearchContext = "";
      if(messages.length > 0){
        var lastUserMessage = null;
        for(var i = messages.length - 1; i >= 0; i--){
          if(messages[i].role === "user"){
            lastUserMessage = messages[i].content;
            break;
          }
        }

        if(lastUserMessage && mayaNeedsWebSearch(lastUserMessage)){
          console.log("🌐 MAYA: Query needs web search, fetching latest information...");
          webSearchContext = await mayaSearchWeb(lastUserMessage);
        }
      }

      // Get location data if available
      var locationData = await mayaGetLocation();
      var locationContext = "";
      if(locationData){
        locationContext = "\n\nUser's current location: Latitude " + locationData.latitude.toFixed(6) +
                         ", Longitude " + locationData.longitude.toFixed(6) +
                         " (accuracy: " + Math.round(locationData.accuracy) + "m)" +
                         "\nUse this location information to provide location-aware responses for weather, nearby places, local time, etc.";
        console.log("MAYA: Including location data in OpenAI request:", locationContext);
      }

      // Build OpenAI chat messages from MAYA conversation
      var systemParts=[];
      var chatMessages=[];
      try{
        for(var i=0;i<messages.length;i++){
          var m=messages[i];
          if(!m||!m.role||!m.content)continue;
          if(m.role==="system"){
            systemParts.push(String(m.content||""));
          }else{
            var roleName=m.role==="assistant"?"assistant":"user";

            // Check if this is the last user message and we have a screenshot
            var isLastUserMessage = (i === messages.length - 1 && m.role === "user");

            if(isLastUserMessage && mayaLastScreenshot){
              // Use vision format with image
              chatMessages.push({
                role: roleName,
                content: [
                  {
                    type: "text",
                    text: String(m.content || "")
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: mayaLastScreenshot,
                      detail: "high"
                    }
                  }
                ]
              });
              console.log("MAYA: Added screenshot to OpenAI request");
            } else {
              // Regular text message
              chatMessages.push({
                role:roleName,
                content:String(m.content||"")
              });
            }
          }
        }
      }catch(_){ }

      // Add web search context to system message
      if(webSearchContext){
        systemParts.push("Current Web Search Results:\n" + webSearchContext);
        console.log("✅ MAYA: Added web search context to OpenAI request");
      }

      // Add location context to system message
      if(locationContext){
        systemParts.push(locationContext);
      }

      if(systemParts.length){
        chatMessages.unshift({
          role:"system",
          content:systemParts.join("\n\n")
        });
      }

      if(!chatMessages.length){
        chatMessages.push({
          role:"user",
          content:"User: (no explicit input yet)."
        });
      }

      var streaming = (typeof onToken==="function");

      var body={
        model:OPENAI_MODEL,
        messages:chatMessages,
        temperature:0.7,
        stream:streaming
      };

      var res=await fetch(OPENAI_API_URL,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":"Bearer "+OPENAI_API_KEY
        },
        signal: mayaFetchAbort ? mayaFetchAbort.signal : undefined,
        body:JSON.stringify(body)
      });
      if(!res.ok){
        var text=await res.text();
        throw new Error("OPENAI_HTTP_ERROR:"+text);
      }

      // Non-streaming mode (no token handler provided)
      if(!streaming){
        var data=await res.json();
        var contentText="";
        try{
          if(data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content){
            contentText=String(data.choices[0].message.content||"").trim();
          }
        }catch(_){ }
        if(!contentText)throw new Error("MAYA_NO_CONTENT");
        return contentText;
      }

      // Streaming mode using SSE from OpenAI
      var reader = res.body && res.body.getReader ? res.body.getReader() : null;
      var fullText="";

      // If the browser does not support streaming, fall back to normal JSON
      if(!reader){
        var dataFallback=await res.json();
        try{
          if(dataFallback.choices&&dataFallback.choices[0]&&dataFallback.choices[0].message&&dataFallback.choices[0].message.content){
            fullText=String(dataFallback.choices[0].message.content||"");
          }
        }catch(_){ }
        fullText=String(fullText||"").trim();
        if(!fullText)throw new Error("MAYA_NO_CONTENT");
        if(onToken)onToken(fullText,fullText);
        return fullText;
      }

      var decoder=new TextDecoder("utf-8");
      var buffer="";
      var done=false;
      while(!done){
        var chunk=await reader.read();
        if(chunk.done){
          break;
        }
        buffer+=decoder.decode(chunk.value,{stream:true});
        var parts=buffer.split("\n");
        buffer=parts.pop();
        for(var i=0;i<parts.length;i++){
          var line=parts[i].trim();
          if(!line || line.indexOf("data:")!==0)continue;
          var payload=line.substring(5).trim();
          if(payload==="[DONE]"){
            done=true;
            break;
          }
          var deltaText="";
          try{
            var parsed=JSON.parse(payload);
            if(parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content){
              deltaText=String(parsed.choices[0].delta.content||"");
            }
          }catch(_){ }
          if(deltaText){
            fullText+=deltaText;
            if(onToken)onToken(deltaText,fullText);
          }
        }
      }
      try{ decoder.decode(); }catch(_){ }

      fullText=String(fullText||"").trim();
      if(!fullText)throw new Error("MAYA_NO_CONTENT");
      return fullText;
    }


    // Voice output: ElevenLabs + browser fallback (original tone, sentence-chunked)
    function mayaPrepareSpokenText(text){
      if(!text)return "";
      var t=String(text);
      // Lightly format for ElevenLabs so it sounds calmer and more paced
      // Normalize whitespace
      t=t.replace(/\s+/g," ").trim();
      // Add a little extra pause after sentence endings
      t=t.replace(/([.!?])\s+/g,"$1  ");
      // Keep paragraphs as soft breaks
      return t;
    }

    function mayaSplitSpokenText(text){
      var cleaned=mayaPrepareSpokenText(text);
      // Increased segment size to 2000 chars for fewer pauses and smoother speech
      if(cleaned.length<=2000) return [cleaned];
      var sentences=cleaned.match(/[^.!?]+[.!?]*/g)||[cleaned];
      var segments=[];
      var current="";
      for(var i=0;i<sentences.length;i++){
        var s=sentences[i].trim();
        if(!s) continue;
        var candidate=(current?current+" ":"")+s;
        if(candidate.length>2000){
          if(current) segments.push(current.trim());
          current=s;
        }else{
          current=candidate;
        }
      }
      if(current) segments.push(current.trim());
      return segments;
    }

    // Split text into sentences for faster processing
    // Optimized to batch small sentences together to save API calls
    function mayaSplitIntoSentences(text){
      console.log("📝 MAYA: mayaSplitIntoSentences called with text:", text.substring(0, 200) + "...");

      // Split by sentence endings, keeping the punctuation
      var sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
      sentences = sentences.map(function(s){ return s.trim(); }).filter(function(s){ return s.length > 0; });

      console.log("✂️ MAYA: Split into " + sentences.length + " raw sentences:", sentences);

      // Batch small sentences together to reduce API calls and save credits
      var batched = [];
      var currentBatch = "";
      var minBatchLength = 100; // Minimum characters per batch (increased for better batching)

      for(var i = 0; i < sentences.length; i++){
        var sentence = sentences[i];
        console.log("🔄 MAYA: Processing sentence " + (i+1) + "/" + sentences.length + ": '" + sentence.substring(0, 50) + "...'");

        // If adding this sentence keeps us under max length, batch it
        if(currentBatch.length + sentence.length + 1 < ELEVENLABS_MAX_SENTENCE_LENGTH){
          currentBatch += (currentBatch ? " " : "") + sentence;
          console.log("  ➕ Added to batch (batch length now: " + currentBatch.length + ")");
        } else {
          // Current batch would be too long, push current batch and start new one
          if(currentBatch){
            console.log("  📦 Batch full, pushing batch: '" + currentBatch.substring(0, 50) + "...' (length: " + currentBatch.length + ")");
            batched.push(currentBatch);
          }
          currentBatch = sentence;
          console.log("  🆕 Started new batch with this sentence");
        }
      }

      // Push any remaining batch
      if(currentBatch){
        console.log("📦 MAYA: Pushing final batch: '" + currentBatch.substring(0, 50) + "...' (length: " + currentBatch.length + ")");
        batched.push(currentBatch);
      }

      console.log("💰 MAYA: Optimized " + sentences.length + " sentences into " + batched.length + " batches (saving " + (sentences.length - batched.length) + " API calls)");
      console.log("📋 MAYA: Final batches:", batched);
      return batched;
    }

    // Clean ElevenLabs-only speech implementation with sentence-by-sentence processing
    var mayaSpeechQueue = [];
    var mayaCurrentAudio = null;
    var mayaProcessingSpeech = false;
    var mayaStreamingSpeechActive = false;
    var mayaStreamingSpeechLastIndex = 0;
    var mayaStreamingSpeechBuffer = "";
    var mayaPrefetchedAudio = null; // Store prefetched audio for next sentence

    // Audio cache to save credits on repeated phrases
    var mayaAudioCache = new Map(); // Cache audio blobs by text hash
    var mayaAudioCacheMaxSize = 50; // Max cached items

    // Simple hash function for cache keys
    function mayaHashText(text) {
      var hash = 0;
      for (var i = 0; i < text.length; i++) {
        var char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString();
    }

    async function mayaSpeak(text){
      console.log("🎤 MAYA: mayaSpeak called, speechEnabled:", mayaSpeechEnabled, "text length:", text ? text.length : 0);

      if(!mayaSpeechEnabled){
        console.log("MAYA: Speech disabled");
        return;
      }

      // If already speaking, stop current speech
      if(mayaSpeaking){
        console.log("MAYA: Already speaking, stopping");
        mayaStopSpeaking();
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for stop to complete
      }

      if(!text || text.trim().length === 0){
        console.log("MAYA: No text to speak");
        return;
      }

      // Stop listening to prevent feedback
      if(mayaListening){
        console.log("🛑 MAYA: Stopping mic to prevent feedback");
        mayaStopListening();
      }

      // Set speaking state
      mayaSpeaking=true;
      if(mayaBlobCard) mayaBlobCard.classList.add("maya-blob-speaking");
      if(mayaListeningIndicator) mayaListeningIndicator.classList.remove("active");

      // Prepare text
      var cleanText = mayaPrepareSpokenText(text);
      console.log("📝 MAYA: Prepared text for speech:", cleanText.substring(0, 100) + "...");

      // Split into sentences for faster processing
      var sentences = mayaSplitIntoSentences(cleanText);
      console.log("✂️ MAYA: Split into", sentences.length, "sentences:", sentences);

      // Add sentences to queue
      mayaSpeechQueue = sentences;
      console.log("📋 MAYA: Speech queue populated with", mayaSpeechQueue.length, "sentences");

      // Start processing queue
      console.log("🚀 MAYA: Starting speech queue processing...");
      mayaProcessSpeechQueue();
    }

    // Fetch audio for a sentence with retry logic and caching
    async function mayaFetchSentenceAudio(sentence, retryCount = 0){
      console.log("MAYA: mayaFetchSentenceAudio called, sentence:", sentence.substring(0, 50) + "...", "retry:", retryCount);

      // Trim and limit sentence length to save credits
      sentence = sentence.trim();
      if(sentence.length > ELEVENLABS_MAX_SENTENCE_LENGTH){
        console.log("MAYA: Sentence too long (" + sentence.length + " chars), truncating to " + ELEVENLABS_MAX_SENTENCE_LENGTH);
        sentence = sentence.substring(0, ELEVENLABS_MAX_SENTENCE_LENGTH) + "...";
      }

      // Check cache first to save credits
      if(ELEVENLABS_CACHE_AUDIO){
        var cacheKey = mayaHashText(sentence);
        if(mayaAudioCache.has(cacheKey)){
          console.log("💰 MAYA: Using cached audio (saving credits!)");
          return mayaAudioCache.get(cacheKey);
        }
      }

      console.log("🔑 MAYA: Using voice ID:", ELEVENLABS_VOICE_ID);
      console.log("🔑 MAYA: API key present:", ELEVENLABS_API_KEY ? "YES" : "NO");

      try {
        // Use turbo model for faster & cheaper generation
        var modelId = ELEVENLABS_USE_TURBO_MODEL ? "eleven_turbo_v2_5" : "eleven_multilingual_v2";

        var requestBody = {
          text: sentence,
          model_id: modelId,
          voice_settings: {
            stability: 0.70,        // Higher for calmer, more consistent voice
            similarity_boost: 0.80, // Higher for better voice quality
            style: 0.3,             // Some style for natural expression
            use_speaker_boost: true // Enable for clearer voice
          },
          optimize_streaming_latency: 2, // Balanced (not max speed)
          output_format: "mp3_44100_128" // Higher quality audio
        };

        console.log("📤 MAYA: Sending TTS request (model: " + modelId + ")...");

        var elevenLabsBaseUrl = (window.ELEVENLABS_API_URL || "https://api.elevenlabs.io/v1/text-to-speech/");
        var response = await fetch(elevenLabsBaseUrl + ELEVENLABS_VOICE_ID, {
          method: "POST",
          headers: {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": ELEVENLABS_API_KEY
          },
          body: JSON.stringify(requestBody)
        });

        console.log("📥 MAYA: TTS response received, status:", response.status, "ok:", response.ok);

        if(!response.ok){
          var errorText = await response.text();
          console.error("MAYA: ElevenLabs API error:", response.status, errorText);

          // Retry on server errors (5xx) or rate limits (429)
          if((response.status >= 500 || response.status === 429) && retryCount < ELEVENLABS_MAX_RETRIES){
            console.log("🔄 MAYA: Retrying TTS request (attempt " + (retryCount + 1) + "/" + ELEVENLABS_MAX_RETRIES + ")");
            await new Promise(resolve => setTimeout(resolve, ELEVENLABS_RETRY_DELAY * (retryCount + 1)));
            return await mayaFetchSentenceAudio(sentence, retryCount + 1);
          }

          throw new Error("TTS API error: " + response.status + " - " + errorText);
        }

        var audioBlob = await response.blob();
        console.log("MAYA: Audio blob received, size:", audioBlob.size, "type:", audioBlob.type);

        if(!audioBlob || audioBlob.size === 0){
          throw new Error("Invalid audio blob - size is 0");
        }

        // Cache the audio to save credits on repeated phrases
        if(ELEVENLABS_CACHE_AUDIO){
          var cacheKey = mayaHashText(sentence);
          mayaAudioCache.set(cacheKey, audioBlob);

          // Limit cache size
          if(mayaAudioCache.size > mayaAudioCacheMaxSize){
            var firstKey = mayaAudioCache.keys().next().value;
            mayaAudioCache.delete(firstKey);
            console.log("🗑️ MAYA: Cache full, removed oldest entry");
          }
          console.log("💾 MAYA: Cached audio (cache size: " + mayaAudioCache.size + ")");
        }

        return audioBlob;
      } catch(err) {
        console.error("MAYA: TTS fetch error:", err);
        console.error("MAYA: Error name:", err.name, "message:", err.message);

        // Retry on network errors
        if(retryCount < ELEVENLABS_MAX_RETRIES && (err.name === 'TypeError' || err.message.includes('fetch'))){
          console.log("🔄 MAYA: Network error, retrying TTS (attempt " + (retryCount + 1) + "/" + ELEVENLABS_MAX_RETRIES + ")");
          await new Promise(resolve => setTimeout(resolve, ELEVENLABS_RETRY_DELAY * (retryCount + 1)));
          return await mayaFetchSentenceAudio(sentence, retryCount + 1);
        }
        throw err;
      }
    }

    // Process speech queue with prefetching to eliminate pauses
    async function mayaProcessSpeechQueue(){
      console.log("🔄 MAYA: mayaProcessSpeechQueue called, processing:", mayaProcessingSpeech, "queue length:", mayaSpeechQueue.length);

      if(mayaProcessingSpeech){
        console.log("⏸️ MAYA: Already processing speech queue");
        return;
      }

      if(mayaSpeechQueue.length === 0){
        console.log("📭 MAYA: Speech queue is empty");
        // Check if streaming is done
        if(!mayaStreamingSpeechActive && mayaSpeaking){
          console.log("MAYA: Streaming done, finishing speech");
          mayaFinishSpeech();
        }
        return;
      }

      console.log("▶️ MAYA: Starting speech queue processing with", mayaSpeechQueue.length, "sentences");
      mayaProcessingSpeech = true;

      while(mayaSpeechQueue.length > 0 && mayaSpeaking){
        var sentence = mayaSpeechQueue.shift();
        console.log("MAYA: Processing sentence:", sentence.substring(0, 50) + "...");

        var audioBlob = null;

        try{
          // Check if we have prefetched audio
          if(mayaPrefetchedAudio){
            console.log("⚡ MAYA: Using prefetched audio");
            audioBlob = mayaPrefetchedAudio;
            mayaPrefetchedAudio = null;
          }else{
            // Fetch audio for this sentence
            console.log("MAYA: Fetching audio for sentence from ElevenLabs...");
            audioBlob = await mayaFetchSentenceAudio(sentence);
            console.log("MAYA: Audio fetched successfully, blob size:", audioBlob.size);
          }

          // Start prefetching next sentence while current one plays
          var prefetchPromise = null;
          if(mayaSpeechQueue.length > 0){
            var nextSentence = mayaSpeechQueue[0];
            console.log("⏭️ MAYA: Prefetching next sentence:", nextSentence.substring(0, 30) + "...");
            prefetchPromise = mayaFetchSentenceAudio(nextSentence).then(function(blob){
              mayaPrefetchedAudio = blob;
              console.log("MAYA: Prefetch complete, blob size:", blob.size);
            }).catch(function(err){
              console.error("MAYA: Prefetch error:", err);
            });
          }

          // Play current sentence
          console.log("MAYA: Playing audio blob...");
          await mayaPlayAudioBlob(audioBlob);
          console.log("MAYA: Audio playback complete");

          // Wait for prefetch to complete if it's still running
          if(prefetchPromise){
            await prefetchPromise;
          }

        }catch(error){
          console.error("MAYA: Error processing sentence:", error);
          console.error("MAYA: Error stack:", error.stack);

          // If force speech is enabled, try to continue with next sentence
          if(MAYA_FORCE_SPEECH){
            console.log("🔄 MAYA: Force speech enabled - continuing with next sentence");
            // Continue with next sentence
          } else {
            // Stop speech on error
            console.log("🛑 MAYA: Stopping speech due to error");
            mayaStopSpeaking();
            break;
          }
        }
      }

      mayaProcessingSpeech = false;
      console.log("🏁 MAYA: Speech queue processing complete");

      // If queue is empty and streaming is done, finish
      if(mayaSpeechQueue.length === 0 && !mayaStreamingSpeechActive && mayaSpeaking){
        console.log("MAYA: All done, finishing speech");
        mayaFinishSpeech();
      }
    }

    // Play audio blob and return promise that resolves when done
    function mayaPlayAudioBlob(audioBlob){
      return new Promise(function(resolve, reject){
        var audioUrl = URL.createObjectURL(audioBlob);
        var audio = new Audio(audioUrl);
        audio.volume = 1.0;
        audio.playbackRate = MAYA_VOICE_SPEED; // Configurable speed for calmer delivery
        mayaCurrentAudio = audio;

        audio.onended = function(){
          console.log("MAYA: Sentence playback ended");
          URL.revokeObjectURL(audioUrl);
          mayaCurrentAudio = null;
          resolve();
        };

        audio.onerror = function(e){
          console.error("MAYA: Audio playback error:", e);
          URL.revokeObjectURL(audioUrl);
          mayaCurrentAudio = null;
          reject(e);
        };

        audio.play().catch(function(e){
          console.error("MAYA: Play error:", e);
          URL.revokeObjectURL(audioUrl);
          mayaCurrentAudio = null;
          reject(e);
        });
      });
    }

    // Stop speaking
    function mayaStopSpeaking(){
      console.log("MAYA: Stopping speech");

      // Clear queue and streaming state
      mayaSpeechQueue = [];
      mayaProcessingSpeech = false;
      mayaStreamingSpeechActive = false;
      mayaStreamingSpeechLastIndex = 0;
      mayaStreamingSpeechBuffer = "";
      mayaPrefetchedAudio = null;

      // Stop current audio
      if(mayaCurrentAudio){
        try{
          mayaCurrentAudio.pause();
          mayaCurrentAudio.src = "";
        }catch(_){}
        mayaCurrentAudio = null;
      }

      mayaSpeaking = false;
      if(mayaBlobCard) mayaBlobCard.classList.remove("maya-blob-speaking");
    }

    // Finish speech and restart listening
    function mayaFinishSpeech(){
      console.log("MAYA: Speech finished");

      // Clear any remaining queue
      mayaSpeechQueue = [];
      mayaProcessingSpeech = false;
      mayaCurrentAudio = null;
      mayaStreamingSpeechActive = false;
      mayaStreamingSpeechLastIndex = 0;
      mayaStreamingSpeechBuffer = "";
      mayaPrefetchedAudio = null;

      mayaSpeaking = false;
      if(mayaBlobCard) mayaBlobCard.classList.remove("maya-blob-speaking");

      // CRITICAL: Only restart mic if MAYA is visible, in voice mode, and NOT sending
      // This prevents mic from activating while AI is still generating response
      if(mayaVisible && mayaInputMode==="voice" && mayaRecognition && !mayaSending){
        setTimeout(function(){
          if(mayaVisible && !mayaListening && !mayaSpeaking && !mayaSending){
            console.log("MAYA: AI finished speaking - restarting mic");
            mayaStartListening();
          }else{
            console.log("MAYA: ⏸️ Not restarting mic - mayaVisible:", mayaVisible, "mayaListening:", mayaListening, "mayaSpeaking:", mayaSpeaking, "mayaSending:", mayaSending);
          }
        }, 800); // Delay for smoother transition
      }
    }

    // Start streaming speech mode
    function mayaStartStreamingSpeech(){
      console.log("MAYA: Starting streaming speech mode");

      // Stop listening to prevent feedback
      if(mayaListening){
        mayaStopListening();
      }

      // Set speaking state
      mayaSpeaking = true;
      mayaStreamingSpeechActive = true;
      mayaStreamingSpeechLastIndex = 0;
      mayaStreamingSpeechBuffer = "";

      if(mayaBlobCard) mayaBlobCard.classList.add("maya-blob-speaking");
      if(mayaListeningIndicator) mayaListeningIndicator.classList.remove("active");
    }

    // Stream speech from incoming text as sentences complete
    function mayaStreamSpeechFromText(fullText){
      if(!mayaStreamingSpeechActive || !mayaSpeechEnabled) return;

      // Clean the text
      var cleanText = mayaPrepareSpokenText(fullText);

      // Find complete sentences that we haven't spoken yet
      var sentences = mayaSplitIntoSentences(cleanText);

      // Add new complete sentences to queue
      for(var i = mayaStreamingSpeechLastIndex; i < sentences.length; i++){
        var sentence = sentences[i];

        // Only add if it ends with proper punctuation (complete sentence)
        if(/[.!?]$/.test(sentence)){
          console.log("MAYA: Adding sentence to speech queue:", sentence.substring(0, 50) + "...");
          mayaSpeechQueue.push(sentence);
          mayaStreamingSpeechLastIndex = i + 1;

          // Immediately start processing if not already processing
          // This ensures the next sentence starts converting while current one plays
          if(!mayaProcessingSpeech){
            mayaProcessSpeechQueue();
          }
        }
      }
    }

    // Finalize streaming speech with any remaining text
    function mayaFinalizeStreamingSpeech(fullText){
      if(!mayaStreamingSpeechActive) return;

      console.log("MAYA: Finalizing streaming speech");

      // Clean the text
      var cleanText = mayaPrepareSpokenText(fullText);

      // Get all sentences
      var sentences = mayaSplitIntoSentences(cleanText);

      // Add any remaining sentences that weren't added yet
      for(var i = mayaStreamingSpeechLastIndex; i < sentences.length; i++){
        var sentence = sentences[i];
        if(sentence.trim().length > 0){
          console.log("MAYA: Adding final sentence to queue:", sentence.substring(0, 50) + "...");
          mayaSpeechQueue.push(sentence);
        }
      }

      mayaStreamingSpeechActive = false;

      // Start processing if not already
      if(!mayaProcessingSpeech && mayaSpeechQueue.length > 0){
        mayaProcessSpeechQueue();
      }
    }
    function mayaToggleSpeech(){
      mayaSpeechEnabled=!mayaSpeechEnabled;
      if(mayaSpeechEnabled){
        mayaSpeakerBtn.textContent="🔊";
        mayaSpeakerBtn.classList.remove("maya-muted");
        mayaSpeakerBtn.title="Mute AI voice";
      }else{
        mayaSpeakerBtn.textContent="🔇";
        mayaSpeakerBtn.classList.add("maya-muted");
        mayaSpeakerBtn.title="Unmute AI voice";
        if(mayaSpeaking){
          mayaSpeechSynth.cancel();
          mayaSpeaking=false;
          mayaSpeakerBtn.classList.remove("maya-speaking");
          mayaStatusText.textContent="Ready";

        }
      }
    }

    async function mayaClearConversation(){
      if(!confirm("Clear all conversation history?"))return;
      mayaMessages.innerHTML="";

      // Rebuild system prompt with fresh location
      try{
        MAYA_SYSTEM_PROMPT = await mayaBuildSystemPrompt();
      }catch(e){
        console.warn("MAYA: Failed to rebuild system prompt:", e);
      }

      mayaConversation=[
        {
          role:"system",
          content:MAYA_SYSTEM_PROMPT
        }
      ];
      if(!mayaInitialized){
        mayaAddMessage("assistant","Hi! I'm MAYA, your AI assistant. I'm here to help with anything you need - just speak to me!");
        mayaInitialized=true;
      }
    }

    async function mayaHandleUser(text, retryCount = 0){
      var trimmed=(text||"").trim();
      if(!trimmed||mayaSending)return;
      mayaSending=true;
      if(mayaKeyboardInput)mayaKeyboardInput.value="";

      // CRITICAL: Stop mic immediately when user sends message
      console.log("MAYA: User sent message - stopping mic to prevent overlap");
      mayaStopListening();

      // Only add message on first attempt (not retries)
      if(retryCount === 0){
        mayaAddMessage("user",trimmed);
        mayaConversation.push({role:"user",content:trimmed});
      }

      // Detect if user is asking about the current page/website or screen
      var isWebQuery = /\b(this page|this website|this site|this web|current page|the page|the website|the site|what.*here|analyze.*page|analyze.*website|analyze.*site|study.*page|study.*website|study.*site|summarize.*page|summarize.*website|read.*page|read.*website|what.*this|on this|crawl|scrape|extract|page content|website content|web.*page.*for|site.*for)\b/i.test(trimmed);
      var isScreenQuery = /\b(my screen|what.*see|what.*looking at|screenshot|capture.*screen|show.*screen|analyze.*screen|what.*display|what.*on screen|screen shows|visible on|can you see)\b/i.test(trimmed);

      // CRITICAL FIX: Only analyze page/screen when explicitly requested
      // Don't automatically capture screen in PIP mode for every message
      var shouldAnalyzePage = isWebQuery || isScreenQuery;

      if (shouldAnalyzePage) {
        console.log("MAYA: Page analysis needed (web query, screen query, or PIP mode)...");
        if (typeof mayaStartAiDots === 'function') {
          mayaStartAiDots(mayaPipActive ? "Reading page behind PIP..." : "Analyzing page...");
        }

        var domAnalysis = null;
        var domSuccess = false;

        try {
          // If in PIP mode, try to analyze active tab/window behind PIP
          if(mayaPipActive){
            console.log("MAYA: In PIP mode - attempting to analyze window behind PIP");
            domAnalysis = await mayaAnalyzeActiveTab();
          } else {
            // Analyze current page
            domAnalysis = mayaAnalyzeDOM();
          }

          if(domAnalysis && domAnalysis.textContent && domAnalysis.textContent.length > 50){
            console.log("MAYA: DOM analysis successful");
            domSuccess = true;
            var domContext = "\n\n=== WEBPAGE CONTENT (AUTOMATICALLY EXTRACTED) ===\n" +
              "The user is asking about this webpage. The content has been automatically extracted for you.\n" +
              "You MUST analyze this content and provide a helpful response based on it.\n\n" +
              "URL: " + domAnalysis.url + "\n" +
              "Title: " + domAnalysis.title + "\n" +
              "Headings: " + JSON.stringify(domAnalysis.headings ? domAnalysis.headings.slice(0, 10) : []) + "\n" +
              "Links: " + (domAnalysis.links ? domAnalysis.links.length : 0) + " links found\n" +
              "Images: " + (domAnalysis.images ? domAnalysis.images.length : 0) + " images found\n" +
              "Forms: " + (domAnalysis.forms ? domAnalysis.forms.length : 0) + " forms found\n" +
              "Main Content: " + domAnalysis.textContent.substring(0, 2000) + "\n" +
              "=== END WEBPAGE CONTENT ===\n";
            // Add DOM context to the user's message
            mayaConversation[mayaConversation.length - 1].content += domContext;

            // Show success message with page title
            var successMsg = mayaPipActive
              ? 'Analyzed active browser tab: ' + (domAnalysis.title || 'Untitled')
              : 'Page analyzed successfully!';
            mayaAddMessage('system', successMsg);
          } else if(domAnalysis && (!domAnalysis.textContent || domAnalysis.textContent.length <= 50)){
            console.log("MAYA: ⚠️ DOM analysis returned insufficient content");
          }
        } catch(e) {
          console.error("MAYA: DOM analysis failed:", e);
        }

        // PRIORITY 2: Fallback to screenshot ONLY if DOM completely failed or is unavailable
        // For BOTH web and screen queries: always prefer DOM; only capture screenshot when DOM fails
        var shouldCaptureScreen = false;

        if (!domSuccess) {
          // DOM analysis not available or returned insufficient content
          shouldCaptureScreen = true;
          if (mayaPipActive) {
            console.log("MAYA: PIP mode - DOM unavailable, falling back to screen capture of window behind PIP");
          } else if (isScreenQuery) {
            console.log("MAYA: Screen query but DOM analysis unavailable - falling back to screenshot");
          } else if (isWebQuery) {
            console.log("MAYA: Web query but DOM analysis failed - falling back to screenshot");
          } else {
            console.log("MAYA: DOM analysis unavailable - falling back to screenshot");
          }
        }

        if (shouldCaptureScreen) {
          if (typeof mayaStartAiDots === 'function') {
            mayaStartAiDots(mayaPipActive ? "Capturing screen behind PIP..." : "Analyzing screen...");
          }

          // Capture screenshot silently - no permission messages
          try {
            var screenshot = await mayaCaptureScreen();
            if(screenshot){
              console.log("MAYA: ✅ Screenshot captured successfully, will be sent with request");
              var screenshotMsg = mayaPipActive
                ? 'Screen behind PIP captured successfully!'
                : 'Screen analyzed successfully!';
              mayaAddMessage('system', screenshotMsg);
              // Screenshot is now in mayaLastScreenshot and will be automatically included in the API call
            } else {
              console.log("MAYA: Screenshot capture unavailable - continuing with text-only analysis");
              mayaLastScreenshot = null; // Clear any old screenshot
            }
          } catch(e) {
            console.log("MAYA: Screenshot capture error - continuing with text-only analysis:", e);
            mayaLastScreenshot = null; // Clear any old screenshot
          }
        } else if (domSuccess) {
          console.log("MAYA: ✅ DOM analysis successful - skipping screenshot capture");
        }

        // DON'T stop AI dots here - keep them visible during API call
        // They will be stopped when the response is received
      }

      mayaShowThinkingBubble();

      var fullReply="";
      var gotFirstToken=false;
      var streamingSpeechBuffer="";
      var lastSpokenLength=0;

      try{
        mayaFetchAbort = new AbortController();

        var reply=await mayaCallBackend(mayaConversation,function(delta,full){
          fullReply=String(full||"");
          if(!gotFirstToken){
            gotFirstToken=true;
            mayaHideThinkingBubble();
            mayaStartStreamingAssistantMessage();

            // DON'T start streaming speech - wait for complete response to save credits
            // Streaming speech disabled to prevent wasting credits on partial responses
          }
          mayaUpdateStreamingAssistantMessage(fullReply);

          // DON'T stream speech during generation - wait for complete response
          // This saves credits by only making TTS calls when response is final
        });

        if(!fullReply){
          fullReply=String(reply||"");
        }

        mayaHideThinkingBubble();

        // Stop AI dots animation when response is complete
        if (typeof mayaStopAiDots === 'function') {
          mayaStopAiDots();
        }

        // Clear screenshot after it's been used (so it doesn't get sent with next message)
        if(mayaLastScreenshot){
          console.log("MAYA: Clearing screenshot from memory");
          mayaLastScreenshot = null;
        }

        if(!gotFirstToken){
          // Non-streaming path (older browsers)
          mayaConversation.push({role:"assistant",content:fullReply});
          mayaAddMessage("assistant",fullReply);

          // Speak the full reply
          if(mayaSpeechEnabled && fullReply){
            console.log("MAYA: Calling mayaSpeak with reply:", fullReply.substring(0, 50) + "...");
            setTimeout(function(){mayaSpeak(fullReply);},100);
          }
        }else{
          // We already created & updated the streaming bubble; just ensure it has final text
          mayaConversation.push({role:"assistant",content:fullReply});
          mayaUpdateStreamingAssistantMessage(fullReply);

          // Check for browser action requests in the response
          mayaProcessBrowserActions(fullReply);

          // Speak the COMPLETE response (not streaming) to save credits
          if(mayaSpeechEnabled && fullReply){
            console.log("MAYA: Response complete, calling mayaSpeak with full reply:", fullReply.substring(0, 50) + "...");
            setTimeout(function(){mayaSpeak(fullReply);}, 100);
          }
        }

      }catch(err){
        mayaHideThinkingBubble();

        // Stop AI dots animation on error
        if (typeof mayaStopAiDots === 'function') {
          mayaStopAiDots();
        }

        if(err && (err.name==="AbortError" || err.message==="MAYA_ABORTED")){
        }else{
          // Auto-retry on connection errors (up to 2 retries)
          var shouldRetry = false;
          var isConnectionError = false;

          if(err && err.message){
            var errMsg = String(err.message).toLowerCase();
            isConnectionError = errMsg.includes('fetch') ||
                               errMsg.includes('network') ||
                               errMsg.includes('connection') ||
                               errMsg.includes('timeout') ||
                               err.name === 'TypeError';
          }

          if(isConnectionError && retryCount < 2 && MAYA_AUTO_RETRY_CONNECTIONS){
            console.log("MAYA: Connection error detected, auto-retrying (attempt " + (retryCount + 1) + "/2)");

            mayaSending = false;
            mayaFetchAbort = null;

            // Remove the user message we added (will be re-added on retry)
            if(retryCount === 0 && mayaConversation.length > 0){
              mayaConversation.pop(); // Remove user message
            }

            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 1500 * (retryCount + 1)));

            // Retry the request
            return mayaHandleUser(trimmed, retryCount + 1);
          }

          // Show error message
          var userMsg="MAYA ran into a connection issue. Please try again in a moment.";

          // Detect offline errors (no API keys / not configured)
          if(
            err &&
            typeof err.message === "string" &&
            err.message.indexOf("MAYA_OFFLINE") === 0
          ){
            userMsg="MAYA is currently offline. Please check your API keys and try again.";
          }else if(err && typeof err.message==="string" && err.message.indexOf("MAYA_HTTP_ERROR:")===0){
            var raw=err.message.substring("MAYA_HTTP_ERROR:".length);
            try{
              var parsed=JSON.parse(raw);
              if(parsed && parsed.error && parsed.error.message){
                userMsg="API error: "+parsed.error.message;
                if(parsed.error.status){
                  userMsg+=" ("+parsed.error.status+")";
                }
              }
            }catch(_){ }
          }else if(isConnectionError){
            userMsg="I'm not able to automatically detect your location. Please try again in a moment, or if you have any more questions or need help with something else, just let me know!";
          }

          mayaAddMessage("assistant",userMsg);

          // Speak the error message so user knows what happened
          if(mayaSpeechEnabled){
            setTimeout(function(){
              mayaSpeak(userMsg);
            }, 500);
          }
        }
      }finally{
        mayaSending=false;
        mayaFetchAbort=null;
        if(mayaKeyboardInput)mayaKeyboardInput.focus();
      }
    }

    function mayaStopAll(){
      console.log("MAYA: Stopping all activities");

      // Stop any ongoing API requests
      try{
        if(mayaFetchAbort){
          mayaFetchAbort.abort();
        }
      }catch(_){ }
      mayaFetchAbort=null;

      // Stop speech
      mayaStopSpeaking();

      // Stop listening
      if(mayaRecognition && mayaListening){
        try{ mayaRecognition.stop(); }catch(_){ }
        mayaListening=false;
      }

    }



    function mayaToggleMute(){
      mayaSpeechEnabled = !mayaSpeechEnabled;
      console.log("MAYA: Toggled mute, speechEnabled now:", mayaSpeechEnabled);

      try{
        var icon = mayaMuteOverlay ? mayaMuteOverlay.querySelector('i') : null;
        if(icon){
          icon.className = mayaSpeechEnabled ? 'fi fi-rr-volume' : 'fi fi-rr-volume-mute';
        }
        if(mayaMuteOverlay){
          mayaMuteOverlay.title = mayaSpeechEnabled ? 'Mute AI voice' : 'Unmute AI voice';
          if(mayaSpeechEnabled){
            mayaMuteOverlay.classList.remove('muted');
          } else {
            mayaMuteOverlay.classList.add('muted');
          }
        }

        if(!mayaSpeechEnabled){
          console.log("MAYA: Speech disabled, stopping current speech");
          mayaStopSpeaking();
        }else{
          console.log("MAYA: Speech enabled");
        }
      }catch(_){ }
    }

    function mayaPlayInitSound(){
      try{
        var audioCtx=new(window.AudioContext||window.webkitAudioContext)();
        var oscillator=audioCtx.createOscillator();
        var gainNode=audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value=800;
        oscillator.type="sine";
        gainNode.gain.setValueAtTime(0.3,audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime+0.3);
      }catch(e){
        console.log("MAYA: Could not play init sound",e);
      }
    }
    function mayaShowPanel(){
      if(!mayaBlobShell)return;

      // Open in sidebar mode by default (not fullscreen)
      mayaBlobShell.classList.add("maya-side-panel");
      mayaVisible=true;
      mayaSidePanel=true;

      // Update minimize button tooltip for sidebar mode
      if(mayaMinimizeOverlay) mayaMinimizeOverlay.title = "Expand to fullscreen";

      // CRITICAL: Stop wake word detection when MAYA opens
      if(typeof wakeWordStop === 'function'){
        console.log("MAYA: Stopping wake word detection");
        wakeWordStop();
      }

      mayaPlayInitSound();

      if(mayaInputMode==="voice"){
        mayaEnsureVoiceStart();
      }else if(mayaInputMode==="keyboard"){
        if(mayaKeyboardInputContainer){
          mayaKeyboardInputContainer.classList.add("active");
        }
        if(mayaKeyboardInput){
          setTimeout(function(){
            mayaKeyboardInput.focus();
          },100);
        }
      }
    }
    function mayaHidePanel(){
      if(mayaBlobShell){
        mayaBlobShell.classList.remove("maya-expanded");
        mayaBlobShell.classList.remove("maya-side-panel");
        mayaBlobShell.style.animation = "";
      }
      if(mayaKeyboardInputContainer)mayaKeyboardInputContainer.classList.remove("active");
      if(mayaListeningIndicator)mayaListeningIndicator.classList.remove("active");
      mayaVisible=false;
      mayaSidePanel=false;

      // COMPLETE SHUTDOWN: Stop all AI activity when closing
      console.log("MAYA: Closing - stopping all AI activity");

      // Stop main voice recognition completely
      if(mayaRecognition){
        try{
          mayaRecognition.stop();
          mayaRecognition.abort();
        }catch(_){}
        mayaListening = false;
        mayaShouldRestartListening = false;
      }

      // Stop any ongoing speech
      mayaStopSpeaking();

      // CRITICAL: Restart wake word detection when MAYA closes
      setTimeout(function(){
        if(!mayaVisible && typeof wakeWordStart === 'function'){
          console.log("MAYA: Restarting wake word detection");
          wakeWordStart();
        }
      }, 500);

      // Abort any ongoing API calls
      if(mayaFetchAbort){
        try{
          mayaFetchAbort.abort();
        }catch(_){}
        mayaFetchAbort = null;
      }

      // Clear all AI states
      mayaSending = false;
      mayaSpeaking = false;
      mayaListening = false;

      // Hide thinking bubble
      mayaHideThinkingBubble();

      // Clear any input
      if(mayaKeyboardInput) mayaKeyboardInput.value = "";

      // Update status

      // Session is preserved in mayaConversation array
      console.log("MAYA: All AI services stopped. Session preserved:", mayaConversation.length, "messages");

      // Restart wake word detection after a short delay
      setTimeout(function(){
        if(!mayaVisible){
          console.log("MAYA: Restarting wake word detection");
          wakeWordStart();
        }
      }, 500);
    }

    function mayaToggleSidePanel(){
      if(!mayaVisible) return;
      mayaSidePanel = !mayaSidePanel;
      if(!mayaBlobShell)return;

      if(mayaSidePanel){
        mayaBlobShell.classList.remove("maya-expanded");
        mayaBlobShell.classList.add("maya-side-panel");
        mayaBlobShell.style.animation = "";
        if(mayaMinimizeOverlay) mayaMinimizeOverlay.title = "Expand to fullscreen";
      }else{
        mayaBlobShell.classList.remove("maya-side-panel");
        mayaBlobShell.classList.add("maya-expanded");
        mayaBlobShell.style.animation = "";
        if(mayaMinimizeOverlay) mayaMinimizeOverlay.title = "Minimize to side panel";
      }
    }

    // Wake word functionality removed as per user request

    var mayaRecognition=null;
    var mayaListening=false;
    var mayaShouldRestartListening=false; // Flag to restart listening after response

    function mayaInitSpeech(){
      var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR){
        return;
      }
      mayaRecognition=new SR();
      try{ mayaRecognition.lang="en-IN"; }catch(_){ mayaRecognition.lang="en-US"; }
      mayaRecognition.continuous=true; // Keep mic open for continuous listening
      mayaRecognition.interimResults=false; // Disable interim for stability
      mayaRecognition.maxAlternatives=1;

      mayaRecognition.onstart=function(){
        console.log("MAYA: Recognition started");
        mayaListening=true;
        if(mayaListeningIndicator)mayaListeningIndicator.classList.add("active");

        // Play soft ready sound when mic is ready
        mayaPlayReadySound();
      };

      mayaRecognition.onerror=function(e){
        console.log("MAYA: Recognition error:", e.error);
        mayaListening=false;
        if(mayaListeningIndicator)mayaListeningIndicator.classList.remove("active");

        // Don't auto-restart on error - wait for explicit restart
        mayaShouldRestartListening = false;
      };

      mayaRecognition.onend=function(){
        console.log("MAYA: Recognition ended");
        mayaListening=false;
        if(mayaListeningIndicator)mayaListeningIndicator.classList.remove("active");

        // NEVER auto-restart here - only restart explicitly from mayaFinishSpeech()
        // This prevents the mic loop issue
        console.log("MAYA: Recognition ended - waiting for explicit restart");
      };

      mayaRecognition.onresult=function(e){
        if(e.results && e.results.length > 0){
          var lastResultIndex = e.results.length - 1;
          var result = e.results[lastResultIndex];

          // Only process final results
          if(result.isFinal){
            var txt = result[0].transcript.trim();
            if(txt){
              console.log("MAYA: Recognized speech:", txt);

              // Stop listening immediately to prevent further input
              mayaShouldRestartListening = false;
              mayaStopListening();

              // Process the user input
              mayaHandleUser(txt);
            }else{
              console.log("MAYA: Empty transcript received");
            }
          }
        }
      };
    }

    function mayaToggleListening(){
      if(!mayaRecognition)return;
      if(mayaListening){
        mayaShouldRestartListening = false;
        try{ mayaRecognition.stop(); }catch(_){ }
      }else{
        mayaShouldRestartListening = true;
        try{ mayaRecognition.start(); }catch(_){ }
      }
    }

    function mayaStartListening(){
      if(!mayaRecognition) {
        console.log("MAYA: Recognition not initialized");
        return;
      }

      if(mayaListening) {
        console.log("MAYA: Already listening");
        return;
      }

      // Don't start if AI is speaking or sending
      if(mayaSpeaking || mayaSending){
        console.log("MAYA: Cannot start listening - AI is speaking or sending");
        return;
      }

      console.log("MAYA: Starting listening...");
      mayaShouldRestartListening = true;
      try{
        mayaRecognition.start();
      }catch(e){
        console.log("MAYA: Error starting recognition:", e);
        mayaListening = false;
      }
    }

    function mayaStopListening(){
      if(!mayaRecognition) return;

      console.log("MAYA: Stopping listening...");
      mayaShouldRestartListening = false;

      if(mayaListening){
        try{
          mayaRecognition.stop();
        }catch(e){
          console.log("MAYA: Error stopping recognition:", e);
        }
      }

      mayaListening = false;
      if(mayaListeningIndicator) mayaListeningIndicator.classList.remove("active");
    }

    // Play a soft "ready" sound when mic is activated
    function mayaPlayReadySound(){
      try{
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
        var oscillator = audioContext.createOscillator();
        var gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Soft, pleasant tone (C note at 523.25 Hz)
        oscillator.frequency.value = 523.25;
        oscillator.type = 'sine';

        // Very soft volume with fade out
        gainNode.gain.setValueAtTime(0.08, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

        // Short, gentle beep
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);

        console.log("MAYA: Played ready sound");
      }catch(e){
        console.log("MAYA: Could not play ready sound:", e);
      }
    }




      // ========================================
      // ATLAS-STYLE AI DOTS ANIMATION
      // Shows when MAYA is analyzing web pages
      // ========================================
      (function initAiDotsAnimation() {
        if (!mayaAiDotsCanvas) return;

        const canvas = mayaAiDotsCanvas;
        const ctx = canvas.getContext('2d');

        let width, height, dpr;
        let dots = [];
        let animationFrame = null;
        let focusAnimationFrame = null;

        // Focus point (bright cluster area) - MOVED TO LEFT SIDE
        let focusNx = 0.28;
        let focusNy = 0.45;

        const config = {
          spacing: 14,
          baseAlpha: 0.06,
          maxAlpha: 0.9,
          dotRadius: 1.05,
          staticClusters: [
            { x: 0.28, y: 0.40, radius: 0.50, strength: 1.0 },  // Main cluster - LEFT
            { x: 0.30, y: 0.15, radius: 0.35, strength: 0.65 }, // Top cluster - LEFT
            { x: 0.18, y: 0.75, radius: 0.32, strength: 0.55 }  // Bottom cluster - LEFT
          ],
          focusStrength: 1.3,
          focusRadius: 0.40
        };

        function resize() {
          dpr = window.devicePixelRatio || 1;
          const rect = canvas.getBoundingClientRect();
          width = rect.width * dpr;
          height = rect.height * dpr;

          canvas.width = width;
          canvas.height = height;

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          initDots();
        }

        function initDots() {
          dots = [];
          const spacing = config.spacing;
          const cols = Math.ceil(canvas.clientWidth / spacing) + 2;
          const rows = Math.ceil(canvas.clientHeight / spacing) + 2;

          for (let j = 0; j < rows; j++) {
            for (let i = 0; i < cols; i++) {
              const x = i * spacing + (Math.random() - 0.5) * 2;
              const y = j * spacing + (Math.random() - 0.5) * 2;
              const nx = x / canvas.clientWidth;
              const ny = y / canvas.clientHeight;

              const baseAlpha = computeBaseAlpha(nx, ny);
              if (baseAlpha > 0.015) {
                dots.push({
                  x, y, nx, ny,
                  baseAlpha,
                  phase: Math.random() * Math.PI * 2,
                  jitter: (Math.random() - 0.5) * 0.45,
                  appearDelay: Math.random() * 2000, // Random delay 0-2000ms
                  appearTime: null, // Will be set when animation starts
                  visible: false // Start invisible
                });
              }
            }
          }
        }

        function computeBaseAlpha(nx, ny) {
          let intensity = 0;

          for (const c of config.staticClusters) {
            const dx = nx - c.x;
            const dy = ny - c.y;
            const distNorm = Math.sqrt(dx * dx + dy * dy) / c.radius;
            const influence = Math.max(0, 1 - distNorm);
            intensity += influence * c.strength;
          }

          // Fade from RIGHT to LEFT (inverted from original)
          const horizontalFade = Math.max(0, (0.78 - nx) / 0.78);
          intensity *= horizontalFade;

          intensity = Math.min(1, intensity);
          return config.baseAlpha + intensity * (config.maxAlpha - config.baseAlpha);
        }

        function computeFocusBoost(nx, ny) {
          const dx = nx - focusNx;
          const dy = ny - focusNy;
          const dist = Math.sqrt(dx * dx + dy * dy) / config.focusRadius;
          const influence = Math.max(0, 1 - dist * dist);
          return influence * config.focusStrength;
        }

        let animationStartTime = null;

        function draw(time) {
          if (!mayaAiDotsActive) return;

          // Set start time on first frame
          if (animationStartTime === null) {
            animationStartTime = time;
          }

          const elapsed = time - animationStartTime;
          const t = time * 0.001;
          const zoom = 1 + 0.035 * Math.sin(t * 0.4);

          const cx = focusNx * canvas.clientWidth;
          const cy = focusNy * canvas.clientHeight;

          ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

          for (const d of dots) {
            // Check if dot should be visible yet
            if (!d.visible) {
              if (elapsed >= d.appearDelay) {
                d.visible = true;
                d.appearTime = elapsed;
              } else {
                continue; // Skip this dot until its time
              }
            }

            // Fade in effect for newly appeared dots
            const timeSinceAppear = elapsed - d.appearTime;
            const fadeIn = Math.min(1, timeSinceAppear / 400); // 400ms fade in

            const angle = Math.atan2(d.ny - focusNy, d.nx - focusNx);
            const drift = 0.8 * Math.sin(t * 0.4 + d.phase);

            const driftX = drift * Math.cos(angle);
            const driftY = drift * Math.sin(angle);

            const jitterX = d.jitter * Math.sin(t * 1.5 + d.phase * 1.7);
            const jitterY = d.jitter * Math.cos(t * 1.3 + d.phase * 1.3);

            const baseX = d.x + jitterX + driftX;
            const baseY = d.y + jitterY + driftY;

            const zoomedX = (baseX - cx) * zoom + cx;
            const zoomedY = (baseY - cy) * zoom + cy;

            const flicker = 0.55 + 0.45 * Math.sin(t * 2.1 + d.phase);
            const focusBoost = computeFocusBoost(d.nx, d.ny);

            const alpha = (d.baseAlpha + focusBoost * 0.35) * flicker * fadeIn;
            if (alpha <= 0.01) continue;

            ctx.fillStyle = `rgba(255,255,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(zoomedX, zoomedY, config.dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }

          animationFrame = requestAnimationFrame(draw);
        }

        // Subtle breathing cluster movement - LEFT SIDE
        function animateFocus(time) {
          if (!mayaAiDotsActive) return;

          const t = time * 0.001;
          focusNx = 0.28 + 0.03 * Math.sin(t * 0.25);
          focusNy = 0.45 + 0.04 * Math.cos(t * 0.22);
          focusAnimationFrame = requestAnimationFrame(animateFocus);
        }

        // Public functions to control the animation
        var mayaAiDotsStartTimeout = null;
        var mayaAiDotsStopTimeout = null;

        window.mayaStartAiDots = function(label) {
          if (mayaAiDotsActive) return;

          console.log("MAYA: Starting AI dots animation (with 300ms delay):", label);

          // Clear any pending stop timeout
          if (mayaAiDotsStopTimeout) {
            clearTimeout(mayaAiDotsStopTimeout);
            mayaAiDotsStopTimeout = null;
          }

          // Add a small delay before showing the animation
          mayaAiDotsStartTimeout = setTimeout(function() {
            mayaAiDotsActive = true;

            if (mayaAiDotsLabel && label) {
              mayaAiDotsLabel.textContent = label;
            }

            if (mayaAiDotsWrapper) {
              mayaAiDotsWrapper.classList.add('active');
            }

            // Reset animation state
            animationStartTime = null;

            // Reset all dots to invisible with new random delays
            for (const d of dots) {
              d.visible = false;
              d.appearDelay = Math.random() * 2000; // New random delay
              d.appearTime = null;
            }

            resize();
            animationFrame = requestAnimationFrame(draw);
            focusAnimationFrame = requestAnimationFrame(animateFocus);
          }, 300); // 300ms delay before showing
        };

        window.mayaStopAiDots = function() {
          if (!mayaAiDotsActive && !mayaAiDotsStartTimeout) return;

          console.log("MAYA: Stopping AI dots animation (with 800ms delay)");

          // Clear any pending start timeout
          if (mayaAiDotsStartTimeout) {
            clearTimeout(mayaAiDotsStartTimeout);
            mayaAiDotsStartTimeout = null;
            return; // Don't show if it hasn't started yet
          }

          // Add a delay before hiding the animation (minimum display time)
          mayaAiDotsStopTimeout = setTimeout(function() {
            mayaAiDotsActive = false;

            if (animationFrame) {
              cancelAnimationFrame(animationFrame);
              animationFrame = null;
            }

            if (focusAnimationFrame) {
              cancelAnimationFrame(focusAnimationFrame);
              focusAnimationFrame = null;
            }

            if (mayaAiDotsWrapper) {
              mayaAiDotsWrapper.classList.remove('active');
            }

            ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
          }, 800); // 800ms minimum display time before hiding
        };

        // Handle resize
        window.addEventListener('resize', function() {
          if (mayaAiDotsActive) {
            resize();
          }
        });
      })();

    async function mayaCheckMicPermission(){
      try{
        if(!navigator.permissions||!navigator.permissions.query) return "prompt";
        var status=await navigator.permissions.query({name:"microphone"});
        return status.state||"prompt";
      }catch(e){
        return "prompt";
      }
    }

    // Location permission functions
    async function mayaCheckLocationPermission(){
      try{
        if(!navigator.permissions||!navigator.permissions.query) return "prompt";
        var status=await navigator.permissions.query({name:"geolocation"});
        return status.state||"prompt";
      }catch(e){
        return "prompt";
      }
    }

    async function mayaRequestLocation(){
      try{
        var saved = localStorage.getItem('maya_location_permission');
        if(saved === 'granted'){
          console.log("MAYA: Location permission already granted (from localStorage) - not requesting again");
          return true;
        }

        if(saved === 'denied'){
          console.log("MAYA: Location permission was previously denied - not requesting again");
          return false;
        }

        console.log("MAYA: Requesting location permission for the first time...");
        var position = await new Promise(function(resolve, reject){
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes cache
          });
        });

        console.log("MAYA: Location permission granted - saving to localStorage");
        localStorage.setItem('maya_location_permission', 'granted');
        return true;
      }catch(e){
        console.warn("MAYA: Location permission denied or failed:", e);
        if(e.code === 1){ // PERMISSION_DENIED
          localStorage.setItem('maya_location_permission', 'denied');
        }
        return false;
      }
    }

    async function mayaGetLocation(){
      try{
        var saved = localStorage.getItem('maya_location_permission');

        // If permission was denied, don't try again
        if(saved === 'denied'){
          console.log("MAYA: Location permission was previously denied");
          return null;
        }

        // If permission not yet determined, request it
        if(saved !== 'granted'){
          console.log("MAYA: Location permission not granted, requesting...");
          var granted = await mayaRequestLocation();
          if(!granted) return null;
        }

        // Get location (this won't prompt if permission already granted)
        var position = await new Promise(function(resolve, reject){
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes cache
          });
        });

        // Ensure permission state is saved
        if(localStorage.getItem('maya_location_permission') !== 'granted'){
          localStorage.setItem('maya_location_permission', 'granted');
        }

        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      }catch(e){
        console.warn("MAYA: Failed to get location:", e);
        // Save denied state if error
        if(e.code === 1){ // PERMISSION_DENIED
          localStorage.setItem('maya_location_permission', 'denied');
        }
        return null;
      }
    }
    function mayaShowMicPermission(){
      if(mayaMicPermission) mayaMicPermission.classList.add("active");
    }
    function mayaHideMicPermission(){
      if(mayaMicPermission) mayaMicPermission.classList.remove("active");
    }
    async function mayaRequestMic(){
      // Always invoke a real native prompt from a user gesture by trying multiple strategies
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      if(!isSecure){
      }
      function stopStream(stream){ try{ stream && stream.getTracks().forEach(t=>t.stop()); }catch(_){}
      }
      // 1) Modern API with audio processing hints
      try{
        if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
          const stream = await navigator.mediaDevices.getUserMedia({
            audio:{ echoCancellation:true, noiseSuppression:true, autoGainControl:true }
          });
          stopStream(stream);
          try{ localStorage.setItem('maya_mic_permission','granted'); }catch(_){}
          mayaHideMicPermission();
          return true;
        }
      }catch(e1){ console.warn('MAYA: getUserMedia (enhanced) failed', e1); }
      // 2) Modern API (simple)
      try{
        if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
          const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
          stopStream(stream);
          try{ localStorage.setItem('maya_mic_permission','granted'); }catch(_){ }
          mayaHideMicPermission();
          return true;
        }
      }catch(e2){ console.warn('MAYA: getUserMedia (simple) failed', e2); }
      // 3) Legacy webkit/moz getUserMedia
      try{
        const legacy = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        if(legacy){
          const stream = await new Promise(function(res,rej){ legacy.call(navigator, {audio:true}, res, rej); });
          stopStream(stream);
          try{ localStorage.setItem('maya_mic_permission','granted'); }catch(_){ }
          mayaHideMicPermission();
          return true;
        }
      }catch(e3){ console.warn('MAYA: legacy getUserMedia failed', e3); }
      // 4) If all failed, surface a clear message
      try{ localStorage.setItem('maya_mic_permission','denied'); }catch(_){ }
      return false;
    }
    async function mayaEnsureVoiceStart(){
      // Persist permission: ask once, reuse thereafter
      var saved=null;
      try{ saved = localStorage.getItem('maya_mic_permission'); }catch(_){ }

      if(saved==='granted'){
        if(mayaRecognition&&!mayaListening){
          // Start listening immediately - no delay, no popup
          console.log("MAYA: ✅ Starting voice listening immediately (permission already granted from localStorage)");
          setTimeout(function(){
            if(mayaVisible&&!mayaListening&&!mayaSpeaking&&!mayaSending){
              mayaStartListening();
            }
          }, 300); // Small delay to ensure MAYA is fully opened
        }
        return; // Don't check browser permission again
      }

      if(saved==='denied'){
        console.log("MAYA: ❌ Mic permission previously denied (from localStorage) - not showing popup");
        return; // Don't show popup or check again
      }

      // Permission not determined yet - check browser
      try{
        var state = await mayaCheckMicPermission();
        if(state==="granted"){
          try{ localStorage.setItem('maya_mic_permission','granted'); }catch(_){ }
          console.log("MAYA: ✅ Mic permission granted (from browser) - saved to localStorage");
          // Start listening immediately
          if(mayaRecognition&&!mayaListening){
            setTimeout(function(){
              if(mayaVisible&&!mayaListening&&!mayaSpeaking&&!mayaSending){
                mayaStartListening();
              }
            }, 300);
          }
        }
        else if(state==="denied"){
          try{ localStorage.setItem('maya_mic_permission','denied'); }catch(_){ }
          console.log("MAYA: ❌ Mic permission denied (from browser) - saved to localStorage");
        }
        else{
          // Permission is in 'prompt' state - don't auto-show popup
          console.log("MAYA: Mic permission in 'prompt' state - waiting for user interaction");
          // Don't show popup automatically - let user click mic button
        }
      }catch(_){
        console.log("MAYA: Could not check mic permission");
      }
    }
    if(mayaMicAllowBtn){
      mayaMicAllowBtn.addEventListener("click", async function(){
        var ok=await mayaRequestMic();
        if(ok){
          mayaEnsureVoiceStart();
        }
      });
    }
    if(mayaMicCloseBtn){
      mayaMicCloseBtn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        mayaHideMicPermission();
      });
    }


    async function mayaInit(){
      console.log("MAYA: Initializing assistant...");
      console.log("MAYA: Blob card element:", mayaBlobCard);

      // Clear chat timeline if upgrading to new version
      try{
        var mayaVersion = localStorage.getItem('maya_version');
        if(mayaVersion !== '2.1'){
          var timeline = document.getElementById("maya-chat-timeline");
          if(timeline){
            timeline.innerHTML = '';
            console.log("MAYA: Cleared old chat timeline (upgrading to v2.1)");
          }
        }
      }catch(_){}

      // Initialize system prompt
      try{
        MAYA_SYSTEM_PROMPT = await mayaBuildSystemPrompt();
        console.log("MAYA: System prompt initialized");
      }catch(e){
        console.warn("MAYA: Failed to build system prompt:", e);
        // Fallback to basic prompt
        MAYA_SYSTEM_PROMPT = "You are MAYA, a professional AI assistant.";
      }

      mayaInitSpeech();

      if(window.speechSynthesis){
        window.speechSynthesis.onvoiceschanged=function(){
          console.log("MAYA: Voices loaded");
        };
      }

      if(mayaBlobCard){
        console.log("MAYA: Adding click listener to blob");
        mayaBlobCard.addEventListener("click",function(e){
          console.log("MAYA: Blob clicked!");
          e.preventDefault();
          e.stopPropagation();
          if(!mayaVisible){
            console.log("MAYA: Opening panel");
            mayaShowPanel();
          }else{
            console.log("MAYA: Closing panel");
            mayaHidePanel();

          }
        });
      }else{
        console.error("MAYA: Blob card element not found!");
      }
      if(mayaCloseOverlay){
        console.log("MAYA: Adding click listener to close button");
        var closeHandler = function(e){
          console.log("MAYA: Close button clicked!");
          e.preventDefault();
          e.stopPropagation();
          mayaHidePanel();
        };
        mayaCloseOverlay.addEventListener("click", closeHandler);
        mayaCloseOverlay.addEventListener("touchend", closeHandler);
        mayaCloseOverlay.addEventListener("mousedown", function(e){
          console.log("MAYA: Close button mousedown");
        });
      }else{
        console.error("MAYA: Close overlay element not found!");
      }
      if(mayaMinimizeOverlay){
        console.log("MAYA: Adding click listener to minimize button");
        mayaMinimizeOverlay.addEventListener("click",function(e){
          console.log("MAYA: Minimize button clicked!");
          e.preventDefault();
          e.stopPropagation();
          mayaToggleSidePanel();
        });
      }
      if(mayaStopOverlay){
        mayaStopOverlay.addEventListener("click",function(){

          mayaStopAll();
        });
      }

      if(mayaMuteOverlay){
        var _icon = mayaMuteOverlay.querySelector('i');
        if(_icon){ _icon.className = mayaSpeechEnabled ? 'fi fi-rr-volume' : 'fi fi-rr-volume-mute'; }
        if(mayaSpeechEnabled){ mayaMuteOverlay.classList.remove('muted'); } else { mayaMuteOverlay.classList.add('muted'); }
        mayaMuteOverlay.title = mayaSpeechEnabled ? 'Mute AI voice' : 'Unmute AI voice';
        mayaMuteOverlay.addEventListener("click", function(){ mayaToggleMute(); });
      }

      // Fallback: also allow clicking anywhere on the blob shell to open when collapsed
      if(mayaBlobShell){
        mayaBlobShell.addEventListener("click", function(){
          if(!mayaVisible){ mayaShowPanel(); }
        });
      }

      if(mayaKeyboardOverlay){
        mayaKeyboardOverlay.addEventListener("click",function(){
          if(mayaInputMode==="voice"){
            mayaInputMode="keyboard";
            mayaKeyboardOverlay.innerHTML='<i class="fi fi-rr-microphone" aria-hidden="true"></i>';
            mayaKeyboardOverlay.title="Switch to voice mode";
            mayaKeyboardOverlay.classList.add("active");
            if(mayaListening){
              mayaToggleListening();
            }
            if(mayaKeyboardInputContainer){
              mayaKeyboardInputContainer.classList.add("active");
            }
            if(mayaKeyboardInput){
              setTimeout(function(){
                mayaKeyboardInput.focus();
              },100);
            }
            // Hide central toggle while in keyboard mode and sync bottom toggle
            mayaKeyboardOverlay.classList.add("hidden");
            if(mayaInputModeToggle){
              mayaInputModeToggle.innerHTML='<i class="fi fi-rr-keyboard" aria-hidden="true"></i>';
              mayaInputModeToggle.title="Switch to keyboard mode";
              mayaInputModeToggle.classList.add("active");
            }
          }else{
            mayaInputMode="voice";
            mayaKeyboardOverlay.innerHTML='<i class="fi fi-rr-keyboard" aria-hidden="true"></i>';
            mayaKeyboardOverlay.title="Switch to keyboard mode";
            mayaKeyboardOverlay.classList.remove("active");
            if(mayaKeyboardInputContainer){
              mayaKeyboardInputContainer.classList.remove("active");
            }
            if(!mayaListening){
              mayaEnsureVoiceStart();
            }
            // Show central toggle again in voice mode and sync bottom toggle
            mayaKeyboardOverlay.classList.remove("hidden");
            if(mayaInputModeToggle){
              mayaInputModeToggle.innerHTML='<i class="fi fi-rr-microphone" aria-hidden="true"></i>';
              mayaInputModeToggle.title="Switch to voice input";
              mayaInputModeToggle.classList.remove("active");
            }
          }
        });
      }
      if(mayaKeyboardInput){
        mayaKeyboardInput.addEventListener("keydown",function(e){
          if(e.key==="Enter"&&!e.shiftKey){
            e.preventDefault();
            var txt=mayaKeyboardInput.value.trim();
            if(txt){
              mayaKeyboardInput.value="";
              mayaHandleUser(txt);
            }
          }
        });
      }
      if(mayaKeyboardInput){
        mayaKeyboardInput.addEventListener("input",function(){
          this.style.height="auto";
          var newH=Math.min(this.scrollHeight, Math.floor(window.innerHeight*0.35));
          this.style.height=newH+"px";
        });
      }
      if(mayaSendBtn){
        mayaSendBtn.addEventListener("click",function(){
          var txt=(mayaKeyboardInput&&mayaKeyboardInput.value||"").trim();
          if(txt){
            mayaKeyboardInput.value="";
            mayaHandleUser(txt);
          }
        });
      }

      var mayaInputModeToggle=document.getElementById("maya-input-mode-toggle");
      if(mayaInputModeToggle){
        mayaInputModeToggle.addEventListener("click",function(){
          if(mayaInputMode==="keyboard"){
            mayaInputMode="voice";
            mayaInputModeToggle.innerHTML='<i class="fi fi-rr-microphone" aria-hidden="true"></i>';
            mayaInputModeToggle.title="Switch to voice input";
            mayaInputModeToggle.classList.remove("active");
            if(mayaKeyboardInputContainer){
              mayaKeyboardInputContainer.classList.remove("active");
            }
            if(!mayaListening){
              mayaEnsureVoiceStart();
            }
            // In voice mode, show the central toggle and set it to keyboard icon
            if(mayaKeyboardOverlay){
              mayaKeyboardOverlay.innerHTML='<i class="fi fi-rr-keyboard" aria-hidden="true"></i>';
              mayaKeyboardOverlay.title="Switch to keyboard mode";
              mayaKeyboardOverlay.classList.remove("active");
              mayaKeyboardOverlay.classList.remove("hidden");
            }
          }else{
            mayaInputMode="keyboard";
            mayaInputModeToggle.innerHTML='<i class="fi fi-rr-keyboard" aria-hidden="true"></i>';
            mayaInputModeToggle.title="Switch to keyboard mode";
            mayaInputModeToggle.classList.add("active");
            if(mayaKeyboardInputContainer){
              mayaKeyboardInputContainer.classList.add("active");
            }
            if(mayaListening){
              try{ mayaRecognition.stop(); }catch(_){ }
            }
            setTimeout(function(){
              mayaKeyboardInput.focus();
            },100);
            // In keyboard mode, hide the central toggle and set it to microphone icon
            if(mayaKeyboardOverlay){
              mayaKeyboardOverlay.innerHTML='<i class="fi fi-rr-microphone" aria-hidden="true"></i>';
              mayaKeyboardOverlay.title="Switch to voice mode";
              mayaKeyboardOverlay.classList.add("active");
              mayaKeyboardOverlay.classList.add("hidden");
            }
          }
        });
      }

    }

    if(document.readyState==="loading"){
      document.addEventListener("DOMContentLoaded",function(){
        mayaInit();
        // Check permissions once on load (but don't request - only check)
        setTimeout(function(){
          // Check microphone permission from localStorage first
          try{
            var savedMic = localStorage.getItem('maya_mic_permission');
            if(savedMic === 'granted'){
              console.log("MAYA: Mic permission already granted (from localStorage)");
              // Don't show permission popup
            } else if(savedMic === 'denied'){
              console.log("MAYA: Mic permission was denied (from localStorage)");
              // Don't show permission popup
            } else {
              // Only check browser permission if not in localStorage
              mayaCheckMicPermission().then(function(state){
                if(state === 'granted'){
                  console.log("MAYA: Mic permission already granted (from browser)");
                  localStorage.setItem('maya_mic_permission', 'granted');
                } else if(state === 'denied'){
                  console.log("MAYA: Mic permission denied (from browser)");
                  localStorage.setItem('maya_mic_permission', 'denied');
                } else {
                  // Only show popup if permission is in 'prompt' state
                  console.log("MAYA: Mic permission not determined yet");
                  // Don't auto-show popup - wait for user to interact
                }
              });
            }
          }catch(_){
            console.log("MAYA: Could not check mic permission safely");
          }

          // Check location permission (don't request automatically)
          try{
            var savedLocation = localStorage.getItem('maya_location_permission');
            if(savedLocation === 'granted'){
              console.log("MAYA: Location permission already granted (from localStorage)");
              // Don't request again
            } else if(savedLocation === 'denied'){
              console.log("MAYA: Location permission was denied (from localStorage)");
              // Don't request again
            } else {
              console.log("MAYA: Location permission not determined yet - will request when needed");
              // Don't auto-request - wait until actually needed
            }
          }catch(_){
            console.log("MAYA: Could not check location permission");
          }
        }, 200);
      });
    }else{
      mayaInit();
      // Same as above when DOM is already ready
      setTimeout(function(){
        // Check microphone permission from localStorage first
        try{
          var savedMic = localStorage.getItem('maya_mic_permission');
          if(savedMic === 'granted'){
            console.log("MAYA: Mic permission already granted (from localStorage)");
            // Don't show permission popup
          } else if(savedMic === 'denied'){
            console.log("MAYA: Mic permission was denied (from localStorage)");
            // Don't show permission popup
          } else {
            // Only check browser permission if not in localStorage
            mayaCheckMicPermission().then(function(state){
              if(state === 'granted'){
                console.log("MAYA: Mic permission already granted (from browser)");
                localStorage.setItem('maya_mic_permission', 'granted');
              } else if(state === 'denied'){
                console.log("MAYA: Mic permission denied (from browser)");
                localStorage.setItem('maya_mic_permission', 'denied');
              } else {
                // Only show popup if permission is in 'prompt' state
                console.log("MAYA: Mic permission not determined yet");
                // Don't auto-show popup - wait for user to interact
              }
            });
          }
        }catch(_){
          console.log("MAYA: Could not check mic permission safely");
        }

        // Check location permission (don't request automatically)
        try{
          var savedLocation = localStorage.getItem('maya_location_permission');
          if(savedLocation === 'granted'){
            console.log("MAYA: Location permission already granted (from localStorage)");
            // Don't request again
          } else if(savedLocation === 'denied'){
            console.log("MAYA: Location permission was denied (from localStorage)");
            // Don't request again
          } else {
            console.log("MAYA: Location permission not determined yet - will request when needed");
            // Don't auto-request - wait until actually needed
          }
        }catch(_){
          console.log("MAYA: Could not check location permission");
        }
      }, 200);
    }

    // FORCE BLOB VISIBILITY - DEBUG
    setTimeout(function(){
      console.log("=== FORCE BLOB VISIBILITY CHECK ===");
      var shell = document.getElementById("maya-blob-shell");
      var card = document.getElementById("maya-blob-card");
      var canvas = document.getElementById("maya-blob-canvas");
      console.log("Shell:", shell, shell ? window.getComputedStyle(shell).display : "N/A");
      console.log("Card:", card, card ? window.getComputedStyle(card).display : "N/A");
      console.log("Canvas:", canvas, canvas ? window.getComputedStyle(canvas).display : "N/A");
      if(shell){
        shell.style.display = "grid";
        shell.style.visibility = "visible";
        shell.style.opacity = "1";
        console.log("Shell forced visible");
      }
      if(card){
        card.style.display = "block";
        card.style.visibility = "visible";
        card.style.opacity = "1";
        console.log("Card forced visible");
      }
      if(canvas){
        canvas.style.visibility = "visible";
        canvas.style.opacity = "1";
        console.log("Canvas forced visible");
      }
    }, 100);

    // ============================================
    // PICTURE-IN-PICTURE (PIP) FUNCTIONALITY
    // ============================================

    // NOTE: True system-level PIP (outside browser) is NOT possible with web technologies
    // This implementation uses Document Picture-in-Picture API (Chrome 116+) which creates
    // a separate browser window that persists when switching tabs (but not when browser is minimized)

    var pipDocumentWindow = null; // Document PIP window reference
    var mayaPipMode = "none"; // 'document' | 'inpage' | 'none'
    var mayaLastPipSyncTime = 0;
    var mayaPipSyncMinIntervalMs = 120;
    var mayaPipOpening = false; // Guard flag to avoid re-entrant PIP opens



    // PIP drag functionality (for fallback in-page PIP)
    var pipDragging = false;
    var pipDragOffsetX = 0;
    var pipDragOffsetY = 0;

    if(mayaPipHeader){
      mayaPipHeader.addEventListener('mousedown', function(e){
        pipDragging = true;
        pipDragOffsetX = e.clientX - mayaPipWindow.offsetLeft;
        pipDragOffsetY = e.clientY - mayaPipWindow.offsetTop;
        mayaPipWindow.style.transition = 'none';
      });
    }

    document.addEventListener('mousemove', function(e){
      if(pipDragging){
        var x = e.clientX - pipDragOffsetX;
        var y = e.clientY - pipDragOffsetY;

        // Keep within viewport bounds
        var maxX = window.innerWidth - mayaPipWindow.offsetWidth;
        var maxY = window.innerHeight - mayaPipWindow.offsetHeight;
        x = Math.max(0, Math.min(x, maxX));
        y = Math.max(0, Math.min(y, maxY));

        mayaPipWindow.style.left = x + 'px';
        mayaPipWindow.style.top = y + 'px';
        mayaPipWindow.style.right = 'auto';
        mayaPipWindow.style.bottom = 'auto';
      }
    });

    document.addEventListener('mouseup', function(){
      if(pipDragging){
        pipDragging = false;
        mayaPipWindow.style.transition = 'all 0.3s ease';
      }
    });

    // Enter PIP mode
    async function mayaEnterPIP(){
      console.log("MAYA: Entering PIP mode");

      // Prevent multiple PIP windows or re-entrant opens
      if(mayaPipActive || mayaPipOpening){
        console.log("MAYA: PIP already active or opening, skipping");
        return;
      }

      // Mark that we're in the process of opening PIP
      mayaPipOpening = true;

      // Remember the current input mode from parent window
      var parentInputMode = mayaInputMode || "keyboard";
      console.log("MAYA: Parent window input mode:", parentInputMode);

      // Check if Document Picture-in-Picture API is available (Chrome 116+)
      if('documentPictureInPicture' in window){
        try{
          console.log("MAYA: Attempting Document Picture-in-Picture API");

          // Close any existing PIP window first
          if(pipDocumentWindow && !pipDocumentWindow.closed){
            console.log("MAYA: Closing existing PIP window");
            pipDocumentWindow.close();
            pipDocumentWindow = null;
          }

          // Request PIP window with fixed size (compact size for corner placement)
          // Note: This may fail if called without recent user activation
          pipDocumentWindow = await window.documentPictureInPicture.requestWindow({
            width: 320,
            height: 450,
            disallowReturnToOpener: false
          });

          console.log("MAYA: ✅ Document PIP window created successfully");

          // Copy styles to PIP window
          const pipDoc = pipDocumentWindow.document;

          // Prevent fullscreen mode
          pipDoc.addEventListener('fullscreenchange', function(){
            if(pipDoc.fullscreenElement){
              console.log("MAYA: Exiting fullscreen in PIP");
              pipDoc.exitFullscreen();
            }
          });

          // Set body styles to remove white spaces and prevent fullscreen
          pipDoc.body.style.margin = '0';
          pipDoc.body.style.padding = '0';
          pipDoc.body.style.overflow = 'hidden';
          pipDoc.body.style.width = '100%';
          pipDoc.body.style.height = '100vh';
          pipDoc.body.style.maxWidth = '320px';
          pipDoc.body.style.maxHeight = '450px';
          pipDoc.body.style.background = 'linear-gradient(135deg, rgba(4,12,32,0.98), rgba(2,6,18,0.98))';

          // Copy all stylesheets
          [...document.styleSheets].forEach(styleSheet => {
            try {
              const cssRules = [...styleSheet.cssRules].map(rule => rule.cssText).join('');
              const style = pipDoc.createElement('style');
              style.textContent = cssRules;
              pipDoc.head.appendChild(style);
            } catch (e) {
              // External stylesheets - link them
              const link = pipDoc.createElement('link');
              link.rel = 'stylesheet';
              link.href = styleSheet.href;
              pipDoc.head.appendChild(link);
            }
          });

          // Clone PIP window content
          const pipContent = mayaPipWindow.cloneNode(true);
          pipContent.classList.add('active');
          pipContent.style.position = 'relative';
          pipContent.style.bottom = 'auto';
          pipContent.style.right = 'auto';
          pipContent.style.left = '0';
          pipContent.style.top = '0';
          pipContent.style.width = '100%';
          pipContent.style.height = '100%';
          pipContent.style.borderRadius = '0';
          pipContent.style.border = 'none';
          pipContent.style.margin = '0';
          pipContent.style.padding = '0';
          pipDoc.body.appendChild(pipContent);

          // Ensure maya-pip-content fills completely
          const pipContentInner = pipDoc.getElementById('maya-pip-content') || pipDoc.querySelector('.maya-pip-content');
          if(pipContentInner){
            pipContentInner.style.width = '100%';
            pipContentInner.style.height = '100%';
            pipContentInner.style.margin = '0';
            pipContentInner.style.padding = '0';
            pipContentInner.style.boxSizing = 'border-box';
          }

          // Ensure maya-pip-chat fills properly
          const pipChatInner = pipDoc.getElementById('maya-pip-chat') || pipDoc.querySelector('.maya-pip-chat');
          if(pipChatInner){
            pipChatInner.style.width = '100%';
            pipChatInner.style.margin = '0';
            pipChatInner.style.boxSizing = 'border-box';
          }

          // Ensure input container is edge-to-edge
          const pipInputContainer = pipDoc.querySelector('.maya-pip-input-container');
          if(pipInputContainer){
            pipInputContainer.style.width = '100%';
            pipInputContainer.style.margin = '0';
            pipInputContainer.style.boxSizing = 'border-box';
          }

          // Set up event listeners in PIP window
          const pipClose = pipDoc.getElementById('maya-pip-close-btn');
          const pipRestore = pipDoc.getElementById('maya-pip-restore-btn');
          const pipCapture = pipDoc.getElementById('maya-pip-capture-btn');
          const pipSend = pipDoc.getElementById('maya-pip-send');
          const pipInput = pipDoc.getElementById('maya-pip-input');
          const pipStopBtn = pipDoc.getElementById('maya-pip-stop-btn');
          const pipMuteBtn = pipDoc.getElementById('maya-pip-mute-btn');
          const pipModeToggle = pipDoc.getElementById('maya-pip-mode-toggle');

          if(pipClose) pipClose.addEventListener('click', mayaExitPIP);
          if(pipRestore) pipRestore.addEventListener('click', mayaRestoreFromPIP);
          if(pipCapture) pipCapture.addEventListener('click', function(){
            mayaCaptureScreen().then(function(screenshot){
              if(screenshot){
                mayaAddMessage('system', 'Screenshot captured successfully!');
                mayaSyncChatToPIP(true);
              }
            });
          });

          // Stop button - stop speaking
          if(pipStopBtn){
            pipStopBtn.addEventListener('click', function(){
              mayaStopSpeaking();
            });
          }

          // Mute button - toggle voice
          if(pipMuteBtn){
            pipMuteBtn.addEventListener('click', function(){
              mayaSpeechEnabled = !mayaSpeechEnabled;
              if(!mayaSpeechEnabled){
                mayaStopSpeaking();
                pipMuteBtn.classList.add('muted');
                pipMuteBtn.querySelector('i').className = 'fi fi-rr-volume-mute';
              }else{
                pipMuteBtn.classList.remove('muted');
                pipMuteBtn.querySelector('i').className = 'fi fi-rr-volume';
              }
            });
          }

          // Mode toggle button - switch between voice and keyboard
          if(pipModeToggle){
            // Set initial PIP mode to match parent window's mode
            mayaPipInputMode = parentInputMode;

            // Get voice visualizer elements in PIP document
            const pipVoiceVisualizer = pipDoc.getElementById('maya-pip-voice-visualizer');
            const pipVoiceCanvas = pipDoc.getElementById('maya-pip-voice-canvas');

            var pipInitialIcon = pipModeToggle.querySelector('i');
            if(pipInitialIcon){
              if(parentInputMode === "voice"){
                pipInitialIcon.className = 'fi fi-rr-microphone';
                pipModeToggle.title = 'Switch to keyboard input';
                if(pipInput) pipInput.style.display = 'none';

                // Show voice visualizer
                if(pipVoiceVisualizer){
                  pipVoiceVisualizer.classList.add('active');
                  // Start animation in PIP document context
                  if(pipVoiceCanvas){
                    mayaStartPipVoiceVisualizerInDoc(pipDoc, pipVoiceCanvas, pipVoiceVisualizer);
                  }
                }

                // Start voice recognition in PIP if parent was in voice mode
                if(typeof wakeWordStop === 'function'){
                  wakeWordStop();
                }
                if(typeof mayaStartListening === 'function'){
                  setTimeout(function(){
                    mayaStartListening();
                  }, 500);
                }
              } else {
                pipInitialIcon.className = 'fi fi-rr-keyboard';
                pipModeToggle.title = 'Switch to voice input';
                if(pipInput) pipInput.style.display = 'block';

                // Hide voice visualizer
                if(pipVoiceVisualizer){
                  pipVoiceVisualizer.classList.remove('active');
                }
              }
            }

            pipModeToggle.addEventListener('click', function(){
              var icon = pipModeToggle.querySelector('i');

              if(typeof mayaPipInputMode === 'undefined'){
                mayaPipInputMode = "keyboard";
              }

              if(mayaPipInputMode === "keyboard"){
                // Switch to voice mode
                mayaPipInputMode = "voice";
                if(icon) icon.className = 'fi fi-rr-microphone';
                pipModeToggle.title = 'Switch to keyboard input';
                if(pipInput) pipInput.style.display = 'none';

                // Show voice visualizer
                if(pipVoiceVisualizer){
                  pipVoiceVisualizer.classList.add('active');
                  if(pipVoiceCanvas){
                    mayaStartPipVoiceVisualizerInDoc(pipDoc, pipVoiceCanvas, pipVoiceVisualizer);
                  }
                }

                // Stop wake word (if it was listening) and start main voice recognition
                if(typeof wakeWordStop === 'function'){
                  wakeWordStop();
                }
                if(typeof mayaStartListening === 'function'){
                  mayaStartListening();
                }
              }else{
                // Switch to keyboard mode
                mayaPipInputMode = "keyboard";
                if(icon) icon.className = 'fi fi-rr-keyboard';
                pipModeToggle.title = 'Switch to voice input';
                if(pipInput) pipInput.style.display = 'block';

                // Hide voice visualizer
                if(pipVoiceVisualizer){
                  pipVoiceVisualizer.classList.remove('active');
                }

                // Stop voice recognition and allow wake word again
                if(typeof mayaStopListening === 'function'){
                  mayaStopListening();
                }
                if(typeof wakeWordStart === 'function'){
                  setTimeout(function(){
                    if(typeof wakeWordIsEngaged === 'function'){
                      if(!wakeWordIsEngaged()){
                        wakeWordStart();
                      }
                    }else{
                      if(!mayaVisible){
                        wakeWordStart();
                      }
                    }
                  }, 300);
                }
              }
            });
          }

          if(pipInput){
            pipInput.addEventListener('keydown', function(e){
              if(e.key === 'Enter' && !e.shiftKey){
                e.preventDefault();
                pipSend.click();
              }
            });
          }

          if(pipSend){
            pipSend.addEventListener('click', function(){
              const text = pipInput.value.trim();
              if(!text) return;
              pipInput.value = '';

              // Delegate to main handler; it will add the user message once
              // and sync chat to PIP automatically.
              mayaHandleUser(text);
            });
          }

          // Sync chat to PIP (force immediate sync on PIP open)
          mayaSyncChatToPIP(true);

          // Initialize blob animation in PIP
          const pipBlobCanvas = pipDoc.getElementById('maya-pip-blob-canvas');
          if(pipBlobCanvas){
            mayaInitPIPBlobInWindow(pipBlobCanvas, pipDocumentWindow);
          }

          // Mark PIP as active
          mayaPipActive = true;
          mayaPipMode = "document";

          // CRITICAL: Ensure in-page PIP is hidden when using Document PIP
          if(mayaPipWindow){
            mayaPipWindow.classList.remove('active');
            mayaPipWindow.style.display = 'none';
          }

          console.log("MAYA: ✅ Document PIP successfully opened and active");
          mayaPipOpening = false;

          // Hide main MAYA UI (blob/chat) but keep shell visible for AI dots overlay
          if(mayaVisible){
            mayaVisible = false;
            // Don't hide the entire shell - just hide the blob shell so AI dots can still show
            if(mayaBlobShell){
              mayaBlobShell.style.visibility = 'hidden';
              mayaBlobShell.style.pointerEvents = 'none';
            }
          }

          // Handle PIP window close
          pipDocumentWindow.addEventListener('pagehide', function(){
            console.log("MAYA: 🔴 PIP window closed by user or system");
            mayaExitPIP();
          });

          return;
        }catch(e){
          console.warn("MAYA: ⚠️ Document PIP failed (likely no user activation):", e.name);
          console.log("MAYA: 🔄 Falling back to in-page PIP (floating window)");
          // Fall through to in-page PIP below
        }
      } else {
        console.log("MAYA: Document PIP API not available, using in-page PIP");
      }

      // CRITICAL RULE: NEVER show in-page PIP when parent tab is visible
      // In-page PIP should ONLY be used as a last resort and ONLY when tab is actually hidden
      if(!document.hidden || document.hasFocus()){
        console.log("MAYA: ❌ BLOCKED in-page PIP - parent tab is visible/focused");
        console.log("MAYA: Document hidden:", document.hidden, "Has focus:", document.hasFocus());
        console.log("MAYA: In-page PIP can ONLY render when tab is actually switched or window minimized");
        mayaPipOpening = false;
        return;
      }

      // Fallback: Use in-page PIP (floating window implementation)
      // This should rarely happen - Document PIP API is available in Chrome 116+
      console.log("MAYA: 📌 Using in-page PIP (floating window in bottom-right)");
      console.log("MAYA: ⚠️ WARNING: In-page PIP is a fallback - Document PIP API preferred");
      mayaPipActive = true;
      mayaPipMode = "inpage";

      // Show in-page PIP window ONLY if document is hidden
      if(mayaPipWindow && document.hidden && !document.hasFocus()){
        mayaPipWindow.style.display = 'block';
        mayaPipWindow.classList.add('active');
        console.log("MAYA: ✓ In-page PIP shown (document is hidden)");
      } else {
        console.log("MAYA: ❌ In-page PIP NOT shown - document is visible");
        mayaPipOpening = false;
        return;
      }

      // Hide main MAYA UI (blob/chat) but keep shell visible for AI dots overlay
      if(mayaVisible){
        mayaVisible = false;
        // Don't hide the entire shell - just hide the blob shell so AI dots can still show
        if(mayaBlobShell){
          mayaBlobShell.style.visibility = 'hidden';
          mayaBlobShell.style.pointerEvents = 'none';
        }
      }

      // Sync chat history to PIP
      mayaSyncChatToPIP(true);

      // Initialize PIP blob animation
      mayaInitPIPBlob();

      // CRITICAL: Monitor parent tab visibility and force-hide in-page PIP if tab becomes visible
      // This prevents in-page PIP from showing when user returns to parent tab
      var pipVisibilityMonitor = setInterval(function(){
        if(mayaPipMode === "inpage" && mayaPipWindow){
          // If parent tab is visible, force-hide in-page PIP
          if(!document.hidden || document.hasFocus()){
            console.log("MAYA: ⚠️ Parent tab became visible - force-hiding in-page PIP");
            mayaPipWindow.classList.remove('active');
            mayaPipWindow.style.display = 'none';
            clearInterval(pipVisibilityMonitor);
            mayaExitPIP();
          }
        } else {
          // Stop monitoring if not in in-page PIP mode
          clearInterval(pipVisibilityMonitor);
        }
      }, 100); // Check every 100ms

      mayaPipOpening = false;
    }

    // Exit PIP mode
    function mayaExitPIP(){
      console.log("MAYA: 🔵 Exiting PIP mode");

      // Reset retry counter
      pipRetryCount = 0;

      // Set cooldown timestamp
      pipLastExitTime = Date.now();

      // Mark PIP as inactive FIRST to prevent retry loops
      mayaPipActive = false;
      mayaPipMode = "none";

      // Close Document PIP window if open
      if(pipDocumentWindow){
        try{
          if(!pipDocumentWindow.closed){
            console.log("MAYA: Closing Document PIP window");
            pipDocumentWindow.close();
          } else {
            console.log("MAYA: Document PIP window already closed");
          }
        }catch(e){
          console.error("MAYA: Error closing PIP window:", e);
        }
        pipDocumentWindow = null;
      }

      // Hide in-page PIP and ensure it's completely hidden
      if(mayaPipWindow){
        mayaPipWindow.classList.remove('active');
        mayaPipWindow.style.display = 'none';
      }

      // Stop voice visualizer if active
      mayaStopPipVoiceVisualizer();

      // Ensure mic is stopped and PIP input mode reset
      if(typeof mayaStopListening === 'function'){
        mayaStopListening();
      }
      if(typeof mayaPipInputMode !== 'undefined'){
        mayaPipInputMode = "keyboard";
      }
      if(mayaPipModeToggle){
        var pipIcon = mayaPipModeToggle.querySelector('i');
        if(pipIcon){
          pipIcon.className = 'fi fi-rr-keyboard';
        }
        mayaPipModeToggle.title = 'Switch to voice input';
      }

      console.log("MAYA: ✅ PIP mode fully exited and cleaned up");
      if(mayaPipInput){
        mayaPipInput.style.display = 'block';
      }

      // Don't automatically restore sidebar - let mayaRestoreFromPIP() handle it
      // This allows PIP to close to blob instead of sidebar

      // Re-evaluate wake word state immediately
      if(typeof wakeWordMonitorVisibility === 'function'){
        wakeWordMonitorVisibility();
      }
    }

    // Restore from PIP to main window
    function mayaRestoreFromPIP(){
      console.log("MAYA: 🔵 mayaRestoreFromPIP() called - minimizing to blob");

      // Exit PIP first
      mayaExitPIP();

      // CRITICAL: Minimize to blob instead of opening sidebar
      console.log("MAYA: Setting mayaVisible = false, mayaSidePanel = false");
      mayaVisible = false;
      mayaSidePanel = false;

      var shell = document.getElementById('maya-shell');
      if(shell){
        // Restore main shell visibility without forcing sidebar layout
        shell.style.display = 'block';
        console.log("MAYA: Shell display restored:", shell.style.display);
      }

      // Ensure blob shell is minimized (no sidebar or fullscreen classes) and visible
      if(mayaBlobShell){
        mayaBlobShell.classList.remove('maya-side-panel');
        mayaBlobShell.classList.remove('maya-expanded');
        mayaBlobShell.style.animation = "";
        mayaBlobShell.style.visibility = 'visible';
        mayaBlobShell.style.pointerEvents = 'auto';
        console.log("MAYA: Blob shell classes after PIP restore:", mayaBlobShell.className);
      }

      // Stop any active listening
      if(typeof mayaStopListening === 'function'){
        mayaStopListening();
      }

      // Start wake word detection after a short delay
      setTimeout(function(){
        if(!mayaVisible && typeof wakeWordStart === 'function'){
          console.log("MAYA: ✅ Starting wake word detection after PIP close");
          wakeWordStart();
        }
      }, 500);

      console.log("MAYA: ✅ Minimized to blob complete. mayaVisible:", mayaVisible, "mayaSidePanel:", mayaSidePanel);
    }

    // Sync chat history from main to PIP (with smart DOM diffing to prevent flickering)
    function mayaSyncChatToPIP(force){
      try{
        var now = Date.now();
        if(!force && mayaLastPipSyncTime && (now - mayaLastPipSyncTime) < mayaPipSyncMinIntervalMs){
          return;
        }
        mayaLastPipSyncTime = now;

        if(!mayaChatTimeline) return;

        // Smart sync function that only updates changed/new messages (prevents flickering)
        function smartSyncMessages(targetEl){
          if(!targetEl) return;

          var sourceMessages = mayaChatTimeline.children;
          var targetMessages = targetEl.children;

          // If target is empty or has fewer messages, do a full sync
          if(targetMessages.length === 0 || targetMessages.length < sourceMessages.length - 5){
            targetEl.innerHTML = mayaChatTimeline.innerHTML;
            targetEl.scrollTop = targetEl.scrollHeight;
            return;
          }

          // Only append new messages (prevents flickering during streaming)
          var targetCount = targetMessages.length;
          var sourceCount = sourceMessages.length;

          if(sourceCount > targetCount){
            // Append only new messages
            for(var i = targetCount; i < sourceCount; i++){
              var clonedMsg = sourceMessages[i].cloneNode(true);
              targetEl.appendChild(clonedMsg);
            }
            targetEl.scrollTop = targetEl.scrollHeight;
          } else if(sourceCount === targetCount){
            // Update last message if it's being streamed (check if content changed)
            var lastSourceMsg = sourceMessages[sourceCount - 1];
            var lastTargetMsg = targetMessages[targetCount - 1];

            if(lastSourceMsg && lastTargetMsg){
              var sourceContent = lastSourceMsg.innerHTML;
              var targetContent = lastTargetMsg.innerHTML;

              // Only update if content actually changed (prevents unnecessary reflows)
              if(sourceContent !== targetContent){
                lastTargetMsg.innerHTML = sourceContent;
                targetEl.scrollTop = targetEl.scrollHeight;
              }
            }
          }
        }

        // Prefer syncing only to the active PIP surface
        if(mayaPipMode === "inpage" && mayaPipChat){
          smartSyncMessages(mayaPipChat);
        } else if(mayaPipMode === "document" && pipDocumentWindow && !pipDocumentWindow.closed){
          var pipDoc = pipDocumentWindow.document;
          var pipChatEl = pipDoc.getElementById('maya-pip-chat');
          if(pipChatEl){
            smartSyncMessages(pipChatEl);
          }
        } else {
          // Fallback: preserve previous behaviour if mode is unknown
          if(mayaPipChat){
            smartSyncMessages(mayaPipChat);
          }
          if(pipDocumentWindow && !pipDocumentWindow.closed){
            var pipDocFallback = pipDocumentWindow.document;
            var pipChatFallback = pipDocFallback.getElementById('maya-pip-chat');
            if(pipChatFallback){
              pipChatFallback.innerHTML = mayaChatTimeline.innerHTML;
              pipChatFallback.scrollTop = pipChatFallback.scrollHeight;
            }
          }
        }
      }catch(e){
        console.error("MAYA: Failed to sync chat to PIP", e);
      }
    }

    // Sync chat history from PIP to main
    function mayaSyncChatFromPIP(){
      mayaChatTimeline.innerHTML = mayaPipChat.innerHTML;
      // Scroll to bottom
      mayaChatTimeline.scrollTop = mayaChatTimeline.scrollHeight;
    }

    // Initialize PIP blob animation (with organic blob shape)
    function mayaInitPIPBlob(){
      if(!mayaPipBlobCanvas) return;

      var ctx = mayaPipBlobCanvas.getContext('2d');
      var width = 60;
      var height = 60;
      mayaPipBlobCanvas.width = width;
      mayaPipBlobCanvas.height = height;

      var centerX = width / 2;
      var centerY = height / 2;
      var baseRadius = 20;
      var noiseOffset = Math.random() * 1000;

      function hexWithAlpha(hex, alpha){
        var r = parseInt(hex.slice(1,3), 16);
        var g = parseInt(hex.slice(3,5), 16);
        var b = parseInt(hex.slice(5,7), 16);
        return "rgba("+r+","+g+","+b+","+alpha+")";
      }

      function drawPIPBlob(){
        var now = performance.now();
        ctx.clearRect(0, 0, width, height);

        var points = mayaSpeaking ? 10 : 8;
        var angleStep = (Math.PI * 2) / points;
        var noiseScale = mayaSpeaking ? 0.32 : 0.18;
        var speedMultiplier = mayaSpeaking ? 2.2 : 0.95;
        var rotationOffset = mayaSpeaking ? (now * 0.001) : 0;

        var grd = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.1, centerX, centerY, baseRadius * 1.2);
        if(mayaSpeaking){
          grd.addColorStop(0, hexWithAlpha("#4dffb3", 0.98));
          grd.addColorStop(0.5, hexWithAlpha("#4dffc8", 0.85));
          grd.addColorStop(1, hexWithAlpha("#4da3ff", 0));
        }else{
          grd.addColorStop(0, hexWithAlpha("#4da3ff", 0.95));
          grd.addColorStop(0.5, hexWithAlpha("#8b5dff", 0.75));
          grd.addColorStop(1, hexWithAlpha("#4da3ff", 0));
        }

        ctx.fillStyle = grd;
        ctx.beginPath();

        var pts = [];
        for(var i = 0; i < points; i++){
          var angle = i * angleStep + rotationOffset;
          var noise = Math.sin((now * speedMultiplier + noiseOffset + i * 100) / 800) * noiseScale;
          var noise2 = Math.cos((now * speedMultiplier + noiseOffset + i * 150) / 600) * noiseScale * 0.5;
          var r = baseRadius * (1 + noise + noise2);
          var px = centerX + Math.cos(angle) * r;
          var py = centerY + Math.sin(angle) * r;
          pts.push({x: px, y: py});
        }

        ctx.moveTo(pts[0].x, pts[0].y);
        for(var i = 0; i < points; i++){
          var p1 = pts[i];
          var p2 = pts[(i + 1) % points];
          var cp1x = p1.x + (p2.x - p1.x) * 0.5;
          var cp1y = p1.y + (p2.y - p1.y) * 0.5;
          ctx.quadraticCurveTo(p1.x, p1.y, cp1x, cp1y);
        }
        ctx.closePath();
        ctx.fill();

        requestAnimationFrame(drawPIPBlob);
      }

      drawPIPBlob();
    }

    // Initialize PIP blob animation in Document PIP window (with organic blob shape)
    function mayaInitPIPBlobInWindow(canvas, win){
      if(!canvas) return;

      var ctx = canvas.getContext('2d');
      var width = 60;
      var height = 60;
      canvas.width = width;
      canvas.height = height;

      var centerX = width / 2;
      var centerY = height / 2;
      var baseRadius = 20;
      var noiseOffset = Math.random() * 1000;

      function hexWithAlpha(hex, alpha){
        var r = parseInt(hex.slice(1,3), 16);
        var g = parseInt(hex.slice(3,5), 16);
        var b = parseInt(hex.slice(5,7), 16);
        return "rgba("+r+","+g+","+b+","+alpha+")";
      }

      function drawPIPBlob(){
        if(!win || win.closed) return; // Stop if window is closed

        var now = win.performance.now();
        ctx.clearRect(0, 0, width, height);

        var points = mayaSpeaking ? 10 : 8;
        var angleStep = (Math.PI * 2) / points;
        var noiseScale = mayaSpeaking ? 0.32 : 0.18;
        var speedMultiplier = mayaSpeaking ? 2.2 : 0.95;
        var rotationOffset = mayaSpeaking ? (now * 0.001) : 0;

        var grd = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.1, centerX, centerY, baseRadius * 1.2);
        if(mayaSpeaking){
          grd.addColorStop(0, hexWithAlpha("#4dffb3", 0.98));
          grd.addColorStop(0.5, hexWithAlpha("#4dffc8", 0.85));
          grd.addColorStop(1, hexWithAlpha("#4da3ff", 0));
        }else{
          grd.addColorStop(0, hexWithAlpha("#4da3ff", 0.95));
          grd.addColorStop(0.5, hexWithAlpha("#8b5dff", 0.75));
          grd.addColorStop(1, hexWithAlpha("#4da3ff", 0));
        }

        ctx.fillStyle = grd;
        ctx.beginPath();

        var pts = [];
        for(var i = 0; i < points; i++){
          var angle = i * angleStep + rotationOffset;
          var noise = Math.sin((now * speedMultiplier + noiseOffset + i * 100) / 800) * noiseScale;
          var noise2 = Math.cos((now * speedMultiplier + noiseOffset + i * 150) / 600) * noiseScale * 0.5;
          var r = baseRadius * (1 + noise + noise2);
          var px = centerX + Math.cos(angle) * r;
          var py = centerY + Math.sin(angle) * r;
          pts.push({x: px, y: py});
        }

        ctx.moveTo(pts[0].x, pts[0].y);
        for(var i = 0; i < points; i++){
          var p1 = pts[i];
          var p2 = pts[(i + 1) % points];
          var cp1x = p1.x + (p2.x - p1.x) * 0.5;
          var cp1y = p1.y + (p2.y - p1.y) * 0.5;
          ctx.quadraticCurveTo(p1.x, p1.y, cp1x, cp1y);
        }
        ctx.closePath();
        ctx.fill();

        win.requestAnimationFrame(drawPIPBlob);
      }

      drawPIPBlob();
    }

    // PIP event listeners
    mayaPipCloseBtn.addEventListener('click', function(){
      mayaExitPIP();
    });

    mayaPipRestoreBtn.addEventListener('click', function(){
      mayaRestoreFromPIP();
    });

    mayaPipCaptureBtn.addEventListener('click', function(){
      mayaCaptureScreen().then(function(screenshot){
        if(screenshot){
          mayaAddMessage('system', 'Screenshot captured successfully!');
          mayaSyncChatToPIP(true);
        }
      });
    });

    // PIP stop button - stop speaking
    if(mayaPipStopBtn){
      mayaPipStopBtn.addEventListener('click', function(){
        mayaStopSpeaking();
      });
    }

    // PIP mute button - toggle voice
    if(mayaPipMuteBtn){
      mayaPipMuteBtn.addEventListener('click', function(){
        mayaSpeechEnabled = !mayaSpeechEnabled;
        if(!mayaSpeechEnabled){
          mayaStopSpeaking();
          mayaPipMuteBtn.classList.add('muted');
          var icon = mayaPipMuteBtn.querySelector('i');
          if(icon) icon.className = 'fi fi-rr-volume-mute';
        }else{
          mayaPipMuteBtn.classList.remove('muted');
          var icon = mayaPipMuteBtn.querySelector('i');
          if(icon) icon.className = 'fi fi-rr-volume';
        }
      });
    }

    // PIP mode toggle button - switch between voice and keyboard
    if(mayaPipModeToggle){
      // Initialize PIP mode based on parent window's mode (will be set when entering PIP)
      // This is just the default initialization - actual mode is set in mayaEnterPIP()
      var mayaPipInitialIcon = mayaPipModeToggle.querySelector('i');
      if(typeof mayaPipInputMode === 'undefined'){
        mayaPipInputMode = "keyboard"; // Default fallback
      }

      if(mayaPipInitialIcon){
        if(mayaPipInputMode === "voice"){
          mayaPipInitialIcon.className = 'fi fi-rr-microphone';
          mayaPipModeToggle.title = 'Switch to keyboard input';
          if(mayaPipInput) mayaPipInput.style.display = 'none';
          // Show voice visualizer
          mayaStartPipVoiceVisualizer();
        } else {
          mayaPipInitialIcon.className = 'fi fi-rr-keyboard';
          mayaPipModeToggle.title = 'Switch to voice input';
          if(mayaPipInput) mayaPipInput.style.display = 'block';
          // Hide voice visualizer
          mayaStopPipVoiceVisualizer();
        }
      }

      mayaPipModeToggle.addEventListener('click', function(){
        var icon = mayaPipModeToggle.querySelector('i');

        if(typeof mayaPipInputMode === 'undefined'){
          mayaPipInputMode = "keyboard";
        }

        if(mayaPipInputMode === "keyboard"){
          // Switch to voice mode in PIP
          mayaPipInputMode = "voice";
          if(icon) icon.className = 'fi fi-rr-microphone';
          mayaPipModeToggle.title = 'Switch to keyboard input';
          if(mayaPipInput) mayaPipInput.style.display = 'none';

          // Show voice visualizer
          mayaStartPipVoiceVisualizer();

          // Stop wake word (if it was listening) and start main voice recognition
          if(typeof wakeWordStop === 'function'){
            wakeWordStop();
          }
          if(typeof mayaStartListening === 'function'){
            mayaStartListening();
          }
        }else{
          // Switch back to keyboard mode in PIP
          mayaPipInputMode = "keyboard";
          if(icon) icon.className = 'fi fi-rr-keyboard';
          mayaPipModeToggle.title = 'Switch to voice input';
          if(mayaPipInput) mayaPipInput.style.display = 'block';

          // Hide voice visualizer
          mayaStopPipVoiceVisualizer();

          // Stop voice recognition and allow wake word again
          if(typeof mayaStopListening === 'function'){
            mayaStopListening();
          }
          if(typeof wakeWordStart === 'function'){
            setTimeout(function(){
              if(typeof wakeWordIsEngaged === 'function'){
                if(!wakeWordIsEngaged()){
                  wakeWordStart();
                }
              }else{
                if(!mayaVisible){
                  wakeWordStart();
                }
              }
            }, 300);
          }
        }
      });
    }

    // PIP input handling
    mayaPipInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        mayaPipSend.click();
      }
    });

    mayaPipSend.addEventListener('click', function(){
      var text = mayaPipInput.value.trim();
      if(!text) return;

      mayaPipInput.value = '';

      // Delegate to main handler; it will add the user message once
      // and sync chat to PIP automatically.
      mayaHandleUser(text);
    });

    // Auto-enter PIP when tab is switched or window is minimized
    var pipAutoTriggerEnabled = true;
    var pipTriggerTimeout = null;
    var pipRetryCount = 0;
    var pipMaxRetries = 5;
    var pipLastExitTime = 0;
    var pipCooldownMs = 300; // 0.3s cooldown after exiting PIP (snappier re-entry)
    var pipUserInteracted = false; // Track if user has interacted with the page

    // Force PIP entry with aggressive retry logic
    function mayaForcePipEntry(){
      if(mayaPipActive || mayaPipOpening){
        console.log("MAYA: ✅ PIP already active or opening");
        pipRetryCount = 0;
        return;
      }

      // Check cooldown period after exiting PIP
      var timeSinceExit = Date.now() - pipLastExitTime;
      if(timeSinceExit < pipCooldownMs){
        console.log("MAYA: ⏳ PIP cooldown active (" + (pipCooldownMs - timeSinceExit) + "ms remaining), skipping");
        return;
      }

      // Don't trigger PIP if MAYA is in fullscreen mode
      var mayaShell = document.getElementById('maya-shell');
      if(mayaShell && mayaShell.classList.contains('maya-expanded')){
        console.log("MAYA: ⚠️ MAYA is in fullscreen mode, skipping PIP");
        return;
      }

      // Check if there's already a PIP window open (even if closed incorrectly)
      if(pipDocumentWindow && !pipDocumentWindow.closed){
        console.log("MAYA: ⚠️ PIP window already exists, closing it first");
        try{
          pipDocumentWindow.close();
        }catch(e){
          console.error("MAYA: Error closing existing PIP:", e);
        }
        pipDocumentWindow = null;
        // Wait a bit before opening new PIP
        setTimeout(mayaForcePipEntry, 300);
        return;
      }

      console.log("MAYA: 🚀 FORCE ENTERING PIP MODE (attempt " + (pipRetryCount + 1) + ")");

      // If MAYA is not visible (blob state), open it first in sidebar mode
      if(!mayaVisible){
        console.log("MAYA: Opening MAYA in sidebar before entering PIP");
        mayaShowPanel(); // Open in sidebar mode

        // Wait a bit for sidebar to open, then enter PIP
        setTimeout(function(){
          if(!mayaPipActive && !mayaPipOpening){
            console.log("MAYA: Now entering PIP after sidebar opened");
            mayaEnterPIP();

            // Verify PIP opened successfully
            setTimeout(function(){
              if(!mayaPipActive && pipRetryCount < pipMaxRetries){
                pipRetryCount++;
                console.log("MAYA: ⚠️ PIP failed to open, retrying...");
                mayaForcePipEntry();
              } else if(mayaPipActive){
                console.log("MAYA: ✅ PIP successfully opened");
                pipRetryCount = 0;
              }
            }, 200);
          }
        }, 150);
      } else {
        // MAYA is already visible, enter PIP immediately
        mayaEnterPIP();

        // Verify PIP opened successfully
        setTimeout(function(){
          if(!mayaPipActive && pipRetryCount < pipMaxRetries){
            pipRetryCount++;
            console.log("MAYA: ⚠️ PIP failed to open, retrying...");
            mayaForcePipEntry();
          } else if(mayaPipActive){
            console.log("MAYA: ✅ PIP successfully opened");
            pipRetryCount = 0;
          }
        }, 200);
      }
    }

    // Enable PIP mode programmatically (can be called from other scripts)
    window.mayaEnablePipMode = function(){
      console.log("MAYA: 🔧 Enabling PIP mode programmatically");
      pipAutoTriggerEnabled = true;
      
      // If document is already hidden, trigger PIP immediately
      if(document.hidden){
        console.log("MAYA: Document is hidden, triggering PIP immediately");
        mayaForcePipEntry();
      }
    };

    // Disable PIP mode programmatically
    window.mayaDisablePipMode = function(){
      console.log("MAYA: 🔧 Disabling PIP mode");
      pipAutoTriggerEnabled = false;
    };

    // Primary trigger: Tab visibility change
    var lastVisibilityChange = 0;
    var pipParentUrl = window.location.href; // Store the parent URL when MAYA loads
    var pipLastFocusState = document.hasFocus();

    document.addEventListener('visibilitychange', function(){
      if(!pipAutoTriggerEnabled) return;

      // Debounce rapid visibility changes
      var now = Date.now();
      if(now - lastVisibilityChange < 100){ // Reduced from 200ms to 100ms for faster response
        console.log("MAYA: ⏭️ Skipping rapid visibility change");
        return;
      }
      lastVisibilityChange = now;

      // Clear any pending PIP trigger
      if(pipTriggerTimeout){
        clearTimeout(pipTriggerTimeout);
        pipTriggerTimeout = null;
      }

      if(document.hidden){
        // CRITICAL FIX: Only trigger PIP if we're still on the parent URL
        // This prevents PIP from triggering on native browser popups (mic permission, location, etc.)
        var currentUrl = window.location.href;
        if(currentUrl !== pipParentUrl){
          console.log("MAYA: ⚠️ URL changed from parent - skipping PIP (likely a popup or navigation)");
          console.log("MAYA: Parent URL:", pipParentUrl);
          console.log("MAYA: Current URL:", currentUrl);
          return;
        }

        // IMMEDIATE TRIGGER: Don't wait - trigger PIP immediately when tab is hidden
        console.log("MAYA: 🔴 TAB HIDDEN - IMMEDIATE PIP TRIGGER");
        pipRetryCount = 0;
        mayaForcePipEntry();

        // Aggressive backup triggers with shorter delays
        setTimeout(function(){
          if(!mayaPipActive && document.hidden){
            console.log("MAYA: 🔄 Backup trigger 1 (50ms)");
            mayaForcePipEntry();
          }
        }, 50);

        setTimeout(function(){
          if(!mayaPipActive && document.hidden){
            console.log("MAYA: 🔄 Backup trigger 2 (150ms)");
            mayaForcePipEntry();
          }
        }, 150);

        setTimeout(function(){
          if(!mayaPipActive && document.hidden){
            console.log("MAYA: 🔄 Backup trigger 3 (300ms)");
            mayaForcePipEntry();
          }
        }, 300);

        setTimeout(function(){
          if(!mayaPipActive && document.hidden){
            console.log("MAYA: 🔄 Backup trigger 4 (600ms)");
            mayaForcePipEntry();
          }
        }, 600);
      } else {
        // Tab restored - exit PIP and minimize to blob
        console.log("MAYA: 🟢 TAB VISIBLE AGAIN - Minimizing to blob");
        pipRetryCount = 0;

        // CRITICAL: Force hide in-page PIP window when tab becomes visible
        if(mayaPipWindow){
          mayaPipWindow.classList.remove('active');
          mayaPipWindow.style.display = 'none';
        }

        if(mayaPipActive){
          console.log("MAYA: Closing PIP and minimizing to blob");
          mayaRestoreFromPIP();
        } else {
          console.log("MAYA: PIP not active, nothing to restore");
        }
      }
    });

    // Secondary trigger: Window blur for faster PIP activation
    window.addEventListener('blur', function(){
      if(!pipAutoTriggerEnabled) return;

      // Immediate check - if document is hidden, trigger PIP right away
      if(document.hidden){
        console.log("MAYA: 🔴 WINDOW BLURRED + DOCUMENT HIDDEN - Immediate PIP trigger");
        pipRetryCount = 0;
        mayaForcePipEntry();
        
        // Quick backup
        setTimeout(function(){
          if(!mayaPipActive && document.hidden){
            console.log("MAYA: 🔄 Window blur backup trigger (100ms)");
            mayaForcePipEntry();
          }
        }, 100);
      } else {
        // Document not hidden yet - wait a moment to see if it becomes hidden
        setTimeout(function(){
          if(document.hidden && !document.hasFocus()){
            console.log("MAYA: 🔴 WINDOW BLURRED (delayed check) - Document now hidden, triggering PIP");
            pipRetryCount = 0;
            mayaForcePipEntry();
          }
        }, 50);
      }
    });

    // Additional trigger: Page hide event (for browser minimize)
    document.addEventListener('pagehide', function(){
      if(!pipAutoTriggerEnabled) return;

      // Only trigger if document is actually hidden
      if(document.hidden){
        console.log("MAYA: 🔴 PAGE HIDE - Triggering PIP");
        pipRetryCount = 0;
        mayaForcePipEntry();
      }
    });

    // CRITICAL SAFETY MONITOR: Force-hide in-page PIP if parent tab is visible
    // This is a failsafe to ensure in-page PIP NEVER shows when parent tab is visible
    setInterval(function(){
      // Check if in-page PIP is active and visible
      if(mayaPipMode === "inpage" && mayaPipWindow){
        var pipIsVisible = mayaPipWindow.classList.contains('active') ||
                          mayaPipWindow.style.display === 'block';

        // If parent tab is visible/focused, force-hide in-page PIP
        if(pipIsVisible && (!document.hidden || document.hasFocus())){
          console.log("MAYA: 🚨 SAFETY MONITOR - Force-hiding in-page PIP (parent tab is visible)");
          mayaPipWindow.classList.remove('active');
          mayaPipWindow.style.display = 'none';
          mayaExitPIP();
        }
      }

      // Check if document is hidden but PIP is not active (trigger PIP)
      if(!pipAutoTriggerEnabled) return;

      if(document.hidden && !document.hasFocus() && !mayaPipActive){
        // Respect cooldown period
        var timeSinceExit = Date.now() - pipLastExitTime;
        if(timeSinceExit >= pipCooldownMs){
          console.log("MAYA: 🔴 INTERVAL CHECK - Document hidden, forcing PIP");
          pipRetryCount = 0;
          mayaForcePipEntry();
        }
      }
    }, 200); // Check every 200ms for faster response

    // Track user interaction for Document PIP API
    // Document PIP requires user activation, so we track any user interaction
    function markUserInteraction(){
      if(!pipUserInteracted){
        pipUserInteracted = true;
        console.log("MAYA: ✅ User interaction detected - Document PIP enabled");
      }
    }

    // Listen for any user interaction
    document.addEventListener('click', markUserInteraction, {once: false});
    document.addEventListener('keydown', markUserInteraction, {once: false});
    document.addEventListener('touchstart', markUserInteraction, {once: false});
    document.addEventListener('mousedown', markUserInteraction, {once: false});

// Wake word detection for "Hey Maya" or "Maya"
    // Only active when fullscreen/sidebar is closed

    var wakeWordRecognition = null;
    var wakeWordActive = false;
    var wakeWordListening = false;
    var wakeWordLastTrigger = 0;
    var wakeWordDebounceMs = 1500; // 1.5 seconds debounce to prevent multiple triggers
    var wakeWordRestartAttempts = 0;
    var wakeWordMaxRestartAttempts = 5;

    // Fuzzy matching with Levenshtein distance for wake word detection
    function wakeWordFuzzyMatch(text, target, maxDistance) {
      if (!text || !target) return false;

      text = text.toLowerCase().trim();
      target = target.toLowerCase().trim();

      // Exact match
      if (text === target) return true;

      // Contains match
      if (text.includes(target)) return true;

      // Calculate Levenshtein distance
      function levenshtein(a, b) {
        var matrix = [];
        for (var i = 0; i <= b.length; i++) {
          matrix[i] = [i];
        }
        for (var j = 0; j <= a.length; j++) {
          matrix[0][j] = j;
        }
        for (var i = 1; i <= b.length; i++) {
          for (var j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        return matrix[b.length][a.length];
      }

      var distance = levenshtein(text, target);
      return distance <= (maxDistance || 2);
    }

    // Phonetic normalization for Indian English and Hindi pronunciations
    function wakeWordNormalizePhonetic(text) {
      if (!text) return "";

      text = text.toLowerCase().trim();

      // Remove punctuation
      text = text.replace(/[,\.!?;:]/g, '');

      // Normalize spaces
      text = text.replace(/\s+/g, ' ');

      // Handle common speech recognition errors for "Maya"
      text = text.replace(/\bmy\s+ya\b/g, 'maya');
      text = text.replace(/\bmy\s+a\b/g, 'maya');
      text = text.replace(/\bmay\s+ya\b/g, 'maya');
      text = text.replace(/\bmay\s+a\b/g, 'maya');
      text = text.replace(/\bmai\s+ya\b/g, 'maya');
      text = text.replace(/\bmai\s+a\b/g, 'maya');
      text = text.replace(/\bmya\b/g, 'maya');

      return text;
    }

    // Check if text contains wake word with fuzzy matching
    function wakeWordDetectInText(text) {
      if (!text) return false;

      // Normalize the text phonetically
      var normalizedText = wakeWordNormalizePhonetic(text);
      var originalText = text.toLowerCase().trim();

      // Wake word patterns with fuzzy matching
      var wakeWords = [
        "maya",
        "hey maya",
        "hi maya",
        "ok maya",
        "okay maya",
        "maia",
        "hey maia",
        "hi maia"
      ];

      // Check each wake word with fuzzy matching
      for (var i = 0; i < wakeWords.length; i++) {
        var wakeWord = wakeWords[i];

        // Check in normalized text with fuzzy matching (max 2 char difference)
        if (wakeWordFuzzyMatch(normalizedText, wakeWord, 2)) {
          console.log("WAKE WORD: ✓ DETECTED '" + wakeWord + "' in normalized text");
          return true;
        }

        // Check in original text with fuzzy matching
        if (wakeWordFuzzyMatch(originalText, wakeWord, 2)) {
          console.log("WAKE WORD: ✓ DETECTED '" + wakeWord + "' in original text");
          return true;
        }

        // Check individual words with fuzzy matching
        var words = normalizedText.split(/\s+/);
        for (var j = 0; j < words.length; j++) {
          if (wakeWordFuzzyMatch(words[j], "maya", 1) || wakeWordFuzzyMatch(words[j], "maia", 1)) {
            console.log("WAKE WORD: ✓ DETECTED in word '" + words[j] + "'");
            return true;
          }
        }
      }

      return false;
    }

    // Initialize wake word detection
    function wakeWordInit() {
      console.log("WAKE WORD: Initializing wake word detection...");

      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log("WAKE WORD: ❌ Speech recognition not supported in this browser");
        console.log("WAKE WORD: Please use Chrome, Edge, or Safari for wake word functionality");
        return;
      }

      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      wakeWordRecognition = new SpeechRecognition();

      wakeWordRecognition.continuous = true;
      wakeWordRecognition.interimResults = true;
      wakeWordRecognition.lang = 'en-IN'; // Indian English for better Hindi-English mix
      wakeWordRecognition.maxAlternatives = 5; // Check more alternatives for better detection

      console.log("WAKE WORD: ✓ Speech recognition configured (continuous, interim results, en-IN)");

      wakeWordRecognition.onresult = function(event) {
        for (var i = event.resultIndex; i < event.results.length; i++) {
          var result = event.results[i];

          // Check all alternatives for wake wordœ
          for (var j = 0; j < result.length; j++) {
            var alternative = result[j];
            var transcript = alternative.transcript;
            var confidence = alternative.confidence || 1;

            // Lower confidence threshold for better detection (0.4 or higher for interim, any for final)
            if (confidence >= 0.4 || result.isFinal) {
              if (wakeWordDetectInText(transcript)) {
                console.log("WAKE WORD: ✓✓✓ DETECTED! Triggering MAYA... (confidence:", confidence.toFixed(2), "transcript:", transcript, ")");
                wakeWordTriggerMaya();
                wakeWordRestartAttempts = 0; // Reset restart attempts on successful detection
                return;
              }
            }
          }
        }
      };

      wakeWordRecognition.onerror = function(event) {
        console.log("WAKE WORD: Recognition error:", event.error);
        wakeWordListening = false;

        // Restart on most errors except permission denied
        if (event.error !== 'aborted' && event.error !== 'not-allowed') {
          // Increase restart attempts counter
          wakeWordRestartAttempts++;

          if (wakeWordRestartAttempts < wakeWordMaxRestartAttempts) {
            setTimeout(function() {
              if (
                wakeWordActive &&
                !wakeWordListening &&
                !(typeof wakeWordIsEngaged === 'function' ? wakeWordIsEngaged() : mayaVisible)
              ) {
                console.log("WAKE WORD: Restarting after error (attempt " + wakeWordRestartAttempts + "/" + wakeWordMaxRestartAttempts + ")");
                wakeWordStart();
              }
            }, 1000);
          } else {
            console.log("WAKE WORD: Max restart attempts reached, waiting for manual trigger");
            // Reset after a longer delay
            setTimeout(function() {
              wakeWordRestartAttempts = 0;
            }, 10000);
          }
        }
      };

      wakeWordRecognition.onend = function() {
        console.log("WAKE WORD: Recognition ended, wakeWordActive:", wakeWordActive, "mayaVisible:", mayaVisible);
        wakeWordListening = false;

        // Always auto-restart if still active and assistant is idle
        if (wakeWordActive && !(typeof wakeWordIsEngaged === 'function' ? wakeWordIsEngaged() : mayaVisible)) {
          setTimeout(function() {
            if (
              wakeWordActive &&
              !wakeWordListening &&
              !(typeof wakeWordIsEngaged === 'function' ? wakeWordIsEngaged() : mayaVisible)
            ) {
              console.log("WAKE WORD: Auto-restarting");
              wakeWordStart();
              wakeWordRestartAttempts = 0; // Reset restart attempts on successful auto-restart
            } else {
              console.log("WAKE WORD: Not restarting - wakeWordActive:", wakeWordActive, "wakeWordListening:", wakeWordListening, "mayaVisible:", mayaVisible);
            }
          }, 500); // Faster restart
        }
      };

      wakeWordRecognition.onstart = function() {
        console.log("WAKE WORD: Recognition started");
        wakeWordListening = true;
      };

      console.log("WAKE WORD: Initialized");
    }

    // Start wake word detection
    function wakeWordStart() {
      // Don't start if assistant is already engaged (main UI open or PIP in voice mode)
      if (typeof wakeWordIsEngaged === 'function' ? wakeWordIsEngaged() : mayaVisible) {
        console.log("WAKE WORD: Not starting - assistant is engaged (mayaVisible:", mayaVisible, ")");
        return;
      }

      if (!wakeWordRecognition) {
        console.log("WAKE WORD: Recognition not initialized, initializing now...");
        wakeWordInit();
      }

      if (!wakeWordRecognition) {
        console.log("WAKE WORD: ❌ Recognition not available (browser may not support Web Speech API)");
        return;
      }

      if (wakeWordListening) {
        console.log("WAKE WORD: Already listening");
        return;
      }

      try {
        wakeWordRecognition.start();
        wakeWordActive = true;
        console.log("WAKE WORD: ✓✓✓ Started listening for wake word ('Hey Maya' or 'Maya')");
        console.log("WAKE WORD: 🎤 Microphone is now active - say 'Hey Maya' to activate");
        wakeWordRestartAttempts = 0; // Reset restart attempts on successful start

        // Add visual indicator to blob (subtle pulse)
        if (typeof mayaBlobCard !== 'undefined' && mayaBlobCard) {
          mayaBlobCard.title = "🎤 Listening for 'Hey Maya' - Click to open";
        }
      } catch (error) {
        console.log("WAKE WORD: ❌ Error starting:", error);
        console.log("WAKE WORD: Error message:", error.message);
        wakeWordListening = false;
        wakeWordActive = false;

        // Try to restart after a delay if not a permission error
        if (error.message && !error.message.includes('already started')) {
          wakeWordRestartAttempts++;
          if (wakeWordRestartAttempts < wakeWordMaxRestartAttempts) {
            console.log("WAKE WORD: Will retry in 2 seconds (attempt " + wakeWordRestartAttempts + "/" + wakeWordMaxRestartAttempts + ")");
            setTimeout(function() {
              if (!wakeWordListening && !(typeof wakeWordIsEngaged === 'function' ? wakeWordIsEngaged() : mayaVisible)) {
                console.log("WAKE WORD: Retrying start after error (attempt " + wakeWordRestartAttempts + ")");
                wakeWordStart();
              }
            }, 2000);
          } else {
            console.log("WAKE WORD: ❌ Max retry attempts reached - wake word disabled");
          }
        }
      }
    }

    // Stop wake word detection
    function wakeWordStop() {
      wakeWordActive = false;

      if (wakeWordRecognition && wakeWordListening) {
        try {
          wakeWordRecognition.stop();
          wakeWordListening = false;
          console.log("WAKE WORD: ✓ Stopped listening");
        } catch (error) {
          console.log("WAKE WORD: Error stopping:", error);
          wakeWordListening = false;
        }
      }
    }

    // Trigger MAYA when wake word is detected
    function wakeWordTriggerMaya() {
      // Check debounce - prevent multiple triggers within 2 seconds
      var now = Date.now();
      if (now - wakeWordLastTrigger < wakeWordDebounceMs) {
        console.log("WAKE WORD: Debounced - ignoring");
        return;
      }

      // If PIP is active, use wake word to switch from keyboard to mic mode
      if (typeof mayaPipActive !== 'undefined' && mayaPipActive) {
        console.log("WAKE WORD: Trigger received while PIP is active");
        wakeWordLastTrigger = now;

        // Only switch if PIP is currently in keyboard mode
        if (typeof mayaPipInputMode !== 'undefined' && mayaPipInputMode === 'keyboard') {
          console.log("WAKE WORD: Switching PIP from keyboard to voice mode");

          // Stop wake word listening (mic will be used for main voice input)
          wakeWordStop();

          // Check if we're in Document PIP mode or in-page PIP mode
          if (typeof mayaPipMode !== 'undefined' && mayaPipMode === 'document' && pipDocumentWindow && !pipDocumentWindow.closed) {
            // Document PIP mode - find toggle button in PIP document
            console.log("WAKE WORD: Switching Document PIP to voice mode");
            try {
              var pipDoc = pipDocumentWindow.document;
              var pipToggle = pipDoc.getElementById('maya-pip-mode-toggle');
              if (pipToggle) {
                pipToggle.click();
                console.log("WAKE WORD: ✓ Clicked Document PIP mode toggle");
              } else {
                console.log("WAKE WORD: Document PIP toggle not found, starting listening directly");
                if (typeof mayaStartListening === 'function') {
                  mayaStartListening();
                }
              }
            } catch(err) {
              console.log("WAKE WORD: Error accessing Document PIP:", err);
              if (typeof mayaStartListening === 'function') {
                mayaStartListening();
              }
            }
          } else if (typeof mayaPipModeToggle !== 'undefined' && mayaPipModeToggle) {
            // In-page PIP mode - use the regular toggle button
            console.log("WAKE WORD: Switching in-page PIP to voice mode");
            try{
              mayaPipModeToggle.click();
              console.log("WAKE WORD: ✓ Clicked in-page PIP mode toggle");
            }catch(err){
              console.log("WAKE WORD: Error clicking toggle:", err);
              if (typeof mayaStartListening === 'function') {
                mayaStartListening();
              }
            }
          } else {
            // Fallback: start listening directly
            console.log("WAKE WORD: No toggle found, starting listening directly");
            if (typeof mayaStartListening === 'function') {
              mayaStartListening();
            }
          }
        } else {
          console.log("WAKE WORD: PIP already in voice mode, ignoring");
        }
        return;
      }

      // Only trigger full MAYA UI if it is not already visible
      if (mayaVisible) {
        console.log("WAKE WORD: MAYA already visible, ignoring");
        return;
      }

      console.log("WAKE WORD: ✓✓✓ TRIGGERING MAYA!");
      wakeWordLastTrigger = now;

      // Stop wake word listening (will restart when MAYA closes)
      wakeWordStop();

      // Simulate click on the blob to open main UI
      if (mayaBlobCard) {
        mayaBlobCard.click();
      }
    }

    // Monitor MAYA visibility and PIP state to start/stop wake word detection
    var wakeWordLastEngagedState = null;
    function wakeWordIsEngaged() {
      // Assistant is "engaged" when main UI is visible or PIP is in voice mode
      try{
        if (mayaVisible) return true;
        if (typeof mayaPipActive !== 'undefined' && mayaPipActive && typeof mayaPipInputMode !== 'undefined' && mayaPipInputMode === 'voice') {
          return true;
        }
      }catch(_){
        // Ignore errors and treat as not engaged
      }
      return false;
    }

    function wakeWordMonitorVisibility() {
      var engaged = wakeWordIsEngaged();

      // Only act if state changed (optimization)
      if (engaged === wakeWordLastEngagedState) {
        return;
      }

      wakeWordLastEngagedState = engaged;

      if (engaged) {
        // Assistant UI is open or PIP mic is active - stop wake word detection
        console.log("WAKE WORD: Assistant engaged, stopping wake word detection");
        wakeWordStop();
      } else {
        // Assistant is idle (closed or PIP in keyboard mode) - start wake word detection
        console.log("WAKE WORD: Assistant idle, starting wake word detection");
        setTimeout(function() {
          if (!wakeWordIsEngaged()) {
            wakeWordStart();
          }
        }, 500);
      }
    }

    // Request microphone permission on page load and save it
    var mayaMicPermissionGranted = false;

    function mayaRequestMicPermission() {
      console.log("MAYA: Requesting microphone permission...");

      // Check if permission is already granted
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'microphone' }).then(function(permissionStatus) {
          console.log("MAYA: Microphone permission status:", permissionStatus.state);

          if (permissionStatus.state === 'granted') {
            mayaMicPermissionGranted = true;
            console.log("MAYA: ✓ Microphone permission already granted");
            mayaInitWakeWordAfterPermission();
          } else if (permissionStatus.state === 'prompt') {
            // Request permission by trying to access microphone
            mayaRequestMicAccess();
          } else {
            console.log("MAYA: ⚠️ Microphone permission denied");
          }

          // Listen for permission changes
          permissionStatus.onchange = function() {
            console.log("MAYA: Microphone permission changed to:", this.state);
            if (this.state === 'granted') {
              mayaMicPermissionGranted = true;
              mayaInitWakeWordAfterPermission();
            } else {
              mayaMicPermissionGranted = false;
              wakeWordStop();
            }
          };
        }).catch(function(err) {
          console.log("MAYA: Permission API not available, trying direct access:", err);
          mayaRequestMicAccess();
        });
      } else {
        // Fallback for browsers without Permissions API
        mayaRequestMicAccess();
      }
    }

    function mayaRequestMicAccess() {
      console.log("MAYA: Requesting microphone access...");

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function(stream) {
          console.log("MAYA: ✓ Microphone access granted!");
          mayaMicPermissionGranted = true;

          // Stop the stream immediately (we just needed permission)
          stream.getTracks().forEach(function(track) {
            track.stop();
          });

          // Initialize wake word after permission granted
          mayaInitWakeWordAfterPermission();
        })
        .catch(function(err) {
          console.log("MAYA: ⚠️ Microphone access denied:", err);
          console.log("MAYA: Wake word will NOT work without microphone permission");
          console.log("MAYA: Please allow microphone access and refresh the page");
          mayaMicPermissionGranted = false;

          // Show a user-friendly message
          if (typeof mayaAddMessage === 'function') {
            setTimeout(function() {
              console.log("MAYA: ⚠️ Microphone permission is required for wake word detection");
            }, 1000);
          }
        });
    }

    function mayaInitWakeWordAfterPermission() {
      console.log("MAYA: ✓ Initializing wake word with mic permission...");

      // Initialize wake word
      wakeWordInit();

      // CRITICAL: Start wake word detection immediately (blob is minimized by default)
      // Don't wait for MAYA to be opened - wake word should work from page load
      setTimeout(function() {
        var isEngaged = (typeof wakeWordIsEngaged === 'function' ? wakeWordIsEngaged() : mayaVisible);
        console.log("MAYA: Wake word engagement check - isEngaged:", isEngaged, "mayaVisible:", mayaVisible);

        if (!isEngaged) {
          console.log("MAYA: ✓ Starting wake word detection (blob is minimized)...");
          wakeWordStart();
        } else {
          console.log("MAYA: ⚠️ Wake word NOT started - assistant is engaged");
        }
      }, 500);

      // Monitor visibility/PIP changes more frequently for better responsiveness
      if (!window.mayaWakeWordMonitorInterval) {
        window.mayaWakeWordMonitorInterval = setInterval(wakeWordMonitorVisibility, 500);
        console.log("MAYA: ✓ Wake word monitor started (checking every 500ms)");
      }
    }

    // Initialize wake word detection on page load
    window.addEventListener('load', function() {
      console.log("WAKE WORD: ✓ Page loaded, initializing...");

      // Request mic permission immediately (no delay)
      // User needs to grant permission for wake word to work
      setTimeout(function() {
        console.log("MAYA: ✓ Requesting microphone permission for wake word...");
        mayaRequestMicPermission();
      }, 1000); // Short 1 second delay to let page render
    });

    // Stop wake word when page unloads
    window.addEventListener('beforeunload', function() {
      wakeWordStop();
      if (window.mayaWakeWordMonitorInterval) {
        clearInterval(window.mayaWakeWordMonitorInterval);
      }
    });

    console.log("WAKE WORD: Script loaded");
