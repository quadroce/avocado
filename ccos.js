// ccos.js
document.addEventListener('DOMContentLoaded', function() {
 
let ccosVttContent = '';

document.getElementById('ccosVttFileInput').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      ccosVttContent = e.target.result;
      document.getElementById('ccosInputVtt').value = ccosVttContent;
    };
    reader.readAsText(file);
  }
});

async function checkCaptionOnScreen() {
  const mp4Url = document.getElementById('mp4UrlInput').value;

  if (!mp4Url || !ccosVttContent) {
    logMessage('Please provide both MP4 URL and VTT file for CCOS', 'error');
    return;
  }

  try {
    // Fetch the MP4 file
    const response = await fetch(mp4Url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const videoBlob = await response.blob();

    // Process the video and VTT
    const processedVtt = await processCaptionsOnScreen(videoBlob, ccosVttContent);

    // Update the output textarea
    document.getElementById('outputVtt').value = processedVtt;
    logMessage('CCOS processing complete', 'merge');
  } catch (error) {
    logMessage(`Error in CCOS: ${error.message}`, 'error');
  }
}

async function processCaptionsOnScreen(videoBlob, vttContent) {
  // 1. Parse the VTT content
  const parsedVtt = parseVTT(vttContent);

  // 2. Analyze the video frames at each caption timestamp
  const videoAnalysis = await analyzeVideoFrames(videoBlob, parsedVtt);

  // 3. Check for overlaps between captions and on-screen text
  const overlaps = detectOverlaps(parsedVtt, videoAnalysis);

  // 4. Adjust caption timings as needed
  const adjustedVtt = adjustCaptionTimings(parsedVtt, overlaps);

  // Return the formatted VTT
  return formatVTT(adjustedVtt);
}

// Helper functions

async function analyzeVideoFrames(videoBlob, captions) {
  // In a real implementation, this would use a video processing library or API
  // For this example, we'll simulate the analysis with random data
  return captions.map(caption => ({
    timestamp: caption.start,
    hasOnScreenText: Math.random() > 0.7, // 30% chance of on-screen text
    textRegions: Math.random() > 0.5 ? ['bottom', 'top'] : ['bottom'] // Simulated text regions
  }));
}

function detectOverlaps(captions, videoAnalysis) {
  return captions.map((caption, index) => {
    const analysis = videoAnalysis[index];
    if (analysis.hasOnScreenText) {
      // Simulate overlap detection
      const captionPosition = getCaptionPosition(caption);
      return analysis.textRegions.includes(captionPosition);
    }
    return false;
  });
}

function getCaptionPosition(caption) {
  // Simple logic to determine caption position based on content
  // In a real scenario, this would be more sophisticated
  const text = caption.text.join(' ').toLowerCase();
  if (text.includes('top')) return 'top';
  if (text.includes('middle')) return 'middle';
  return 'bottom'; // default position
}

function adjustCaptionTimings(captions, overlaps) {
  return captions.map((caption, index) => {
    if (overlaps[index]) {
      // If there's an overlap, adjust the timing
      return {
        ...caption,
        start: addDelay(caption.start, 0.5), // Move caption 0.5 seconds later
        end: addDelay(caption.end, 0.5)
      };
    }
    return caption;
  });
}


function parseVTT(vttContent) {
  // Simple VTT parsing (this should be more robust in a real implementation)
  const lines = vttContent.trim().split('\n');
  const captions = [];
  let currentCaption = null;

  for (const line of lines) {
    if (line.includes('-->')) {
      const [start, end] = line.split('-->').map(t => t.trim());
      currentCaption = { start, end, text: [] };
      captions.push(currentCaption);
    } else if (currentCaption) {
      currentCaption.text.push(line);
    }
  }

  return captions;
}

function adjustCaptionTimings(captions) {
  // Simple adjustment: add a small delay to each caption
  return captions.map(caption => ({
    ...caption,
    start: addDelay(caption.start, 0.1),
    end: addDelay(caption.end, 0.1)
  }));
}

function addDelay(timeString, secondsToAdd) {
  const [minutes, seconds] = timeString.split(':').map(Number);
  const totalSeconds = minutes * 60 + seconds + secondsToAdd;
  const newMinutes = Math.floor(totalSeconds / 60);
  const newSeconds = (totalSeconds % 60).toFixed(3);
  return `${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(6, '0')}`;
}

function formatVTT(captions) {
  return 'WEBVTT\n\n' + captions.map(caption => 
    `${caption.start} --> ${caption.end}\n${caption.text.join('\n')}`
  ).join('\n\n');
}

function logMessage(message, type = 'info') {
  const logOutput = document.getElementById('logOutput');
  const logEntry = document.createElement('div');
  logEntry.textContent = message;
  logEntry.className = type;
  logOutput.appendChild(logEntry);
  logOutput.scrollTop = logOutput.scrollHeight;
}
 // Your JavaScript code here
});
// Event listener for the CCOS button
document.getElementById('ccosButton').addEventListener('click', checkCaptionOnScreen);
