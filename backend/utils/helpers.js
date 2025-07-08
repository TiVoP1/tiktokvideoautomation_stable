
//LEGACY
const FAKE_ANSWERS_POOL = [
  " "
];

export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateOptions(correctAnswer) {
  const filtered = FAKE_ANSWERS_POOL
    .filter(item =>
      item !== correctAnswer &&
      item.length > 3 &&
      !/^[A-Z]$/.test(item) &&
      !item.includes(correctAnswer)
    );

  const shuffled = [...filtered].sort(() => 0.5 - Math.random());
  const fakeAnswers = shuffled.slice(0, 3);

  const allAnswers = [...fakeAnswers, correctAnswer].sort(() => 0.5 - Math.random());

  const labeled = {};
  const labels = ['A', 'B', 'C', 'D'];
  allAnswers.forEach((val, i) => {
    labeled[labels[i]] = val;
  });

  return labeled;
}
