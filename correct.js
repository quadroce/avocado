function formatAndDisplayText() {
  const inputText = document.getElementById("inputText").value;

  formatText(inputText).then(formattedText => {
    const correctedText = correctText(formattedText);
    document.getElementById("outputText").textContent = correctedText;
  });
}

// Formatta il testo
async function formatText(text) {
  if (typeof text !== 'string') {
    throw new Error('Input text must be a string');
  }

  const lines = text.split('\n');
  let formattedText = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for VTT header (optional)
    if (line.startsWith("WEBVTT")) {
      formattedText += line + '\n';
      continue;
    }

    if (isTimestamp(line)) {
      formattedText += line + '\n';
    } else {
      const formattedLine = formatLine(line);
      // Apply timestamp logic for consecutive lines
      if (i > 0 && isTimestamp(lines[i - 1])) {
        formattedText = applyTimestampLogic(formattedText, formattedLine);
      } else {
        formattedText += formattedLine + '\n';
      }
    }
  }

  return formattedText;
}

// Applies timestamp logic for consecutive lines (combines if within threshold)
function applyTimestampLogic(formattedText, formattedLine) {
  const parts = formattedText.split('\n');
  const lastLine = parts[parts.length - 1];
  
  // Extract timestamps
  const match1 = lastLine.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/);
  const match2 = formattedLine.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/);

  if (match1 && match2) {
    const timestamp1 = match1[2];
    const timestamp2 = match2[1];
    const diff = getTimestampDifference(timestamp1, timestamp2);

    // Combine lines if difference is within threshold (28 milliseconds)
    if (diff <= 28) {
      parts.pop(); // Remove last line
      return parts.join('\n') + '\n' + formattedLine;
    }
  }

  return formattedText + formattedLine + '\n'; // Don't combine
}

// Function to calculate timestamp difference in milliseconds
function getTimestampDifference(timestamp1, timestamp2) {
  const time1 = timestamp1.split(/[:.]/); // Split by colon and dot
  const time2 = timestamp2.split(/[:.]/);
  
  // Convert hours, minutes, seconds, milliseconds to total milliseconds
  const ms1 = (parseInt(time1[0]) * 3600000) + (parseInt(time1[1]) * 60000) + (parseInt(time1[2]) * 1000) + parseInt(time1[3]);
  const ms2 = (parseInt(time2[0]) * 3600000) + (parseInt(time2[1]) * 60000) + (parseInt(time2[2]) * 1000) + parseInt(time2[3]);

  return ms2 - ms1; // Return difference in milliseconds
}

// Formatta una singola riga
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

// Controlla se la linea è un timestamp
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

