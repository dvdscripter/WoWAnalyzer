import React from 'react';

import SpellLink from 'common/SpellLink';
import Icon from 'common/Icon';
import { formatNumber } from 'common/format';

import SmallStatisticBox, { STATISTIC_ORDER } from 'interface/others/SmallStatisticBox';

import Analyzer from 'parser/core/Analyzer';
import HealingDone from 'parser/shared/modules/HealingDone';
import DamageDone from 'parser/shared/modules/DamageDone';
import DamageTaken from 'parser/shared/modules/DamageTaken';

// http://www.wowhead.com/uncategorized-spells/name:Vantus+Rune:?filter=29;42;0 $.makeArray($('.listview-cleartext[href^="/spell="]')).map(item => `${item.href.replace(/^.*spell=([0-9]+)$/, '$1')}, // ${item.innerText}`).join("\n")
// buff id: boss id
// TODO: Make files for the old bosses below in the Raids folder, adding back their Vantus Rune ids. Or don't since nobody cares about them anymore. In that case remove this code when BfA is released.
// const VANTUS_RUNE_SPELL_IDS = {
//   192761: bosses.EmeraldNightmare.NYTHENDRA, // Vantus Rune: Nythendra
//   192765: bosses.EmeraldNightmare.ELERETHE_RENFERAL, // Vantus Rune: Elerethe Renferal
//   192762: bosses.EmeraldNightmare.ILGYNOTH_THE_HEART_OF_CORRUPTION, // Vantus Rune: Il'gynoth, The Heart of Corruption
//   191464: bosses.EmeraldNightmare.URSOC, // Vantus Rune: Ursoc
//   192763: bosses.EmeraldNightmare.DRAGONS_OF_NIGHTMARE, // Vantus Rune: Dragons of Nightmare
//   192766: bosses.EmeraldNightmare.CENARIUS, // Vantus Rune: Cenarius
//   192764: bosses.EmeraldNightmare.XAVIUS, // Vantus Rune: Xavius
//   // Trial of Valor
//   229174: bosses.TrialOfValor.ODYN, // Vantus Rune: Odyn
//   229175: bosses.TrialOfValor.GUARM, // Vantus Rune: Guarm
//   229176: bosses.TrialOfValor.HELYA, // Vantus Rune: Helya
//   // The Nighthold
//   192767: bosses.TheNighthold.SKORPYRON, // Vantus Rune: Skorpyron
//   192768: bosses.TheNighthold.CHRONOMATIC_ANOMALY, // Vantus Rune: Chronomatic Anomaly
//   192769: bosses.TheNighthold.TRILLIAX, // Vantus Rune: Trilliax
//   192770: bosses.TheNighthold.SPELLBLADE_ALURIEL, // Vantus Rune: Spellblade Aluriel
//   192771: bosses.TheNighthold.TICHONDRIUS, // Vantus Rune: Tichondrius
//   192773: bosses.TheNighthold.KROSUS, // Vantus Rune: Krosus
//   192772: bosses.TheNighthold.HIGH_BOTANIST_TELARN, // Vantus Rune: High Botanist Tel'arn
//   192774: bosses.TheNighthold.STAR_AUGUR_ETRAEUS, // Vantus Rune: Star Augur Etraeus
//   192775: bosses.TheNighthold.GRAND_MAGISTRIX_ELISANDE, // Vantus Rune: Grand Magistrix Elisande
//   192776: bosses.TheNighthold.GULDAN, // Vantus Rune: Gul'dan
//   // Tomb of Sargeras
//   237821: bosses.TombOfSargeras.GOROTH, // Vantus Rune: Goroth
//   237828: bosses.TombOfSargeras.DEMONIC_INQUISITION, // Vantus Rune: Demonic Inquisition
//   237824: bosses.TombOfSargeras.HARJATAN, // Vantus Rune: Harjatan
//   237826: bosses.TombOfSargeras.MISTRESS_SASSZINE, // Vantus Rune: Mistress Sassz'ine
//   237822: bosses.TombOfSargeras.SISTERS_OF_THE_MOON, // Vantus Rune: Sisters of the Moon
//   237827: bosses.TombOfSargeras.THE_DESOLATE_HOST, // Vantus Rune: The Desolate Host
//   237820: bosses.TombOfSargeras.FALLEN_AVATAR, // Vantus Rune: Fallen Avatar
//   237825: bosses.TombOfSargeras.KILJAEDEN, // Vantus Rune: Kil'jaeden
// };
const VANTUS_RUNE_VERSATILITY = 68;
const VERSATILITY_PER_PERCENT_THROUGHPUT = 2080;
const VERSATILITY_PER_PERCENT_DAMAGE_REDUCTION = VERSATILITY_PER_PERCENT_THROUGHPUT * 2;
const VANTUS_RUNE_PERCENTAGE_THROUGHPUT = VANTUS_RUNE_VERSATILITY / VERSATILITY_PER_PERCENT_THROUGHPUT;
const VANTUS_RUNE_PERCENTAGE_DAMAGE_REDUCTION = VANTUS_RUNE_VERSATILITY / VERSATILITY_PER_PERCENT_DAMAGE_REDUCTION;

class VantusRune extends Analyzer {
  static dependencies = {
    healingDone: HealingDone,
    damageDone: DamageDone,
    damageTaken: DamageTaken,
  };

  activeRune = null;
  constructor(...args) {
    super(...args);
    const boss = this.owner.boss;

    /** @var {number|null} */
    const vantusRuneBuffId = boss ? boss.fight.vantusRuneBuffId : null;
    if (vantusRuneBuffId) {
      const match = this.selectedCombatant.getBuff(vantusRuneBuffId);
      if (match !== undefined) {
        this.activeRune = match;
      }
    }
    this.active = this.activeRune !== null;
  }

  statistic() {
    const fightDuration = this.owner.fightDuration;

    const damageDone = this.damageDone.total.effective - (this.damageDone.total.effective / (1 + VANTUS_RUNE_PERCENTAGE_THROUGHPUT));
    const healingDone = this.healingDone.total.effective - (this.healingDone.total.effective / (1 + VANTUS_RUNE_PERCENTAGE_THROUGHPUT));
    const damageReduced = (this.damageTaken.total.effective / (1 - VANTUS_RUNE_PERCENTAGE_DAMAGE_REDUCTION)) - this.damageTaken.total.effective;

    return (
      <SmallStatisticBox
        position={STATISTIC_ORDER.UNIMPORTANT()}
        icon={(
          <SpellLink id={this.activeRune.ability.guid} icon={false}>
            <Icon icon={this.activeRune.ability.abilityIcon} />
          </SpellLink>
        )}
        value={damageDone > healingDone ? `${formatNumber(damageDone / fightDuration * 1000)} DPS` : `${formatNumber(healingDone / fightDuration * 1000)} HPS`}
        label="Vantus Rune gain"
        tooltip={`The throughput gain from using a Vantus Rune. You gained ${formatNumber(damageDone / fightDuration * 1000)} damage per second (DPS) and ${formatNumber(healingDone / fightDuration * 1000)} healing per second (HPS), and reduced your damage taken by ${formatNumber(damageReduced / fightDuration * 1000)} per second (DRPS).`}
      />
    );
  }
}

export default VantusRune;
