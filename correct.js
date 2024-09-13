//130920241334
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
  document.getElementById("outputText").textContent = addNewLineBeforeTimestamps(correctedText);
}

// Function to add a newline before every timestamp
function addNewLineBeforeTimestamps(text) {
  const timestampRegex = /(\d{1,2}:\d{2}:\d{2}\.\d{3} --> \d{1,2}:\d{2}:\d{2}\.\d{3})/g;
  return text.replace(timestampRegex, '\n\n$1');
}

// Process the input text and identify captions for merging
function cleanTimestamp(timestamp) {
  const parts = timestamp.split(' ');
  return parts[0]; // Assuming the timestamp is the first part
}

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

function isTimestamp(line) {
  return /^\d{1,2}:\d{2}:\d{2}\.\d{3} --> \d{1,2}:\d{2}:\d{2}\.\d{3}/.test(line);
}

function processCaption(caption) {
  const [start, end] = caption.timestamp.split(' --> ');
  const duration = getTimestampDifference(start, end);

  if (duration > 7000) {
    return splitCaptionByDuration(caption, 7000);
  } else if (duration < 1200) {
    return { ...caption, duration, shouldMerge: true };
  }

  caption.text = splitLongCaptions(caption.text);
  return { ...caption, duration, shouldMerge: false };
}

// Function to split long captions by duration
function splitCaptionByDuration(caption, maxDuration) {
  const [start, end] = caption.timestamp.split(' --> ');
  const totalDuration = getTimestampDifference(start, end);

  const splitPoint = totalDuration / 2;
  const splitTimestamp = getMidTimestamp(start, splitPoint);

  const firstPart = {
    timestamp: `${start} --> ${splitTimestamp}`,
    text: caption.text.substring(0, Math.floor(caption.text.length / 2)).trim(),
    duration: splitPoint
  };

  const secondPart = {
    timestamp: `${splitTimestamp} --> ${end}`,
    text: caption.text.substring(Math.floor(caption.text.length / 2)).trim(),
    duration: totalDuration - splitPoint
  };

  return [firstPart, secondPart];
}

// Function to get the midpoint timestamp
function getMidTimestamp(startTimestamp, splitDuration) {
  const [hours, minutes, seconds, milliseconds] = startTimestamp.split(/[:.]/).map(Number);

  const startMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds;
  const midMs = startMs + splitDuration;

  const newHours = Math.floor(midMs / 3600000);
  const newMinutes = Math.floor((midMs % 3600000) / 60000);
  const newSeconds = Math.floor((midMs % 60000) / 1000);
  const newMilliseconds = midMs % 1000;

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}.${String(newMilliseconds).padStart(3, '0')}`;
}

// Function to split captions longer than 3 lines, ensuring ">>" starts new lines and is preserved
function splitLongCaptions(text) {
  // Split the text by ">>" to handle different speakers
  let lines = text.split(/(?=>>)/).map(line => line.trim()).filter(line => line.length > 0);

  let result = [];
  let currentCaption = "";

  lines.forEach(line => {
    // Ensure the line starts with ">>" when appropriate
    if (!line.startsWith(">>")) {
      line = ">> " + line;
    }

    // Check if current caption exceeds 3 lines; if so, start a new caption
    if (currentCaption.split("\n").length >= 3) {
      result.push(currentCaption.trim());
      currentCaption = line;
    } else {
      currentCaption += (currentCaption.length > 0 ? "\n" : "") + line;
    }
  });

  // Push any remaining lines
  if (currentCaption) {
    result.push(currentCaption.trim());
  }

  return result.join("\n\n");
}


// Function to calculate timestamp difference
function getTimestampDifference(timestamp1, timestamp2) {
  const time1 = timestamp1.split(/[:.]/);
  const time2 = timestamp2.split(/[:.]/);

  const ms1 = (parseInt(time1[0]) * 3600000) + (parseInt(time1[1]) * 60000) + (parseInt(time1[2]) * 1000) + parseInt(time1[3]);
  const ms2 = (parseInt(time2[0]) * 3600000) + (parseInt(time2[1]) * 60000) + (parseInt(time2[2]) * 1000) + parseInt(time2[3]);

  return ms2 - ms1;
}

// Function to merge captions based on duration and other rules
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

// Function to correct text formatting and ensure ">>" starts each line
function correctText(text) {
  const maxCharsPerLine = 32;
  const lines = text.split('\n');
  let result = [];
  let currentLine = '';

  lines.forEach(line => {
    const isTimestamp = line.includes('-->');

    if (isTimestamp) {
      if (currentLine) {
        result.push(currentLine);
        currentLine = '';
      }
      result.push(line); // Don't add extra '\n'
    } else {
      const words = line.split(' ');
      words.forEach(word => {
        // Ensure the ">>" starts at the beginning of the line
        if (word.startsWith('>>') && currentLine.length > 0) {
          result.push(currentLine);
          currentLine = word;
        } else if (currentLine.length + word.length + 1 > maxCharsPerLine) {
          result.push(currentLine);
          currentLine = word;
        } else {
          currentLine += (currentLine ? ' ' : '') + word;
        }
      });

      if (lines.indexOf(line) === lines.length - 1) {
        if (currentLine) {
          result.push(currentLine);
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
