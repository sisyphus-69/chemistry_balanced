/**
 * EquationEngine — Parses equations, counts atoms, validates balance.
 */
export class EquationEngine {
  /**
   * Count total atoms on one side of the equation.
   * @param {Array} molecules - Array of { elements: {symbol: count}, ... }
   * @param {Array} coefficients - Corresponding coefficients (numbers). Missing/null = 1.
   * @returns {Object} - { element: totalCount, ... }
   */
  static countAtoms(molecules, coefficients) {
    const counts = {};
    molecules.forEach((mol, i) => {
      const coeff = coefficients[i] || 1;
      for (const [element, count] of Object.entries(mol.elements)) {
        counts[element] = (counts[element] || 0) + count * coeff;
      }
    });
    return counts;
  }

  /**
   * Check if user coefficients balance the equation.
   * @param {Object} equationData - Full equation data from equations.json
   * @param {Array} reactantCoeffs - User's reactant coefficients
   * @param {Array} productCoeffs - User's product coefficients
   * @returns {{ balanced: boolean, leftCounts: Object, rightCounts: Object, elements: Object }}
   */
  static validate(equationData, reactantCoeffs, productCoeffs) {
    const leftCounts = this.countAtoms(equationData.reactants, reactantCoeffs);
    const rightCounts = this.countAtoms(equationData.products, productCoeffs);

    const allElements = new Set([
      ...Object.keys(leftCounts),
      ...Object.keys(rightCounts)
    ]);

    const elements = {};
    let balanced = true;

    for (const el of allElements) {
      const left = leftCounts[el] || 0;
      const right = rightCounts[el] || 0;
      const match = left === right && left > 0;
      elements[el] = { left, right, balanced: match };
      if (!match) balanced = false;
    }

    return { balanced, leftCounts, rightCounts, elements };
  }

  /**
   * Check if the solution is in lowest terms (for 3-star rating).
   * @param {Array} allCoeffs - All coefficients combined [reactants..., products...]
   * @returns {boolean}
   */
  static isLowestTerms(allCoeffs) {
    const coeffs = allCoeffs.filter(c => c > 0);
    if (coeffs.length === 0) return true;

    const gcdTwo = (a, b) => (b === 0 ? a : gcdTwo(b, a % b));
    let g = coeffs[0];
    for (let i = 1; i < coeffs.length; i++) {
      g = gcdTwo(g, coeffs[i]);
      if (g === 1) return true;
    }
    return g === 1;
  }

  /**
   * Get all unique elements in an equation.
   */
  static getElements(equationData) {
    const elements = new Set();
    [...equationData.reactants, ...equationData.products].forEach(mol => {
      Object.keys(mol.elements).forEach(el => elements.add(el));
    });
    return [...elements];
  }

  /**
   * Build the display string with coefficients.
   */
  static buildDisplayString(equationData, reactantCoeffs, productCoeffs) {
    const reactantStr = equationData.reactants.map((mol, i) => {
      const coeff = reactantCoeffs[i] || 1;
      return (coeff > 1 ? coeff : '') + mol.formula;
    }).join(' + ');

    const productStr = equationData.products.map((mol, i) => {
      const coeff = productCoeffs[i] || 1;
      return (coeff > 1 ? coeff : '') + mol.formula;
    }).join(' + ');

    return `${reactantStr} → ${productStr}`;
  }
}
