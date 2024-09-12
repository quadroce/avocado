// Main function to handle button click
function formatAndDisplayText() {
  const inputText = document.getElementById("inputText").value;
  const processedCaptions = formatText(inputText);
  const mergedCaptions = mergeCaptions(processedCaptions);
  
  const formattedText = mergedCaptions.map(caption => {
    if (caption.type === 'header') {
      return caption.content;
    }
    return `${caption.timestamp}\n${caption.text}`;
  }).join('\n\n');
  
  const correctedText = correctText(formattedText);
  document.getElementById("outputText").textContent = correctedText;
}

// Process the input text and identify captions for merging
function formatText(text) {
  if (typeof text !== 'string') {
    throw new Error('Input text must be a string');
  }

  const lines = text.split('\n');
  let formattedText = [];
  let currentCaption = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("WEBVTT")) {
      formattedText.push({ type: 'header', content: line });
      continue;
    }

    if (isTimestamp(line)) {
      if (currentCaption) {
        formattedText.push(processCaption(currentCaption));
      }
      currentCaption = { timestamp: line, text: '' };
    } else if (currentCaption) {
      currentCaption.text += (currentCaption.text ? ' ' : '') + line;
    }
  }

  if (currentCaption) {
    formattedText.push(processCaption(currentCaption));
  }

  return formattedText;
}

// Check if a line is a timestamp
function isTimestamp(line) {
  return /^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3} line:-\d+$/.test(line);
}

// Process individual captions and mark short ones for merging
function processCaption(caption) {
  const [start, end] = caption.timestamp.split(' --> ');
  const duration = getTimestampDifference(start, end);

  if (duration <= 28) {
    // This caption is too short, it should be merged with the next one
    return { ...caption, duration, shouldMerge: true };
  }

  return { ...caption, duration, shouldMerge: false };
}

// Calculate the time difference between two timestamps
function getTimestampDifference(timestamp1, timestamp2) {
  const time1 = timestamp1.split(/[:.]/);
  const time2 = timestamp2.split(/[:.]/);

  const ms1 = (parseInt(time1[0]) * 3600000) + (parseInt(time1[1]) * 60000) + (parseInt(time1[2]) * 1000) + parseInt(time1[3]);
  const ms2 = (parseInt(time2[0]) * 3600000) + (parseInt(time2[1]) * 60000) + (parseInt(time2[2]) * 1000) + parseInt(time2[3]);

  return ms2 - ms1;
}

// Merge captions marked for merging with the next caption
function mergeCaptions(captions) {
  let mergedCaptions = [];
  let currentMerge = null;

  for (let caption of captions) {
    if (caption.type === 'header') {
      mergedCaptions.push(caption);
      continue;
    }

    if (!currentMerge) {
      currentMerge = { ...caption };
    } else {
      const [currentStart] = currentMerge.timestamp.split(' --> ');
      const [, nextEnd] = caption.timestamp.split(' --> ');
      currentMerge.timestamp = `${currentStart} --> ${nextEnd}`;
      currentMerge.text += ' ' + caption.text;
      currentMerge.duration += caption.duration;
    }

    if (!caption.shouldMerge) {
      mergedCaptions.push(currentMerge);
      currentMerge = null;
    }
  }

  if (currentMerge) {
    mergedCaptions.push(currentMerge);
  }

  return mergedCaptions;
}

// Function to correct text (from original code)
 function correctText(text) {
  const maxCharsPerLine = 32;
  const lines = text.split('\n');
  let result = [];
  let currentLine = '';
  let inParentheses = false;

  lines.forEach(line => {
    const isTimestamp = line.includes('-->');

    if (isTimestamp) {
      if (currentLine) {
        result.push(currentLine);
        currentLine = '';
      }
      result.push(line);  // Don't add extra '\n'
      inParentheses = false;
    } else {
      if (line.trim().startsWith('(')) {
        inParentheses = true;
      }
      if (line.trim().endsWith(')')) {
        inParentheses = false;
      }

      const words = line.split(' ');
      words.forEach(word => {
        if (currentLine.length + word.length + 1 > maxCharsPerLine) {
          result.push(currentLine);
          currentLine = word;
        } else {
          currentLine += (currentLine ? ' ' : '') + word;
        }
      });

      if (lines.indexOf(line) === lines.length - 1 || isTimestamp) {
        if (currentLine) {
          result.push(currentLine);
          currentLine = '';
        }
      }
    }
  });

  return result.join('\n');
}

// Function to copy the output to clipboard
function copyOutput() {
  const outputText = document.getElementById('outputText').textContent;
  navigator.clipboard.writeText(outputText).then(() => {
    alert('Text copied to clipboard!');
  });
}

// Function to download the output as a .vtt file
function downloadOutput() {
  const outputText = document.getElementById('outputText').textContent;
  const blob = new Blob([outputText], { type: 'text/vtt' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'output.vtt';
  a.click();
  URL.revokeObjectURL(url);
}

// Event listener for the format button
document.getElementById('formatButton').addEventListener('click', formatAndDisplayText);

// Event listeners for copy and download buttons (if they exist in your HTML)
document.getElementById('copyButton')?.addEventListener('click', copyOutput);
document.getElementById('downloadButton')?.addEventListener('click', downloadOutput);
