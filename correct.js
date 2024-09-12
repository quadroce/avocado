function formatAndDisplayText() {
  const inputText = document.getElementById("inputText").value;

  formatText(inputText).then(formattedText => {
    const correctedText = correctText(formattedText);
    document.getElementById("outputText").textContent = correctedText;
  });
}

async function formatText(text) {
  if (typeof text !== 'string') {
    throw new Error('Input text must be a string');
  }

  const lines = text.split('\n');
  let formattedText = "";
  let previousTimestamp = null; // Store the timestamp of the previous line

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for VTT header (optional)
    if (line.startsWith("WEBVTT")) {
      formattedText += line + '\n';
      continue;
    }

    if (isTimestamp(line)) {
      formattedText += line + '\n';
      const currentTimestamp = extractTimestamp(line);
      previousTimestamp = currentTimestamp;
    } else {
      const formattedLine = formatLine(line);
      
      // Apply timestamp logic for consecutive lines
      if (previousTimestamp && getTimestampDifference(previousTimestamp, extractTimestamp(line)) <= 28) {
        // Combine lines if difference is within threshold (28 milliseconds)
        formattedText = formattedText.substring(0, formattedText.lastIndexOf('\n')); // Remove the previous line
      } else {
        formattedText += formattedLine + '\n';
      }
      previousTimestamp = null; // Reset previous timestamp for non-consecutive lines
    }
  }

  return formattedText;
}

function extractTimestamp(timestampLine) {
  const match = timestampLine.match(/^(\d{2}:\d{2}:\d{2}.\d{3}) --> (\d{2}:\d{2}:\d{2}.\d{3}) line:-1\s+/);
  if (match) {
    return match[2]; // Return the end timestamp
  }
  return null;
}

function getTimestampDifference(timestamp1, timestamp2) {
  const parts1 = timestamp1.split(':');
  const parts2 = timestamp2.split(':');
  const ms1 = parseInt(parts1[0]) * 3600000 + parseInt(parts1[1]) * 60000 + parseInt(parts1[2]) * 1000 + parseInt(parts1[3]);
  const ms2 = parseInt(parts2[0]) * 3600000 + parseInt(parts2[1]) * 60000 + parseInt(parts2[2]) * 1000 + parseInt(parts2[3]);
  return ms2 - ms1;
}

function formatLine(line) {
  const sentences = line.split(/([.!?]\s*)/);
  let formattedLine = "";

  for (let i = 0; i < sentences.length; i++) {
    if (sentences[i].trim().length > 0) {
      formattedLine += sentences[i].charAt(0).toUpperCase() + sentences[i].slice(1).toLowerCase();
    } else {
      formattedLine += sentences[i];
    }
  }

  return formattedLine;
}

function isTimestamp(line) {
  return /^[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3} --> [0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}$/.test(line);
}

// Corrects the text by adding line breaks before timestamps and fixing line length
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
      result.push('\n' + line);
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

// Gestisce il clic del pulsante "Formatta"
document.getElementById('formatButton').addEventListener('click', formatAndDisplayText);

// Copies the output to the clipboard
function copyOutput() {
  const outputText = document.getElementById('outputText').textContent;
  navigator.clipboard.writeText(outputText).then(() => {
    alert('Text copied to clipboard!');
  });
}

// Downloads the output as a .vtt file
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
