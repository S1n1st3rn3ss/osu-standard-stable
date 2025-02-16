import {
  DifficultyAttributes,
  ModBitwise,
  PerformanceCalculator,
  IRuleset,
  IScoreInfo,
  DifficultyHitObject,
} from 'osu-classes';

import { StandardModCombination } from '../Mods';

import {
  StandardDifficultyAttributes,
  StandardPerformanceAttributes,
} from './Attributes';

import { Aim, Speed, Flashlight } from './Skills';
import { StandardDifficultyAttributes } from './Attributes';
import { StandardDifficultyHitObject } from './Preprocessing';
import { StandardHitWindows } from '../Scoring';
import { Circle, Slider, Spinner } from '../Objects';

export class AimEvaluator {
  private _WIDE_ANGLE_MULTIPLIER = 1.5;
  private _ACUTE_ANGLE_MULTIPLIER = 2.0;
  private _SLIDER_MULTIPLIER = 1.5;
  private _VELOCITY_CHANGE_MULTIPLIER = 0.75;

  // / <summary>
  // / Evaluates the difficulty of aiming the current object, based on:
  // / <list type="bullet">
  // / <item><description>cursor velocity to the current object,</description></item>
  // / <item><description>angle difficulty,</description></item>
  // / <item><description>sharp velocity increases,</description></item>
  // / <item><description>and slider difficulty.</description></item>
  // / </list>
  // / </summary>   

  protected get _historyLength(): number {
    return 2;
  }

