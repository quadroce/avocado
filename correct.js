//190920241111


et uploadedFileName = '';
let logMessages = [];

function formatAndDisplayText() {
  logMessages = []; // Reset log messages
  const inputText = document.getElementById("inputText").value;
  addLog("Starting caption processing...");
  
  const processedCaptions = formatText(inputText);
  addLog(`Processed ${processedCaptions.length} captions`);
  
  const mergedCaptions = mergeCaptions(processedCaptions);
  addLog(`Merged captions. New total: ${mergedCaptions.length}`);

  const formattedText = mergedCaptions.map(caption => {
    if (caption.type === 'header') {
      return caption.content;
    }
    return `${caption.timestamp}\n${caption.text}`;
  }).join('\n\n');

  const correctedText = correctText(formattedText);
  const finalText = addNewLineBeforeTimestamps(correctedText);
  
  document.getElementById("outputText").textContent = finalText;
  displayLogs();
}

function addLog(message) {
  logMessages.push(message);
}

function displayLogs() {
  const logHtml = logMessages.map(msg => `<p>${msg}</p>`).join('');
  document.getElementById("logOutput").innerHTML = logHtml;
}
function addNewLineBeforeTimestamps(text) {
  const timestampRegex = /(\d{1,2}:\d{2}:\d{2}\.\d{3} --> \d{1,2}:\d{2}:\d{2}\.\d{3}.*)/g;
  return text.replace(timestampRegex, '\n$1');
}

function cleanTimestamp(timestamp) {
  const parts = timestamp.split(' ');
  return parts[0];
}

function formatText(text) {
  if (typeof text !== 'string') {
    throw new Error('Input text must be a string');
  }

  const lines = text.split('\n');
  let formattedText = [];
  let currentCaption = null;
  let captionCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("WEBVTT")) {
      formattedText.push({ type: 'header', content: line });
      continue;
    }

    if (isTimestamp(line)) {
      if (currentCaption) {
        formattedText.push(...processCaption(currentCaption));
        captionCount++;
      }
      currentCaption = { timestamp: line, text: '', originalTimestamp: line };
    } else if (currentCaption) {
      currentCaption.text += (currentCaption.text ? ' ' : '') + line;
    }
  }

  if (currentCaption) {
    formattedText.push(...processCaption(currentCaption));
    captionCount++;
  }

  addLog(`Processed ${captionCount} captions`);

  formattedText = formattedText.flatMap(caption => {
    if (caption.type === 'caption') {
      return splitLongCaptions(caption).map(splitCaption => ({
        ...splitCaption,
        timestamp: cleanTimestamp(splitCaption.timestamp)
      }));
    }
    return caption;
  });

  addLog(`After splitting long captions: ${formattedText.length} total captions`);

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
  } else {
    return [{ ...caption, duration, shouldMerge: duration < 1200 }];
  }
}

function splitCaptionByDuration(caption, maxDuration) {
  const [start, end] = caption.timestamp.split(' --> ');
  const totalDuration = getTimestampDifference(start, end);

  const splitPoint = totalDuration / 2;
  const splitTimestamp = getMidTimestamp(start, splitPoint);
  const gapEndTimestamp = addFramesToTimestamp(splitTimestamp, 4);

  // Extract alignment and positioning info
  const alignInfo = caption.timestamp.split(' --> ')[1].split(' ').slice(1).join(' ');

  // Find a good splitting point
  let splitIndex = findSplitIndex(caption.text);

  const firstPart = {
    timestamp: `${start} --> ${splitTimestamp} ${alignInfo}`,
    text: caption.text.substring(0, splitIndex).trim(),
    duration: splitPoint,
    shouldMerge: false
  };

  const secondPart = {
    timestamp: `${gapEndTimestamp} --> ${end} ${alignInfo}`,
    text: caption.text.substring(splitIndex).trim(),
    duration: totalDuration - splitPoint - 166, // Assuming 24 fps, 4 frames = 166ms
    shouldMerge: false
  };

  return [firstPart, secondPart];
}

function findSplitIndex(text) {
  // First, try to split at the end of a sentence
  const sentenceEnd = text.indexOf('. ', text.length / 2 - 20);
  if (sentenceEnd !== -1 && sentenceEnd <= text.length / 2 + 20) {
    return sentenceEnd + 1; // Include the period in the first part
  }

  // If no sentence end is found, try to split at a speaker change
  const speakerChange = text.indexOf('>> ', text.length / 2 - 20);
  if (speakerChange !== -1 && speakerChange <= text.length / 2 + 20) {
    return speakerChange;
  }

  // If no good splitting point is found, split at the nearest space to the midpoint
  const midPoint = Math.floor(text.length / 2);
  const leftSpace = text.lastIndexOf(' ', midPoint);
  const rightSpace = text.indexOf(' ', midPoint);

  if (leftSpace === -1 && rightSpace === -1) {
    return midPoint; // No spaces found, split in the middle of a word as a last resort
  } else if (leftSpace === -1) {
    return rightSpace;
  } else if (rightSpace === -1) {
    return leftSpace;
  } else {
    // Return the nearest space to the midpoint
    return (midPoint - leftSpace <= rightSpace - midPoint) ? leftSpace : rightSpace;
  }
}

