/**
 * CoefficientManager — Tracks user-placed coefficients and emits change events.
 */
export class CoefficientManager {
  constructor(scene, equationData) {
    this.scene = scene;
    this.equationData = equationData;
    this.reactantCoeffs = new Array(equationData.reactants.length).fill(1);
    this.productCoeffs = new Array(equationData.products.length).fill(1);
    this.onChange = null; // callback
  }

  setReactantCoeff(index, value) {
    const v = Math.max(1, Math.min(9, value));
    if (this.reactantCoeffs[index] !== v) {
      this.reactantCoeffs[index] = v;
      this._emitChange();
    }
  }

  setProductCoeff(index, value) {
    const v = Math.max(1, Math.min(9, value));
    if (this.productCoeffs[index] !== v) {
      this.productCoeffs[index] = v;
      this._emitChange();
    }
  }

  getReactantCoeff(index) {
    return this.reactantCoeffs[index];
  }

  getProductCoeff(index) {
    return this.productCoeffs[index];
  }

  getAllCoeffs() {
    return [...this.reactantCoeffs, ...this.productCoeffs];
  }

  reset() {
    this.reactantCoeffs.fill(1);
    this.productCoeffs.fill(1);
    this._emitChange();
  }

  _emitChange() {
    if (this.onChange) {
      this.onChange(this.reactantCoeffs, this.productCoeffs);
    }
  }
}