  protected _evaluateDifficultyOf(current: StandardDifficultyHitObject, withSliders: boolean) {
    if (current.baseObject instanceof Spinner) return 0;
    if (current._previous.count <= 1) return 0;
    if (current._previous.get(0).baseObject instanceof Spinner) return 0;

    const osuCurrObj = current as StandardDifficultyHitObject;
    const osuLastObj = current._previous.get(0) as StandardDifficultyHitObject;
    const osuLastLastObj = current._previous.get(1) as StandardDifficultyHitObject;

    /**
     * Calculate the velocity to the current hitobject, which starts with 
     * a base distance / time assuming the last object is a hitcircle.
     */
    let currVelocity = osuCurrObj.jumpDistance / osuCurrObj.strainTime;

    /**
     * But if the last object is a slider, then we extend 
     * the travel velocity through the slider into the current object.
     */
    if ((osuLastObj.baseObject instanceof Slider) && withSliders) {
      /**
       * Calculate the movement velocity from slider end to current object
       */
      const movementVelocity = osuCurrObj.movementDistance / osuCurrObj.movementTime;

      /**
       * Calculate the slider velocity from slider head to slider end.
       */
      const travelVelocity = osuCurrObj.travelDistance / osuCurrObj.travelTime;

      /**
       * Take the larger total combined velocity.
       */
      currVelocity = Math.max(currVelocity, movementVelocity + travelVelocity);

    }

    /**
     * As above, do the same for the previous hitobject.
     */
    let prevVelocity = osuLastObj.jumpDistance / osuLastObj.strainTime;

    if ((osuLastLastObj.baseObject instanceof Slider) && withSliders) {
      const movementVelocity = osuLastObj.movementDistance / osuLastObj.movementTime;
      const travelVelocity = osuLastObj.travelDistance / osuLastObj.travelTime;

      prevVelocity = Math.max(prevVelocity, movementVelocity + travelVelocity);

      let wideAngleBonus = 0;
      let acuteAngleBonus = 0;
      let sliderBonus = 0;
      let velocityChangeBonus = 0;

      /**
       * Start strain with regular velocity.
       */
      let aimStrain = currVelocity;

      const strainTime1 = Math.max(osuCurrObj.strainTime, osuLastObj.strainTime);
      const strainTime2 = Math.min(osuCurrObj.strainTime, osuLastObj.strainTime);

      /**
       * If rhythms are the same
       */
      if (strainTime1 < 1.25 * strainTime2) {
        if (osuCurrObj.angle !== null && osuLastObj.angle !== null && osuLastLastObj.angle !== null) {
          const currAngle = osuCurrObj.angle;
          const lastAngle = osuLastObj.angle;
          const lastLastAngle = osuLastLastObj.angle;

          /**
           * Rewarding angles, take the smaller velocity as base.
           */
          const angleBonus = Math.min(currVelocity, prevVelocity);

          wideAngleBonus = this._calcWideAngleBonus(currAngle);
          acuteAngleBonus = this._calcAcuteAngleBonus(currAngle);

          /**
           * Only buff deltaTime exceeding 300 bpm 1/2.
           */
          if (osuCurrObj.strainTime > 100) {
            acuteAngleBonus = 0;
          }
          else {
            /**
             * Multiply by previous angle, we don't want to buff unless this is a wiggle type pattern.
             */
            acuteAngleBonus *= this._calcAcuteAngleBonus(lastAngle);

            /**
             * The maximum velocity we buff is equal to 125 / strainTime.
             */
            acuteAngleBonus *= Math.min(angleBonus, 125 / osuCurrObj.strainTime);

            /**
             * Scale buff from 150 bpm 1/4 to 200 bpm 1/4.
             */
            const x1 = Math.PI / 2 * Math.min(1, (100 - osuCurrObj.strainTime) / 25);

            acuteAngleBonus *= Math.pow(Math.sin(x1), 2);

            /**
             * Buff distance exceeding 50 (radius) up to 100 (diameter).
             */
            const clamp = Math.min(Math.max(osuCurrObj.jumpDistance, 50), 100);
            const x2 = Math.PI / 2 * (clamp - 50) / 50;

            acuteAngleBonus *= Math.pow(Math.sin(x2), 2);
          }

          /**
           * Penalize wide angles if they're repeated, 
           * reducing the penalty as the lastAngle gets more acute.
           */
          const pow1 = Math.pow(this._calcWideAngleBonus(lastAngle), 3);

          wideAngleBonus *= angleBonus * (1 - Math.min(wideAngleBonus, pow1));

          /**
           * Penalize acute angles if they're repeated, 
           * reducing the penalty as the lastLastAngle gets more obtuse.
           */
          const pow2 = Math.pow(this._calcAcuteAngleBonus(lastLastAngle), 3);

          acuteAngleBonus *= 0.5 + 0.5 * (1 - Math.min(acuteAngleBonus, pow2));

          if (Math.max(prevVelocity, currVelocity) !== 0) {
            /**
             * We want to use the average velocity over the whole object 
             * when awarding differences, not the individual jump and slider path velocities.
             */
            prevVelocity = (osuLastObj.jumpDistance + osuLastObj.travelDistance) / osuLastObj.strainTime;
            currVelocity = (osuCurrObj.jumpDistance + osuCurrObj.travelDistance) / osuCurrObj.strainTime;

            /**
             * Scale with ratio of difference compared to 0.5 * max dist.
             */
            const abs1 = Math.abs(prevVelocity - currVelocity);
            const max1 = Math.max(prevVelocity, currVelocity);
            const distRatio = Math.pow(Math.sin(Math.PI / 2 * abs1 / max1), 2);

            /**
             * Reward for % distance up to 125 / strainTime 
             * for overlaps where velocity is still changing.
             */
            const min2 = Math.min(osuCurrObj.strainTime, osuLastObj.strainTime);
            const abs2 = Math.abs(prevVelocity - currVelocity);
            const overlapVelocityBuff = Math.min(125 / min2, abs2);

            velocityChangeBonus = overlapVelocityBuff * distRatio;

            /**
             * Penalize for rhythm changes.
             */
            const min4 = Math.min(osuCurrObj.strainTime, osuLastObj.strainTime);
            const max4 = Math.max(osuCurrObj.strainTime, osuLastObj.strainTime);

            velocityChangeBonus *= Math.pow(min4 / max4, 2);
          }

          /**
           * Reward sliders based on velocity.
           */
          if (osuLastObj.baseObject !== Slider) {
            sliderBonus = osuCurrObj.travelDistance / osuCurrObj.travelTime;
          }

          /**
           * Add in acute angle bonus or 
           * wide angle bonus + velocity change bonus, whichever is larger.
           */
          const acuteBonus = acuteAngleBonus * this._ACUTE_ANGLE_MULTIPLIER;
          const wideBonus = wideAngleBonus * this._WIDE_ANGLE_MULTIPLIER;
          const velocityBonus = velocityChangeBonus * this._VELOCITY_CHANGE_MULTIPLIER;

          aimStrain += Math.max(acuteBonus, wideBonus + velocityBonus);

          /**
           * Add in additional slider velocity bonus.
           */
          if (withSliders) {
            aimStrain += sliderBonus * this._SLIDER_MULTIPLIER;
          }

          return aimStrain;
        }

      }
    }
  }

  private _calcWideAngleBonus(angle: number): number {
    const clamp = Math.min(5.0 / 6 * Math.PI, Math.max(Math.PI / 6, angle));
    const x = 3.0 / 4 * (clamp - Math.PI / 6);

    return Math.pow(Math.sin(x), 2);
  }

  private _calcAcuteAngleBonus(angle: number): number {
    return 1 - this._calcWideAngleBonus(angle);
  }
}
