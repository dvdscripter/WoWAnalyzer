import React from 'react';

import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';

import Analyzer, { SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events from 'parser/core/Events';

import StatisticBox, { STATISTIC_ORDER } from 'interface/others/StatisticBox';
import SpellIcon from 'common/SpellIcon';
import { formatNumber } from 'common/format';
import { TooltipElement } from 'common/Tooltip';
import { i18n } from '@lingui/core';
import { t } from '@lingui/macro';

class EssenceFont extends Analyzer {
  constructor(...args) {
    super(...args);
    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.ESSENCE_FONT), this.castEssenceFont);
    this.addEventListener(Events.heal.by(SELECTED_PLAYER).spell(SPELLS.ESSENCE_FONT), this.handleEssenceFont);
    this.addEventListener(Events.heal.by(SELECTED_PLAYER).spell(SPELLS.ESSENCE_FONT_BUFF), this.handleEssenceFontBuff);
    this.addEventListener(Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.ESSENCE_FONT_BUFF), this.applyEssenceFontBuff);
    this.addEventListener(Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.ESSENCE_FONT_BUFF), this.refreshEssenceFontBuff);
  }

  totalHealing = 0;
  totalOverhealing = 0;
  totalAbsorbs = 0;

  castEF = 0;
  targetsEF = 0;
  efHotHeal = 0;
  efHotOverheal = 0;
  targetOverlap = 0;

  uniqueTargets = new Set();
  total = 0;

  castEssenceFont(event) {
    this.castEF += 1;
    this.total += this.uniqueTargets.size || 0;
    this.uniqueTargets.clear();
  }

  handleEssenceFont(event) {
    this.totalHealing += event.amount || 0;
    this.totalOverhealing += event.overheal || 0;
    this.totalAbsorbs += event.absorbed || 0;
  }

  handleEssenceFontBuff(event) {
    if (event.tick === true) {
      this.efHotHeal += (event.amount || 0) + (event.absorbed || 0);
      this.efHotOverheal += event.overheal || 0;
    }

    this.totalHealing += event.amount || 0;
    this.totalOverhealing += event.overheal || 0;
    this.totalAbsorbs += event.absorbed || 0;
    this.uniqueTargets.add(event.targetID);
  }

  applyEssenceFontBuff(event) {
    this.targetsEF += 1;
  }

  refreshEssenceFontBuff(event) {
    this.targetsEF += 1;
    this.targetOverlap += 1;
  }

  get efHotHealing() {
    return (this.efHotHeal);
  }

  get efHotOverhealing() {
    return (this.efHotOverheal / (this.efHotHeal + this.efHotOverheal)).toFixed(4);
  }

  get avgTargetsHitPerEF() {
    return (this.targetsEF / this.castEF) || 0;
  }
  
  get efHotOverlap() {
    return ((this.targetOverlap / this.targetsEF) || 0).toFixed(2);
  }

  get suggestionThresholds() {
    return {
      actual: this.avgTargetsHitPerEF,
      isLessThan: {
        minor: 17,
        average: 14,
        major: 12,
      },
      style: 'number',
    };
  }

  suggestions(when) {
    when(this.suggestionThresholds).addSuggestion((suggest, actual, recommended) => suggest(
          <>
            You are currently using not utilizing your <SpellLink id={SPELLS.ESSENCE_FONT.id} /> effectively. Each <SpellLink id={SPELLS.ESSENCE_FONT.id} /> cast should hit a total of 18 targets. Either hold the cast til 6 or more targets are injured or move while casting to increase the effective range of the spell.
          </>,
        )
          .icon(SPELLS.ESSENCE_FONT.icon)
          .actual(i18n._(t('monk.mistweaver.suggestions.essenceFont.averageTargetsHit')`${this.avgTargetsHitPerEF.toFixed(2)} average targets hit per cast`))
          .recommended(`${recommended} targets hit is recommended`));
  }

  statistic() {
    const averageHits = this.total / this.castEF;
    return (
      <StatisticBox
        postion={STATISTIC_ORDER.OPTIONAL(50)}
        icon={<SpellIcon id={SPELLS.ESSENCE_FONT.id} />}
        value={`${formatNumber(averageHits)}`}
        label={(
          <TooltipElement content="This is the average unique targets hit per essences font cast.">
            Average Unique Targets Hit
          </TooltipElement>
        )}
      />
    );
  }
}

export default EssenceFont;
