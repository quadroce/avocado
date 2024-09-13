130920241416
function formatAndDisplayText() {
  const inputText = document.getElementById("inputText").value;
  const processedCaptions = formatText(inputText);
  const mergedCaptions = mergeCaptions(processedCaptions);
  const formattedText = mergedCaptions.map(caption => caption.type === 'header' ? caption.content : `${caption.timestamp}\n${caption.text}`).join('\n\n');
  const correctedText = correctText(formattedText);
  document.getElementById("outputText").textContent = addNewLineBeforeTimestamps(correctedText);
}

function addNewLineBeforeTimestamps(text) {
  return text.replace(/(\d{1,2}:\d{2}:\d{2}\.\d{3} --> \d{1,2}:\d{2}:\d{2}\.\d{3})/g, '\n\n$1');
}

function cleanTimestamp(timestamp) {
  return timestamp.split(' ')[0];
}

function formatText(text) {
  if (typeof text !== 'string') {
    throw new Error('Input text must be a string');
  }

  const lines = text.split('\n');
  const formattedText = [];
  let currentCaption = null;

  for (let line of lines) {
    line = line.trim();

    if (line.startsWith("WEBVTT")) {
      formattedText.push({ type: 'header', content: line });
    } else if (isTimestamp(line)) {
      if (currentCaption) {
        formattedText.push(...processCaption(currentCaption));
      }
      currentCaption = { timestamp: line, text: '', originalTimestamp: line };
    } else if (currentCaption) {
      currentCaption.text += (currentCaption.text ? ' ' : '') + line;
    }
  }

  if (currentCaption) {
    formattedText.push(...processCaption(currentCaption));
  }

  return formattedText.flatMap(caption => {
    return caption.type === 'caption' ?
      splitLongCaptions(caption).map(splitCaption => ({
        ...splitCaption,
        timestamp: cleanTimestamp(splitCaption.timestamp)
      })) : caption;
  });
}

function isTimestamp(line) {
  return /^\d{1,2}:\d{2}:\d{2}\.\d{3} --> \d{1,2}:\d{2}:\d{2}\.\d{3}/.test(line);
}

function processCaption(caption) {
  const [start, end] = caption.timestamp.split(' --> ');
  const duration = getTimestampDifference(start, end);
  return duration > 7000 ? splitCaptionByDuration(caption, 7000) : [{ ...caption, duration, shouldMerge: duration < 1200 }];
}

function splitCaptionByDuration(caption, maxDuration) {
  const [start, end] = caption.timestamp.split(' --> ');
  const totalDuration = getTimestampDifference(start, end);
  const splitPoint = totalDuration / 2;
  const splitTimestamp = getMidTimestamp(start, splitPoint);
  const gapEndTimestamp = addFramesToTimestamp(splitTimestamp, 4);

  const splitIndex = findSplitIndex(caption.text);

  const firstPart = {
    timestamp: `${start} --> ${splitTimestamp}`,
    text: caption.text.substring(0, splitIndex).trim(),
    duration: splitPoint,
    shouldMerge: false
  };

  const secondPart = {
    timestamp: `${gapEndTimestamp} --> ${end}`,
    text: caption.text.substring(splitIndex).trim(),
    duration: totalDuration - splitPoint - 166,
    shouldMerge: false
  };

  return [firstPart, secondPart];
}

function findSplitIndex(text) {
  const sentenceEnd = text.indexOf('. ', text.length / 2 - 20);
  if (sentenceEnd !== -1 && sentenceEnd <= text.length / 2 + 20) {
    return sentenceEnd + 1;
  }

  const speakerChange = text.indexOf('>> ', text.length / 2 - 20);
  if (speakerChange !== -1 && speakerChange <= text.length / 2 + 20) {
    return speakerChange;
  }

  const midPoint = Math.floor(text.length / 2);
  const leftSpace = text.lastIndexOf(' ', midPoint);
  const rightSpace = text.indexOf(' ', midPoint);

  if (leftSpace === -1 && rightSpace === -1) {
    return midPoint;
  } else if (leftSpace === -1) {
    return rightSpace;
  } else if (rightSpace === -1) {
    return leftSpace;
  } else {
    return (midPoint - leftSpace <= rightSpace - midPoint) ? leftSpace : rightSpace;
  }
}

function addFramesToTimestamp(timestamp, frames) {
  const [hours, minutes, seconds, milliseconds] = timestamp.split(/[:.]/).map(Number);
  const totalMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds + (frames * 1000 / 24);
  return formatTimestamp(totalMs);
}

