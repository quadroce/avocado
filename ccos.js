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
  // This is a placeholder for the actual CCOS logic
  // In a real implementation, you would:
  // 1. Parse the VTT content
  // 2. Analyze the video frames at each caption timestamp
  // 3. Check for overlaps between captions and on-screen text
  // 4. Adjust caption timings as needed

  // For now, we'll just add a small delay to each caption as an example
  const parsedVtt = parseVTT(vttContent);
  const adjustedVtt = adjustCaptionTimings(parsedVtt);
  return formatVTT(adjustedVtt);
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
