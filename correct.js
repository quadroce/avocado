function formatAndDisplayText() {
  const inputText = document.getElementById("inputText").value;

  formatText(inputText).then(formattedText => {
    const correctedText = correctText(formattedText);
    document.getElementById("outputText").textContent = correctedText;
  });
}
const isTimestampRegex = new RegExp(/^[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3} --> [0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3} line:-\d+$/);  // Pre-compiled regex

const timestampRegex = new RegExp(/^[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3} --> [0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3} line:-\d+$/);
const isTimestampCache = new Map();

async function formatText(text) {
  if (typeof text !== 'string') {
    throw new Error('Input text must be a string');
  }

  const lines = text.split('\n');
  const formattedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("WEBVTT")) {
      formattedLines.push(line + '\n');
      continue;
    }

    const isTimestamp = isTimestampCache.get(line) || timestampRegex.test(line);
    isTimestampCache.set(line, isTimestamp);

    if (isTimestamp) {
      formattedLines.push(line + '\n');
    } else {
      const formattedLine = formatLine(line);
      if (i > 0 && isTimestamp(lines[i - 1])) {
        formattedLines.push(applyTimestampLogic(formattedLines.join('\n'), formattedLine));
      } else {
        formattedLines.push(formattedLine + '\n');
      }
    }
  }

  return formattedLines.join('\n');
}

function applyTimestampLogic(formattedText, formattedLine) {
  console.log("applyTimestampLogic called");

  const parts = formattedText.split('\n');
  const lastLine = parts[parts.length - 1];

  // Extract timestamps from both lines
  const match1 = lastLine.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3}) line:-\d+$/);
  const match2 = formattedLine.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3}) line:-\d+$/);

  // Check if both lines have valid timestamps
  if (!match1 || !match2) {
    console.log("One or both lines don't have valid timestamps");
    return formattedText + formattedLine + '\n'; // Don't merge if timestamps are missing
  }

  const timestamp1End = match1[2]; // Extract the end timestamp from the last line
  const timestamp2Start = match2[1]; // Extract the start timestamp from the current line

  console.log("timestamp1End:", timestamp1End);
  console.log("timestamp2Start:", timestamp2Start);

  // Calculate the difference in milliseconds
  const diff = getTimestampDifference(timestamp1End, timestamp2Start);

  console.log("diff:", diff);

  // Check if the difference is within the threshold (28 milliseconds)
  if (diff <= 28) {
    console.log("Merging lines, diff is", diff);
    const mergedTimestamp = `${match1[1]} --> ${match2[2]} line:-1`;
    const mergedText = parts[parts.length - 2] + ' ' + formattedLine.split('\n')[1];
    parts.splice(-2, 2, mergedTimestamp, mergedText);
    return parts.join('\n') + '\n';
  } else {
    console.log("Not merging, diff is", diff);
  }

  return formattedText + formattedLine + '\n'; // Don't combine
}




function getTimestampDifference(timestamp1, timestamp2) {
  console.log("getTimestampDifference called with:", timestamp1, timestamp2); // Log when called

  const time1 = timestamp1.split(/[:.]/); // Split by colon and dot
  const time2 = timestamp2.split(/[:.]/);

  // Convert hours, minutes, seconds, milliseconds to total milliseconds
  const ms1 = (parseInt(time1[0]) * 3600000) + (parseInt(time1[1]) * 60000) + (parseInt(time1[2]) * 1000) + parseInt(time1[3]);
  const ms2 = (parseInt(time2[0]) * 3600000) + (parseInt(time2[1]) * 60000) + (parseInt(time2[2]) * 1000) + parseInt(time2[3]);

  const diff = ms2 - ms1;
  console.log("Difference in milliseconds:", diff);  // Log the calculated difference

  return diff; // Return the difference in milliseconds
}



// Formatta il testo completo
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

    // Se la linea è un timestamp, aggiungila direttamente
    if (isTimestamp(line)) {
      formattedText += line + '\n';
    } else {
      // Formatta la linea e applica la logica dei timestamp
      const formattedLine = formatLine(line);
      if (i > 0 && isTimestamp(lines[i - 1])) {
        formattedText = applyTimestampLogic(formattedText, formattedLine);
      } else {
        formattedText += formattedLine + '\n';
      }
    }
  }

  return formattedText;
}

// Controlla se la linea è un timestamp
function isTimestamp(line) {
  return /^[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3} --> [0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}$/.test(line);
}

// Formatta una singola riga (ad esempio, capitalizza correttamente le frasi)
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
  return /^[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3} --> [0-9]{2}:[0-9]{2}:[0-9]{2}\.\d{3} line:-\d+$/.test(line);
}

// Calcola la differenza di timestamp in millisecondi
function getTimestampDifference(timestamp1, timestamp2) {
  const time1 = timestamp1.split(/[:.]/); // Split by colon and dot
  const time2 = timestamp2.split(/[:.]/);

  // Convert hours, minutes, seconds, milliseconds to total milliseconds
  const ms1 = (parseInt(time1[0]) * 3600000) + (parseInt(time1[1]) * 60000) + (parseInt(time1[2]) * 1000) + parseInt(time1[3]);
  const ms2 = (parseInt(time2[0]) * 3600000) + (parseInt(time2[1]) * 60000) + (parseInt(time2[2]) * 1000) + parseInt(time2[3]);

  return ms2 - ms1; // Ritorna la differenza in millisecondi
}

// Applica la logica dei timestamp
function applyTimestampLogic(formattedText, formattedLine) {
  console.log("applyTimestampLogic called");
  const parts = formattedText.split('\n');
  const lastLine = parts[parts.length - 1];
  
  // Estrai i timestamp
  const match1 = lastLine.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3}) line:-\d+$/);
  const match2 = formattedLine.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3}) line:-\d+$/);

  if (match1 && match2) {
    const timestamp1 = match1[2];
    const timestamp2 = match2[1];
    const diff = getTimestampDifference(timestamp1, timestamp2);

    // Combina le linee se la differenza è entro la soglia (28 millisecondi)
    if (diff <= 28) {
      parts.pop(); // Rimuove l'ultima riga
      return parts.join('\n') + '\n' + formattedLine;
    }
  }

  return formattedText + formattedLine + '\n'; // Non combinare
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

    if (line.startsWith("WEBVTT")) {
      formattedText += line + '\n';
      continue;
    }

    if (isTimestamp(line)) {
      formattedText += line + '\n';
    } else {
      const formattedLine = formatLine(line);

      // Applica logica timestamp
      if (i > 0 && isTimestamp(lines[i - 1])) {
        formattedText = applyTimestampLogic(formattedText, formattedLine);
      } else {
        formattedText += formattedLine + '\n';
      }
    }
  }

  return formattedText;
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

// Funzione per correggere il testo
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
      result.push(line);  // Non aggiungere '\n' extra
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