function addFramesToTimestamp(timestamp, frames) {
  const [hours, minutes, seconds, milliseconds] = timestamp.split(/[:.]/).map(Number);
  const totalMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds + (frames * 1000 / 24);

  const newHours = Math.floor(totalMs / 3600000);
  const newMinutes = Math.floor((totalMs % 3600000) / 60000);
  const newSeconds = Math.floor((totalMs % 60000) / 1000);
  const newMilliseconds = Math.floor(totalMs % 1000);

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}.${String(newMilliseconds).padStart(3, '0')}`;
}

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

function splitLongCaptions(caption) {
  const words = caption.text.split(/\s+/);
  let result = [];
  let currentCaption = [];
  let currentLine = "";
  let startTime = caption.timestamp.split(' --> ')[0];
  let endTime = caption.timestamp.split(' --> ')[1];

  const pushCurrentCaption = (end) => {
    if (currentCaption.length > 0) {
      result.push({
        timestamp: `${startTime} --> ${end}`,
        text: currentCaption.join('\n'),
        duration: getTimestampDifference(startTime, end),
        shouldMerge: false
      });
      startTime = addMillisecondsToTimestamp(end, 10); // Add 10ms gap
      currentCaption = [];
    }
  };

  words.forEach((word, index) => {
    if (word.startsWith(">>") || word === "-" || word === "--") {
      if (currentLine) {
        currentCaption.push(currentLine);
        currentLine = "";
      }
      if (currentCaption.length === 2) {
        pushCurrentCaption(getAdjustedTimestamp(startTime, 5000));
      }
      currentLine = word;
    } else if ((currentLine + " " + word).length > 32) {
      if (currentCaption.length < 2) {
        currentCaption.push(currentLine);
        currentLine = word;
      } else {
        pushCurrentCaption(getAdjustedTimestamp(startTime, 5000));
        currentLine = word;
      }
    } else {
      currentLine += (currentLine ? " " : "") + word;
    }

    if (index === words.length - 1) {
      if (currentLine) {
        currentCaption.push(currentLine);
      }
      pushCurrentCaption(endTime);
    }
  });

  return result;
}

function correctText(text) {
  const maxCharsPerLine = 32;
  const lines = text.split('\n');
  let result = [];
  let currentCaption = [];
  let fixedLines = 0;

  function pushCurrentCaption() {
    if (currentCaption.length > 0) {
      result.push(...currentCaption);
      currentCaption = [];
    }
  }

  function addLine(line) {
    if (currentCaption.length >= 2) {
      pushCurrentCaption();
    }
    currentCaption.push(line);
    fixedLines++;
  }

  lines.forEach(line => {
    if (line.includes('-->')) {
      pushCurrentCaption();
      result.push(line);
    } else {
      line = line.replace(/&gt;/g, '>'); // Replace HTML entities
      const words = line.split(' ');
      let currentLine = '';

      words.forEach(word => {
        if (word.startsWith('>>') && currentLine.length > 0) {
          addLine(currentLine);
          currentLine = word;
        } else if (currentLine.length + word.length + 1 > maxCharsPerLine) {
          if (currentLine) addLine(currentLine);
          currentLine = word;
        } else {
          currentLine += (currentLine ? ' ' : '') + word;
        }
      });

      if (currentLine) {
        addLine(currentLine);
      }
    }
  });

  pushCurrentCaption();

  addLog(`Fixed ${fixedLines} lines to match character limit`);

  return result.join('\n').replace(/\n{3,}/g, '\n\n');
}

function mergeCaptions(captions) {
  let mergedCaptions = [];
  let currentMerge = null;

  function pushCurrentMerge() {
    if (currentMerge) {
      mergedCaptions.push(currentMerge);
      currentMerge = null;
    }
  }

  for (let caption of captions) {
    if (caption.type === 'header') {
      pushCurrentMerge();
      mergedCaptions.push(caption);
      continue;
    }

    const captionLines = caption.text.split('\n');

    if (!currentMerge) {
      currentMerge = { ...caption };
    } else {
      const startsWithSpecialChar = captionLines[0].startsWith(">> ") || 
                                    captionLines[0].startsWith("- ") || 
                                    captionLines[0].startsWith("-- ");

      if (currentMerge.text.split('\n').length + captionLines.length <= 2 && 
          getTimestampDifference(currentMerge.timestamp.split(' --> ')[0], caption.timestamp.split(' --> ')[1]) <= 5000 &&
          !startsWithSpecialChar) {
        const [currentStart] = currentMerge.timestamp.split(' --> ');
        const [, nextEnd] = caption.timestamp.split(' --> ');
        currentMerge.timestamp = `${currentStart} --> ${nextEnd}`;
        currentMerge.text += '\n' + caption.text;
        currentMerge.duration = getTimestampDifference(currentStart, nextEnd);
      } else {
        pushCurrentMerge();
        currentMerge = { ...caption };
      }
    }
  }

  pushCurrentMerge();
  return mergedCaptions;
}

function getAdjustedTimestamp(startTimestamp, millisToAdd) {
  const [hours, minutes, seconds, milliseconds] = startTimestamp.split(/[:.]/).map(Number);
  const totalMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds + millisToAdd;

  const newHours = Math.floor(totalMs / 3600000);
  const newMinutes = Math.floor((totalMs % 3600000) / 60000);
  const newSeconds = Math.floor((totalMs % 60000) / 1000);
  const newMilliseconds = Math.floor(totalMs % 1000);

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}.${String(newMilliseconds).padStart(3, '0')}`;
}

