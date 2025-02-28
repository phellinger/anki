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

  function generateName() {
    const sport = getRandomWord(sports);
    const animal = getRandomWord(animals);
    return sport + animal;
  }

  return generateName();
}

module.exports = { generateUsername };
