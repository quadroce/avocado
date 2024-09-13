//130920241107
// Function to format and display text with line breaks at ">>" or "--"
function formatAndDisplayText() {
  const inputText = document.getElementById("inputText").value;
  const processedCaptions = formatText(inputText);
  const mergedCaptions = mergeCaptions(processedCaptions);

  const formattedText = mergedCaptions.map(caption => {
    if (caption.type === 'header') {
      return caption.content;
    }

    // Split text into lines based on timestamps and special markers
    const lines = caption.text.split(/(\d{1,2}:\d{2}:\d{2}\.\d{3} --> \d{1,2}:\d{2}:\d{2}\.\d{3})|>>|--/g);

    // Ensure maximum 3 lines per caption
    const formattedLines = lines.slice(0, 3).map(line => line.trim());

    return `${caption.timestamp}\n${formattedLines.join('\n')}`;
  }).join('\n\n');

  const correctedText = correctText(formattedText);
  document.getElementById("outputText").textContent = correctedText;
}

// Function to process the input text and identify captions for merging
function formatText(text) {
  if (typeof text !== 'string') {
    throw new Error('Input text must be a string');
  }

  const lines = text.split('\n');
  let formattedText = [];
  let currentCaption = null;
  let totalDuration = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("WEBVTT")) {
      formattedText.push({ type: 'header', content: line });
      continue;
    }

    if (isTimestamp(line)) {
      if (currentCaption) {
        formattedText.push(processCaption(currentCaption));
        totalDuration = 0; // Reset total duration for the next caption
      }
      currentCaption = { timestamp: line, text: '', originalTimestamp: line };
    } else if (currentCaption) {
      currentCaption.text += (currentCaption.text ? ' ' : '') + line;
    }
  }

  if (currentCaption) {
    formattedText.push(processCaption(currentCaption));
  }

  // Clean timestamps before processing
  formattedText = formattedText.map(caption => {
    if (caption.type === 'caption') {
      caption.timestamp = cleanTimestamp(caption.timestamp);
    }
    return caption;
  });

  return formattedText;
}

// Helper functions (unchanged from original code)
function isTimestamp(line) {
  return /^\d{1,2}:\d{2}:\d{2}\.\d{3} --> \d{1,2}:\d{2}:\d{2}\.\d{3}/.test(line);
}

function processCaption(caption) {
  const [start, end] = caption.timestamp.split(' --> ');
  const duration = getTimestampDifference(start, end);

  if (duration <= 1200) {
    // This caption is too short or within limit, it should be merged with the next one
    return { ...caption, duration, shouldMerge: true };
  }

  return { ...caption, duration, shouldMerge: false };
}

function mergeCaptions(captions) {
  let mergedCaptions = [];
  let currentMerge = null;
  let totalDuration = 0;

  for (let caption of captions) {
    if (caption.type === 'header') {
      mergedCaptions.push(caption);
      continue;
    }

    if (!currentMerge) {
      currentMerge = { ...caption };
      totalDuration = 0;
    } else {
      const [currentStart] = currentMerge.timestamp.split(' --> ');
      const [, nextEnd] = caption.timestamp.split(' --> ');
      currentMerge.timestamp = `${currentStart} --> ${nextEnd}`;
      currentMerge.text += ' ' + caption.text;
      totalDuration += caption.duration;
    }

    if (!caption.shouldMerge || totalDuration > 1200) {
      mergedCaptions.push(currentMerge);
      currentMerge = null;
      totalDuration = 0;
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
      result.push(line); // Don't add extra '\n'
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
