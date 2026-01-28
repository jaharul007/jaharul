// Game Logic Utilities

export function generateRandomNumber() {
  return Math.floor(Math.random() * 10);
}

export function getColorFromNumber(n) {
  if (n === 0) return ['Violet', 'Red'];
  if (n === 5) return ['Violet', 'Green'];
  if ([1, 3, 7, 9].includes(n)) return ['Green'];
  if ([2, 4, 6, 8].includes(n)) return ['Red'];
  return [];
}

export function getSizeFromNumber(n) {
  return n >= 5 ? 'Big' : 'Small';
}

export function calculatePayout(betType, betOn, amount, result) {
  const payouts = {
    number: 9,
    color: 2,
    violet: 4.5,
    size: 2,
    random: 9
  };
  
  let won = false;
  let multiplier = 0;
  
  switch(betType) {
    case 'number':
      won = parseInt(betOn) === result;
      multiplier = payouts.number;
      break;
      
    case 'color':
      const colors = getColorFromNumber(result);
      won = colors.includes(betOn);
      multiplier = betOn === 'Violet' ? payouts.violet : payouts.color;
      break;
      
    case 'size':
      const size = getSizeFromNumber(result);
      won = betOn === size;
      multiplier = payouts.size;
      break;
      
    case 'random':
      won = Math.random() > 0.5;
      multiplier = payouts.random;
      break;
  }
  
  return {
    won,
    payout: won ? amount * multiplier : 0
  };
}

export function getCurrentPeriod(mode) {
  const now = new Date();
  const total = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
  const dateStr = now.getFullYear().toString() + 
                 (now.getMonth() + 1).toString().padStart(2, '0') + 
                 now.getDate().toString().padStart(2, '0');
  const periodNumber = Math.floor(total / mode).toString().padStart(4, '0');
  
  return dateStr + periodNumber;
}