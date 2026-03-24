const fs = require('fs').promises;
const path = require('path');

async function loadWordList(filename) {
  const content = await fs.readFile(
    path.join(__dirname, '..', 'resources', filename),
    'utf8'
  );
  return content.trim().split('\n');
}

async function generateUsername() {
  const sports = await loadWordList('sports.txt');
  const animals = await loadWordList('animals.txt');

  function getRandomWord(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function randomThreeDigits() {
    return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  }

  function generateName() {
    const sport = getRandomWord(sports);
    const animal = getRandomWord(animals);
    return sport + animal + randomThreeDigits();
  }

  return generateName();
}

module.exports = { generateUsername };