function getTimestampDifference(timestamp1, timestamp2) {
  const time1 = timestamp1.split(/[:.]/);
  const time2 = timestamp2.split(/[:.]/);

  const ms1 = (parseInt(time1[0]) * 3600000) + (parseInt(time1[1]) * 60000) + (parseInt(time1[2]) * 1000) + parseInt(time1[3]);
  const ms2 = (parseInt(time2[0]) * 3600000) + (parseInt(time2[1]) * 60000) + (parseInt(time2[2]) * 1000) + parseInt(time2[3]);

  return ms2 - ms1;
}

function mergeCaptions(captions) {
  let mergedCaptions = [];
  let currentMerge = null;
  let lineCount = 0;

  function pushCurrentMerge() {
    if (currentMerge) {
      mergedCaptions.push(currentMerge);
      currentMerge = null;
      lineCount = 0;
    }
  }

  for (let caption of captions) {
    if (caption.type === 'header') {
      pushCurrentMerge();
      mergedCaptions.push(caption);
      continue;
    }

    const captionLines = caption.text.split('\n');

    if (!currentMerge) {
      currentMerge = { ...caption };
      lineCount = captionLines.length;
    } else {
      let availableLines = 2 - lineCount;
      let linesToAdd = Math.min(availableLines, captionLines.length);

      if (linesToAdd > 0 && getTimestampDifference(currentMerge.timestamp.split(' --> ')[0], caption.timestamp.split(' --> ')[1]) <= 5000) {
        const [currentStart] = currentMerge.timestamp.split(' --> ');
        const [, nextEnd] = caption.timestamp.split(' --> ');
        currentMerge.timestamp = `${currentStart} --> ${nextEnd}`;
        currentMerge.text += '\n' + captionLines.slice(0, linesToAdd).join('\n');
        currentMerge.duration = getTimestampDifference(currentStart, nextEnd);
        lineCount += linesToAdd;
      } else {
        pushCurrentMerge();
        currentMerge = {
          ...caption,
          text: captionLines.slice(0, 2).join('\n'),
          timestamp: caption.timestamp
        };
        lineCount = Math.min(captionLines.length, 2);
      }
    }

    if (lineCount === 2 || currentMerge.duration > 5000) {
      pushCurrentMerge();
    }
  }

  pushCurrentMerge();
  return mergedCaptions;
}

function addMillisecondsToTimestamp(timestamp, milliseconds) {
  const [hours, minutes, seconds, currentMilliseconds] = timestamp.split(/[:.]/).map(Number);
  let totalMilliseconds = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + currentMilliseconds + milliseconds;

  const newHours = Math.floor(totalMilliseconds / 3600000);
  totalMilliseconds %= 3600000;
  const newMinutes = Math.floor(totalMilliseconds / 60000);
  totalMilliseconds %= 60000;
  const newSeconds = Math.floor(totalMilliseconds / 1000);
  const newMilliseconds = totalMilliseconds % 1000;

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}.${String(newMilliseconds).padStart(3, '0')}`;
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    // Store the uploaded file name without the extension
    uploadedFileName = file.name.replace(/\.[^/.]+$/, "");
    
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('inputText').value = e.target.result;
    };
    reader.readAsText(file);
  }
}

function copyOutput() {
  const outputText = document.getElementById('outputText').textContent;
  navigator.clipboard.writeText(outputText).then(() => {
    alert('Text copied to clipboard!');
  });
}

function downloadOutput() {
  const outputText = document.getElementById('outputText').textContent;
  const blob = new Blob([outputText], { type: 'text/vtt' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  // Use the uploaded filename if available, otherwise use a default name
  const downloadFileName = uploadedFileName ? `${uploadedFileName}_avocado.vtt` : 'captions_avocado.vtt';
  a.download = downloadFileName;
  
  a.click();
  URL.revokeObjectURL(url);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('fileInput').addEventListener('change', handleFileUpload);
  document.getElementById('formatButton').addEventListener('click', formatAndDisplayText);
  document.getElementById('copyButton')?.addEventListener('click', copyOutput);
  document.getElementById('downloadButton')?.addEventListener('click', downloadOutput);
});