function getMidTimestamp(startTimestamp, splitDuration) {
  const [hours, minutes, seconds, milliseconds] = startTimestamp.split(/[:.]/).map(Number);
  const startMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds;
  const midMs = startMs + splitDuration;
  return formatTimestamp(midMs);
}

function splitLongCaptions(caption) {
  const lines = caption.text.split(/(?=(?:^|\n)(?:>>|--))|(?<=\S)(?=\s+(?:>>|--))/g)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const result = [];
  let currentCaption = "";
  let lineCount = 0;
  let startTime = caption.timestamp.split(' --> ')[0];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const formattedLine = line.startsWith(">>") || line.startsWith("--") ? line : "-- " + line;

    if (lineCount >= 3 || (currentCaption && (line.startsWith(">>") || line.startsWith("--")))) {
      if (currentCaption) {
        const endTime = i === lines.length - 1 ? caption.timestamp.split(' --> ')[1] : getAdjustedTimestamp(startTime, 2000);
        result.push({
          timestamp: `${startTime} --> ${endTime}`,
          text: currentCaption.trim(),
          duration: 2000,
          shouldMerge: false
        });
        startTime = endTime;
      }
      currentCaption = formattedLine;
      lineCount = 1;
    } else {
      currentCaption += (currentCaption ? "\n" : "") + formattedLine;
      lineCount++;
    }
  }

  if (currentCaption) {
    result.push({
      timestamp: `${startTime} --> ${caption.timestamp.split(' --> ')[1]}`,
      text: currentCaption.trim(),
      duration: getTimestampDifference(startTime, caption.timestamp.split(' --> ')[1]),
      shouldMerge: false
    });
  }

  return result;
}

function getAdjustedTimestamp(startTimestamp, millisToAdd) {
  const [hours, minutes, seconds, milliseconds] = startTimestamp.split(/[:.]/).map(Number);
  const totalMs = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds + millisToAdd;
  return formatTimestamp(totalMs);
}

function getTimestampDifference(timestamp1, timestamp2) {
  const time1 = timestamp1.split(/[:.]/);
  const time2 = timestamp2.split(/[:.]/);

  const ms1 = (parseInt(time1[0]) * 3600000) + (parseInt(time1[1]) * 60000) + (parseInt(time1[2]) * 1000) + parseInt(time1[3]);
  const ms2 = (parseInt(time2[0]) * 3600000) + (parseInt(time2[1]) * 60000) + (parseInt(time2[2]) * 1000) + parseInt(time2[3]);

  return ms2 - ms1;
}

function formatTimestamp(totalMs) {
  const newHours = Math.floor(totalMs / 3600000);
  const newMinutes = Math.floor((totalMs % 3600000) / 60000);
  const newSeconds = Math.floor((totalMs % 60000) / 1000);
  const newMilliseconds = Math.floor(totalMs % 1000);

  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}.${String(newMilliseconds).padStart(3, '0')}`;
}

function mergeCaptions(captions) {
  const mergedCaptions = [];
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
      currentMerge.text += '\n' + caption.text;
      currentMerge.duration += caption.duration;
    }

    if (!caption.shouldMerge || currentMerge.duration > 1200) {
      mergedCaptions.push(currentMerge);
      currentMerge = null;
    }
  }

  if (currentMerge) {
    mergedCaptions.push(currentMerge);
  }

  return mergedCaptions;
}

function correctText(text) {
  const maxCharsPerLine = 32;
  const lines = text.split('\n');
  const result = [];
  let currentLine = '';

  for (let line of lines) {
    if (line.includes('-->')) {
      if (currentLine) {
        result.push(currentLine);
        currentLine = '';
      }
      result.push(line.split(' ')[0]);
    } else {
      const words = line.split(' ');
      for (let word of words) {
        if ((word.startsWith('>>') || word.startsWith('--')) && currentLine.length > 0) {
          result.push(currentLine);
          currentLine = word;
        } else if (currentLine.length + word.length + 1 > maxCharsPerLine) {
          result.push(currentLine);
          currentLine = word;
        } else {
          currentLine += (currentLine ? ' ' : '') + word;
        }
      }
    }
  }

  if (currentLine) {
    result.push(currentLine);
  }

  return result.join('\n');
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
  a.download = 'output.vtt';
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById('formatButton').addEventListener('click', formatAndDisplayText);
document.getElementById('copyButton')?.addEventListener('click', copyOutput);
document.getElementById('downloadButton')?.addEventListener('click', downloadOutput);
