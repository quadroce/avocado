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
      console("merged");
      return parts.join('\n') + '\n' + formattedLine;
    }
  }

  return formattedText + formattedLine + '\n'; // Don't combine
}

// Calcola la differenza tra due timestamp in millisecondi
function getTimestampDifference(timestamp1, timestamp2) {
  const time1 = timestamp1.split(/[:.]/); // Split by colon and dot
  const time2 = timestamp2.split(/[:.]/);

  // Convert hours, minutes, seconds, milliseconds to total milliseconds
  const ms1 = (parseInt(time1[0]) * 3600000) + (parseInt(time1[1]) * 60000) + (parseInt(time1[2]) * 1000) + parseInt(time1[3]);
  const ms2 = (parseInt(time2[0]) * 3600000) + (parseInt(time2[1]) * 60000) + (parseInt(time2[2]) * 1000) + parseInt(time2[3]);

  return ms2 - ms1; // Return the difference in milliseconds
}

// Applica la logica dei timestamp per unire righe consecutive se necessario
function applyTimestampLogic(formattedText, formattedLine) {
  const parts = formattedText.split('\n');
  const lastLine = parts[parts.length - 1];
  
  // Estrai i timestamp
  const match1 = lastLine.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3}) line:-\d+$/);
  const match2 = formattedLine.match(/^(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3}) line:-\d+$/);

  if (match1 && match2) {
    const endOfLast = match1[2]; // Timestamp di fine dell'ultima riga
    const startOfCurrent = match2[1]; // Timestamp di inizio della riga corrente
    const durationOfLast = getTimestampDifference(match1[1], match1[2]); // Durata dell'ultima riga

    // Se la durata della riga precedente è troppo breve (meno di 500 ms), unisci la riga successiva
    if (durationOfLast < 28) {
      parts.pop(); // Rimuovi l'ultima riga
      return parts.join('\n') + '\n' + formattedLine; // Combina le righe
    }
  }

  return formattedText + formattedLine + '\n'; // Non combinare
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
