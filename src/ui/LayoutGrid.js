/**
 * LayoutGrid — 12-column grid/layout system for consistent UI positioning.
 * All scenes instantiate this in create() and use it for positioning.
 */
export class LayoutGrid {
  constructor(width, height) {
    this.W = width;
    this.H = height;

    // 12-column grid
    this.COLS = 12;
    this.GUTTER = Math.round(width * 0.01);
    this.COL_W = (width - this.GUTTER * (this.COLS + 1)) / this.COLS;

    // Vertical zones
    this.HEADER_H = Math.round(height * 0.06);
    this.FOOTER_H = Math.round(height * 0.04);
    this.CONTENT_TOP = this.HEADER_H;
    this.CONTENT_BOTTOM = height - this.FOOTER_H;
    this.CONTENT_H = this.CONTENT_BOTTOM - this.CONTENT_TOP;
  }

  /**
   * Get the left-edge x position for a column (0-indexed).
   * @param {number} col - Column index (0-11)
   * @returns {number}
   */
  colX(col) {
    return this.GUTTER + col * (this.COL_W + this.GUTTER);
  }

  /**
   * Get the center x for a span of columns.
   * @param {number} startCol - Start column (0-indexed)
   * @param {number} span - Number of columns to span (default 1)
   * @returns {number}
   */
  colCenterX(startCol, span = 1) {
    const left = this.colX(startCol);
    const right = this.colX(startCol + span - 1) + this.COL_W;
    return (left + right) / 2;
  }

  /**
   * Get the right-edge x for a column span.
   * @param {number} startCol
   * @param {number} span
   * @returns {number}
   */
  colRight(startCol, span = 1) {
    return this.colX(startCol + span - 1) + this.COL_W;
  }

  /**
   * Get the total width of a column span.
   * @param {number} span
   * @returns {number}
   */
  spanWidth(span) {
    return span * this.COL_W + (span - 1) * this.GUTTER;
  }

  /**
   * Get y position as a fraction of the content area (below header).
   * @param {number} fraction - 0 = top of content, 1 = bottom of content
   * @returns {number}
   */
  rowY(fraction) {
    return this.CONTENT_TOP + this.CONTENT_H * fraction;
  }

  /**
   * Get the center y of the header bar.
   * @returns {number}
   */
  headerCenterY() {
    return this.HEADER_H / 2;
  }

  /**
   * Get scaled font size relative to the 900px base height.
   * @param {number} base - Font size at 900px height
   * @returns {number}
   */
  fontSize(base) {
    return Math.max(8, Math.round(base * (this.H / 900)));
  }

  /**
   * Get center x of the viewport.
   * @returns {number}
   */
  centerX() {
    return this.W / 2;
  }

  /**
   * Get center y of the viewport.
   * @returns {number}
   */
  centerY() {
    return this.H / 2;
  }
}
