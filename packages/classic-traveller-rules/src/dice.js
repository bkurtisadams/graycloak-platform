function assertDieResult(value) {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new RangeError(`d6 result must be an integer from 1 to 6; received ${value}`);
  }
  return value;
}

export function createDice(random = Math.random) {
  if (typeof random !== 'function') {
    throw new TypeError('random must be a function');
  }

  const rollD6 = () => Math.floor(random() * 6) + 1;

  return {
    rollD6,
    roll2D6() {
      const dice = [rollD6(), rollD6()];
      return { dice, total: dice[0] + dice[1] };
    }
  };
}

export function createSequenceDice(results) {
  if (!Array.isArray(results)) {
    throw new TypeError('results must be an array of d6 results');
  }

  const queue = [...results];

  const rollD6 = () => {
    if (queue.length === 0) {
      throw new Error('deterministic dice sequence exhausted');
    }
    return assertDieResult(queue.shift());
  };

  return {
    rollD6,
    roll2D6() {
      const dice = [rollD6(), rollD6()];
      return { dice, total: dice[0] + dice[1] };
    },
    remaining() {
      return queue.length;
    }
  };
}

export function requireDice(dice) {
  if (!dice || typeof dice.rollD6 !== 'function' || typeof dice.roll2D6 !== 'function') {
    throw new TypeError('dice must provide rollD6() and roll2D6()');
  }
  return dice;
}
