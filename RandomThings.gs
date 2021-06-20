// some of this is adapted from d3
/*
Copyright 2010-2021 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
*/

// in Apps Script V8, can't use const as this needs to be hoisted, so use var
var RandomThings = (() => {

  // use the standard random generator
  const rand = Math.random;

  // make a whitelist for character sets - just skip all control chars though
  const chars = Array.from({ length: 256 - 31 }).map((_, i) => String.fromCharCode(i + 32))
  const accents = chars.filter(j => j.match(/[?-??-??-?]/))

  const whitelist = {
    lower: chars.filter(j => j.match(/[a-z]/)),
    upper: chars.filter(j => j.match(/[A-Z]/)),
    numbers: chars.filter(j => j.match(/[0-9]/)),
    accents,
    space: chars.filter(j => j.match(/\s/)),
    specials: chars.slice(0, 127 - 32).filter(j => j.match(/\W/))
  }

  // make a character set from a given selection
  const getCharSet = (charTypes) => {
    // don't bother if its the default
    if (!charTypes) return defSet

    // special set needed
    if (typeof charTypes !== 'object') throw new Error('chartypes must be an object like {upper: true, custom: regex}')
    return Object.keys(charTypes)
      .reduce((p, c) => {

        if (c === 'custom') {
          return p.concat(chars.filter(j => j.match(charTypes[c])))
        }
        // only a truthy will include
        if (!charTypes[c]) return p;

        if (whitelist[c]) {
          return p.concat(whitelist[c])
        } else {
          throw new Error('unknown option' + c)
        }
      }, [])
      // remove dups
      .filter((f, i, a) => a.indexOf(f) === i)
  }

  // default character set
  const defSet = getCharSet({
    lower: true,
    upper: true,
    numbers: true,
  })

  // make a sha1 digest
  const digest = (...args) => {
    // conver args to an array and digest them
    const t = args.map(d => {
      return (Object(d) === d) ? JSON.stringify(d) : (typeof d === typeof undefined ? 'undefined' : d.toString());
    }).join("-")
    const s = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, t, Utilities.Charset.UTF_8)
    return Utilities.base64EncodeWebSafe(s)

  };

  // get a random array member
  const member = (arr) => arr[between(0, arr.length - 1)]
  const char = (charSet = defSet) => member(charSet)


  /**
   * generateUniqueString
   * get a unique string
   * @param {options} options
   * @param {number} [options.length=16] the length of the string - recommend this at least 12
   * @param {object} [options.charTypes] to filter the types (upper,accents, specials)  
   * @return {string} a unique string
   **/
  const makeUnique = (options) => makeId(options)

  /**
   * get chars from set using current time
   */
  const timeStampChars = ({ charSet = defSet, timeStamp } = {}) => (timeStamp || new Date().getTime()).toString().split('').map(f => charSet[parseInt(f, 10) % charSet.length]).join('')

  /**
   * make an id featuring the current time built in
   */
  const makeId = ({ length = 32, charTypes } = {}) => {
    const tc = timeStampChars({ charSet: getCharSet(charTypes) })
    return (
      make({ length: length - tc.length, charTypes }) + tc
    ).slice(0, length);
  }


  /**
   * get a random string
   **/
  const make = ({ length = 32, charTypes = null, unique = false } = {}) => {
    if (unique) return makeUnique({length, charTypes})
    // don't need special unique treatment
    const cset = getCharSet(charTypes)
   
    return length > 0 ? Array.from({ length }).map(j => char(cset)).join("") : "";
  }

  /**
   * randBetween
   * get an random number between x and y
   * @param {number} min the lower bound
   * @param {number} max the upper bound
   * @return {number} the random number
   **/
  const between = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  /**
   * randDigits
   * get a randonm number with a given number of digits
   * @param {object} options
   * @param {number} [options.length=5] number of digits
   * @return {number} a number with digits
   */
  const digits = ({ length = 5} ={}) =>
    length > 0
      ? between(Math.pow(10, length - 1), Math.pow(10, length) - 1)
      : null;

  /**
   * create a skewed distribution
   * src - https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
   * @param {object} options
   * @param {number} [options.min=0] min value
   * @param {number} [options.max=1] max value
   * @param {number} [options.skew=1] a value of 1 will give a normal distribution < 1 bias to the right, > 1 bias to the left
   * @param {number} [options.length=1] a value of 1 will give a normal distribution < 1 bias to the right, > 1 bias to the left
   * @return {number[]} skewed values
   */
  const skewed = ({ min = 0, max = 1, skew = 1, length = 1 }) => Array.from({ length }).map(t => randomSkewed({ min, max, skew }))

  const randomSkewed = ({ min = 0, max = 1, skew = 1 }) => {

    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    // recurse if we're out of range
    if (num > 1 || num < 0) num = randomSkewed(min, max, skew); // resample between 0 and 1 if out of range
    num = Math.pow(num, skew); // Skew
    num *= max - min; // Stretch to fill range
    num += min; // offset to min
    return num;
  };

  /**
   * return an array of normally distributed values
   * @param {object} options 
   * @param {number} [options.mean=0] the mean of the distribution
   * @param {number} [options.sd=1] the sd
   * @param {number} [options.length] the numberof items to return
   * @return {number[]} an array of values
   */
  const normal = ({ mean = 0, sd = 1, length = 1 }) => {
    const func = randomNormal(mean, sd)
    return Array.from({ length }).map(func)
  }

  function randomNormal(mu, sigma) {
    var x, r;
    mu = mu == null ? 0 : +mu;
    sigma = sigma == null ? 1 : +sigma;
    return function () {
      var y;

      // If available, use the second previously-generated uniform random.
      if (x != null) y = x, x = null;

      // Otherwise, generate a new x and y.
      else do {
        x = rand() * 2 - 1;
        y = rand() * 2 - 1;
        r = x * x + y * y;
      } while (!r || r > 1);

      return mu + sigma * y * Math.sqrt(-2 * Math.log(r) / r);
    };
  }

  const scale = ({ min = 0, max = 1, values = [] } = {}) => {
    const mn = Math.min(...values)
    const mx = Math.max(...values)
    const range = mx - mn
    return (value) => range ? (value - mn) / range * (max - min) + min : null
  }
  /**
   * return an array of pareto distributed values
   * @param {object} options 
   * @param {number} [options.alpha=1] alpha (>=0) decides the steepness of the pareto higher = steeper
   * @param {number} [options.length] the numberof items to return
   * @return {number[]} an array of values
   */
  const pareto = ({ alpha = 1, length = 1 }) => {
    const func = randomPareto(alpha)
    return Array.from({ length }).map(func)
  }

  function randomPareto(alpha) {
    if ((alpha = +alpha) < 0) throw new Error("invalid alpha", alpha);
    alpha = 1 / -alpha;
    return function () {
      return Math.pow(1 - rand(), alpha);
    };
  }

  const distributions = {
    pareto,
    normal,
    skewed
  }

  const string = {
    make,
    digest
  }

  const number = {
    digits,
    between
  }

  const selection = {
    member
  }

  const closure = {
    scale
  }

  return {
    number,
    string,
    distributions,
    closure,
    selection
  };
})();

