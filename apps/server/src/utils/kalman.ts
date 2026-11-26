/**
 * File Name: kalman.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 2026
 * Description: 2D Kalman filter implementation for position smoothing.
 *
 * Copyright (c) 2026 Epitech
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
**/

import { KALMAN_DEFAULTS } from "@epibat/shared";

/**
 * Simple 1D Kalman filter for smoothing position values.
 * Apply one per axis (x, y) to reduce BLE/WiFi signal jitter.
 */
export class KalmanFilter1D {
  private estimate: number;
  private estimateError: number;
  private processNoise: number;
  private measurementNoise: number;

  constructor(
    initialEstimate: number = 0,
    options: {
      processNoise?: number;
      measurementNoise?: number;
      estimateError?: number;
    } = {}
  ) {
    this.estimate = initialEstimate;
    this.processNoise =
      options.processNoise ?? KALMAN_DEFAULTS.processNoise;
    this.measurementNoise =
      options.measurementNoise ?? KALMAN_DEFAULTS.measurementNoise;
    this.estimateError =
      options.estimateError ?? KALMAN_DEFAULTS.estimatedError;
  }

  /**
   * Feed a new measurement and return the filtered estimate.
   */
  update(measurement: number): number {
    // Prediction step
    const predictedEstimate = this.estimate;
    const predictedError = this.estimateError + this.processNoise;

    // Update step
    const kalmanGain =
      predictedError / (predictedError + this.measurementNoise);
    this.estimate =
      predictedEstimate + kalmanGain * (measurement - predictedEstimate);
    this.estimateError = (1 - kalmanGain) * predictedError;

    return this.estimate;
  }

  getEstimate(): number {
    return this.estimate;
  }

  reset(value: number): void {
    this.estimate = value;
    this.estimateError = KALMAN_DEFAULTS.estimatedError;
  }
}

/**
 * 2D Kalman filter — wraps two 1D filters for x and y axes.
 */
export class KalmanFilter2D {
  private filterX: KalmanFilter1D;
  private filterY: KalmanFilter1D;

  constructor(initialX = 0, initialY = 0) {
    this.filterX = new KalmanFilter1D(initialX);
    this.filterY = new KalmanFilter1D(initialY);
  }

  update(x: number, y: number): { x: number; y: number } {
    return {
      x: this.filterX.update(x),
      y: this.filterY.update(y),
    };
  }

  getEstimate(): { x: number; y: number } {
    return {
      x: this.filterX.getEstimate(),
      y: this.filterY.getEstimate(),
    };
  }

  reset(x: number, y: number): void {
    this.filterX.reset(x);
    this.filterY.reset(y);
  }
}
